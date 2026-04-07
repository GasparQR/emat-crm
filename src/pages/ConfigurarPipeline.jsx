import { useState } from "react";
import { crm } from "@/api/crmClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/context/WorkspaceContext";

const COLORES_DISPONIBLES = [
  { nombre: "Azul", valor: "bg-blue-500" },
  { nombre: "Cyan", valor: "bg-cyan-500" },
  { nombre: "Ámbar", valor: "bg-amber-500" },
  { nombre: "Naranja", valor: "bg-orange-500" },
  { nombre: "Morado", valor: "bg-purple-500" },
  { nombre: "Esmeralda", valor: "bg-emerald-500" },
  { nombre: "Gris", valor: "bg-slate-400" },
  { nombre: "Rojo", valor: "bg-red-500" },
  { nombre: "Verde", valor: "bg-green-500" }
];

export default function ConfigurarPipeline() {
  const [showDialog, setShowDialog] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ nombre: "", color: "bg-blue-500" });

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const { data: etapas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await crm.entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace
  });

  const createMutation = useMutation({
    mutationFn: (data) => crm.entities.PipelineStage.create({ ...data, workspace_id: workspace?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', workspace?.id] });
      toast.success("Etapa creada");
      setShowDialog(false);
      setFormData({ nombre: "", color: "bg-blue-500" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => crm.entities.PipelineStage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', workspace?.id] });
      toast.success("Etapa actualizada");
      setShowDialog(false);
      setEditando(null);
      setFormData({ nombre: "", color: "bg-blue-500" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => crm.entities.PipelineStage.update(id, { activa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', workspace?.id] });
      toast.success("Etapa eliminada");
    }
  });

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (editando) {
      updateMutation.mutate({
        id: editando.id,
        data: { ...formData }
      });
    } else {
      const maxOrden = etapas.length > 0 ? Math.max(...etapas.map(e => e.orden)) : 0;
      createMutation.mutate({
        ...formData,
        orden: maxOrden + 1,
        activa: true
      });
    }
  };

  const handleEdit = (etapa) => {
    setEditando(etapa);
    setFormData({ nombre: etapa.nombre, color: etapa.color });
    setShowDialog(true);
  };

  const handleNueva = () => {
    setEditando(null);
    setFormData({ nombre: "", color: "bg-blue-500" });
    setShowDialog(true);
  };

  const handleReordenar = async (etapaId, direccion) => {
    const index = etapas.findIndex(e => e.id === etapaId);
    if (index === -1) return;
    
    if (direccion === "arriba" && index === 0) return;
    if (direccion === "abajo" && index === etapas.length - 1) return;

    const targetIndex = direccion === "arriba" ? index - 1 : index + 1;
    const etapaActual = etapas[index];
    const etapaTarget = etapas[targetIndex];

    await Promise.all([
      crm.entities.PipelineStage.update(etapaActual.id, { orden: etapaTarget.orden }),
      crm.entities.PipelineStage.update(etapaTarget.id, { orden: etapaActual.orden })
    ]);

    queryClient.invalidateQueries({ queryKey: ['pipeline-stages', workspace?.id] });
    toast.success("Orden actualizado");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl("Ajustes")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Ajustes
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Configurar Pipeline</h1>
          <p className="text-slate-500">Gestiona las etapas de tu pipeline de ventas</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Etapas del Pipeline</h2>
          <Button onClick={handleNueva} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Etapa
          </Button>
        </div>

        <div className="space-y-3">
          {etapas.map((etapa, index) => (
            <Card key={etapa.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleReordenar(etapa.id, "arriba")}
                      disabled={index === 0}
                    >
                      ▲
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleReordenar(etapa.id, "abajo")}
                      disabled={index === etapas.length - 1}
                    >
                      ▼
                    </Button>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${etapa.color}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{etapa.nombre}</p>
                    <p className="text-xs text-slate-500">Orden: {etapa.orden}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(etapa)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`¿Eliminar la etapa "${etapa.nombre}"?`)) {
                        deleteMutation.mutate(etapa.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {etapas.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">No hay etapas configuradas</p>
              <Button onClick={handleNueva} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Crear primera etapa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Etapa" : "Nueva Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Etapa *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Nuevo, Seguimiento, Negociación"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-3 gap-2">
                {COLORES_DISPONIBLES.map((c) => (
                  <button
                    key={c.valor}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.valor })}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                      formData.color === c.valor 
                        ? "border-slate-900 bg-slate-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${c.valor}`} />
                    <span className="text-sm">{c.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editando ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}