import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Plus, Search, MessageCircle, Calendar, CheckCircle2, XCircle,
  MoreHorizontal, ArrowUpDown, ArrowLeft, Trash2, ListCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import ConsultaForm from "@/components/crm/ConsultaForm";
import WhatsAppSender from "@/components/crm/WhatsAppSender";
import DetalleConsultaDialog from "@/components/crm/DetalleConsultaDialog";
import DialogSelectorListasWhatsApp from "@/components/crm/DialogSelectorListasWhatsApp";
import VentaForm from "@/components/ventas/VentaForm";
import { toast } from "sonner";

const CANALES = ["Instagram", "WhatsApp", "MercadoLibre", "Referido", "Local", "Otro"];

const prioridadColors = {
  Alta: "bg-red-50 text-red-700 border-red-200",
  Media: "bg-amber-50 text-amber-700 border-amber-200",
  Baja: "bg-slate-50 text-slate-600 border-slate-200"
};

export default function Consultas() {
  const [showForm, setShowForm] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [showListasDialog, setShowListasDialog] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [showVentaForm, setShowVentaForm] = useState(false);
  const [consultaParaVenta, setConsultaParaVenta] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("todas");
  const [filtroCanal, setFiltroCanal] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [sortField, setSortField] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");

  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { workspace } = useWorkspace();

  // Cargar TODAS las consultas (sin límite artificial)
  const { data: consultas = [], refetch, isLoading } = useQuery({
    queryKey: ['consultas-list', workspace?.id],
    queryFn: () => workspace
      ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 2000)
      : [],
    enabled: !!workspace
  });

  // Cargar etapas activas del pipeline dinámicamente
  const { data: etapasActivas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await base44.entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Consulta.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas-list', workspace?.id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Consulta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas-list', workspace?.id] });
      toast.success("Consulta eliminada");
    }
  });

  // Colores dinámicos por etapa
  const getEtapaColor = (etapaNombre) => {
    const etapa = etapasActivas.find(e => e.nombre === etapaNombre);
    const colorMap = {
      "bg-blue-500": "bg-blue-100 text-blue-700",
      "bg-cyan-500": "bg-cyan-100 text-cyan-700",
      "bg-amber-500": "bg-amber-100 text-amber-700",
      "bg-orange-500": "bg-orange-100 text-orange-700",
      "bg-purple-500": "bg-purple-100 text-purple-700",
      "bg-emerald-500": "bg-emerald-100 text-emerald-700",
      "bg-slate-400": "bg-slate-100 text-slate-600",
      "bg-red-500": "bg-red-100 text-red-700",
      "bg-green-500": "bg-green-100 text-green-700",
    };
    if (etapa?.color) return colorMap[etapa.color] || "bg-slate-100 text-slate-700";
    // fallback para etapas sin color configurado
    return "bg-slate-100 text-slate-700";
  };

  // Filtrar y ordenar
  const consultasFiltradas = consultas
    .filter(c => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!c.contactoNombre?.toLowerCase().includes(searchLower) &&
            !c.contactoWhatsapp?.includes(search) &&
            !c.productoConsultado?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (filtroEtapa !== "todas" && c.etapa !== filtroEtapa) return false;
      if (filtroCanal !== "todos" && c.canalOrigen !== filtroCanal) return false;
      if (filtroPrioridad !== "todas" && c.prioridad !== filtroPrioridad) return false;
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "precioCotizado") {
        valA = valA || 0;
        valB = valB || 0;
      }
      if (sortOrder === "desc") {
        return valA > valB ? -1 : 1;
      }
      return valA < valB ? -1 : 1;
    });

  const handleWhatsApp = (consulta) => {
    setSelectedConsulta(consulta);
    setShowWhatsApp(true);
  };

  const handleEdit = (consulta) => {
    setSelectedConsulta(consulta);
    setShowForm(true);
  };

  const handleMarcarConcretado = async (consulta) => {
    const ventasExistentes = await base44.entities.Venta.filter({ consultaId: consulta.id });
    if (ventasExistentes.length > 0) {
      const ventaExistente = ventasExistentes[0];
      window.location.href = createPageUrl(`VentaDetalle?id=${ventaExistente.id}`);
      return;
    }
    setConsultaParaVenta(consulta);
    setShowVentaForm(true);
  };

  const handleMarcarPerdido = async (consulta, motivo) => {
    await updateMutation.mutateAsync({
      id: consulta.id,
      data: { etapa: "Perdido", motivoPerdida: motivo }
    });
    toast.success("Marcado como perdido");
  };

  const handleSeguimiento = async (consulta, dias) => {
    const fecha = moment().add(dias, 'days').format("YYYY-MM-DD");
    await updateMutation.mutateAsync({
      id: consulta.id,
      data: { proximoSeguimiento: fecha }
    });
    toast.success(`Seguimiento agendado para ${moment(fecha).format("DD/MM")}`);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link to={createPageUrl("Home")}>
                <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Consultas</h1>
              <p className="text-slate-500">
                {isLoading ? "Cargando..." : `${consultasFiltradas.length} de ${consultas.length} consultas`}
              </p>
            </div>
            {currentUser?.canEditContacts && (
              <Button onClick={() => { setSelectedConsulta(null); setShowForm(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva consulta
              </Button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro de etapas DINÁMICO desde el pipeline activo */}
            <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las etapas</SelectItem>
                {etapasActivas.map(etapa => (
                  <SelectItem key={etapa.nombre} value={etapa.nombre}>
                    {etapa.nombre}
                  </SelectItem>
                ))}
                {/* Siempre incluir Perdido como opción especial */}
                {!etapasActivas.find(e => e.nombre === "Perdido") && (
                  <SelectItem value="Perdido">Perdido</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={filtroCanal} onValueChange={setFiltroCanal}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los canales</SelectItem>
                {CANALES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Producto</TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort("precioCotizado")}
                >
                  <div className="flex items-center gap-1">
                    Precio
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold">Etapa</TableHead>
                <TableHead className="font-semibold">Seguimiento</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    Cargando consultas...
                  </TableCell>
                </TableRow>
              ) : (
                consultasFiltradas.map(consulta => {
                  const seguimientoVencido = consulta.proximoSeguimiento &&
                    moment(consulta.proximoSeguimiento).isBefore(moment(), 'day');

                  return (
                    <TableRow
                      key={consulta.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => {
                        setSelectedConsulta(consulta);
                        setShowDetalleDialog(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{consulta.contactoNombre}</p>
                          <p className="text-sm text-slate-500">{consulta.contactoWhatsapp}</p>
                          <div className="flex gap-1 mt-1">
                            {consulta.canalOrigen && (
                              <Badge variant="secondary" className="text-xs">
                                {consulta.canalOrigen}
                              </Badge>
                            )}
                            <Badge variant="outline" className={cn("text-xs", prioridadColors[consulta.prioridad])}>
                              {consulta.prioridad}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{consulta.productoConsultado}</p>
                        {consulta.variante && (
                          <p className="text-sm text-slate-500">{consulta.variante}</p>
                        )}
                        {consulta.categoriaProducto && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {consulta.categoriaProducto}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {consulta.precioCotizado ? (
                          <p className="font-bold">
                            {consulta.moneda === "USD" ? "US$" : "$"} {consulta.precioCotizado.toLocaleString()}
                          </p>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEtapaColor(consulta.etapa)}>
                          {consulta.etapa}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {consulta.proximoSeguimiento ? (
                          <div className={cn(
                            "flex items-center gap-1 text-sm",
                            seguimientoVencido ? "text-red-600" : "text-slate-600"
                          )}>
                            <Calendar className="w-3.5 h-3.5" />
                            {moment(consulta.proximoSeguimiento).format("DD/MM")}
                            {seguimientoVencido && <span className="text-xs">(vencido)</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {currentUser?.canSendMessages && (
                            <Button
                              size="sm"
                              onClick={() => handleWhatsApp(consulta)}
                              className="bg-[#25D366] hover:bg-[#20bd5a] text-white h-8 w-8 p-0"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConsulta(consulta);
                                setShowListasDialog(true);
                              }}>
                                <ListCheck className="w-4 h-4 mr-2" />
                                Enviar Lista WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSeguimiento(consulta, 1)}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Seguimiento mañana
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSeguimiento(consulta, 3)}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Seguimiento en 3 días
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSeguimiento(consulta, 7)}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Seguimiento en 1 semana
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleMarcarConcretado(consulta)}
                                className="text-emerald-600"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Marcar concretado
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleMarcarPerdido(consulta, "Caro")}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Perdido - Caro
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMarcarPerdido(consulta, "NoResponde")}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Perdido - No responde
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMarcarPerdido(consulta, "ComproOtro")}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Perdido - Compró otro
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (window.confirm("¿Estás seguro de eliminar esta consulta?")) {
                                    deleteMutation.mutate(consulta.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar consulta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {!isLoading && consultasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    No hay consultas que coincidan con los filtros
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConsultaForm
        open={showForm}
        onOpenChange={setShowForm}
        consulta={selectedConsulta}
        onSave={() => {
          refetch();
          setSelectedConsulta(null);
        }}
      />

      <WhatsAppSender
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        consulta={selectedConsulta}
        onMessageSent={refetch}
      />

      <DetalleConsultaDialog
        consulta={selectedConsulta}
        open={showDetalleDialog}
        onOpenChange={setShowDetalleDialog}
        onSave={refetch}
      />

      <DialogSelectorListasWhatsApp
        open={showListasDialog}
        onOpenChange={setShowListasDialog}
        contactoId={selectedConsulta?.contactoId}
        contactoWhatsapp={selectedConsulta?.contactoWhatsapp}
        consultaId={selectedConsulta?.id}
        onMessageSent={refetch}
      />

      <VentaForm
        open={showVentaForm}
        onOpenChange={setShowVentaForm}
        consulta={consultaParaVenta}
        onVentaCreada={async () => {
          await updateMutation.mutateAsync({
            id: consultaParaVenta.id,
            data: { concretado: true, etapa: "Concretado" }
          });
          setShowVentaForm(false);
          setConsultaParaVenta(null);
          toast.success("¡Venta registrada!");
        }}
      />
    </div>
  );
}
