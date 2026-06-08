import moment from "moment";

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

export function filterConsultasForReport(
  consultas,
  { mode, desde, hasta, asesor = "todos" } = {},
) {
  const from = moment(desde).startOf("day");
  const to = moment(hasta).endOf("day");
  if (!from.isValid() || !to.isValid()) return [];

  return (consultas || []).filter((c) => {
    if (asesor !== "todos" && c.asesor !== asesor) return false;
    const date = resolveConsultaDate(c, mode);
    if (!date) return false;
    return date.isBetween(from, to, "day", "[]");
  });
}

export function filterConsultasForScreen(
  consultas,
  { filtroAsesor, filtroAno, filtroMesAno } = {},
) {
  return (consultas || []).filter((c) => {
    if (filtroAsesor !== "todos" && c.asesor !== filtroAsesor) return false;
    if (filtroAno !== "todos" && String(c.ano) !== filtroAno) return false;
    if (filtroMesAno !== "todos") {
      const [mesSel, anoSel] = filtroMesAno.split("|");
      const mesConsulta = String(c?.mes || "").trim().toUpperCase();
      const anoConsulta = String(c?.ano || "").trim();
      if (mesConsulta !== mesSel || anoConsulta !== anoSel) return false;
    }
    return true;
  });
}

export function buildReportMetrics(filtradas = []) {
  const ganadas = filtradas.filter(
    (c) => c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA",
  );
  const conEstado = filtradas.filter((c) => c.pipeline_stage);
  const tasa =
    conEstado.length > 0 ? ((ganadas.length / conEstado.length) * 100).toFixed(1) : 0;
  const m2Total = filtradas.reduce((s, c) => s + (c.superficiem2 || 0), 0);
  const fibraKgTotal = filtradas.reduce((s, c) => s + (c.fibrakg || 0), 0);
  const importeGanado = ganadas.reduce((s, c) => s + (c.importe || 0), 0);
  const ticketPromedio = ganadas.length > 0 ? importeGanado / ganadas.length : 0;
  const enSeguimiento = filtradas.filter(
    (c) =>
      c.proximoseguimiento &&
      ["NUEVO LEAD", "NEGOCIACION", "A COTIZAR"].includes(c.pipeline_stage),
  );

  const kpis = {
    total: filtradas.length,
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
    if (c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA") {
      porMesMap[key].ganados++;
    } else if (c.pipeline_stage === "PERDIDA") {
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

  const estadoMap = {};
  filtradas.forEach((c) => {
    const e = c.pipeline_stage || "Sin estado";
    estadoMap[e] = (estadoMap[e] || 0) + 1;
  });
  const estadoDistData = Object.entries(estadoMap).map(([name, value]) => ({ name, value }));

  const asesorMap = {};
  filtradas.forEach((c) => {
    const a = c.asesor || "Sin asignar";
    if (!asesorMap[a]) {
      asesorMap[a] = { asesor: a, total: 0, ganados: 0, importe: 0, m2: 0 };
    }
    asesorMap[a].total++;
    if (c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA") {
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
    if (c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA") {
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

  const pipelineStages = ["A COTIZAR", "NEGOCIACION", "PAUSADA", "GANADA", "EJECUTADA"];
  const pipelineData = pipelineStages.map((e) => ({
    pipeline_stage: e,
    cantidad: filtradas.filter((c) => c.pipeline_stage === e).length,
    fill: ESTADO_COLORS[e],
  }));
  const maxPipelineVal = Math.max(...pipelineData.map((x) => x.cantidad), 1);

  const hoy = moment();
  const en7dias = hoy.clone().add(7, "days");
  const vencidos = filtradas.filter(
    (c) =>
      c.proximoseguimiento &&
      moment(c.proximoseguimiento).isBefore(hoy, "day") &&
      ["NEGOCIACION", "A COTIZAR"].includes(c.pipeline_stage),
  );
  const proximos = filtradas.filter(
    (c) =>
      c.proximoseguimiento &&
      moment(c.proximoseguimiento).isBetween(hoy, en7dias, "day", "[]") &&
      ["NEGOCIACION", "A COTIZAR"].includes(c.pipeline_stage),
  );
  const tiemposEnPipeline = filtradas
    .filter(
      (c) =>
        (c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA") &&
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

  const perdidas = filtradas.filter((c) => c.pipeline_stage === "PERDIDA");
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
