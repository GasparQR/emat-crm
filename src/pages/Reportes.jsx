import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, DollarSign, Users, Package, ArrowLeft, ShoppingBag, Truck, AlertCircle } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#a855f7", "#22d3ee", "#f43f5e"];

export default function Reportes() {
  const [periodo, setPeriodo] = useState("30");
  const [filtroCanal, setFiltroCanal] = useState("todos");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const { workspace } = useWorkspace();

  const { data: ventas = [], isLoading: isLoadingVentas } = useQuery({
    queryKey: ['ventas-reportes', workspace?.id],
    queryFn: () => workspace ? base44.entities.Venta.filter({ workspace_id: workspace.id }, "-fecha", 500) : [],
    enabled: !!workspace
  });

  const { data: consultas = [] } = useQuery({
    queryKey: ['consultas-reportes', workspace?.id],
    queryFn: () => workspace ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 1000) : [],
    enabled: !!workspace
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores-reportes', workspace?.id],
    queryFn: () => workspace ? base44.entities.Proveedor.filter({ workspace_id: workspace.id }) : [],
    enabled: !!workspace
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-reportes'],
    queryFn: () => base44.entities.User.list(),
  });

  const dias = parseInt(periodo);
  const fechaCorte = moment().subtract(dias, 'days');

  // Filtros aplicados
  const ventasFiltradas = useMemo(() => {
    let filtered = ventas.filter(v => v.estado === "Finalizada" && moment(v.fecha).isAfter(fechaCorte));
    if (filtroCanal !== "todos") filtered = filtered.filter(v => v.marketplace === filtroCanal);
    if (filtroVendedor !== "todos") filtered = filtered.filter(v => v.porUsuarioId === filtroVendedor);
    return filtered;
  }, [ventas, fechaCorte, filtroCanal, filtroVendedor]);

  const consultasFiltradas = useMemo(() => {
    let filtered = consultas.filter(c => moment(c.created_date).isAfter(fechaCorte));
    if (filtroCanal !== "todos") filtered = filtered.filter(c => c.canalOrigen === filtroCanal);
    if (filtroVendedor !== "todos") filtered = filtered.filter(c => c.created_by === filtroVendedor);
    return filtered;
  }, [consultas, fechaCorte, filtroCanal, filtroVendedor]);

  // === DASHBOARD EJECUTIVO ===
  const totalGanancia = ventasFiltradas.reduce((sum, v) => sum + (v.ganancia || 0), 0);
  const totalVentas = ventasFiltradas.length;
  const totalConsultas = consultasFiltradas.length;
  const tasaConversion = totalConsultas > 0 ? (totalVentas / totalConsultas * 100).toFixed(1) : 0;
  const ticketPromedio = totalVentas > 0 ? ventasFiltradas.reduce((sum, v) => sum + (v.venta || 0), 0) / totalVentas : 0;
  const gananciaPorConsulta = totalConsultas > 0 ? totalGanancia / totalConsultas : 0;

  // Producto más rentable
  const gananciaPorProducto = ventasFiltradas.reduce((acc, v) => {
    const prod = v.productoSnapshot || "Sin especificar";
    acc[prod] = (acc[prod] || 0) + (v.ganancia || 0);
    return acc;
  }, {});
  const productoMasRentable = Object.entries(gananciaPorProducto).sort(([, a], [, b]) => b - a)[0];

  // Canal más rentable
  const gananciaPorCanal = ventasFiltradas.reduce((acc, v) => {
    const canal = v.marketplace || "Sin especificar";
    acc[canal] = (acc[canal] || 0) + (v.ganancia || 0);
    return acc;
  }, {});
  const canalMasRentable = Object.entries(gananciaPorCanal).sort(([, a], [, b]) => b - a)[0];

  // Proveedor más rentable
  const gananciaPorProveedor = ventasFiltradas.reduce((acc, v) => {
    const prov = v.proveedorNombreSnapshot || "Sin especificar";
    acc[prov] = (acc[prov] || 0) + (v.ganancia || 0);
    return acc;
  }, {});
  const proveedorMasRentable = Object.entries(gananciaPorProveedor).sort(([, a], [, b]) => b - a)[0];

  // === EMBUDO ===
  const funnelData = [
    { name: "Consultas", value: totalConsultas, fill: "#94a3b8" },
    { name: "Ventas", value: totalVentas, fill: "#10b981" }
  ];

  // === CANALES ===
  const canalesData = useMemo(() => {
    const canales = {};
    consultasFiltradas.forEach(c => {
      const canal = c.canalOrigen || "Sin especificar";
      if (!canales[canal]) canales[canal] = { consultas: 0, ventas: 0, gananciaTotal: 0, tiempos: [] };
      canales[canal].consultas++;
      if (c.etapa === "Concretado") {
        const venta = ventasFiltradas.find(v => v.consultaId === c.id);
        if (venta) {
          canales[canal].ventas++;
          canales[canal].gananciaTotal += venta.ganancia || 0;
          const dias = moment(venta.fecha).diff(moment(c.created_date), 'days');
          if (dias >= 0) canales[canal].tiempos.push(dias);
        }
      }
    });

    return Object.entries(canales).map(([name, data]) => ({
      name,
      consultas: data.consultas,
      ventas: data.ventas,
      conversion: data.consultas > 0 ? (data.ventas / data.consultas * 100).toFixed(1) : 0,
      gananciaTotal: data.gananciaTotal,
      gananciaProm: data.ventas > 0 ? data.gananciaTotal / data.ventas : 0,
      tiempoProm: data.tiempos.length > 0 ? (data.tiempos.reduce((a, b) => a + b, 0) / data.tiempos.length).toFixed(0) : 0
    })).sort((a, b) => b.gananciaTotal - a.gananciaTotal);
  }, [consultasFiltradas, ventasFiltradas]);

  // === PRODUCTOS ===
  const productosData = useMemo(() => {
    const productos = {};
    ventasFiltradas.forEach(v => {
      const prod = v.productoSnapshot || "Sin especificar";
      if (!productos[prod]) productos[prod] = { gananciaTotal: 0, costo: 0, venta: 0, count: 0 };
      productos[prod].gananciaTotal += v.ganancia || 0;
      productos[prod].costo += v.costo || 0;
      productos[prod].venta += v.venta || 0;
      productos[prod].count++;
    });

    return Object.entries(productos).map(([name, data]) => ({
      name,
      gananciaTotal: data.gananciaTotal,
      margen: data.venta > 0 ? ((data.gananciaTotal / data.venta) * 100).toFixed(1) : 0,
      count: data.count
    })).sort((a, b) => b.gananciaTotal - a.gananciaTotal).slice(0, 10);
  }, [ventasFiltradas]);

  // === PROVEEDORES ===
  const proveedoresData = useMemo(() => {
    const provs = {};
    ventasFiltradas.forEach(v => {
      const prov = v.proveedorNombreSnapshot || "Sin especificar";
      if (!provs[prov]) provs[prov] = { compras: 0, costoTotal: 0, ventaTotal: 0, gananciaTotal: 0, ultimaCompra: null };
      provs[prov].compras++;
      provs[prov].costoTotal += v.costo || 0;
      provs[prov].ventaTotal += v.venta || 0;
      provs[prov].gananciaTotal += v.ganancia || 0;
      if (!provs[prov].ultimaCompra || moment(v.fecha).isAfter(provs[prov].ultimaCompra)) {
        provs[prov].ultimaCompra = v.fecha;
      }
    });

    return Object.entries(provs).map(([name, data]) => ({
      name,
      compras: data.compras,
      costoTotal: data.costoTotal,
      ventaTotal: data.ventaTotal,
      gananciaTotal: data.gananciaTotal,
      margen: data.ventaTotal > 0 ? ((data.gananciaTotal / data.ventaTotal) * 100).toFixed(1) : 0,
      ultimaCompra: data.ultimaCompra
    })).sort((a, b) => b.gananciaTotal - a.gananciaTotal);
  }, [ventasFiltradas]);

  // === PÉRDIDAS ===
  const perdidasData = useMemo(() => {
    const perdidas = consultasFiltradas.filter(c => c.etapa === "Perdido");
    const motivos = {};
    const tiempos = [];

    perdidas.forEach(c => {
      const motivo = c.motivoPerdida || "Sin especificar";
      motivos[motivo] = (motivos[motivo] || 0) + 1;
      
      const dias = moment().diff(moment(c.created_date), 'days');
      if (dias >= 0) tiempos.push(dias);
    });

    const totalPerdidas = perdidas.length;
    const motivosArray = Object.entries(motivos).map(([name, count]) => ({
      name,
      value: count,
      percent: totalPerdidas > 0 ? ((count / totalPerdidas) * 100).toFixed(1) : 0
    })).sort((a, b) => b.value - a.value);

    const tiempoProm = tiempos.length > 0 ? (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(0) : 0;

    return { motivosArray, tiempoProm };
  }, [consultasFiltradas]);

  // === TIMELINE ===
  const ventasTimeline = useMemo(() => {
    const dates = {};
    ventasFiltradas.forEach(v => {
      const day = moment(v.fecha).format("DD/MM");
      if (!dates[day]) dates[day] = { ventas: 0, ganancia: 0 };
      dates[day].ventas++;
      dates[day].ganancia += v.ganancia || 0;
    });
    
    const timeline = [];
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = moment().subtract(i, 'days');
      const dia = fecha.format("DD/MM");
      timeline.push({ 
        dia, 
        ventas: dates[dia]?.ventas || 0,
        ganancia: dates[dia]?.ganancia || 0
      });
    }
    return timeline;
  }, [ventasFiltradas, dias]);

  // === FILTROS DISPONIBLES ===
  const canalesDisponibles = useMemo(() => {
    const salesChannels = new Set(ventas.map(v => v.marketplace).filter(Boolean));
    const consultaChannels = new Set(consultas.map(c => c.canalOrigen).filter(Boolean));
    return [...new Set([...salesChannels, ...consultaChannels])].sort();
  }, [ventas, consultas]);

  const vendedoresDisponibles = useMemo(() => {
    const sellerEmails = new Set();
    ventas.forEach(v => { if (v.porUsuarioId) sellerEmails.add(v.porUsuarioId); });
    consultas.forEach(c => { if (c.created_by) sellerEmails.add(c.created_by); });
    
    return Array.from(sellerEmails).map(email => {
      const user = users.find(u => u.email === email);
      return { email, name: user?.full_name || email };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [ventas, consultas, users]);

  // Comparación de canales
  const mejorCanal = canalesData[0];
  const comparacionCanal = canalesData.length > 1 && mejorCanal ? 
    `${mejorCanal.name} rinde ${(mejorCanal.gananciaTotal / (canalesData[1]?.gananciaTotal || 1)).toFixed(1)}x más que ${canalesData[1]?.name}` : null;

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
            <p className="text-sm text-slate-500 mt-1">Métricas accionables para tomar mejores decisiones</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroCanal} onValueChange={setFiltroCanal}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {canalesDisponibles.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {vendedoresDisponibles.map(v => (
                  <SelectItem key={v.email} value={v.email}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="ejecutivo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
            <TabsTrigger value="ejecutivo">Ejecutivo</TabsTrigger>
            <TabsTrigger value="canales">Canales</TabsTrigger>
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            <TabsTrigger value="perdidas">Pérdidas</TabsTrigger>
          </TabsList>

          {/* DASHBOARD EJECUTIVO */}
          <TabsContent value="ejecutivo" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Ganancia Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-emerald-900">US$ {totalGanancia.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-emerald-600 mt-1">{totalVentas} ventas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Tasa de Conversión
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{tasaConversion}%</p>
                  <p className="text-xs text-slate-500 mt-1">{totalVentas} de {totalConsultas} consultas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Ticket Promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">US$ {ticketPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Ganancia por Consulta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">US$ {gananciaPorConsulta.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </CardContent>
              </Card>

              {productoMasRentable && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Producto Más Rentable
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-slate-900 truncate">{productoMasRentable[0]}</p>
                    <p className="text-sm text-slate-600">US$ {productoMasRentable[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </CardContent>
                </Card>
              )}

              {canalMasRentable && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Canal Más Rentable
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-slate-900">{canalMasRentable[0]}</p>
                    <p className="text-sm text-slate-600">US$ {canalMasRentable[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </CardContent>
                </Card>
              )}

              {proveedorMasRentable && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Proveedor Más Rentable
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-slate-900 truncate">{proveedorMasRentable[0]}</p>
                    <p className="text-sm text-slate-600">US$ {proveedorMasRentable[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Embudo */}
            <Card>
              <CardHeader>
                <CardTitle>Embudo con Impacto Económico</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} layout="vertical">
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-center mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    Convertimos <span className="font-bold text-emerald-600">{tasaConversion}%</span> de las consultas en ventas.
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Cada consulta generó <span className="font-bold text-emerald-600">US$ {gananciaPorConsulta.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> de ganancia en promedio.
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Ganancia total: <span className="font-bold text-emerald-600">US$ {totalGanancia.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Día (últimos {dias} días)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={ventasTimeline}>
                    <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, name) => [value, name === "ganancia" ? "Ganancia" : "Ventas"]} />
                    <Legend />
                    <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} name="Ventas" />
                    <Line type="monotone" dataKey="ganancia" stroke="#10b981" strokeWidth={2} name="Ganancia" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CANALES */}
          <TabsContent value="canales" className="space-y-6">
            {comparacionCanal && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Insight</p>
                  <p className="text-sm text-blue-700">{comparacionCanal}</p>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {canalesData.map(canal => (
                <Card key={canal.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{canal.name}</h3>
                      <span className="text-2xl font-bold text-emerald-600">
                        US$ {canal.gananciaTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div>
                        <p className="text-xs text-slate-500">Consultas</p>
                        <p className="text-xl font-bold text-slate-900">{canal.consultas}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Ventas</p>
                        <p className="text-xl font-bold text-slate-900">{canal.ventas}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Conversión</p>
                        <p className="text-xl font-bold text-emerald-600">{canal.conversion}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Ganancia Prom.</p>
                        <p className="text-xl font-bold text-slate-900">US$ {canal.gananciaProm.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Tiempo Cierre</p>
                        <p className="text-xl font-bold text-slate-900">{canal.tiempoProm} días</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* PRODUCTOS */}
          <TabsContent value="productos" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking por Ganancia Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={productosData} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip formatter={(val) => `US$ ${val.toLocaleString()}`} />
                      <Bar dataKey="gananciaTotal" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ranking por Margen %</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={[...productosData].sort((a, b) => parseFloat(b.margen) - parseFloat(a.margen))} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip formatter={(val) => `${val}%`} />
                      <Bar dataKey="margen" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PROVEEDORES */}
          <TabsContent value="proveedores" className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-semibold text-slate-700">Proveedor</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700">Compras</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700">Costo Total</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700">Venta Total</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700">Ganancia</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700">Margen %</th>
                    <th className="text-right py-3 px-2 font-semibold text-slate-700">Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {proveedoresData.map((prov, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2 font-medium text-slate-900">{prov.name}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{prov.compras}</td>
                      <td className="text-right py-3 px-2 text-slate-600">US$ {prov.costoTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="text-right py-3 px-2 text-slate-600">US$ {prov.ventaTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="text-right py-3 px-2 font-semibold text-emerald-600">US$ {prov.gananciaTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{prov.margen}%</td>
                      <td className="text-right py-3 px-2 text-slate-500 text-xs">{prov.ultimaCompra ? moment(prov.ultimaCompra).format("DD/MM/YY") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* PÉRDIDAS */}
          <TabsContent value="perdidas" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Motivos de Pérdida (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {perdidasData.motivosArray.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={perdidasData.motivosArray}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${percent}%`}
                          labelLine={false}
                        >
                          {perdidasData.motivosArray.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value} (${props.payload.percent}%)`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-slate-500 py-20">No hay datos de pérdidas en este período</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Análisis de Tiempo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center p-6 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-2">Tiempo Promedio hasta Pérdida</p>
                    <p className="text-4xl font-bold text-slate-900">{perdidasData.tiempoProm}</p>
                    <p className="text-sm text-slate-500 mt-1">días</p>
                  </div>
                  <div className="space-y-3">
                    {perdidasData.motivosArray.map((motivo, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">{motivo.name}</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900">{motivo.value}</span>
                          <span className="text-xs text-slate-500 ml-2">({motivo.percent}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}