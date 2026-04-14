import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Database, Trash2, Loader2, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { auth, users } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";

const ASESORES = ["ANDRES", "TRISTAN", "VALENTINA", "ROCIO", "JULIAN", "PABLO", "ESTEBAN", "MACA"];

export default function Configuracion() {
  const { data: currentUser } = useCurrentUser();
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

  useEffect(() => {
    if (currentUser) {
      setConsultaDays(currentUser.consulta_follow_up_days ?? 3);
      setDefaultCondiciones(currentUser.consulta_default_condiciones_comerciales ?? "");
      setDefaultObservaciones(currentUser.consulta_default_observaciones ?? "");
      const savedFirmas = currentUser.consulta_firmas_asesor ?? {};
      const normalizedFirmas = Object.fromEntries(ASESORES.map((asesor) => [asesor, savedFirmas[asesor] ?? asesor]));
      setFirmasAsesor(normalizedFirmas);
    }
  }, [currentUser]);

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
        consulta_firmas_asesor: firmasAsesor,
      });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
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
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
            <CardDescription>Exportar o eliminar tus datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button variant="outline" className="w-full">
                Exportar todos los datos (CSV)
              </Button>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-slate-500 mb-2">Zona peligrosa</p>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="w-4 h-4" />
                Eliminar todas las consultas
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
