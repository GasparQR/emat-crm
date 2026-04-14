import { useState, useEffect } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { openConsultaPdf } from "@/lib/consultaPdf";

export const ASESORES = ["ANDRES", "TRISTAN", "VALENTINA", "ROCIO", "JULIAN", "PABLO", "ESTEBAN", "MACA"];
const TIPOS_APLICACION = ["Soplado", "Proyectado", "Pegado", "Bolsa", "Imper", "Otro"];
const TIPOS_CLIENTE = ["USUARIO FINAL", "APLICADOR", "ARQ", "CONSTRUCTORA", "DESARROLLISTA", "COMERCIAL", "MODULAR"];
const CANALES = ["REFERIDO", "Meta", "WhatsApp", "Agente", "Cliente Fidelidad", "Otro"];
const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const EMPRESAS = ["EMAT", "Aislaciones del Centro"];
const MOTIVOS_PERDIDA = [
  "Sin respuesta","Se canceló la obra","Ganó la competencia",
  "Eligió otro material","Costos","Distancia/Logística",
  "Programada para más adelante","Presupuesto de prueba","Otro",
];
const PROVINCIAS = [
  "Buenos Aires","CABA","Catamarca","Chaco","Chubut","Córdoba",
  "Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja",
  "Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan",
  "San Luis","Santa Cruz","Santa Fe","Santiago del Estero",
  "Tierra del Fuego","Tucumán",
];

const createItem = (overrides = {}) => ({
  _localId: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  descripcionServicio: "Presupuesto de Servicio",
  precioUnitario: "",
  cantidad: "",
  importe: "",
  ...overrides,
});

const emptyForm = () => ({
  nroPpto: "",
  contactoNombre: "",
  contactoWhatsapp: "",
  asesor: "",
  tipoAplicacion: "",
  ubicacionObra: "",
  provincia: "",
  superficieM2: "",
  fibraKg: "",
  adhLts: "",
  kmObra: "",
  tipoCliente: "",
  canalOrigen: "",
  descripcionServicio: "Presupuesto de Servicio",
  precioUnitario: "",
  cantidad: "",
  importe: "",
  items: [createItem()],
  iva: 21,
  empresa: "EMAT",
  fechaPresupuesto: new Date().toISOString().split("T")[0],
  diasValidez: 30,
  condicionesComerciales: "",
  etapa: "A COTIZAR",
  mes: MESES[new Date().getMonth()],
  ano: new Date().getFullYear(),
  proximoSeguimiento: "",
  observaciones: "",
  razonPerdida: "",
});

export default function ConsultaForm({ open, onOpenChange, consulta, onSave }) {
  const [formData, setFormData] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({ nombre: "", whatsapp: "", empresa: "" });
  const { workspace } = useWorkspace();
  const { data: currentUser } = useCurrentUser();

  const { data: etapas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace,
  });

  useEffect(() => {
    if (!open) return;

    if (consulta) {
      const firstItem = {
        descripcionServicio: consulta.descripcionservicio ?? consulta.descripcionServicio ?? "Presupuesto de Servicio",
        precioUnitario: consulta.preciounitario ?? consulta.precioUnitario ?? "",
        cantidad: consulta.cantidad ?? "",
        importe: consulta.importe ?? "",
      };
      const rawItems = Array.isArray(consulta.items) && consulta.items.length > 0 ? consulta.items : [firstItem];
      const mappedItems = rawItems.map((item) => createItem({
        descripcionServicio: item.descripcionServicio ?? item.descripcionservicio ?? firstItem.descripcionServicio,
        precioUnitario: item.precioUnitario ?? item.preciounitario ?? "",
        cantidad: item.cantidad ?? "",
        importe: item.importe ?? "",
      }));
      setFormData({
        ...emptyForm(),
        nroPpto: consulta.nroppto ?? consulta.nroPpto ?? "",
        contactoNombre: consulta.contactonombre ?? consulta.contactoNombre ?? "",
        contactoWhatsapp: consulta.contactowhatsapp ?? consulta.contactoWhatsapp ?? "",
        asesor: consulta.asesor ?? "",
        tipoAplicacion: consulta.tipoaplicacion ?? consulta.tipoAplicacion ?? "",
        ubicacionObra: consulta.ubicacionobra ?? consulta.ubicacionObra ?? "",
        provincia: consulta.provincia ?? "",
        superficieM2: consulta.superficiem2 ?? consulta.superficieM2 ?? "",
        fibraKg: consulta.fibrakg ?? consulta.fibraKg ?? "",
        adhLts: consulta.adhlts ?? consulta.adhLts ?? "",
        kmObra: consulta.kmobra ?? consulta.kmObra ?? "",
        tipoCliente: consulta.tipocliente ?? consulta.tipoCliente ?? "",
        canalOrigen: consulta.canalorigen ?? consulta.canalOrigen ?? "",
        descripcionServicio: mappedItems[0]?.descripcionServicio ?? "Presupuesto de Servicio",
        precioUnitario: mappedItems[0]?.precioUnitario ?? "",
        cantidad: mappedItems[0]?.cantidad ?? "",
        importe: mappedItems[0]?.importe ?? "",
        items: mappedItems,
        iva: consulta.iva ?? 21,
        empresa: consulta.empresa ?? "EMAT",
        fechaPresupuesto: consulta.fechapresupuesto ?? consulta.fechaPresupuesto ?? new Date().toISOString().split("T")[0],
        diasValidez: consulta.diasvalidez ?? consulta.diasValidez ?? 30,
        condicionesComerciales: consulta.condicionescomerciales ?? consulta.condicionesComerciales ?? "",
        etapa: consulta.pipeline_stage ?? consulta.etapa ?? emptyForm().etapa,
        mes: consulta.mes ?? emptyForm().mes,
        ano: consulta.ano ?? emptyForm().ano,
        proximoSeguimiento: consulta.proximoseguimiento ?? consulta.proximoSeguimiento ?? "",
        observaciones: consulta.observaciones ?? "",
        razonPerdida: consulta.razonperdida ?? consulta.razonPerdida ?? "",
      });
      return;
    }

    let active = true;
    const loadNextNroPpto = async () => {
      try {
        const latest = await entities.Consulta.filter(
          { workspace_id: workspace?.id || "local" },
          "-nroppto",
          1
        );
        const maxNro = Number(latest?.[0]?.nroppto ?? 0);
        const defaults = emptyForm();
        if (active) {
          setFormData({
            ...defaults,
            nroPpto: maxNro + 1,
            condicionesComerciales: currentUser?.consulta_default_condiciones_comerciales ?? defaults.condicionesComerciales,
            observaciones: currentUser?.consulta_default_observaciones ?? defaults.observaciones,
          });
        }
      } catch {
        const defaults = emptyForm();
        if (active) {
          setFormData({
            ...defaults,
            nroPpto: 1,
            condicionesComerciales: currentUser?.consulta_default_condiciones_comerciales ?? defaults.condicionesComerciales,
            observaciones: currentUser?.consulta_default_observaciones ?? defaults.observaciones,
          });
        }
      }
    };

    loadNextNroPpto();
    return () => { active = false; };
  }, [consulta, open, workspace?.id, currentUser?.consulta_default_condiciones_comerciales, currentUser?.consulta_default_observaciones]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const updateItem = (index, field, value) => {
    setFormData((prev) => {
      const nextItems = prev.items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        const precio = parseFloat(updated.precioUnitario);
        const cantidad = parseFloat(updated.cantidad);
        if (!Number.isNaN(precio) && !Number.isNaN(cantidad)) {
          updated.importe = (precio * cantidad).toFixed(2);
        }
        return updated;
      });
      const total = nextItems.reduce((acc, item) => acc + (parseFloat(item.importe) || 0), 0);
      return {
        ...prev,
        items: nextItems,
        descripcionServicio: nextItems[0]?.descripcionServicio ?? "",
        precioUnitario: nextItems[0]?.precioUnitario ?? "",
        cantidad: nextItems[0]?.cantidad ?? "",
        importe: total > 0 ? total.toFixed(2) : "",
      };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createItem({ descripcionServicio: "" })],
    }));
  };

  const removeItem = (index) => {
    setFormData((prev) => {
      const filtered = prev.items.filter((_, i) => i !== index);
      const nextItems = filtered.length > 0 ? filtered : [createItem()];
      const total = nextItems.reduce((acc, item) => acc + (parseFloat(item.importe) || 0), 0);
      return {
        ...prev,
        items: nextItems,
        descripcionServicio: nextItems[0]?.descripcionServicio ?? "",
        precioUnitario: nextItems[0]?.precioUnitario ?? "",
        cantidad: nextItems[0]?.cantidad ?? "",
        importe: total > 0 ? total.toFixed(2) : "",
      };
    });
  };

  const getNextNroPpto = async () => {
    const latest = await entities.Consulta.filter(
      { workspace_id: workspace?.id || "local" },
      "-nroppto",
      1
    );
    const maxNro = Number(latest?.[0]?.nroppto ?? 0);
    return Number.isFinite(maxNro) ? maxNro + 1 : 1;
  };

  const handleCreateLead = async () => {
    if (!newLeadData.nombre) { toast.error("El nombre del lead es requerido"); return; }
    try {
      await entities.Contacto.create({
        workspace_id: workspace?.id || "local",
        nombre: newLeadData.nombre,
        whatsapp: newLeadData.whatsapp,
        empresa: newLeadData.empresa,
        asesor: newLeadData.asesor,
      });
      set("asesor", newLeadData.contactoNombre);
      set("contactoWhatsapp", newLeadData.whatsapp);
      setNewLeadData({ nombre: "", whatsapp: "", empresa: "", asesor: "" });
      setShowNewLead(false);
      toast.success("Lead creado y asignado");
    } catch (e) {
      toast.error("Error al crear lead: " + e.message);
    }
  };

  const handleSubmit = async () => {
    if (!formData.contactoNombre) { toast.error("El nombre es requerido"); return; }
    setLoading(true);
    try {
      let nroPptoValue = formData.nroPpto;
      if (!consulta?.id) {
        nroPptoValue = await getNextNroPpto();
        set("nroPpto", nroPptoValue);
      }
      const firmasAsesor = currentUser?.consulta_firmas_asesor || {};
      const firmaAsesor = firmasAsesor[formData.asesor] || formData.asesor || "Asesor";

      const payload = {
        // Usar nombres de columna en minúsculas para compatibilidad con PostgreSQL
        contactonombre: formData.contactoNombre,
        contactowhatsapp: formData.contactoWhatsapp,
        asesor: formData.asesor,
        pipeline_stage: formData.etapa,
        mes: formData.mes,
        ano: formData.ano,
        provincia: formData.provincia,
        tipoaplicacion: formData.tipoAplicacion,
        ubicacionobra: formData.ubicacionObra,
        superficiem2: formData.superficieM2 !== "" ? parseFloat(formData.superficieM2) : null,
        fibrakg: formData.fibraKg !== "" ? parseFloat(formData.fibraKg) : null,
        adhlts: formData.adhLts !== "" ? parseFloat(formData.adhLts) : null,
        kmobra: formData.kmObra !== "" ? parseFloat(formData.kmObra) : null,
        importe: formData.importe !== "" ? parseFloat(formData.importe) : null,
        tipocliente: formData.tipoCliente,
        canalorigen: formData.canalOrigen,
        descripcionservicio: formData.items?.[0]?.descripcionServicio || formData.descripcionServicio,
        preciounitario: formData.items?.[0]?.precioUnitario !== "" ? parseFloat(formData.items[0].precioUnitario) : null,
        cantidad: formData.items?.[0]?.cantidad !== "" ? parseFloat(formData.items[0].cantidad) : null,
        observaciones: formData.observaciones,
        nroppto: nroPptoValue !== "" ? parseInt(nroPptoValue) : null,
        iva: formData.iva !== "" ? parseFloat(formData.iva) : 21,
        empresa: formData.empresa || "EMAT",
        fechapresupuesto: formData.fechaPresupuesto || new Date().toISOString().split("T")[0],
        diasvalidez: formData.diasValidez !== "" ? parseInt(formData.diasValidez) : 30,
        condicionescomerciales: formData.condicionesComerciales,
        proximoseguimiento: formData.proximoSeguimiento || null,
        razonperdida: formData.razonPerdida || null,
        firmaasesor: firmaAsesor,
        items: formData.items.map((item) => ({
          descripcionServicio: item.descripcionServicio,
          precioUnitario: item.precioUnitario,
          cantidad: item.cantidad,
          importe: item.importe,
        })),
        workspace_id: workspace?.id || "local",
      };
      if (consulta?.id) {
        try {
          await entities.Consulta.update(consulta.id, payload);
        } catch (err) {
          if (String(err?.message || "").toLowerCase().includes("items")) {
            const { items, ...fallbackPayload } = payload;
            await entities.Consulta.update(consulta.id, fallbackPayload);
          } else {
            throw err;
          }
        }
        toast.success("Presupuesto actualizado");
      } else {
        try {
          await entities.Consulta.create(payload);
        } catch (err) {
          if (String(err?.message || "").toLowerCase().includes("items")) {
            const { items, ...fallbackPayload } = payload;
            await entities.Consulta.create(fallbackPayload);
          } else {
            throw err;
          }
        }
        toast.success("Presupuesto creado");
      }
      onSave?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {consulta ? `Editar Presupuesto #${consulta.nroppto ?? consulta.nroPpto ?? ""}` : "Nuevo Presupuesto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* CLIENTE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cliente</p>
              <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowNewLead(true)}>
                <Plus className="w-3 h-3" />
                Nuevo cliente / lead
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label>Nombre *</Label>
                <Input value={formData.contactoNombre} onChange={e => set("contactoNombre", e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input value={formData.contactoWhatsapp} onChange={e => set("contactoWhatsapp", e.target.value)} placeholder="+54 9 351 123-4567" />
              </div>
              <div className="space-y-1">
                <Label>Tipo de cliente</Label>
                <Select value={formData.tipoCliente} onValueChange={v => set("tipoCliente", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{TIPOS_CLIENTE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Canal de origen</Label>
                <Select value={formData.canalOrigen} onValueChange={v => set("canalOrigen", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{CANALES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* OBRA */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Obra</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ubicación</Label>
                <Input value={formData.ubicacionObra} onChange={e => set("ubicacionObra", e.target.value)} placeholder="Ej: Barrio Arguello, Córdoba" />
              </div>
              <div className="space-y-1">
                <Label>Provincia</Label>
                <Select value={formData.provincia} onValueChange={v => set("provincia", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{PROVINCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo de aplicación</Label>
                <Select value={formData.tipoAplicacion} onValueChange={v => set("tipoAplicacion", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{TIPOS_APLICACION.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Km desde Córdoba</Label>
                <Input type="number" value={formData.kmObra} onChange={e => set("kmObra", e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          {/* CANTIDADES */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Cantidades</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Superficie (m²)</Label>
                <Input type="number" value={formData.superficieM2} onChange={e => set("superficieM2", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Fibra (kg)</Label>
                <Input type="number" value={formData.fibraKg} onChange={e => set("fibraKg", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Adhesivo (lts)</Label>
                <Input type="number" value={formData.adhLts} onChange={e => set("adhLts", e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          {/* COMERCIAL */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Comercial</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>N° Presupuesto</Label>
                <Input type="number" value={formData.nroPpto} readOnly aria-readonly="true" className="bg-slate-50" />
              </div>
              <div className="space-y-1">
                <Label>Asesor</Label>
                <Select value={formData.asesor} onValueChange={v => set("asesor", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{ASESORES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={formData.etapa} onValueChange={v => set("etapa", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{etapas.map(e => <SelectItem key={e.pipeline_stage} value={e.pipeline_stage}>{e.pipeline_stage}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Importe total ($)</Label>
                <Input type="number" value={formData.importe} readOnly aria-readonly="true" className="bg-slate-50" />
              </div>
              <div className="space-y-1">
                <Label>IVA (%)</Label>
                <Input type="number" value={formData.iva} onChange={e => set("iva", e.target.value)} placeholder="21" />
              </div>
              <div className="space-y-1">
                <Label>Empresa</Label>
                <Select value={formData.empresa} onValueChange={v => set("empresa", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Items del presupuesto</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar item
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={item._localId || `item-${index}`} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2 bg-slate-50">
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        <Label className="text-xs">Detalle</Label>
                        <Input
                          value={item.descripcionServicio}
                          onChange={(e) => updateItem(index, "descripcionServicio", e.target.value)}
                          placeholder="Ej: Aplicación de aislación térmica"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <Label className="text-xs">P. Unitario</Label>
                        <Input
                          type="number"
                          value={item.precioUnitario}
                          onChange={(e) => updateItem(index, "precioUnitario", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Importe</Label>
                        <Input type="number" value={item.importe} readOnly aria-readonly="true" className="bg-white" />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length === 1}
                          title="Eliminar item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Fecha presupuesto</Label>
                <Input type="date" value={formData.fechaPresupuesto} onChange={e => set("fechaPresupuesto", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Días de validez</Label>
                <Input type="number" value={formData.diasValidez} onChange={e => set("diasValidez", e.target.value)} placeholder="30" />
              </div>
              <div className="space-y-1">
                <Label>Mes</Label>
                <Select value={formData.mes} onValueChange={v => set("mes", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Próximo seguimiento</Label>
                <Input type="date" value={formData.proximoSeguimiento} onChange={e => set("proximoSeguimiento", e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Condiciones comerciales</Label>
                <Textarea
                  value={formData.condicionesComerciales}
                  onChange={e => set("condicionesComerciales", e.target.value)}
                  placeholder="Forma de pago, plazo de ejecución, condiciones adicionales..."
                  rows={2}
                />
              </div>
            </div>
            {formData.etapa === "PERDIDA" && (
              <div className="space-y-1 mt-3">
                <Label>Razón de pérdida</Label>
                <Select value={formData.razonPerdida} onValueChange={v => set("razonPerdida", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                  <SelectContent>{MOTIVOS_PERDIDA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* OBSERVACIONES */}
          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea value={formData.observaciones} onChange={e => set("observaciones", e.target.value)} placeholder="Notas sobre la obra, el cliente, seguimientos..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => openConsultaPdf({
              ...formData,
              nroppto: formData.nroPpto,
              firmaasesor: (currentUser?.consulta_firmas_asesor || {})[formData.asesor] || formData.asesor || "Asesor",
            })}
            disabled={!formData.contactoNombre}
          >
            Ver PDF
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : consulta ? "Guardar cambios" : "Crear presupuesto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Nuevo Lead Dialog */}
    <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cliente / lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input value={newLeadData.nombre} onChange={e => setNewLeadData(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej: Juan Pérez" />
          </div>
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <Input value={newLeadData.whatsapp} onChange={e => setNewLeadData(prev => ({ ...prev, whatsapp: e.target.value }))} placeholder="+54 9 351 123-4567" />
          </div>
          <div className="space-y-1">
            <Label>Empresa</Label>
            <Input value={newLeadData.empresa} onChange={e => setNewLeadData(prev => ({ ...prev, empresa: e.target.value }))} placeholder="Constructora SA" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewLead(false)}>Cancelar</Button>
          <Button onClick={handleCreateLead}>Crear y asignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
