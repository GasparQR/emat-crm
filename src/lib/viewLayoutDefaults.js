/** @typedef {{ id: string, label: string, enabled: boolean, order: number }} ViewColumnDef */
/** @typedef {{ id: string, label: string, enabled: boolean }} ViewFilterDef */
/** @typedef {{ columns?: ViewColumnDef[], filters: ViewFilterDef[] }} ViewLayoutSection */

export const VIEW_IDS = ["consultas", "contactos", "pipeline", "hoy", "reportes"];

/** @type {Record<string, ViewLayoutSection>} */
export const DEFAULT_VIEW_LAYOUT = {
  consultas: {
    columns: [
      { id: "cliente", label: "Cliente", enabled: true, order: 0 },
      { id: "asesor", label: "Asesor", enabled: true, order: 1 },
      { id: "m2_tipo", label: "m² / Tipo", enabled: true, order: 2 },
      { id: "importe", label: "Importe", enabled: true, order: 3 },
      { id: "estado", label: "Estado", enabled: true, order: 4 },
      { id: "fecha_ganada", label: "Fecha ganada", enabled: true, order: 5 },
      { id: "seguimiento", label: "Seguimiento", enabled: true, order: 6 },
      { id: "acciones", label: "Acciones", enabled: true, order: 7 },
    ],
    filters: [
      { id: "busqueda", label: "Búsqueda", enabled: true },
      { id: "estado", label: "Estado", enabled: true },
      { id: "asesor", label: "Asesor", enabled: true },
      { id: "ano", label: "Año", enabled: true },
      { id: "fecha_ganada_desde", label: "Fecha ganada desde", enabled: true },
      { id: "fecha_ganada_hasta", label: "Fecha ganada hasta", enabled: true },
    ],
  },
  contactos: {
    columns: [
      { id: "contacto", label: "Contacto", enabled: true, order: 0 },
      { id: "telefono", label: "Teléfono", enabled: true, order: 1 },
      { id: "segmento", label: "Segmento", enabled: true, order: 2 },
      { id: "estado", label: "Estado", enabled: true, order: 3 },
      { id: "asesor", label: "Asesor", enabled: true, order: 4 },
      { id: "ciudad", label: "Ciudad", enabled: true, order: 5 },
      { id: "provincia", label: "Provincia", enabled: true, order: 6 },
      { id: "acciones", label: "Acciones", enabled: true, order: 7 },
    ],
    filters: [
      { id: "busqueda", label: "Búsqueda", enabled: true },
      { id: "segmento", label: "Segmento", enabled: true },
      { id: "provincia", label: "Provincia", enabled: true },
      { id: "ciudad", label: "Ciudad", enabled: true },
    ],
  },
  pipeline: {
    filters: [
      { id: "canal", label: "Canal", enabled: true },
      { id: "asesor", label: "Asesor", enabled: true },
      { id: "prioridad", label: "Prioridad", enabled: true },
    ],
  },
  hoy: {
    filters: [{ id: "asesor", label: "Asesor", enabled: true }],
  },
  reportes: {
    filters: [
      { id: "mes_ano", label: "Mes / año", enabled: true },
      { id: "asesor", label: "Asesor", enabled: true },
      { id: "ano", label: "Año", enabled: true },
    ],
  },
};

export const DEFAULT_FREQUENT_CITIES = [
  "Córdoba",
  "Villa Carlos Paz",
  "Río Cuarto",
  "Villa María",
  "Alta Gracia",
];
