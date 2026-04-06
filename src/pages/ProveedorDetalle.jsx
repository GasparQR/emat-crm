import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Trash2, MessageCircle, DollarSign, TrendingUp, Package, Mail, Phone, Globe, Instagram } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useWorkspace } from "@/components/context/WorkspaceContext";

const CATEGORIAS = ["iPhone", "Watch", "Mac", "iPad", "AirPods", "Accesorios", "General"];
const MONEDAS = ["USD", "ARS", "USDT"];
const METODOS_PAGO = ["Efectivo", "Transferencia", "USDT", "Tarjeta", "Otro"];

export default function ProveedorDetalle() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const proveedorId = params.get("id");
  const esNuevo = proveedorId === "nuevo";

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const [formData, setFormData] = useState({
    nombre: "",
    contactoNombre: "",
    whatsapp: "",
    telefono: "",
    email: "",
    instagram: "",
    web: "",
    ciudad: "",
    pais: "",
    categorias: [],
    monedas: [],
    metodosPago: [],
    tiempoEntrega: "",
    garantiaNotas: "",
    condiciones: "",
    verificado: false,
    activo: true,
    notas: ""
  });

  const { data: proveedor, isLoading } = useQuery({
    queryKey: ['proveedor', proveedorId],
    queryFn: () => base44.entities.Proveedor.filter({ id: proveedorId }),
    select: (data) => data[0],
    enabled: !esNuevo
  });

  const { data: ventas = [] } = useQuery({
    queryKey: ['ventas-proveedor', proveedorId],
    queryFn: () => base44.entities.Venta.filter({ proveedorId }),
    enabled: !esNuevo
  });

  useEffect(() => {
    if (proveedor) {
      setFormData(proveedor);
    }
  }, [proveedor]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (esNuevo) {
        return base44.entities.Proveedor.create({ ...data, workspace_id: workspace?.id });
      }
      return base44.entities.Proveedor.update(proveedorId, data);
    },
    onSuccess: (data) => {
      toast.success(esNuevo ? "Proveedor creado" : "Proveedor actualizado");
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      if (esNuevo && data?.id) {
        window.location.href = createPageUrl(`ProveedorDetalle?id=${data.id}`);
      }
    },
    onError: (err) => {
      toast.error("Error al guardar: " + (err?.message || "Intenta de nuevo"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Proveedor.delete(proveedorId),
    onSuccess: () => {
      toast.success("Proveedor eliminado");
      window.location.href = createPageUrl("Proveedores");
    }
  });

  const handleSubmit = () => {
    if (!formData.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }
    saveMutation.mutate(formData);
  };

  const toggleCategoria = (cat) => {
    const categorias = formData.categorias || [];
    if (categorias.includes(cat)) {
      setFormData({ ...formData, categorias: categorias.filter(c => c !== cat) });
    } else {
      setFormData({ ...formData, categorias: [...categorias, cat] });
    }
  };

  const toggleMoneda = (mon) => {
    const monedas = formData.monedas || [];
    if (monedas.includes(mon)) {
      setFormData({ ...formData, monedas: monedas.filter(m => m !== mon) });
    } else {
      setFormData({ ...formData, monedas: [...monedas, mon] });
    }
  };

  const toggleMetodoPago = (met) => {
    const metodosPago = formData.metodosPago || [];
    if (metodosPago.includes(met)) {
      setFormData({ ...formData, metodosPago: metodosPago.filter(m => m !== met) });
    } else {
      setFormData({ ...formData, metodosPago: [...metodosPago, met] });
    }
  };

  const metricas = {
    comprasCount: ventas.length,
    totalComprado: ventas.reduce((acc, v) => acc + (v.costo || 0), 0),
    totalVendido: ventas.reduce((acc, v) => acc + (v.venta || 0), 0),
    gananciaTotal: ventas.reduce((acc, v) => acc + (v.ganancia || 0), 0),
    ultimaCompra: ventas.length > 0
      ? ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0].fecha
      : null
  };

  const margenPromedio = metricas.totalVendido > 0
    ? (metricas.gananciaTotal / metricas.totalVendido * 100)
    : 0;

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return "";
    return phone.replace(/[^\d]/g, "");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link to={createPageUrl("Proveedores")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Proveedores
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {esNuevo ? "Nuevo Proveedor" : formData.nombre}
              </h1>
              {!esNuevo && (
                <p className="text-slate-500">ID: {proveedorId}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!esNuevo && formData.whatsapp && (
                <a
                  href={`https://api.whatsapp.com/send?phone=${formatWhatsAppNumber(formData.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2 bg-[#25D366] text-white hover:bg-[#20bd5a]">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
              <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
              {!esNuevo && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("¿Eliminar este proveedor?")) {
                      deleteMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Métricas */}
        {!esNuevo && (
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-slate-600">Compras</p>
                    <p className="text-2xl font-bold">{metricas.comprasCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-sm text-slate-600">Total Comprado</p>
                    <p className="text-xl font-bold">US$ {metricas.totalComprado.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-slate-600">Ganancia</p>
                    <p className="text-xl font-bold text-green-600">US$ {metricas.gananciaTotal.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-slate-600">Margen Promedio</p>
                  <p className="text-2xl font-bold">{margenPromedio.toFixed(1)}%</p>
                  {metricas.ultimaCompra && (
                    <p className="text-xs text-slate-500 mt-1">
                      Última: {format(new Date(metricas.ultimaCompra), 'dd/MM/yy')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del Proveedor *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Apple Premium Store"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre de Contacto</Label>
                <Input
                  value={formData.contactoNombre}
                  onChange={(e) => setFormData({ ...formData, contactoNombre: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </Label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+5491112345678"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contacto@proveedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@usuario"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Sitio Web
              </Label>
              <Input
                value={formData.web}
                onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  placeholder="Buenos Aires"
                />
              </div>
              <div className="space-y-2">
                <Label>País</Label>
                <Input
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  placeholder="Argentina"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorías y Condiciones */}
        <Card>
          <CardHeader>
            <CardTitle>Productos y Condiciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Categorías de Productos</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map(cat => (
                  <Badge
                    key={cat}
                    variant={formData.categorias?.includes(cat) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategoria(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monedas que Acepta</Label>
              <div className="flex gap-2">
                {MONEDAS.map(mon => (
                  <Badge
                    key={mon}
                    variant={formData.monedas?.includes(mon) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleMoneda(mon)}
                  >
                    {mon}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Métodos de Pago</Label>
              <div className="flex flex-wrap gap-2">
                {METODOS_PAGO.map(met => (
                  <Badge
                    key={met}
                    variant={formData.metodosPago?.includes(met) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleMetodoPago(met)}
                  >
                    {met}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tiempo de Entrega</Label>
              <Input
                value={formData.tiempoEntrega}
                onChange={(e) => setFormData({ ...formData, tiempoEntrega: e.target.value })}
                placeholder="24-48hs, En tránsito..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notas sobre Garantía</Label>
              <Textarea
                value={formData.garantiaNotas}
                onChange={(e) => setFormData({ ...formData, garantiaNotas: e.target.value })}
                placeholder="Garantía de 6 meses..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Condiciones Comerciales</Label>
              <Textarea
                value={formData.condiciones}
                onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                placeholder="Descuento por volumen, pago al contado..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Estado y Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Estado y Notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Proveedor Verificado</Label>
                <p className="text-sm text-slate-500">Marca si el proveedor es confiable</p>
              </div>
              <Switch
                checked={formData.verificado}
                onCheckedChange={(checked) => setFormData({ ...formData, verificado: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Activo</Label>
                <p className="text-sm text-slate-500">Desmarca para ocultar de listados</p>
              </div>
              <Switch
                checked={formData.activo !== false}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas Internas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observaciones, historial, etc..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ventas Asociadas */}
        {!esNuevo && ventas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ventas Asociadas ({ventas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Venta</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.slice(0, 10).map(venta => (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">{venta.codigo}</TableCell>
                      <TableCell>{format(new Date(venta.fecha), 'dd/MM/yy')}</TableCell>
                      <TableCell>{venta.modelo}</TableCell>
                      <TableCell className="text-right">US$ {venta.costo?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">US$ {venta.venta?.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        US$ {venta.ganancia?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {ventas.length > 10 && (
                <p className="text-sm text-slate-500 mt-4 text-center">
                  Mostrando 10 de {ventas.length} ventas
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
