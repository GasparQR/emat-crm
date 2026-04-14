import { jsPDF } from "jspdf";

const PRESUPUESTO_LOGO_DATA_URI = `data:image/png;base64,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`;
const PRESUPUESTO_LOGO_BASE64 = PRESUPUESTO_LOGO_DATA_URI.replace(/^data:image\/png;base64,/, "");

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
  firmaAsesor: consulta.firmaasesor ?? consulta.firmaAsesor ?? "",
  fechaPresupuesto: consulta.fechapresupuesto ?? consulta.fechaPresupuesto ?? new Date().toISOString().split('T')[0],
  diasValidez: consulta.diasvalidez ?? consulta.diasValidez ?? 30,
  items: Array.isArray(consulta.items) ? consulta.items : [],
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

const sanitizeFilePart = (value = "") =>
  String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ");

const buildConsultaFileName = (consulta) => {
  const c = normalizeConsulta(consulta);
  const nro = sanitizeFilePart(c.nroppto || "S/N");
  const cliente = sanitizeFilePart(c.contactoNombre || "Cliente");
  return `Presupuesto nº ${nro} - ${cliente}.pdf`;
};

const calcularFechaValidez = (fechaString, diasValidez) => {
  const fecha = new Date(fechaString);
  fecha.setDate(fecha.getDate() + parseInt(diasValidez));
  return fecha.toLocaleDateString("es-AR");
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
  let logoRendered = false;
  try {
    doc.addImage(PRESUPUESTO_LOGO_BASE64, "PNG", 14, 3, 45, 12, undefined, "FAST");
    logoRendered = true;
  } catch {}
  if (!logoRendered) {
    try {
      doc.addImage(PRESUPUESTO_LOGO_DATA_URI, "PNG", 14, 3, 45, 12, undefined, "FAST");
      logoRendered = true;
    } catch {}
  }
  if (!logoRendered) {
    doc.text(c.empresa, 14, 12);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text("Especialistas en Aislaciones", pageWidth - 14, 12, { align: "right" });

  // === TITULO Y DATOS PRINCIPALES ===
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Presupuesto nº ${fmt(c.nroppto)}`, 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Cliente: ${fmt(c.contactoNombre)}`, 14, 35);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Ubicación: ${fmt(c.ubicacionObra)}, ${fmt(c.provincia)}`, 14, 40);
  doc.setTextColor(0, 0, 0);

  // === TABLA DE DETALLE ===
  const tableY = 53;
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

  // Línea separadora debajo del header

  doc.line(14, tableY + rowHeight, pageWidth - 14, tableY + rowHeight);

  // Filas de detalle
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let contentY = tableY + rowHeight + 6;

  const fallbackItem = {
    descripcionServicio: c.descripcionServicio,
    precioUnitario: c.precioUnitario,
    cantidad: c.cantidad,
    importe: c.importe,
  };
  const items = (c.items?.length ? c.items : [fallbackItem]).map((item) => ({
    descripcionServicio: item.descripcionServicio ?? item.descripcionservicio ?? "",
    precioUnitario: item.precioUnitario ?? item.preciounitario ?? "",
    cantidad: item.cantidad ?? "",
    importe: item.importe ?? "",
  }));

  items.forEach((item) => {
    const detalle = fmt(item.descripcionServicio, "Servicio de aislacion");
    const detalleWrapped = doc.splitTextToSize(detalle, colWidths[0] - 2);
    doc.text(detalleWrapped, colX[0] + 2, contentY);
    const detalleLines = detalleWrapped.length;
    const rowActualHeight = detalleLines * 4 + 2;

    doc.text(money(item.precioUnitario), colX[1] + 2, contentY);
    doc.text(fmt(item.cantidad), colX[2] + 2, contentY);
    doc.text(money(item.importe), colX[3] + 2, contentY);

    contentY += rowActualHeight + 2;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, contentY, pageWidth - 14, contentY);
    contentY += 3;
  });

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(14, contentY, pageWidth - 14, contentY);
  contentY += 3;

  // === SUBTOTALES ===
  const subtotal =
    items.reduce((acc, item) => acc + (parseFloat(item.importe) || 0), 0) ||
    parseFloat(c.importe) ||
    0;
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
  const fechaValidez = calcularFechaValidez(c.fechaPresupuesto, c.diasValidez);
  const condicionesConFecha = `Validez del presupuesto: hasta ${fechaValidez}\n${fmt(c.condicionesComerciales, "Ver términos y condiciones")}`;
  const condLines = doc.splitTextToSize(condicionesConFecha, 180);
  doc.text(condLines, 14, contentY);
  contentY += condLines.length * 3 + 3;

  // === FIRMA Y DATOS COTIZADOR ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Cotizó ${fmt(c.firmaAsesor || c.asesor, "Asesor")}`, 14, pageHeight - 12);

  return doc;
};

export const openConsultaPdf = (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = buildConsultaPdf(c);
  doc.save(buildConsultaFileName(c));
};

export const saveConsultaPdf = (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = buildConsultaPdf(c);
  doc.save(buildConsultaFileName(c));
};
