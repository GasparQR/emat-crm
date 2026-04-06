import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Search, Eye, Phone, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Proveedores() {
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("Todos");
  const [filterVerificado, setFilterVerificado] = useState("Todos");
  const [filterActivo, setFilterActivo] = useState("activos");

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['proveedores', workspace?.id],
    queryFn: () => workspace ? base44.entities.Proveedor.filter({ workspace_id: workspace.id }, "-created_date") : [],
    enabled: !!workspace
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ['ventas-proveedores', workspace?.id],
    queryFn: () => workspace ? base44.entities.Venta.filter({ workspace_id: workspace.id }) : [],
    enabled: !!workspace
  });

  const calcularMetricas = (proveedorId) => {
    const ventasProveedor = ventas.filter(v => v.proveedorId === proveedorId);
    const comprasCount = ventasProveedor.length;
    const totalComprado = ventasProveedor.reduce((acc, v) => acc + (v.costo || 0), 0);
    const gananciaTotal = ventasProveedor.reduce((acc, v) => acc + (v.ganancia || 0), 0);
    const ultimaCompra = ventasProveedor.length > 0 
      ? ventasProveedor.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0].fecha 
      : null;

    return { comprasCount, totalComprado, gananciaTotal, ultimaCompra };
  };

  const proveedoresFiltrados = proveedores.filter(p => {
    const matchSearch = !search || 
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.whatsapp?.includes(search);
    
    const matchCategoria = filterCategoria === "Todos" || p.categorias?.includes(filterCategoria);
    const matchVerificado = filterVerificado === "Todos" || 
      (filterVerificado === "verificados" && p.verificado) ||
      (filterVerificado === "no-verificados" && !p.verificado);
    const matchActivo = filterActivo === "todos" ||
      (filterActivo === "activos" && p.activo !== false) ||
      (filterActivo === "inactivos" && p.activo === false);

    return matchSearch && matchCategoria && matchVerificado && matchActivo;
  });

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
              <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
              <p className="text-slate-500">{proveedoresFiltrados.length} proveedores</p>
            </div>
            <Link to={createPageUrl("ProveedorDetalle?id=nuevo")}>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Proveedor
              </Button>
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Total Proveedores</p>
              <p className="text-2xl font-bold">{proveedores.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Verificados</p>
              <p className="text-2xl font-bold text-green-600">
                {proveedores.filter(p => p.verificado).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Activos</p>
              <p className="text-2xl font-bold">
                {proveedores.filter(p => p.activo !== false).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Con Compras</p>
              <p className="text-2xl font-bold text-blue-600">
                {proveedores.filter(p => calcularMetricas(p.id).comprasCount > 0).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar proveedor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas las categorías</SelectItem>
                  <SelectItem value="iPhone">iPhone</SelectItem>
                  <SelectItem value="Watch">Watch</SelectItem>
                  <SelectItem value="Mac">Mac</SelectItem>
                  <SelectItem value="iPad">iPad</SelectItem>
                  <SelectItem value="AirPods">AirPods</SelectItem>
                  <SelectItem value="Accesorios">Accesorios</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterVerificado} onValueChange={setFilterVerificado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="verificados">Verificados</SelectItem>
                  <SelectItem value="no-verificados">No verificados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterActivo} onValueChange={setFilterActivo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Categorías</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : proveedoresFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No hay proveedores
                      </TableCell>
                    </TableRow>
                  ) : (
                    proveedoresFiltrados.map(proveedor => {
                      const metricas = calcularMetricas(proveedor.id);
                      return (
                        <TableRow key={proveedor.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{proveedor.nombre}</p>
                              {proveedor.ciudad && (
                                <p className="text-xs text-slate-500">{proveedor.ciudad}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {proveedor.whatsapp && (
                                <p className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {proveedor.whatsapp}
                                </p>
                              )}
                              {proveedor.email && (
                                <p className="text-slate-500">{proveedor.email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {proveedor.categorias?.slice(0, 2).map(cat => (
                                <Badge key={cat} variant="secondary" className="text-xs">
                                  {cat}
                                </Badge>
                              ))}
                              {proveedor.categorias?.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{proveedor.categorias.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {proveedor.verificado && (
                                <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Verificado
                                </Badge>
                              )}
                              {proveedor.activo === false && (
                                <Badge variant="outline" className="text-xs">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-semibold">{metricas.comprasCount}</p>
                            <p className="text-xs text-slate-500">
                              US$ {metricas.totalComprado.toFixed(0)}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-semibold text-green-600">
                              US$ {metricas.gananciaTotal.toFixed(2)}
                            </p>
                          </TableCell>
                          <TableCell>
                            {metricas.ultimaCompra ? (
                              <p className="text-sm">
                                {format(new Date(metricas.ultimaCompra), 'dd/MM/yyyy')}
                              </p>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link to={createPageUrl(`ProveedorDetalle?id=${proveedor.id}`)}>
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
      </div>
    </div>
  );
}