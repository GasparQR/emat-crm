import { useMemo, useState } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext } from "@hello-pangea/dnd";
import PipelineColumn from "@/components/crm/PipelineColumn";
import ConsultaForm from "@/components/crm/ConsultaForm";
import WhatsAppSender from "@/components/crm/WhatsAppSender";
import { Button } from "@/components/ui/button";
import { Plus, Filter, ArrowLeft, Settings2 } from "lucide-react";
import usePipelineRealtime from "@/hooks/usePipelineRealtime";
import {
  buildPipelineStagePatchAsync,
  getLostStageName,
} from "@/lib/pipelineStage";
import { isAdmin, filterConsultasByVisibility, canEditConsultaStage } from "@/lib/permissions";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { toast } from "sonner";
import { useAuth } from "@/lib/SimpleAuthContext";
import { buildAsesorFilterOptions, useAsesores } from "@/components/hooks/useAsesores";
import { allocateConsultaNroPpto } from "@/lib/consultaNroppto";
import MultiSelectFilter from "@/components/crm/filters/MultiSelectFilter";
import ViewFilterBar from "@/components/crm/filters/ViewFilterBar";
import useWorkspaceViewConfig from "@/hooks/useWorkspaceViewConfig";
import useViewSessionFilters from "@/hooks/useViewSessionFilters";
import { isFilterEnabled, matchesMultiFilter } from "@/lib/viewLayout";

export default function Pipeline() {
  const [showForm, setShowForm] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";
  const { viewConfig } = useWorkspaceViewConfig(workspaceId);
  const { getFilter, setFilter } = useViewSessionFilters("pipeline", workspaceId, [
    "canal", "asesor", "prioridad",
  ]);
  const { user } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const admin = isAdmin(currentUser);
  const { asesorOptions } = useAsesores(user);

  usePipelineRealtime(workspace?.id);

  const { data: consultas = [], refetch } = useQuery({
    queryKey: ['consultas-pipeline', workspace?.id],
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
    enabled: !!workspace
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Consulta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas-pipeline', workspace?.id] });
    },
    onError: (e) => {
      queryClient.invalidateQueries({ queryKey: ['consultas-pipeline', workspace?.id] });
      toast.error(e?.message || "Error al actualizar etapa");
    },
  });

  const workspaceIdForNro = workspace?.id || "local";
  const allocateNroPpto = () => allocateConsultaNroPpto(workspaceIdForNro);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newEtapa = destination.droppableId;
    const consulta = consultas.find((c) => c.id === draggableId);
    if (!consulta) return;

    if (!canEditConsultaStage(user, consulta.asesor)) {
      toast.error("No tenés permiso para mover este presupuesto.");
      return;
    }

    const patch = await buildPipelineStagePatchAsync(consulta, newEtapa, {
      etapas,
      getNextNroPpto: allocateNroPpto,
    });
    if (!patch) return;

    updateMutation.mutate({
      id: draggableId,
      data: patch,
    });

    toast.success(`Movido a ${newEtapa}`);
  };

  const handleWhatsApp = (consulta) => {
    setSelectedConsulta(consulta);
    setShowWhatsApp(true);
  };

  const handleEdit = (consulta) => {
    setSelectedConsulta(consulta);
    // Delay to let DropdownMenu fully close and release focus before Dialog opens
    setTimeout(() => setShowForm(true), 100);
  };

  // Nuevo: marcar como perdido directamente desde la card del pipeline
  const handleMarcarPerdido = async (consulta, motivo) => {
    const lostStage = getLostStageName(etapas);
    await updateMutation.mutateAsync({
      id: consulta.id,
      data: { pipeline_stage: lostStage, razonperdida: motivo },
    });
    toast.success(`Marcado como Perdido — ${motivo}`);
  };


  const visibleConsultas = filterConsultasByVisibility(consultas, user, etapas);
  const filterAsesorOptions = useMemo(
    () => buildAsesorFilterOptions(asesorOptions, visibleConsultas),
    [asesorOptions, visibleConsultas]
  );
  const canalOptions = useMemo(() => {
    const counts = {};
    visibleConsultas.forEach((c) => {
      const canal = c.canalOrigen ?? c.canalorigen;
      if (canal) counts[canal] = (counts[canal] || 0) + 1;
    });
    const defaults = ["Meta", "WhatsApp", "Cliente Fidelidad", "Referido", "Google"];
    defaults.forEach((d) => { if (!counts[d]) counts[d] = 0; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ value: label, label, count }));
  }, [visibleConsultas]);

  const prioridadOptions = useMemo(() => {
    const counts = {};
    visibleConsultas.forEach((c) => {
      if (c.prioridad) counts[c.prioridad] = (counts[c.prioridad] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ value: label, label, count }));
  }, [visibleConsultas]);

  // Filtrar consultas
  const consultasFiltradas = visibleConsultas.filter(c => {
    const canal = c.canalOrigen ?? c.canalorigen;
    if (!matchesMultiFilter(getFilter("canal"), canal)) return false;
    if (!matchesMultiFilter(getFilter("prioridad"), c.prioridad)) return false;
    if (!matchesMultiFilter(getFilter("asesor"), c.asesor)) return false;
    return true;
  });

  // Agrupar por etapa
  const consultasPorEtapa = etapas.reduce((acc, etapa) => {
    acc[etapa.pipeline_stage] = consultasFiltradas.filter(c => c.pipeline_stage === etapa.pipeline_stage);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="max-w-full mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Link to={createPageUrl("Home")}>
                <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
              <p className="text-slate-1000">{consultasFiltradas.length} consultas activas</p>
            </div>
            <div className="flex items-center gap-2">
              {admin && (
                <Link to="/configuracion/pipeline-etapas">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Etapas</span>
                  </Button>
                </Link>
              )}
              <Button onClick={() => { setSelectedConsulta(null); setShowForm(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva</span>
              </Button>
            </div>
          </div>
          <ViewFilterBar className="gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            {isFilterEnabled("pipeline", viewConfig, "canal") && (
              <MultiSelectFilter
                label="Canal"
                options={canalOptions}
                selected={getFilter("canal")}
                onChange={(v) => setFilter("canal", v)}
                triggerClassName="w-[130px]"
              />
            )}
            {isFilterEnabled("pipeline", viewConfig, "prioridad") && (
              <MultiSelectFilter
                label="Prioridad"
                options={prioridadOptions}
                selected={getFilter("prioridad")}
                onChange={(v) => setFilter("prioridad", v)}
                triggerClassName="w-[130px]"
              />
            )}
            {isFilterEnabled("pipeline", viewConfig, "asesor") && (
              <MultiSelectFilter
                label="Asesor"
                options={filterAsesorOptions.map((a) => ({ value: a.value, label: a.label }))}
                selected={getFilter("asesor")}
                onChange={(v) => setFilter("asesor", v)}
                triggerClassName="w-[130px]"
              />
            )}
          </ViewFilterBar>
        </div>
      </div>

      {/* Kanban */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <DragDropContext key={JSON.stringify(getFilter("canal")) + JSON.stringify(getFilter("prioridad")) + JSON.stringify(getFilter("asesor"))} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
            {etapas.map(etapa => (
              <PipelineColumn
                key={etapa.pipeline_stage}
                etapa={etapa.pipeline_stage}
                etapaColor={etapa.color}
                consultas={consultasPorEtapa[etapa.pipeline_stage]}
                onWhatsApp={handleWhatsApp}
                onEdit={handleEdit}
                onMarcarPerdido={handleMarcarPerdido}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      <ConsultaForm
        open={showForm}
        onOpenChange={setShowForm}
        consulta={selectedConsulta}
        onSave={() => {
          refetch();
          setSelectedConsulta(null);
        }}
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
