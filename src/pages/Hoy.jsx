import { useState, useMemo } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";
import WhatsAppSender from "@/components/crm/WhatsAppSender";
import HoyConsultaItem from "@/components/crm/HoyConsultaItem";
import { toast } from "sonner";
import { useAuth } from "@/lib/SimpleAuthContext";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { getNextFollowUpDate } from "@/components/utils/dateUtils";
import { buildPipelineStagePatchAsync } from "@/lib/pipelineStage";
import { filterConsultasByVisibility, isLogistica as roleIsLogistica, canEditConsultaStage } from "@/lib/permissions";
import { isWonStage } from "@/lib/pipelineStage";
import { buildAsesorFilterOptions, useAsesores } from "@/components/hooks/useAsesores";
import MultiSelectFilter from "@/components/crm/filters/MultiSelectFilter";
import useWorkspaceViewConfig from "@/hooks/useWorkspaceViewConfig";
import useViewSessionFilters from "@/hooks/useViewSessionFilters";
import { isFilterEnabled, matchesMultiFilter } from "@/lib/viewLayout";

import { allocateConsultaNroPpto } from "@/lib/consultaNroppto";

/** @typedef {{ id: string, data: Record<string, unknown> }} ConsultaUpdatePayload */

export default function Hoy() {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";
  const { viewConfig } = useWorkspaceViewConfig(workspaceId);
  const { getFilter, setFilter } = useViewSessionFilters("hoy", workspaceId, ["asesor"]);
  const { user } = useAuth();
  const isLogistica = roleIsLogistica(user);
  const { asesorOptions, getAsesorNombre } = useAsesores(user);
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

  const allocateNroPpto = () => allocateConsultaNroPpto(workspaceId);

  const stageMutation = useMutation({
    mutationFn: (/** @type {ConsultaUpdatePayload} */ payload) =>
      entities.Consulta.update(payload.id, payload.data),
    onSuccess: () => {
      const wid = workspace?.id;
      queryClient.invalidateQueries({ queryKey: ['consultas-hoy', wid] });
      queryClient.invalidateQueries({ queryKey: ['consultas-pipeline', wid] });
      queryClient.invalidateQueries({ queryKey: ['consultas-list', wid] });
      toast.success("Etapa actualizada");
    },
    onError: (e) => {
      queryClient.invalidateQueries({ queryKey: ['consultas-hoy', workspace?.id] });
      toast.error(e?.message || "Error al actualizar etapa");
    },
  });

  const followUpMutation = useMutation({
    mutationFn: (/** @type {ConsultaUpdatePayload} */ payload) =>
      entities.Consulta.update(payload.id, payload.data),
    onSuccess: () => {
      const wid = workspace?.id;
      queryClient.invalidateQueries({ queryKey: ['consultas-hoy', wid] });
      queryClient.invalidateQueries({ queryKey: ['consultas-pipeline', wid] });
      queryClient.invalidateQueries({ queryKey: ['consultas-list', wid] });
      toast.success("Actualizado");
    },
    onError: (e) => toast.error(e?.message || "No se pudo actualizar el seguimiento"),
  });

  const today = moment();

  const baseFilter = (c) => {
    if (isLogistica && !isWonStage(c.pipeline_stage, etapas)) return false;
    if (!matchesMultiFilter(getFilter("asesor"), c.asesor)) return false;
    return true;
  };

  const visibleConsultas = useMemo(
    () => filterConsultasByVisibility(consultas, user, etapas),
    [consultas, user, etapas],
  );
  const filterAsesorOptions = useMemo(
    () => buildAsesorFilterOptions(asesorOptions, visibleConsultas),
    [asesorOptions, visibleConsultas]
  );

  const hoy = visibleConsultas.filter(c => {
    if (!baseFilter(c)) return false;
    const fecha = c.proximoseguimiento;
    if (!fecha) return false;
    if (c.pipeline_stage === "PERDIDA") return false;
    return moment(fecha).isSame(today, 'day');
  });

  const vencidos = visibleConsultas.filter(c => {
    if (!baseFilter(c)) return false;
    const fecha = c.proximoseguimiento;
    if (!fecha) return false;
    if (c.pipeline_stage === "PERDIDA") return false;
    return moment(fecha).isBefore(today, 'day');
  });

  const proximos3d = visibleConsultas.filter(c => {
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

  const handleMarcarCompletado = (consulta) => {
    const days = currentUser?.consulta_follow_up_days ?? 3;
    const nuevaFecha = getNextFollowUpDate(days);
    followUpMutation.mutate({
      id: consulta.id,
      data: { proximoseguimiento: nuevaFecha },
    });
  };

  const handleStageChange = async (consulta, newStage) => {
    const patch = await buildPipelineStagePatchAsync(consulta, newStage, {
      etapas,
      allocateNroPpto,
    });
    if (!patch) return;
    stageMutation.mutate({ id: consulta.id, data: patch });
  };

  const consultaItemProps = {
    etapas,
    etapaColorMap,
    stagePending: stageMutation.isPending,
    getAsesorNombre,
    onStageChange: handleStageChange,
    onWhatsApp: handleWhatsApp,
    onMarcarCompletado: handleMarcarCompletado,
    canEditStage: (c) => canEditConsultaStage(user, c.asesor),
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
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
          {isFilterEnabled("hoy", viewConfig, "asesor") && (
            <div className="w-full sm:w-48">
              <MultiSelectFilter
                label="Asesor"
                options={filterAsesorOptions.map((a) => ({ value: a.value, label: a.label }))}
                selected={getFilter("asesor")}
                onChange={(v) => setFilter("asesor", v)}
                triggerClassName="w-full"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              vencidos.map((c) => (
                <HoyConsultaItem key={c.id} consulta={c} tipo="vencido" {...consultaItemProps} />
              ))
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
              hoy.map((c) => (
                <HoyConsultaItem key={c.id} consulta={c} tipo="hoy" {...consultaItemProps} />
              ))
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
              proximos3d.map((c) => (
                <HoyConsultaItem key={c.id} consulta={c} tipo="proximo" {...consultaItemProps} />
              ))
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
