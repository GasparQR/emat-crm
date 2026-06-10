import moment from "moment";
import {
  buildWonBreakdown,
  getReportGroupLabel,
  isLostStage,
  isReportGroupedStage,
  isWonStage,
  WON_UMBRELLA_CODE,
} from "@/lib/pipelineStage";

export const ESTADO_COLORS = {
  "A COTIZAR": "#94a3b8",
  NEGOCIACION: "#f59e0b",
  GANADA: "#10b981",
  EJECUTADA: "#059669",
  PAUSADA: "#6b7280",
  PERDIDA: "#ef4444",
};

export const MESES_ORDEN = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

export const CHART_COLORS = [
  "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#a855f7", "#22d3ee", "#f43f5e",
];

export const DATE_CRITERIA = {
  PRESUPUESTO: "presupuesto",
  CREATED: "created",
  CIERRE: "cierre",
};

export const DATE_CRITERIA_LABELS = {
  [DATE_CRITERIA.PRESUPUESTO]: "Fecha del presupuesto",
  [DATE_CRITERIA.CREATED]: "Fecha de creación",
  [DATE_CRITERIA.CIERRE]: "Fecha de cierre",
};

const UNKNOWN_MONTH_INDEX = 99;
const MIN_ADVISOR_BUDGETS = 3;

export const fmt = (n) => n?.toLocaleString("es-AR") ?? "0";

export const fmtPesos = (n) =>
  `$${(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

export const fmtCompacto = (n) => {
  if (!n) return "0";
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(n % 1000000 >= 100000 ? 1 : 0)}M`.replace(".0", "");
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}K`.replace(".0", "");
  }
  return n?.toLocaleString("es-AR") ?? "0";
};

export const fmtPesosCompacto = (n) => `$${fmtCompacto(n || 0)}`;

export const fmtMonthYear = (mes, ano) =>
  mes && ano ? `${mes.slice(0, 3)} ${ano}` : "Sin fecha";

/**
 * @typedef {Object} ReportConsulta
 * @property {string} [asesor]
 * @property {string|number} [ano]
 * @property {string} [mes]
 * @property {string} [pipeline_stage]
 * @property {string} [fecha_ganado]
 * @property {string} [fechaGanado]
 * @property {string} [created_date]
 * @property {string} [createdDate]
 * @property {string} [fechapresupuesto]
 * @property {string} [fechaPresupuesto]
 * @property {number} [superficiem2]
 * @property {number} [fibrakg]
 * @property {number} [importe]
 * @property {string} [proximoseguimiento]
 * @property {string} [tipoaplicacion]
 * @property {string} [canalOrigen]
 * @property {string} [canalorigen]
 * @property {string} [ubicacionobra]
 * @property {string} [razonperdida]
 */

/**
 * @param {ReportConsulta} [consulta]
 * @param {string} [mode]
 */
export function resolveConsultaDate(consulta, mode = DATE_CRITERIA.PRESUPUESTO) {
  if (!consulta) return null;

  if (mode === DATE_CRITERIA.CIERRE) {
    const raw = consulta.fecha_ganado ?? consulta.fechaGanado;
    if (!raw) return null;
    const m = moment(raw);
    return m.isValid() ? m.startOf("day") : null;
  }

  if (mode === DATE_CRITERIA.CREATED) {
    const raw = consulta.created_date ?? consulta.createdDate;
    if (!raw) return null;
    const m = moment(raw);
    return m.isValid() ? m.startOf("day") : null;
  }

  const fechaPres = consulta.fechapresupuesto ?? consulta.fechaPresupuesto;
  if (fechaPres) {
    const m = moment(fechaPres);
    if (m.isValid()) return m.startOf("day");
  }

  const mes = String(consulta.mes || "").trim().toUpperCase();
  const ano = Number(consulta.ano);
  if (mes && Number.isFinite(ano)) {
    const idx = MESES_ORDEN.indexOf(mes);
    if (idx >= 0) return moment({ year: ano, month: idx, day: 1 });
  }

  const created = consulta.created_date ?? consulta.createdDate;
  if (created) {
    const m = moment(created);
    if (m.isValid()) return m.startOf("day");
  }

  return null;
}

/**
 * @typedef {Object} ReportDateFilterOptions
 * @property {string} [mode]
 * @property {string} [desde]
 * @property {string} [hasta]
 * @property {string} [asesor]
 */

/**
 * @typedef {Object} ReportScreenFilterOptions
 * @property {string|string[]} [filtroAsesor]
 * @property {string|string[]} [filtroAno]
 * @property {string|string[]} [filtroMesAno]
 */

/**
 * @param {ReportConsulta[]} consultas
 * @param {ReportDateFilterOptions} [options]
 */
export function filterConsultasForReport(
  consultas,
  { mode, desde, hasta, asesor = "todos" } = {},
) {
  const from = moment(desde).startOf("day");
  const to = moment(hasta).endOf("day");
  if (!from.isValid() || !to.isValid()) return [];

  const asesores = normalizeFilterValues(asesor);

  return (consultas || []).filter((c) => {
    if (asesores.length && !asesores.includes(c.asesor)) return false;
    const date = resolveConsultaDate(c, mode);
    if (!date) return false;
    return date.isBetween(from, to, "day", "[]");
  });
}

/** Normalize legacy single-value or multi-value filter inputs */
export function normalizeFilterValues(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (!val || val === "todos" || val === "todas") return [];
  return [String(val)];
}

/**
 * @param {ReportConsulta[]} consultas
 * @param {ReportScreenFilterOptions} [options]
 */
export function filterConsultasForScreen(
  consultas,
  { filtroAsesor, filtroAno, filtroMesAno } = {},
) {
  const asesores = normalizeFilterValues(filtroAsesor);
  const anos = normalizeFilterValues(filtroAno);
  const mesAnos = normalizeFilterValues(filtroMesAno);

  return (consultas || []).filter((c) => {
    if (asesores.length && !asesores.includes(c.asesor)) return false;
    if (anos.length && !anos.includes(String(c.ano))) return false;
    if (mesAnos.length) {
      const mesConsulta = String(c?.mes || "").trim().toUpperCase();
      const anoConsulta = String(c?.ano || "").trim();
      const match = mesAnos.some((ma) => {
        const [mesSel, anoSel] = ma.split("|");
        return mesConsulta === String(mesSel).trim().toUpperCase()
          && anoConsulta === String(anoSel).trim();
      });
      if (!match) return false;
    }
    return true;
  });
}

function isFollowUpStage(stageName, etapas) {
  const codigos = ["NUEVO_LEAD", "NEGOCIACION", "A_COTIZAR"];
  const names = ["NUEVO LEAD", "NEGOCIACION", "A COTIZAR"];
  const stage = etapas.find((s) => s.pipeline_stage === stageName);
  if (stage?.codigo) return codigos.includes(stage.codigo);
  return names.includes(stageName);
}

function buildEstadoDistData(filtradas, etapas, showWonBreakdown) {
  const map = {};
  filtradas.forEach((c) => {
    const raw = c.pipeline_stage || "Sin estado";
    const key = showWonBreakdown ? raw : getReportGroupLabel(raw, etapas);
    if (!map[key]) map[key] = { name: key, value: 0, breakdown: {} };
    map[key].value += 1;
    if (!showWonBreakdown && isReportGroupedStage(raw, etapas)) {
      map[key].breakdown[raw] = (map[key].breakdown[raw] || 0) + 1;
    }
  });
  return Object.values(map).map(({ name, value, breakdown }) => ({
    name,
    value,
    breakdown: Object.keys(breakdown).length ? breakdown : undefined,
  }));
}

function buildPipelineFunnelData(filtradas, etapas, showWonBreakdown) {
  const activeStages = (etapas || [])
    .filter((s) => s.activa !== false)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const funnelStages = activeStages.length
    ? activeStages.filter((s) => s.orden !== 0 && s.codigo !== "PERDIDA" && s.codigo !== "NUEVO_LEAD")
    : [];

  if (!funnelStages.length) {
    const legacy = ["A COTIZAR", "NEGOCIACION", "PAUSADA", "GANADA", "EJECUTADA"];
    return legacy.map((e) => ({
      pipeline_stage: e,
      cantidad: filtradas.filter((c) => c.pipeline_stage === e).length,
      fill: ESTADO_COLORS[e],
    }));
  }

  const wonBreakdown = buildWonBreakdown(filtradas, etapas);
  const rows = [];

  funnelStages.forEach((stage) => {
    if (!showWonBreakdown && stage.agrupa_en_reporte_codigo) return;

    if (!showWonBreakdown && stage.codigo === WON_UMBRELLA_CODE) {
      rows.push({
        pipeline_stage: stage.pipeline_stage,
        cantidad: wonBreakdown.total,
        fill: ESTADO_COLORS.GANADA,
        breakdown: {
          [wonBreakdown.ganadaLabel]: wonBreakdown.ganada,
          [wonBreakdown.ejecutadaLabel]: wonBreakdown.ejecutada,
        },
      });
      return;
    }

    rows.push({
      pipeline_stage: stage.pipeline_stage,
      cantidad: filtradas.filter((c) => c.pipeline_stage === stage.pipeline_stage).length,
      fill: ESTADO_COLORS[stage.pipeline_stage] || ESTADO_COLORS[stage.codigo] || "#94a3b8",
      breakdown:
        showWonBreakdown && stage.codigo === WON_UMBRELLA_CODE
          ? { [wonBreakdown.ganadaLabel]: wonBreakdown.ganada }
          : undefined,
    });
  });

  return rows;
}

/**
 * @param {import('./reportesMetrics').ReportConsulta[]} filtradas
 * @param {{ etapas?: object[], showWonBreakdown?: boolean }} [options]
 */
export function buildReportMetrics(filtradas = [], { etapas = [], showWonBreakdown = false } = {}) {
  const ganadas = filtradas.filter((c) => isWonStage(c.pipeline_stage, etapas));
  const conEstado = filtradas.filter((c) => c.pipeline_stage);
  const tasa =
    conEstado.length > 0 ? ((ganadas.length / conEstado.length) * 100).toFixed(1) : 0;
  const m2Total = filtradas.reduce((s, c) => s + (c.superficiem2 || 0), 0);
  const fibraKgTotal = filtradas.reduce((s, c) => s + (c.fibrakg || 0), 0);
  const importeGanado = ganadas.reduce((s, c) => s + (c.importe || 0), 0);
  const ticketPromedio = ganadas.length > 0 ? importeGanado / ganadas.length : 0;
  const enSeguimiento = filtradas.filter(
    (c) => c.proximoseguimiento && isFollowUpStage(c.pipeline_stage, etapas),
  );
  const wonBreakdown = buildWonBreakdown(filtradas, etapas);

  const kpis = {
    total: filtradas.length,
    ganadasCount: ganadas.length,
    tasa,
    m2Total: Math.round(m2Total),
    fibraKgTotal: Math.round(fibraKgTotal),
    importeGanado,
    ticketPromedio,
    enSeguimiento: enSeguimiento.length,
  };

  const porMesMap = {};
  filtradas.forEach((c) => {
    const key = fmtMonthYear(c.mes, c.ano);
    if (!porMesMap[key]) {
      porMesMap[key] = { label: key, mes: c.mes, ano: c.ano, ganados: 0, perdidos: 0, otros: 0 };
    }
    if (isWonStage(c.pipeline_stage, etapas)) {
      porMesMap[key].ganados++;
    } else if (isLostStage(c.pipeline_stage, etapas)) {
      porMesMap[key].perdidos++;
    } else {
      porMesMap[key].otros++;
    }
  });
  const porMesData = Object.values(porMesMap).sort((a, b) => {
    if (a.ano !== b.ano) return (a.ano || 0) - (b.ano || 0);
    const idxA = MESES_ORDEN.indexOf(a.mes);
    const idxB = MESES_ORDEN.indexOf(b.mes);
    return (idxA === -1 ? UNKNOWN_MONTH_INDEX : idxA) - (idxB === -1 ? UNKNOWN_MONTH_INDEX : idxB);
  });

  const estadoDistData = buildEstadoDistData(filtradas, etapas, showWonBreakdown);

  const asesorMap = {};
  filtradas.forEach((c) => {
    const a = c.asesor || "Sin asignar";
    if (!asesorMap[a]) {
      asesorMap[a] = { asesor: a, total: 0, ganados: 0, importe: 0, m2: 0 };
    }
    asesorMap[a].total++;
    if (isWonStage(c.pipeline_stage, etapas)) {
      asesorMap[a].ganados++;
      asesorMap[a].importe += c.importe || 0;
    }
    asesorMap[a].m2 += c.superficiem2 || 0;
  });
  const asesoresData = Object.values(asesorMap)
    .map((d) => ({
      ...d,
      tasa: d.total > 0 ? ((d.ganados / d.total) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const mejorAsesor =
    [...asesoresData]
      .filter((a) => a.total >= MIN_ADVISOR_BUDGETS)
      .sort((a, b) => parseFloat(b.tasa) - parseFloat(a.tasa))[0] || null;

  const tipoMap = {};
  filtradas.forEach((c) => {
    const t = c.tipoaplicacion || "Sin especificar";
    if (!tipoMap[t]) tipoMap[t] = { name: t, cantidad: 0, m2: 0 };
    tipoMap[t].cantidad++;
    tipoMap[t].m2 += c.superficiem2 || 0;
  });
  const tipoAplicacionData = Object.values(tipoMap).sort((a, b) => b.cantidad - a.cantidad);

  const canalMap = {};
  filtradas.forEach((c) => {
    const raw = c.canalOrigen ?? c.canalorigen;
    const ch = (raw && String(raw).trim()) || "Sin canal";
    if (!canalMap[ch]) canalMap[ch] = { name: ch, cantidad: 0, ganados: 0 };
    canalMap[ch].cantidad++;
    if (isWonStage(c.pipeline_stage, etapas)) {
      canalMap[ch].ganados++;
    }
  });
  const canalOrigenData = Object.values(canalMap).sort((a, b) => b.cantidad - a.cantidad);

  const ubicacionMap = {};
  filtradas.forEach((c) => {
    const u = c.ubicacionobra || "Sin especificar";
    ubicacionMap[u] = (ubicacionMap[u] || 0) + 1;
  });
  const ubicacionData = Object.entries(ubicacionMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const evolMap = {};
  filtradas.forEach((c) => {
    if (!c.mes || !c.ano) return;
    const key = fmtMonthYear(c.mes, c.ano);
    if (!evolMap[key]) evolMap[key] = { label: key, mes: c.mes, ano: c.ano, total: 0 };
    evolMap[key].total++;
  });
  const evolucionMensual = Object.values(evolMap).sort((a, b) => {
    if (a.ano !== b.ano) return (a.ano || 0) - (b.ano || 0);
    const idxA = MESES_ORDEN.indexOf(a.mes);
    const idxB = MESES_ORDEN.indexOf(b.mes);
    return (idxA === -1 ? UNKNOWN_MONTH_INDEX : idxA) - (idxB === -1 ? UNKNOWN_MONTH_INDEX : idxB);
  });

  let metricasCrecimiento = null;
  if (evolucionMensual.length >= 2) {
    const primero = evolucionMensual[0].total;
    const ultimo = evolucionMensual[evolucionMensual.length - 1].total;
    const crecimiento = primero > 0 ? ((ultimo - primero) / primero) * 100 : 0;
    const promedio = Math.round(
      evolucionMensual.reduce((sum, m) => sum + m.total, 0) / evolucionMensual.length,
    );
    metricasCrecimiento = {
      crecimiento: crecimiento.toFixed(1),
      direccion: crecimiento >= 0 ? "↑" : "↓",
      color: crecimiento >= 0 ? "text-green-700" : "text-red-700",
      primero,
      ultimo,
      promedio,
      meses: evolucionMensual.length,
    };
  }

  const pipelineData = buildPipelineFunnelData(filtradas, etapas, showWonBreakdown);
  const maxPipelineVal = Math.max(...pipelineData.map((x) => x.cantidad), 1);

  const hoy = moment();
  const en7dias = hoy.clone().add(7, "days");
  const vencidos = filtradas.filter(
    (c) =>
      c.proximoseguimiento &&
      moment(c.proximoseguimiento).isBefore(hoy, "day") &&
      isFollowUpStage(c.pipeline_stage, etapas),
  );
  const proximos = filtradas.filter(
    (c) =>
      c.proximoseguimiento &&
      moment(c.proximoseguimiento).isBetween(hoy, en7dias, "day", "[]") &&
      isFollowUpStage(c.pipeline_stage, etapas),
  );
  const tiemposEnPipeline = filtradas
    .filter(
      (c) =>
        isWonStage(c.pipeline_stage, etapas) &&
        c.created_date,
    )
    .map((c) =>
      moment(c.fecha_ganado || c.created_date).diff(moment(c.created_date), "days"),
    )
    .filter((d) => d >= 0);
  const tiempoProm =
    tiemposEnPipeline.length > 0
      ? Math.round(tiemposEnPipeline.reduce((a, b) => a + b, 0) / tiemposEnPipeline.length)
      : null;

  const seguimientoInfo = { vencidos, proximos, tiempoProm };

  const perdidas = filtradas.filter((c) => isLostStage(c.pipeline_stage, etapas));
  const motivosMap = {};
  perdidas.forEach((c) => {
    const m = c.razonperdida || "Sin especificar";
    motivosMap[m] = (motivosMap[m] || 0) + 1;
  });
  const motivosPie = Object.entries(motivosMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const perdAsesorMap = {};
  perdidas.forEach((c) => {
    const a = c.asesor || "Sin asignar";
    perdAsesorMap[a] = (perdAsesorMap[a] || 0) + 1;
  });
  const porAsesor = Object.entries(perdAsesorMap)
    .map(([asesor, count]) => ({ asesor, perdidas: count }))
    .sort((a, b) => b.perdidas - a.perdidas);

  const perdTipoMap = {};
  perdidas.forEach((c) => {
    const t = c.tipoaplicacion || "Sin especificar";
    perdTipoMap[t] = (perdTipoMap[t] || 0) + 1;
  });
  const porTipo = Object.entries(perdTipoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const pct =
    filtradas.length > 0 ? ((perdidas.length / filtradas.length) * 100).toFixed(1) : 0;

  const perdidasData = {
    total: perdidas.length,
    pct,
    motivosPie,
    porAsesor,
    porTipo,
  };

  return {
    kpis,
    wonBreakdown,
    porMesData,
    estadoDistData,
    asesoresData,
    mejorAsesor,
    tipoAplicacionData,
    canalOrigenData,
    ubicacionData,
    evolucionMensual,
    metricasCrecimiento,
    pipelineData,
    maxPipelineVal,
    seguimientoInfo,
    perdidasData,
  };
}
