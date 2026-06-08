import { useEffect } from "react";
import moment from "moment";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import {
  CHART_COLORS,
  ESTADO_COLORS,
  fmt,
  fmtCompacto,
  fmtPesos,
  fmtPesosCompacto,
} from "@/lib/reportesMetrics";
import { PDF_ROOT_ID } from "@/lib/reportesPdf";

function PdfSection({ title, subtitle, children }) {
  return (
    <div
      data-pdf-section
      className="bg-white p-6 border border-slate-200 rounded-lg"
      style={{ marginBottom: 8 }}
    >
      {title && (
        <div className="mb-4 border-b border-slate-200 pb-2">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiGrid({ kpis }) {
  const items = [
    { label: "Total presupuestos", value: kpis.total },
    { label: "Tasa conversión", value: `${kpis.tasa}%` },
    { label: "m² cotizados", value: fmtCompacto(kpis.m2Total) },
    { label: "Fibra kg", value: fmtCompacto(kpis.fibraKgTotal) },
    { label: "Importe ganado", value: fmtPesosCompacto(kpis.importeGanado) },
    { label: "Ticket promedio", value: fmtPesosCompacto(kpis.ticketPromedio) },
    { label: "En seguimiento", value: kpis.enSeguimiento },
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function ReportesPdfLayout({
  metrics,
  meta,
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
  } = metrics;

  useEffect(() => {
    const timer = setTimeout(() => onReady?.(), 500);
    return () => clearTimeout(timer);
  }, [onReady]);

  const rootId = PDF_ROOT_ID;

  return (
    <div
      id={rootId}
      className="bg-white text-slate-900"
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 794,
        zIndex: -1,
        pointerEvents: "none",
      }}
    >
      <PdfSection title="Reportes EMAT" subtitle={meta?.title || "Informe comercial"}>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-semibold">Período:</span>{" "}
            {moment(meta.desde).format("DD/MM/YYYY")} — {moment(meta.hasta).format("DD/MM/YYYY")}
          </p>
          <p>
            <span className="font-semibold">Criterio de fecha:</span> {meta.dateCriteriaLabel}
          </p>
          {meta.asesorLabel && (
            <p>
              <span className="font-semibold">Asesor:</span> {meta.asesorLabel}
            </p>
          )}
          <p>
            <span className="font-semibold">Presupuestos incluidos:</span> {meta.totalCount}
          </p>
        </div>
      </PdfSection>

      <PdfSection title="Dashboard ejecutivo">
        <KpiGrid kpis={kpis} />
        <div className="grid grid-cols-2 gap-4 mt-4">
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
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={estadoDistData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                  {estadoDistData.map((entry, i) => (
                    <Cell key={i} fill={ESTADO_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </PdfSection>

      {canViewAll && (
        <PdfSection
          title="Desempeño por asesor"
          subtitle={
            mejorAsesor
              ? `${mejorAsesor.asesor} lidera conversión con ${mejorAsesor.tasa}%`
              : undefined
          }
        >
          <ResponsiveContainer width="100%" height={Math.max(220, asesoresData.length * 36)}>
            <BarChart data={asesoresData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="asesor" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 9 }} />
              <Bar dataKey="total" name="Total" fill="#94a3b8" />
              <Bar dataKey="ganados" name="Ganados" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {asesoresData.slice(0, 8).map((a) => (
              <div key={a.asesor} className="flex justify-between border-b border-slate-100 py-1">
                <span className="font-medium">{a.asesor}</span>
                <span>{a.ganados}/{a.total} · {a.tasa}% · {fmtPesos(a.importe)}</span>
              </div>
            ))}
          </div>
        </PdfSection>
      )}

      <PdfSection
        title="Análisis comercial"
        subtitle={
          metricasCrecimiento
            ? `Evolución ${metricasCrecimiento.direccion} ${Math.abs(metricasCrecimiento.crecimiento)}%`
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
        <div className="grid grid-cols-2 gap-4 mt-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={canalOrigenData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 9 }} />
              <Bar dataKey="cantidad" fill="#94a3b8" />
              <Bar dataKey="ganados" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={canalOrigenData} cx="50%" cy="50%" outerRadius={65} dataKey="cantidad" nameKey="name">
                {canalOrigenData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <ResponsiveContainer width="100%" height={Math.max(180, tipoAplicacionData.length * 28)}>
            <BarChart data={tipoAplicacionData} layout="vertical" margin={{ left: 90, right: 10 }}>
              <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 9 }} />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <Bar dataKey="cantidad" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={Math.max(180, ubicacionData.length * 28)}>
            <BarChart data={ubicacionData} layout="vertical" margin={{ left: 100, right: 10 }}>
              <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 8 }} />
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PdfSection>

      <PdfSection title="Pipeline y seguimiento">
        <div className="space-y-2 mb-4">
          {pipelineData.map((d) => {
            const pct = (d.cantidad / maxPipelineVal) * 100;
            return (
              <div key={d.pipeline_stage} className="flex items-center gap-2">
                <span className="w-24 text-xs text-right text-slate-600">{d.pipeline_stage}</span>
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
              {seguimientoInfo.tiempoProm !== null ? seguimientoInfo.tiempoProm : "—"}
            </p>
          </div>
        </div>
        {seguimientoInfo.vencidos.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-red-700 mb-2">Seguimientos vencidos (top 10)</p>
            {seguimientoInfo.vencidos.slice(0, 10).map((c) => (
              <div key={c.id} className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span>{c.contactonombre || "Sin nombre"} · #{c.nroppto || "—"}</span>
                <span>{c.asesor} · {moment(c.proximoseguimiento).format("DD/MM/YY")}</span>
              </div>
            ))}
          </div>
        )}
      </PdfSection>

      <PdfSection title="Pérdidas">
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
        <div className="grid grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={perdidasData.motivosPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                {perdidasData.motivosPie.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
          {canViewAll && perdidasData.porAsesor.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
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
        {perdidasData.porTipo.length > 0 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={Math.max(160, perdidasData.porTipo.length * 26)}>
              <BarChart data={perdidasData.porTipo} layout="vertical" margin={{ left: 90 }}>
                <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 9 }} />
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PdfSection>
    </div>
  );
}
