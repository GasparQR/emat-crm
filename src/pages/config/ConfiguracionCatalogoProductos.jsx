import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import {
  UNIDADES_MEDIDA,
  UNIDAD_OTRA,
  filterCatalogoProductos,
  formatCatalogoPrecio,
  normalizeCatalogoRow,
  resolveUnidadMedidaSelectValue,
} from "@/lib/catalogoProducto";

const EMPTY_FORM = {
  id: "",
  nombre: "",
  descripcion: "",
  precio_unitario: "",
  unidadSelect: "un",
  unidadCustom: "",
  activo: true,
};

function formToPayload(form) {
  const unidad =
    form.unidadSelect === UNIDAD_OTRA
      ? String(form.unidadCustom || "").trim()
      : form.unidadSelect;

  return {
    nombre: String(form.nombre || "").trim(),
    descripcion: String(form.descripcion || "").trim() || null,
    precio_unitario: parseFloat(form.precio_unitario) || 0,
    unidad_medida: unidad || "un",
    activo: form.activo !== false,
  };
}

function rowToForm(row) {
  const item = normalizeCatalogoRow(row);
  const unidadSelect = resolveUnidadMedidaSelectValue(item.unidad_medida);
  return {
    id: item.id,
    nombre: item.nombre,
    descripcion: item.descripcion,
    precio_unitario: String(item.precio_unitario ?? ""),
    unidadSelect,
    unidadCustom: unidadSelect === UNIDAD_OTRA ? item.unidad_medida : "",
    activo: item.activo,
  };
}

export default function ConfiguracionCatalogoProductos() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";

  const [search, setSearch] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState("todos");
  const [soloActivos, setSoloActivos] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["catalogo-productos", workspaceId],
    queryFn: () =>
      entities.CatalogoProducto.filter({ workspace_id: workspaceId }, "nombre", 500),
  });

  const unidadesDisponibles = useMemo(() => {
    const set = new Set(UNIDADES_MEDIDA);
    productos.forEach((p) => {
      const u = normalizeCatalogoRow(p).unidad_medida;
      if (u) set.add(u);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const filtrados = useMemo(
    () =>
      filterCatalogoProductos(productos, {
        search,
        unidad: filtroUnidad,
        soloActivos,
      }),
    [productos, search, filtroUnidad, soloActivos],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["catalogo-productos", workspaceId] });

  const openCreate = () => {
    setEditing(false);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(true);
    setForm(rowToForm(row));
    setOpen(true);
  };

  const openDelete = (row) => {
    setDeleteTarget(normalizeCatalogoRow(row));
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    const payload = formToPayload(form);
    if (!payload.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!payload.unidad_medida) {
      toast.error("La unidad de medida es obligatoria");
      return;
    }
    if (payload.precio_unitario < 0 || Number.isNaN(payload.precio_unitario)) {
      toast.error("Ingresá un precio unitario válido");
      return;
    }

    setSaving(true);
    try {
      if (editing && form.id) {
        await entities.CatalogoProducto.update(form.id, payload);
        toast.success("Producto actualizado");
      } else {
        await entities.CatalogoProducto.create({ ...payload, workspace_id: workspaceId });
        toast.success("Producto creado");
      }
      setOpen(false);
      refresh();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await entities.CatalogoProducto.delete(deleteTarget.id);
      toast.success("Producto eliminado");
      setDeleteOpen(false);
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "No se pudo eliminar el producto");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (row) => {
    const item = normalizeCatalogoRow(row);
    try {
      await entities.CatalogoProducto.update(item.id, { activo: !item.activo });
      toast.success(item.activo ? "Producto desactivado" : "Producto activado");
      refresh();
    } catch (error) {
      toast.error(error?.message || "No se pudo actualizar el estado");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to={createPageUrl("Ajustes")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver a Ajustes
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Catálogo de productos</h1>
            <p className="text-slate-500">
              Productos y servicios frecuentes para importar al armar presupuestos
            </p>
          </div>
          <Button className="gap-2 shrink-0" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo producto
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Productos del catálogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filtroUnidad} onValueChange={setFiltroUnidad}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las unidades</SelectItem>
                  {unidadesDisponibles.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-1">
                <Switch checked={soloActivos} onCheckedChange={setSoloActivos} id="solo-activos" />
                <Label htmlFor="solo-activos" className="text-sm whitespace-nowrap">Solo activos</Label>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Precio unit.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6}>Cargando...</TableCell></TableRow>
                ) : filtrados.length === 0 ? (
                  <TableRow><TableCell colSpan={6}>No hay productos en el catálogo</TableCell></TableRow>
                ) : (
                  filtrados.map((row) => {
                    const item = normalizeCatalogoRow(row);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell className="max-w-xs truncate text-slate-600">
                          {item.descripcion || "—"}
                        </TableCell>
                        <TableCell>{item.unidad_medida}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCatalogoPrecio(item.precio_unitario)}
                        </TableCell>
                        <TableCell>{item.activo ? "Activo" : "Inactivo"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleActive(row)}>
                            {item.activo ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openDelete(row)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-nombre">Nombre *</Label>
              <Input
                id="cat-nombre"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Aplicación soplado celulosa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Descripción</Label>
              <Textarea
                id="cat-desc"
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Detalle opcional del servicio o producto"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cat-precio">Precio unitario *</Label>
                <Input
                  id="cat-precio"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio_unitario}
                  onChange={(e) => setForm((p) => ({ ...p, precio_unitario: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad de medida *</Label>
                <Select
                  value={form.unidadSelect}
                  onValueChange={(v) => setForm((p) => ({ ...p, unidadSelect: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MEDIDA.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                    <SelectItem value={UNIDAD_OTRA}>Otra...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.unidadSelect === UNIDAD_OTRA && (
              <div className="space-y-2">
                <Label htmlFor="cat-unidad-custom">Unidad personalizada *</Label>
                <Input
                  id="cat-unidad-custom"
                  value={form.unidadCustom}
                  onChange={(e) => setForm((p) => ({ ...p, unidadCustom: e.target.value }))}
                  placeholder="Ej: rollo, viaje"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.activo}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, activo: checked }))}
                id="cat-activo"
              />
              <Label htmlFor="cat-activo">Producto activo (visible al importar)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deleteTarget?.nombre}&quot; del catálogo. Los presupuestos ya
              guardados no se modifican.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
