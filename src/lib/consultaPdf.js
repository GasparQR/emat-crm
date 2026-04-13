import { jsPDF } from "jspdf";

const normalizeConsulta = (consulta = {}) => ({
  nroppto: consulta.nroppto ?? consulta.nroPpto ?? "",
  contactoNombre: consulta.contactonombre ?? consulta.contactoNombre ?? "",
  contactoWhatsapp: consulta.contactowhatsapp ?? consulta.contactoWhatsapp ?? "",
  asesor: consulta.asesor ?? "",
  tipoAplicacion: consulta.tipoaplicacion ?? consulta.tipoAplicacion ?? "",
  ubicacionObra: consulta.ubicacionobra ?? consulta.ubicacionObra ?? "",
  provincia: consulta.provincia ?? "",
  superficieM2: consulta.superficiem2 ?? consulta.superficieM2 ?? "",
  fibraKg: consulta.fibrakg ?? consulta.fibraKg ?? "",
  adhLts: consulta.adhlts ?? consulta.adhLts ?? "",
  kmObra: consulta.kmobra ?? consulta.kmObra ?? "",
  tipoCliente: consulta.tipocliente ?? consulta.tipoCliente ?? "",
  canalOrigen: consulta.canalorigen ?? consulta.canalOrigen ?? "",
  precioUnitario: consulta.preciounitario ?? consulta.precioUnitario ?? "",
  cantidad: consulta.cantidad ?? "",
  importe: consulta.importe ?? "",
  etapa: consulta.pipeline_stage ?? consulta.etapa ?? "",
  mes: consulta.mes ?? "",
  ano: consulta.ano ?? "",
  proximoSeguimiento: consulta.proximoseguimiento ?? consulta.proximoSeguimiento ?? "",
  observaciones: consulta.observaciones ?? "",
  iva: consulta.iva ?? 21,
  empresa: consulta.empresa ?? "EMAT",
  descripcionServicio: consulta.descripcionservicio ?? consulta.descripcionServicio ?? "Presupuesto de Servicio",
  cotizador: consulta.cotizador ?? "",
  telefonoCotizador: consulta.telefonocotizador ?? consulta.telefonoCotizador ?? "",
  condicionesComerciales: consulta.condicionescomerciales ?? consulta.condicionesComerciales ?? "",
});

const fmt = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const money = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `$${n.toLocaleString("es-AR")}`;
};

const drawHeaderRect = (doc, x, y, w, h, bgColor, textColor) => {
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(x, y, w, h, "F");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
};

export const buildConsultaPdf = (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // === HEADER: EMPRESA + TITULO ===
  doc.setFillColor(30, 66, 80); // Color azul oscuro (EMAT style)
  doc.rect(0, 0, pageWidth, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(c.empresa, 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(c.descripcionServicio, pageWidth - 14, 12, { align: "right" });

  // === TITULO Y DATOS PRINCIPALES ===
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Presupuesto nº ${fmt(c.nroppto)}`, 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Cliente: ${fmt(c.contactoNombre)}`, 14, 35);

  // === TABLA DE DETALLE ===
  const tableY = 42;
  const colX = [14, 75, 130, 160];
  const colWidths = [61, 55, 30, 30];
  const rowHeight = 6;

  // Header de tabla
  drawHeaderRect(doc, colX[0], tableY, colX[1] - colX[0], rowHeight, [0, 0, 0], [255, 255, 255]);
  drawHeaderRect(doc, colX[1], tableY, colX[2] - colX[1], rowHeight, [0, 0, 0], [255, 255, 255]);
  drawHeaderRect(doc, colX[2], tableY, colX[3] - colX[2], rowHeight, [0, 0, 0], [255, 255, 255]);
  drawHeaderRect(doc, colX[3], tableY, pageWidth - colX[3] - 14, rowHeight, [0, 0, 0], [255, 255, 255]);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Detalle", colX[0] + 2, tableY + 4);
  doc.text("Precio unitario", colX[1] + 2, tableY + 4);
  doc.text("Cantidad", colX[2] + 2, tableY + 4);
  doc.text("Importe ($)", colX[3] + 2, tableY + 4);

  // Fila de detalle
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let contentY = tableY + rowHeight + 2;

  const detalle = fmt(c.tipoAplicacion, "Servicio de aislación");
  const detalleWrapped = doc.splitTextToSize(detalle, colWidths[0] - 2);
  doc.text(detalleWrapped, colX[0] + 2, contentY);
  const detalleLines = detalleWrapped.length;
  const rowActualHeight = detalleLines * 4 + 2;

  doc.text(money(c.precioUnitario), colX[1] + 2, contentY);
  doc.text(fmt(c.cantidad), colX[2] + 2, contentY);
  doc.text(money(c.importe), colX[3] + 2, contentY);

  contentY += rowActualHeight + 2;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(14, contentY, pageWidth - 14, contentY);
  contentY += 3;

  // === SUBTOTALES ===
  const subtotal = parseFloat(c.importe) || 0;
  const ivaValue = (subtotal * (parseFloat(c.iva) || 21)) / 100;
  const total = subtotal + ivaValue;

  const subtotalColX = pageWidth - 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.text("SUB-TOTAL NETO", subtotalColX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(money(subtotal), pageWidth - 15, contentY, { align: "right" });
  contentY += 6;

  doc.setFont("helvetica", "bold");
  doc.text(`IVA ${fmt(c.iva, "21")}%`, subtotalColX, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(money(ivaValue), pageWidth - 15, contentY, { align: "right" });
  contentY += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL", subtotalColX, contentY);
  doc.text(money(total), pageWidth - 15, contentY, { align: "right" });
  contentY += 8;

  // === SUPERFICIE TOTAL ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Superficie total", 14, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(fmt(c.superficieM2), 60, contentY);
  contentY += 8;

  // === OBSERVACIONES ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("* Observaciones:", 14, contentY);
  contentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const obsLines = doc.splitTextToSize(fmt(c.observaciones, "Sin observaciones"), 180);
  doc.text(obsLines, 14, contentY);
  contentY += obsLines.length * 3.5 + 3;

  // === CONDICIONES COMERCIALES ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Condiciones comerciales", 14, contentY);
  contentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const condLines = doc.splitTextToSize(fmt(c.condicionesComerciales, "Ver términos y condiciones"), 180);
  doc.text(condLines, 14, contentY);
  contentY += condLines.length * 3 + 3;

  // === FIRMA Y DATOS COTIZADOR ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Cotizó ${fmt(c.cotizador, "Asesor")}`, 14, pageHeight - 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(fmt(c.telefonoCotizador), 14, pageHeight - 11);

  return doc;
};

export const openConsultaPdf = (consulta) => {
  const doc = buildConsultaPdf(consulta);
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank", "noopener,noreferrer");
};

export const saveConsultaPdf = (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = buildConsultaPdf(c);
  const nombre = (c.contactoNombre || "cliente").replace(/\s+/g, "_");
  const nro = c.nroppto || "sin_numero";
  doc.save(`presupuesto_${nro}_${nombre}.pdf`);
};
