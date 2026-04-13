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
  importe: consulta.importe ?? "",
  etapa: consulta.pipeline_stage ?? consulta.etapa ?? "",
  mes: consulta.mes ?? "",
  ano: consulta.ano ?? "",
  proximoSeguimiento: consulta.proximoseguimiento ?? consulta.proximoSeguimiento ?? "",
  observaciones: consulta.observaciones ?? "",
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

export const buildConsultaPdf = (consulta) => {
  const c = normalizeConsulta(consulta);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Presupuesto", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nro: ${fmt(c.nroppto)}`, 14, 23);
  doc.text(`Fecha: ${fmt(c.mes)} ${fmt(c.ano, "")}`.trim(), 60, 23);
  doc.text(`Asesor: ${fmt(c.asesor)}`, 120, 23);

  let y = 32;
  const line = (label, value) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(fmt(value), 55, y);
    y += 6;
  };

  line("Cliente", c.contactoNombre);
  line("WhatsApp", c.contactoWhatsapp);
  line("Tipo cliente", c.tipoCliente);
  line("Canal origen", c.canalOrigen);
  line("Ubicacion obra", c.ubicacionObra);
  line("Provincia", c.provincia);
  line("Tipo aplicacion", c.tipoAplicacion);
  line("Superficie (m2)", c.superficieM2);
  line("Fibra (kg)", c.fibraKg);
  line("Adhesivo (lts)", c.adhLts);
  line("Km obra", c.kmObra);
  line("Estado", c.etapa);
  line("Prox. seguimiento", c.proximoSeguimiento);
  line("Importe", money(c.importe));

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Observaciones:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(fmt(c.observaciones, "Sin observaciones"), 180);
  doc.text(wrapped, 14, y);

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
