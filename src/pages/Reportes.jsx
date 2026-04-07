import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
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
        ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-nroPpto", 2000)
        : [],
    enabled: !!workspace,
  });

  const anos = useMemo(
    () => [...new Set(consultas.map((c) => c.ano).filter(Boolean))].sort((a, b) => b - a),
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
    const ganadas = filtradas.filter((c) => c.etapa === "GANADA" || c.etapa === "EJECUTADA");
    const conEstado = filtradas.filter((c) => c.etapa);
    const tasa =
      conEstado.length > 0 ? ((ganadas.length / conEstado.length) * 100).toFixed(1) : 0;
    const m2Total = filtradas.reduce((s, c) => s + (c.superficieM2 || 0), 0);
    const importeGanado = ganadas.reduce((s, c) => s + (c.importe || 0), 0);
    const ticketPromedio = ganadas.length > 0 ? importeGanado / ganadas.length : 0;
    const enSeguimiento = filtradas.filter(
      (c) => c.proximoSeguimiento && ["NEGOCIACION", "A COTIZAR"].includes(c.etapa)
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
      if (c.etapa === "GANADA" || c.etapa === "EJECUTADA") map[key].ganados++;
      else if (c.etapa === "PERDIDA") map[key].perdidos++;
      else map[key].otros++;
    });
    return Object.values(map).sort((a, b) => {
      if (a.ano !== b.ano) return (a.ano || 0) - (b.ano || 0);
      return (MESES_ORDEN.indexOf(a.mes) || 0) - (MESES_ORDEN.indexOf(b.mes) || 0);
    });
  }, [filtradas]);

  const estadoDistData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const e = c.etapa || "Sin estado";
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
      if (c.etapa === "GANADA" || c.etapa === "EJECUTADA") {
        map[a].ganados++;
        map[a].importe += c.importe || 0;
      }
      map[a].m2 += c.superficieM2 || 0;
    });
    return Object.values(map)
      .map((d) => ({ ...d, tasa: d.total > 0 ? ((d.ganados / d.total) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filtradas]);

  const mejorAsesor = useMemo(
    () => [...asesoresData].sort((a, b) => parseFloat(b.tasa) - parseFloat(a.tasa))[0] || null,
    [asesoresData]
  );

  // TAB 3 - ANÁLISIS COMERCIAL
  const tipoAplicacionData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const t = c.tipoAplicacion || "Sin especificar";
      if (!map[t]) map[t] = { name: t, cantidad: 0, m2: 0 };
      map[t].cantidad++;
      map[t].m2 += c.superficieM2 || 0;
    });
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad);
  }, [filtradas]);

  const ubicacionData = useMemo(() => {
    const map = {};
    filtradas.forEach((c) => {
      const u = c.ubicacionObra || "Sin especificar";
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
      return (MESES_ORDEN.indexOf(a.mes) || 0) - (MESES_ORDEN.indexOf(b.mes) || 0);
    });
  }, [filtradas]);

  // TAB 4 - PIPELINE & SEGUIMIENTO
  const pipelineData = useMemo(() => {
    const etapas = ["A COTIZAR", "NEGOCIACION", "GANADA", "EJECUTADA"];
    return etapas.map((e) => ({
      etapa: e,
      cantidad: filtradas.filter((c) => c.etapa === e).length,
      fill: ESTADO_COLORS[e],
    }));
  }, [filtradas]);

  const seguimientoInfo = useMemo(() => {
    const hoy = moment();
    const en7dias = hoy.clone().add(7, "days");
    const vencidos = filtradas.filter(
      (c) =>
        c.proximoSeguimiento &&
        moment(c.proximoSeguimiento).isBefore(hoy, "day") &&
        ["NEGOCIACION", "A COTIZAR"].includes(c.etapa)
    );
    const proximos = filtradas.filter(
      (c) =>
        c.proximoSeguimiento &&
        moment(c.proximoSeguimiento).isBetween(hoy, en7dias, "day", "[]") &&
        ["NEGOCIACION", "A COTIZAR"].includes(c.etapa)
    );
    const tiemposEnPipeline = filtradas
      .filter((c) => (c.etapa === "GANADA" || c.etapa === "EJECUTADA") && c.created_date)
      .map((c) => moment().diff(moment(c.created_date), "days"))
      .filter((d) => d >= 0);
    const tiempoProm =
      tiemposEnPipeline.length > 0
        ? Math.round(tiemposEnPipeline.reduce((a, b) => a + b, 0) / tiemposEnPipeline.length)
        : null;
    return { vencidos, proximos, tiempoProm };
  }, [filtradas]);

  // TAB 5 - PÉRDIDAS
  const perdidasData = useMemo(() => {
    const perdidas = filtradas.filter((c) => c.etapa === "PERDIDA");
    const motivosMap = {};
    perdidas.forEach((c) => {
      const m = c.motivoPerdida || "Sin especificar";
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
      const t = c.tipoAplicacion || "Sin especificar";
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
        <p className="text-slate-500">Cargando reportes\u2026</p>
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
              {filtradas.length} presupuesto{filtradas.length !== 1 ? "s" : ""} en el per\u00edodo seleccionado
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="7">\u00daltimos 7 d\u00edas</SelectItem>
                <SelectItem value="30">\u00daltimos 30 d\u00edas</SelectItem>
                <SelectItem value="90">\u00daltimos 90 d\u00edas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroAsesor} onValueChange={setFiltroAsesor}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los asesores</SelectItem>
                {["ANDRES","TRISTAN","VALENTINA","ROCIO","JULIAN","PABLO","ESTEBAN","MACA"].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="A\u00f1o" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los a\u00f1os</SelectItem>
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
            <TabsTrigger value="perdidas">P\u00e9rdidas</TabsTrigger>
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
                    <TrendingUp className="w-3.5 h-3.5" />Tasa conversi\u00f3n
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-emerald-600">{kpis.tasa}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />m\u00b2 cotizados
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
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={porMesData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
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
                  <CardTitle className="text-base">Distribuci\u00f3n por estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={estadoDistData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {estadoDistData.map((entry, i) => (
                          <Cell key={i} fill={ESTADO_COLORS[entry.name] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip />
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
                  <span className="font-semibold">{mejorAsesor.asesor}</span> tiene la mejor tasa de conversi\u00f3n:{" "}
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
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={asesoresData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="asesor" tick={{ fontSize: 11 }} />
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
                      <span className="text-slate-500">Conversi\u00f3n</span>
                      <span className="font-semibold text-emerald-600">{a.tasa}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Importe ganado</span>
                      <span className="font-semibold">{fmtPesos(a.importe)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">m\u00b2 cotizados</span>
                      <span className="font-semibold">{fmt(Math.round(a.m2))}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: AN\u00c1LISIS COMERCIAL */}
          <TabsContent value="comercial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Presupuestos por tipo de aplicaci\u00f3n</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={tipoAplicacionData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="cantidad" name="Cantidad" fill="#3b82f6" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">m\u00b2 por tipo de aplicaci\u00f3n</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={tipoAplicacionData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${fmt(Math.round(v))} m\u00b2`, "m\u00b2"]} />
                      <Bar dataKey="m2" name="m\u00b2" fill="#06b6d4" radius={[0,4,4,0]} />
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
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={ubicacionData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 110, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Presupuestos" fill="#f59e0b" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evoluci\u00f3n mensual de presupuestos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={evolucionMensual} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
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
                <CardTitle className="text-base">Embudo de etapas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {pipelineData.map((d) => {
                    const maxVal = Math.max(...pipelineData.map((x) => x.cantidad), 1);
                    const pct = (d.cantidad / maxVal) * 100;
                    return (
                      <div key={d.etapa} className="flex items-center gap-3">
                        <span className="w-28 text-sm font-medium text-slate-600 text-right">{d.etapa}</span>
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
                    <Calendar className="w-4 h-4" />Pr\u00f3ximos 7 d\u00edas
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
                    {seguimientoInfo.tiempoProm !== null ? seguimientoInfo.tiempoProm : "\u2014"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">d\u00edas desde creaci\u00f3n (ganados/ejecutados)</p>
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
                          <p className="font-medium text-sm text-slate-800">{c.contactoNombre || "Sin nombre"}</p>
                          <p className="text-xs text-slate-500">#{c.nroPpto} \u00b7 {c.asesor}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={ESTADO_BADGE[c.etapa] || "bg-slate-100 text-slate-600"}>
                            {c.etapa}
                          </Badge>
                          <p className="text-xs text-red-600 mt-1">
                            {moment(c.proximoSeguimiento).format("DD/MM/YYYY")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 5: P\u00c9RDIDAS */}
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
                    <CheckCircle className="w-4 h-4" />Tasa de conversi\u00f3n
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
                  <CardTitle className="text-base">Motivos de p\u00e9rdida</CardTitle>
                </CardHeader>
                <CardContent>
                  {perdidasData.motivosPie.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Sin datos de motivos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={perdidasData.motivosPie}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {perdidasData.motivosPie.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">P\u00e9rdidas por asesor</CardTitle>
                </CardHeader>
                <CardContent>
                  {perdidasData.porAsesor.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Sin datos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={perdidasData.porAsesor} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="asesor" tick={{ fontSize: 11 }} />
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
                  <CardTitle className="text-base">P\u00e9rdidas por tipo de aplicaci\u00f3n</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={perdidasData.porTipo}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 90, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
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
