import { useState, useMemo } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { useAuth } from "@/lib/SimpleAuthContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Search, Calendar, MoreHorizontal, ArrowLeft, Trash2, MapPin, Ruler, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import ConsultaForm from "@/components/crm/ConsultaForm";
import DetalleConsultaDialog from "@/components/crm/DetalleConsultaDialog";
import MobileConsultaListItem from "@/components/crm/MobileConsultaListItem";
import QuickCallButton from "@/components/crm/QuickCallButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActiveCall } from "@/components/context/ActiveCallContext";
import { toast } from "sonner";
import { openConsultaPdf } from "@/lib/consultaPdf";
import { buildPipelineStagePatchAsync, getFechaGanadoFromConsulta } from "@/lib/pipelineStage";
import { filterConsultasByVisibility, isLogistica as roleIsLogistica } from "@/lib/permissions";
import { buildAsesorFilterOptions, useAsesores } from "@/components/hooks/useAsesores";
import AsesorAvatar from "@/components/crm/AsesorAvatar";
import { allocateConsultaNroPpto } from "@/lib/consultaNroppto";
import MultiSelectFilter from "@/components/crm/filters/MultiSelectFilter";
import ViewFilterBar from "@/components/crm/filters/ViewFilterBar";
import useWorkspaceViewConfig from "@/hooks/useWorkspaceViewConfig";
import useViewSessionFilters from "@/hooks/useViewSessionFilters";
import {
  getEnabledColumns,
  isFilterEnabled,
  matchesMultiFilter,
} from "@/lib/viewLayout";

export default function Consultas() {
  const [showForm, setShowForm] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [detalleConsulta, setDetalleConsulta] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroFechaGanadoDesde, setFiltroFechaGanadoDesde] = useState("");
  const [filtroFechaGanadoHasta, setFiltroFechaGanadoHasta] = useState("");

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";
  const { viewConfig } = useWorkspaceViewConfig(workspaceId);
  const { getFilter, setFilter } = useViewSessionFilters("consultas", workspaceId, [
    "estado", "asesor", "ano",
  ]);
  const enabledColumns = useMemo(
    () => getEnabledColumns("consultas", viewConfig),
    [viewConfig],
  );
  const { user } = useAuth();
  const isLogistica = roleIsLogistica(user);
  const { asesorOptions, getAsesorNombre } = useAsesores(user);
  const isMobile = useIsMobile();
  const { setCallTarget } = useActiveCall();

  const { data: etapas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace,
  });

  const etapaColorMap = useMemo(
    () => Object.fromEntries(etapas.map(s => [s.pipeline_stage, s.color])),
    [etapas]
  );

  const allocateNroPpto = () => allocateConsultaNroPpto(workspaceId);

  const stageMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Consulta.update(id, data),
    onSuccess: () => {
      const wid = workspace?.id;
      queryClient.invalidateQueries({ queryKey: ["consultas-list", wid] });
      queryClient.invalidateQueries({ queryKey: ["consultas-pipeline", wid] });
      queryClient.invalidateQueries({ queryKey: ["consultas-hoy", wid] });
      toast.success("Etapa actualizada");
    },
    onError: (e) => toast.error(e?.message || "Error al actualizar etapa"),
  });

  const handleEstadoChange = async (c, newStage) => {
    const patch = await buildPipelineStagePatchAsync(c, newStage, {
      etapas,
      allocateNroPpto,
    });
    if (!patch) return;
    stageMutation.mutate({ id: c.id, data: patch });
  };

  const { data: consultas = [], refetch, isLoading } = useQuery({
    queryKey: ["consultas-list", workspace?.id],
    queryFn: () => workspace
      ? entities.Consulta.filter({ workspace_id: workspace.id }, "-nroppto", 2000)
      : [],
    enabled: !!workspace,
  });

  const handleDelete = async (consulta) => {
    await entities.Consulta.delete(consulta.id);

    queryClient.invalidateQueries({ queryKey: ["consultas-list", workspace?.id] });
    queryClient.invalidateQueries({ queryKey: ["consultas-pipeline", workspace?.id] });
    queryClient.invalidateQueries({ queryKey: ["consultas-hoy", workspace?.id] });

    const nombre = consulta?.contactonombre;
    const wid = consulta?.workspace_id ?? workspace?.id;
    let syncOk = true;
    if (nombre && wid) {
      try {
        const remaining = await entities.Consulta.filter(
          { workspace_id: wid, contactonombre: nombre },
          "-created_date",
          200
        );
        const asesorSiguiente = remaining.length > 0 ? (remaining[0].asesor ?? "") : "";

        const contactosMatch = await entities.Contacto.filter(
          { workspace_id: wid, nombre: nombre },
          "nombre",
          50
        );
        for (const c of contactosMatch) {
          if ((c.asesor ?? "") !== asesorSiguiente) {
            await entities.Contacto.update(c.id, { asesor: asesorSiguiente });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["contactos", workspace?.id] });
      } catch (e) {
        console.error("Sync asesor en contacto tras borrar consulta:", e);
        syncOk = false;
      }
    }

    if (syncOk) {
      toast.success("Presupuesto eliminado");
    } else {
      toast.error("Presupuesto eliminado, pero no se pudo actualizar el asesor en Contactos.");
    }
  };

  const visibleConsultas = useMemo(
    () => filterConsultasByVisibility(consultas, user, etapas),
    [consultas, user, etapas],
  );
  const filterAsesorOptions = useMemo(
    () => buildAsesorFilterOptions(asesorOptions, visibleConsultas),
    [asesorOptions, visibleConsultas]
  );
  const anos = [...new Set(visibleConsultas.map(c => c.ano).filter(Boolean))].sort((a,b) => b-a);

  // ✅ LÓGICA DE FILTRADO CORREGIDA
  const filtradas = visibleConsultas.filter(c => {
    // Filtro de búsqueda (busca en nombre, nº ppto o ubicación con OR)
    if (search) {
      const s = search.toLowerCase();
      const matchesSearch =
        (c.contactonombre?.toLowerCase().includes(s)) ||
        (String(c.nroppto || "").includes(s)) ||
        (c.ubicacionobra?.toLowerCase().includes(s));
      if (!matchesSearch) return false;
    }

    // Filtro de estado (solo si no es "todos")
    if (!matchesMultiFilter(getFilter("estado"), c.pipeline_stage)) return false;
    if (!matchesMultiFilter(getFilter("asesor"), c.asesor)) return false;
    if (!matchesMultiFilter(getFilter("ano"), c.ano != null ? String(c.ano) : "")) return false;

    if (filtroFechaGanadoDesde || filtroFechaGanadoHasta) {
      const fechaGanado = getFechaGanadoFromConsulta(c);
      if (!fechaGanado) return false;
      if (filtroFechaGanadoDesde && moment(fechaGanado).isBefore(moment(filtroFechaGanadoDesde), "day")) {
        return false;
      }
      if (filtroFechaGanadoHasta && moment(fechaGanado).isAfter(moment(filtroFechaGanadoHasta), "day")) {
        return false;
      }
    }

    return true;
  });

  const setCallFromConsulta = (c) => {
    const phone = c.contactowhatsapp ?? c.contactoWhatsapp;
    if (phone) setCallTarget({ phone, label: c.contactonombre });
  };

  const handleEdit = (c) => {
    setCallFromConsulta(c);
    setSelectedConsulta(c);
    setShowForm(true);
  };

  const openRow = (c) => {
    setCallFromConsulta(c);
    if (isLogistica) setDetalleConsulta(c);
    else {
      setSelectedConsulta(c);
      setShowForm(true);
    }
  };

  const colCount = Math.max(enabledColumns.length, 1);

  const renderConsultaCell = (colId, c) => {
    const seguimientoVencido = c.proximoseguimiento && moment(c.proximoseguimiento).isBefore(moment(), "day");
    switch (colId) {
      case "cliente":
        return (
          <>
            <div className="min-w-0 flex items-center gap-1.5">
              <p className="font-medium text-slate-900 truncate text-sm flex-1">{c.contactonombre}</p>
              <QuickCallButton phone={c.contactowhatsapp ?? c.contactoWhatsapp} />
            </div>
            <div className="min-w-0">
              {c.nroppto && (
                <p className="text-xs text-slate-400 truncate">#{c.nroppto} · {c.mes} {c.ano}</p>
              )}
              {c.ubicacionobra && (
                <p className="text-xs text-slate-400 truncate flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  {c.ubicacionobra}
                </p>
              )}
            </div>
          </>
        );
      case "asesor":
        return c.asesor ? (
          <AsesorAvatar
            codigo={c.asesor}
            size="sm"
            title={getAsesorNombre(c.asesor) || c.asesor}
          />
        ) : null;
      case "m2_tipo":
        return c.superficiem2 ? (
          <div className="flex items-center gap-1 text-sm font-medium">
            <Ruler className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{c.superficiem2} m²</span>
          </div>
        ) : null;
      case "importe":
        return c.importe ? (
          <span className="font-bold text-slate-900 text-sm truncate block">
            ${Number(c.importe).toLocaleString("es-AR")}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        );
      case "estado":
        return (
          <Select
            value={c.pipeline_stage}
            onValueChange={(v) => handleEstadoChange(c, v)}
            disabled={stageMutation.isPending}
          >
            <SelectTrigger
              className={cn(
                "h-8 text-xs text-white border-0 max-w-[160px]",
                etapaColorMap[c.pipeline_stage] || "bg-slate-500",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {etapas.map((s) => (
                <SelectItem key={s.pipeline_stage} value={s.pipeline_stage}>
                  {s.pipeline_stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "fecha_ganada":
        return getFechaGanadoFromConsulta(c) ? (
          <span className="text-sm text-slate-600">
            {moment(getFechaGanadoFromConsulta(c)).format("DD/MM/YY")}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        );
      case "seguimiento":
        return c.proximoseguimiento ? (
          <div className={cn("flex items-center gap-1 text-sm", seguimientoVencido ? "text-red-600 font-medium" : "text-slate-500")}>
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            {moment(c.proximoseguimiento).format("DD/MM/YY")}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        );
      case "acciones":
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isLogistica && (
                <DropdownMenuItem onClick={() => handleEdit(c)}>Editar</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openConsultaPdf(c)}>
                <FileText className="w-4 h-4 mr-2" />Ver PDF
              </DropdownMenuItem>
              {!isLogistica && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => {
                      if (window.confirm("¿Eliminar este presupuesto?")) {
                        handleDelete(c).catch((e) => {
                          toast.error("Error al eliminar: " + e.message);
                        });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link to={createPageUrl("Home")}>
                <Button variant="ghost" className="gap-2 mb-2 -ml-2">
                  <ArrowLeft className="w-4 h-4" />Volver
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Presupuestos</h1>
              <p className="text-slate-500">
                {isLoading ? "Cargando..." : `${filtradas.length} de ${visibleConsultas.length} presupuestos`}
              </p>
            </div>
            {!isLogistica && (
              <Button onClick={() => { setSelectedConsulta(null); setShowForm(true); }} className="gap-2">
                <Plus className="w-4 h-4" />Nuevo presupuesto
              </Button>
            )}
          </div>

          {/* Filtros */}
          <ViewFilterBar>
            {isFilterEnabled("consultas", viewConfig, "busqueda") && (
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar nombre, N° o ubicación..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            {isFilterEnabled("consultas", viewConfig, "estado") && (
              <MultiSelectFilter
                label="Estado"
                options={etapas.map((e) => ({ value: e.pipeline_stage, label: e.pipeline_stage }))}
                selected={getFilter("estado")}
                onChange={(v) => setFilter("estado", v)}
              />
            )}
            {isFilterEnabled("consultas", viewConfig, "asesor") && (
              <MultiSelectFilter
                label="Asesor"
                options={filterAsesorOptions.map((a) => ({ value: a.value, label: a.label }))}
                selected={getFilter("asesor")}
                onChange={(v) => setFilter("asesor", v)}
              />
            )}
            {isFilterEnabled("consultas", viewConfig, "ano") && (
              <MultiSelectFilter
                label="Año"
                options={anos.map((a) => ({ value: String(a), label: String(a) }))}
                selected={getFilter("ano")}
                onChange={(v) => setFilter("ano", v)}
              />
            )}
            {isFilterEnabled("consultas", viewConfig, "fecha_ganada_desde") && (
              <Input
                type="date"
                value={filtroFechaGanadoDesde}
                onChange={(e) => setFiltroFechaGanadoDesde(e.target.value)}
                className="w-40"
                title="Fecha ganada desde"
                aria-label="Fecha ganada desde"
              />
            )}
            {isFilterEnabled("consultas", viewConfig, "fecha_ganada_hasta") && (
              <Input
                type="date"
                value={filtroFechaGanadoHasta}
                onChange={(e) => setFiltroFechaGanadoHasta(e.target.value)}
                className="w-40"
                title="Fecha ganada hasta"
                aria-label="Fecha ganada hasta"
              />
            )}
          </ViewFilterBar>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
        {isMobile ? (
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-center py-12 text-slate-400">Cargando...</p>
            ) : filtradas.length === 0 ? (
              <p className="text-center py-12 text-slate-400">No hay presupuestos</p>
            ) : (
              filtradas.map(c => (
                <MobileConsultaListItem
                  key={c.id}
                  consulta={c}
                  etapaColor={etapaColorMap[c.pipeline_stage]}
                  onCallTarget={setCallTarget}
                  onClick={openRow}
                />
              ))
            )}
          </div>
        ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <Table className="w-full table-fixed min-w-[820px]">
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                {enabledColumns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={cn("font-semibold", col.id === "acciones" && "text-right")}
                  >
                    {col.id === "acciones" ? "" : col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={colCount} className="text-center py-12 text-slate-400">Cargando...</TableCell></TableRow>
              ) : filtradas.map(c => (
                <TableRow key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openRow(c)}>
                  {enabledColumns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn("py-2", col.id === "acciones" && "text-right")}
                      onClick={col.id === "estado" || col.id === "acciones" ? (e) => e.stopPropagation() : undefined}
                    >
                      {renderConsultaCell(col.id, c)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!isLoading && filtradas.length === 0 && (
                <TableRow><TableCell colSpan={colCount} className="text-center py-12 text-slate-400">No hay presupuestos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        )}
        </div>
      </div>

      <DetalleConsultaDialog
        consulta={detalleConsulta}
        open={!!detalleConsulta}
        onOpenChange={(o) => { if (!o) setDetalleConsulta(null); }}
        mode="logistica"
      />

      {!isLogistica && (
        <ConsultaForm
          open={showForm}
          onOpenChange={setShowForm}
          consulta={selectedConsulta}
          onSave={() => { refetch(); setSelectedConsulta(null); }}
        />
      )}
    </div>
  );
}
