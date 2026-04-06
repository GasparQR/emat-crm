import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Eye, Search, Filter, DollarSign, TrendingUp, Package, Plus, Upload, Download } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { toast } from "sonner";
import { format } from "date-fns";
import VentaForm from "@/components/ventas/VentaForm";

const MARKETPLACES = ["WhatsApp", "Instagram", "MercadoLibre", "Local", "Otro"];

export default function Ventas() {
  const [search, setSearch] = useState("");
  const [filterMarketplace, setFilterMarketplace] = useState("Todos");
  const [filterProveedor, setFilterProveedor] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [showVentaForm, setShowVentaForm] = useState(false);

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas', workspace?.id],
    queryFn: () => workspace ? base44.entities.Venta.filter({ workspace_id: workspace.id }, "-fecha") : [],
    enabled: !!workspace
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores', workspace?.id],
    queryFn: () => workspace ? base44.entities.Proveedor.filter({ workspace_id: workspace.id }) : [],
    enabled: !!workspace
  });

  const proveedoresUnicos = ["Todos", ...new Set(ventas.map(v => v.proveedorNombreSnapshot).filter(Boolean))];

  const ventasFiltradas = ventas.filter(venta => {
    const matchSearch = !search || 
      venta.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      venta.nombreSnapshot?.toLowerCase().includes(search.toLowerCase()) ||
      venta.modelo?.toLowerCase().includes(search.toLowerCase()) ||
      venta.productoSnapshot?.toLowerCase().includes(search.toLowerCase());
    
    const matchMarketplace = filterMarketplace === "Todos" || venta.marketplace === filterMarketplace;
    const matchProveedor = filterProveedor === "Todos" || venta.proveedorNombreSnapshot === filterProveedor;
    const matchEstado = filterEstado === "Todos" || venta.estado === filterEstado;
    
    const matchFechaDesde = !fechaDesde || new Date(venta.fecha) >= new Date(fechaDesde);
    const matchFechaHasta = !fechaHasta || new Date(venta.fecha) <= new Date(fechaHasta);

    return matchSearch && matchMarketplace && matchProveedor && matchEstado && matchFechaDesde && matchFechaHasta;
  });

  // Ganancia del mes actual por moneda
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();
  const ventasMesActual = ventas.filter(v => {
    if (!v.fecha || v.estado !== "Finalizada") return false;
    const fechaVenta = new Date(v.fecha);
    return fechaVenta.getMonth() === mesActual && fechaVenta.getFullYear() === añoActual;
  });
  const gananciaMesUSD = ventasMesActual.filter(v => (v.moneda || 'USD') !== 'ARS').reduce((acc, v) => acc + (v.ganancia || 0), 0);
  const gananciaMesARS = ventasMesActual.filter(v => v.moneda === 'ARS').reduce((acc, v) => acc + (v.ganancia || 0), 0);

  // Ganancia total por moneda
  const totalGananciaUSD = ventasFiltradas.filter(v => (v.moneda || 'USD') !== 'ARS').reduce((acc, v) => acc + (v.ganancia || 0), 0);
  const totalGananciaARS = ventasFiltradas.filter(v => v.moneda === 'ARS').reduce((acc, v) => acc + (v.ganancia || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>
              <p className="text-slate-500">{ventasFiltradas.length} ventas registradas</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowVentaForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Venta
              </Button>
              <Link to={createPageUrl("ImportarVentas")}>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Importar
                </Button>
              </Link>
              <Link to={createPageUrl("ExportarVentas")}>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              </Link>
              <Link to={createPageUrl("VentasDashboard")}>
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Cantidad</p>
                  <p className="text-2xl font-bold">{ventasFiltradas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ganancia Mes Actual</p>
                  <p className="text-lg font-bold text-green-600">US$ {gananciaMesUSD.toFixed(2)}</p>
                  {gananciaMesARS > 0 && <p className="text-sm font-semibold text-blue-600">$ {gananciaMesARS.toLocaleString('es-AR', {minimumFractionDigits: 0})}</p>}
                  <p className="text-xs text-slate-500">{ventasMesActual.length} ventas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ganancia Total</p>
                  <p className="text-lg font-bold text-green-600">US$ {totalGananciaUSD.toFixed(2)}</p>
                  {totalGananciaARS > 0 && <p className="text-sm font-semibold text-blue-600">$ {totalGananciaARS.toLocaleString('es-AR', {minimumFractionDigits: 0})}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos los estados</SelectItem>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="Finalizada">Finalizada</SelectItem>
                  <SelectItem value="Anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMarketplace} onValueChange={setFilterMarketplace}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos los canales</SelectItem>
                  {MARKETPLACES.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterProveedor} onValueChange={setFilterProveedor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {proveedoresUnicos.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Desde"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Hasta"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Venta</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : ventasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                        No hay ventas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    ventasFiltradas.map(venta => {
                      const estadoColors = {
                        Borrador: "bg-amber-100 text-amber-700",
                        Finalizada: "bg-green-100 text-green-700",
                        Anulada: "bg-slate-100 text-slate-600"
                      };
                      
                      return (
                        <TableRow key={venta.id}>
                          <TableCell className="font-medium">{venta.codigo}</TableCell>
                          <TableCell>
                            <Badge className={estadoColors[venta.estado] || ""}>
                              {venta.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>{venta.fecha ? format(new Date(venta.fecha), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>{venta.nombreSnapshot}{venta.apellidoSnapshot && ` ${venta.apellidoSnapshot}`}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{venta.productoSnapshot || venta.modelo}</p>
                              {(venta.capacidad || venta.color) && (
                                <p className="text-xs text-slate-500">
                                  {[venta.capacidad, venta.color].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {venta.proveedorId ? (
                              <Link to={createPageUrl(`ProveedorDetalle?id=${venta.proveedorId}`)} className="hover:underline text-blue-600">
                                {venta.proveedorNombreSnapshot}
                              </Link>
                            ) : (
                              <span>{venta.proveedorNombreSnapshot || venta.proveedorTexto}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{venta.marketplace}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {venta.costo ? `${venta.moneda || 'USD'} ${venta.costo.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {venta.venta ? `${venta.moneda || 'USD'} ${venta.venta.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {venta.ganancia !== null && venta.ganancia !== undefined ? (
                              <span className={venta.ganancia >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                                {venta.moneda || 'USD'} {venta.ganancia.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">Pendiente</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link to={createPageUrl(`VentaDetalle?id=${venta.id}`)}>
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <VentaForm
          open={showVentaForm}
          onOpenChange={setShowVentaForm}
          consulta={null}
          onVentaCreada={() => {
            queryClient.invalidateQueries({ queryKey: ['ventas', workspace?.id] });
          }}
        />
      </div>
    </div>
  );
}