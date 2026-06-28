import { jsPDF } from "jspdf";

export type LabelOrder = {
  order_number: string;
  recipient_name?: string | null;
  recipient_address?: string | null;
  recipient_city?: string | null;
  recipient_state?: string | null;
  recipient_zip?: string | null;
};

// A4 portrait: 210x297mm. Grid 2 cols x 5 rows = 10 etiquetas por folha.
// Cada etiqueta: 99x57mm (padrão Pimaco/Avery 6181 aprox.)
const PAGE_W = 210;
const PAGE_H = 297;
const COLS = 2;
const ROWS = 5;
const MARGIN_X = 5;
const MARGIN_Y = 13.5;
const GAP_X = 2;
const GAP_Y = 0;
const LABEL_W = (PAGE_W - MARGIN_X * 2 - GAP_X * (COLS - 1)) / COLS; // ~99
const LABEL_H = (PAGE_H - MARGIN_Y * 2 - GAP_Y * (ROWS - 1)) / ROWS; // ~54

function drawLabel(doc: jsPDF, o: LabelOrder, x: number, y: number) {
  // Borda leve para conferência
  doc.setDrawColor(220);
  doc.setLineWidth(0.1);
  doc.rect(x, y, LABEL_W, LABEL_H);

  const padX = 4;
  const padY = 5;
  let cursorY = y + padY;

  // Header: nº pedido
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Pedido ${o.order_number}`, x + padX, cursorY + 2);
  cursorY += 6;

  // Destinatário
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  const name = o.recipient_name || "—";
  const nameLines = doc.splitTextToSize(name, LABEL_W - padX * 2);
  doc.text(nameLines, x + padX, cursorY + 3);
  cursorY += nameLines.length * 4.5 + 2;

  // Endereço
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const addr = o.recipient_address || "—";
  const addrLines = doc.splitTextToSize(addr, LABEL_W - padX * 2);
  doc.text(addrLines, x + padX, cursorY + 3);
  cursorY += addrLines.length * 4 + 1;

  // Cidade/UF
  const cityUf = [o.recipient_city, o.recipient_state].filter(Boolean).join(" / ");
  if (cityUf) {
    doc.text(cityUf, x + padX, cursorY + 4);
    cursorY += 5;
  }

  // CEP
  if (o.recipient_zip) {
    doc.setFont("helvetica", "bold");
    doc.text(`CEP ${o.recipient_zip}`, x + padX, cursorY + 4);
  }
}

export function generateLabelsPdf(orders: LabelOrder[]): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const perPage = COLS * ROWS;

  orders.forEach((o, idx) => {
    const pageIdx = Math.floor(idx / perPage);
    const slot = idx % perPage;
    if (slot === 0 && pageIdx > 0) doc.addPage();
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const x = MARGIN_X + col * (LABEL_W + GAP_X);
    const y = MARGIN_Y + row * (LABEL_H + GAP_Y);
    drawLabel(doc, o, x, y);
  });

  return doc.output("blob");
}

export function downloadLabelsPdf(orders: LabelOrder[], filename = "etiquetas.pdf") {
  const blob = generateLabelsPdf(orders);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
