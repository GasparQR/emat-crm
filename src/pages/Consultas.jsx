import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Search, Calendar, MoreHorizontal, ArrowLeft, Trash2, MapPin, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import ConsultaForm from "@/components/crm/ConsultaForm";
import { toast } from "sonner";

const ASESORES = ["ANDRES", "TRISTAN", "VALENTINA", "ROCIO", "JULIAN", "PABLO", "ESTEBAN", "MACA"];

const ASESOR_COLORS = {
  ANDRES: "bg-blue-500", TRISTAN: "bg-purple-500", VALENTINA: "bg-pink-500",
  ROCIO: "bg-rose-500", JULIAN: "bg-indigo-500", PABLO: "bg-orange-500",
  ESTEBAN: "bg-cyan-500", MACA: "bg-fuchsia-500",
};

export default function Consultas() {
  const [showForm, setShowForm] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroAsesor, setFiltroAsesor] = useState("todos");
  const [filtroAno, setFiltroAno] = useState("todos");

  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  const { data: etapas = [] } = useQuery({
    queryKey: ['pipeline-stages', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const stages = await base44.entities.PipelineStage.filter({ workspace_id: workspace.id }, "orden", 100);
      return stages.filter(s => s.activa !== false);
    },
    enabled: !!workspace,
  });

  const etapaColorMap = useMemo(
    () => Object.fromEntries(etapas.map(s => [s.pipeline_stage, s.color])),
    [etapas]
  );

  const { data: consultas = [], refetch, isLoading } = useQuery({
    queryKey: ["consultas-list", workspace?.id],
    queryFn: () => workspace
      ? base44.entities.Consulta.filter({ workspace_id: workspace.id }, "-nroppto", 2000)
      : [],
    enabled: !!workspace,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Consulta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultas-list", workspace?.id] });
      toast.success("Presupuesto eliminado");
    },
  });

  const anos = [...new Set(consultas.map(c => c.ano).filter(Boolean))].sort((a,b) => b-a);

  // ✅ LÓGICA DE FILTRADO CORREGIDA
  const filtradas = consultas.filter(c => {
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
    if (filtroEstado !== "todos" && c.pipeline_stage !== filtroEstado) return false;

    // Filtro de asesor (solo si no es "todos")
    if (filtroAsesor !== "todos" && c.asesor !== filtroAsesor) return false;

    // Filtro de año (solo si no es "todos")
    if (filtroAno !== "todos" && String(c.ano) !== filtroAno) return false;

    return true;
  });

  const handleEdit = (c) => { setSelectedConsulta(c); setShowForm(true); };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
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
                {isLoading ? "Cargando..." : `${filtradas.length} de ${consultas.length} presupuestos`}
              </p>
            </div>
            <Button onClick={() => { setSelectedConsulta(null); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Nuevo presupuesto
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar nombre, N° o ubicación..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {etapas.map(e => <SelectItem key={e.pipeline_stage} value={e.pipeline_stage}>{e.pipeline_stage}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroAsesor} onValueChange={setFiltroAsesor}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Asesor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ASESORES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Año" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los años</SelectItem>
                {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabla — 6 columnas con anchos fijos que suman 100% */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <Table className="w-full table-fixed">
            <colgroup>
              <col className="w-[30%]" /> {/* Cliente + ubicación + #ppto */}
              <col className="w-[8%]"  /> {/* Asesor (avatar) */}
              <col className="w-[14%]" /> {/* m² / Tipo */}
              <col className="w-[14%]" /> {/* Importe */}
              <col className="w-[14%]" /> {/* Estado */}
              <col className="w-[14%]" /> {/* Seguimiento */}
              <col className="w-[6%]"  /> {/* Acciones */}
            </colgroup>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Asesor</TableHead>
                <TableHead className="font-semibold">m² / Tipo</TableHead>
                <TableHead className="font-semibold">Importe</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Seguimiento</TableHead>
                <TableHead className="font-semibold text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">Cargando...</TableCell></TableRow>
              ) : filtradas.map(c => {
                const seguimientoVencido = c.proximoseguimiento && moment(c.proximoseguimiento).isBefore(moment(), "day");
                const asesorColor = ASESOR_COLORS[c.asesor] || "bg-slate-400";
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleEdit(c)}>

                    {/* Cliente: nombre + #ppto + ubicación fusionados */}
                    <TableCell className="py-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">{c.contactonombre}</p>
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
                    </TableCell>

                    {/* Asesor — solo avatar */}
                    <TableCell className="py-2">
                      {c.asesor && (
                        <div
                          className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold", asesorColor)}
                          title={c.asesor}
                        >
                          {c.asesor[0]}
                        </div>
                      )}
                    </TableCell>

                    {/* m² / Tipo */}
                    <TableCell className="py-2">
                      <div className="space-y-1">
                        {c.superficiem2 && (
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Ruler className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{c.superficiem2} m²</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Importe */}
                    <TableCell className="py-2">
                      {c.importe ? (
                        <span className="font-bold text-slate-900 text-sm truncate block">
                          ${Number(c.importe).toLocaleString("es-AR")}
                        </span>
                      ) : <span className="text-slate-400">-</span>}
                    </TableCell>

                    {/* Estado */}
                    <TableCell className="py-2">
                      <Badge className={cn("text-xs text-white", etapaColorMap[c.pipeline_stage] || "bg-slate-500")}>
                        {c.pipeline_stage}
                      </Badge>
                    </TableCell>

                    {/* Seguimiento */}
                    <TableCell className="py-2">
                      {c.proximoseguimiento ? (
                        <div className={cn("flex items-center gap-1 text-sm", seguimientoVencido ? "text-red-600 font-medium" : "text-slate-500")}>
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          {moment(c.proximoseguimiento).format("DD/MM/YY")}
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="py-2 text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(c)}>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (window.confirm("¿Eliminar este presupuesto?")) deleteMutation.mutate(c.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                  </TableRow>
                );
              })}
              {!isLoading && filtradas.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">No hay presupuestos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConsultaForm
        open={showForm}
        onOpenChange={setShowForm}
        consulta={selectedConsulta}
        onSave={() => { refetch(); setSelectedConsulta(null); }}
      />
    </div>
  );
}
