import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { ArrowLeft, Copy, Archive, Save } from "lucide-react";
import { toast } from "sonner";

export default function EditorListaWhatsApp() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(window.location.search);
  const listaId = params.get("id");
  const isNew = params.get("new") === "true";

  const [form, setForm] = useState({
    nombre: "",
    categoria: "General",
    proveedor: "",
    estado: "Borrador",
    texto: "",
    tags: "",
    vigenteDesde: "",
    vigenteHasta: ""
  });

  const { data: lista } = useQuery({
    queryKey: ['lista', listaId],
    queryFn: () => listaId ? base44.entities.ListaWhatsApp.filter({ id: listaId }) : Promise.resolve(null),
    enabled: !!listaId
  });

  useEffect(() => {
    if (lista && lista.length > 0) {
      const l = lista[0];
      setForm({
        nombre: l.nombre || "",
        categoria: l.categoria || "General",
        proveedor: l.proveedor || "",
        estado: l.estado || "Borrador",
        texto: l.texto || "",
        tags: l.tags?.join(", ") || "",
        vigenteDesde: l.vigenteDesde || "",
        vigenteHasta: l.vigenteHasta || ""
      });
    }
  }, [lista]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (listaId) {
        await base44.entities.ListaWhatsApp.update(listaId, data);
      } else {
        await base44.entities.ListaWhatsApp.create(data);
      }
    },
    onSuccess: () => {
      toast.success(listaId ? "Lista actualizada" : "Lista creada");
      queryClient.invalidateQueries({ queryKey: ['listas-whatsapp', workspace?.id] });
      navigate(createPageUrl("ListasWhatsApp"));
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ListaWhatsApp.create({
        ...form,
        nombre: `${form.nombre} (Copia)`,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        estado: "Borrador"
      });
    },
    onSuccess: () => {
      toast.success("Lista duplicada");
      queryClient.invalidateQueries({ queryKey: ['listas-whatsapp', workspace?.id] });
      navigate(createPageUrl("ListasWhatsApp"));
    }
  });

  const handleSave = async () => {
    if (!form.nombre || !form.texto) {
      toast.error("Nombre y texto son obligatorios");
      return;
    }

    saveMutation.mutate({
      ...form,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : []
    });
  };

  const handleStateChange = async (newState) => {
    if (currentUser?.role !== "admin") {
      toast.error("Solo administradores pueden cambiar el estado");
      return;
    }

    saveMutation.mutate({
      ...form,
      estado: newState,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : []
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link to={createPageUrl("ListasWhatsApp")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            {isNew ? "Nueva Lista WhatsApp" : "Editar Lista WhatsApp"}
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la lista</Label>
                  <Input
                    placeholder="ej: Apple Watch Nuevos 12/01"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iPhone">iPhone</SelectItem>
                        <SelectItem value="Mac">Mac</SelectItem>
                        <SelectItem value="iPad">iPad</SelectItem>
                        <SelectItem value="AirPods">AirPods</SelectItem>
                        <SelectItem value="Apple Watch">Apple Watch</SelectItem>
                        <SelectItem value="Accesorios">Accesorios</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Proveedor (opcional)</Label>
                    <Input
                      placeholder="Nombre del proveedor"
                      value={form.proveedor}
                      onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags (separados por coma)</Label>
                  <Input
                    placeholder="promoción, urgente, limitado"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vigente desde (opcional)</Label>
                    <Input
                      type="date"
                      value={form.vigenteDesde}
                      onChange={(e) => setForm({ ...form, vigenteDesde: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vigente hasta (opcional)</Label>
                    <Input
                      type="date"
                      value={form.vigenteHasta}
                      onChange={(e) => setForm({ ...form, vigenteHasta: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contenido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Texto de la lista (respeta saltos de línea y caracteres especiales)</Label>
                  <Textarea
                    placeholder="Pega aquí tu lista completa con emojis, saltos de línea, negritas con *, etc."
                    value={form.texto}
                    onChange={(e) => setForm({ ...form, texto: e.target.value })}
                    className="h-48 font-mono text-sm whitespace-pre-wrap"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1 gap-2 bg-slate-900 hover:bg-slate-800"
              >
                <Save className="w-4 h-4" />
                Guardar
              </Button>

              {listaId && (
                <Button
                  onClick={() => duplicateMutation.mutate()}
                  disabled={duplicateMutation.isPending}
                  variant="outline"
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicar
                </Button>
              )}

              {currentUser?.role === "admin" && listaId && (
                <Button
                  onClick={() => handleStateChange(form.estado === "Publicada" ? "Archivada" : "Publicada")}
                  variant="outline"
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {form.estado === "Publicada" ? "Archivar" : "Publicar"}
                </Button>
              )}
            </div>
          </div>

          {/* Preview */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Vista previa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 min-h-96">
                  <div className="text-xs text-slate-400 mb-3 pb-3 border-b">
                    Así se verá en WhatsApp:
                  </div>
                  <div className="text-sm text-slate-900 whitespace-pre-wrap break-words font-sans">
                    {form.texto || "El texto aparecerá aquí..."}
                  </div>
                </div>

                {listaId && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>Estado:</strong> {form.estado}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}