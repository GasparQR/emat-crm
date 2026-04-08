import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, AlertCircle, CheckCircle2, MessageCircle, ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";
import WhatsAppSender from "@/components/crm/WhatsAppSender";
import { toast } from "sonner";
import { useAuth } from "@/lib/SimpleAuthContext";

const etapaColors = {
  Nuevo: "bg-blue-100 text-blue-700",
  Respondido: "bg-cyan-100 text-cyan-700",
  Seguimiento1: "bg-amber-100 text-amber-700",
  Seguimiento2: "bg-orange-100 text-orange-700",
  Negociacion: "bg-purple-100 text-purple-700",
  Concretado: "bg-emerald-100 text-emerald-700",
};

export default function Hoy() {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const isLogistica = user?.role === "logistica";

  const { data: consultas = [], refetch } = useQuery({
    queryKey: ['consultas-hoy', workspace?.id],
    queryFn: () => workspace ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 1000) : [],
    enabled: !!workspace
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Consulta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas-hoy'] });
      toast.success("Actualizado");
    }
  });

  const today = moment();

  // Helper: devuelve la fecha de seguimiento correcta según etapa
  const getFechaSeguimiento = (c) =>
    c.etapa === "Concretado"
      ? (c.fecha_seguimiento_posventa || c.proximoSeguimiento)
      : c.proximoSeguimiento;

  const hoy = consultas.filter(c => {
    if (isLogistica && c.etapa !== "GANADA") return false;
    const fecha = getFechaSeguimiento(c);
    if (!fecha) return false;
    if (c.etapa === "Perdido") return false;
    return moment(fecha).isSame(today, 'day');
  });

  const vencidos = consultas.filter(c => {
    if (isLogistica && c.etapa !== "GANADA") return false;
    const fecha = getFechaSeguimiento(c);
    if (!fecha) return false;
    if (c.etapa === "Perdido") return false;
    return moment(fecha).isBefore(today, 'day');
  });

  const proximos3d = consultas.filter(c => {
    if (isLogistica && c.etapa !== "GANADA") return false;
    const fecha = getFechaSeguimiento(c);
    if (!fecha) return false;
    if (c.etapa === "Perdido") return false;
    return (
      moment(fecha).isAfter(today, 'day') &&
      moment(fecha).isBefore(today.clone().add(3, 'days'), 'day')
    );
  });

  const handleWhatsApp = (consulta) => {
    setSelectedConsulta(consulta);
    setShowWhatsApp(true);
  };

  const handleMarcarCompletado = async (consulta) => {
    const nuevaFecha = moment().add(3, 'days').format("YYYY-MM-DD");
    const campo = consulta.etapa === "Concretado" ? "fecha_seguimiento_posventa" : "proximoSeguimiento";
    await updateMutation.mutateAsync({
      id: consulta.id,
      data: { [campo]: nuevaFecha }
    });
  };

  const ConsultaItem = ({ consulta, tipo }) => {
    const esPosventa = consulta.etapa === "Concretado";
    const fechaMostrar = esPosventa ? consulta.fecha_seguimiento_posventa : consulta.proximoSeguimiento;
    return (
    <Card className={`hover:shadow-md transition-all ${esPosventa ? "border-emerald-200 bg-emerald-50/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{consulta.contactoNombre}</h3>
              <Badge className={etapaColors[consulta.etapa] || "bg-slate-100 text-slate-700"}>
                {consulta.etapa}
              </Badge>
              {esPosventa && (
                <Badge className="bg-emerald-600 text-white text-xs">Posventa</Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-1">{consulta.productoConsultado}</p>
            {consulta.variante && (
              <p className="text-xs text-slate-400">{consulta.variante}</p>
            )}
            {consulta.precioCotizado && (
              <p className="text-sm font-medium text-slate-900 mt-2">
                {consulta.moneda === "USD" ? "US$" : "$"} {consulta.precioCotizado.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className={`text-xs ${
                tipo === "vencido" ? "text-red-600 font-medium" : "text-slate-500"
              }`}>
                {moment(fechaMostrar).format("DD/MM/YYYY")}
                {tipo === "vencido" && " (vencido)"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Button
              size="sm"
              onClick={() => handleWhatsApp(consulta)}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarcarCompletado(consulta)}
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              {isLogistica ? "Seguimientos — Logística (GANADA)" : "Seguimientos del Día"}
            </h1>
            <p className="text-slate-500 mt-1">
              {today.format("dddd, DD [de] MMMM [de] YYYY")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{hoy.length}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{vencidos.length}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Próximos 3 días</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{proximos3d.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={vencidos.length > 0 ? "vencidos" : "hoy"}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vencidos" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Vencidos ({vencidos.length})
            </TabsTrigger>
            <TabsTrigger value="hoy" className="gap-2">
              <Calendar className="w-4 h-4" />
              Hoy ({hoy.length})
            </TabsTrigger>
            <TabsTrigger value="proximos" className="gap-2">
              Próximos ({proximos3d.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vencidos" className="space-y-3 mt-4">
            {vencidos.length > 0 ? (
              vencidos.map(c => <ConsultaItem key={c.id} consulta={c} tipo="vencido" />)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-slate-500">¡Excelente! No hay seguimientos vencidos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hoy" className="space-y-3 mt-4">
            {hoy.length > 0 ? (
              hoy.map(c => <ConsultaItem key={c.id} consulta={c} tipo="hoy" />)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay seguimientos programados para hoy</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="proximos" className="space-y-3 mt-4">
            {proximos3d.length > 0 ? (
              proximos3d.map(c => <ConsultaItem key={c.id} consulta={c} tipo="proximo" />)
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay seguimientos en los próximos 3 días</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <WhatsAppSender
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        consulta={selectedConsulta}
        onMessageSent={refetch}
      />
    </div>
  );
}