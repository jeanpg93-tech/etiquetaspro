import { XMLParser } from "fast-xml-parser";

export type ParsedOrderItem = {
  sku: string;
  product_name: string | null;
  quantity: number;
};

export type ParsedOrder = {
  order_number: string;
  source: "nfe" | "excel";
  nfe_key: string | null;
  recipient_name: string | null;
  recipient_address: string | null;
  recipient_city: string | null;
  recipient_state: string | null;
  recipient_zip: string | null;
  items: ParsedOrderItem[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  trimValues: true,
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function pickInfNFe(doc: any): any | null {
  // Supports nfeProc/NFe/infNFe or NFe/infNFe (no proc wrapper)
  const nfeProc = doc?.nfeProc ?? doc;
  const nfe = nfeProc?.NFe ?? doc?.NFe;
  return nfe?.infNFe ?? null;
}

export function parseNFeXml(xml: string): ParsedOrder {
  const doc = parser.parse(xml);
  const inf = pickInfNFe(doc);
  if (!inf) throw new Error("XML não é uma NFe válida (infNFe ausente)");

  const idAttr: string = inf["@_Id"] ?? "";
  const nfeKey = idAttr.replace(/^NFe/, "") || null;
  const orderNumber = String(inf?.ide?.nNF ?? nfeKey ?? "").trim();
  if (!orderNumber) throw new Error("Número da NFe (nNF) não encontrado");

  const dest = inf?.dest ?? {};
  const ender = dest?.enderDest ?? {};
  const addressParts = [ender.xLgr, ender.nro, ender.xCpl, ender.xBairro]
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v).trim());

  const detList = asArray(inf?.det);
  const items: ParsedOrderItem[] = detList.map((det: any) => {
    const prod = det?.prod ?? {};
    const sku = String(prod.cProd ?? "").trim();
    const name = prod.xProd ? String(prod.xProd).trim() : null;
    const qty = Number(prod.qCom ?? prod.qTrib ?? 1);
    return {
      sku,
      product_name: name,
      quantity: Number.isFinite(qty) ? qty : 1,
    };
  }).filter((i) => i.sku);

  if (items.length === 0) throw new Error("Nenhum item (det/prod) encontrado na NFe");

  return {
    order_number: orderNumber,
    source: "nfe",
    nfe_key: nfeKey,
    recipient_name: dest.xNome ? String(dest.xNome).trim() : null,
    recipient_address: addressParts.length ? addressParts.join(", ") : null,
    recipient_city: ender.xMun ? String(ender.xMun).trim() : null,
    recipient_state: ender.UF ? String(ender.UF).trim() : null,
    recipient_zip: ender.CEP ? String(ender.CEP).trim() : null,
    items,
  };
}
