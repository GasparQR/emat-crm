import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { entities, supabase, auth } from "@/api/supabaseClient";
import { adminUsersApi } from "@/api/adminUsers";
import { createPageUrl } from "@/utils";
import {
  DUPLICATE_ASESOR_EMAIL_ERROR,
  DUPLICATE_USUARIO_EMAIL_ERROR,
  isDuplicateAsesorEmail,
  isDuplicateUsuarioEmailForAsesor,
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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [accessOpen, setAccessOpen] = useState(false);
  const [accessAsesor, setAccessAsesor] = useState(null);
  const [accessForm, setAccessForm] = useState({ email: "", password: "", role: "ASESOR", active: true, can_view_other_advisors: false });
  const [accessSaving, setAccessSaving] = useState(false);

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
    queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
  };

  const asesoresConCodigo = useMemo(
    () => (asesores || []).filter((a) => a.codigo),
    [asesores]
  );

  // Map asesor.codigo → usuario profile for quick lookup
  const usuariosByAsesorCodigo = useMemo(() => {
    const map = {};
    (usuarios || []).forEach((u) => {
      if (u.asesor_codigo) map[u.asesor_codigo] = u;
    });
    return map;
  }, [usuarios]);

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
    const asesorCodigo = form.codigo.trim().toUpperCase();
    if (email) {
      if (isDuplicateAsesorEmail(email, asesores, { excludeId: editing ? form.id : null })) {
        toast.error(DUPLICATE_ASESOR_EMAIL_ERROR);
        return;
      }
      if (isDuplicateUsuarioEmailForAsesor(email, usuarios, { asesorCodigo })) {
        toast.error(DUPLICATE_USUARIO_EMAIL_ERROR);
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

  const openDelete = async (asesor) => {
    setDeleteTarget(asesor);
    setDeletePreview(null);
    setDeleteOpen(true);
    setDeletePreviewLoading(true);
    try {
      const { data, error } = await supabase.rpc("preview_asesor_deletion", {
        p_workspace_id: workspaceId,
        p_asesor_id: asesor.id,
      });
      if (error) throw error;
      setDeletePreview(data);
    } catch (error) {
      toast.error(error?.message || "No se pudo verificar el asesor");
      setDeleteOpen(false);
      setDeleteTarget(null);
    } finally {
      setDeletePreviewLoading(false);
    }
  };

  const openReassignFromDelete = () => {
    const codigo = deletePreview?.codigo || deleteTarget?.codigo;
    if (!codigo) return;
    setDeleteOpen(false);
    setFromCodigo(codigo);
    setToCodigo("");
    setPreview(null);
    setReassignOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || !deletePreview?.can_delete) return;
    setDeleting(true);
    try {
      const result = await adminUsersApi.deleteAsesor({
        asesor_id: deleteTarget.id,
        workspace_id: workspaceId,
      });
      const usuariosMsg =
        result?.usuarios_deleted > 0
          ? ` y ${result.usuarios_deleted} cuenta(s) de usuario`
          : "";
      toast.success(`Asesor eliminado${usuariosMsg}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      setDeletePreview(null);
      refresh();
    } catch (error) {
      toast.error(error?.message || "No se pudo eliminar el asesor");
    } finally {
      setDeleting(false);
    }
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

  const openAssignAccess = (asesor) => {
    setAccessAsesor(asesor);
    setAccessForm({
      email: asesor.email || "",
      password: "",
      role: "ASESOR",
      active: true,
      can_view_other_advisors: false,
    });
    setAccessOpen(true);
  };

  const handleAssignAccess = async () => {
    if (!accessForm.email.trim() || !accessForm.password) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    setAccessSaving(true);
    try {
      await adminUsersApi.assignUserToAsesor({
        asesor_codigo: accessAsesor.codigo,
        email: accessForm.email.trim().toLowerCase(),
        password: accessForm.password,
        full_name: accessAsesor.nombre,
        role: accessForm.role,
        active: accessForm.active,
        can_view_other_advisors: accessForm.can_view_other_advisors,
      });
      toast.success(`Acceso asignado a ${accessAsesor.nombre}`);
      setAccessOpen(false);
      setAccessAsesor(null);
      refresh();
    } catch (error) {
      toast.error(error?.message || "No se pudo asignar el acceso");
    } finally {
      setAccessSaving(false);
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
                  <TableHead>Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7}>Cargando...</TableCell></TableRow>
                ) : asesores.length === 0 ? (
                  <TableRow><TableCell colSpan={7}>No hay asesores</TableCell></TableRow>
                ) : asesores.map((a) => {
                  const linkedUser = a.codigo ? usuariosByAsesorCodigo[a.codigo] : null;
                  return (
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
                      <TableCell>
                        {linkedUser ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <UserCheck className="w-3 h-3" />
                            {linkedUser.email}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                            <UserX className="w-3 h-3" />
                            Sin acceso
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {a.codigo && !linkedUser && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                            onClick={() => openAssignAccess(a)}
                          >
                            <KeyRound className="w-3 h-3" />
                            Asignar Acceso
                          </Button>
                        )}
                        {a.codigo && linkedUser && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-slate-600"
                            onClick={() => toast.info(`Usuario: ${linkedUser.email} — Editá desde Configuración › Usuarios`)}
                          >
                            <UserCheck className="w-3 h-3" />
                            Ver Usuario
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Editar</Button>
                        <Button variant="outline" size="sm" onClick={() => toggleActive(a)}>
                          {a.active === false || a.activo === false ? "Reactivar" : "Desactivar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => openDelete(a)}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                  {asesoresConCodigo.map((a) => (
                    <SelectItem key={a.id} value={a.codigo}>{a.nombre}</SelectItem>
                  ))}
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

      {/* Assign Access Dialog */}
      <Dialog open={accessOpen} onOpenChange={(next) => { setAccessOpen(next); if (!next) setAccessAsesor(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Asignar acceso al sistema
            </DialogTitle>
          </DialogHeader>
          {accessAsesor && (
            <div className="space-y-4">
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                <span className="text-blue-700">Asesor: </span>
                <strong className="text-blue-900">{accessAsesor.nombre}</strong>
                <span className="text-blue-600"> ({accessAsesor.codigo})</span>
              </div>
              <div className="space-y-2">
                <Label>Email de acceso</Label>
                <Input
                  type="email"
                  value={accessForm.email}
                  onChange={(e) => setAccessForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={accessForm.password}
                  onChange={(e) => setAccessForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={accessForm.role}
                  onValueChange={(v) => setAccessForm((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASESOR">ASESOR</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="LOGISTICA">LOGISTICA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {accessForm.role === "ASESOR" && (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={accessForm.can_view_other_advisors}
                    onCheckedChange={(checked) => setAccessForm((p) => ({ ...p, can_view_other_advisors: checked }))}
                  />
                  <Label>Puede ver otros asesores</Label>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch
                  checked={accessForm.active}
                  onCheckedChange={(checked) => setAccessForm((p) => ({ ...p, active: checked }))}
                />
                <Label>Usuario activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAccessOpen(false); setAccessAsesor(null); }}>Cancelar</Button>
            <Button onClick={handleAssignAccess} disabled={accessSaving} className="gap-2">
              <KeyRound className="w-4 h-4" />
              {accessSaving ? "Asignando..." : "Asignar Acceso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          setDeleteOpen(next);
          if (!next) {
            setDeleteTarget(null);
            setDeletePreview(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Eliminar asesor</DialogTitle>
          </DialogHeader>
          {deletePreviewLoading ? (
            <p className="text-sm text-slate-500">Verificando presupuestos y contactos...</p>
          ) : deletePreview && deleteTarget ? (
            <div className="space-y-3 text-sm">
              {deletePreview.can_delete ? (
                <>
                  <p>
                    ¿Eliminar a <strong>{deletePreview.nombre || deleteTarget.nombre}</strong> del sistema?
                  </p>
                  {deletePreview.usuarios > 0 && (
                    <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                      También se eliminará la cuenta de usuario vinculada ({deletePreview.usuarios}).
                      Esta acción no se puede deshacer.
                    </p>
                  )}
                  {deletePreview.usuarios === 0 && (
                    <p className="text-slate-500">No hay presupuestos ni contactos asignados. Esta acción no se puede deshacer.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-red-700">
                    No se puede eliminar a <strong>{deletePreview.nombre || deleteTarget.nombre}</strong>.
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li><strong>{deletePreview.consultas || 0}</strong> presupuesto(s) asignado(s)</li>
                    <li><strong>{deletePreview.contactos || 0}</strong> contacto(s) asignado(s)</li>
                  </ul>
                  {deletePreview.usuarios > 0 && (
                    <p className="text-slate-500">
                      Hay {deletePreview.usuarios} usuario(s) vinculado(s); se podrán eliminar una vez vaciada la cartera.
                    </p>
                  )}
                  <p className="text-slate-500">
                    Reasigná presupuestos y contactos a otro asesor antes de eliminar.
                  </p>
                </>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
                setDeletePreview(null);
              }}
            >
              Cancelar
            </Button>
            {deletePreview && !deletePreview.can_delete && (
              <Button onClick={openReassignFromDelete}>Reasignar cartera</Button>
            )}
            {deletePreview?.can_delete && (
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? "Eliminando..." : "Eliminar definitivamente"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
