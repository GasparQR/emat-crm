import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { entities } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MessageCircle, Mail, MapPin, ArrowLeft, Trash2, Edit, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ContactoWhatsAppSender from "@/components/crm/ContactoWhatsAppSender";
import MobileContactoListItem from "@/components/crm/MobileContactoListItem";
import QuickCallButton from "@/components/crm/QuickCallButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActiveCall } from "@/components/context/ActiveCallContext";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { getNextBusinessDay } from "@/components/utils/dateUtils";
import {
  buildPipelineStagePatch,
  buildPipelineStagePatchAsync,
} from "@/lib/pipelineStage";
import { filterConsultasByVisibility, filterContactosByVisibility } from "@/lib/permissions";
import { useAsesores } from "@/components/hooks/useAsesores";

import { getAsesorBgClass } from "@/lib/asesorColors";

export default function Contactos() {
  const [showForm, setShowForm] = useState(false);
  const [selectedContacto, setSelectedContacto] = useState(null);
  const [whatsappTarget, setWhatsappTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroProvincia, setFiltroProvincia] = useState("todos");
  const [filtroSegmento, setFiltroSegmento] = useState("todos");
  const [formData, setFormData] = useState({
    nombre: "", empresa: "", whatsapp: "", telefonoDisplay: "",
    email: "", localidad: "", provincia: "", segmento: "",
    canalOrigen: "", notas: "", asesor: "", pipeline_stage: ""
  });

  // Pipeline dialog state
  const [pipelineDialog, setPipelineDialog] = useState(null); // { contacto, mensaje }
  const [etapaSeleccionada, setEtapaSeleccionada] = useState("");

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const { data: currentUser } = useCurrentUser();
  const {
    asesorOptions,
    defaultAsesorCodigo,
    getAsesorInitials,
    getAsesorNombre,
    resolveAsesorForSave,
  } = useAsesores(currentUser);

  useEffect(() => {
    if (!showForm || selectedContacto || !defaultAsesorCodigo) return;
    setFormData((prev) => (prev.asesor ? prev : { ...prev, asesor: defaultAsesorCodigo }));
  }, [showForm, selectedContacto, defaultAsesorCodigo]);
  const isMobile = useIsMobile();
  const { setCallTarget, clearCallTarget } = useActiveCall();

  const { data: contactos = [], isLoading } = useQuery({
    queryKey: ["contactos", workspace?.id],
    queryFn: () => workspace
      ? entities.Contacto.filter({ workspace_id: workspace.id }, "nombre", 2000)
      : [],
    enabled: !!workspace,
  });

  const { data: pipelineStages = [] } = useQuery({
    queryKey: ["pipeline-stages", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace,
  });

  const { data: consultas = [] } = useQuery({
    queryKey: ["consultas-pipeline", workspace?.id],
    queryFn: () => workspace
      ? entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 500)
      : [],
    enabled: !!workspace,
  });

  const visibleConsultas = useMemo(() => filterConsultasByVisibility(consultas, currentUser), [consultas, currentUser]);
  const visibleContactos = useMemo(() => filterContactosByVisibility(contactos, currentUser), [contactos, currentUser]);

  const consultaMap = useMemo(() => {
    const map = {};
    visibleConsultas.forEach(c => { map[c.contactonombre] = c; });
    return map;
  }, [visibleConsultas]);

  const stageColorMap = useMemo(() => {
    const map = {};
    pipelineStages.forEach(s => { map[s.pipeline_stage] = s.color; });
    return map;
  }, [pipelineStages]);

  const { provincias, segmentos } = useMemo(() => {
    const pMap = {}, sMap = {};
    visibleContactos.forEach(c => {
     if (c.provincia) pMap[c.provincia] = (pMap[c.provincia] || 0) + 1;
     if (c.segmento) sMap[c.segmento] = (sMap[c.segmento] || 0) + 1;
    });
    return {
      provincias: Object.entries(pMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, count: v })),
      segmentos: Object.entries(sMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, count: v })),
    };
  }, [visibleContactos]);

  const createMutation = useMutation({
    mutationFn: (data) => entities.Contacto.create({ ...data, workspace_id: workspace?.id || "local" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactos"] });
      toast.success("Contacto creado");
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Contacto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactos"] });
      toast.success("Contacto actualizado");
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Contacto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactos"] });
      toast.success("Contacto eliminado");
    },
  });

  /** Pipeline, Consultas y Hoy leen filas de `Consulta`; mantener cachés alineadas. */
  const invalidateConsultasQueries = () => {
    const wid = workspace?.id;
    queryClient.invalidateQueries({ queryKey: ["consultas-pipeline", wid] });
    queryClient.invalidateQueries({ queryKey: ["consultas-list", wid] });
    queryClient.invalidateQueries({ queryKey: ["consultas-hoy", wid] });
  };

  const updateConsultaMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Consulta.update(id, data),
    onSuccess: (_, variables) => {
      invalidateConsultasQueries();
      toast.success(`Etapa actualizada a "${variables.data.pipeline_stage}"`);
      setPipelineDialog(null);
      setEtapaSeleccionada("");
    },
    onError: (e) => toast.error("Error al actualizar: " + e.message),
  });

  const createConsultaMutation = useMutation({
    mutationFn: (data) => entities.Consulta.create({ ...data, workspace_id: workspace?.id || "local" }),
    onSuccess: (_, variables) => {
      invalidateConsultasQueries();
      toast.success(`Consulta creada en "${variables.pipeline_stage}" para ${variables.contactonombre}`);
      setPipelineDialog(null);
      setEtapaSeleccionada("");
    },
    onError: (e) => {
      toast.error("Error al crear consulta: " + e.message);
    },
  });

  // Al enviar WhatsApp: abrir diálogo de etapa en lugar de crear automáticamente
  const handleMessageSent = ({ contacto: c, mensaje }) => {
    if (pipelineStages.length === 0) {
      toast.error("No hay etapas en el pipeline. Crea al menos una etapa.");
      return;
    }
    const existingConsulta = consultaMap[c.nombre];
    if (existingConsulta) {
      // Pre-seleccionar la etapa actual del contacto
      setEtapaSeleccionada(existingConsulta.pipeline_stage || "");
    } else {
      // Pre-seleccionar la primera etapa
      const primeraEtapa = pipelineStages.find(s => s.orden === 1)?.pipeline_stage
        || pipelineStages.find(s => s.orden === 0)?.pipeline_stage
        || pipelineStages[0]?.pipeline_stage;
      setEtapaSeleccionada(primeraEtapa || "");
    }
    setPipelineDialog({ contacto: c, mensaje });
  };

  const getNextNroPpto = async () => {
    const rows = await entities.Consulta.filter(
      { workspace_id: workspace?.id || "local" },
      "-nroppto",
      2000
    );
    const maxNro = (rows || []).reduce((max, item) => {
      const nro = Number(item?.nroppto);
      if (!Number.isFinite(nro)) return max;
      return Math.max(max, nro);
    }, 0);
    return maxNro + 1;
  };

  // Confirmar creación en pipeline con la etapa elegida
  const handleConfirmPipeline = async () => {
    if (!etapaSeleccionada || !pipelineDialog) return;
    const { contacto: c } = pipelineDialog;

    // Chequeo de duplicado en CUALQUIER etapa
    const consultaExistente = consultas.find(q => q.contactonombre === c.nombre);
    if (consultaExistente) {
      toast.info(`${c.nombre} ya tiene una consulta en etapa "${consultaExistente.pipeline_stage}". No se creó un duplicado.`);
      setPipelineDialog(null);
      setEtapaSeleccionada("");
      return;
    }

    const followUpDays = currentUser?.consulta_follow_up_days ?? 3;
    const now = new Date();
    const proximoSeguimiento = getNextBusinessDay(now, followUpDays);

    const nroPptoValue = await getNextNroPpto();

    createConsultaMutation.mutate({
      contactonombre: c.nombre,
      contactowhatsapp: c.whatsapp || "",
      canalorigen: c.canalOrigen || "WhatsApp",
      pipeline_stage: etapaSeleccionada,
      asesor: c.asesor || "",
      mes: now.toLocaleString("es-AR", { month: "long" }).toUpperCase(),
      ano: now.getFullYear(),
      proximoseguimiento: proximoSeguimiento,
      nroppto: nroPptoValue,
    });
  };

  // Actualizar etapa de una consulta existente
  const handleUpdatePipelineStage = async () => {
    if (!etapaSeleccionada || !consultaExistenteEnDialog) return;
    const patch = await buildPipelineStagePatchAsync(
      consultaExistenteEnDialog,
      etapaSeleccionada,
      { etapas: pipelineStages, getNextNroPpto }
    );
    if (!patch) return;

    updateConsultaMutation.mutate({
      id: consultaExistenteEnDialog.id,
      data: patch,
    });
  };

  const resetForm = ({ forNew = false } = {}) => {
    setFormData({
      nombre: "", empresa: "", whatsapp: "", telefonoDisplay: "",
      email: "", localidad: "", provincia: "", segmento: "",
      canalOrigen: "", notas: "",
      asesor: forNew ? (defaultAsesorCodigo || "") : "",
      pipeline_stage: "",
    });
    setSelectedContacto(null);
    setShowForm(false);
  };

  const handleEdit = (contacto) => {
    if (contacto.whatsapp) {
      setCallTarget({ phone: contacto.whatsapp, label: contacto.nombre });
    }
    setSelectedContacto(contacto);
    // Look up existing consulta for this contact to pre-populate pipeline stage
    const consultaExistente = consultas.find(q => q.contactonombre === contacto.nombre);
    setFormData({
      nombre: contacto.nombre || "",
      empresa: contacto.empresa || "",
      whatsapp: contacto.whatsapp || "",
      telefonoDisplay: contacto.telefonoDisplay || "",
      email: contacto.email || "",
      localidad: contacto.localidad || "",
      provincia: contacto.provincia || "",
      segmento: contacto.segmento || "",
      canalOrigen: contacto.canalOrigen || "",
      notas: contacto.notas || "",
      asesor: contacto.asesor || "",
      pipeline_stage: consultaExistente?.pipeline_stage || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.nombre) {
      toast.error("El nombre es requerido");
      return;
    }
    const { pipeline_stage, ...contactData } = formData;

    let asesorResolved = null;
    if (formData.asesor) {
      asesorResolved = resolveAsesorForSave(formData.asesor);
      if (!asesorResolved) {
        toast.error("Asesor no válido o sin catálogo");
        return;
      }
      contactData.asesor = asesorResolved.codigo;
      contactData.asesor_id = asesorResolved.asesor_id;
    }

    try {
      if (selectedContacto) {
        await updateMutation.mutateAsync({ id: selectedContacto.id, data: contactData });
      } else {
        await createMutation.mutateAsync(contactData);
      }

      // Sincronizar etapa y asesor en la fila `Consulta` (pipeline / consultas filtran por consulta.asesor)
      const stage = pipeline_stage && pipeline_stage !== "sin_asignar" ? pipeline_stage : null;
      const asesorNuevo = asesorResolved?.codigo || "";
      const asesorIdNuevo = asesorResolved?.asesor_id || null;
      const consultaExistente = consultas.find(q => q.contactonombre === formData.nombre);

      if (consultaExistente) {
        const patch = {};
        if (stage && consultaExistente.pipeline_stage !== stage) {
          const stagePatch = buildPipelineStagePatch(consultaExistente, stage);
          if (stagePatch) Object.assign(patch, stagePatch);
          const selectedStage = pipelineStages.find(s => s.pipeline_stage === stage);
          if (selectedStage && selectedStage.orden !== 0 && !consultaExistente.nroppto) {
            patch.nroppto = await getNextNroPpto();
          }
        }
        const asesorActual = consultaExistente.asesor ?? "";
        if (asesorNuevo && asesorNuevo !== asesorActual) {
          patch.asesor = asesorNuevo;
          if (asesorIdNuevo) patch.asesor_id = asesorIdNuevo;
          if (asesorResolved?.firma) patch.firmaasesor = asesorResolved.firma;
        }
        if (Object.keys(patch).length > 0) {
          await entities.Consulta.update(consultaExistente.id, patch);
          invalidateConsultasQueries();
          if (patch.pipeline_stage && patch.asesor !== undefined) {
            toast.success("Etapa y asesor actualizados en la consulta vinculada");
          } else if (patch.pipeline_stage) {
            toast.success(`Etapa actualizada a "${patch.pipeline_stage}"`);
          } else {
            toast.success("Asesor sincronizado en pipeline y consultas");
          }
        }
      } else if (stage) {
        const now = new Date();
        const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
        const nroPptoValue = await getNextNroPpto();
        await entities.Consulta.create({
          workspace_id: workspace?.id || "local",
          contactonombre: formData.nombre,
          contactowhatsapp: formData.whatsapp || "",
          canalorigen: formData.canalOrigen || "",
          pipeline_stage: stage,
          asesor: asesorNuevo,
          asesor_id: asesorIdNuevo,
          firmaasesor: asesorResolved?.firma || null,
          mes: MESES[now.getMonth()],
          ano: now.getFullYear(),
          nroppto: nroPptoValue,
        });
        invalidateConsultasQueries();
        toast.success(`Contacto asignado a "${stage}" en el pipeline`);
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  };

  const contactosFiltrados = visibleContactos.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !c.nombre?.toLowerCase().includes(s) &&
        !c.empresa?.toLowerCase().includes(s) &&
        !c.telefonoDisplay?.toLowerCase().includes(s) &&
        !c.whatsapp?.includes(search) &&
        !c.email?.toLowerCase().includes(s) &&
        !c.localidad?.toLowerCase().includes(s)
      ) return false;
    }
    if (filtroProvincia !== "todos" && c.provincia !== filtroProvincia) return false;
    if (filtroSegmento !== "todos" && c.segmento !== filtroSegmento) return false;
    return true;
  });

  // Consulta existente del contacto en pipeline (para mostrar warning en el diálogo)
  const consultaExistenteEnDialog = pipelineDialog
    ? consultas.find(q => q.contactonombre === pipelineDialog.contacto.nombre)
    : null;

  useEffect(() => {
    if (!showForm) return;
    if (formData.whatsapp) {
      setCallTarget({ phone: formData.whatsapp, label: formData.nombre });
    } else {
      clearCallTarget();
    }
  }, [showForm, formData.whatsapp, formData.nombre, setCallTarget, clearCallTarget]);

  const openEtapaDesdeTabla = (contacto) => {
    const q = consultaMap[contacto.nombre];
    if (!q) {
      toast.info("Este contacto no tiene una consulta en el pipeline.");
      return;
    }
    setEtapaSeleccionada(q.pipeline_stage || "");
    setPipelineDialog({ contacto, mensaje: "", fromTable: true });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Contactos</h1>
            <p className="text-slate-500">
              {isLoading ? "Cargando..." : `${contactosFiltrados.length} de ${visibleContactos.length} contactos`}
            </p>
          </div>
          <Button onClick={() => { resetForm({ forNew: true }); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" />Nuevo contacto
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los segmentos</SelectItem>
              {segmentos.map(s => (
                <SelectItem key={s.label} value={s.label}>{s.label} ({s.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroProvincia} onValueChange={setFiltroProvincia}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Provincia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las provincias</SelectItem>
              {provincias.map(p => (
                <SelectItem key={p.label} value={p.label}>{p.label} ({p.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isMobile ? (
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-center py-12 text-slate-400">Cargando contactos...</p>
            ) : contactosFiltrados.length === 0 ? (
              <p className="text-center py-12 text-slate-400">No hay contactos</p>
            ) : (
              contactosFiltrados.map(contacto => (
                <MobileContactoListItem
                  key={contacto.id}
                  contacto={contacto}
                  consulta={consultaMap[contacto.nombre]}
                  stageColor={stageColorMap[consultaMap[contacto.nombre]?.pipeline_stage]}
                  onSelect={setCallTarget}
                  onEdit={handleEdit}
                  onWhatsApp={setWhatsappTarget}
                  onMail={(c) => window.open(`mailto:${c.email}`, "_blank")}
                  onDelete={(c) => {
                    if (window.confirm("¿Eliminar este contacto?")) deleteMutation.mutate(c.id);
                  }}
                  onEtapaClick={openEtapaDesdeTabla}
                />
              ))
            )}
          </div>
        ) : (
        <Card className="overflow-hidden overflow-x-auto">
          <Table className="w-full table-fixed min-w-[640px]">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[8%]" />
              <col className="w-[18%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Teléfono</TableHead>
                <TableHead className="font-semibold">Segmento</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Asesor</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">Cargando contactos...</TableCell>
                </TableRow>
              ) : contactosFiltrados.map(contacto => (
                <TableRow key={contacto.id} className="hover:bg-slate-50">
                  <TableCell className="py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-slate-900 truncate text-sm flex-1">{contacto.nombre}</p>
                        <QuickCallButton phone={contacto.whatsapp} />
                      </div>
                      {contacto.empresa && contacto.empresa !== contacto.nombre && (
                        <p className="text-xs text-slate-500 truncate">{contacto.empresa}</p>
                      )}
                      {(contacto.localidad || contacto.provincia) && (
                        <p className="text-xs text-slate-400 truncate flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          {contacto.localidad || contacto.provincia}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    {(contacto.telefonoDisplay || contacto.whatsapp) ? (
                      <span className="text-sm text-slate-700 truncate block">
                        {contacto.telefonoDisplay || contacto.whatsapp}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {contacto.segmento ? (
                      <Badge variant="secondary" className="text-xs truncate max-w-full block w-fit">{contacto.segmento}</Badge>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {(() => {
                      const consulta = consultaMap[contacto.nombre];
                      if (!consulta) return <span className="text-slate-300">-</span>;
                      const colorClass = stageColorMap[consulta.pipeline_stage] || 'bg-slate-400';
                      return (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 max-w-full text-left rounded-md px-1 py-0.5 hover:bg-slate-100 transition-colors"
                          onClick={() => openEtapaDesdeTabla(contacto)}
                        >
                          <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", colorClass)} />
                          <span className="text-xs text-slate-700 truncate underline-offset-2 hover:underline">
                            {consulta.pipeline_stage}
                          </span>
                        </button>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="py-2">
                    {contacto.asesor ? (
                      <div
                        className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold tracking-tight", getAsesorBgClass(contacto.asesor))}
                        title={getAsesorNombre(contacto.asesor) || contacto.asesor}
                      >
                        {getAsesorInitials(contacto.asesor)}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(contacto)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      {contacto.whatsapp && (
                        <Button size="sm" className="bg-[#25D366] hover:bg-[#20bd5a] text-white h-7 w-7 p-0" onClick={() => setWhatsappTarget(contacto)}>
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {!contacto.whatsapp && contacto.email && (
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => window.open(`mailto:${contacto.email}`, "_blank")}>
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => { if (window.confirm("¿Eliminar este contacto?")) deleteMutation.mutate(contacto.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && contactosFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">No hay contactos</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) { resetForm(); clearCallTarget(); }
        else setShowForm(true);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContacto ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Juan Pérez" />
              </div>
              <div className="space-y-1">
                <Label>Empresa</Label>
                <Input value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} placeholder="Constructora SA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Teléfono (para WhatsApp)</Label>
                <Input value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="5493511234567" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="juan@email.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>localidad</Label>
                <Input value={formData.localidad} onChange={e => setFormData({ ...formData, localidad: e.target.value })} placeholder="Córdoba" />
              </div>
              <div className="space-y-1">
                <Label>Provincia</Label>
                <Input value={formData.provincia} onChange={e => setFormData({ ...formData, provincia: e.target.value })} placeholder="Córdoba" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Segmento</Label>
              <Input value={formData.segmento} onChange={e => setFormData({ ...formData, segmento: e.target.value })} placeholder="Construcción y Desarrollo" />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={formData.notas} onChange={e => setFormData({ ...formData, notas: e.target.value })} placeholder="Observaciones..." rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Asesor</Label>
              <Select value={formData.asesor} onValueChange={v => setFormData({ ...formData, asesor: v === "sin_asignar" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                  {asesorOptions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pipelineStages.length > 0 && (
              <div className="space-y-1">
                <Label>Etapa del Pipeline</Label>
                <Select value={formData.pipeline_stage} onValueChange={v => setFormData({ ...formData, pipeline_stage: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                    {pipelineStages.map(s => (
                      <SelectItem key={s.pipeline_stage} value={s.pipeline_stage}>{s.pipeline_stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit}>{selectedContacto ? "Guardar" : "Crear contacto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Sender Dialog */}
      <ContactoWhatsAppSender
        open={!!whatsappTarget}
        onOpenChange={(open) => { if (!open) setWhatsappTarget(null); }}
        contacto={whatsappTarget}
        onMessageSent={handleMessageSent}
      />

      {/* Pipeline Stage Dialog — se abre luego de enviar WhatsApp */}
      <Dialog
        open={!!pipelineDialog}
        onOpenChange={(open) => {
          if (!open) { setPipelineDialog(null); setEtapaSeleccionada(""); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{consultaExistenteEnDialog ? "Actualizar etapa del pipeline" : "Agregar al pipeline"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {pipelineDialog?.fromTable ? (
              <p className="text-sm text-slate-600">
                Cambiar etapa del pipeline para{" "}
                <span className="font-semibold">{pipelineDialog?.contacto.nombre}</span>.
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                Mensaje enviado a <span className="font-semibold">{pipelineDialog?.contacto.nombre}</span>.{" "}
                {consultaExistenteEnDialog
                  ? "Este contacto ya está en el pipeline. ¿Querés actualizar su etapa?"
                  : "¿En qué etapa querés registrar esta consulta?"}
              </p>
            )}

            {/* Warning si ya existe en pipeline */}
            {consultaExistenteEnDialog && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Etapa actual: <strong>"{consultaExistenteEnDialog.pipeline_stage}"</strong>. Podés cambiarla abajo.
                </span>
              </div>
            )}

            <div className="space-y-1">
              <Label>{consultaExistenteEnDialog ? "Nueva etapa" : "Etapa"}</Label>
              <Select value={etapaSeleccionada} onValueChange={setEtapaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una etapa" />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map(s => (
                    <SelectItem key={s.pipeline_stage} value={s.pipeline_stage}>{s.pipeline_stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setPipelineDialog(null); setEtapaSeleccionada(""); }}
            >
              {pipelineDialog?.fromTable ? "Cancelar" : "Omitir"}
            </Button>
            {!consultaExistenteEnDialog && !pipelineDialog?.fromTable && (
              <Button
                onClick={handleConfirmPipeline}
                disabled={!etapaSeleccionada || createConsultaMutation.isPending}
              >
                {createConsultaMutation.isPending ? "Creando..." : "Agregar al pipeline"}
              </Button>
            )}
            {consultaExistenteEnDialog && (
              <Button
                onClick={handleUpdatePipelineStage}
                disabled={
                  !etapaSeleccionada ||
                  etapaSeleccionada === consultaExistenteEnDialog.pipeline_stage ||
                  updateConsultaMutation.isPending
                }
              >
                {updateConsultaMutation.isPending ? "Actualizando..." : "Actualizar etapa"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
