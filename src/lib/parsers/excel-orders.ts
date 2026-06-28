import * as XLSX from "xlsx";
import type { ParsedOrder, ParsedOrderItem } from "./nfe";

/**
 * Colunas esperadas (case-insensitive, ordem livre):
 *   order_number | numero_pedido
 *   sku
 *   quantity     | quantidade
 *   product_name | produto                  (opcional)
 *   recipient_name | destinatario           (opcional)
 *   recipient_address | endereco            (opcional)
 *   recipient_city    | cidade              (opcional)
 *   recipient_state   | uf                  (opcional)
 *   recipient_zip     | cep                 (opcional)
 */

const ALIASES: Record<string, string[]> = {
  order_number: ["order_number", "numero_pedido", "numero", "pedido", "nro_pedido"],
  sku: ["sku", "codigo", "cod", "cod_produto"],
  quantity: ["quantity", "quantidade", "qtd", "qty"],
  product_name: ["product_name", "produto", "nome_produto", "descricao"],
  recipient_name: ["recipient_name", "destinatario", "cliente", "nome"],
  recipient_address: ["recipient_address", "endereco", "endereço", "logradouro"],
  recipient_city: ["recipient_city", "cidade", "municipio"],
  recipient_state: ["recipient_state", "uf", "estado"],
  recipient_zip: ["recipient_zip", "cep"],
};

function normalize(s: string): string {
  return s.toString().trim().toLowerCase().replace(/\s+/g, "_");
}

function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const norm = headers.map(normalize);
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) {
      const idx = norm.indexOf(a);
      if (idx !== -1) { map[canonical] = idx; break; }
    }
  }
  return map;
}

export function parseOrdersExcel(buffer: ArrayBuffer): ParsedOrder[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("Planilha vazia");
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
  if (rows.length < 2) throw new Error("Planilha sem dados (cabeçalho + linhas)");

  const headerMap = buildHeaderMap(rows[0].map((h) => String(h ?? "")));
  if (headerMap.order_number === undefined) throw new Error("Coluna obrigatória ausente: order_number / numero_pedido");
  if (headerMap.sku === undefined) throw new Error("Coluna obrigatória ausente: sku");

  const grouped = new Map<string, ParsedOrder>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (k: string): string => {
      const i = headerMap[k];
      return i === undefined ? "" : String(row[i] ?? "").trim();
    };
    const orderNumber = get("order_number");
    const sku = get("sku");
    if (!orderNumber || !sku) continue;

    const qtyRaw = get("quantity");
    const qty = Number(qtyRaw.replace(",", ".")) || 1;

    const item: ParsedOrderItem = {
      sku,
      product_name: get("product_name") || null,
      quantity: qty,
    };

    let order = grouped.get(orderNumber);
    if (!order) {
      order = {
        order_number: orderNumber,
        source: "excel",
        nfe_key: null,
        recipient_name: get("recipient_name") || null,
        recipient_address: get("recipient_address") || null,
        recipient_city: get("recipient_city") || null,
        recipient_state: get("recipient_state") || null,
        recipient_zip: get("recipient_zip") || null,
        items: [],
      };
      grouped.set(orderNumber, order);
    }
    order.items.push(item);
  }

  const orders = Array.from(grouped.values());
  if (orders.length === 0) throw new Error("Nenhum pedido válido encontrado na planilha");
  return orders;
}
