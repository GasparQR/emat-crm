import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, User, Phone, Package, DollarSign, XCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import VentaForm from "@/components/ventas/VentaForm";

export default function VentaDetalle() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const ventaId = params.get("id");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [showEditForm, setShowEditForm] = useState(false);

  const { data: venta, isLoading } = useQuery({
    queryKey: ['venta', ventaId],
    queryFn: () => base44.entities.Venta.filter({ id: ventaId }),
    select: (data) => data[0],
    enabled: !!ventaId
  });

  const { data: contacto } = useQuery({
    queryKey: ['contacto', venta?.contactoId],
    queryFn: () => base44.entities.Contacto.filter({ id: venta.contactoId }),
    select: (data) => data[0],
    enabled: !!venta?.contactoId
  });

  const { data: consulta } = useQuery({
    queryKey: ['consulta', venta?.consultaId],
    queryFn: () => base44.entities.Consulta.filter({ id: venta.consultaId }),
    select: (data) => data[0],
    enabled: !!venta?.consultaId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Venta.delete(id),
    onSuccess: () => {
      toast.success("Venta eliminada");
      window.location.href = createPageUrl("Ventas");
    }
  });

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.Venta.update(id, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venta', ventaId] });
      toast.success("Estado actualizado");
    }
  });

  const handleFinalizar = async () => {
    if (!venta.venta || !venta.costo) {
      toast.error("Completa costo y precio de venta antes de finalizar");
      setShowEditForm(true);
      return;
    }
    if (!venta.proveedorId && !venta.proveedorTexto) {
      toast.error("Completa el proveedor antes de finalizar");
      setShowEditForm(true);
      return;
    }
    updateEstadoMutation.mutate({ id: venta.id, estado: "Finalizada" });
  };

  const handleAnular = () => {
    if (confirm("¿Anular esta venta? No se podrá deshacer")) {
      updateEstadoMutation.mutate({ id: venta.id, estado: "Anulada" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-slate-500">Venta no encontrada</p>
          <Link to={createPageUrl("Ventas")}>
            <Button className="mt-4">Volver a Ventas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl("Ventas")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Ventas
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{venta.codigo}</h1>
                <p className="text-slate-500">Detalle de la venta</p>
              </div>
              <Badge className={
                venta.estado === "Finalizada" ? "bg-green-100 text-green-700" :
                venta.estado === "Anulada" ? "bg-slate-100 text-slate-600" :
                "bg-amber-100 text-amber-700"
              }>
                {venta.estado}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowEditForm(true)} variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Editar
              </Button>
              {venta.estado === "Borrador" && (
                <Button onClick={handleFinalizar} className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Finalizar
                </Button>
              )}
              {venta.estado !== "Anulada" && (
                <Button onClick={handleAnular} variant="outline" className="gap-2 text-red-600">
                  <XCircle className="w-4 h-4" />
                  Anular
                </Button>
              )}
              {currentUser?.role === 'admin' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("¿Seguro que deseas eliminar esta venta?")) {
                      deleteMutation.mutate(venta.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Información de la Venta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">Fecha</p>
                <p className="font-medium">{venta.fecha ? format(new Date(venta.fecha), 'dd/MM/yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Canal de Venta</p>
                <Badge variant="secondary">{venta.marketplace}</Badge>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Cliente</p>
                <p className="font-medium">{[venta.nombreSnapshot, venta.apellidoSnapshot].filter(Boolean).join(" ")}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Producto</p>
                <p className="font-medium">{venta.productoSnapshot || venta.modelo}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Modelo</p>
                <p className="font-medium">{venta.modelo || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Variante</p>
                <p className="font-medium">
                  {[venta.capacidad, venta.color].filter(Boolean).join(' · ') || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Proveedor</p>
                {venta.proveedorId ? (
                  <Link to={createPageUrl(`ProveedorDetalle?id=${venta.proveedorId}`)} className="font-medium hover:underline text-blue-600">
                    {venta.proveedorNombreSnapshot}
                  </Link>
                ) : (
                  <p className="font-medium">{venta.proveedorNombreSnapshot || venta.proveedorTexto || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Vendedor</p>
                <p className="font-medium">{venta.porUsuarioId || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Financiera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Información Financiera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-1">Moneda</p>
              <Badge variant="outline">{venta.moneda || 'USD'}</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">Costo</p>
                <p className="text-2xl font-bold">
                  {venta.costo ? `${venta.moneda || 'USD'} ${venta.costo.toFixed(2)}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Precio de Venta</p>
                <p className="text-2xl font-bold">
                  {venta.venta ? `${venta.moneda || 'USD'} ${venta.venta.toFixed(2)}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Comisión</p>
                <p className="text-xl font-semibold">
                  {venta.moneda || 'USD'} {(venta.comision || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Canje</p>
                <p className="text-xl font-semibold">
                  {venta.moneda || 'USD'} {(venta.canje || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-700">Ganancia</p>
                {venta.ganancia !== null && venta.ganancia !== undefined ? (
                  <p className={`text-3xl font-bold ${venta.ganancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {venta.moneda || 'USD'} {venta.ganancia.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-2xl font-semibold text-slate-400">Pendiente</p>
                )}
              </div>
              {venta.ganancia !== null && venta.ganancia !== undefined && (
                <p className="text-xs text-slate-500 mt-2">
                  Venta ({venta.venta || 0}) - Costo ({venta.costo || 0}) - Comisión ({venta.comision || 0}) + Canje ({venta.canje || 0})
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
        {contacto && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">{[venta.nombreSnapshot, venta.apellidoSnapshot].filter(Boolean).join(" ")}</p>
                  {contacto.whatsapp && (
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4" />
                      {contacto.whatsapp}
                    </p>
                  )}
                </div>
                <Link to={createPageUrl(`Contactos`)}>
                  <Button variant="outline" size="sm">Ver Contacto</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consulta Original */}
        {consulta && (
          <Card>
            <CardHeader>
              <CardTitle>Consulta Original</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Producto consultado</p>
                  <p className="font-medium">{consulta.productoConsultado}</p>
                  <p className="text-sm text-slate-500 mt-1">Etapa: {consulta.etapa}</p>
                </div>
                <Link to={createPageUrl(`Consultas`)}>
                  <Button variant="outline" size="sm">Ver Consulta</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notas */}
        {venta.notas && (
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{venta.notas}</p>
            </CardContent>
          </Card>
        )}

        <VentaForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          consulta={null}
          ventaExistente={venta}
          onVentaCreada={() => {
            queryClient.invalidateQueries({ queryKey: ['venta', ventaId] });
          }}
        />
      </div>
    </div>
  );
}