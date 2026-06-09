/**
 * Fase 4 — Evaluación @react-pdf/renderer (spike, no migración)
 *
 * Decisión: NO migrar por ahora.
 *
 * Criterios evaluados:
 * - Fase 3 implementa paginación por slices + secciones partidas → legibilidad OK
 * - Stack actual (html2canvas + jsPDF + Recharts) reutiliza pantalla sin reescribir
 * - Costo de migración (~6–10 días) no justificado para reportes internos
 *
 * Reevaluar si:
 * - Se requiere PDF/UA (texto seleccionable, accesibilidad)
 * - Impresión profesional 300 DPI vectorial es requisito hard
 * - Volumen de datos hace inviable html2canvas incluso con slices
 *
 * Spike técnico sugerido (manual): prototipo portada + KPIs con @react-pdf/renderer
 * comparando bundle size y tiempo de export vs buildReportesPdfFromElement.
 */
export const REACT_PDF_EVALUATION = {
  decision: "defer",
  evaluatedAt: "2026-06-03",
  currentStrategy: "html2canvas-v2",
  migrateWhen: ["pdf-ua-required", "print-quality-hard-requirement", "pagination-insufficient"],
};
