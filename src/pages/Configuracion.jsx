import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Database, Loader2, Calendar, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BACKUP_ENTITIES,
  getDefaultBackupSelection,
  exportWorkspaceBackup,
} from "@/lib/backupExport";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { auth, users, entities } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";

const ASESORES = ["ANDRES", "TRISTAN", "VALENTINA", "ROCIO", "JULIAN", "PABLO", "ESTEBAN", "MACA", "MIRTA LOPEZ"];

export default function Configuracion() {
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isLoading, setIsLoading] = useState(false);
  const [consultaDays, setConsultaDays] = useState(3);
  const [savingDays, setSavingDays] = useState(false);
  const [defaultCondiciones, setDefaultCondiciones] = useState("");
  const [defaultObservaciones, setDefaultObservaciones] = useState("");
  const [firmasAsesor, setFirmasAsesor] = useState({});
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [backupSelection, setBackupSelection] = useState(getDefaultBackupSelection);
  const [exporting, setExporting] = useState(false);

  const selectedBackupCount = BACKUP_ENTITIES.filter((e) => backupSelection[e.id]).length;
  const allBackupSelected = selectedBackupCount === BACKUP_ENTITIES.length;

  const handleToggleBackupItem = (id, checked) => {
    setBackupSelection((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSelectAllBackup = () => {
    setBackupSelection(getDefaultBackupSelection());
  };

  const handleDeselectAllBackup = () => {
    setBackupSelection(Object.fromEntries(BACKUP_ENTITIES.map((e) => [e.id, false])));
  };

  const handleExportBackup = async () => {
    const selectedIds = BACKUP_ENTITIES.filter((e) => backupSelection[e.id]).map((e) => e.id);
    if (selectedIds.length === 0) {
      toast.error("Seleccioná al menos un ítem para exportar");
      return;
    }

    setExporting(true);
    try {
      const workspaceId = workspace?.id || "local";
      const result = await exportWorkspaceBackup({ workspaceId, selectedIds });
      const parts = [];
      if (result.rowCounts?.presupuestos !== undefined) {
        parts.push(`${result.rowCounts.presupuestos} presupuestos`);
      }
      if (result.rowCounts?.contactos !== undefined) {
        parts.push(`${result.rowCounts.contactos} contactos`);
      }
      const detail = parts.length > 0 ? `: ${parts.join(", ")}` : "";
      toast.success(`Backup exportado${detail}`);
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar el backup");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    setConsultaDays(currentUser.consulta_follow_up_days ?? 3);
    setDefaultCondiciones(currentUser.consulta_default_condiciones_comerciales ?? "");
    setDefaultObservaciones(currentUser.consulta_default_observaciones ?? "");
  }, [currentUser]);

  useEffect(() => {
    let active = true;

    const loadFirmasAsesor = async () => {
      const workspaceId = workspace?.id || "local";
      try {
        const rows = await entities.Asesor.filter({ workspace_id: workspaceId }, "nombre", 2000);
        const byNombre = Object.fromEntries((rows || []).map((row) => [row.nombre, row.firma]));
        const normalizedFirmas = Object.fromEntries(
          ASESORES.map((asesor) => [asesor, byNombre[asesor] ?? asesor])
        );
        if (active) setFirmasAsesor(normalizedFirmas);
      } catch {
        // If schema/table is not ready, keep usable defaults in UI.
        if (active) {
          setFirmasAsesor(Object.fromEntries(ASESORES.map((asesor) => [asesor, asesor])));
        }
      }
    };

    loadFirmasAsesor();
    return () => {
      active = false;
    };
  }, [workspace?.id]);

  const handleSaveDays = async () => {
    setSavingDays(true);
    try {
      await auth.updateMe({
        consulta_follow_up_days: Number(consultaDays),
      });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success("Días hábiles guardados");
    } finally {
      setSavingDays(false);
    }
  };

  const handleSaveDefaults = async () => {
    setSavingDefaults(true);
    try {
      await auth.updateMe({
        consulta_default_condiciones_comerciales: defaultCondiciones,
        consulta_default_observaciones: defaultObservaciones,
      });

      const workspaceId = workspace?.id || "local";
      const existing = await entities.Asesor.filter({ workspace_id: workspaceId }, null, 2000);
      const existingByNombre = new Map((existing || []).map((item) => [item.nombre, item]));

      await Promise.all(
        ASESORES.map((asesor) => {
          const firma = firmasAsesor[asesor] ?? "";
          const current = existingByNombre.get(asesor);
          if (current?.id) {
            return entities.Asesor.update(current.id, {
              workspace_id: workspaceId,
              nombre: asesor,
              firma,
              activo: true,
            });
          }
          return entities.Asesor.create({
            id: `asesor_${workspaceId}_${asesor.toLowerCase()}`,
            workspace_id: workspaceId,
            nombre: asesor,
            firma,
            activo: true,
          });
        })
      );

      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['asesor-firmas'] });
      toast.success("Textos predeterminados guardados");
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Por favor ingresa un email");
      return;
    }

    if (inviteRole === "admin" && currentUser?.role !== "admin") {
      toast.error("Solo los administradores pueden invitar otros administradores");
      return;
    }

    setIsLoading(true);
    try {
      await users.inviteUser(inviteEmail, inviteRole);
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("user");
    } catch (error) {
      toast.error("Error al enviar la invitación");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6 px-0 sm:px-0">
        <div>
          <Link to={createPageUrl("Ajustes")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Ajustes
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-slate-500 mt-1">Gestión de usuarios y preferencias</p>
        </div>

        

     

        
        {/* Días hábiles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Días hábiles de seguimiento
            </CardTitle>
            <CardDescription>Configura los días hábiles predeterminados para cada tipo de seguimiento automático</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seguimiento de consultas (días hábiles)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={consultaDays}
                  onChange={(e) => setConsultaDays(e.target.value)}
                />
                <p className="text-xs text-slate-400">Días que se agregan automáticamente al agendar un seguimiento de consulta</p>
              </div>
            </div>
            <Button onClick={handleSaveDays} disabled={savingDays} className="gap-2">
              {savingDays && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar días hábiles
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Textos predeterminados de presupuesto</CardTitle>
            <CardDescription>
              Estos valores se completan automáticamente al crear un presupuesto nuevo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Condiciones comerciales predeterminadas</Label>
              <Textarea
                value={defaultCondiciones}
                onChange={(e) => setDefaultCondiciones(e.target.value)}
                placeholder="Ej: Forma de pago, plazos, alcance del servicio..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Observaciones predeterminadas</Label>
              <Textarea
                value={defaultObservaciones}
                onChange={(e) => setDefaultObservaciones(e.target.value)}
                placeholder="Ej: Consideraciones técnicas estándar para todos los presupuestos..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Firma predeterminada por asesor</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ASESORES.map((asesor) => (
                  <div key={asesor} className="space-y-1">
                    <Label className="text-xs text-slate-500">{asesor}</Label>
                    <Input
                      value={firmasAsesor[asesor] ?? ""}
                      onChange={(e) =>
                        setFirmasAsesor((prev) => ({
                          ...prev,
                          [asesor]: e.target.value,
                        }))
                      }
                      placeholder={`Firma para ${asesor}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Este texto reemplaza el "Cotizó ..." al pie del PDF.
              </p>
            </div>
            <Button onClick={handleSaveDefaults} disabled={savingDefaults} className="gap-2">
              {savingDefaults && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar textos predeterminados
            </Button>
          </CardContent>
        </Card>

        {/* Datos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Gestión de datos
            </CardTitle>
            <CardDescription>Exportar una copia de seguridad de tus datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Respalda contactos y presupuestos del workspace actual en un ZIP con archivos CSV.
              </p>
              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={handleSelectAllBackup}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                  disabled={allBackupSelected}
                >
                  Seleccionar todo
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllBackup}
                  className="text-blue-600 hover:underline disabled:opacity-50"
                  disabled={selectedBackupCount === 0}
                >
                  Deseleccionar todo
                </button>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                {BACKUP_ENTITIES.map((entity) => (
                  <label
                    key={entity.id}
                    htmlFor={`backup-${entity.id}`}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                  >
                    <Checkbox
                      id={`backup-${entity.id}`}
                      checked={!!backupSelection[entity.id]}
                      onCheckedChange={(checked) =>
                        handleToggleBackupItem(entity.id, checked === true)
                      }
                    />
                    <span className="text-sm text-slate-800">{entity.label}</span>
                  </label>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleExportBackup}
                disabled={exporting || selectedBackupCount === 0}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Exportar backup (ZIP)
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-slate-400 py-4">
          Pragma CRM v1.0 - Mini CRM para ventas por WhatsApp
        </div>
      </div>
    </div>
  );
}
