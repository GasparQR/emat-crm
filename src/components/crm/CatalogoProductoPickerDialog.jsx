import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowLeft, Package } from "lucide-react";
import { entities } from "@/api/supabaseClient";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  filterCatalogoProductos,
  formatCatalogoPrecio,
  mapCatalogoToConsultaItem,
  normalizeCatalogoRow,
} from "@/lib/catalogoProducto";

export default function CatalogoProductoPickerDialog({ open, onOpenChange, onSelect }) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";

  const [step, setStep] = useState("pick");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [cantidad, setCantidad] = useState("1");
  const [precioUnitario, setPrecioUnitario] = useState("");

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["catalogo-productos", workspaceId],
    queryFn: () =>
      entities.CatalogoProducto.filter({ workspace_id: workspaceId }, "nombre", 500),
    enabled: open && !!workspaceId,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setStep("pick");
      setSearch("");
      setDebouncedSearch("");
      setFiltroUnidad("todos");
      setSelected(null);
      setCantidad("1");
      setPrecioUnitario("");
    }
  }, [open]);

  const unidadesDisponibles = useMemo(() => {
    const set = new Set();
    productos.forEach((p) => {
      const u = normalizeCatalogoRow(p).unidad_medida;
      if (u) set.add(u);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const filtrados = useMemo(
    () =>
      filterCatalogoProductos(productos, {
        search: debouncedSearch,
        unidad: filtroUnidad,
        soloActivos: true,
      }),
    [productos, debouncedSearch, filtroUnidad],
  );

  const previewImporte = useMemo(() => {
    const qty = parseFloat(cantidad);
    const price = parseFloat(precioUnitario);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return null;
    return qty * price;
  }, [cantidad, precioUnitario]);

  const handlePick = (row) => {
    const item = normalizeCatalogoRow(row);
    setSelected(item);
    setCantidad("1");
    setPrecioUnitario(String(item.precio_unitario ?? ""));
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selected) return;
    const qty = parseFloat(cantidad);
    const price = parseFloat(precioUnitario);
    if (!Number.isFinite(qty) || qty <= 0) return;
    if (!Number.isFinite(price) || price < 0) return;

    const mapped = mapCatalogoToConsultaItem(selected, {
      cantidad: cantidad,
      precioUnitario: precioUnitario,
    });
    onSelect?.(mapped);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {step === "pick" ? "Agregar item del catálogo" : "Confirmar importación"}
          </DialogTitle>
        </DialogHeader>

        {step === "pick" ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <Select value={filtroUnidad} onValueChange={setFiltroUnidad}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {unidadesDisponibles.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3}>Cargando catálogo...</TableCell></TableRow>
                  ) : filtrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-slate-500 text-center py-6">
                        No hay productos que coincidan con la búsqueda
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrados.map((row) => {
                      const item = normalizeCatalogoRow(row);
                      return (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handlePick(row)}
                        >
                          <TableCell>
                            <p className="font-medium">{item.nombre}</p>
                            {item.descripcion && (
                              <p className="text-xs text-slate-500 truncate max-w-md">
                                {item.descripcion}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{item.unidad_medida}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCatalogoPrecio(item.precio_unitario)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 -ml-2"
              onClick={() => setStep("pick")}
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al catálogo
            </Button>

            {selected && (
              <div className="rounded-lg border bg-slate-50 p-4 space-y-1">
                <p className="font-semibold text-slate-900">{selected.nombre}</p>
                {selected.descripcion && (
                  <p className="text-sm text-slate-600">{selected.descripcion}</p>
                )}
                <p className="text-xs text-slate-500">Unidad: {selected.unidad_medida}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pick-cantidad">Cantidad</Label>
                <Input
                  id="pick-cantidad"
                  type="number"
                  min="0"
                  step="any"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pick-precio">Precio unitario</Label>
                <Input
                  id="pick-precio"
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                />
              </div>
            </div>

            {previewImporte != null && (
              <p className="text-sm text-slate-600">
                Importe del ítem:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCatalogoPrecio(previewImporte)}
                </span>
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {step === "confirm" && (
            <Button onClick={handleConfirm}>Agregar al presupuesto</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
