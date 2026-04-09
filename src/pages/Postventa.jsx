import { useState, useMemo } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, CheckCircle2, AlertCircle, Calendar, ArrowLeft, Phone, Pencil, Clock, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";
import { toast } from "sonner";
import PostventaWhatsAppSender from "@/components/crm/PostventaWhatsAppSender";
import { cn } from "@/lib/utils";

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const d = result.getDay();
    if (d !== 0 && d !== 6) added++;
  }
  return result.toISOString().split('T')[0];
}

export default function Postventa() {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [editingVenta, setEditingVenta] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [filtroMarketplace, setFiltroMarketplace] = useState("todos");
  const [showActivarDialog, setShowActivarDialog] = useState(false);
  const [activarVentaId, setActivarVentaId] = useState(null);
  const [activarFecha, setActivarFecha] = useState("");

  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();

  const postventaDays = currentUser?.postventa_follow_up_days ?? 7;

  const { data: ventasFinalizadas = [], isLoading } = useQuery({
    queryKey: ['ventas-postventa', workspace?.id],
    queryFn: () => workspace
      ? entities.Venta.filter({ workspace_id: workspace.id, estado: "Finalizada" }, "-fecha", 500)
      : [],
    enabled: !!workspace
  });

  const ventas = ventasFinalizadas.filter(v => v.postventaActiva === true);
  const ventasSinPostventa = ventasFinalizadas.filter(v => !v.postventaActiva);

  const { data: contactos = [] } = useQuery({
    queryKey: ['contactos-postventa-map', workspace?.id],
    queryFn: () => workspace ? entities.Contacto.filter({ workspace_id: workspace.id }) : [],
    enabled: !!workspace
  });

  const contactosMap = useMemo(() =>
    Object.fromEntries(contactos.map(c => [c.id, c])),
    [contactos]
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Venta.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ventas-postventa', workspace?.id] })
  });

  const today = moment();

  const getWhatsApp = (venta) => {
    if (venta.contactoId && contactosMap[venta.contactoId]?.whatsapp) {
      return contactosMap[venta.contactoId].whatsapp;
    }
    const contactoPorNombre = contactos.find(c =>
      c.nombre && venta.nombreSnapshot &&
      venta.nombreSnapshot.toLowerCase().includes(c.nombre.toLowerCase())
    );
    return contactoPorNombre?.whatsapp || null;
  };

  const esCerrado = (v) => v.postventaEstado === "Cerrado";

  const ventasFiltradas = ventas.filter(v => {
    if (filtroMarketplace !== "todos" && v.marketplace !== filtroMarketplace) return false;
    return true;
  });

  const vencidas = ventasFiltradas.filter(v =>
    !esCerrado(v) &&
    v.proximoSeguimientoPostventa &&
    moment(v.proximoSeguimientoPostventa).isBefore(today, 'day')
  );

  const deHoy = ventasFiltradas.filter(v =>
    !esCerrado(v) &&
    v.proximoSeguimientoPostventa &&
    moment(v.proximoSeguimientoPostventa).isSame(today, 'day')
  );

  const proximas7d = ventasFiltradas.filter(v =>
    !esCerrado(v) &&
    v.proximoSeguimientoPostventa &&
    moment(v.proximoSeguimientoPostventa).isAfter(today, 'day') &&
    moment(v.proximoSeguimientoPostventa).isBefore(today.clone().add(7, 'days'), 'day')
  );

  const handleWhatsApp = (venta) => {
    setSelectedVenta(venta);
    setShowWhatsApp(true);
  };

  // UN SOLO PASO: marcar contacto realizado = cerrar postventa
  const handleMarcarRealizado = async (venta) => {
    await updateMutation.mutateAsync({
      id: venta.id,
      data: {
        postventaUltimoContacto: new Date().toISOString(),
        postventaEstado: "Cerrado",
        postventaActiva: false,
      }
    });
    toast.success("✅ Postventa completada. Proceso de venta finalizado.");
  };

  const handleEditarFecha = (venta) => {
    setEditingVenta(venta);
    setEditDate(venta.proximoSeguimientoPostventa || "");
  };

  const handleGuardarFecha = async () => {
    await updateMutation.mutateAsync({ id: editingVenta.id, data: { proximoSeguimientoPostventa: editDate } });
    toast.success("Fecha actualizada");
    setEditingVenta(null);
  };

  const handleActivarPostventa = async () => {
    if (!activarVentaId || !activarFecha) return;
    await updateMutation.mutateAsync({
      id: activarVentaId,
      data: {
        postventaActiva: true,
        postventaEstado: "Pendiente",
        proximoSeguimientoPostventa: activarFecha,
      }
    });
    toast.success("Postventa activada");
    setShowActivarDialog(false);
    setActivarVentaId(null);
    setActivarFecha("");
  };

  const defaultTab = vencidas.length > 0 ? "vencidas" : deHoy.length > 0 ? "hoy" : "proximas";

  const renderTable = (rows, emptyMsg) => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold">Producto</TableHead>
            <TableHead className="font-semibold">Fecha Venta</TableHead>
            <TableHead className="font-semibold">Ganancia</TableHead>
            <TableHead className="font-semibold">Seguimiento</TableHead>
            <TableHead className="font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? rows.map(venta => {
            const whatsapp = getWhatsApp(venta);
            const vencido = !esCerrado(venta) &&
              venta.proximoSeguimientoPostventa &&
              moment(venta.proximoSeguimientoPostventa).isBefore(today, 'day');

            return (
              <TableRow key={venta.id} className={cn(vencido ? "bg-red-50/40" : "")}>
                <TableCell>
                  <p className="font-medium text-slate-900">{venta.nombreSnapshot}</p>
                  {whatsapp
                    ? <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{whatsapp}</p>
                    : <p className="text-xs text-amber-500 mt-0.5">Sin WhatsApp</p>
                  }
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{venta.productoSnapshot || venta.modelo || "-"}</p>
                  {venta.marketplace && <p className="text-xs text-slate-400">{venta.marketplace}</p>}
                </TableCell>
                <TableCell>
                  <p className="text-sm">{venta.fecha ? moment(venta.fecha).format("DD/MM/YY") : "-"}</p>
                </TableCell>
                <TableCell>
                  {venta.ganancia != null
                    ? <p className={cn("font-semibold text-sm", venta.ganancia >= 0 ? "text-emerald-600" : "text-red-600")}>{venta.moneda} {venta.ganancia.toFixed(0)}</p>
                    : <span className="text-slate-400">-</span>
                  }
                </TableCell>
                <TableCell>
                  {venta.proximoSeguimientoPostventa ? (
                    <div className={cn("flex items-center gap-1 text-sm", vencido ? "text-red-600 font-medium" : "text-slate-600")}>
                      <Calendar className="w-3.5 h-3.5" />
                      {moment(venta.proximoSeguimientoPostventa).format("DD/MM/YY")}
                      {vencido && <span className="text-xs ml-1">(vencido)</span>}
                    </div>
                  ) : <span className="text-slate-400">-</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleWhatsApp(venta)}
                      disabled={!whatsapp}
                      className="bg-[#25D366] hover:bg-[#20bd5a] text-white h-8 w-8 p-0"
                      title={!whatsapp ? "Sin WhatsApp" : "Enviar WhatsApp"}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMarcarRealizado(venta)}
                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Realizado
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditarFecha(venta)}
                      className="h-8 w-8 p-0"
                      title="Cambiar fecha"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-slate-400">{emptyMsg}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Postventa</h1>
          <p className="text-slate-500">Un contacto por venta — marcarlo como realizado cierra el proceso.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <p className="text-sm text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Vencidos</p>
              <p className="text-3xl font-bold text-red-600">{vencidas.length}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <p className="text-sm text-amber-600 font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Para hoy</p>
              <p className="text-3xl font-bold text-amber-600">{deHoy.length}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <p className="text-sm text-blue-600 font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Próximos 7 días</p>
              <p className="text-3xl font-bold text-blue-600">{proximas7d.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtro */}
        <div className="flex gap-3">
          <Select value={filtroMarketplace} onValueChange={setFiltroMarketplace}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Marketplace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los canales</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="MercadoLibre">MercadoLibre</SelectItem>
              <SelectItem value="Local">Local</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="vencidas" className="gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Vencidos ({vencidas.length})
            </TabsTrigger>
            <TabsTrigger value="hoy" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Hoy ({deHoy.length})
            </TabsTrigger>
            <TabsTrigger value="proximas">Próximos 7 días ({proximas7d.length})</TabsTrigger>
            <TabsTrigger value="todos">Todos ({ventasFiltradas.length})</TabsTrigger>
            {ventasSinPostventa.length > 0 && (
              <TabsTrigger value="sin-postventa" className="text-amber-600">
                Sin activar ({ventasSinPostventa.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="vencidas" className="mt-4">
            {renderTable(vencidas, "¡No hay seguimientos vencidos!")}
          </TabsContent>
          <TabsContent value="hoy" className="mt-4">
            {renderTable(deHoy, "No hay seguimientos para hoy.")}
          </TabsContent>
          <TabsContent value="proximas" className="mt-4">
            {renderTable(proximas7d, "No hay seguimientos en los próximos 7 días.")}
          </TabsContent>
          <TabsContent value="todos" className="mt-4">
            {renderTable(ventasFiltradas, "No hay ventas con postventa activa.")}
          </TabsContent>

          {ventasSinPostventa.length > 0 && (
            <TabsContent value="sin-postventa" className="mt-4">
              <Card>
                <div className="p-4 border-b bg-amber-50">
                  <p className="text-sm text-amber-700 font-medium">
                    Ventas finalizadas sin postventa activada. Podés activarlas manualmente.
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Fecha Venta</TableHead>
                      <TableHead>Ganancia</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventasSinPostventa.map(venta => (
                      <TableRow key={venta.id}>
                        <TableCell><p className="font-medium">{venta.nombreSnapshot}</p></TableCell>
                        <TableCell><p className="text-sm">{venta.productoSnapshot || venta.modelo || "-"}</p></TableCell>
                        <TableCell><p className="text-sm">{venta.fecha ? moment(venta.fecha).format("DD/MM/YY") : "-"}</p></TableCell>
                        <TableCell>
                          {venta.ganancia != null
                            ? <p className="font-semibold text-sm text-emerald-600">{venta.moneda} {venta.ganancia.toFixed(0)}</p>
                            : <span className="text-slate-400">-</span>
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="gap-1.5"
                            onClick={() => {
                              setActivarVentaId(venta.id);
                              setActivarFecha(addBusinessDays(venta.fecha || new Date(), postventaDays));
                              setShowActivarDialog(true);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" /> Activar Postventa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <PostventaWhatsAppSender
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        venta={selectedVenta}
        contactoWhatsapp={selectedVenta ? getWhatsApp(selectedVenta) : null}
        workspaceId={workspace?.id}
        onMessageSent={() => queryClient.invalidateQueries({ queryKey: ['ventas-postventa', workspace?.id] })}
      />

      <Dialog open={!!editingVenta} onOpenChange={open => !open && setEditingVenta(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar fecha de seguimiento</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Próximo seguimiento</Label>
            <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVenta(null)}>Cancelar</Button>
            <Button onClick={handleGuardarFecha}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showActivarDialog} onOpenChange={setShowActivarDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Activar Postventa</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Fecha del seguimiento</Label>
            <Input type="date" value={activarFecha} onChange={e => setActivarFecha(e.target.value)} />
            <p className="text-xs text-slate-500">Calculado en base a {postventaDays} días hábiles desde la venta.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivarDialog(false)}>Cancelar</Button>
            <Button onClick={handleActivarPostventa}>Activar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}