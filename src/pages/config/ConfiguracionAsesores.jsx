import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { entities, supabase, auth } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import {
  DUPLICATE_ASESOR_EMAIL_ERROR,
  isDuplicateAsesorEmail,
  isDuplicateUsuarioEmail,
  mapDuplicateEmailError,
  normalizeEmail,
} from "@/lib/emailValidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import {
  ASESOR_PALETTE_HEX,
  getAsesorHexColorFromHash,
  isValidAsesorPaletteHex,
} from "@/lib/asesorColors";
import { nombreToInitials } from "@/lib/asesorDisplay";

const EMPTY_FORM = {
  id: "",
  codigo: "",
  nombre: "",
  email: "",
  color_hex: "",
  active: true,
};

function resolveFormColorHex(form) {
  if (form.color_hex && isValidAsesorPaletteHex(form.color_hex)) {
    return form.color_hex;
  }
  return getAsesorHexColorFromHash(form.codigo);
}

export default function ConfiguracionAsesores() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [fromCodigo, setFromCodigo] = useState("");
  const [toCodigo, setToCodigo] = useState("");
  const [preview, setPreview] = useState(null);
  const [reassigning, setReassigning] = useState(false);

  const { data: asesores = [], isLoading } = useQuery({
    queryKey: ["asesores-admin", workspaceId],
    queryFn: () => entities.Asesor.filter({ workspace_id: workspaceId }, "nombre", 2000),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => auth.listUsuarios(),
  });

  const activeAsesores = useMemo(
    () => (asesores || []).filter((a) => a.active !== false && a.activo !== false),
    [asesores]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["asesores-admin", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["asesores", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["contactos", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["consultas-list", workspaceId] });
  };

  const openCreate = () => {
    setEditing(false);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (asesor) => {
    setEditing(true);
    setForm({
      id: asesor.id,
      codigo: asesor.codigo || "",
      nombre: asesor.nombre || "",
      email: asesor.email || "",
      color_hex: asesor.color_hex || getAsesorHexColorFromHash(asesor.codigo),
      active: asesor.active !== false && asesor.activo !== false,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error("Código y nombre son obligatorios");
      return;
    }

    const email = normalizeEmail(form.email);
    if (email) {
      if (isDuplicateAsesorEmail(email, asesores, { excludeId: editing ? form.id : null })) {
        toast.error(DUPLICATE_ASESOR_EMAIL_ERROR);
        return;
      }
      if (isDuplicateUsuarioEmail(email, usuarios)) {
        toast.error(DUPLICATE_ASESOR_EMAIL_ERROR);
        return;
      }
    }

    setSaving(true);
    try {
      const colorHex = resolveFormColorHex(form);
      const payload = {
        workspace_id: workspaceId,
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        email: email || null,
        color_hex: colorHex,
        active: form.active,
        activo: form.active,
      };
      if (editing && form.id) {
        await entities.Asesor.update(form.id, payload);
        toast.success("Asesor actualizado");
      } else {
        await entities.Asesor.create({
          id: `asesor_${workspaceId}_${payload.codigo.toLowerCase()}`,
          ...payload,
        });
        toast.success("Asesor creado");
      }
      setOpen(false);
      refresh();
    } catch (error) {
      const mapped = mapDuplicateEmailError(error?.message);
      toast.error(mapped || error?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (asesor) => {
    try {
      await entities.Asesor.update(asesor.id, {
        active: !(asesor.active !== false && asesor.activo !== false),
        activo: !(asesor.active !== false && asesor.activo !== false),
      });
      toast.success("Estado de asesor actualizado");
      refresh();
    } catch (error) {
      toast.error(error?.message || "No se pudo actualizar");
    }
  };

  const loadPreview = async () => {
    if (!fromCodigo || !toCodigo || fromCodigo === toCodigo) {
      toast.error("Seleccioná origen y destino distintos");
      return;
    }
    const { data, error } = await supabase.rpc("preview_reassign_cartera", {
      p_workspace_id: workspaceId,
      p_from_codigo: fromCodigo,
    });
    if (error) {
      toast.error(error.message || "No se pudo calcular el impacto");
      return;
    }
    setPreview(data);
  };

  const runReassign = async () => {
    if (!preview) {
      toast.error("Primero ejecutá la vista previa");
      return;
    }
    setReassigning(true);
    try {
      const { data, error } = await supabase.rpc("reassign_cartera", {
        p_workspace_id: workspaceId,
        p_from_codigo: fromCodigo,
        p_to_codigo: toCodigo,
      });
      if (error) throw error;
      toast.success(`Reasignación completada: ${data?.contactos_updated || 0} contactos, ${data?.consultas_updated || 0} presupuestos`);
      setReassignOpen(false);
      setPreview(null);
      setFromCodigo("");
      setToCodigo("");
      refresh();
    } catch (error) {
      toast.error(error?.message || "No se pudo reasignar");
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to={createPageUrl("Ajustes")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver a Ajustes
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Configuración de asesores</h1>
            <p className="text-slate-500">CRUD, estado y reasignación de cartera</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setReassignOpen(true)}>Reasignar cartera</Button>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Nuevo asesor
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Asesores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6}>Cargando...</TableCell></TableRow>
                ) : asesores.length === 0 ? (
                  <TableRow><TableCell colSpan={6}>No hay asesores</TableCell></TableRow>
                ) : asesores.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.codigo || "-"}</TableCell>
                    <TableCell>{a.nombre}</TableCell>
                    <TableCell>{a.email || "-"}</TableCell>
                    <TableCell>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{
                          backgroundColor:
                            a.color_hex && isValidAsesorPaletteHex(a.color_hex)
                              ? a.color_hex
                              : getAsesorHexColorFromHash(a.codigo),
                        }}
                        title="Color en listados"
                      >
                        {nombreToInitials(a.nombre || a.codigo)}
                      </div>
                    </TableCell>
                    <TableCell>{a.active === false || a.activo === false ? "Inactivo" : "Activo"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Editar</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(a)}>
                        {a.active === false || a.activo === false ? "Reactivar" : "Desactivar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar asesor" : "Crear asesor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Color en listados (avatares con iniciales)</Label>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: resolveFormColorHex(form) }}
                >
                  {nombreToInitials(form.nombre || form.codigo || "?")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ASESOR_PALETTE_HEX.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                        resolveFormColorHex(form) === hex
                          ? "border-slate-900 ring-2 ring-offset-1 ring-slate-400"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: hex }}
                      title={hex}
                      onClick={() => setForm((p) => ({ ...p, color_hex: hex }))}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Este color se usa en Pipeline, Consultas, Contactos y Reportes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm((p) => ({ ...p, active: checked }))} />
              <Label>Asesor activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Reasignar cartera</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Desde asesor</Label>
              <Select value={fromCodigo} onValueChange={setFromCodigo}>
                <SelectTrigger><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                <SelectContent>
                  {activeAsesores.map((a) => <SelectItem key={a.id} value={a.codigo || a.nombre}>{a.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hacia asesor</Label>
              <Select value={toCodigo} onValueChange={setToCodigo}>
                <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                <SelectContent>
                  {activeAsesores.map((a) => <SelectItem key={a.id} value={a.codigo || a.nombre}>{a.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadPreview}>Calcular impacto</Button>
            {preview && (
              <div className="rounded-md border p-3 text-sm">
                Se moverán <strong>{preview.contactos || 0}</strong> contactos y <strong>{preview.consultas || 0}</strong> presupuestos.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancelar</Button>
            <Button onClick={runReassign} disabled={reassigning || !preview}>
              {reassigning ? "Reasignando..." : "Confirmar reasignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
