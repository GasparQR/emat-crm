const CONVERSION_BENCHMARK = 20;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreConversion(tasa) {
  if (!Number.isFinite(tasa)) return 50;
  if (tasa >= CONVERSION_BENCHMARK) return clamp(70 + ((tasa - CONVERSION_BENCHMARK) / CONVERSION_BENCHMARK) * 30);
  if (tasa >= 5) return clamp((tasa / CONVERSION_BENCHMARK) * 70);
  return clamp((tasa / 5) * 20);
}

function scoreGrowth(deltaPct) {
  if (deltaPct == null) return 50;
  if (deltaPct >= 30) return 100;
  if (deltaPct >= 0) return clamp(60 + (deltaPct / 30) * 40);
  if (deltaPct >= -50) return clamp(60 + (deltaPct / 50) * 60);
  return 0;
}

function scorePipelineActive(pipelineData, total) {
  if (!total || !pipelineData?.length) return 50;
  const active = pipelineData
    .filter((d) => ["A COTIZAR", "NEGOCIACION"].includes(d.pipeline_stage))
    .reduce((sum, d) => sum + d.cantidad, 0);
  const ratio = (active / total) * 100;
  if (ratio >= 30 && ratio <= 60) return 100;
  if (ratio > 60 && ratio <= 80) return clamp(100 - ((ratio - 60) / 20) * 40);
  if (ratio > 80) return clamp(40 - ((ratio - 80) / 20) * 40);
  if (ratio >= 10) return clamp(50 + ((ratio - 10) / 20) * 50);
  return clamp(ratio * 5);
}

function scoreFollowUp(seguimientoInfo) {
  const vencidos = seguimientoInfo?.vencidos?.length ?? 0;
  const proximos = seguimientoInfo?.proximos?.length ?? 0;
  const base = vencidos + proximos;
  if (base === 0) return 85;
  const overdueRatio = vencidos / base;
  if (overdueRatio <= 0.1) return 95;
  if (overdueRatio <= 0.25) return 80;
  if (overdueRatio <= 0.5) return clamp(80 - ((overdueRatio - 0.25) / 0.25) * 50);
  return clamp(30 - ((overdueRatio - 0.5) / 0.5) * 30);
}

function scoreLossRate(pct) {
  const rate = parseFloat(pct) || 0;
  if (rate <= 10) return 100;
  if (rate <= 20) return clamp(100 - ((rate - 10) / 10) * 30);
  if (rate <= 40) return clamp(70 - ((rate - 20) / 20) * 50);
  return clamp(20 - ((rate - 40) / 60) * 20);
}

export function buildCommercialHealthScore(metrics, comparative) {
  const breakdown = {
    conversion: Math.round(scoreConversion(parseFloat(metrics?.kpis?.tasa))),
    growth: Math.round(scoreGrowth(comparative?.total?.deltaPct)),
    pipeline: Math.round(scorePipelineActive(metrics?.pipelineData, metrics?.kpis?.total)),
    followUp: Math.round(scoreFollowUp(metrics?.seguimientoInfo)),
    losses: Math.round(scoreLossRate(metrics?.perdidasData?.pct)),
  };

  const weights = {
    conversion: 0.25,
    growth: 0.2,
    pipeline: 0.2,
    followUp: 0.2,
    losses: 0.15,
  };

  const score = Math.round(
    Object.entries(weights).reduce((sum, [key, weight]) => sum + breakdown[key] * weight, 0),
  );

  let grade = "critica";
  if (score >= 80) grade = "excelente";
  else if (score >= 60) grade = "buena";
  else if (score >= 40) grade = "regular";

  let color = "red";
  if (score >= 80) color = "green";
  else if (score >= 60) color = "amber";

  const emoji = score >= 80 ? "🟢" : score >= 60 ? "🟡" : "🔴";

  return { score, grade, color, emoji, breakdown, weights };
}
