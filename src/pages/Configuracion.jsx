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
import { auth, users, entities, workspaceSettingsApi } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { isAdmin, normalizeRole } from "@/lib/permissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IVA_RATES, formatIvaLabel, ivaSelectValue } from "@/lib/consultaIva";

export default function Configuracion() {
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isLoading, setIsLoading] = useState(false);
  const [consultaDays, setConsultaDays] = useState(3);
  const [savingDays, setSavingDays] = useState(false);
  const [globalCondiciones, setGlobalCondiciones] = useState("");
  const [globalObservaciones, setGlobalObservaciones] = useState("");
  const [globalDefaultIva, setGlobalDefaultIva] = useState("21");
  const [personalCondiciones, setPersonalCondiciones] = useState("");
  const [personalObservaciones, setPersonalObservaciones] = useState("");
  const [asesoresCatalog, setAsesoresCatalog] = useState([]);
  const [firmasAsesor, setFirmasAsesor] = useState({});
  const [miFirma, setMiFirma] = useState("");
  const [savingGlobalTexts, setSavingGlobalTexts] = useState(false);
  const [footerInstagram, setFooterInstagram] = useState("");
  const [footerWebsite, setFooterWebsite] = useState("");
  const [footerLinkedin, setFooterLinkedin] = useState("");
  const [savingFooterLinks, setSavingFooterLinks] = useState(false);
  const [savingPersonalTexts, setSavingPersonalTexts] = useState(false);
  const [savingFirmas, setSavingFirmas] = useState(false);
  const [savingMiFirma, setSavingMiFirma] = useState(false);

  const workspaceId = workspace?.id || "local";
  const userIsAdmin = isAdmin(currentUser);
  const asesorCodigo = currentUser?.asesor_codigo
    ? String(currentUser.asesor_codigo).toUpperCase()
    : null;
  const miAsesorRow = asesorCodigo
    ? asesoresCatalog.find((r) => String(r.codigo).toUpperCase() === asesorCodigo)
    : null;

  const { data: workspaceSettings } = useQuery({
    queryKey: ["workspace-settings", workspaceId],
    queryFn: () => workspaceSettingsApi.get(workspaceId),
    enabled: !!workspaceId,
  });
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
    setPersonalCondiciones(currentUser.consulta_default_condiciones_comerciales ?? "");
    setPersonalObservaciones(currentUser.consulta_default_observaciones ?? "");
  }, [currentUser]);

  useEffect(() => {
    if (!workspaceSettings) return;
    setGlobalCondiciones(workspaceSettings.consulta_default_condiciones_comerciales ?? "");
    setGlobalObservaciones(workspaceSettings.consulta_default_observaciones ?? "");
    setGlobalDefaultIva(ivaSelectValue(workspaceSettings.consulta_default_iva ?? 21));
    setFooterInstagram(workspaceSettings.pdf_footer_instagram ?? "");
    setFooterWebsite(workspaceSettings.pdf_footer_website ?? "");
    setFooterLinkedin(workspaceSettings.pdf_footer_linkedin ?? "");
  }, [workspaceSettings]);

  useEffect(() => {
    if (!miAsesorRow) {
      setMiFirma("");
      return;
    }
    setMiFirma(firmasAsesor[miAsesorRow.codigo] ?? miAsesorRow.firma ?? "");
  }, [miAsesorRow, firmasAsesor]);

  useEffect(() => {
    let active = true;

    const loadFirmasAsesor = async () => {
      const workspaceId = workspace?.id || "local";
      try {
        const rows = (await entities.Asesor.filter({ workspace_id: workspaceId }, "nombre", 2000)) || [];
        const sorted = [...rows].sort((a, b) =>
          String(a.nombre || a.codigo).localeCompare(String(b.nombre || b.codigo), "es")
        );
        if (active) {
          setAsesoresCatalog(sorted);
          setFirmasAsesor(
            Object.fromEntries(
              sorted.map((row) => [row.codigo, row.firma ?? row.nombre ?? row.codigo])
            )
          );
        }
      } catch {
        if (active) {
          setAsesoresCatalog([]);
          setFirmasAsesor({});
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

  const invalidatePresupuestoCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
    queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
    queryClient.invalidateQueries({ queryKey: ["asesor-firmas"] });
    queryClient.invalidateQueries({ queryKey: ["asesores"] });
    queryClient.invalidateQueries({ queryKey: ["asesores-admin"] });
  };

  const handleSaveGlobalTexts = async () => {
    if (!userIsAdmin) return;
    setSavingGlobalTexts(true);
    try {
      await workspaceSettingsApi.upsert(workspaceId, {
        consulta_default_condiciones_comerciales: globalCondiciones,
        consulta_default_observaciones: globalObservaciones,
        consulta_default_iva: parseFloat(globalDefaultIva),
      });
      invalidatePresupuestoCaches();
      toast.success("Textos predeterminados globales guardados");
    } catch {
      toast.error("Error al guardar textos globales");
    } finally {
      setSavingGlobalTexts(false);
    }
  };

  const handleSaveFooterLinks = async () => {
    if (!userIsAdmin) return;
    setSavingFooterLinks(true);
    try {
      await workspaceSettingsApi.upsert(workspaceId, {
        pdf_footer_instagram: footerInstagram.trim(),
        pdf_footer_website: footerWebsite.trim(),
        pdf_footer_linkedin: footerLinkedin.trim(),
      });
      invalidatePresupuestoCaches();
      toast.success("Redes del pie de PDF guardadas");
    } catch {
      toast.error("Error al guardar redes del PDF");
    } finally {
      setSavingFooterLinks(false);
    }
  };

  const handleSavePersonalTexts = async () => {
    setSavingPersonalTexts(true);
    try {
      await auth.updateMe({
        consulta_default_condiciones_comerciales: personalCondiciones,
        consulta_default_observaciones: personalObservaciones,
      });
      invalidatePresupuestoCaches();
      toast.success("Mis textos personalizados guardados");
    } catch {
      toast.error("Error al guardar tus textos");
    } finally {
      setSavingPersonalTexts(false);
    }
  };

  const handleSaveFirmasAdmin = async () => {
    if (!userIsAdmin) return;
    setSavingFirmas(true);
    try {
      await Promise.all(
        asesoresCatalog.map((row) => {
          const codigo = row.codigo;
          if (!codigo || !row.id) return Promise.resolve();
          const firma = firmasAsesor[codigo] ?? "";
          return entities.Asesor.update(row.id, {
            workspace_id: workspaceId,
            codigo,
            nombre: row.nombre || codigo,
            firma,
            active: row.active !== false,
            activo: row.activo !== false,
          });
        })
      );
      invalidatePresupuestoCaches();
      toast.success("Firmas de asesores guardadas");
    } catch {
      toast.error("Error al guardar firmas");
    } finally {
      setSavingFirmas(false);
    }
  };

  const handleSaveMiFirma = async () => {
    if (!miAsesorRow?.id) {
      toast.error("Tu usuario no tiene cartera vinculada; contactá al administrador.");
      return;
    }
    setSavingMiFirma(true);
    try {
      const codigo = miAsesorRow.codigo;
      await entities.Asesor.update(miAsesorRow.id, {
        workspace_id: workspaceId,
        codigo,
        nombre: miAsesorRow.nombre || codigo,
        firma: miFirma,
        active: miAsesorRow.active !== false,
        activo: miAsesorRow.activo !== false,
      });
      setFirmasAsesor((prev) => ({ ...prev, [codigo]: miFirma }));
      invalidatePresupuestoCaches();
      toast.success("Tu firma fue guardada");
    } catch {
      toast.error("Error al guardar tu firma");
    } finally {
      setSavingMiFirma(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Por favor ingresa un email");
      return;
    }

    if (inviteRole === "admin" && normalizeRole(currentUser?.role) !== "ADMIN") {
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

        {userIsAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Textos predeterminados para todos los asesores</CardTitle>
              <CardDescription>
                Base al crear presupuestos nuevos. Los asesores pueden definir textos propios que los reemplazan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>IVA predeterminado para presupuestos nuevos</Label>
                <Select value={globalDefaultIva} onValueChange={setGlobalDefaultIva}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IVA_RATES.map((rate) => (
                      <SelectItem key={rate} value={String(rate)}>
                        {formatIvaLabel(rate)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condiciones comerciales (global)</Label>
                <Textarea
                  value={globalCondiciones}
                  onChange={(e) => setGlobalCondiciones(e.target.value)}
                  placeholder="Ej: Forma de pago, plazos, alcance del servicio..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Observaciones (global)</Label>
                <Textarea
                  value={globalObservaciones}
                  onChange={(e) => setGlobalObservaciones(e.target.value)}
                  placeholder="Ej: Consideraciones técnicas estándar..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveGlobalTexts} disabled={savingGlobalTexts} className="gap-2">
                {savingGlobalTexts && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar textos globales
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Mis textos personalizados (opcional)</CardTitle>
            <CardDescription>
              {userIsAdmin
                ? "Opcional para tu usuario. Si dejás vacío, se usan los textos globales del workspace."
                : "Si dejás vacío, se usan los textos configurados por el administrador."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Condiciones comerciales</Label>
              <Textarea
                value={personalCondiciones}
                onChange={(e) => setPersonalCondiciones(e.target.value)}
                placeholder="Dejar vacío para usar el texto global..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={personalObservaciones}
                onChange={(e) => setPersonalObservaciones(e.target.value)}
                placeholder="Dejar vacío para usar el texto global..."
                rows={4}
              />
            </div>
            <Button onClick={handleSavePersonalTexts} disabled={savingPersonalTexts} className="gap-2">
              {savingPersonalTexts && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar mis textos
            </Button>
          </CardContent>
        </Card>

        {userIsAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Redes en pie de PDF</CardTitle>
              <CardDescription>
                Instagram, sitio web y LinkedIn que aparecen al pie del presupuesto en PDF. Los campos vacíos no se muestran.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={footerInstagram}
                  onChange={(e) => setFooterInstagram(e.target.value)}
                  placeholder="@emat o URL completa"
                />
              </div>
              <div className="space-y-2">
                <Label>Sitio web</Label>
                <Input
                  value={footerWebsite}
                  onChange={(e) => setFooterWebsite(e.target.value)}
                  placeholder="www.emat.com.ar"
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  value={footerLinkedin}
                  onChange={(e) => setFooterLinkedin(e.target.value)}
                  placeholder="linkedin.com/company/emat"
                />
              </div>
              <Button onClick={handleSaveFooterLinks} disabled={savingFooterLinks} className="gap-2">
                {savingFooterLinks && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar redes del PDF
              </Button>
            </CardContent>
          </Card>
        )}

        {userIsAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Firma predeterminada por asesor</CardTitle>
              <CardDescription>
                Configurá la firma de cada asesor. Aparece al pie del PDF del presupuesto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {asesoresCatalog.length === 0 ? (
                  <p className="text-sm text-slate-500 col-span-2">
                    No hay asesores en el catálogo. Creálos en Ajustes → Asesores.
                  </p>
                ) : (
                  asesoresCatalog.map((row) => (
                    <div key={row.codigo} className="space-y-1">
                      <Label className="text-xs text-slate-500">
                        {row.nombre || row.codigo}
                        {row.codigo !== row.nombre ? ` (${row.codigo})` : ""}
                      </Label>
                      <Input
                        value={firmasAsesor[row.codigo] ?? ""}
                        onChange={(e) =>
                          setFirmasAsesor((prev) => ({
                            ...prev,
                            [row.codigo]: e.target.value,
                          }))
                        }
                        placeholder={`Firma para ${row.nombre || row.codigo}`}
                      />
                    </div>
                  ))
                )}
              </div>
              <Button onClick={handleSaveFirmasAdmin} disabled={savingFirmas} className="gap-2">
                {savingFirmas && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar firmas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Mi firma en presupuestos</CardTitle>
              <CardDescription>
                Este texto reemplaza el &quot;Cotizó ...&quot; al pie del PDF de tus presupuestos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!asesorCodigo ? (
                <p className="text-sm text-slate-500">
                  Tu usuario no tiene cartera vinculada; contactá al administrador.
                </p>
              ) : !miAsesorRow ? (
                <p className="text-sm text-slate-500">
                  No se encontró tu asesor en el catálogo ({asesorCodigo}). Contactá al administrador.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">
                      {miAsesorRow.nombre || miAsesorRow.codigo} ({miAsesorRow.codigo})
                    </Label>
                    <Textarea
                      value={miFirma}
                      onChange={(e) => setMiFirma(e.target.value)}
                      placeholder="Tu nombre y cargo para el PDF..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSaveMiFirma} disabled={savingMiFirma} className="gap-2">
                    {savingMiFirma && <Loader2 className="w-4 h-4 animate-spin" />}
                    Guardar mi firma
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

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
