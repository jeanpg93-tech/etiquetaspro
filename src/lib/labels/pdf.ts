import { jsPDF } from "jspdf";
import { DEFAULT_SETTINGS, PRESETS, type LabelSettings } from "./settings";

export type LabelOrder = {
  order_number: string;
  recipient_name?: string | null;
  recipient_address?: string | null;
  recipient_city?: string | null;
  recipient_state?: string | null;
  recipient_zip?: string | null;
};

const PAGE_W = 210;
const PAGE_H = 297;

function drawLabel(
  doc: jsPDF,
  o: LabelOrder,
  x: number,
  y: number,
  w: number,
  h: number,
  s: LabelSettings,
) {
  if (s.showBorder) {
    doc.setDrawColor(220);
    doc.setLineWidth(0.1);
    doc.rect(x, y, w, h);
  }

  const padX = Math.max(3, w * 0.04);
  const padY = Math.max(4, h * 0.08);
  const scale = s.fontScale;
  let cursorY = y + padY;

  if (s.showOrderNumber) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9 * scale);
    doc.setTextColor(100);
    doc.text(`Pedido ${o.order_number}`, x + padX, cursorY + 2);
    cursorY += 6 * scale;
  }

  if (s.showRecipientName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12 * scale);
    doc.setTextColor(20);
    const name = o.recipient_name || "—";
    const nameLines = doc.splitTextToSize(name, w - padX * 2);
    doc.text(nameLines, x + padX, cursorY + 3);
    cursorY += nameLines.length * 4.5 * scale + 2;
  }

  if (s.showAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10 * scale);
    doc.setTextColor(40);
    const addr = o.recipient_address || "—";
    const addrLines = doc.splitTextToSize(addr, w - padX * 2);
    doc.text(addrLines, x + padX, cursorY + 3);
    cursorY += addrLines.length * 4 * scale + 1;
  }

  if (s.showCityState) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10 * scale);
    doc.setTextColor(40);
    const cityUf = [o.recipient_city, o.recipient_state].filter(Boolean).join(" / ");
    if (cityUf) {
      doc.text(cityUf, x + padX, cursorY + 4);
      cursorY += 5 * scale;
    }
  }

  if (s.showZip && o.recipient_zip) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10 * scale);
    doc.setTextColor(20);
    doc.text(`CEP ${o.recipient_zip}`, x + padX, cursorY + 4);
  }
}

export function generateLabelsPdf(orders: LabelOrder[], settings: LabelSettings = DEFAULT_SETTINGS): Blob {
  const preset = PRESETS[settings.preset] ?? PRESETS["pimaco-6181"];
  const { cols, rows, marginX, marginY, gapX, gapY } = preset;
  const labelW = (PAGE_W - marginX * 2 - gapX * (cols - 1)) / cols;
  const labelH = (PAGE_H - marginY * 2 - gapY * (rows - 1)) / rows;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const perPage = cols * rows;

  orders.forEach((o, idx) => {
    const pageIdx = Math.floor(idx / perPage);
    const slot = idx % perPage;
    if (slot === 0 && pageIdx > 0) doc.addPage();
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = marginX + col * (labelW + gapX);
    const y = marginY + row * (labelH + gapY);
    drawLabel(doc, o, x, y, labelW, labelH, settings);
  });

  return doc.output("blob");
}

export function downloadLabelsPdf(
  orders: LabelOrder[],
  filename = "etiquetas.pdf",
  settings: LabelSettings = DEFAULT_SETTINGS,
) {
  const blob = generateLabelsPdf(orders, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
