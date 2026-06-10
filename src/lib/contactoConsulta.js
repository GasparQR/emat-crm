import { CANALES } from "@/components/crm/ConsultaForm";

const PROVINCIAS = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
];

/**
 * Maps contacto fields to ConsultaForm prefill (camelCase).
 * Does not map segmento → tipoCliente or empresa → empresa presupuesto.
 */
export function mapContactoToConsultaPrefill(contacto) {
  if (!contacto) return {};

  const canal = contacto.canalOrigen ?? contacto.canalorigen ?? "";
  const provincia = contacto.provincia ?? "";

  return {
    contactoNombre: contacto.nombre ?? "",
    contactoWhatsapp: contacto.whatsapp ?? "",
    asesor: contacto.asesor ?? "",
    canalOrigen: CANALES.includes(canal) ? canal : "",
    provincia: PROVINCIAS.includes(provincia) ? provincia : "",
    ubicacionObra: contacto.localidad ?? "",
    notas: contacto.notas ?? "",
  };
}
