import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, FileSpreadsheet, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { normalizeRow } from "@/components/utils/importNormalization";
import ImportPreviewTable from "@/components/ventas/ImportPreviewTable";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { getMaxSecuenciasPorAnio, generateNextVentaCode } from "@/components/utils/ventaCodeGenerator";

const PASOS = {
  UPLOAD: 1,
  MAPEO: 2,
  PREVIEW: 3,
  CONFIRMACION: 4
};

const CAMPOS_VENTA = [
  { value: 'codigo', label: 'Código' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'nombreSnapshot', label: 'Nombre Cliente' },
  { value: 'modelo', label: 'Modelo' },
  { value: 'capacidad', label: 'Capacidad' },
  { value: 'color', label: 'Color' },
  { value: 'proveedorTexto', label: 'Proveedor' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'costo', label: 'Costo' },
  { value: 'comision', label: 'Comisión' },
  { value: 'venta', label: 'Venta' },
  { value: 'ganancia', label: 'Ganancia' },
  { value: 'canje', label: 'Canje' },
  { value: 'ignore', label: '(Ignorar columna)' }
];

export default function ImportarVentas() {
  const [paso, setPaso] = useState(PASOS.UPLOAD);
  const [archivo, setArchivo] = useState(null);
  const [separador, setSeparador] = useState(",");
  const [encoding, setEncoding] = useState("UTF-8");
  const [datosRaw, setDatosRaw] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [datosNormalizados, setDatosNormalizados] = useState([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState("skip");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivo(file);
    setLoading(true);

    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        encoding: encoding,
        delimiter: separador,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setDatosRaw(results.data);
          setColumnas(results.meta.fields || []);
          autoMapColumns(results.meta.fields || []);
          setLoading(false);
          setPaso(PASOS.MAPEO);
        },
        error: (error) => {
          toast.error(`Error al leer CSV: ${error.message}`);
          setLoading(false);
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          const headers = data[0] || [];
          const rows = data.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx];
            });
            return obj;
          });

          setDatosRaw(rows);
          setColumnas(headers);
          autoMapColumns(headers);
          setLoading(false);
          setPaso(PASOS.MAPEO);
        } catch (error) {
          toast.error(`Error al leer Excel: ${error.message}`);
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Formato no soportado. Use CSV o XLSX.");
      setLoading(false);
    }
  };

  const autoMapColumns = (fileColumns) => {
    const mapping = {};
    
    const similarityMap = {
      'codigo': ['codigo', 'code', 'id'],
      'fecha': ['fecha', 'date', 'dia'],
      'nombreSnapshot': ['nombre', 'cliente', 'name', 'customer'],
      'modelo': ['modelo', 'model', 'producto', 'product'],
      'capacidad': ['capacidad', 'capacity', 'storage'],
      'color': ['color', 'colour'],
      'proveedorTexto': ['proveedor', 'supplier', 'vendor'],
      'marketplace': ['marketplace', 'canal', 'channel'],
      'costo': ['costo', 'cost', 'precio compra'],
      'comision': ['comision', 'commission', 'fee'],
      'venta': ['venta', 'sale', 'precio venta', 'selling price'],
      'ganancia': ['ganancia', 'profit', 'margin'],
      'canje': ['canje', 'trade', 'exchange']
    };

    fileColumns.forEach(col => {
      const colLower = col.toLowerCase().trim();
      
      for (const [ventaField, keywords] of Object.entries(similarityMap)) {
        if (keywords.some(keyword => colLower.includes(keyword))) {
          mapping[col] = ventaField;
          break;
        }
      }
      
      if (!mapping[col]) {
        mapping[col] = 'ignore';
      }
    });

    setColumnMapping(mapping);
  };

  const handleMapeoChange = (fileColumn, ventaField) => {
    setColumnMapping(prev => ({
      ...prev,
      [fileColumn]: ventaField
    }));
  };

  const handleNormalizarDatos = () => {
    setLoading(true);
    
    const normalized = datosRaw.map(row => normalizeRow(row, columnMapping));
    
    setDatosNormalizados(normalized);
    setLoading(false);
    setPaso(PASOS.PREVIEW);
  };

  const handleConfirmarImportacion = async () => {
    setLoading(true);
    
    try {
      const datosValidos = datosNormalizados.filter(row => !row._hasErrors);
      
      if (datosValidos.length === 0) {
        toast.error("No hay datos válidos para importar");
        setLoading(false);
        return;
      }

      // Obtener secuencias máximas una sola vez
      const maxPorAnio = await getMaxSecuenciasPorAnio();
      
      // Limpiar campos internos y generar códigos secuenciales
      const datosLimpios = datosValidos.map(row => {
        const { _errors, _warnings, _hasErrors, ...cleanData } = row;
        
        // Generar código automático basado en la fecha
        const fecha = cleanData.fecha || new Date().toISOString().split('T')[0];
        const year = new Date(fecha).getFullYear();
        const codigoGenerado = generateNextVentaCode(year, maxPorAnio);
        
        return {
          ...cleanData,
          codigo: codigoGenerado,
          estado: "Finalizada"
        };
      });

      // Crear todas las ventas (ya no hay duplicados porque los códigos son nuevos)
      await base44.entities.Venta.bulkCreate(datosLimpios);
      
      toast.success(`${datosLimpios.length} ventas importadas correctamente`);
      
      setPaso(PASOS.CONFIRMACION);
    } catch (error) {
      toast.error(`Error al importar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Ventas")}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Importar Ventas</h1>
              <p className="text-sm text-slate-500">Carga masiva desde CSV o Excel</p>
            </div>
          </div>
          
          {/* Indicador de pasos */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(num => (
              <div key={num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  paso >= num ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {paso > num ? <Check className="w-4 h-4" /> : num}
                </div>
                {num < 3 && <div className="w-12 h-0.5 bg-slate-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* Paso 1: Upload */}
        {paso === PASOS.UPLOAD && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 1: Subir archivo</CardTitle>
              <CardDescription>Selecciona un archivo CSV o Excel con tus ventas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input 
                  type="file" 
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Separador CSV</Label>
                  <Select value={separador} onValueChange={setSeparador}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">Coma (,)</SelectItem>
                      <SelectItem value=";">Punto y coma (;)</SelectItem>
                      <SelectItem value="\t">Tabulador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Encoding</Label>
                  <Select value={encoding} onValueChange={setEncoding}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTF-8">UTF-8</SelectItem>
                      <SelectItem value="ISO-8859-1">ISO-8859-1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">Formato esperado:</p>
                <p className="text-xs text-blue-700">
                  CODIGO, FECHA, NOMBRE, MODELO, CAPACIDAD, COLOR, PROVEEDOR, MARKETPLACE, COSTO, COMISION, VENTA, GANANCIA
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 2: Mapeo */}
        {paso === PASOS.MAPEO && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 2: Mapear columnas</CardTitle>
              <CardDescription>
                Asocia cada columna del archivo con los campos de Venta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {columnas.map(col => (
                  <div key={col} className="flex items-center gap-4">
                    <div className="w-48">
                      <Badge variant="outline" className="font-mono text-xs">
                        {col}
                      </Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <Select 
                      value={columnMapping[col] || 'ignore'} 
                      onValueChange={(val) => handleMapeoChange(col, val)}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPOS_VENTA.map(campo => (
                          <SelectItem key={campo.value} value={campo.value}>
                            {campo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setPaso(PASOS.UPLOAD)}>
                  Atrás
                </Button>
                <Button onClick={handleNormalizarDatos} disabled={loading}>
                  Continuar a Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 3: Preview */}
        {paso === PASOS.PREVIEW && (
          <Card>
            <CardHeader>
              <CardTitle>Paso 3: Revisión y edición</CardTitle>
              <CardDescription>
                Revisa los datos normalizados. Edita las celdas que necesites corregir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportPreviewTable 
                datos={datosNormalizados}
                onDatosChange={setDatosNormalizados}
              />

              <div className="flex justify-between items-center pt-6 border-t mt-6">
                <div className="flex items-center gap-4">
                  <Label>Duplicados (por código):</Label>
                  <Select value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Omitir</SelectItem>
                      <SelectItem value="update">Actualizar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPaso(PASOS.MAPEO)}>
                    Atrás
                  </Button>
                  <Button onClick={handleConfirmarImportacion} disabled={loading}>
                    Confirmar Importación
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 4: Confirmación */}
        {paso === PASOS.CONFIRMACION && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-6 h-6 text-green-600" />
                Importación completada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Las ventas se han importado correctamente a la base de datos.
              </p>
              <div className="flex gap-3">
                <Link to={createPageUrl("Ventas")}>
                  <Button>Ver Ventas</Button>
                </Link>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Importar más
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}