import { useState, useEffect } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Copy, ExternalLink, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function PostventaWhatsAppSender({ open, onOpenChange, venta, contactoWhatsapp, onMessageSent }) {
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [copied, setCopied] = useState(false);

  const { workspace } = useWorkspace();

  const { data: plantillas = [] } = useQuery({
    queryKey: ["plantillas", workspace?.id],
    queryFn: () =>
      workspace
        ? entities.PlantillaWhatsApp.filter({ workspace_id: workspace.id }, "-created_date")
        : [],
    enabled: !!workspace && open,
  });

  const { data: variablesDB = [] } = useQuery({
    queryKey: ["variables", workspace?.id],
    queryFn: () =>
      workspace ? entities.VariablePlantilla.filter({ workspace_id: workspace.id }) : [],
    enabled: !!workspace && open,
  });

  // Auto-select a postventa/concretada template when plantillas load
  useEffect(() => {
    if (!open) return;

    const activas = plantillas.filter((p) => p.activa !== false);
    if (activas.length === 0) return;

    const sugerida =
      activas.find((p) => p.etapa === "EJECUTADA" || p.etapa === "GANADA") ||
      activas.find((p) => p.etapa === "General" || !p.etapa) ||
      activas[0];

    if (sugerida) setSelectedPlantilla(sugerida);
  }, [open, plantillas]);

  // Rebuild message when template or venta changes
  useEffect(() => {
    if (selectedPlantilla && venta) {
      setMensaje(reemplazarVariables(selectedPlantilla.contenido, venta));
    }
  }, [selectedPlantilla, venta, variablesDB]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPlantilla(null);
      setMensaje("");
      setCopied(false);
    }
  }, [open]);

  const reemplazarVariables = (texto, data) => {
    if (!texto) return "";
    let result = texto;

    // Custom workspace variables first
    variablesDB.forEach((v) => {
      result = result.replace(new RegExp(`\\{${v.clave}\\}`, "g"), v.valor ?? "");
    });

    return result
      .replace(/{NOMBRE}/g, data.nombreSnapshot || "")
      .replace(/{PRODUCTO}/g, data.productoSnapshot || data.modelo || "")
      .replace(/{GARANTIA}/g, "6 meses")
      .replace(/{SOPORTE}/g, "WhatsApp o Instagram")
      .replace(/{MONEDA}/g, data.moneda === "USD" ? "US$" : "$");
  };

  const formatPhone = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9]/g, "");
    if (!clean.startsWith("54")) clean = "54" + clean;
    return clean;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mensaje);
    setCopied(true);
    toast.success("Mensaje copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const phone = formatPhone(contactoWhatsapp);
    const msg = String(mensaje || "").normalize("NFC")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    const url = new URL("https://api.whatsapp.com/send");
    url.searchParams.set("phone", phone);
    url.searchParams.set("text", msg);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const handleMarkSent = () => {
    toast.success("✅ Postventa completada. Proceso de venta finalizado.");
    onMessageSent?.();
    onOpenChange(false);
  };

  if (!venta) return null;

  const plantillasActivas = plantillas.filter((p) => p.activa !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            WhatsApp Postventa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="font-semibold text-slate-900">{venta.nombreSnapshot}</p>
            <p className="text-sm text-slate-500">{contactoWhatsapp || "Sin número registrado"}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{venta.productoSnapshot || venta.modelo}</Badge>
              {venta.ganancia != null && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  {venta.moneda} {venta.ganancia?.toFixed(0)} ganancia
                </Badge>
              )}
            </div>
          </div>

          {plantillasActivas.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Plantilla
              </Label>
              <Select
                value={selectedPlantilla?.id || ""}
                onValueChange={(val) => setSelectedPlantilla(plantillasActivas.find((p) => p.id === val))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar plantilla" /></SelectTrigger>
                <SelectContent>
                  {plantillasActivas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombrePlantilla}
                      {p.etapa && p.etapa !== "General" && ` · ${p.etapa}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Escribe tu mensaje o selecciona una plantilla..."
            />
            <p className="text-xs text-slate-500">{mensaje.length} caracteres</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button
            onClick={handleOpenWhatsApp}
            disabled={!contactoWhatsapp}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir WhatsApp
          </Button>
          <Button onClick={handleMarkSent} className="gap-2">
            <Check className="w-4 h-4" />
            Marcar como realizado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
