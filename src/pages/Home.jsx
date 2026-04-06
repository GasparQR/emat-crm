import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KPICard from "@/components/crm/KPICard";
import ConsultaForm from "@/components/crm/ConsultaForm";
import WhatsAppSender from "@/components/crm/WhatsAppSender";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, TrendingUp, Clock, Handshake, CheckCircle2, 
  Kanban, List, Users, MessageSquare, BarChart3,
  Calendar, AlertCircle, ArrowRight, Zap, XCircle, DollarSign, MessageCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import moment from "moment";

const COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const CANALES = ["Instagram", "WhatsApp", "MercadoLibre", "Referido", "Local", "Otro"];

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const { workspace } = useWorkspace();

  const { data: consultas = [], refetch } = useQuery({
    queryKey: ['consultas-home', workspace?.id],
    queryFn: () => workspace ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 1000) : [],
    enabled: !!workspace
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ['ventas-home', workspace?.id],
    queryFn: () => workspace ? base44.entities.Venta.filter({ workspace_id: workspace.id }, "-fecha", 500) : [],
    enabled: !!workspace
  });

  const today = moment();
  
  // KPIs
  const nuevasHoy = consultas.filter(c => moment(c.fechaConsulta).isSame(today, 'day')).length;
  const nuevas7d = consultas.filter(c => moment(c.fechaConsulta).isAfter(today.clone().subtract(7, 'days'))).length;
  
  const pendientesHoy = consultas.filter(c => 
    c.proximoSeguimiento && 
    moment(c.proximoSeguimiento).isSame(today, 'day') &&
    !["Concretado", "Perdido"].includes(c.etapa)
  );
  
  const vencidos = consultas.filter(c => 
    c.proximoSeguimiento && 
    moment(c.proximoSeguimiento).isBefore(today, 'day') &&
    !["Concretado", "Perdido"].includes(c.etapa)
  );

  const enNegociacion = consultas.filter(c => c.etapa === "Negociacion").length;
  
  const concretados7d = consultas.filter(c => 
    c.etapa === "Concretado" && 
    moment(c.updated_date).isAfter(today.clone().subtract(7, 'days'))
  ).length;
  
  const concretados30d = consultas.filter(c => 
    c.etapa === "Concretado" && 
    moment(c.updated_date).isAfter(today.clone().subtract(30, 'days'))
  ).length;

  // Dashboard avanzado KPIs
  const last7Days = consultas.filter(c => moment(c.created_date).isAfter(today.clone().subtract(7, 'days')));
  const last30Days = consultas.filter(c => moment(c.created_date).isAfter(today.clone().subtract(30, 'days')));
  const concretados = consultas.filter(c => c.etapa === "Concretado");
  const perdidos = consultas.filter(c => c.etapa === "Perdido");
  const activos = consultas.filter(c => !["Concretado", "Perdido"].includes(c.etapa));
  const tasaConversion = consultas.length > 0 ? ((concretados.length / consultas.length) * 100).toFixed(1) : 0;

  const ventasMesActual = ventas.filter(v => v.fecha && moment(v.fecha).isSame(today, 'month') && v.estado === "Finalizada");
  const gananciaMensualUSD = ventasMesActual.filter(v => (v.moneda || 'USD') !== 'ARS').reduce((acc, v) => acc + (v.ganancia || 0), 0);

  const seguimientosHoy = consultas.filter(c =>
    c.proximoSeguimiento &&
    moment(c.proximoSeguimiento).isSameOrBefore(today, 'day') &&
    !["Concretado", "Perdido"].includes(c.etapa)
  );

  const leadsPorCanal = CANALES.reduce((acc, canal) => {
    acc[canal] = consultas.filter(c => c.canalOrigen === canal).length;
    return acc;
  }, {});
  const canalData = Object.entries(leadsPorCanal).filter(([_, count]) => count > 0).map(([name, value]) => ({ name, value }));

  const productosCounts = {};
  consultas.forEach(c => {
    const cat = c.categoriaProducto || "Otro";
    productosCounts[cat] = (productosCounts[cat] || 0) + 1;
  });
  const productosData = Object.entries(productosCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

  const motivosCounts = {};
  perdidos.forEach(c => { if (c.motivoPerdida) motivosCounts[c.motivoPerdida] = (motivosCounts[c.motivoPerdida] || 0) + 1; });
  const motivosData = Object.entries(motivosCounts).map(([name, value]) => ({ name, value }));

  const handleWhatsApp = (consulta) => {
    setSelectedConsulta(consulta);
    setShowWhatsApp(true);
  };

  const TILES = [
    { title: "Pipeline", desc: "Vista Kanban", icon: Kanban, page: "Pipeline", color: "bg-blue-500" },
    { title: "Consultas", desc: "Lista completa", icon: List, page: "Consultas", color: "bg-cyan-500" },
    { title: "Hoy", desc: "Seguimientos", icon: Calendar, page: "Hoy", color: "bg-amber-500", badge: pendientesHoy.length + vencidos.length },
    { title: "Contactos", desc: "Gestión", icon: Users, page: "Contactos", color: "bg-purple-500" },
    { title: "Plantillas", desc: "WhatsApp", icon: MessageSquare, page: "Plantillas", color: "bg-emerald-500" },
    { title: "Reportes", desc: "Analytics", icon: BarChart3, page: "Reportes", color: "bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Bienvenido 👋
            </h1>
            <p className="text-slate-500 mt-1">Aquí está tu resumen de hoy</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            size="lg"
            className="gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nueva Consulta
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Leads últimos 7d" value={last7Days.length} subtitle={`${last30Days.length} en 30 días`} icon={Users} />
          <KPICard title="Tasa de conversión" value={`${tasaConversion}%`} subtitle={`${concretados.length} concretados`} icon={TrendingUp} />
          <KPICard title="Ganancia Mensual" value={`US$ ${gananciaMensualUSD.toFixed(2)}`} subtitle={`${ventasMesActual.length} ventas`} icon={DollarSign} />
          <KPICard title="Activos" value={activos.length} subtitle="En seguimiento" icon={Clock} />
          <KPICard title="Perdidos" value={perdidos.length} subtitle={`${((perdidos.length / (consultas.length || 1)) * 100).toFixed(0)}% del total`} icon={XCircle} />
        </div>

        {/* Acciones Rápidas */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-2 border-slate-900 bg-slate-900 text-white hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5" />
                Acción rápida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowForm(true)}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 gap-2"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                Crear Nueva Consulta
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200 bg-amber-50 hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  Seguimientos Hoy
                </span>
                {(pendientesHoy.length + vencidos.length) > 0 && (
                  <Badge className="bg-amber-600">{pendientesHoy.length + vencidos.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("Hoy")}>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-amber-300 hover:bg-amber-100"
                  size="lg"
                >
                  Ver Seguimientos del Día
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Vencidos Urgentes */}
        {vencidos.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                Seguimientos Vencidos ({vencidos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vencidos.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{c.contactoNombre}</p>
                      <p className="text-sm text-slate-500">{c.productoConsultado}</p>
                      <p className="text-xs text-red-600 mt-1">
                        Vencido: {moment(c.proximoSeguimiento).format("DD/MM")}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleWhatsApp(c)}
                      className="bg-[#25D366] hover:bg-[#20bd5a] text-white"
                    >
                      WhatsApp
                    </Button>
                  </div>
                ))}
                {vencidos.length > 3 && (
                  <Link to={createPageUrl("Hoy")}>
                    <Button variant="ghost" className="w-full">
                      Ver todos ({vencidos.length})
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Leads por canal</CardTitle></CardHeader>
            <CardContent>
              {canalData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={canalData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-slate-400 py-12">Sin datos</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Productos más consultados</CardTitle></CardHeader>
            <CardContent>
              {productosData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={productosData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {productosData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-slate-400 py-12">Sin datos</p>}
            </CardContent>
          </Card>
          {motivosData.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Motivos de pérdida</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={motivosData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Accesos Directos */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TILES.map(tile => (
              <Link key={tile.page} to={createPageUrl(tile.page)}>
                <Card className="hover:shadow-lg hover:scale-105 transition-all cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-xl ${tile.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <tile.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-semibold text-slate-900">{tile.title}</h3>
                      {tile.badge > 0 && (
                        <Badge className="bg-red-500">{tile.badge}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{tile.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ConsultaForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={refetch}
      />

      <WhatsAppSender
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        consulta={selectedConsulta}
        onMessageSent={refetch}
      />
    </div>
  );
}