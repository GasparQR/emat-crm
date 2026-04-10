import { useState, useMemo } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import {
  TrendingUp, ArrowLeft, Target, Layers,
  DollarSign, Calendar, CheckCircle, Clock, XCircle, AlertCircle,
} from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const ASESOR_COLORS = {
  ANDRES: "#3b82f6",
  TRISTAN: "#a855f7",
  VALENTINA: "#ec4899",
  ROCIO: "#f43f5e",
  JULIAN: "#6366f1",
  PABLO: "#f97316",
  ESTEBAN: "#06b6d4",
  MACA: "#d946ef",
};

const ESTADO_COLORS = {
  "A COTIZAR": "#94a3b8",
  "NEGOCIACION": "#f59e0b",
  "GANADA": "#10b981",
  "EJECUTADA": "#059669",
  "PAUSADA": "#6b7280",
  "PERDIDA": "#ef4444",
};

const ESTADO_BADGE = {
  "A COTIZAR": "bg-slate-100 text-slate-700",
  "NEGOCIACION": "bg-amber-100 text-amber-700",
  "GANADA": "bg-green-100 text-green-700",
  "EJECUTADA": "bg-emerald-100 text-emerald-800",
  "PAUSADA": "bg-gray-100 text-gray-600",
  "PERDIDA": "bg-red-100 text-red-700",
};

const MESES_ORDEN = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const CHART_COLORS = ["#3b82f6","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#a855f7","#22d3ee","#f43f5e"];
const UNKNOWN_MONTH_INDEX = 99;
const MIN_ADVISOR_BUDGETS = 3;

const fmt = (n) => n?.toLocaleString("es-AR") ?? "0";
const fmtPesos = (n) => `$${(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
const fmtMonthYear = (mes, ano) =>
  mes && ano ? `${mes.slice(0, 3)} ${ano}` : "Sin fecha";
export default function Reportes() {
  const [periodo, setPeriodo] = useState("todos");
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroAno, setFiltroAno] = useState("todos");
  const { workspace } = useWorkspace();

  const { data: consultas = [], isLoading } = useQuery({
    queryKey: ["consultas-reportes", workspace?.id],
    queryFn: () =>
      workspace
        ? entities.Consulta.filter({ workspace_id: workspace.id }, "-nroppto", 2000)
        : [],
    enabled: !!workspace,
  });

  const anos = useMemo(
    () => [...new Set(consultas.map((c) => c.ano).filter(Boolean))].sort((a, b) => b - a),
    [consultas]
  );

  const asesoresUnicos = useMemo(
    () => [...new Set(consultas.map((c) => c.asesor).filter(Boolean))].sort(),
    [consultas]
  );

  const filtradas = useMemo(() => {
    const hoy = moment();
    return consultas.filter((c) => {
      if (filtroAsesor !== "todos" && c.asesor !== filtroAsesor) return false;
      if (filtroAno !== "todos" && String(c.ano) !== filtroAno) return false;
      if (periodo !== "todos") {
        const dias = parseInt(periodo);
        if (!c.created_date || !moment(c.created_date).isAfter(hoy.clone().subtract(dias, "days")))
          return false;
      }
      return true;
    });
  }, [consultas, filtroAsesor, filtroAno, periodo]);

  // TAB 1 - DASHBOARD EJECUTIVO
  const kpis = useMemo(() => {
    const ganadas = filtradas.filter((c) => c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA");
    const conEstado = filtradas.filter((c) => c.pipeline_stage);
    const tasa =
      conEstado.length > 0 ? ((ganadas.length / conEstado.length) * 100).toFixed(1) : 0;
    const m2Total = filtradas.reduce((s, c) => s + (c.superficiem2 || 0), 0);
    const importeGanado = ganadas.reduce((s, c) => s + (c.importe || 0), 0);
    const ticketPromedio = ganadas.length > 0 ? importeGanado / ganadas.length : 0;
    const enSeguimiento = filtradas.filter(
      (c) => c.proximoseguimiento && ["NEGOCIACION", "A COTIZAR"].includes(c.pipeline_stage)
    );
    return {
      total: filtradas.length,
      tasa,
      m2Total: Math.round(m2Total),
      importeGanado,
      ticketPromedio,
      enSeguimiento: enSeguimiento.length,
    };
  }, [filtradas]);

  const porMesData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const key = fmtMonthYear(c.mes, c.ano);
      if (!map[key]) map[key] = { label: key, mes: c.mes, ano: c.ano, ganados: 0, perdidos: 0, otros: 0 };
      if (c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA") map[key].ganados++;
      else if (c.pipeline_stage === "PERDIDA") map[key].perdidos++;
      else map[key].otros++;
    });
    return Object.values(map).sort((a, b) => {
      if (a.ano !== b.ano) return (a.ano || 0) - (b.ano || 0);
      const idxA = MESES_ORDEN.indexOf(a.mes);
      const idxB = MESES_ORDEN.indexOf(b.mes);
      return (idxA === -1 ? UNKNOWN_MONTH_INDEX : idxA) - (idxB === -1 ? UNKNOWN_MONTH_INDEX : idxB);
    });
  }, [filtradas]);

  const estadoDistData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const e = c.pipeline_stage || "Sin estado";
      map[e] = (map[e] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtradas]);

  // TAB 2 - ASESORES
  const asesoresData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const a = c.asesor || "Sin asignar";
      if (!map[a]) map[a] = { asesor: a, total: 0, ganados: 0, importe: 0, m2: 0 };
      map[a].total++;
      if (c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA") {
        map[a].ganados++;
        map[a].importe += c.importe || 0;
      }
      map[a].m2 += c.superficiem2 || 0;
    });
    return Object.values(map)
      .map((d) => ({ ...d, tasa: d.total > 0 ? ((d.ganados / d.total) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filtradas]);

  const mejorAsesor = useMemo(
    () =>
      [...asesoresData]
        .filter((a) => a.total >= MIN_ADVISOR_BUDGETS)
        .sort((a, b) => parseFloat(b.tasa) - parseFloat(a.tasa))[0] || null,
    [asesoresData]
  );

  // TAB 3 - ANÁLISIS COMERCIAL
  const tipoAplicacionData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const t = c.tipoapplicacion || "Sin especificar";
      if (!map[t]) map[t] = { name: t, cantidad: 0, m2: 0 };
      map[t].cantidad++;
      map[t].m2 += c.superficiem2 || 0;
    });
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad);
  }, [filtradas]);

  const ubicacionData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const u = c.ubicacionobra || "Sin especificar";
      map[u] = (map[u] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtradas]);

  const evolucionMensual = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      if (!c.mes || !c.ano) return;
      const key = fmtMonthYear(c.mes, c.ano);
      if (!map[key]) map[key] = { label: key, mes: c.mes, ano: c.ano, total: 0 };
      map[key].total++;
    });
    return Object.values(map).sort((a, b) => {
      if (a.ano !== b.ano) return (a.ano || 0) - (b.ano || 0);
      const idxA = MESES_ORDEN.indexOf(a.mes);
      const idxB = MESES_ORDEN.indexOf(b.mes);
      return (idxA === -1 ? UNKNOWN_MONTH_INDEX : idxA) - (idxB === -1 ? UNKNOWN_MONTH_INDEX : idxB);
    });
  }, [filtradas]);

  // TAB 4 - PIPELINE & SEGUIMIENTO
  const pipelineData = useMemo(() => {
    const pipeline_stages = ["A COTIZAR", "NEGOCIACION", "PAUSADA", "GANADA", "EJECUTADA"];
    return pipeline_stages.map((e) => ({
      pipeline_stage: e,
      cantidad: filtradas.filter((c) => c.pipeline_stage === e).length,
      fill: ESTADO_COLORS[e],
    }));
  }, [filtradas]);

  const maxPipelineVal = useMemo(
    () => Math.max(...pipelineData.map((x) => x.cantidad), 1),
    [pipelineData]
  );

  const seguimientoInfo = useMemo(() => {
    const hoy = moment();
    const en7dias = hoy.clone().add(7, "days");
    const vencidos = filtradas.filter(
      (c) =>
        c.proximoseguimiento &&
        moment(c.proximoseguimiento).isBefore(hoy, "day") &&
        ["NEGOCIACION", "A COTIZAR"].includes(c.pipeline_stage)
    );
    const proximos = filtradas.filter(
      (c) =>
        c.proximoseguimiento &&
        moment(c.proximoseguimiento).isBetween(hoy, en7dias, "day", "[]") &&
        ["NEGOCIACION", "A COTIZAR"].includes(c.pipeline_stage)
    );
    const tiemposEnPipeline = filtradas
      .filter((c) => (c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA") && c.created_date)
      .map((c) => moment(c.updated_date || c.created_date).diff(moment(c.created_date), "days"))
      .filter((d) => d >= 0);
    const tiempoProm =
      tiemposEnPipeline.length > 0
        ? Math.round(tiemposEnPipeline.reduce((a, b) => a + b, 0) / tiemposEnPipeline.length)
        : null;
    return { vencidos, proximos, tiempoProm };
  }, [filtradas]);

  // TAB 5 - PÉRDIDAS
  const perdidasData = useMemo(() => {
    const perdidas = filtradas.filter((c) => c.pipeline_stage === "PERDIDA");
    const motivosMap = {};
    perdidas.forEach((c) => {
      const m = c.razonperdida || "Sin especificar";
      motivosMap[m] = (motivosMap[m] || 0) + 1;
    });
    const motivosPie = Object.entries(motivosMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const porAsesorMap = {};
    perdidas.forEach((c) => {
      const a = c.asesor || "Sin asignar";
      porAsesorMap[a] = (porAsesorMap[a] || 0) + 1;
    });
    const porAsesor = Object.entries(porAsesorMap)
      .map(([asesor, count]) => ({ asesor, perdidas: count }))
      .sort((a, b) => b.perdidas - a.perdidas);
    const porTipoMap = {};
    perdidas.forEach((c) => {
      const t = c.tipoapplicacion || "Sin especificar";
      porTipoMap[t] = (porTipoMap[t] || 0) + 1;
    });
    const porTipo = Object.entries(porTipoMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const pct = filtradas.length > 0 ? ((perdidas.length / filtradas.length) * 100).toFixed(1) : 0;
    return { total: perdidas.length, pct, motivosPie, porAsesor, porTipo };
  }, [filtradas]);

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
            <h1 className="text-2xl font-bold text-slate-900">Reportes & Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">
              {filtradas.length} presupuesto{filtradas.length !== 1 ? "s" : ""} en el período seleccionado
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroAsesor} onValueChange={setFiltroAsesor}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los asesores</SelectItem>
                {asesoresUnicos.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ejecutivo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="ejecutivo">Ejecutivo</TabsTrigger>
            <TabsTrigger value="asesores">Asesores</TabsTrigger>
            <TabsTrigger value="comercial">Comercial</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="perdidas">Pérdidas</TabsTrigger>
          </TabsList>

          {/* TAB 1: DASHBOARD EJECUTIVO */}
          <TabsContent value="ejecutivo" className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />Total presupuestos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{kpis.total}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />Tasa conversion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-emerald-600">{kpis.tasa}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />m² cotizados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{fmt(kpis.m2Total)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />Importe ganado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-800">{fmtPesos(kpis.importeGanado)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />Ticket promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900">{fmtPesos(kpis.ticketPromedio)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />En seguimiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-amber-600">{kpis.enSeguimiento}</p>
                </CardContent>
              </Card>
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
                <CardHeader>
                  <CardTitle className="text-base">Distribucion por estado</CardTitle>
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
                          <Cell key={i} fill={ESTADO_COLORS[entry.name] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: ASESORES */}
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
                    style={{ backgroundColor: ASESOR_COLORS[a.asesor] || "#94a3b8" }}
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

          {/* TAB 3: ANÁLISIS COMERCIAL */}
          <TabsContent value="comercial" className="space-y-6">
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
                      <Tooltip formatter={(v) => [`${fmt(Math.round(v))} m²`, "m²"]} />
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolucion mensual de presupuestos</CardTitle>
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
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: PIPELINE & SEGUIMIENTO */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Embudo de pipeline_stages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {pipelineData.map((d) => {
                    const pct = (d.cantidad / maxPipelineVal) * 100;
                    return (
                      <div key={d.pipeline_stage} className="flex items-center gap-3">
                        <span className="w-28 text-sm font-medium text-slate-600 text-right">{d.pipeline_stage}</span>
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
                            <Cell key={i} fill={ASESOR_COLORS[entry.asesor] || "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
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
