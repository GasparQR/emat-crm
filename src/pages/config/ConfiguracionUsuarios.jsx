import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, UserCog } from "lucide-react";
import { auth, entities } from "@/api/supabaseClient";
import { adminUsersApi } from "@/api/adminUsers";
import { createPageUrl } from "@/utils";
import {
  DUPLICATE_ASESOR_EMAIL_ERROR,
  DUPLICATE_USUARIO_EMAIL_ERROR,
  isDuplicateAsesorEmail,
  isDuplicateUsuarioEmail,
  mapDuplicateEmailError,
  normalizeEmail,
} from "@/lib/emailValidation";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const EMPTY_FORM = {
  id: "",
  full_name: "",
  email: "",
  password: "",
  role: "ASESOR",
  active: true,
  can_view_other_advisors: false,
  asesor_codigo: "",
  existing_asesor_codigo: "",
};

export default function ConfiguracionUsuarios() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => auth.listUsuarios(),
  });

  const { data: asesores = [] } = useQuery({
    queryKey: ["asesores-admin", workspaceId],
    queryFn: () => entities.Asesor.filter({ workspace_id: workspaceId }, "nombre", 2000),
  });

  const sortedUsers = useMemo(
    () => [...usuarios].sort((a, b) => (a.created_date < b.created_date ? 1 : -1)),
    [usuarios]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
    queryClient.invalidateQueries({ queryKey: ["asesores"] });
    queryClient.invalidateQueries({ queryKey: ["asesores-admin"] });
  };

  const openCreate = () => {
    setEditing(false);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (user) => {
    setEditing(true);
    setForm({
      id: user.id,
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      role: user.role || "ASESOR",
      active: user.active !== false,
      can_view_other_advisors: user.can_view_other_advisors === true,
      asesor_codigo: user.asesor_codigo || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Nombre y email son obligatorios");
      return;
    }
    if (!editing && !form.password) {
      toast.error("La contraseña es obligatoria para crear usuarios");
      return;
    }
    if (!editing && isDuplicateUsuarioEmail(form.email, sortedUsers)) {
      toast.error(DUPLICATE_USUARIO_EMAIL_ERROR);
      return;
    }
    // Only check asesor email conflict when NOT linking to an existing asesor
    if (!editing && !form.existing_asesor_codigo && isDuplicateAsesorEmail(form.email, asesores)) {
      toast.error(DUPLICATE_ASESOR_EMAIL_ERROR);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await adminUsersApi.updateUser({
          id: form.id,
          full_name: form.full_name.trim(),
          role: form.role,
          active: form.active,
          can_view_other_advisors: form.can_view_other_advisors,
        });
        toast.success("Usuario actualizado");
      } else {
        await adminUsersApi.createUser({
          full_name: form.full_name.trim(),
          email: normalizeEmail(form.email),
          password: form.password,
          role: form.role,
          active: form.active,
          can_view_other_advisors: form.can_view_other_advisors,
          ...(form.existing_asesor_codigo
            ? { existing_asesor_codigo: form.existing_asesor_codigo }
            : {}),
        });
        toast.success("Usuario creado");
      }
      setOpen(false);
      refresh();
    } catch (error) {
      const mapped = mapDuplicateEmailError(error?.message);
      toast.error(mapped || error?.message || "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await adminUsersApi.setUserActive({ id: user.id, active: !(user.active !== false) });
      toast.success(user.active !== false ? "Usuario desactivado" : "Usuario reactivado");
      refresh();
    } catch (error) {
      toast.error(error?.message || "No se pudo cambiar el estado");
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
            <h1 className="text-2xl font-bold text-slate-900">Administración de usuarios</h1>
            <p className="text-slate-500">Alta, edición y permisos por rol</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo usuario
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cartera</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8}>Cargando...</TableCell></TableRow>
                ) : sortedUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>No hay usuarios</TableCell></TableRow>
                ) : sortedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.active === false ? "Inactivo" : "Activo"}</TableCell>
                    <TableCell>{u.asesor_codigo || "-"}</TableCell>
                    <TableCell>{u.created_date ? new Date(u.created_date).toLocaleString() : "-"}</TableCell>
                    <TableCell>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(u)}>
                        {u.active === false ? "Reactivar" : "Desactivar"}
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
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Crear usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} disabled={editing} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(value) => setForm((p) => ({ ...p, role: value }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="ASESOR">ASESOR</SelectItem>
                  <SelectItem value="LOGISTICA">LOGISTICA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "ASESOR" && (
              <>
                {editing && form.asesor_codigo ? (
                  <div className="space-y-1">
                    <Label>Cartera comercial</Label>
                    <p className="text-sm text-slate-600 bg-slate-50 border rounded-md px-3 py-2">{form.asesor_codigo}</p>
                  </div>
                ) : !editing ? (
                  <div className="space-y-2">
                    <Label>Cartera comercial</Label>
                    {(() => {
                      const asesoresSinUsuario = (asesores || []).filter(
                        (a) => !sortedUsers.some((u) => u.asesor_codigo === a.codigo)
                      );
                      return asesoresSinUsuario.length > 0 ? (
                        <>
                          <Select
                            value={form.existing_asesor_codigo}
                            onValueChange={(v) =>
                              setForm((p) => ({
                                ...p,
                                existing_asesor_codigo: v === "__nuevo__" ? "" : v,
                                full_name: v && v !== "__nuevo__"
                                  ? (asesores.find((a) => a.codigo === v)?.nombre || p.full_name)
                                  : p.full_name,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Vincular a asesor existente (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__nuevo__">Crear nueva cartera automáticamente</SelectItem>
                              {asesoresSinUsuario.map((a) => (
                                <SelectItem key={a.id} value={a.codigo}>
                                  {a.nombre} ({a.codigo})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!form.existing_asesor_codigo && (
                            <p className="text-xs text-slate-500">
                              Si no seleccionás un asesor, se creará una nueva cartera automáticamente.
                            </p>
                          )}
                          {form.existing_asesor_codigo && (
                            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                              Se asignará acceso al asesor existente: <strong>{form.existing_asesor_codigo}</strong>
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Se asignará automáticamente una nueva cartera comercial al guardar.
                        </p>
                      );
                    })()}
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.can_view_other_advisors}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, can_view_other_advisors: checked }))}
                  />
                  <Label>Puede ver otros asesores</Label>
                </div>
              </>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm((p) => ({ ...p, active: checked }))} />
              <Label>Usuario activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
