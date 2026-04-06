import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bell, User, Shield, Database, Trash2, Users, Loader2, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";

export default function Configuracion() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isLoading, setIsLoading] = useState(false);
  const [consultaDays, setConsultaDays] = useState(3);
  const [postventaDays, setPostventaDays] = useState(7);
  const [savingDays, setSavingDays] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setConsultaDays(currentUser.consulta_follow_up_days ?? 3);
      setPostventaDays(currentUser.postventa_follow_up_days ?? 7);
    }
  }, [currentUser]);

  const handleSaveDays = async () => {
    setSavingDays(true);
    try {
      await base44.auth.updateMe({
        consulta_follow_up_days: Number(consultaDays),
        postventa_follow_up_days: Number(postventaDays)
      });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success("Días hábiles guardados");
    } finally {
      setSavingDays(false);
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
      await base44.users.inviteUser(inviteEmail, inviteRole);
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

        {/* Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestión de usuarios
            </CardTitle>
            <CardDescription>Invita a otros usuarios al equipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Email del usuario</Label>
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={inviteRole} onValueChange={setInviteRole} disabled={currentUser?.role !== "admin"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    {currentUser?.role === "admin" && (
                      <SelectItem value="admin">Administrador</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {currentUser?.role !== "admin" && (
                  <p className="text-xs text-slate-400">Solo puedes invitar usuarios regulares</p>
                )}
              </div>
              <Button type="submit" disabled={isLoading} className="w-full gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar invitación
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil
            </CardTitle>
            <CardDescription>Información personal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input placeholder="Tu nombre" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="tu@email.com" disabled />
              <p className="text-xs text-slate-400">El email no se puede modificar</p>
            </div>
            <Button>Guardar cambios</Button>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>Gestiona cómo recibes notificaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Seguimientos vencidos</p>
                <p className="text-sm text-slate-500">Notificación diaria de seguimientos pendientes</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Nuevas consultas</p>
                <p className="text-sm text-slate-500">Notificación cuando se crea una consulta</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ventas concretadas</p>
                <p className="text-sm text-slate-500">Notificación cuando se cierra una venta</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Preferencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Modo oscuro</p>
                <p className="text-sm text-slate-500">Interfaz con tema oscuro</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Moneda por defecto</Label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="USD">Dólares (USD)</option>
                <option value="ARS">Pesos argentinos (ARS)</option>
              </select>
            </div>
          </CardContent>
        </Card>

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
              <div className="space-y-2">
                <Label>Seguimiento de postventa (días hábiles)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={postventaDays}
                  onChange={(e) => setPostventaDays(e.target.value)}
                />
                <p className="text-xs text-slate-400">Días que se agregan al completar el primer contacto de postventa</p>
              </div>
            </div>
            <Button onClick={handleSaveDays} disabled={savingDays} className="gap-2">
              {savingDays && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar días hábiles
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
          TechCRM v1.0 - Mini CRM para ventas por WhatsApp
        </div>
      </div>
    </div>
  );
}