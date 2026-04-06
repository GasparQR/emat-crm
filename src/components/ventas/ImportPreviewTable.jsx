import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { calculateGanancia } from "@/components/utils/importNormalization";
import { toast } from "sonner";

export default function ImportPreviewTable({ datos, onDatosChange }) {
  const [editingCell, setEditingCell] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const displayData = showAll ? datos : datos.slice(0, 50);

  const handleCellEdit = (rowIndex, field, newValue) => {
    const updatedData = [...datos];
    updatedData[rowIndex][field] = newValue;
    onDatosChange(updatedData);
    setEditingCell(null);
  };

  const handleRecalcularGanancia = () => {
    const updated = datos.map(row => ({
      ...row,
      ganancia: calculateGanancia(row.venta, row.costo, row.comision, row.canje)
    }));
    onDatosChange(updated);
    toast.success("Ganancias recalculadas");
  };

  const handleNormalizarMarketplaces = () => {
    // Ya están normalizados en el paso anterior
    toast.success("Marketplaces normalizados");
  };

  const errores = datos.filter(row => row._hasErrors).length;
  const advertencias = datos.filter(row => row._warnings?.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="gap-2">
          Total: {datos.length} filas
        </Badge>
        {errores > 0 && (
          <Badge variant="destructive" className="gap-2">
            <AlertCircle className="w-3 h-3" />
            {errores} errores
          </Badge>
        )}
        {advertencias > 0 && (
          <Badge className="bg-amber-100 text-amber-800 gap-2">
            <AlertCircle className="w-3 h-3" />
            {advertencias} advertencias
          </Badge>
        )}
        {errores === 0 && (
          <Badge className="bg-green-100 text-green-800 gap-2">
            <CheckCircle2 className="w-3 h-3" />
            Todo OK
          </Badge>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleRecalcularGanancia}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Recalcular Ganancia
        </Button>
        <Button variant="outline" size="sm" onClick={handleNormalizarMarketplaces}>
          Normalizar Marketplaces
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Venta</TableHead>
              <TableHead>Ganancia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, idx) => (
              <TableRow 
                key={idx} 
                className={row._hasErrors ? "bg-red-50" : row._warnings?.length > 0 ? "bg-amber-50" : ""}
              >
                <TableCell className="font-mono text-xs text-slate-500">
                  {idx + 1}
                  {row._hasErrors && <AlertCircle className="w-3 h-3 text-red-600 ml-1" />}
                </TableCell>
                
                {['codigo', 'fecha', 'nombreSnapshot', 'modelo', 'capacidad', 'color', 'proveedorTexto', 'marketplace'].map(field => (
                  <TableCell 
                    key={field}
                    onClick={() => setEditingCell({ row: idx, field })}
                    className="cursor-pointer hover:bg-slate-100"
                  >
                    {editingCell?.row === idx && editingCell?.field === field ? (
                      <Input
                        autoFocus
                        defaultValue={row[field]}
                        onBlur={(e) => handleCellEdit(idx, field, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellEdit(idx, field, e.target.value);
                          }
                        }}
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-sm">{row[field]}</span>
                    )}
                  </TableCell>
                ))}

                {['costo', 'comision', 'venta', 'ganancia'].map(field => (
                  <TableCell 
                    key={field}
                    onClick={() => setEditingCell({ row: idx, field })}
                    className="cursor-pointer hover:bg-slate-100"
                  >
                    {editingCell?.row === idx && editingCell?.field === field ? (
                      <Input
                        autoFocus
                        type="number"
                        defaultValue={row[field]}
                        onBlur={(e) => handleCellEdit(idx, field, parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellEdit(idx, field, parseFloat(e.target.value) || 0);
                          }
                        }}
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-sm font-mono">
                        {typeof row[field] === 'number' ? row[field].toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '-'}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {datos.length > 50 && !showAll && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setShowAll(true)}>
            Mostrar todas las filas ({datos.length})
          </Button>
        </div>
      )}

      {/* Errores y advertencias */}
      {(errores > 0 || advertencias > 0) && (
        <div className="space-y-2 mt-4">
          {datos.slice(0, 10).map((row, idx) => (
            (row._hasErrors || row._warnings?.length > 0) && (
              <div key={idx} className="text-xs bg-slate-50 p-3 rounded-lg">
                <span className="font-medium">Fila {idx + 1}:</span>
                {row._errors?.map((err, i) => (
                  <div key={i} className="text-red-600 ml-2">• {err}</div>
                ))}
                {row._warnings?.map((warn, i) => (
                  <div key={i} className="text-amber-600 ml-2">• {warn}</div>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}