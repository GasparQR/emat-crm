import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Settings, MessageSquare, Users, UserCog, Package } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isAdmin } from "@/lib/permissions";

export default function Ajustes() {
  const { data: currentUser } = useCurrentUser();
  const admin = isAdmin(currentUser);
  const opciones = [
    {
      title: "Configuración",
      description: "Preferencias de seguimiento y textos de presupuesto",
      icon: Settings,
      to: createPageUrl("Configuracion"),
      color: "bg-slate-100 text-slate-700",
    },
    {
      title: "Plantillas WhatsApp",
      description: "Gestiona tus mensajes predefinidos y variables",
      icon: MessageSquare,
      to: createPageUrl("Plantillas"),
      color: "bg-emerald-100 text-emerald-700",
    },
    ...(admin
      ? [
          {
            title: "Usuarios",
            description: "Alta, edición, desactivación y permisos por rol",
            icon: UserCog,
            to: "/configuracion/usuarios",
            color: "bg-blue-100 text-blue-700",
          },
          {
            title: "Asesores",
            description: "CRUD de asesores y reasignación de cartera",
            icon: Users,
            to: "/configuracion/asesores",
            color: "bg-purple-100 text-purple-700",
          },
          {
            title: "Catálogo de productos",
            description: "Productos y servicios frecuentes para presupuestos",
            icon: Package,
            to: "/configuracion/catalogo-productos",
            color: "bg-amber-100 text-amber-700",
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Ajustes</h1>
          <p className="text-slate-500 mt-1">Administrá la configuración de tu CRM</p>
        </div>

        <div className="grid gap-4">
          {opciones.map((opcion) => (
            <Link key={opcion.title} to={opcion.to}>
              <Card className="hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${opcion.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <opcion.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">{opcion.title}</h3>
                      <p className="text-slate-500 text-sm mt-0.5">{opcion.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
