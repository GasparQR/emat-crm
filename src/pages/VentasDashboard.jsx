import { crm } from "@/api/crmClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, TrendingUp, Package, ShoppingBag } from "lucide-react";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function VentasDashboard() {
  const { workspace } = useWorkspace();

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas', workspace?.id],
    queryFn: () => workspace ? crm.entities.Venta.filter({ workspace_id: workspace.id }, "-created_date") : [],
    enabled: !!workspace
  });

  // Solo ventas en USD/USDT (excluir ARS)
  const ventasUSD = ventas.filter(v => (v.moneda || 'USD') !== 'ARS');
  const ventasARS = ventas.filter(v => v.moneda === 'ARS');

  // KPIs Generales (USD)
  const totalVentasUSD = ventasUSD.reduce((acc, v) => acc + (v.venta || 0), 0);
  const totalGananciaUSD = ventasUSD.reduce((acc, v) => acc + (v.ganancia || 0), 0);
  const totalGananciaARS = ventasARS.reduce((acc, v) => acc + (v.ganancia || 0), 0);
  const cantidadVentas = ventas.length;
  const gananciaPromedioUSD = ventasUSD.length > 0 ? totalGananciaUSD / ventasUSD.length : 0;

  // Ganancia por Proveedor (solo USD)
  const gananciasPorProveedor = ventasUSD.reduce((acc, venta) => {
    if (!venta.proveedorNombreSnapshot) return acc;
    if (!acc[venta.proveedorNombreSnapshot]) {
      acc[venta.proveedorNombreSnapshot] = 0;
    }
    acc[venta.proveedorNombreSnapshot] += venta.ganancia || 0;
    return acc;
  }, {});

  const dataProveedores = Object.entries(gananciasPorProveedor)
    .map(([proveedor, ganancia]) => ({ proveedor, ganancia }))
    .sort((a, b) => b.ganancia - a.ganancia);

  // Ventas por Canal (cantidad solamente, sin mezclar montos)
  const ventasPorCanal = ventas.reduce((acc, venta) => {
    const canal = venta.marketplace || "Otro";
    if (!acc[canal]) {
      acc[canal] = { cantidad: 0, montoUSD: 0, montoARS: 0 };
    }
    acc[canal].cantidad += 1;
    if ((venta.moneda || 'USD') !== 'ARS') {
      acc[canal].montoUSD += venta.venta || 0;
    } else {
      acc[canal].montoARS += venta.venta || 0;
    }
    return acc;
  }, {});

  const dataCanales = Object.entries(ventasPorCanal)
    .map(([canal, data]) => ({ canal, cantidad: data.cantidad, montoUSD: data.montoUSD, montoARS: data.montoARS }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Top Modelos
  const ventasPorModelo = ventas.reduce((acc, venta) => {
    const modelo = venta.modelo || "Sin especificar";
    if (!acc[modelo]) {
      acc[modelo] = 0;
    }
    acc[modelo] += 1;
    return acc;
  }, {});

  const topModelos = Object.entries(ventasPorModelo)
    .map(([modelo, cantidad]) => ({ modelo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link to={createPageUrl("Ventas")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Ventas
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard de Ventas</h1>
          <p className="text-slate-500">Métricas y reportes</p>
        </div>

        {/* KPIs Principales */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ventas</p>
                  <p className="text-3xl font-bold">{cantidadVentas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Ventas</p>
                  <p className="text-2xl font-bold">US$ {totalVentasUSD.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ganancia Total</p>
                  <p className="text-2xl font-bold text-green-600">US$ {totalGananciaUSD.toFixed(2)}</p>
                  {totalGananciaARS > 0 && <p className="text-sm font-semibold text-blue-600">$ {totalGananciaARS.toLocaleString('es-AR', {minimumFractionDigits: 0})} ARS</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ganancia Promedio (USD)</p>
                  <p className="text-2xl font-bold">US$ {gananciaPromedioUSD.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos y Tablas */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Ganancia por Proveedor */}
          <Card>
            <CardHeader>
              <CardTitle>Ganancia por Proveedor</CardTitle>
            </CardHeader>
            <CardContent>
              {dataProveedores.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dataProveedores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="proveedor" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="ganancia" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-500 py-12">No hay datos disponibles</p>
              )}
            </CardContent>
          </Card>

          {/* Ventas por Canal */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataCanales.map(item => (
                  <div key={item.canal} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{item.canal}</Badge>
                      <span className="text-sm text-slate-600">{item.cantidad} ventas</span>
                    </div>
                    <span className="font-semibold">
                       {item.montoUSD > 0 && <span className="text-green-700">US$ {item.montoUSD.toFixed(2)}</span>}
                       {item.montoARS > 0 && <span className="text-blue-600 ml-1">$ {item.montoARS.toLocaleString('es-AR', {minimumFractionDigits: 0})}</span>}
                     </span>
                  </div>
                ))}
                {dataCanales.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No hay datos disponibles</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Modelos */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Modelos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topModelos.map((item, idx) => (
                  <div key={item.modelo} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                        {idx + 1}
                      </div>
                      <span className="font-medium">{item.modelo}</span>
                    </div>
                    <Badge>{item.cantidad} ventas</Badge>
                  </div>
                ))}
                {topModelos.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No hay datos disponibles</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumen Proveedores */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Proveedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {dataProveedores.map(item => (
                  <div key={item.proveedor} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="font-medium">{item.proveedor}</span>
                    <span className="text-green-600 font-semibold">US$ {item.ganancia.toFixed(2)} USD</span>
                  </div>
                ))}
                {dataProveedores.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No hay datos disponibles</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}