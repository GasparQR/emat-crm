import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Variables() {
  const [showForm, setShowForm] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [formData, setFormData] = useState({
    clave: "",
    valor: "",
    descripcion: ""
  });

  const queryClient = useQueryClient();

  const { data: variables = [] } = useQuery({
    queryKey: ['variables'],
    queryFn: () => base44.entities.VariablePlantilla.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VariablePlantilla.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variables'] });
      toast.success("Variable creada");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VariablePlantilla.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variables'] });
      toast.success("Variable actualizada");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VariablePlantilla.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variables'] });
      toast.success("Variable eliminada");
    }
  });

  const resetForm = () => {
    setFormData({ clave: "", valor: "", descripcion: "" });
    setSelectedVariable(null);
    setShowForm(false);
  };

  const handleEdit = (variable) => {
    setSelectedVariable(variable);
    setFormData({
      clave: variable.clave,
      valor: variable.valor,
      descripcion: variable.descripcion || ""
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.clave || !formData.valor) {
      toast.error("Clave y valor son requeridos");
      return;
    }

    if (selectedVariable) {
      updateMutation.mutate({ id: selectedVariable.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              Variables de Plantillas
            </h1>
            <p className="text-slate-500">Define los valores predeterminados para tus plantillas de WhatsApp</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva variable
          </Button>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Variables configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            {variables.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">No hay variables configuradas</p>
                <Button onClick={() => setShowForm(true)}>Crear primera variable</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clave</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variables.map((variable) => (
                    <TableRow key={variable.id}>
                      <TableCell className="font-mono font-semibold">
                        {"{" + variable.clave + "}"}
                      </TableCell>
                      <TableCell>{variable.valor}</TableCell>
                      <TableCell className="text-slate-500">{variable.descripcion}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(variable)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (window.confirm("¿Eliminar esta variable?")) {
                                deleteMutation.mutate(variable.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedVariable ? "Editar variable" : "Nueva variable"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clave de la variable *</Label>
              <Input
                value={formData.clave}
                onChange={(e) => setFormData({ ...formData, clave: e.target.value.toUpperCase() })}
                placeholder="GARANTIA"
                className="font-mono"
              />
              <p className="text-xs text-slate-400">
                Se usará como {"{" + (formData.clave || "CLAVE") + "}"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="6 meses"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Garantía incluida"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              {selectedVariable ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}