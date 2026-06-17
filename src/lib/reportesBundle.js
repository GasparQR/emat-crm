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
 * @typedef {import('./reportesMetrics').ReportDateFilterOptions & {
 *   etapas?: object[],
 *   showWonBreakdown?: boolean,
 * }} ReportBundleOptions
 */

/**
 * @param {import('./reportesMetrics').ReportConsulta[]} consultas
 * @param {ReportBundleOptions} [options]
 */
export function buildReportBundle(
  consultas,
  {
    mode,
    desde,
    hasta,
    asesor = /** @type {string|string[]} */ ("todos"),
    etapas = [],
    showWonBreakdown = false,
  } = {},
) {
  const { prevDesde, prevHasta } = previousPeriodRange(desde, hasta);

  const filtradas = filterConsultasForReport(consultas, { mode, desde, hasta, asesor });
  const filtradasPrev = filterConsultasForReport(consultas, {
    mode,
    desde: prevDesde,
    hasta: prevHasta,
    asesor,
  });

  const metricsOptions = { etapas, showWonBreakdown };
  const metrics = buildReportMetrics(filtradas, metricsOptions);
  const previousMetrics = buildReportMetrics(filtradasPrev, metricsOptions);

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
