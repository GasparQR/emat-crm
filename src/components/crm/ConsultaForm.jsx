import { useState, useEffect } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const ASESORES = ["ANDRES", "TRISTAN", "VALENTINA", "ROCIO", "JULIAN", "PABLO", "ESTEBAN", "MACA"];
const TIPOS_APLICACION = ["Soplado", "Proyectado", "Pegado", "Bolsa", "Imper", "Otro"];
const TIPOS_CLIENTE = ["USUARIO FINAL", "APLICADOR", "ARQ", "CONSTRUCTORA", "DESARROLLISTA", "COMERCIAL", "MODULAR"];
const CANALES = ["REFERIDO", "Meta", "WhatsApp", "Agente", "Cliente Fidelidad", "Otro"];
const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
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
  importe: "",
  etapa: "A COTIZAR",
  mes: MESES[new Date().getMonth()],
  ano: new Date().getFullYear(),
  fechaConsulta: new Date().toISOString().split("T")[0],
  ultimoContacto: "",
  proximoSeguimiento: "",
  observaciones: "",
  razonPerdida: "",
});

function generateNextNroPpto() {
  try {
    const items = JSON.parse(localStorage.getItem('emat_Consulta') || '[]');
    const maxNro = items.reduce((max, item) => {
      const n = parseInt(item.nroPpto);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    return maxNro + 1;
  } catch {
    return 1;
  }
}

export default function ConsultaForm({ open, onOpenChange, consulta, onSave }) {
  const [formData, setFormData] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({ nombre: "", whatsapp: "", empresa: "" });
  const { workspace } = useWorkspace();

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
    if (open) {
      if (consulta) {
        setFormData({ ...emptyForm(), ...consulta,
          etapa: consulta.pipeline_stage || consulta.etapa || emptyForm().etapa,
          superficieM2: consulta.superficieM2 ?? "",
          fibraKg: consulta.fibraKg ?? "",
          adhLts: consulta.adhLts ?? "",
          kmObra: consulta.kmObra ?? "",
          importe: consulta.importe ?? "",
        });
      } else {
        const nextNro = generateNextNroPpto();
        setFormData({ ...emptyForm(), nroPpto: nextNro });
      }
    }
  }, [consulta, open]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

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
      const payload = {
        // Usar nombres de columna en minúsculas para compatibilidad con PostgreSQL
        contactonombre: formData.contactoNombre,
        contactowhatsapp: formData.contactoWhatsapp,
        asesor: formData.asesor,
        pipeline_stage: formData.etapa,
        mes: formData.mes,
        ano: formData.ano,
        tipoapplicacion: formData.tipoAplicacion,
        ubicacionobra: formData.ubicacionObra,
        superficiem2: formData.superficieM2 !== "" ? parseFloat(formData.superficieM2) : null,
        fibrakg: formData.fibraKg !== "" ? parseFloat(formData.fibraKg) : null,
        adhlts: formData.adhLts !== "" ? parseFloat(formData.adhLts) : null,
        kmobra: formData.kmObra !== "" ? parseFloat(formData.kmObra) : null,
        importe: formData.importe !== "" ? parseFloat(formData.importe) : null,
        tipocliente: formData.tipoCliente,
        canalorigen: formData.canalOrigen,
        observaciones: formData.observaciones,
        nroppto: formData.nroPpto !== "" ? parseInt(formData.nroPpto) : null,
        proximoseguimiento: formData.proximoSeguimiento || null,
        workspace_id: workspace?.id || "local",
      };
      if (consulta?.id) {
        await entities.Consulta.update(consulta.id, payload);
        toast.success("Presupuesto actualizado");
      } else {
        await entities.Consulta.create(payload);
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
            {consulta ? `Editar Presupuesto #${consulta.nroPpto || ""}` : "Nuevo Presupuesto"}
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
                <Label>Importe ($)</Label>
                <Input type="number" value={formData.importe} onChange={e => set("importe", e.target.value)} placeholder="0" />
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
