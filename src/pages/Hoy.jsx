import { useState, useMemo } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, AlertCircle, CheckCircle2, MessageCircle, ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";
import WhatsAppSender from "@/components/crm/WhatsAppSender";
import { toast } from "sonner";
import { useAuth } from "@/lib/SimpleAuthContext";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { getNextFollowUpDate } from "@/components/utils/dateUtils";

const ASESORES = ["ANDRES", "TRISTAN", "VALENTINA", "ROCIO", "JULIAN", "PABLO", "ESTEBAN", "MACA"];

const ASESOR_COLORS = {
  ANDRES: "bg-blue-500", TRISTAN: "bg-purple-500", VALENTINA: "bg-pink-500",
  ROCIO: "bg-rose-500", JULIAN: "bg-indigo-500", PABLO: "bg-orange-500",
  ESTEBAN: "bg-cyan-500", MACA: "bg-fuchsia-500",
};

export default function Hoy() {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const isLogistica = user?.role === "logistica";
  const { data: currentUser } = useCurrentUser();

  const { data: consultas = [], refetch } = useQuery({
    queryKey: ['consultas-hoy', workspace?.id],
    queryFn: () => workspace ? entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 1000) : [],
    enabled: !!workspace
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace,
  });

  const etapaColorMap = useMemo(
    () => Object.fromEntries(etapas.map(s => [s.pipeline_stage, s.color])),
    [etapas]
  );

  const getNextNroPpto = async () => {
    const rows = await entities.Consulta.filter(
      { workspace_id: workspace?.id || "local" },
      "-nroppto",
      2000
    );
    const maxNro = (rows || []).reduce((max, item) => {
      const nro = Number(item?.nroppto);
      if (!Number.isFinite(nro)) return max;
      return Math.max(max, nro);
    }, 0);
    return maxNro + 1;
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Consulta.update(id, data),
    onSuccess: () => {
      const wid = workspace?.id;
      queryClient.invalidateQueries({ queryKey: ['consultas-hoy', wid] });
      queryClient.invalidateQueries({ queryKey: ['consultas-pipeline', wid] });
      queryClient.invalidateQueries({ queryKey: ['consultas-list', wid] });
      toast.success("Actualizado");
    }
  });

  const today = moment();

  const baseFilter = (c) => {
    if (isLogistica && c.pipeline_stage !== "GANADA" && c.pipeline_stage !== "EJECUTADA") return false;
    if (filtroAsesor !== "todos" && c.asesor !== filtroAsesor) return false;
    return true;
  };

  const hoy = consultas.filter(c => {
    if (!baseFilter(c)) return false;
    const fecha = c.proximoseguimiento;
    if (!fecha) return false;
    if (c.pipeline_stage === "PERDIDA") return false;
    return moment(fecha).isSame(today, 'day');
  });

  const vencidos = consultas.filter(c => {
    if (!baseFilter(c)) return false;
    const fecha = c.proximoseguimiento;
    if (!fecha) return false;
    if (c.pipeline_stage === "PERDIDA") return false;
    return moment(fecha).isBefore(today, 'day');
  });

  const proximos3d = consultas.filter(c => {
    if (!baseFilter(c)) return false;
    const fecha = c.proximoseguimiento;
    if (!fecha) return false;
    if (c.pipeline_stage === "PERDIDA") return false;
    return (
      moment(fecha).isAfter(today, 'day') &&
      moment(fecha).isBefore(today.clone().add(3, 'days'), 'day')
    );
  });

  const handleWhatsApp = (consulta) => {
    setSelectedConsulta(consulta);
    setShowWhatsApp(true);
  };

  const handleMarcarCompletado = async (consulta) => {
    const days = currentUser?.consulta_follow_up_days ?? 3;
    const nuevaFecha = getNextFollowUpDate(days);
    await updateMutation.mutateAsync({
      id: consulta.id,
      data: { proximoseguimiento: nuevaFecha }
    });
  };

  const handleStageChange = async (consulta, newStage) => {
    if (!newStage || newStage === consulta.pipeline_stage) return;
    const patch = { pipeline_stage: newStage };
    const destStage = etapas.find(s => s.pipeline_stage === newStage);
    if (destStage && destStage.orden !== 0 && !consulta.nroppto) {
      patch.nroppto = await getNextNroPpto();
    }
    await updateMutation.mutateAsync({ id: consulta.id, data: patch });
  };

  const ConsultaItem = ({ consulta, tipo }) => {
    const fechaMostrar = consulta.proximoseguimiento;
    const asesorColor = ASESOR_COLORS[consulta.asesor] || "bg-slate-400";
    const stageColor = etapaColorMap[consulta.pipeline_stage] || "bg-slate-500";
    return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{consulta.contactonombre}</h3>
              <div className="min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={consulta.pipeline_stage}
                  onValueChange={(v) => handleStageChange(consulta, v)}
                >
                  <SelectTrigger
                    className={cn("h-8 text-xs text-white border-0", stageColor)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {etapas.map((s) => (
                      <SelectItem key={s.pipeline_stage} value={s.pipeline_stage}>
                        {s.pipeline_stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {consulta.asesor && (
                <div className="flex items-center gap-1">
                  <div
                    className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold", asesorColor)}
                    title={consulta.asesor}
                  >
                    {consulta.asesor[0]}
                  </div>
                  <span className="text-xs font-medium text-slate-600">{consulta.asesor}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-1">{consulta.productoConsultado}</p>
            {consulta.variante && (
              <p className="text-xs text-slate-400">{consulta.variante}</p>
            )}
            {consulta.precioCotizado && (
              <p className="text-sm font-medium text-slate-900 mt-2">
                {consulta.moneda === "USD" ? "US$" : "$"} {consulta.precioCotizado.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className={`text-xs ${
                tipo === "vencido" ? "text-red-600 font-medium" : "text-slate-500"
              }`}>
                {moment(fechaMostrar).format("DD/MM/YYYY")}
                {tipo === "vencido" && " (vencido)"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Button
              size="sm"
              onClick={() => handleWhatsApp(consulta)}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarcarCompletado(consulta)}
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              {isLogistica ? "Seguimientos — Logística (ganados)" : "Seguimientos del Día"}
            </h1>
            <p className="text-slate-500 mt-1">
              {today.format("dddd, DD [de] MMMM [de] YYYY")}
            </p>
          </div>
          <div className="w-full sm:w-48">
            <Select value={filtroAsesor} onValueChange={setFiltroAsesor}>
              <SelectTrigger>
                <SelectValue placeholder="Asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los asesores</SelectItem>
                {ASESORES.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{hoy.length}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{vencidos.length}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Próximos 3 días</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{proximos3d.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={vencidos.length > 0 ? "vencidos" : "hoy"}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vencidos" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Vencidos ({vencidos.length})
            </TabsTrigger>
            <TabsTrigger value="hoy" className="gap-2">
              <Calendar className="w-4 h-4" />
              Hoy ({hoy.length})
            </TabsTrigger>
            <TabsTrigger value="proximos" className="gap-2">
              Próximos ({proximos3d.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vencidos" className="space-y-3 mt-4">
            {vencidos.length > 0 ? (
              vencidos.map(c => <ConsultaItem key={c.id} consulta={c} tipo="vencido" />)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-slate-500">¡Excelente! No hay seguimientos vencidos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hoy" className="space-y-3 mt-4">
            {hoy.length > 0 ? (
              hoy.map(c => <ConsultaItem key={c.id} consulta={c} tipo="hoy" />)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay seguimientos programados para hoy</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="proximos" className="space-y-3 mt-4">
            {proximos3d.length > 0 ? (
              proximos3d.map(c => <ConsultaItem key={c.id} consulta={c} tipo="proximo" />)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay seguimientos en los próximos 3 días</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <WhatsAppSender
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        consulta={selectedConsulta}
        onMessageSent={refetch}
      />
    </div>
  );
}
