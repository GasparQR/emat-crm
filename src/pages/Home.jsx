import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, BarChart3, Users, List } from "lucide-react";

export default function Home() {
  const [showForm, setShowForm] = useState(false);

  const stats = [
    { title: "Clientes Activos", value: "1,246", icon: Users, color: "bg-blue-500" },
    { title: "Presupuestos 2026", value: "177", icon: BarChart3, color: "bg-green-500" },
    { title: "En Negociación", value: "45", icon: List, color: "bg-yellow-500" },
    { title: "Ganados", value: "32", icon: Plus, color: "bg-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">EMAT Celulosa CRM</h1>
          <p className="text-lg text-slate-600">Gestión integral de presupuestos y clientes</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.color} p-2 rounded-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl("Consultas")}>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Consulta
                </Button>
              </Link>
              <Link to={createPageUrl("Pipeline")}>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Pipeline
                </Button>
              </Link>
              <Link to={createPageUrl("Contactos")}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Gestionar Contactos
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Estado</p>
                <p className="text-lg font-semibold text-green-600">✓ En línea</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Datos locales</p>
                <p className="text-sm text-slate-700">Almacenados en el navegador (localStorage)</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Versión</p>
                <p className="text-sm text-slate-700">EMAT CRM v0.1.0</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Section */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white">
          <CardHeader>
            <CardTitle className="text-white">Bienvenido a EMAT Celulosa CRM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-50 mb-4">
              Sistema completo de gestión de presupuestos y clientes para empresas de fibra celulosa.
              Con almacenamiento local, sin necesidad de backend.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-blue-100">✓ Gestión de clientes y contactos</p>
              <p className="text-sm text-blue-100">✓ Pipeline de presupuestos en Kanban</p>
              <p className="text-sm text-blue-100">✓ Seguimiento de ventas y postventa</p>
              <p className="text-sm text-blue-100">✓ Reportes y análisis de negocios</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
