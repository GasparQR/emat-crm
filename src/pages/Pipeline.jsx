import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext } from "@hello-pangea/dnd";
import PipelineColumn from "@/components/crm/PipelineColumn";
import ConsultaForm from "@/components/crm/ConsultaForm";
import { ASESORES } from "@/components/crm/ConsultaForm";
import WhatsAppSender from "@/components/crm/WhatsAppSender";
import VentaForm from "@/components/ventas/VentaForm";
import { Button } from "@/components/ui/button";
import { Plus, Filter, ArrowLeft, Settings } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Pipeline() {
  const [showForm, setShowForm] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showVentaForm, setShowVentaForm] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [filtroCanal, setFiltroCanal] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [filtroAsesor, setFiltroAsesor] = useState("todos");

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const { data: consultas = [], refetch } = useQuery({
    queryKey: ['consultas-pipeline', workspace?.id],
    queryFn: () => workspace ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 500) : [],
    enabled: !!workspace
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await base44.entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Consulta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas-pipeline', workspace?.id] });
    }
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newEtapa = destination.droppableId;

    updateMutation.mutate({
      id: draggableId,
      data: { etapa: newEtapa }
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

  const handleConcretarVenta = (consulta) => {
    setSelectedConsulta(consulta);
    setShowVentaForm(true);
  };

  // Nuevo: marcar como perdido directamente desde la card del pipeline
  const handleMarcarPerdido = async (consulta, motivo) => {
    await updateMutation.mutateAsync({
      id: consulta.id,
      data: { etapa: "Perdido", motivoPerdida: motivo }
    });
    toast.success(`Marcado como Perdido — ${motivo}`);
  };

  const handleVentaCreada = async (ventaId) => {
    if (selectedConsulta) {
      await base44.entities.Consulta.update(selectedConsulta.id, {
        etapa: "Concretado",
        concretado: true
      });
      queryClient.invalidateQueries({ queryKey: ['consultas-pipeline'] });
      toast.success("Venta registrada y consulta marcada como Concretado");
    }
    if (ventaId) {
      await base44.entities.Venta.update(ventaId, { estado: "Finalizada" });
    }
    setShowVentaForm(false);
    setSelectedConsulta(null);
  };

  // Filtrar consultas
  const consultasFiltradas = consultas.filter(c => {
    if (filtroCanal !== "todos" && c.canalOrigen !== filtroCanal) return false;
    if (filtroPrioridad !== "todas" && c.prioridad !== filtroPrioridad) return false;
    if (filtroAsesor !== "todos" && c.asesor !== filtroAsesor) return false;
    return true;
  });

  // Agrupar por etapa
  const consultasPorEtapa = etapas.reduce((acc, etapa) => {
    acc[etapa.nombre] = consultasFiltradas.filter(c => c.etapa === etapa.nombre);
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
              <p className="text-slate-500">{consultasFiltradas.length} consultas activas</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={createPageUrl("ConfigurarPipeline")}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Configurar</span>
                </Button>
              </Link>
              <Button onClick={() => { setSelectedConsulta(null); setShowForm(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={filtroCanal} onValueChange={setFiltroCanal}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Meta">Meta</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Cliente Fidelidad">Cliente Fidelidad</SelectItem>
                <SelectItem value="Referido">Referido</SelectItem>
                <SelectItem value="REFERIDO">REFERIDO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroAsesor} onValueChange={setFiltroAsesor}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Asesor</SelectItem>
                {ASESORES.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        <DragDropContext key={`${filtroCanal}-${filtroPrioridad}-${filtroAsesor}`} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
            {etapas.map(etapa => (
              <PipelineColumn
                key={etapa.nombre}
                etapa={etapa.nombre}
                etapaColor={etapa.color}
                consultas={consultasPorEtapa[etapa.nombre]}
                onWhatsApp={handleWhatsApp}
                onEdit={handleEdit}
                onConcretarVenta={handleConcretarVenta}
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

      <VentaForm
        open={showVentaForm}
        onOpenChange={setShowVentaForm}
        consulta={selectedConsulta}
        onVentaCreada={handleVentaCreada}
      />
    </div>
  );
}
