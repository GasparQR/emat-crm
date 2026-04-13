import { useMemo, useState } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Plus, BarChart3, Users, List, TrendingUp, FileText, CheckCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import ConsultaForm from "@/components/crm/ConsultaForm";

const ASESOR_COLORS = {
  ANDRES: "#3b82f6", TRISTAN: "#a855f7", VALENTINA: "#ec4899",
  ROCIO: "#f43f5e", JULIAN: "#6366f1", PABLO: "#f97316",
  ESTEBAN: "#06b6d4", MACA: "#d946ef",
};

const ESTADO_PIE_COLORS = {
  "NUEVO LEAD": "#06b6d4", "A COTIZAR": "#94a3b8", "NEGOCIACION": "#f59e0b", "GANADA": "#10b981",
  "EJECUTADA": "#059669", "PAUSADA": "#6b7280", "PERDIDA": "#ef4444",
};

// Lista de asesores disponibles
const ASESORES_LIST = Object.keys(ASESOR_COLORS).map(name => ({
  value: name,
  label: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
}));

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    nombre: "",
    whatsapp: "",
    empresa: "",
    asesor: "",
  });
  const { workspace } = useWorkspace();

  const { data: consultas = [], refetch } = useQuery({
    queryKey: ["consultas-home", workspace?.id],
    queryFn: () =>
      workspace
        ? entities.Consulta.filter({ workspace_id: workspace.id }, null, 2000)
        : [],
    enabled: !!workspace,
  });

  const handleCreateLead = async () => {
    // Validaciones
    if (!newLeadData.nombre.trim()) {
      toast.error("El nombre del lead es requerido");
      return;
    }
    if (!newLeadData.asesor) {
      toast.error("Debe seleccionar un asesor");
      return;
    }

    try {
      const wsId = workspace?.id || "local";
      const MESES = [
        "ENERO",
        "FEBRERO",
        "MARZO",
        "ABRIL",
        "MAYO",
        "JUNIO",
        "JULIO",
        "AGOSTO",
        "SEPTIEMBRE",
        "OCTUBRE",
        "NOVIEMBRE",
        "DICIEMBRE",
      ];
      const now = new Date();

      // Crear contacto
      await entities.Contacto.create({
        workspace_id: wsId,
        nombre: newLeadData.nombre.trim(),
        whatsapp: newLeadData.whatsapp.trim(),
        empresa: newLeadData.empresa.trim(),
        asesor: newLeadData.asesor,
      });

      // Crear consulta automáticamente en etapa NUEVO LEAD
      await entities.Consulta.create({
        workspace_id: wsId,
        contactonombre: newLeadData.nombre.trim(),
        contactowhatsapp: newLeadData.whatsapp.trim() || "",
        pipeline_stage: "NUEVO LEAD",
        asesor: newLeadData.asesor,
        mes: MESES[now.getMonth()],
        ano: now.getFullYear(),
        created_date: now.toISOString().split("T")[0],
      });

      setNewLeadData({ nombre: "", whatsapp: "", empresa: "", asesor: "" });
      setShowNewLead(false);
      toast.success("Nuevo lead creado y asignado al pipeline");
      refetch();
    } catch (e) {
      toast.error("Error al crear lead: " + e.message);
      console.error(e);
    }
  };

  // KPIs
  const hoy = new Date();
  const hace7dias = new Date(hoy - 7 * 86400000).toISOString();
  const mesActual = hoy
    .toLocaleString("es-AR", { month: "long" })
    .toUpperCase()
    .replace("Á", "A")
    .replace("É", "E")
    .replace("Ó", "O");

  const kpis = useMemo(() => {
    const recientes = consultas.filter((c) => (c.created_date || "") >= hace7dias);
    const ganadas = consultas.filter(
      (c) =>
        c.pipeline_stage === "GANADA" || c.pipeline_stage === "EJECUTADA"
    );
    const totalConEstado = consultas.filter(
      (c) => c.pipeline_stage && c.pipeline_stage !== "A COTIZAR"
    );
    const tasa =
      totalConEstado.length > 0
        ? Math.round((ganadas.length / consultas.length) * 100)
        : 0;
    const delMes = consultas.filter(
      (c) => c.mes === mesActual && c.ano === hoy.getFullYear()
    );
    const m2Mes = delMes.reduce((s, c) => s + (c.superficiem2 || 0), 0);
    const importeMes = ganadas
      .filter((c) => c.mes === mesActual && c.ano === hoy.getFullYear())
      .reduce((s, c) => s + (c.importe || 0), 0);
    const enSeguimiento = consultas.filter(
      (c) =>
        c.proximoseguimiento &&
        ["NUEVO LEAD", "NEGOCIACION", "A COTIZAR"].includes(c.pipeline_stage)
    );
    return {
      recientes: recientes.length,
      tasa,
      m2Mes: Math.round(m2Mes),
      importeMes,
      enSeguimiento: enSeguimiento.length,
      totalGanadas: ganadas.length,
    };
  }, [consultas]);

  // Chart: presupuestos por asesor
  const asesoresData = useMemo(() => {
    const map = {};
    consultas.forEach((c) => {
      if (!c.asesor) return;
      if (!map[c.asesor])
        map[c.asesor] = { asesor: c.asesor, total: 0, ganados: 0 };
      map[c.asesor].total++;
      if (
        c.pipeline_stage === "GANADA" ||
        c.pipeline_stage === "EJECUTADA"
      )
        map[c.asesor].ganados++;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [consultas]);

  // Chart: distribución por estado
  const estadoData = useMemo(() => {
    const map = {};
    consultas.forEach((c) => {
      const e = c.pipeline_stage || "Sin estado";
      map[e] = (map[e] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [consultas]);

  const statsCards = [
    {
      title: "Presupuestos últimos 7 días",
      value: kpis.recientes,
      icon: FileText,
      color: "bg-blue-500",
    },
    {
      title: "Tasa de conversión",
      value: `${kpis.tasa}%`,
      icon: TrendingUp,
      color: "bg-purple-500",
    },
    {
      title: "m² este mes",
      value: kpis.m2Mes.toLocaleString("es-AR"),
      icon: BarChart3,
      color: "bg-green-500",
    },
    {
      title: "En seguimiento",
      value: kpis.enSeguimiento,
      icon: CheckCircle,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              EMAT Celulosa CRM
            </h1>
            <p className="text-slate-500 mt-1">
              {consultas.length} presupuestos cargados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowNewLead(true)}
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo cliente / lead</span>
              <span className="sm:hidden">Nuevo lead</span>
            </Button>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo presupuesto
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.color} p-2 rounded-lg`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Presupuestos por asesor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={asesoresData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <XAxis dataKey="asesor" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="total"
                    name="Total"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="ganados"
                    name="Ganados"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución por estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={estadoData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={30}
                      dataKey="value"
                      nameKey="name"
                      label={false}
                    >
                      {estadoData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={ESTADO_PIE_COLORS[entry.name] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value} presupuestos`}
                      labelFormatter={(name) => `${name}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {estadoData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            ESTADO_PIE_COLORS[entry.name] || "#94a3b8",
                        }}
                      />
                      <span className="text-slate-700 truncate">
                        {entry.name}
                      </span>
                      <span className="text-slate-500 font-medium ml-auto">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Pipeline",
              page: "Pipeline",
              icon: BarChart3,
              color: "bg-blue-50 text-blue-700 border-blue-200",
            },
            {
              label: "Presupuestos",
              page: "Consultas",
              icon: FileText,
              color: "bg-slate-50 text-slate-700 border-slate-200",
            },
            {
              label: "Contactos",
              page: "Contactos",
              icon: Users,
              color: "bg-purple-50 text-purple-700 border-purple-200",
            },
            {
              label: "Reportes",
              page: "Reportes",
              icon: List,
              color: "bg-green-50 text-green-700 border-green-200",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.page} to={createPageUrl(item.page)}>
                <Card
                  className={`border-2 ${item.color} hover:shadow-md transition-all cursor-pointer`}
                >
                  <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
                    <Icon className="w-6 h-6" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Nuevo Lead Dialog */}
      <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente / lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="nombre">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                value={newLeadData.nombre}
                onChange={(e) =>
                  setNewLeadData((prev) => ({ ...prev, nombre: e.target.value }))
                }
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Asesor */}
            <div className="space-y-1.5">
              <Label htmlFor="asesor">
                Asesor <span className="text-red-500">*</span>
              </Label>
              <select
                id="asesor"
                value={newLeadData.asesor}
                onChange={(e) =>
                  setNewLeadData((prev) => ({ ...prev, asesor: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
              >
                <option value="">Seleccionar asesor...</option>
                {ASESORES_LIST.map((asesor) => (
                  <option key={asesor.value} value={asesor.value}>
                    {asesor.label}
                  </option>
                ))}
              </select>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={newLeadData.whatsapp}
                onChange={(e) =>
                  setNewLeadData((prev) => ({ ...prev, whatsapp: e.target.value }))
                }
                placeholder="+54 9 351 123-4567"
                type="tel"
              />
            </div>

            {/* Empresa */}
            <div className="space-y-1.5">
              <Label htmlFor="empresa">Empresa</Label>
              <Input
                id="empresa"
                value={newLeadData.empresa}
                onChange={(e) =>
                  setNewLeadData((prev) => ({ ...prev, empresa: e.target.value }))
                }
                placeholder="Constructora SA"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowNewLead(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateLead}>
              Crear lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nuevo Presupuesto Form */}
      <ConsultaForm
        open={showForm}
        onOpenChange={setShowForm}
        consulta={null}
        onSave={() => {
          refetch();
          setShowForm(false);
        }}
      />
    </div>
  );
}
