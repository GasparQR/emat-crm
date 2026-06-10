import { useEffect } from "react";
import moment from "moment";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import {
  CHART_COLORS,
  ESTADO_COLORS,
  fmtCompacto,
  fmtPesos,
  fmtPesosCompacto,
} from "@/lib/reportesMetrics";
import { PDF_ROOT_ID } from "@/lib/reportesPdf";
import { EMAT_LOGO_URL } from "@/lib/brandAssets";
import { INSIGHT_TYPE_STYLES, REPORTES_THEME } from "@/lib/reportesTheme";
import { getSectionConclusion } from "@/lib/reportesInsights";
import HealthScoreCard from "@/components/reportes/HealthScoreCard";
import KpiCardWithDelta from "@/components/reportes/KpiCardWithDelta";

function PdfSection({ sectionNum, title, subtitle, children, noHeader = false }) {
  return (
    <div
      data-pdf-section
      className="bg-white overflow-hidden"
      style={{ marginBottom: 8, maxHeight: REPORTES_THEME.pdf.sectionMaxHeightPx }}
    >
      {!noHeader && title && (
        <div
          className="px-6 pt-5 pb-3"
          style={{ borderBottom: `2px solid ${REPORTES_THEME.brand.primary}` }}
        >
          {sectionNum && (
            <p className="text-[10px] uppercase tracking-widest font-semibold text-blue-600 mb-1">
              {sectionNum}
            </p>
          )}
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className={noHeader ? "" : "px-6 py-4"}>{children}</div>
    </div>
  );
}

function SectionConclusion({ text }) {
  if (!text) return null;
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
      <span className="font-semibold text-slate-900">Conclusión: </span>
      {text}
    </div>
  );
}

function InsightList({ insights }) {
  if (!insights?.length) return null;
  return (
    <div className="space-y-2">
      {insights.slice(0, 7).map((item, i) => {
        const style = INSIGHT_TYPE_STYLES[item.type] || INSIGHT_TYPE_STYLES.info;
        return (
          <div
            key={`${item.title}-${i}`}
            className="rounded-lg border px-3 py-2"
            style={{ backgroundColor: style.bg, borderColor: style.border }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: style.text }}>
              {String(i + 1).padStart(2, "0")} · {item.title}
            </p>
            <p className="text-xs mt-1 text-slate-800">{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, colors, height = 220, centerLabel }) {
  const total = data.reduce((s, d) => s + (d.value ?? d.cantidad ?? 0), 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            dataKey={data[0]?.value != null ? "value" : "cantidad"}
            nameKey="name"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={colors?.(entry, i) || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 9 }} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel !== false && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
          <div className="text-center">
            <p className="text-xl font-bold text-slate-900">{total}</p>
            <p className="text-[9px] text-slate-500 uppercase">Total</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] tracking-wide">
          {columns.map((col) => (
            <th
              key={col.key}
              className={`px-2 py-2 border border-slate-200 font-semibold ${col.align === "right" ? "text-right" : "text-left"}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-2 py-1.5 border border-slate-100 tabular-nums ${col.align === "right" ? "text-right" : "text-left"}`}
              >
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KpiGrid({ kpis, comparative, perdidasTotal }) {
  const items = [
    { label: "Total presupuestos", value: kpis.total, delta: comparative?.total, accent: "blue" },
    { label: "Ganadas", value: kpis.ganadasCount, delta: comparative?.ganadas, accent: "green" },
    { label: "Tasa conversión", value: `${kpis.tasa}%`, delta: comparative?.tasa, accent: "green" },
    { label: "m² cotizados", value: fmtCompacto(kpis.m2Total), accent: "slate" },
    { label: "Importe ganado", value: fmtPesosCompacto(kpis.importeGanado), delta: comparative?.importeGanado, accent: "green" },
    { label: "Ticket promedio", value: fmtPesosCompacto(kpis.ticketPromedio), delta: comparative?.ticketPromedio, accent: "slate" },
    { label: "En seguimiento", value: kpis.enSeguimiento, delta: comparative?.enSeguimiento, accent: "amber" },
    { label: "Pérdidas", value: comparative?.perdidas?.value ?? perdidasTotal ?? 0, delta: comparative?.perdidas, accent: "red" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <KpiCardWithDelta
          key={item.label}
          label={item.label}
          value={item.value}
          delta={item.delta}
          accent={item.accent}
          variant="pdf"
        />
      ))}
    </div>
  );
}

export default function ReportesPdfLayout({
  metrics,
  meta,
  comparative,
  healthScore,
  insights = [],
  canViewAll,
  getAsesorHexColor = () => "#94a3b8",
  onReady,
}) {
  const {
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
    wonBreakdown,
  } = metrics;

  useEffect(() => {
    const timer = setTimeout(() => onReady?.(), 600);
    return () => clearTimeout(timer);
  }, [onReady]);

  const ctx = { metrics, comparative, healthScore };
  const asesorRows = asesoresData.slice(0, 12).map((a, i) => ({
    rank: i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1,
    asesor: a.asesor,
    total: a.total,
    ganados: a.ganados,
    tasa: `${a.tasa}%`,
    importe: fmtPesos(a.importe),
  }));

  return (
    <div
      id={PDF_ROOT_ID}
      className="bg-white text-slate-900"
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: REPORTES_THEME.pdf.widthPx,
        zIndex: -1,
        pointerEvents: "none",
      }}
    >
      {/* Portada */}
      <PdfSection noHeader>
        <div
          className="relative px-8 py-10 text-white min-h-[420px] flex flex-col justify-between"
          style={{
            background: `linear-gradient(135deg, ${REPORTES_THEME.brand.gradientFrom} 0%, ${REPORTES_THEME.brand.gradientTo} 100%)`,
          }}
        >
          <div className="flex items-start justify-between">
            <img src={EMAT_LOGO_URL} alt="EMAT" className="h-12 w-auto object-contain" />
            <span className="text-[10px] uppercase tracking-widest border border-white/30 rounded-full px-3 py-1">
              Confidencial · Uso interno
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200 mb-2">Informe comercial</p>
            <h1 className="text-3xl font-bold leading-tight">{meta?.title || "Reportes EMAT"}</h1>
            <p className="text-lg text-blue-100 mt-3">
              {moment(meta.desde).format("DD/MM/YYYY")} — {moment(meta.hasta).format("DD/MM/YYYY")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-100">
            <p><span className="font-semibold text-white">Criterio:</span> {meta.dateCriteriaLabel}</p>
            {meta.asesorLabel && (
              <p><span className="font-semibold text-white">Asesor:</span> {meta.asesorLabel}</p>
            )}
            <p><span className="font-semibold text-white">Presupuestos:</span> {meta.totalCount}</p>
            {meta.generatedBy && (
              <p><span className="font-semibold text-white">Generado por:</span> {meta.generatedBy}</p>
            )}
          </div>
        </div>
      </PdfSection>

      {/* Resumen ejecutivo */}
      <PdfSection sectionNum="Resumen" title="Resumen ejecutivo">
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <HealthScoreCard healthScore={healthScore} variant="pdf" />
          </div>
          <div className="col-span-3">
            <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Hallazgos destacados</p>
            <InsightList insights={insights} />
          </div>
        </div>
      </PdfSection>

      {/* Dashboard KPIs */}
      <PdfSection sectionNum="01" title="Dashboard ejecutivo" subtitle="Indicadores clave del período">
        <KpiGrid kpis={kpis} comparative={comparative} perdidasTotal={perdidasData.total} />
        <SectionConclusion text={getSectionConclusion("dashboard", ctx)} />
      </PdfSection>

      {/* Dashboard charts */}
      <PdfSection sectionNum="01" title="Dashboard · Gráficos">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Presupuestos por mes</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={porMesData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 9 }} />
                <Bar dataKey="ganados" stackId="a" fill="#10b981" />
                <Bar dataKey="perdidos" stackId="a" fill="#ef4444" />
                <Bar dataKey="otros" stackId="a" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Distribución por estado</p>
            <DonutChart
              data={estadoDistData}
              colors={(entry) => ESTADO_COLORS[entry.name] || "#94a3b8"}
            />
          </div>
        </div>
      </PdfSection>

      {canViewAll && (
        <>
          <PdfSection
            sectionNum="02"
            title="Desempeño por asesor"
            subtitle={mejorAsesor ? `${mejorAsesor.asesor} lidera conversión con ${mejorAsesor.tasa}%` : undefined}
          >
            <ResponsiveContainer width="100%" height={Math.min(280, Math.max(220, asesoresData.length * 32))}>
              <BarChart data={asesoresData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="asesor" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 9 }} />
                <Bar dataKey="total" name="Total" fill="#94a3b8" />
                <Bar dataKey="ganados" name="Ganados" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <SectionConclusion text={getSectionConclusion("asesores", ctx)} />
          </PdfSection>

          <PdfSection sectionNum="02" title="Ranking de asesores">
            <DataTable
              columns={[
                { key: "rank", label: "#" },
                { key: "asesor", label: "Asesor" },
                { key: "total", label: "Total", align: "right" },
                { key: "ganados", label: "Ganados", align: "right" },
                { key: "tasa", label: "Conv.", align: "right" },
                { key: "importe", label: "Importe", align: "right" },
              ]}
              rows={asesorRows}
            />
          </PdfSection>
        </>
      )}

      <PdfSection
        sectionNum="03"
        title="Análisis comercial · Evolución"
        subtitle={
          metricasCrecimiento
            ? `Tendencia ${metricasCrecimiento.direccion} ${Math.abs(metricasCrecimiento.crecimiento)}%`
            : undefined
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={evolucionMensual} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 9 }} />
            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <SectionConclusion text={getSectionConclusion("comercial", ctx)} />
      </PdfSection>

      <PdfSection sectionNum="03" title="Análisis comercial · Canales">
        <div className="grid grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={canalOrigenData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 9 }} />
              <Bar dataKey="cantidad" fill="#94a3b8" />
              <Bar dataKey="ganados" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <DonutChart data={canalOrigenData} />
        </div>
      </PdfSection>

      <PdfSection sectionNum="03" title="Análisis comercial · Tipo y ubicación">
        <div className="grid grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={Math.min(260, Math.max(180, tipoAplicacionData.length * 28))}>
            <BarChart data={tipoAplicacionData} layout="vertical" margin={{ left: 90, right: 10 }}>
              <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 9 }} />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <Bar dataKey="cantidad" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={Math.min(260, Math.max(180, ubicacionData.length * 28))}>
            <BarChart data={ubicacionData} layout="vertical" margin={{ left: 100, right: 10 }}>
              <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 8 }} />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PdfSection>

      <PdfSection sectionNum="04" title="Pipeline y seguimiento">
        <div className="space-y-2 mb-4">
          {pipelineData.map((d) => {
            const pct = maxPipelineVal ? (d.cantidad / maxPipelineVal) * 100 : 0;
            const breakdownText = d.breakdown
              ? Object.entries(d.breakdown)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => `${k} (${n})`)
                  .join(" · ")
              : null;
            return (
              <div key={d.pipeline_stage} className="flex items-center gap-2">
                <div className="w-24 text-right shrink-0">
                  <span className="text-xs text-slate-600 block">{d.pipeline_stage}</span>
                  {breakdownText && (
                    <span className="text-[8px] text-emerald-700 block">{breakdownText}</span>
                  )}
                </div>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full flex items-center justify-end pr-2 text-white text-xs font-bold"
                    style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: d.fill }}
                  >
                    {d.cantidad}
                  </div>
                </div>
              </div>
            );
          })}
          {wonBreakdown?.total > 0 && (
            <p className="text-[9px] text-emerald-700 mt-1">
              {wonBreakdown.ganadaLabel} ({wonBreakdown.ganada}) · {wonBreakdown.ejecutadaLabel} ({wonBreakdown.ejecutada})
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-600">Vencidos</p>
            <p className="text-2xl font-bold text-red-700">{seguimientoInfo.vencidos.length}</p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-600">Próximos 7 días</p>
            <p className="text-2xl font-bold text-amber-700">{seguimientoInfo.proximos.length}</p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Tiempo prom. pipeline</p>
            <p className="text-2xl font-bold text-slate-900">
              {seguimientoInfo.tiempoProm !== null ? `${seguimientoInfo.tiempoProm} d` : "—"}
            </p>
          </div>
        </div>
        <SectionConclusion text={getSectionConclusion("pipeline", ctx)} />
      </PdfSection>

      {seguimientoInfo.vencidos.length > 0 && (
        <PdfSection sectionNum="04" title="Seguimientos vencidos">
          <DataTable
            columns={[
              { key: "cliente", label: "Cliente" },
              { key: "nro", label: "Nº" },
              { key: "asesor", label: "Asesor" },
              { key: "fecha", label: "Vencimiento", align: "right" },
            ]}
            rows={seguimientoInfo.vencidos.slice(0, 10).map((c) => ({
              cliente: c.contactonombre || "Sin nombre",
              nro: c.nroppto || "—",
              asesor: c.asesor,
              fecha: moment(c.proximoseguimiento).format("DD/MM/YY"),
            }))}
          />
        </PdfSection>
      )}

      <PdfSection sectionNum="05" title="Análisis de pérdidas">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded border border-red-200 bg-red-50 p-4">
            <p className="text-xs text-red-600">Total perdidos</p>
            <p className="text-3xl font-bold text-red-700">{perdidasData.total}</p>
            <p className="text-xs text-red-500">{perdidasData.pct}% del total</p>
          </div>
          <div className="rounded border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Tasa de conversión global</p>
            <p className="text-3xl font-bold text-slate-900">{kpis.tasa}%</p>
          </div>
        </div>
        <SectionConclusion text={getSectionConclusion("perdidas", ctx)} />
      </PdfSection>

      <PdfSection sectionNum="05" title="Pérdidas · Motivos y asesores">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Motivos de pérdida</p>
            <DonutChart data={perdidasData.motivosPie} height={200} />
          </div>
          {canViewAll && perdidasData.porAsesor.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={perdidasData.porAsesor} margin={{ bottom: 50 }}>
                <XAxis dataKey="asesor" tick={{ fontSize: 8 }} angle={-35} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 9 }} />
                <Bar dataKey="perdidas" fill="#ef4444">
                  {perdidasData.porAsesor.map((entry, i) => (
                    <Cell key={i} fill={getAsesorHexColor(entry.asesor)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </PdfSection>

      {perdidasData.porTipo.length > 0 && (
        <PdfSection sectionNum="05" title="Pérdidas por tipo de aplicación">
          <ResponsiveContainer width="100%" height={Math.min(240, Math.max(160, perdidasData.porTipo.length * 26))}>
            <BarChart data={perdidasData.porTipo} layout="vertical" margin={{ left: 90 }}>
              <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 9 }} />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <Bar dataKey="value" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </PdfSection>
      )}

      <PdfSection sectionNum="Apéndice" title="Metodología">
        <div className="space-y-2 text-xs text-slate-600">
          <p><span className="font-semibold text-slate-900">Período analizado:</span> {moment(meta.desde).format("DD/MM/YYYY")} — {moment(meta.hasta).format("DD/MM/YYYY")}</p>
          {meta.prevDesde && meta.prevHasta && (
            <p><span className="font-semibold text-slate-900">Período de comparación:</span> {moment(meta.prevDesde).format("DD/MM/YYYY")} — {moment(meta.prevHasta).format("DD/MM/YYYY")}</p>
          )}
          <p><span className="font-semibold text-slate-900">Criterio de fecha:</span> {meta.dateCriteriaLabel}</p>
          <p><span className="font-semibold text-slate-900">Presupuestos incluidos:</span> {meta.totalCount}{meta.previousCount != null ? ` (período anterior: ${meta.previousCount})` : ""}</p>
          <p><span className="font-semibold text-slate-900">Salud comercial:</span> score compuesto 0–100 basado en conversión, crecimiento, pipeline activo, seguimientos y pérdidas.</p>
          <p className="text-slate-400 pt-2">Generado por EMAT CRM · {moment().format("DD/MM/YYYY HH:mm")}</p>
        </div>
      </PdfSection>
    </div>
  );
}
