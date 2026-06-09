import {
  buildReportMetrics,
  filterConsultasForReport,
} from "@/lib/reportesMetrics";
import {
  buildComparativeMetrics,
  previousPeriodRange,
} from "@/lib/reportesComparative";
import { buildCommercialHealthScore } from "@/lib/reportesHealthScore";
import { buildReportInsights } from "@/lib/reportesInsights";

/**
 * @param {import('./reportesMetrics').ReportConsulta[]} consultas
 * @param {import('./reportesMetrics').ReportDateFilterOptions} [options]
 */
export function buildReportBundle(
  consultas,
  { mode, desde, hasta, asesor = "todos" } = {},
) {
  const { prevDesde, prevHasta } = previousPeriodRange(desde, hasta);

  const filtradas = filterConsultasForReport(consultas, { mode, desde, hasta, asesor });
  const filtradasPrev = filterConsultasForReport(consultas, {
    mode,
    desde: prevDesde,
    hasta: prevHasta,
    asesor,
  });

  const metrics = buildReportMetrics(filtradas);
  const previousMetrics = buildReportMetrics(filtradasPrev);

  const comparative = buildComparativeMetrics(metrics, previousMetrics, {
    desde,
    hasta,
    prevDesde,
    prevHasta,
  });

  const healthScore = buildCommercialHealthScore(metrics, comparative);

  const meta = {
    desde,
    hasta,
    prevDesde,
    prevHasta,
    totalCount: filtradas.length,
    previousCount: filtradasPrev.length,
  };

  const insights = buildReportInsights({ metrics, comparative, healthScore, meta });

  return {
    metrics,
    previousMetrics,
    comparative,
    healthScore,
    insights,
    meta,
    filtradas,
  };
}
