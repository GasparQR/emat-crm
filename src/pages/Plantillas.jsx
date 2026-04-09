import { useState } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, Copy, MessageCircle, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIAS = ["Soplado", "Proyectado", "Pegado", "Bolsa", "Civil", "Imper", "General"];
const ETAPAS = ["A COTIZAR", "NEGOCIACION", "GANADA", "EJECUTADA", "PAUSADA", "PERDIDA", "General"];

const VARIABLES = [
  { key: "{NOMBRE}", desc: "Nombre del cliente" },
  { key: "{PRODUCTO}", desc: "Producto consultado" },
  { key: "{VARIANTE}", desc: "Variante (color, capacidad)" },
  { key: "{PRECIO}", desc: "Precio cotizado" },
  { key: "{MONEDA}", desc: "Moneda (US$ o $)" },
  { key: "{GARANTIA}", desc: "Garantía incluida" },
  { key: "{ENTREGA}", desc: "Tiempo de entrega" },
  { key: "{PAGO}", desc: "Medios de pago" }
];

const DATOS_PRUEBA = {
  "{NOMBRE}": "Juan",
  "{PRODUCTO}": "Celulosa soplada",
  "{VARIANTE}": "Techo inclinado 120mm",
  "{PRECIO}": "850.000",
  "{MONEDA}": "$",
  "{GARANTIA}": "Incluida",
  "{ENTREGA}": "A coordinar",
  "{PAGO}": "Transferencia o efectivo"
};

export default function Plantillas() {
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [formData, setFormData] = useState({
    nombrePlantilla: "",
    categoriaProducto: "General",
    etapa: "General",
    contenido: "",
    activa: true
  });

  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();

  const { data: plantillas = [], refetch } = useQuery({
    queryKey: ['plantillas', workspace?.id, currentUser?.email],
    queryFn: () => workspace && currentUser ? entities.PlantillaWhatsApp.filter({ workspace_id: workspace.id, created_by: currentUser.email }, "-created_date") : [],
    enabled: !!workspace && !!currentUser
  });

  const { data: variablesDB = [] } = useQuery({
    queryKey: ['variables', workspace?.id],
    queryFn: () => workspace ? entities.VariablePlantilla.filter({ workspace_id: workspace.id }) : [],
    enabled: !!workspace
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.PlantillaWhatsApp.create({ ...data, workspace_id: workspace?.id }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['plantillas', workspace?.id, currentUser?.email] });
       toast.success("Plantilla creada");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.PlantillaWhatsApp.update(id, data),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['plantillas', workspace?.id, currentUser?.email] });
       toast.success("Plantilla actualizada");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.PlantillaWhatsApp.delete(id),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['plantillas', workspace?.id, currentUser?.email] });
       toast.success("Plantilla eliminada");
    }
  });

  const resetForm = () => {
    setFormData({
      nombrePlantilla: "",
      categoriaProducto: "General",
      etapa: "General",
      contenido: "",
      activa: true
    });
    setSelectedPlantilla(null);
    setShowForm(false);
  };

  const handleEdit = (plantilla) => {
    setSelectedPlantilla(plantilla);
    setFormData({
      nombrePlantilla: plantilla.nombrePlantilla,
      categoriaProducto: plantilla.categoriaProducto || "General",
      etapa: plantilla.etapa || "General",
      contenido: plantilla.contenido,
      activa: plantilla.activa !== false
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.nombrePlantilla || !formData.contenido) {
      toast.error("Nombre y contenido son requeridos");
      return;
    }

    if (selectedPlantilla) {
      updateMutation.mutate({ id: selectedPlantilla.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePreview = (plantilla) => {
    setSelectedPlantilla(plantilla);
    setShowPreview(true);
  };

  const reemplazarVariables = (texto) => {
    let result = texto;
    
    // Primero usar variables de la BD
    variablesDB.forEach(variable => {
      const key = `{${variable.clave}}`;
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), variable.valor);
    });
    
    // Luego usar los datos de prueba por defecto para las que falten
    Object.entries(DATOS_PRUEBA).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return result;
  };

  const insertarVariable = (variable) => {
    setFormData({
      ...formData,
      contenido: formData.contenido + variable
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Plantillas WhatsApp</h1>
            <p className="text-slate-500">Gestiona tus mensajes predefinidos</p>
            <Link to={createPageUrl("Variables")}>
              <Button variant="link" className="gap-2 p-0 h-auto mt-1">
                <Sparkles className="w-4 h-4" />
                Configurar variables
              </Button>
            </Link>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva plantilla
          </Button>
        </div>

        {/* Grid de plantillas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map(plantilla => (
            <Card key={plantilla.id} className={cn(
              "hover:shadow-md transition-all",
              !plantilla.activa && "opacity-60"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold">
                    {plantilla.nombrePlantilla}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handlePreview(plantilla)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(plantilla)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => deleteMutation.mutate(plantilla.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  </div>
                </div>
                <div className="flex gap-2">
                  {plantilla.categoriaProducto && (
                    <Badge variant="secondary">{plantilla.categoriaProducto}</Badge>
                  )}
                  {plantilla.etapa && (
                    <Badge variant="outline">{plantilla.etapa}</Badge>
                  )}
                  {!plantilla.activa && (
                    <Badge variant="destructive">Inactiva</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 line-clamp-3">
                  {plantilla.contenido}
                </p>
              </CardContent>
            </Card>
          ))}

          {plantillas.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">No hay plantillas creadas</p>
                <Button onClick={() => setShowForm(true)}>Crear primera plantilla</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlantilla ? "Editar plantilla" : "Nueva plantilla"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nombre de la plantilla *</Label>
                <Input
                  value={formData.nombrePlantilla}
                  onChange={(e) => setFormData({ ...formData, nombrePlantilla: e.target.value })}
                  placeholder="Ej: Seguimiento presupuesto celulosa"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría de producto</Label>
                <Select 
                  value={formData.categoriaProducto} 
                  onValueChange={(val) => setFormData({ ...formData, categoriaProducto: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Etapa del pipeline</Label>
                <Select 
                  value={formData.etapa} 
                  onValueChange={(val) => setFormData({ ...formData, etapa: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ETAPAS.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variables disponibles */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Variables disponibles
              </Label>
              <div className="flex flex-wrap gap-2">
                {variablesDB.map(v => (
                  <Button
                    key={v.id}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => insertarVariable(`{${v.clave}}`)}
                    title={v.descripcion}
                  >
                    {`{${v.clave}}`}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Click para insertar en el mensaje
              </p>
            </div>

            <div className="space-y-2">
              <Label>Contenido del mensaje *</Label>
              <Textarea
                value={formData.contenido}
                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                rows={6}
                placeholder="Hola {NOMBRE}! Te paso info del {PRODUCTO}..."
              />
            </div>

            {/* Preview */}
            {formData.contenido && (
              <div className="space-y-2">
                <Label>Vista previa (con datos de prueba)</Label>
                <div className="bg-[#e5ddd5] p-4 rounded-lg">
                  <div className="bg-[#dcf8c6] p-3 rounded-lg max-w-[80%] ml-auto shadow-sm">
                    <p className="text-sm whitespace-pre-wrap">
                      {reemplazarVariables(formData.contenido)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.activa}
                onCheckedChange={(checked) => setFormData({ ...formData, activa: checked })}
              />
              <Label>Plantilla activa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              {selectedPlantilla ? "Guardar cambios" : "Crear plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {selectedPlantilla && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="secondary">{selectedPlantilla.categoriaProducto}</Badge>
                <Badge variant="outline">{selectedPlantilla.etapa}</Badge>
              </div>
              <div className="bg-[#e5ddd5] p-4 rounded-lg">
                <div className="bg-[#dcf8c6] p-3 rounded-lg max-w-[90%] ml-auto shadow-sm">
                  <p className="text-sm whitespace-pre-wrap">
                    {reemplazarVariables(selectedPlantilla.contenido)}
                  </p>
                </div>
              </div>
              <Button 
                className="w-full gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(reemplazarVariables(selectedPlantilla.contenido));
                  toast.success("Copiado al portapapeles");
                }}
              >
                <Copy className="w-4 h-4" />
                Copiar mensaje de prueba
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}