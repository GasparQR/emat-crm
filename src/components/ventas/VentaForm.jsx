import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, TrendingUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useWorkspace } from "@/components/context/WorkspaceContext";

const MARKETPLACES = ["WhatsApp", "Instagram", "MercadoLibre", "Local", "Otro"];

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const d = result.getDay();
    if (d !== 0 && d !== 6) added++;
  }
  return result.toISOString().split("T")[0];
}

export default function VentaForm({ open, onOpenChange, consulta, onVentaCreada, ventaExistente = null }) {
  const { workspace } = useWorkspace();
  const [formData, setFormData] = useState({
    estado: "Borrador",
    fecha: new Date().toISOString().split('T')[0],
    contactoId: "",
    consultaId: "",
    nombreSnapshot: "",
    apellidoSnapshot: "",
    productoSnapshot: "",
    modelo: "",
    capacidad: "",
    color: "",
    proveedorId: "",
    proveedorTexto: "",
    proveedorNombreSnapshot: "",
    marketplace: "WhatsApp",
    porUsuarioId: "",
    costo: "",
    comision: 0,
    venta: "",
    canje: 0,
    moneda: "USD",
    notas: "",
    whatsappCliente: ""
  });

  const [gananciaCalculada, setGananciaCalculada] = useState(null);
  const [proveedores] = useState([
    { id: "prov_1", nombre: "Proveedor Local", activo: true },
    { id: "prov_2", nombre: "Mayorista Centro", activo: true }
  ]);

  useEffect(() => {
    if (ventaExistente && open) {
      setFormData({
        ...ventaExistente,
        apellidoSnapshot: ventaExistente.apellidoSnapshot || "",
        costo: ventaExistente.costo || "",
        venta: ventaExistente.venta || "",
        comision: ventaExistente.comision || 0,
        canje: ventaExistente.canje || 0
      });
    } else if (consulta && open) {
      setFormData({
        estado: "Borrador",
        fecha: new Date().toISOString().split('T')[0],
        contactoId: consulta.contactoId || "",
        consultaId: consulta.id || "",
        nombreSnapshot: consulta.contactoNombre ? consulta.contactoNombre.split(" ")[0] : "",
        apellidoSnapshot: consulta.contactoNombre ? consulta.contactoNombre.split(" ").slice(1).join(" ") : "",
        productoSnapshot: consulta.productoConsultado + (consulta.variante ? ` ${consulta.variante}` : ""),
        modelo: consulta.productoConsultado || "",
        capacidad: consulta.variante || "",
        color: "",
        proveedorId: "",
        proveedorTexto: consulta.fuentePrecio || "",
        proveedorNombreSnapshot: consulta.fuentePrecio || "",
        marketplace: consulta.canalOrigen || "WhatsApp",
        porUsuarioId: consulta.created_by || "",
        costo: "",
        comision: 0,
        venta: consulta.precioCotizado || "",
        canje: 0,
        moneda: consulta.moneda || "USD",
        notas: "",
        whatsappCliente: consulta.contactoWhatsapp || ""
      });
    } else if (open && !ventaExistente && !consulta) {
      setFormData({
        estado: "Borrador",
        fecha: new Date().toISOString().split('T')[0],
        contactoId: "",
        consultaId: "",
        nombreSnapshot: "",
        apellidoSnapshot: "",
        productoSnapshot: "",
        modelo: "",
        capacidad: "",
        color: "",
        proveedorId: "",
        proveedorTexto: "",
        proveedorNombreSnapshot: "",
        marketplace: "WhatsApp",
        porUsuarioId: "",
        costo: "",
        comision: 0,
        venta: "",
        canje: 0,
        moneda: "USD",
        notas: "",
        whatsappCliente: ""
      });
    }
  }, [consulta, ventaExistente, open]);

  useEffect(() => {
    const costo = parseFloat(formData.costo);
    const venta = parseFloat(formData.venta);
    const comision = parseFloat(formData.comision) || 0;
    const canje = parseFloat(formData.canje) || 0;
    if (!isNaN(costo) && !isNaN(venta)) {
      setGananciaCalculada(venta - costo - comision + canje);
    } else {
      setGananciaCalculada(null);
    }
  }, [formData.costo, formData.venta, formData.comision, formData.canje]);

  const handleSubmit = (finalizar = false) => {
    if (!formData.nombreSnapshot) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }
    if (finalizar) {
      if (!formData.venta) { toast.error("Precio de venta es obligatorio para finalizar"); return; }
      if (!formData.costo) { toast.error("Costo es obligatorio para finalizar"); return; }
      if (!formData.proveedorId && !formData.proveedorTexto) { toast.error("Proveedor es obligatorio para finalizar"); return; }
    }

    const costo = formData.costo ? parseFloat(formData.costo) : null;
    const venta = formData.venta ? parseFloat(formData.venta) : null;
    const comision = parseFloat(formData.comision) || 0;
    const canje = parseFloat(formData.canje) || 0;
    const ganancia = gananciaCalculada;

    const postventaFields = finalizar ? {
      postventaActiva: true,
      postventaEstado: "Pendiente",
      proximoSeguimientoPostventa: addBusinessDays(formData.fecha || new Date(), 7),
      postventaUltimoContacto: null,
    } : {};

    if (ventaExistente) {
      toast.success(finalizar ? "Venta finalizada" : "Venta actualizada");
      onVentaCreada?.();
      onOpenChange(false);
    } else {
      const nuevoCodigo = `V-${new Date().getFullYear()}-000001`;
      const ventaCreada = { id: `venta_${Date.now()}`, codigo: nuevoCodigo };
      toast.success(finalizar ? "Venta finalizada y postventa activada" : "Borrador guardado");
      onVentaCreada?.(ventaCreada.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {ventaExistente ? "Editar Venta" : "Registrar Venta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input type="date" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={formData.nombreSnapshot} onChange={e => setFormData({ ...formData, nombreSnapshot: e.target.value })} placeholder="Nombre" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Apellido</Label>
              <Input value={formData.apellidoSnapshot} onChange={e => setFormData({ ...formData, apellidoSnapshot: e.target.value })} placeholder="Apellido del cliente" />
            </div>
          </div>

          {!consulta && (
            <div className="space-y-2">
              <Label>WhatsApp del cliente</Label>
              <Input value={formData.whatsappCliente} onChange={e => setFormData({ ...formData, whatsappCliente: e.target.value })} placeholder="Ej: 5491112345678" />
              <p className="text-xs text-slate-500">Se crea el contacto automáticamente para usar Postventa.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Producto</Label>
            <Input value={formData.productoSnapshot} onChange={e => setFormData({ ...formData, productoSnapshot: e.target.value })} placeholder="iPhone 15 Pro Max 256GB Negro" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={formData.modelo} onChange={e => setFormData({ ...formData, modelo: e.target.value })} placeholder="iPhone 15 Pro Max" />
            </div>
            <div className="space-y-2">
              <Label>Capacidad</Label>
              <Input value={formData.capacidad} onChange={e => setFormData({ ...formData, capacidad: e.target.value })} placeholder="256GB" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="Negro" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Proveedor *</Label>
              <a href={createPageUrl("ProveedorDetalle?id=nuevo")} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs">
                  <Plus className="w-3 h-3" /> Crear Nuevo
                </Button>
              </a>
            </div>
            <Select value={formData.proveedorId} onValueChange={val => {
              const prov = proveedores.find(p => p.id === val);
              setFormData({ ...formData, proveedorId: val, proveedorNombreSnapshot: prov?.nombre || "" });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor">
                  {formData.proveedorId ? proveedores.find(p => p.id === formData.proveedorId)?.nombre : "Selecciona un proveedor"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                {proveedores.length === 0 && <SelectItem value="none" disabled>No hay proveedores. Crea uno primero.</SelectItem>}
              </SelectContent>
            </Select>
            {!formData.proveedorId && (
              <Input value={formData.proveedorTexto} onChange={e => setFormData({ ...formData, proveedorTexto: e.target.value })} placeholder="O escribe el nombre del proveedor" className="mt-2" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marketplace</Label>
              <Select value={formData.marketplace} onValueChange={val => setFormData({ ...formData, marketplace: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MARKETPLACES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={formData.moneda} onValueChange={val => setFormData({ ...formData, moneda: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Costo</Label>
              <Input type="number" step="0.01" value={formData.costo} onChange={e => setFormData({ ...formData, costo: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Precio de Venta</Label>
              <Input type="number" step="0.01" value={formData.venta} onChange={e => setFormData({ ...formData, venta: e.target.value })} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Comisión</Label>
              <Input type="number" step="0.01" value={formData.comision} onChange={e => setFormData({ ...formData, comision: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Canje</Label>
              <Input type="number" step="0.01" value={formData.canje} onChange={e => setFormData({ ...formData, canje: e.target.value })} placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={formData.notas} onChange={e => setFormData({ ...formData, notas: e.target.value })} rows={3} placeholder="Notas adicionales..." />
          </div>

          {gananciaCalculada !== null ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className={gananciaCalculada >= 0 ? "w-5 h-5 text-green-600" : "w-5 h-5 text-red-600"} />
                  <span className="font-semibold text-slate-700">Ganancia Calculada:</span>
                </div>
                <span className={`text-2xl font-bold ${gananciaCalculada >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formData.moneda} {gananciaCalculada.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Venta ({formData.venta || 0}) - Costo ({formData.costo || 0}) - Comisión ({formData.comision || 0}) + Canje ({formData.canje || 0})
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700">Ingresá costo y precio de venta para calcular la ganancia</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={() => handleSubmit(false)}>Guardar Borrador</Button>
          <Button onClick={() => handleSubmit(true)}>
            {ventaExistente ? "Actualizar y Finalizar" : "Finalizar Venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
