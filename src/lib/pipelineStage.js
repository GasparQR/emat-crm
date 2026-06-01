export const WON_STAGES = ["GANADA", "EJECUTADA"];

export function isWonStage(stage) {
  return WON_STAGES.includes(stage);
}

export function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export function getFechaGanadoFromConsulta(consulta) {
  return consulta?.fecha_ganado ?? consulta?.fechaGanado ?? null;
}

export function shouldAssignNroPpto(consulta, newStage, etapas = []) {
  const destStage = etapas.find((s) => s.pipeline_stage === newStage);
  return Boolean(destStage && destStage.orden !== 0 && consulta && !consulta.nroppto);
}

/**
 * Sets fecha_ganado on patch when transitioning into a won stage for the first time.
 * Mirrors the Supabase trigger logic (client-side fallback).
 */
export function applyFechaGanadoOnStageChange({
  previousStage,
  nextStage,
  currentFechaGanado,
  patch = {},
}) {
  const next = { ...patch };
  const wasWon = isWonStage(previousStage);
  const isNowWon = isWonStage(nextStage);

  if (isNowWon && !wasWon && !currentFechaGanado && next.fecha_ganado == null) {
    next.fecha_ganado = todayDateString();
  }

  return next;
}

/**
 * Builds update patch for pipeline stage changes (stage + fecha_ganado).
 * Caller may add nroppto after await getNextNroPpto() when shouldAssignNroPpto is true.
 */
export function buildPipelineStagePatch(consulta, newStage, extra = {}) {
  if (!newStage || newStage === consulta?.pipeline_stage) {
    return null;
  }

  return applyFechaGanadoOnStageChange({
    previousStage: consulta?.pipeline_stage,
    nextStage: newStage,
    currentFechaGanado: getFechaGanadoFromConsulta(consulta),
    patch: {
      pipeline_stage: newStage,
      ...extra,
    },
  });
}

export async function buildPipelineStagePatchAsync(
  consulta,
  newStage,
  { etapas = [], getNextNroPpto, extra = {} } = {}
) {
  const patch = buildPipelineStagePatch(consulta, newStage, extra);
  if (!patch) return null;

  if (shouldAssignNroPpto(consulta, newStage, etapas) && typeof getNextNroPpto === "function") {
    patch.nroppto = await getNextNroPpto();
  }

  return patch;
}
