import { useState, useMemo, useRef } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import {
  TrendingUp, ArrowLeft,
  Calendar, CheckCircle, Clock, XCircle, AlertCircle, FileDown,
} from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";
import { toast } from "sonner";
import { useAuth } from "@/lib/SimpleAuthContext";
import { buildAsesorFilterOptions, useAsesores } from "@/components/hooks/useAsesores";
import { canViewGlobalData, filterConsultasByVisibility } from "@/lib/permissions";
import {
  CHART_COLORS,
  DATE_CRITERIA,
  DATE_CRITERIA_LABELS,
  ESTADO_COLORS,
  MESES_ORDEN,
  buildReportMetrics,
  filterConsultasForReport,
  filterConsultasForScreen,
  fmt,
  fmtCompacto,
  fmtPesos,
  fmtPesosCompacto,
} from "@/lib/reportesMetrics";
import { getScreenDateRange } from "@/lib/reportesComparative";
import { buildReportBundle } from "@/lib/reportesBundle";
import { downloadReportesPdf } from "@/lib/reportesPdf";
import ReportesPdfLayout from "@/components/reportes/ReportesPdfLayout";
import HealthScoreCard from "@/components/reportes/HealthScoreCard";
import KpiCardWithDelta from "@/components/reportes/KpiCardWithDelta";

const ESTADO_BADGE = {
  "A COTIZAR": "bg-slate-100 text-slate-700",
  "NEGOCIACION": "bg-amber-100 text-amber-700",
  "GANADA": "bg-green-100 text-green-700",
  "EJECUTADA": "bg-emerald-100 text-emerald-800",
  "PAUSADA": "bg-gray-100 text-gray-600",
  "PERDIDA": "bg-red-100 text-red-700",
};

export default function Reportes() {
  const [filtroMesAno, setFiltroMesAno] = useState("todos");
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroAno, setFiltroAno] = useState("todos");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState(DATE_CRITERIA.PRESUPUESTO);
  const [exportDesde, setExportDesde] = useState(() =>
    moment().subtract(30, "days").format("YYYY-MM-DD"),
  );
  const [exportHasta, setExportHasta] = useState(() => moment().format("YYYY-MM-DD"));
  const [exporting, setExporting] = useState(false);
  const [showWonBreakdown, setShowWonBreakdown] = useState(false);
  const [pdfRender, setPdfRender] = useState(null);
  const pdfReadyRef = useRef(null);
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const canViewAll = canViewGlobalData(user);
  const { asesorOptions, getAsesorHexColor } = useAsesores(user);

  const { data: consultas = [], isLoading } = useQuery({
    queryKey: ["consultas-reportes", workspace?.id, user?.asesor_codigo, user?.role],
    queryFn: () =>
      workspace
        ? entities.Consulta.filter({ workspace_id: workspace.id }, "-nroppto", 2000)
        : [],
    enabled: !!workspace,
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ["pipeline-stages", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter((s) => s.activa !== false);
    },
    enabled: !!workspace,
  });

  const visibleConsultas = useMemo(
    () => filterConsultasByVisibility(consultas, user, etapas),
    [consultas, user, etapas],
  );

  const anos = useMemo(
    () => [...new Set(visibleConsultas.map((c) => c.ano).filter(Boolean))].sort((a, b) => b - a),
    [visibleConsultas]
  );

  const filterAsesorOptions = useMemo(
    () => buildAsesorFilterOptions(asesorOptions, visibleConsultas),
    [asesorOptions, visibleConsultas]
  );

  const mesesAnosDisponibles = useMemo(() => {
    const unique = new Map();
    visibleConsultas.forEach((c) => {
      if (!c?.mes || !c?.ano) return;
      const mes = String(c.mes).trim().toUpperCase();
      const ano = String(c.ano).trim();
      if (!mes || !ano) return;
      const key = `${mes}|${ano}`;
      unique.set(key, { key, mes, ano, label: `${mes} ${ano}` });
    });
    return [...unique.values()].sort((a, b) => {
      const anoDiff = Number(b.ano) - Number(a.ano);
      if (anoDiff !== 0) return anoDiff;
      const idxA = MESES_ORDEN.indexOf(a.mes);
      const idxB = MESES_ORDEN.indexOf(b.mes);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxB - idxA;
    });
  }, [visibleConsultas]);

  const filtradas = useMemo(
    () =>
      filterConsultasForScreen(visibleConsultas, {
        filtroAsesor,
        filtroAno,
        filtroMesAno,
      }),
    [visibleConsultas, filtroAsesor, filtroAno, filtroMesAno],
  );

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
  } = useMemo(
    () => buildReportMetrics(filtradas, { etapas, showWonBreakdown }),
    [filtradas, etapas, showWonBreakdown],
  );

  const screenDateRange = useMemo(
    () => getScreenDateRange({ filtroMesAno, filtroAno, mesesOrden: MESES_ORDEN }),
    [filtroMesAno, filtroAno],
  );

  const screenBundle = useMemo(() => {
    if (!visibleConsultas.length) return null;
    return buildReportBundle(visibleConsultas, {
      mode: DATE_CRITERIA.PRESUPUESTO,
      desde: screenDateRange.desde,
      hasta: screenDateRange.hasta,
      asesor: filtroAsesor,
      etapas,
      showWonBreakdown,
    });
  }, [visibleConsultas, screenDateRange, filtroAsesor, etapas, showWonBreakdown]);

  const { comparative: screenComparative, healthScore: screenHealthScore, insights: screenInsights } =
    screenBundle || {};

  const asesorExportLabel =
    filtroAsesor === "todos"
      ? canViewAll
        ? "Todos los asesores"
        : user?.asesor_codigo || "Mi cartera"
      : filtroAsesor;

  const handleOpenExport = () => {
    setExportDesde(moment().subtract(30, "days").format("YYYY-MM-DD"));
    setExportHasta(moment().format("YYYY-MM-DD"));
    setExportMode(DATE_CRITERIA.PRESUPUESTO);
    setExportOpen(true);
  };

  const handleConfirmExport = () => {
    if (!exportDesde || !exportHasta) {
      toast.error("Completá las fechas desde y hasta");
      return;
    }
    if (moment(exportDesde).isAfter(moment(exportHasta), "day")) {
      toast.error("La fecha desde no puede ser posterior a hasta");
      return;
    }

    const filtradasExport = filterConsultasForReport(visibleConsultas, {
      mode: exportMode,
      desde: exportDesde,
      hasta: exportHasta,
      asesor: filtroAsesor,
    });

    if (filtradasExport.length === 0) {
      toast.error("No hay presupuestos en ese período con el criterio seleccionado");
      return;
    }

    if (filtradasExport.length > 1500) {
      toast.warning("El rango incluye muchos presupuestos; la exportación puede demorar.");
    }

    const bundle = buildReportBundle(visibleConsultas, {
      mode: exportMode,
      desde: exportDesde,
      hasta: exportHasta,
      asesor: filtroAsesor,
      etapas,
      showWonBreakdown,
    });

    setExportOpen(false);
    setExporting(true);

    pdfReadyRef.current = async () => {
      const toastId = toast.loading("Generando PDF…");
      try {
        await downloadReportesPdf({
          desde: exportDesde,
          hasta: exportHasta,
          meta: {
            title: canViewAll ? "Reportes & Analytics" : "Mis reportes",
            dateCriteriaLabel: DATE_CRITERIA_LABELS[exportMode],
            asesorLabel: asesorExportLabel,
            totalCount: bundle.filtradas.length,
            previousCount: bundle.meta.previousCount,
            prevDesde: bundle.meta.prevDesde,
            prevHasta: bundle.meta.prevHasta,
            generatedBy: user?.email || user?.nombre || user?.asesor_codigo,
          },
          onProgress: ({ sectionIndex, totalSections }) => {
            toast.loading(`Capturando sección ${sectionIndex}/${totalSections}…`, { id: toastId });
          },
        });
        toast.success("PDF exportado correctamente", { id: toastId });
      } catch (error) {
        console.error(error);
        toast.error("Error al exportar el PDF", { id: toastId });
      } finally {
        setPdfRender(null);
        setExporting(false);
      }
    };

    setPdfRender({
      metrics: bundle.metrics,
      comparative: bundle.comparative,
      healthScore: bundle.healthScore,
      insights: bundle.insights,
      meta: {
        title: canViewAll ? "Reportes & Analytics" : "Mis reportes",
        desde: exportDesde,
        hasta: exportHasta,
        prevDesde: bundle.meta.prevDesde,
        prevHasta: bundle.meta.prevHasta,
        dateCriteriaLabel: DATE_CRITERIA_LABELS[exportMode],
        asesorLabel: asesorExportLabel,
        totalCount: bundle.filtradas.length,
        previousCount: bundle.meta.previousCount,
        generatedBy: user?.email || user?.nombre || user?.asesor_codigo,
      },
      canViewAll,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando reportes…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              {canViewAll ? "Reportes & Analytics" : "Mis reportes"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {filtradas.length} presupuesto{filtradas.length !== 1 ? "s" : ""} en el período seleccionado
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={filtroMesAno} onValueChange={setFiltroMesAno}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {mesesAnosDisponibles.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canViewAll && (
            <Select value={filtroAsesor} onValueChange={setFiltroAsesor}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los asesores</SelectItem>
                {filterAsesorOptions.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}

            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los años</SelectItem>
                {anos.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleOpenExport}
              disabled={exporting}
            >
              <FileDown className="w-4 h-4" />
              {exporting ? "Generando PDF…" : "Exportar PDF"}
            </Button>
          </div>
        </div>

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Exportar reporte a PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Criterio de fecha</Label>
                <RadioGroup value={exportMode} onValueChange={setExportMode}>
                  {Object.entries(DATE_CRITERIA_LABELS).map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={`export-date-${value}`} />
                      <Label htmlFor={`export-date-${value}`} className="font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="export-desde">Desde</Label>
                  <Input
                    id="export-desde"
                    type="date"
                    value={exportDesde}
                    onChange={(e) => setExportDesde(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-hasta">Hasta</Label>
                  <Input
                    id="export-hasta"
                    type="date"
                    value={exportHasta}
                    onChange={(e) => setExportHasta(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Se incluyen KPIs y gráficos de todas las secciones del reporte para el período
                seleccionado. Filtro de asesor actual: {asesorExportLabel}.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmExport} disabled={exporting}>
                Generar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {pdfRender && (
          <ReportesPdfLayout
            metrics={pdfRender.metrics}
            meta={pdfRender.meta}
            comparative={pdfRender.comparative}
            healthScore={pdfRender.healthScore}
            insights={pdfRender.insights}
            canViewAll={pdfRender.canViewAll}
            getAsesorHexColor={getAsesorHexColor}
            onReady={() => pdfReadyRef.current?.()}
          />
        )}

        {/* Tabs */}
        <Tabs defaultValue="ejecutivo" className="space-y-6">
          <TabsList className={`grid w-full ${canViewAll ? "grid-cols-3 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
            <TabsTrigger value="ejecutivo">Ejecutivo</TabsTrigger>
            {canViewAll && <TabsTrigger value="asesores">Asesores</TabsTrigger>}
            <TabsTrigger value="comercial">Comercial</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="perdidas">Pérdidas</TabsTrigger>
          </TabsList>

          {/* TAB 1: DASHBOARD EJECUTIVO */}
          <TabsContent value="ejecutivo" className="space-y-6">
            {screenHealthScore && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <HealthScoreCard healthScore={screenHealthScore} className="lg:col-span-1" />
                {screenInsights?.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Hallazgos destacados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {screenInsights.slice(0, 5).map((item, i) => (
                        <div key={`${item.title}-${i}`} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          <p className="text-slate-600 mt-0.5">{item.body}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <KpiCardWithDelta
                label="Total presupuestos"
                value={kpis.total}
                delta={screenComparative?.total}
                accent="blue"
              />
              <KpiCardWithDelta
                label="Tasa conversión"
                value={`${kpis.tasa}%`}
                delta={screenComparative?.tasa}
                accent="green"
              />
              <KpiCardWithDelta
                label="m² cotizados"
                value={fmtCompacto(kpis.m2Total)}
                accent="slate"
              />
              <KpiCardWithDelta
                label="Fibra kg"
                value={fmtCompacto(kpis.fibraKgTotal)}
                accent="slate"
              />
              <KpiCardWithDelta
                label="Importe ganado"
                value={fmtPesosCompacto(kpis.importeGanado)}
                delta={screenComparative?.importeGanado}
                accent="green"
              />
              <KpiCardWithDelta
                label="Ticket promedio"
                value={fmtPesosCompacto(kpis.ticketPromedio)}
                delta={screenComparative?.ticketPromedio}
                accent="slate"
              />
              <KpiCardWithDelta
                label="En seguimiento"
                value={kpis.enSeguimiento}
                delta={screenComparative?.enSeguimiento}
                accent="amber"
              />
              <div>
                <KpiCardWithDelta
                  label="Ganadas"
                  value={kpis.ganadasCount ?? "—"}
                  delta={screenComparative?.ganadas}
                  accent="green"
                />
                {showWonBreakdown && wonBreakdown?.total > 0 && (
                  <p className="text-[11px] text-emerald-700 mt-1 px-1">
                    {wonBreakdown.ganadaLabel}: {wonBreakdown.ganada} · {wonBreakdown.ejecutadaLabel}: {wonBreakdown.ejecutada}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Presupuestos por mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={porMesData} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ganados" name="Ganados" stackId="a" fill="#10b981" />
                      <Bar dataKey="perdidos" name="Perdidos" stackId="a" fill="#ef4444" />
                      <Bar dataKey="otros" name="En proceso" stackId="a" fill="#94a3b8" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Distribucion por estado</CardTitle>
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <Switch checked={showWonBreakdown} onCheckedChange={setShowWonBreakdown} />
                    Desglose Ganada / Ejecutada
                  </label>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={estadoDistData}
                        cx="50%"
                        cy="45%"
                        outerRadius={85}
                        dataKey="value"
                        nameKey="name"
                      >
                        {estadoDistData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              ESTADO_COLORS[entry.name]
                              || (entry.name === wonBreakdown?.umbrellaLabel ? ESTADO_COLORS.GANADA : "#94a3b8")
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, props) => {
                          const breakdown = props?.payload?.breakdown;
                          if (breakdown && Object.keys(breakdown).length) {
                            const detail = Object.entries(breakdown)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ");
                            return [`${value} (${detail})`, props.payload.name];
                          }
                          return [value, props?.payload?.name];
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {canViewAll && (
          <TabsContent value="asesores" className="space-y-6">
            {mejorAsesor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{mejorAsesor.asesor}</span> tiene la mejor tasa de conversion:{" "}
                  <span className="font-bold text-blue-700">{mejorAsesor.tasa}%</span>
                  {" "}({mejorAsesor.ganados} ganados de {mejorAsesor.total} presupuestos).
                </p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total vs. Ganados por asesor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(320, asesoresData.length * 50)}>
                  <BarChart data={asesoresData} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="asesor" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} height={80} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="#94a3b8" radius={[4,4,0,0]} />
                    <Bar dataKey="ganados" name="Ganados" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {asesoresData.map((a) => (
                <Card key={a.asesor} className="overflow-hidden">
                  <div
                    className="h-1.5"
                    style={{ backgroundColor: getAsesorHexColor(a.asesor) }}
                  />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold">{a.asesor}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Presupuestos</span>
                      <span className="font-semibold">{a.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ganados</span>
                      <span className="font-semibold text-green-700">{a.ganados}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Conversion</span>
                      <span className="font-semibold text-emerald-600">{a.tasa}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Importe ganado</span>
                      <span className="font-semibold">{fmtPesos(a.importe)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">m² cotizados</span>
                      <span className="font-semibold">{fmt(Math.round(a.m2))}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          )}

          {/* TAB 3: ANÁLISIS COMERCIAL */}
          <TabsContent value="comercial" className="space-y-6">
            {/* EVOLUCIÓN MENSUAL - PRIMERO Y DESTACADO */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Evolución mensual de presupuestos</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Impacto del CRM Pragma en tu pipeline</p>
                  </div>
                  {metricasCrecimiento && (
                    <div className="text-right">
                      <p className={`text-2xl sm:text-3xl font-bold ${metricasCrecimiento.color}`}>
                        {metricasCrecimiento.direccion} {Math.abs(Number(metricasCrecimiento.crecimiento))}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {metricasCrecimiento.ultimo} presupuestos últimamente
                      </p>
                      <p className="text-xs text-slate-500">
                        Promedio: {metricasCrecimiento.promedio}/mes en {metricasCrecimiento.meses} meses
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolucionMensual} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} height={80} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Presupuestos"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#3b82f6" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Presupuestos por canal de origen</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(280, canalOrigenData.length * 44)}>
                    <BarChart
                      data={canalOrigenData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} height={72} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="cantidad" name="Total" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ganados" name="Ganados" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribución por canal (total)</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={canalOrigenData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="cantidad"
                        nameKey="name"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {canalOrigenData.map((entry, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                        }}
                        formatter={(value, name, props) => [
                          `${value} presupuestos`,
                          `Total ${props.payload.name}`
                        ]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-xs sm:text-sm">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Presupuestos por tipo de aplicacion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(280, tipoAplicacionData.length * 42)}>
                    <BarChart
                      data={tipoAplicacionData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 110, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="cantidad" name="Cantidad" fill="#3b82f6" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">m² por tipo de aplicacion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(280, tipoAplicacionData.length * 42)}>
                    <BarChart
                      data={tipoAplicacionData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 110, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${fmt(Math.round(Number(v)))} m²`, "m²"]} />
                      <Bar dataKey="m2" name="m²" fill="#06b6d4" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 ubicaciones de obra</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(320, ubicacionData.length * 42)}>
                  <BarChart
                    data={ubicacionData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 140, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Presupuestos" fill="#f59e0b" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: PIPELINE & SEGUIMIENTO */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Embudo del pipeline</CardTitle>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <Switch checked={showWonBreakdown} onCheckedChange={setShowWonBreakdown} />
                  Desglose Ganada / Ejecutada
                </label>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {pipelineData.map((d) => {
                    const pct = (d.cantidad / maxPipelineVal) * 100;
                    const breakdownText = d.breakdown
                      ? Object.entries(d.breakdown)
                          .filter(([, n]) => n > 0)
                          .map(([k, n]) => `${k} (${n})`)
                          .join(" · ")
                      : null;
                    return (
                      <div key={d.pipeline_stage} className="flex items-center gap-3">
                        <div className="w-28 text-right shrink-0">
                          <span className="text-sm font-medium text-slate-600 block">{d.pipeline_stage}</span>
                          {breakdownText && !showWonBreakdown && (
                            <span className="text-[10px] text-emerald-700 block mt-0.5">{breakdownText}</span>
                          )}
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-3 transition-all"
                            style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: d.fill }}
                          >
                            <span className="text-white text-sm font-bold">{d.cantidad}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />Seguimientos vencidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-red-700">{seguimientoInfo.vencidos.length}</p>
                  <p className="text-xs text-red-500 mt-1">presupuestos con fecha pasada</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />Proximos 7 días
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-amber-700">{seguimientoInfo.proximos.length}</p>
                  <p className="text-xs text-amber-500 mt-1">seguimientos a vencer</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />Tiempo promedio en pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-slate-900">
                    {seguimientoInfo.tiempoProm !== null ? seguimientoInfo.tiempoProm : "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">días desde creacion (ganados/ejecutados)</p>
                </CardContent>
              </Card>
            </div>

            {seguimientoInfo.vencidos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-red-700">Seguimientos vencidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {seguimientoInfo.vencidos.slice(0, 15).map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="font-medium text-sm text-slate-800">{c.contactonombre || "Sin nombre"}</p>
                          <p className="text-xs text-slate-500">#{c.nroppto} · {c.asesor}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={ESTADO_BADGE[c.pipeline_stage] || "bg-slate-100 text-slate-600"}>
                            {c.pipeline_stage}
                          </Badge>
                          <p className="text-xs text-red-600 mt-1">
                            {moment(c.proximoseguimiento).format("DD/MM/YYYY")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 5: PÉRDIDAS */}
          <TabsContent value="perdidas" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />Total perdidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-red-700">{perdidasData.total}</p>
                  <p className="text-xs text-red-500 mt-1">{perdidasData.pct}% del total filtrado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />Tasa de conversion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-slate-900">{kpis.tasa}%</p>
                  <p className="text-xs text-slate-500 mt-1">sobre total con estado definido</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Motivos de pérdida</CardTitle>
                </CardHeader>
                <CardContent>
                  {perdidasData.motivosPie.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Sin datos de motivos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={perdidasData.motivosPie}
                          cx="50%"
                          cy="45%"
                          outerRadius={85}
                          dataKey="value"
                          nameKey="name"
                        >
                          {perdidasData.motivosPie.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {canViewAll && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pérdidas por asesor</CardTitle>
                </CardHeader>
                <CardContent>
                  {perdidasData.porAsesor.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Sin datos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(320, perdidasData.porAsesor.length * 50)}>
                      <BarChart data={perdidasData.porAsesor} margin={{ top: 5, right: 10, left: 0, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="asesor" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} height={80} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="perdidas" name="Perdidos" fill="#ef4444" radius={[4,4,0,0]}>
                          {perdidasData.porAsesor.map((entry, i) => (
                            <Cell key={i} fill={getAsesorHexColor(entry.asesor)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              )}
            </div>

            {perdidasData.porTipo.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pérdidas por tipo de aplicacion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(240, perdidasData.porTipo.length * 42)}>
                    <BarChart
                      data={perdidasData.porTipo}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 110, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Perdidos" fill="#ef4444" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
