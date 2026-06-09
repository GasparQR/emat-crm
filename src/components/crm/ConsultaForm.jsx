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
import { Plus, Trash2, Package } from "lucide-react";
import CatalogoProductoPickerDialog from "@/components/crm/CatalogoProductoPickerDialog";
import { buildConsultaPdf } from "@/lib/consultaPdf";
import { getNextFollowUpDate } from "@/components/utils/dateUtils";
import { useActiveCall } from "@/components/context/ActiveCallContext";
import {
  applyFechaGanadoOnStageChange,
  getFechaGanadoFromConsulta,
  isWonStage,
  todayDateString,
} from "@/lib/pipelineStage";
import { parseConsultaItems } from "@/utils/parseConsultaItems";
import { calcularTotalesConsulta, computeItemsAndTotal } from "@/utils/consultaItems";
import { IVA_RATES, formatIvaLabel, ivaSelectValue, parseIvaPercent } from "@/lib/consultaIva";
import { useAsesores } from "@/components/hooks/useAsesores";
import { useConsultaDefaults } from "@/components/hooks/useConsultaDefaults";
import {
  buildFirmasYAsesoresMap,
  resolveAsesorFromMap,
} from "@/lib/asesorDisplay";
import {
  createConsultaWithNroppto,
  isNropptoUniqueViolation,
  peekNextConsultaNroPpto,
} from "@/lib/consultaNroppto";

export const CANALES = ["Referido", "Meta", "Google", "WhatsApp", "Agente", "Cliente Fidelidad", "Otro"];
const TIPOS_APLICACION = ["Soplado", "Proyectado", "Pegado", "Bolsa", "Imper", "Otro"];
const TIPO_APLICACION_BOLSA = "Bolsa";

function isFibraKgValidForBolsa(fibraKg) {
  if (fibraKg === null || fibraKg === undefined || fibraKg === "") return false;
  const n = Number.parseFloat(String(fibraKg).replace(",", "."));
  return Number.isFinite(n) && n > 0;
}
const TIPOS_CLIENTE = ["USUARIO FINAL", "APLICADOR", "ARQ", "CONSTRUCTORA", "DESARROLLISTA", "COMERCIAL", "MODULAR"];
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

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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
  notas: "",
  razonPerdida: "",
  fechaGanado: "",
});

function buildFallbackPayload(payload, err) {
  const next = { ...payload };
  const msg = String(err?.message ?? err ?? "");
  if (/notas/i.test(msg) && (/column|does not exist|42703/i.test(msg))) {
    delete next.notas;
  }
  if (/fecha_ganado/i.test(msg) && (/column|does not exist|42703/i.test(msg))) {
    delete next.fecha_ganado;
  }
  if (/asesor_id/i.test(msg) && (/column|does not exist|42703/i.test(msg))) {
    delete next.asesor_id;
  }
  if (/subtotal|iva_value|total_importe/i.test(msg) && (/column|does not exist|42703/i.test(msg))) {
    delete next.subtotal;
    delete next.iva_value;
    delete next.total_importe;
  }
  return next;
}

export default function ConsultaForm({ open, onOpenChange, consulta, onSave }) {
  const [formData, setFormData] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [previewPayload, setPreviewPayload] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    nombre: "", whatsapp: "", empresa: "", asesor: "", canalOrigen: "",
  });
  const { workspace } = useWorkspace();
  const { data: currentUser } = useCurrentUser();
  const { asesorOptions, defaultAsesorCodigo } = useAsesores(currentUser);
  const { resolved: presupuestoDefaults } = useConsultaDefaults();
  const { setCallTarget, clearCallTarget } = useActiveCall();

  const { data: etapas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace,
  });

  const { data: firmasYAsesoresMap = {} } = useQuery({
    queryKey: ['asesor-firmas', workspace?.id],
    queryFn: async () => {
      const workspaceId = workspace?.id || "local";
      const rows = await entities.Asesor.filter({ workspace_id: workspaceId }, "nombre", 2000);
      return buildFirmasYAsesoresMap(rows);
    },
    enabled: !!workspace,
  });

  useEffect(() => {
    if (!open) return;

    if (consulta) {
      const etapa = consulta.pipeline_stage ?? consulta.etapa ?? emptyForm().etapa;
      const firstItem = {
        descripcionServicio: consulta.descripcionservicio ?? consulta.descripcionServicio ?? "Presupuesto de Servicio",
        precioUnitario: consulta.preciounitario ?? consulta.precioUnitario ?? "",
        cantidad: consulta.cantidad ?? "",
        importe: consulta.importe ?? "",
      };
      const parsedItems = parseConsultaItems(consulta.items);
      const rawItems = parsedItems.length > 0 ? parsedItems : [firstItem];
      const mappedItems = rawItems.map((item) => createItem({
        descripcionServicio: item.descripcionServicio ?? item.descripcionservicio ?? firstItem.descripcionServicio,
        precioUnitario: item.precioUnitario ?? item.preciounitario ?? "",
        cantidad: item.cantidad ?? "",
        importe: item.importe ?? "",
      }));
      const ivaLoaded = parseIvaPercent(consulta.iva, presupuestoDefaults.defaultIva);
      const { nextItems, totalText } = computeItemsAndTotal(mappedItems, ivaLoaded);
      const fechaGanadoStored = getFechaGanadoFromConsulta(consulta);
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
        descripcionServicio: nextItems[0]?.descripcionServicio ?? "Presupuesto de Servicio",
        precioUnitario: nextItems[0]?.precioUnitario ?? "",
        cantidad: nextItems[0]?.cantidad ?? "",
        importe: totalText,
        items: nextItems,
        iva: ivaLoaded,
        empresa: consulta.empresa ?? "EMAT",
        fechaPresupuesto: consulta.fechapresupuesto ?? consulta.fechaPresupuesto ?? new Date().toISOString().split("T")[0],
        diasValidez: consulta.diasvalidez ?? consulta.diasValidez ?? 30,
        condicionesComerciales: consulta.condicionescomerciales ?? consulta.condicionesComerciales ?? "",
        etapa,
        mes: consulta.mes ?? emptyForm().mes,
        ano: consulta.ano ?? emptyForm().ano,
        proximoSeguimiento: consulta.proximoseguimiento ?? consulta.proximoSeguimiento ?? "",
        observaciones: consulta.observaciones ?? "",
        notas: consulta.notas ?? "",
        razonPerdida: consulta.razonperdida ?? consulta.razonPerdida ?? "",
        fechaGanado: isWonStage(etapa, etapas) ? (fechaGanadoStored ?? "") : "",
      });
      return;
    }

    let active = true;
    const loadNextNroPpto = async () => {
      try {
        const proximoNro = await peekNextConsultaNroPpto(workspace?.id || "local");
        const defaults = emptyForm();
        const proximoSeguimiento = getNextFollowUpDate(currentUser?.consulta_follow_up_days);
        if (active) {
          setFormData({
            ...defaults,
            nroPpto: String(proximoNro),
            asesor: defaultAsesorCodigo || defaults.asesor,
            proximoSeguimiento,
            condicionesComerciales: presupuestoDefaults.condicionesComerciales || defaults.condicionesComerciales,
            observaciones: presupuestoDefaults.observaciones || defaults.observaciones,
            iva: presupuestoDefaults.defaultIva,
          });
        }
      } catch {
        const defaults = emptyForm();
        const proximoSeguimiento = getNextFollowUpDate(currentUser?.consulta_follow_up_days);
        if (active) {
          setFormData({
            ...defaults,
            nroPpto: 1,
            asesor: defaultAsesorCodigo || defaults.asesor,
            proximoSeguimiento,
            condicionesComerciales: presupuestoDefaults.condicionesComerciales || defaults.condicionesComerciales,
            observaciones: presupuestoDefaults.observaciones || defaults.observaciones,
            iva: presupuestoDefaults.defaultIva,
          });
        }
      }
    };

    loadNextNroPpto();
    return () => { active = false; };
  }, [
    consulta,
    open,
    workspace?.id,
    presupuestoDefaults.condicionesComerciales,
    presupuestoDefaults.observaciones,
    presupuestoDefaults.defaultIva,
    currentUser?.consulta_follow_up_days,
    currentUser?.asesor_codigo,
    currentUser?.email,
    currentUser?.role,
    defaultAsesorCodigo,
  ]);

  useEffect(() => {
    if (!open || consulta?.id) return;
    setFormData((prev) => {
      const next = { ...prev };
      let changed = false;
      if (!prev.condicionesComerciales?.trim() && presupuestoDefaults.condicionesComerciales) {
        next.condicionesComerciales = presupuestoDefaults.condicionesComerciales;
        changed = true;
      }
      if (!prev.observaciones?.trim() && presupuestoDefaults.observaciones) {
        next.observaciones = presupuestoDefaults.observaciones;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [
    open,
    consulta?.id,
    presupuestoDefaults.condicionesComerciales,
    presupuestoDefaults.observaciones,
  ]);

  useEffect(() => {
    if (!open || consulta || !defaultAsesorCodigo) return;
    setFormData((prev) => (prev.asesor ? prev : { ...prev, asesor: defaultAsesorCodigo }));
  }, [open, consulta, defaultAsesorCodigo]);

  useEffect(() => {
    if (!showNewLead || !defaultAsesorCodigo) return;
    setNewLeadData((prev) => (prev.asesor ? prev : { ...prev, asesor: defaultAsesorCodigo }));
  }, [showNewLead, defaultAsesorCodigo]);

  useEffect(() => {
    if (!open) {
      clearCallTarget();
      return;
    }
    const phone = formData.contactoWhatsapp;
    const label = formData.contactoNombre;
    if (phone) {
      setCallTarget({ phone, label });
    } else {
      clearCallTarget();
    }
  }, [open, formData.contactoWhatsapp, formData.contactoNombre, setCallTarget, clearCallTarget]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleEtapaChange = (etapa) => {
    setFormData((prev) => {
      const fechaGanado = isWonStage(etapa, etapas)
        ? (prev.fechaGanado || todayDateString())
        : "";
      return { ...prev, etapa, fechaGanado };
    });
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const updateItem = (index, field, value) => {
    setFormData((prev) => {
      const itemsEdited = prev.items.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      });
      const { nextItems, totalText } = computeItemsAndTotal(itemsEdited, prev.iva);
      return {
        ...prev,
        items: nextItems,
        descripcionServicio: nextItems[0]?.descripcionServicio ?? "",
        precioUnitario: nextItems[0]?.precioUnitario ?? "",
        cantidad: nextItems[0]?.cantidad ?? "",
        importe: totalText,
      };
    });
  };

  const handleIvaChange = (newIva) => {
    const ivaNum = parseFloat(newIva);
    setFormData((prev) => {
      const { nextItems, totalText } = computeItemsAndTotal(prev.items, ivaNum);
      return {
        ...prev,
        iva: ivaNum,
        items: nextItems,
        importe: totalText,
      };
    });
  };

  const addItem = () => {
    setFormData((prev) => {
      const { nextItems, totalText } = computeItemsAndTotal([
        ...prev.items,
        createItem({ descripcionServicio: "" }),
      ], prev.iva);
      return {
        ...prev,
        items: nextItems,
        descripcionServicio: nextItems[0]?.descripcionServicio ?? "",
        precioUnitario: nextItems[0]?.precioUnitario ?? "",
        cantidad: nextItems[0]?.cantidad ?? "",
        importe: totalText,
      };
    });
  };

  const addCatalogItem = ({ descripcionServicio, precioUnitario, cantidad }) => {
    setFormData((prev) => {
      const { nextItems, totalText } = computeItemsAndTotal(
        [...prev.items, createItem({ descripcionServicio, precioUnitario, cantidad })],
        prev.iva,
      );
      return {
        ...prev,
        items: nextItems,
        descripcionServicio: nextItems[0]?.descripcionServicio ?? "",
        precioUnitario: nextItems[0]?.precioUnitario ?? "",
        cantidad: nextItems[0]?.cantidad ?? "",
        importe: totalText,
      };
    });
  };

  const removeItem = (index) => {
    setFormData((prev) => {
      const filtered = prev.items.filter((_, i) => i !== index);
      const nextItems = filtered.length > 0 ? filtered : [createItem()];
      const { nextItems: recalculatedItems, totalText } = computeItemsAndTotal(nextItems, prev.iva);
      return {
        ...prev,
        items: recalculatedItems,
        descripcionServicio: recalculatedItems[0]?.descripcionServicio ?? "",
        precioUnitario: recalculatedItems[0]?.precioUnitario ?? "",
        cantidad: recalculatedItems[0]?.cantidad ?? "",
        importe: totalText,
      };
    });
  };

  const handleCreateLead = async () => {
    if (!newLeadData.nombre?.trim()) {
      toast.error("El nombre del lead es requerido");
      return;
    }
    if (!newLeadData.asesor) {
      toast.error("Debe seleccionar un asesor");
      return;
    }
    if (!newLeadData.whatsapp?.trim()) {
      toast.error("El número de WhatsApp es requerido");
      return;
    }
    if (!newLeadData.canalOrigen) {
      toast.error("Seleccioná el canal de origen");
      return;
    }
    const leadAsesor = resolveAsesorFromMap(newLeadData.asesor, firmasYAsesoresMap);
    if (!leadAsesor) {
      toast.error("Asesor no válido o sin catálogo");
      return;
    }
    try {
      await entities.Contacto.create({
        workspace_id: workspace?.id || "local",
        nombre: newLeadData.nombre.trim(),
        whatsapp: newLeadData.whatsapp.trim(),
        empresa: newLeadData.empresa?.trim() || "",
        asesor: leadAsesor.codigo,
        asesor_id: leadAsesor.asesor_id,
        canalOrigen: newLeadData.canalOrigen,
      });
      set("contactoNombre", newLeadData.nombre.trim());
      set("asesor", leadAsesor.codigo);
      set("contactoWhatsapp", newLeadData.whatsapp.trim());
      set("canalOrigen", newLeadData.canalOrigen);
      setNewLeadData({
        nombre: "",
        whatsapp: "",
        empresa: "",
        asesor: defaultAsesorCodigo || "",
        canalOrigen: "",
      });
      setShowNewLead(false);
      toast.success("Lead creado y asignado");
    } catch (e) {
      toast.error("Error al crear lead: " + e.message);
    }
  };

  const handleSubmit = async () => {
    if (!formData.contactoNombre?.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (formData.etapa === "NUEVO LEAD") {
      if (!formData.contactoWhatsapp?.trim()) {
        toast.error("El número de teléfono / WhatsApp es requerido para NUEVO LEAD");
        return;
      }
      if (!formData.canalOrigen) {
        toast.error("El canal de origen es requerido para NUEVO LEAD");
        return;
      }
      if (!formData.asesor) {
        toast.error("El asesor es requerido para NUEVO LEAD");
        return;
      }
      if (!formData.proximoSeguimiento) {
        toast.error("La fecha de próximo seguimiento es requerida para NUEVO LEAD");
        return;
      }
    }
    if (formData.tipoAplicacion === TIPO_APLICACION_BOLSA && !isFibraKgValidForBolsa(formData.fibraKg)) {
      toast.error("Falta poner kg fibra, campo obligatorio");
      return;
    }
    setLoading(true);
    try {
      const workspaceId = workspace?.id || "local";
      const nroPptoValue = consulta?.id ? formData.nroPpto : null;
      const asesorResolved = resolveAsesorFromMap(formData.asesor, firmasYAsesoresMap);
      if (!asesorResolved) {
        toast.error("Asesor no válido o sin catálogo");
        setLoading(false);
        return;
      }

      let fechaGanadoValue = null;
      if (isWonStage(formData.etapa, etapas)) {
        const existing = getFechaGanadoFromConsulta(consulta);
        const patch = applyFechaGanadoOnStageChange({
          previousStage: consulta?.pipeline_stage ?? consulta?.etapa,
          nextStage: formData.etapa,
          currentFechaGanado: existing,
          patch: {},
          etapas,
        });
        fechaGanadoValue = patch.fecha_ganado ?? existing ?? null;
      }

      const itemsForDb = formData.items.map((item) => ({
        descripcionServicio: item.descripcionServicio,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        importe: item.importe,
      }));
      const ivaPercent = parseIvaPercent(formData.iva, presupuestoDefaults.defaultIva);
      const totales = calcularTotalesConsulta(itemsForDb, ivaPercent);

      const payload = {
        // Usar nombres de columna en minúsculas para compatibilidad con PostgreSQL
        contactonombre: formData.contactoNombre,
        contactowhatsapp: formData.contactoWhatsapp,
        asesor: asesorResolved.codigo,
        asesor_id: asesorResolved.asesor_id,
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
        importe: totales.total_importe || (formData.importe !== "" ? parseFloat(formData.importe) : null),
        subtotal: totales.subtotal,
        iva_value: totales.iva_value,
        total_importe: totales.total_importe,
        tipocliente: formData.tipoCliente,
        canalorigen: formData.canalOrigen,
        descripcionservicio: formData.items?.[0]?.descripcionServicio || formData.descripcionServicio,
        preciounitario: formData.items?.[0]?.precioUnitario !== "" ? parseFloat(formData.items[0].precioUnitario) : null,
        cantidad: formData.items?.[0]?.cantidad !== "" ? parseFloat(formData.items[0].cantidad) : null,
        observaciones: formData.observaciones,
        notas: formData.notas || null,
        nroppto:
          nroPptoValue !== "" && nroPptoValue != null ? parseInt(nroPptoValue, 10) : null,
        iva: ivaPercent,
        empresa: formData.empresa || "EMAT",
        fechapresupuesto: formData.fechaPresupuesto || new Date().toISOString().split("T")[0],
        diasvalidez: formData.diasValidez !== "" ? parseInt(formData.diasValidez) : 30,
        condicionescomerciales: formData.condicionesComerciales,
        proximoseguimiento: formData.proximoSeguimiento || null,
        fecha_ganado: fechaGanadoValue,
        razonperdida: formData.razonPerdida || null,
        firmaasesor: asesorResolved.firma,
        items: itemsForDb,
        workspace_id: workspace?.id || "local",
      };
      if (consulta?.id) {
        try {
          await entities.Consulta.update(consulta.id, payload);
        } catch (err) {
          const fallbackPayload = buildFallbackPayload(payload, err);
          if (Object.keys(fallbackPayload).length !== Object.keys(payload).length) {
            await entities.Consulta.update(consulta.id, fallbackPayload);
          } else {
            throw err;
          }
        }
        toast.success("Presupuesto actualizado");
      } else {
        const createRow = async (row) => {
          try {
            return await entities.Consulta.create(row);
          } catch (err) {
            const fallbackPayload = buildFallbackPayload(row, err);
            if (Object.keys(fallbackPayload).length !== Object.keys(row).length) {
              return await entities.Consulta.create(fallbackPayload);
            }
            throw err;
          }
        };
        try {
          const { nroppto: _omit, ...payloadWithoutNro } = payload;
          const created = await createConsultaWithNroppto(
            createRow,
            payloadWithoutNro,
            workspaceId,
          );
          set("nroPpto", created?.nroppto != null ? String(created.nroppto) : "");
          toast.success("Presupuesto creado");
        } catch (err) {
          if (isNropptoUniqueViolation(err)) {
            toast.error("No se pudo asignar número de presupuesto; intentá de nuevo.");
          } else {
            throw err;
          }
        }
      }
      onSave?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openPdfPreview = () => {
    const asesorResolved = resolveAsesorFromMap(formData.asesor, firmasYAsesoresMap);
    if (!asesorResolved) {
      toast.error("Asesor no válido o sin catálogo");
      return;
    }
    const payload = {
      ...formData,
      nroppto: formData.nroPpto,
      asesor: asesorResolved.codigo,
      firmaasesor: asesorResolved.firma,
    };
    const doc = buildConsultaPdf(payload);
    const blob = doc.output("blob");
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    const url = URL.createObjectURL(blob);
    setPreviewPayload(payload);
    setPdfPreviewUrl(url);
    setShowPdfPreview(true);
  };

  const downloadPreviewPdf = () => {
    if (!previewPayload) return;
    const doc = buildConsultaPdf(previewPayload);
    const nro = previewPayload.nroppto || "S/N";
    const cliente = previewPayload.contactoNombre || "Cliente";
    doc.save(`Presupuesto nº ${nro} - ${cliente}.pdf`);
  };

  const { subtotal, ivaValue, totalImporte } = computeItemsAndTotal(formData.items, formData.iva);

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) clearCallTarget();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {consulta ? `Editar Presupuesto #${consulta.nroppto ?? consulta.nroPpto ?? ""}` : "Nuevo Presupuesto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* CLIENTE */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cliente</p>
              <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowNewLead(true)}>
                <Plus className="w-3 h-3" />
                Nuevo cliente / lead
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ubicación</Label>
                <Input value={formData.ubicacionObra} onChange={e => set("ubicacionObra", e.target.value)} placeholder="Ej: Barrio Arguello, Córdoba" />
              </div>
              <div className="space-y-1">
                <Label>Provincia</Label>
                <Select value={formData.provincia} onValueChange={v => set("provincia", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {PROVINCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Superficie (m²)</Label>
                <Input type="number" value={formData.superficieM2} onChange={e => set("superficieM2", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>
                  Fibra (kg){formData.tipoAplicacion === TIPO_APLICACION_BOLSA && " *"}
                </Label>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>N° Presupuesto</Label>
                <Input type="number" value={formData.nroPpto} readOnly aria-readonly="true" className="bg-slate-50" />
              </div>
              <div className="space-y-1">
                <Label>Asesor</Label>
                <Select value={formData.asesor} onValueChange={v => set("asesor", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {asesorOptions.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={formData.etapa} onValueChange={handleEtapaChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{etapas.map(e => <SelectItem key={e.pipeline_stage} value={e.pipeline_stage}>{e.pipeline_stage}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isWonStage(formData.etapa, etapas) && (
                <div className="space-y-1">
                  <Label>Fecha ganada</Label>
                  <Input
                    type="date"
                    value={formData.fechaGanado}
                    readOnly
                    aria-readonly="true"
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-slate-500">
                    Se completa al marcar como GANADA o EJECUTADA
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <Label>IVA</Label>
                <Select value={ivaSelectValue(formData.iva)} onValueChange={handleIvaChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IVA_RATES.map((rate) => (
                      <SelectItem key={rate} value={String(rate)}>
                        {formatIvaLabel(rate)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2 rounded-md border bg-slate-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal neto:</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">IVA ({formatIvaLabel(formData.iva)}%):</span>
                  <span>{formatMoney(ivaValue)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-slate-200 mt-1">
                  <span>Total:</span>
                  <span>{formatMoney(totalImporte)}</span>
                </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCatalogOpen(true)}
                    >
                      <Package className="w-3 h-3 mr-1" />
                      Agregar item catálogo
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addItem}>
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar item
                    </Button>
                  </div>
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
                  <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                    <span className="text-sm font-medium text-slate-600">Total ítems</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formData.items.length} {formData.items.length === 1 ? "ítem" : "ítems"}
                    </span>
                  </div>
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

          {/* Texto presupuesto (PDF) */}
          <div className="space-y-1">
            <Label>Observaciones (presupuesto / PDF)</Label>
            <Textarea value={formData.observaciones} onChange={e => set("observaciones", e.target.value)} placeholder="Texto que verá el cliente en el PDF..." rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Notas (solo CRM / pipeline)</Label>
            <Textarea value={formData.notas} onChange={e => set("notas", e.target.value)} placeholder="Notas internas, no se incluyen en el PDF..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={openPdfPreview}
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

    <Dialog
      open={showPdfPreview}
      onOpenChange={(next) => {
        setShowPdfPreview(next);
        if (!next && pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl("");
        }
      }}
    >
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Vista preliminar del presupuesto</DialogTitle>
        </DialogHeader>
        <div className="w-full h-[70vh] rounded-md border overflow-hidden bg-slate-100">
          {pdfPreviewUrl ? (
            <iframe title="Vista previa PDF" src={pdfPreviewUrl} className="w-full h-full" />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No se pudo generar la vista previa.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPdfPreview(false)}>Cerrar</Button>
          <Button onClick={downloadPreviewPdf} disabled={!previewPayload}>
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CatalogoProductoPickerDialog
      open={catalogOpen}
      onOpenChange={setCatalogOpen}
      onSelect={addCatalogItem}
    />

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
            <Label>Asesor *</Label>
            <Select value={newLeadData.asesor} onValueChange={v => setNewLeadData(prev => ({ ...prev, asesor: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {asesorOptions.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>WhatsApp *</Label>
            <Input value={newLeadData.whatsapp} onChange={e => setNewLeadData(prev => ({ ...prev, whatsapp: e.target.value }))} placeholder="+54 9 351 123-4567" type="tel" />
          </div>
          <div className="space-y-1">
            <Label>Canal de origen *</Label>
            <Select value={newLeadData.canalOrigen} onValueChange={v => setNewLeadData(prev => ({ ...prev, canalOrigen: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{CANALES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
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
