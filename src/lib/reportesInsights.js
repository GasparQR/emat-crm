import { fmtPesosCompacto } from "@/lib/reportesMetrics";

export function buildReportInsights({ metrics, comparative, healthScore, meta = {} }) {
  const insights = [];
  if (!metrics) return insights;

  const { kpis, mejorAsesor, metricasCrecimiento, pipelineData, perdidasData, canalOrigenData } =
    metrics;

  if (healthScore) {
    insights.push({
      type: "score",
      title: "Salud comercial",
      body: `${healthScore.emoji} ${healthScore.score}/100 — ${healthScore.grade}.`,
    });
  }

  if (comparative?.total?.label) {
    insights.push({
      type: comparative.total.sentiment,
      title: "Volumen de presupuestos",
      body: `${comparative.total.value} presupuestos (${comparative.total.label}).`,
    });
  } else if (kpis?.total != null) {
    insights.push({
      type: "info",
      title: "Volumen de presupuestos",
      body: `${kpis.total} presupuestos en el período.`,
    });
  }

  if (comparative?.tasa?.label) {
    insights.push({
      type: comparative.tasa.sentiment,
      title: "Tasa de conversión",
      body: `${comparative.tasa.value}% (${comparative.tasa.label}).`,
    });
  }

  if (comparative?.importeGanado?.label) {
    insights.push({
      type: comparative.importeGanado.sentiment,
      title: "Importe ganado",
      body: `${fmtPesosCompacto(comparative.importeGanado.value)} (${comparative.importeGanado.label}).`,
    });
  }

  if (mejorAsesor) {
    insights.push({
      type: "highlight",
      title: "Mejor asesor del período",
      body: `${mejorAsesor.asesor} lidera con ${mejorAsesor.tasa}% de conversión (${mejorAsesor.ganados}/${mejorAsesor.total}).`,
    });
  }

  const topMotivo = perdidasData?.motivosPie?.[0];
  if (topMotivo && perdidasData.total > 0) {
    const pct = ((topMotivo.value / perdidasData.total) * 100).toFixed(0);
    insights.push({
      type: "warning",
      title: "Principal motivo de pérdida",
      body: `"${topMotivo.name}" representa ${topMotivo.value} de ${perdidasData.total} pérdidas (${pct}%).`,
    });
  }

  if (metricasCrecimiento) {
    insights.push({
      type: parseFloat(metricasCrecimiento.crecimiento) >= 0 ? "positive" : "negative",
      title: "Evolución del pipeline",
      body: `Volumen ${metricasCrecimiento.direccion} ${Math.abs(metricasCrecimiento.crecimiento)}% (${metricasCrecimiento.primero} → ${metricasCrecimiento.ultimo} presupuestos).`,
    });
  }

  const bottleneck = [...(pipelineData || [])]
    .filter((d) => !["GANADA", "EJECUTADA", "PERDIDA"].includes(d.pipeline_stage))
    .sort((a, b) => b.cantidad - a.cantidad)[0];
  if (bottleneck?.cantidad) {
    insights.push({
      type: "info",
      title: "Cuello de botella",
      body: `${bottleneck.pipeline_stage} concentra ${bottleneck.cantidad} oportunidades activas.`,
    });
  }

  const topCanal = canalOrigenData?.[0];
  if (topCanal) {
    insights.push({
      type: "info",
      title: "Canal principal",
      body: `${topCanal.name} aporta ${topCanal.cantidad} presupuestos (${topCanal.ganados} ganados).`,
    });
  }

  if (meta.prevDesde && meta.prevHasta) {
    insights.push({
      type: "info",
      title: "Período de comparación",
      body: `Comparado contra ${meta.prevDesde} — ${meta.prevHasta}.`,
    });
  }

  return insights;
}

export function getSectionConclusion(sectionKey, { metrics, comparative, healthScore }) {
  switch (sectionKey) {
    case "dashboard":
      if (comparative?.total?.label) {
        return `El período registra ${comparative.total.value} presupuestos (${comparative.total.label}). Conversión: ${metrics.kpis.tasa}%.`;
      }
      return `El período registra ${metrics.kpis.total} presupuestos con conversión del ${metrics.kpis.tasa}%.`;
    case "asesores":
      return metrics.mejorAsesor
        ? `${metrics.mejorAsesor.asesor} lidera la conversión con ${metrics.mejorAsesor.tasa}%.`
        : "Datos insuficientes para destacar un asesor líder.";
    case "comercial":
      return metrics.metricasCrecimiento
        ? `Tendencia ${metrics.metricasCrecimiento.direccion} ${Math.abs(metrics.metricasCrecimiento.crecimiento)}% en volumen mensual.`
        : "Monitorear evolución mensual para detectar estacionalidad.";
    case "pipeline":
      return metrics.seguimientoInfo.vencidos.length > 0
        ? `Hay ${metrics.seguimientoInfo.vencidos.length} seguimientos vencidos que requieren acción inmediata.`
        : "Pipeline sin seguimientos vencidos críticos.";
    case "perdidas":
      return metrics.perdidasData.total > 0
        ? `${metrics.perdidasData.pct}% del total se perdió. Principal motivo: ${metrics.perdidasData.motivosPie[0]?.name || "Sin especificar"}.`
        : "Sin pérdidas registradas en el período.";
    case "health":
      return healthScore
        ? `Salud comercial ${healthScore.score}/100 (${healthScore.grade}).`
        : null;
    default:
      return null;
  }
}
