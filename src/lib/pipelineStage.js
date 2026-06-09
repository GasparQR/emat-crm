/** @deprecated use WON_STAGE_CODES with etapas context */
export const WON_STAGES = ["GANADA", "EJECUTADA"];

export const WON_STAGE_CODES = ["GANADA", "EJECUTADA"];
export const WON_UMBRELLA_CODE = "GANADA";
export const EXECUTED_STAGE_CODE = "EJECUTADA";
export const LOST_STAGE_CODE = "PERDIDA";
export const LEAD_STAGE_CODE = "NUEVO_LEAD";

const LEGACY_NAME_TO_CODIGO = {
  "NUEVO LEAD": "NUEVO_LEAD",
  "A COTIZAR": "A_COTIZAR",
  NEGOCIACION: "NEGOCIACION",
  GANADA: "GANADA",
  EJECUTADA: "EJECUTADA",
  PAUSADA: "PAUSADA",
  PERDIDA: "PERDIDA",
};

export function findStage(etapas, stageName) {
  if (!stageName || !Array.isArray(etapas)) return null;
  return etapas.find((s) => s.pipeline_stage === stageName) ?? null;
}

export function getStageCodigo(stageName, etapas = []) {
  const stage = findStage(etapas, stageName);
  if (stage?.codigo) return stage.codigo;
  return LEGACY_NAME_TO_CODIGO[stageName] ?? null;
}

export function isWonStage(stageName, etapas = []) {
  const codigo = getStageCodigo(stageName, etapas);
  if (codigo) return WON_STAGE_CODES.includes(codigo);
  return WON_STAGES.includes(stageName);
}

export function isLostStage(stageName, etapas = []) {
  const codigo = getStageCodigo(stageName, etapas);
  if (codigo) return codigo === LOST_STAGE_CODE;
  return stageName === "PERDIDA";
}

export function isLeadStage(stageName, etapas = []) {
  const stage = findStage(etapas, stageName);
  if (stage) return stage.orden === 0 || stage.codigo === LEAD_STAGE_CODE;
  return stageName === "NUEVO LEAD";
}

export function getLostStageName(etapas = []) {
  const lost = etapas.find((s) => s.codigo === LOST_STAGE_CODE || s.pipeline_stage === "PERDIDA");
  return lost?.pipeline_stage ?? "PERDIDA";
}

export function getReportGroupCodigo(stageName, etapas = []) {
  const stage = findStage(etapas, stageName);
  if (stage?.agrupa_en_reporte_codigo) return stage.agrupa_en_reporte_codigo;
  return stage?.codigo || getStageCodigo(stageName, etapas) || stageName;
}

export function getReportGroupLabel(stageName, etapas = []) {
  const groupCodigo = getReportGroupCodigo(stageName, etapas);
  const umbrella = etapas.find((s) => s.codigo === groupCodigo);
  if (umbrella?.pipeline_stage) return umbrella.pipeline_stage;
  if (groupCodigo === WON_UMBRELLA_CODE) return "GANADA";
  return stageName;
}

export function isReportGroupedStage(stage, etapas = []) {
  const s = findStage(etapas, stage);
  return Boolean(s?.agrupa_en_reporte_codigo);
}

export function slugifyStageCodigo(name) {
  const base = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base ? `CUSTOM_${base.slice(0, 24)}` : `CUSTOM_${Date.now()}`;
}

export function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export function getFechaGanadoFromConsulta(consulta) {
  return consulta?.fecha_ganado ?? consulta?.fechaGanado ?? null;
}

export function shouldAssignNroPpto(consulta, newStage, etapas = []) {
  if (isLeadStage(newStage, etapas)) return false;
  const destStage = findStage(etapas, newStage);
  return Boolean(destStage && destStage.orden !== 0 && consulta && !consulta.nroppto);
}

export function applyFechaGanadoOnStageChange({
  previousStage,
  nextStage,
  currentFechaGanado,
  patch = {},
  etapas = [],
}) {
  const next = { ...patch };
  const wasWon = isWonStage(previousStage, etapas);
  const isNowWon = isWonStage(nextStage, etapas);

  if (isNowWon && !wasWon && !currentFechaGanado && next.fecha_ganado == null) {
    next.fecha_ganado = todayDateString();
  }

  if (!isNowWon && wasWon) {
    next.fecha_ganado = null;
  }

  return next;
}

export function buildPipelineStagePatch(consulta, newStage, extra = {}, etapas = []) {
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
    etapas,
  });
}

/**
 * @param {object} consulta
 * @param {string} newStage
 * @param {{ etapas?: object[], allocateNroPpto?: () => Promise<number>, getNextNroPpto?: () => Promise<number>, extra?: object }} [options]
 */
export async function buildPipelineStagePatchAsync(
  consulta,
  newStage,
  { etapas = [], allocateNroPpto, getNextNroPpto, extra = {} } = {},
) {
  const patch = buildPipelineStagePatch(consulta, newStage, extra, etapas);
  if (!patch) return null;

  const allocate = allocateNroPpto ?? getNextNroPpto;
  if (shouldAssignNroPpto(consulta, newStage, etapas) && typeof allocate === "function") {
    patch.nroppto = await allocate();
  }

  return patch;
}

export function buildWonBreakdown(filtradas = [], etapas = []) {
  const ganadaStage = etapas.find((s) => s.codigo === WON_UMBRELLA_CODE);
  const ejecutadaStage = etapas.find((s) => s.codigo === EXECUTED_STAGE_CODE);
  const ganadaLabel = ganadaStage?.pipeline_stage ?? "GANADA";
  const ejecutadaLabel = ejecutadaStage?.pipeline_stage ?? "EJECUTADA";
  const ganada = filtradas.filter((c) => c.pipeline_stage === ganadaLabel).length;
  const ejecutada = filtradas.filter((c) => c.pipeline_stage === ejecutadaLabel).length;
  return {
    umbrellaLabel: ganadaLabel,
    ganadaLabel,
    ejecutadaLabel,
    ganada,
    ejecutada,
    total: ganada + ejecutada,
  };
}
