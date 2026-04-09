import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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

export default function ContactoWhatsAppSender({ open, onOpenChange, contacto, onMessageSent }) {
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [copied, setCopied] = useState(false);
  const [usarPlantilla, setUsarPlantilla] = useState(true);

  const { workspace } = useWorkspace();

  const { data: plantillas = [] } = useQuery({
    queryKey: ["plantillas", workspace?.id],
    queryFn: () =>
      workspace
        ? base44.entities.PlantillaWhatsApp.filter({ workspace_id: workspace.id }, "-created_date")
        : [],
    enabled: !!workspace && open,
  });

  const { data: variablesDB = [] } = useQuery({
    queryKey: ["variables", workspace?.id],
    queryFn: () =>
      workspace ? base44.entities.VariablePlantilla.filter({ workspace_id: workspace.id }) : [],
    enabled: !!workspace && open,
  });

  // Auto-select a suggested template when plantillas load or dialog opens
  useEffect(() => {
    if (!open) return;

    if (plantillas.length === 0) {
      setUsarPlantilla(false);
      return;
    }

    setUsarPlantilla(true);
    const activas = plantillas.filter((p) => p.activa !== false);
    const sugerida =
      activas.find((p) => p.etapa === "General" || !p.etapa) ||
      activas[0];

    if (sugerida) setSelectedPlantilla(sugerida);
  }, [open, plantillas]);

  // Re-build message text whenever template or contact changes
  useEffect(() => {
    if (!usarPlantilla) {
      setMensaje(prev => prev || `Hola ${contacto?.nombre || ""}, `);
      return;
    }
    if (selectedPlantilla && contacto) {
      setMensaje(reemplazarVariables(selectedPlantilla.contenido, contacto, variablesDB));
    }
  }, [selectedPlantilla, contacto, variablesDB, usarPlantilla]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPlantilla(null);
      setMensaje("");
      setCopied(false);
      setUsarPlantilla(true);
    }
  }, [open]);

  const reemplazarVariables = (texto, data, vars) => {
    if (!texto) return "";
    let result = texto;

    // Custom workspace variables first
    vars.forEach((v) => {
      result = result.replace(new RegExp(`\\{${v.clave}\\}`, "g"), v.valor ?? "");
    });

    // Contact-specific variables
    result = result
      .replace(/{NOMBRE}/g, data.nombre || "")
      .replace(/{EMPRESA}/g, data.empresa || "")
      .replace(/{LOCALIDAD}/g, data.localidad || "")
      .replace(/{PROVINCIA}/g, data.provincia || "")
      .replace(/{SEGMENTO}/g, data.segmento || "")
      // Legacy variables used in quote/sales templates — clear them so they don't appear verbatim
      .replace(/\{PRODUCTO\}|\{VARIANTE\}|\{PRECIO\}|\{MONEDA\}|\{GARANTIA\}|\{ENTREGA\}|\{PAGO\}/g, "");

    return result;
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
    if (!mensaje.trim()) {
      toast.error("Escribe un mensaje primero");
      return;
    }

    const phone = formatPhone(contacto.whatsapp);
    if (!phone) {
      toast.error("Número de WhatsApp no válido");
      return;
    }

    const msg = String(mensaje || "")
      .normalize("NFC")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    const url = new URL("https://api.whatsapp.com/send");
    url.searchParams.set("phone", phone);
    url.searchParams.set("text", msg);

    if (onMessageSent) {
      onMessageSent({
        contacto,
        mensaje,
        timestamp: new Date().toISOString(),
      });
    }

    window.open(url.toString(), "_blank", "noopener,noreferrer");

    onMessageSent?.({ contacto, mensaje });
  };

  if (!contacto) return null;

  const plantillasActivas = plantillas.filter((p) => p.activa !== false);
  const hayPlantillas = plantillasActivas.length > 0;

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
          {/* Contact info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="font-semibold text-slate-900">{contacto.nombre}</p>
            {contacto.empresa && contacto.empresa !== contacto.nombre && (
              <p className="text-sm text-slate-500">{contacto.empresa}</p>
            )}
            <p className="text-sm text-slate-500 mt-0.5">{contacto.whatsapp}</p>
            {contacto.segmento && (
              <div className="mt-2">
                <Badge variant="secondary">{contacto.segmento}</Badge>
              </div>
            )}
          </div>

          {/* Template selector - solo si hay plantillas */}
          {hayPlantillas && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Plantilla sugerida
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usarPlantilla"
                  checked={usarPlantilla}
                  onChange={(e) => setUsarPlantilla(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="usarPlantilla" className="text-sm cursor-pointer">
                  Usar una plantilla guardada
                </label>
              </div>

              {usarPlantilla && (
                <Select
                  value={selectedPlantilla?.id || ""}
                  onValueChange={(val) =>
                    setSelectedPlantilla(plantillasActivas.find((p) => p.id === val))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillasActivas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombrePlantilla}
                        {p.etapa && p.etapa !== "General" && ` · ${p.etapa}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Message editor */}
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
            disabled={!contacto.whatsapp || !mensaje.trim()}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
