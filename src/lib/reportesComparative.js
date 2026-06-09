import moment from "moment";
import { normalizeFilterValues } from "@/lib/reportesMetrics";

export function previousPeriodRange(desde, hasta) {
  const start = moment(desde).startOf("day");
  const end = moment(hasta).startOf("day");
  const days = end.diff(start, "days") + 1;
  const prevEnd = start.clone().subtract(1, "day");
  const prevStart = prevEnd.clone().subtract(days - 1, "days");
  return {
    prevDesde: prevStart.format("YYYY-MM-DD"),
    prevHasta: prevEnd.format("YYYY-MM-DD"),
    days,
  };
}

export function calcDelta(current, previous, { invert = false } = {}) {
  const cur = Number(current) || 0;
  const prev = previous == null ? null : Number(previous);

  if (prev == null) {
    return {
      value: cur,
      previous: null,
      deltaPct: null,
      deltaAbs: null,
      label: null,
      direction: "neutral",
      sentiment: "neutral",
    };
  }

  if (prev === 0) {
    const direction = cur > 0 ? "up" : cur < 0 ? "down" : "neutral";
    const good = invert ? direction === "down" : direction === "up";
    return {
      value: cur,
      previous: prev,
      deltaPct: cur === 0 ? 0 : null,
      deltaAbs: cur - prev,
      label: cur === 0 ? "Sin cambio vs período anterior" : "Nuevo vs período anterior",
      direction,
      sentiment: good ? "positive" : direction === "neutral" ? "neutral" : "negative",
    };
  }

  const raw = ((cur - prev) / prev) * 100;
  const direction = raw > 0 ? "up" : raw < 0 ? "down" : "neutral";
  const good = invert ? direction === "down" : direction === "up";

  return {
    value: cur,
    previous: prev,
    deltaPct: raw,
    deltaAbs: cur - prev,
    label: `${raw >= 0 ? "+" : ""}${raw.toFixed(1)}% vs período anterior`,
    direction,
    sentiment: good ? "positive" : direction === "neutral" ? "neutral" : "negative",
  };
}

export function calcDeltaPp(current, previous) {
  const cur = parseFloat(current) || 0;
  const prev = previous == null ? null : parseFloat(previous);
  if (prev == null) {
    return {
      value: cur,
      previous: null,
      deltaPp: null,
      label: null,
      direction: "neutral",
      sentiment: "neutral",
    };
  }
  const diff = cur - prev;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  return {
    value: cur,
    previous: prev,
    deltaPp: diff,
    label: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} pp vs período anterior`,
    direction,
    sentiment: direction === "up" ? "positive" : direction === "down" ? "negative" : "neutral",
  };
}

function extractComparableValues(metrics) {
  if (!metrics) return null;
  return {
    total: metrics.kpis?.total ?? 0,
    ganadas: metrics.kpis?.ganadasCount ?? 0,
    tasa: parseFloat(metrics.kpis?.tasa) || 0,
    importeGanado: metrics.kpis?.importeGanado ?? 0,
    ticketPromedio: metrics.kpis?.ticketPromedio ?? 0,
    perdidas: metrics.perdidasData?.total ?? 0,
    enSeguimiento: metrics.kpis?.enSeguimiento ?? 0,
  };
}

export function buildComparativeMetrics(currentMetrics, previousMetrics, meta = {}) {
  const current = extractComparableValues(currentMetrics);
  const previous = extractComparableValues(previousMetrics);

  return {
    meta,
    total: calcDelta(current.total, previous?.total),
    ganadas: calcDelta(current.ganadas, previous?.ganadas),
    tasa: calcDeltaPp(current.tasa, previous?.tasa),
    importeGanado: calcDelta(current.importeGanado, previous?.importeGanado),
    ticketPromedio: calcDelta(current.ticketPromedio, previous?.ticketPromedio),
    perdidas: calcDelta(current.perdidas, previous?.perdidas, { invert: true }),
    enSeguimiento: calcDelta(current.enSeguimiento, previous?.enSeguimiento, { invert: true }),
    hasPreviousData: previous != null && (previous.total > 0 || previous.ganadas > 0),
  };
}

export function getScreenDateRange({ filtroMesAno, filtroAno, mesesOrden }) {
  const mesAnos = normalizeFilterValues(filtroMesAno);
  const anos = normalizeFilterValues(filtroAno);

  if (mesAnos.length) {
    const ranges = mesAnos
      .map((ma) => {
        const [mes, ano] = ma.split("|");
        const idx = mesesOrden.indexOf(String(mes).trim().toUpperCase());
        if (idx < 0) return null;
        const start = moment({ year: Number(ano), month: idx, day: 1 });
        return {
          desde: start.format("YYYY-MM-DD"),
          hasta: start.clone().endOf("month").format("YYYY-MM-DD"),
        };
      })
      .filter(Boolean);
    if (ranges.length) {
      return {
        desde: ranges.reduce((min, r) => (r.desde < min ? r.desde : min), ranges[0].desde),
        hasta: ranges.reduce((max, r) => (r.hasta > max ? r.hasta : max), ranges[0].hasta),
      };
    }
  }

  if (anos.length) {
    const sorted = [...anos].sort((a, b) => Number(a) - Number(b));
    return {
      desde: `${sorted[0]}-01-01`,
      hasta: `${sorted[sorted.length - 1]}-12-31`,
    };
  }

  return {
    desde: moment().subtract(30, "days").format("YYYY-MM-DD"),
    hasta: moment().format("YYYY-MM-DD"),
  };
}
