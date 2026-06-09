import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, GripVertical, Layers,
} from "lucide-react";
import { entities } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import usePipelineRealtime from "@/hooks/usePipelineRealtime";
import { slugifyStageCodigo, WON_UMBRELLA_CODE } from "@/lib/pipelineStage";
import {
  deletePipelineStageWithReassign,
  previewPipelineStageConsultas,
  renamePipelineStage,
  reorderPipelineStages,
  stageBlockedByConsultasMessage,
} from "@/lib/pipelineStageApi";

const COLOR_OPTIONS = [
  { value: "bg-cyan-500", label: "Cian" },
  { value: "bg-slate-400", label: "Gris" },
  { value: "bg-amber-500", label: "Ámbar" },
  { value: "bg-emerald-500", label: "Verde" },
  { value: "bg-green-600", label: "Verde oscuro" },
  { value: "bg-gray-500", label: "Gris medio" },
  { value: "bg-red-500", label: "Rojo" },
  { value: "bg-blue-500", label: "Azul" },
  { value: "bg-purple-500", label: "Violeta" },
  { value: "bg-orange-500", label: "Naranja" },
];

const EMPTY_FORM = {
  id: "",
  pipeline_stage: "",
  color: "bg-slate-400",
  activa: true,
  codigo: "",
  es_sistema: false,
  agrupa_en_reporte_codigo: null,
};

function rowToForm(row) {
  return {
    id: row.id,
    pipeline_stage: row.pipeline_stage || "",
    color: row.color || "bg-slate-400",
    activa: row.activa !== false,
    codigo: row.codigo || "",
    es_sistema: Boolean(row.es_sistema),
    agrupa_en_reporte_codigo: row.agrupa_en_reporte_codigo || null,
  };
}

function isStageBlockedError(message, stageName) {
  const msg = String(message || "");
  return msg.includes("Hay consultas en la etapa") || msg.includes(stageName);
}

export default function ConfiguracionPipelineEtapas() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";

  usePipelineRealtime(workspaceId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editConsultaCount, setEditConsultaCount] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data: etapas = [], isLoading } = useQuery({
    queryKey: ["pipeline-stages", workspaceId],
    queryFn: async () => {
      const stages = await entities.PipelineStage.filter({ workspace_id: workspaceId }, "orden", 100);
      return stages.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["pipeline-stages", workspaceId] });

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditing(false);
    setEditConsultaCount(null);
    setOpen(true);
  };

  const openEdit = async (row) => {
    setForm(rowToForm(row));
    setEditing(true);
    setEditConsultaCount(null);
    setOpen(true);
    try {
      const preview = await previewPipelineStageConsultas(workspaceId, row.id);
      setEditConsultaCount(preview?.consulta_count ?? 0);
    } catch {
      setEditConsultaCount(null);
    }
  };

  const blockIfConsultas = (stageName, count) => {
    if ((count ?? 0) > 0) {
      toast.error(stageBlockedByConsultasMessage(stageName, count));
      return true;
    }
    return false;
  };

  const handleSave = async () => {
    const name = String(form.pipeline_stage || "").trim();
    if (!name) {
      toast.error("Ingresá un nombre para la etapa");
      return;
    }

    setSaving(true);
    try {
      if (editing && form.id) {
        const existing = etapas.find((s) => s.id === form.id);
        const deactivating = existing?.activa !== false && form.activa === false;

        if (deactivating) {
          const preview = await previewPipelineStageConsultas(workspaceId, form.id);
          const count = preview?.consulta_count ?? editConsultaCount ?? 0;
          const stageLabel = preview?.pipeline_stage || existing?.pipeline_stage || name;
          if (blockIfConsultas(stageLabel, count)) {
            setForm((f) => ({ ...f, activa: true }));
            return;
          }
        }

        if (existing && existing.pipeline_stage !== name) {
          await renamePipelineStage(workspaceId, form.id, name);
        }
        await entities.PipelineStage.update(form.id, {
          color: form.color,
          activa: form.activa,
        });
        toast.success("Etapa actualizada");
      } else {
        const codigo = slugifyStageCodigo(name);
        const maxOrden = etapas.reduce((m, s) => Math.max(m, s.orden ?? 0), -1);
        await entities.PipelineStage.create({
          id: `pipelinestage_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
          workspace_id: workspaceId,
          codigo,
          pipeline_stage: name,
          orden: maxOrden + 1,
          color: form.color,
          activa: form.activa !== false,
          es_sistema: false,
        });
        toast.success("Etapa creada");
      }
      setOpen(false);
      refresh();
    } catch (e) {
      const stageName = form.pipeline_stage || etapas.find((s) => s.id === form.id)?.pipeline_stage;
      if (isStageBlockedError(e?.message, stageName)) {
        toast.error(stageBlockedByConsultasMessage(stageName, editConsultaCount || 1));
        setForm((f) => ({ ...f, activa: true }));
      } else {
        toast.error(e?.message || "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = [...etapas];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const orderedIds = items.map((s) => s.id);

    try {
      await reorderPipelineStages(workspaceId, orderedIds);
      refresh();
      toast.success("Orden actualizado");
    } catch (e) {
      toast.error(e?.message || "Error al reordenar");
    }
  };

  const openDelete = async (row) => {
    try {
      const preview = await previewPipelineStageConsultas(workspaceId, row.id);
      const count = preview?.consulta_count ?? 0;
      const stageName = preview?.pipeline_stage || row.pipeline_stage;
      if (blockIfConsultas(stageName, count)) return;

      setDeleteTarget(row);
      setDeleteOpen(true);
    } catch (e) {
      toast.error(e?.message || "No se pudo validar la eliminación");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deletePipelineStageWithReassign(workspaceId, deleteTarget.id);
      toast.success("Etapa eliminada");
      setDeleteOpen(false);
      refresh();
    } catch (e) {
      const stageName = deleteTarget.pipeline_stage;
      if (isStageBlockedError(e?.message, stageName)) {
        toast.error(stageBlockedByConsultasMessage(stageName, 1));
      } else {
        toast.error(e?.message || "Error al eliminar");
      }
    } finally {
      setDeleting(false);
    }
  };

  const canDeactivate = editConsultaCount === null || editConsultaCount === 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl("Ajustes")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Ajustes
            </Button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-7 h-7 text-blue-600" />
                Etapas del pipeline
              </h1>
              <p className="text-slate-500 mt-1">
                Configurá nombres, colores y orden de las columnas del Kanban
              </p>
            </div>
            <Button onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Nueva etapa
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Columnas del pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-500">Cargando etapas…</p>
            ) : etapas.length === 0 ? (
              <p className="text-sm text-slate-500">No hay etapas configuradas.</p>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="pipeline-stages">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {etapas.map((etapa, index) => (
                        <Draggable key={etapa.id} draggableId={etapa.id} index={index}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`flex items-center gap-3 p-3 rounded-lg border bg-white ${
                                snapshot.isDragging ? "shadow-lg border-blue-300" : "border-slate-200"
                              } ${etapa.activa === false ? "opacity-60" : ""}`}
                            >
                              <div
                                {...dragProvided.dragHandleProps}
                                className="text-slate-400 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className={`w-3 h-8 rounded-full shrink-0 ${etapa.color || "bg-slate-400"}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-900">{etapa.pipeline_stage}</span>
                                  {etapa.es_sistema && (
                                    <Badge variant="secondary" className="text-[10px]">Sistema</Badge>
                                  )}
                                  {etapa.activa === false && (
                                    <Badge variant="outline" className="text-[10px]">Inactiva</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Código: {etapa.codigo || "—"}
                                  {etapa.agrupa_en_reporte_codigo && (
                                    <> · Reportes: agrupa en {etapa.agrupa_en_reporte_codigo}</>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(etapa)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                {!etapa.es_sistema && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => openDelete(etapa)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-slate-500">
          No se puede desactivar ni eliminar una etapa con consultas. Movelas desde Consultas o Pipeline primero.
          Las etapas de sistema no se pueden eliminar. Los cambios se sincronizan en tiempo real con el Kanban.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar etapa" : "Nueva etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre visible</Label>
              <Input
                value={form.pipeline_stage}
                onChange={(e) => setForm((f) => ({ ...f, pipeline_stage: e.target.value }))}
                placeholder="Ej: En negociación"
              />
            </div>
            <div className="space-y-2">
              <Label>Color de columna</Label>
              <Select value={form.color} onValueChange={(v) => setForm((f) => ({ ...f, color: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${c.value}`} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Activa en Kanban</Label>
                {editing && editConsultaCount > 0 && (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {editConsultaCount} consulta{editConsultaCount !== 1 ? "s" : ""} en esta etapa
                  </p>
                )}
              </div>
              <Switch
                checked={form.activa !== false}
                disabled={editing && !canDeactivate}
                onCheckedChange={(v) => {
                  if (!v && editing && editConsultaCount > 0) {
                    toast.error(stageBlockedByConsultasMessage(form.pipeline_stage, editConsultaCount));
                    return;
                  }
                  setForm((f) => ({ ...f, activa: v }));
                }}
              />
            </div>
            {editing && form.es_sistema && (
              <div className="space-y-2">
                <Label className="text-slate-500">Código interno (solo lectura)</Label>
                <Input value={form.codigo} disabled className="bg-slate-50" />
              </div>
            )}
            {editing && form.agrupa_en_reporte_codigo === WON_UMBRELLA_CODE && (
              <div className="space-y-2">
                <Label className="text-slate-500">Agrupación en reportes (solo lectura)</Label>
                <Input value={`Agrupa bajo ${WON_UMBRELLA_CODE}`} disabled className="bg-slate-50" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar etapa?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Vas a eliminar <strong>{deleteTarget?.pipeline_stage}</strong>.
                  No hay consultas en esta etapa.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
