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

export default function WhatsAppSender({ open, onOpenChange, consulta, onMessageSent }) {
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
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

  // Auto-select suggested template when plantillas or dialog state changes
  useEffect(() => {
    if (!open) return;

    const activas = plantillas.filter((p) => p.activa !== false);
    if (activas.length === 0) return;

    const etapaMapeada = mapEtapaToPlantilla(consulta?.etapa);
    const categoria = consulta?.categoriaProducto;

    const sugerida =
      activas.find((p) => p.etapa === etapaMapeada && p.categoriaProducto === categoria) ||
      activas.find((p) => p.etapa === etapaMapeada) ||
      activas.find((p) => p.etapa === "General" || !p.etapa) ||
      activas[0];

    if (sugerida) setSelectedPlantilla(sugerida);
  }, [open, plantillas, consulta?.etapa, consulta?.categoriaProducto]);

  // Rebuild message when template or consulta changes
  useEffect(() => {
    if (selectedPlantilla && consulta) {
      setMensaje(reemplazarVariables(selectedPlantilla.contenido, consulta));
    }
  }, [selectedPlantilla, consulta, variablesDB]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPlantilla(null);
      setMensaje("");
      setCopied(false);
    }
  }, [open]);

  const mapEtapaToPlantilla = (etapa) => {
    if (!etapa) return "General";
    // Map pipeline stage values (from consulta.etapa) to template etapa values
    const map = {
      "Nuevo": "A COTIZAR",
      "Seguimiento1": "NEGOCIACION",
      "Seguimiento2": "NEGOCIACION",
      "Seguimiento": "NEGOCIACION",
      "Negociacion": "NEGOCIACION",
      "Concretado": "GANADA",
      "Perdido": "PERDIDA",
      "A COTIZAR": "A COTIZAR",
      "NEGOCIACION": "NEGOCIACION",
      "GANADA": "GANADA",
      "EJECUTADA": "EJECUTADA",
      "PAUSADA": "PAUSADA",
      "PERDIDA": "PERDIDA",
    };
    return map[etapa] || "General";
  };

  const reemplazarVariables = (texto, data) => {
    if (!texto) return "";
    let result = texto;

    // Custom workspace variables first
    variablesDB.forEach((v) => {
      result = result.replace(new RegExp(`\\{${v.clave}\\}`, "g"), v.valor ?? "");
    });

    return result
      .replace(/{NOMBRE}/g, data.contactoNombre || "")
      .replace(/{PRODUCTO}/g, data.productoConsultado || "")
      .replace(/{VARIANTE}/g, data.variante || "")
      .replace(/{PRECIO}/g, data.precioCotizado?.toLocaleString() || "")
      .replace(/{MONEDA}/g, data.moneda === "USD" ? "US$" : "$")
      .replace(/{GARANTIA}/g, "6 meses")
      .replace(/{ENTREGA}/g, "24-48hs")
      .replace(/{PAGO}/g, "Efectivo, transferencia o tarjeta");
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.length > 0 && !clean.startsWith("54")) {
      clean = "54" + clean;
    }
    return clean;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mensaje);
    setCopied(true);
    toast.success("Mensaje copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const phone = formatPhoneNumber(consulta.contactoWhatsapp);

    const msg = String(mensaje || "")
      .normalize("NFC")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

    const url = new URL("https://api.whatsapp.com/send");
    url.searchParams.set("phone", phone);
    url.searchParams.set("text", msg);

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const handleMarkSent = () => {
    toast.success("Mensaje registrado correctamente");
    onMessageSent?.();
    onOpenChange(false);
  };

  if (!consulta) return null;

  const plantillasActivas = plantillas.filter((p) => p.activa !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Enviar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="font-semibold text-slate-900">{consulta.contactoNombre}</p>
            <p className="text-sm text-slate-500">{consulta.contactoWhatsapp}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{consulta.productoConsultado}</Badge>
              {consulta.variante && <Badge variant="outline">{consulta.variante}</Badge>}
            </div>
          </div>

          {plantillasActivas.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Plantilla sugerida
              </Label>
              <Select
                value={selectedPlantilla?.id || ""}
                onValueChange={(val) => setSelectedPlantilla(plantillasActivas.find((p) => p.id === val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {plantillasActivas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombrePlantilla}
                      {p.categoriaProducto && ` (${p.categoriaProducto})`}
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
              className="resize-none w-full"
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
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir WhatsApp
          </Button>
          <Button onClick={handleMarkSent} disabled={loading} className="gap-2">
            <Check className="w-4 h-4" />
            Marcar como enviado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
