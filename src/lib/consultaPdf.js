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
  empresa: consulta.empresa ?? "EMAT Celulosa",
  descripcionServicio: consulta.descripcionservicio ?? consulta.descripcionServicio ?? "Presupuesto de Servicio",
  cotizador: consulta.cotizador ?? "",
  telefonoCotizador: consulta.telefonocotizador ?? consulta.telefonoCotizador ?? "",
  condicionesComerciales: consulta.condicionescomerciales ?? consulta.condicionesComerciales ?? "",
  fechaPresupuesto: consulta.fechapresupuesto ?? consulta.fechaPresupuesto ?? new Date().toISOString().split('T')[0],
  diasValidez: consulta.diasvalidez ?? consulta.diasValidez ?? 30,
  // Items array para múltiples líneas
  items: consulta.items ?? [
    {
      descripcion: consulta.descripcionservicio ?? consulta.descripcionServicio ?? "Presupuesto de Servicio",
      precioUnitario: consulta.preciounitario ?? consulta.precioUnitario ?? "",
      cantidad: consulta.cantidad ?? "",
      importe: consulta.importe ?? "",
    }
  ],
  logoUrl: consulta.logoUrl ?? null,
});

const fmt = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const money = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
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

// Función para agregar logo desde URL o data
const addLogoToPdf = async (doc, logoUrl, x = 14, y = 8, width = 18, height = 8) => {
  try {
    if (!logoUrl) return;
    
    // Si es una URL remota, cargar con fetch
    if (logoUrl.startsWith("http")) {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = () => {
          const imgData = reader.result;
          doc.addImage(imgData, "PNG", x, y, width, height);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } else {
      // Si es data URL local
      doc.addImage(logoUrl, "PNG", x, y, width, height);
    }
  } catch (error) {
    console.error("Error al agregar logo:", error);
  }
};

// Función para calcular el total de items
const calcularTotales = (items = []) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (Number(item.importe) || 0);
  }, 0);
  return { subtotal };
};

export const buildConsultaPdf = async (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // === HEADER: LOGO + EMPRESA + TITULO ===
  doc.setFillColor(30, 66, 80); // Color azul oscuro (EMAT style)
  doc.rect(0, 0, pageWidth, 22, "F");

  // Agregar logo si existe
  if (c.logoUrl) {
    try {
      await addLogoToPdf(doc, c.logoUrl, 14, 6, 20, 12);
    } catch (e) {
      console.warn("No se pudo cargar el logo");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(c.empresa, 38, 14); // Desplazado a la derecha del logo

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text("Presupuesto de Servicio", pageWidth - 14, 14, { align: "right" });

  // === TITULO Y DATOS PRINCIPALES ===
  doc.setTextColor(30, 66, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Presupuesto nº ${fmt(c.nroppto)}`, 14, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Cliente: ${fmt(c.contactoNombre)}`, 14, 38);
  doc.text(`Asesor: ${fmt(c.asesor)}`, pageWidth - 60, 38);

  let contentY = 45;

  // === TABLA DE DETALLE ===
  // Columnas: Detalle (grande), Precio unitario, Cantidad, Importe
  const colX = {
    detalle: 14,
    precioUnitario: 120, // Desplazado más a la derecha
    cantidad: 155,
    importe: 180,
  };

  const rowHeight = 7;
  const headerY = contentY;

  // Header de tabla con fondo color
  drawHeaderRect(doc, colX.detalle, headerY, colX.precioUnitario - colX.detalle, rowHeight, [30, 66, 80], [255, 255, 255]);
  drawHeaderRect(doc, colX.precioUnitario, headerY, colX.cantidad - colX.precioUnitario, rowHeight, [30, 66, 80], [255, 255, 255]);
  drawHeaderRect(doc, colX.cantidad, headerY, colX.importe - colX.cantidad, rowHeight, [30, 66, 80], [255, 255, 255]);
  drawHeaderRect(doc, colX.importe, headerY, pageWidth - colX.importe - 14, rowHeight, [30, 66, 80], [255, 255, 255]);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Detalle del servicio", colX.detalle + 2, headerY + 4.5, { align: "left" });
  doc.text("Precio unitario", colX.precioUnitario + 2, headerY + 4.5, { align: "left" });
  doc.text("Cantidad", colX.cantidad + 2, headerY + 4.5, { align: "left" });
  doc.text("Importe", colX.importe + 2, headerY + 4.5, { align: "left" });

  // Línea separadora debajo del header
  doc.setDrawColor(200, 200, 200);
  doc.line(14, headerY + rowHeight, pageWidth - 14, headerY + rowHeight);

  contentY = headerY + rowHeight + 4;

  // Iterar sobre los items
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const items = c.items || [];
  const colWidthDetalle = colX.precioUnitario - colX.detalle - 4;

  items.forEach((item, index) => {
    const detalle = fmt(item.descripcion, "Servicio");
    const detalleWrapped = doc.splitTextToSize(detalle, colWidthDetalle);
    const detalleLines = detalleWrapped.length;
    const itemHeight = Math.max(detalleLines * 3.5 + 2, 6);

    // Verificar si necesita nueva página
    if (contentY + itemHeight > pageHeight - 40) {
      doc.addPage();
      contentY = 14;
    }

    // Detalle (con wrap)
    doc.text(detalleWrapped, colX.detalle + 2, contentY);

    // Precio unitario
    doc.text(money(item.precioUnitario), colX.precioUnitario + 2, contentY, { align: "left" });

    // Cantidad
    doc.text(fmt(item.cantidad), colX.cantidad + 2, contentY, { align: "left" });

    // Importe
    doc.text(money(item.importe), colX.importe + 2, contentY, { align: "left" });

    contentY += itemHeight + 1;

    // Línea separadora entre items
    doc.setDrawColor(220, 220, 220);
    doc.line(14, contentY, pageWidth - 14, contentY);
    contentY += 2;
  });

  // Línea final más oscura
  doc.setDrawColor(100, 100, 100);
  doc.line(14, contentY, pageWidth - 14, contentY);
  contentY += 4;

  // === SUBTOTALES ===
  const { subtotal } = calcularTotales(items);
  const ivaValue = (subtotal * (parseFloat(c.iva) || 21)) / 100;
  const total = subtotal + ivaValue;

  const subtotalColX = pageWidth - 100;
  const labelWidth = 45;
  const valueX = pageWidth - 15;

  // Fila SUB-TOTAL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("SUB-TOTAL NETO", subtotalColX, contentY, { align: "left" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(money(subtotal), valueX, contentY, { align: "right" });
  contentY += 6;

  // Fila IVA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`IVA ${fmt(c.iva, "21")}%`, subtotalColX, contentY, { align: "left" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(money(ivaValue), valueX, contentY, { align: "right" });
  contentY += 8;

  // Fila TOTAL (destacada)
  doc.setFillColor(30, 66, 80);
  doc.rect(subtotalColX - 5, contentY - 5, pageWidth - subtotalColX, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", subtotalColX, contentY + 0.5, { align: "left" });
  doc.text(money(total), valueX - 1, contentY + 0.5, { align: "right" });

  contentY += 12;

  // === SUPERFICIE TOTAL ===
  if (c.superficieM2) {
    doc.setTextColor(30, 66, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Superficie total:", 14, contentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`${fmt(c.superficieM2)} m²`, 50, contentY);
    contentY += 6;
  }

  // === OBSERVACIONES ===
  if (c.observaciones) {
    doc.setTextColor(30, 66, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("* Observaciones:", 14, contentY);
    contentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    const obsLines = doc.splitTextToSize(fmt(c.observaciones), 180);
    doc.text(obsLines, 14, contentY);
    contentY += obsLines.length * 3.2 + 2;
  }

  // === CONDICIONES COMERCIALES ===
  contentY += 2;
  doc.setTextColor(30, 66, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Condiciones comerciales", 14, contentY);
  contentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  const fechaValidez = calcularFechaValidez(c.fechaPresupuesto, c.diasValidez);
  const condicionesConFecha = `Validez del presupuesto: hasta ${fechaValidez}\n${fmt(c.condicionesComerciales, "Ver términos y condiciones")}`;
  const condLines = doc.splitTextToSize(condicionesConFecha, 180);
  doc.text(condLines, 14, contentY);

  // === FIRMA Y DATOS COTIZADOR (pie de página) ===
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Cotizó: ${fmt(c.asesor, "Asesor")}`, 14, pageHeight - 8);
  doc.text(`Fecha: ${fmt(c.fechaPresupuesto)}`, pageWidth - 60, pageHeight - 8);

  return doc;
};

export const openConsultaPdf = async (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = await buildConsultaPdf(c);
  doc.save(buildConsultaFileName(c));
};

export const saveConsultaPdf = async (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = await buildConsultaPdf(c);
  doc.save(buildConsultaFileName(c));
};

// Nueva función para obtener el documento sin guardarlo (para visualización)
export const getConsultaPdfDoc = async (consulta) => {
  return await buildConsultaPdf(consulta);
};
