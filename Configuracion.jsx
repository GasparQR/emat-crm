import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Database, Trash2, Loader2, Calendar, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { crm } from "@/api/crmClient";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

export default function Configuracion() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [consultaDays, setConsultaDays] = useState(3);
  const [postventaDays, setPostventaDays] = useState(7);
  const [savingDays, setSavingDays] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setConsultaDays(currentUser.consulta_follow_up_days ?? 3);
      setPostventaDays(currentUser.postventa_follow_up_days ?? 7);
    }
  }, [currentUser]);

  const handleSaveDays = async () => {
    setSavingDays(true);
    try {
      await crm.auth.updateMe({
        consulta_follow_up_days: Number(consultaDays),
        postventa_follow_up_days: Number(postventaDays)
      });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success("Días hábiles guardados");
    } finally {
      setSavingDays(false);
    }
  };  

  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      // Fetch all data from your API
      const consultas = await crm.consultas.getAll();
      const ventas = await crm.ventas.getAll();
      const seguimientos = await crm.seguimientos.getAll();

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      if (consultas?.length > 0) {
        const consultasSheet = XLSX.utils.json_to_sheet(consultas);
        XLSX.utils.book_append_sheet(workbook, consultasSheet, "Consultas");
      }
      
      if (ventas?.length > 0) {
        const ventasSheet = XLSX.utils.json_to_sheet(ventas);
        XLSX.utils.book_append_sheet(workbook, ventasSheet, "Ventas");
      }
      
      if (seguimientos?.length > 0) {
        const seguimientosSheet = XLSX.utils.json_to_sheet(seguimientos);
        XLSX.utils.book_append_sheet(workbook, seguimientosSheet, "Seguimientos");
      }

      const filename = `datos-crm-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast.success("Datos exportados correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar los datos");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl("Ajustes")}>  
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Ajustes
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-slate-500 mt-1">Gestión avanzada del CRM</p>
        </div>

        {/* Días hábiles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Días hábiles de seguimiento
            </CardTitle>
            <CardDescription>Configura los días hábiles predeterminados para cada tipo de seguimiento automático</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seguimiento de consultas (días hábiles)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={consultaDays}
                  onChange={(e) => setConsultaDays(e.target.value)}
                />
                <p className="text-xs text-slate-400">Días que se agregan automáticamente al agendar un seguimiento de consulta</p>
              </div>
              <div className="space-y-2">
                <Label>Seguimiento de postventa (días hábiles)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={postventaDays}
                  onChange={(e) => setPostventaDays(e.target.value)}
                />
                <p className="text-xs text-slate-400">Días que se agregan al completar el primer contacto de postventa</p>
              </div>
            </div>
            <Button onClick={handleSaveDays} disabled={savingDays} className="gap-2">
              {savingDays && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar días hábiles
            </Button>
          </CardContent>
        </Card>

        {/* Datos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Gestión de datos
            </CardTitle>
            <CardDescription>Exportar o eliminar tus datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleExportToExcel}
                disabled={exporting}
              >
                {exporting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Download className="w-4 h-4" />
                Exportar todos los datos (Excel)
              </Button>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-slate-500 mb-2">Zona peligrosa</p>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="w-4 h-4" />
                Eliminar todas las consultas
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-slate-400 py-4">
          TechCRM v1.0 - Mini CRM para ventas por WhatsApp
        </div>
      </div>
    </div>
  );
}