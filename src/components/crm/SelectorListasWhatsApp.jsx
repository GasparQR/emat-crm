import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, Copy, Send } from "lucide-react";
import { toast } from "sonner";

export default function SelectorListasWhatsApp({ contactoId, contactoWhatsapp, consultaId, onMessageSent }) {
  const [selectedListaId, setSelectedListaId] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: listas = [] } = useQuery({
    queryKey: ['listas-publicadas'],
    queryFn: async () => {
      const allListas = await base44.entities.ListaWhatsApp.list("-updated_date", 1000);
      return allListas.filter(l => l.estado === "Publicada");
    }
  });

  const selectedLista = useMemo(() => {
    return listas.find(l => l.id === selectedListaId);
  }, [selectedListaId, listas]);

  const filteredListas = useMemo(() => {
    return listas.filter(l => 
      l.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (l.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
    );
  }, [listas, search]);

  const registrarEnvioMutation = useMutation({
    mutationFn: async (accion) => {
      // Crear log de envío
      await base44.entities.EnvioWhatsApp.create({
        contactoId,
        consultaId: consultaId || null,
        listaId: selectedListaId,
        contenidoEnviado: selectedLista.texto,
        accion
      });

      // Actualizar ultimoContacto en Consulta si existe
      if (consultaId) {
        const consultas = await base44.entities.Consulta.filter({ id: consultaId });
        if (consultas.length > 0) {
          await base44.entities.Consulta.update(consultaId, {
            ultimoContacto: new Date().toISOString()
          });
        }
      }
    },
    onSuccess: (_, accion) => {
      toast.success(accion === "Copiado" ? "Copiado al portapapeles" : "Abierto WhatsApp");
      queryClient.invalidateQueries({ queryKey: ['envios-whatsapp'] });
      onMessageSent?.();
    }
  });

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.length > 0 && !clean.startsWith("54") && clean.length <= 10) {
      clean = "54" + clean;
    }
    return clean;
  };

  const handleCopiar = async () => {
    if (!selectedLista) return;
    
    try {
      await navigator.clipboard.writeText(selectedLista.texto);
      await registrarEnvioMutation.mutateAsync("Copiado");
    } catch {
      toast.error("Error al copiar");
    }
  };

  const handleAbrirWhatsApp = async () => {
    if (!selectedLista || !contactoWhatsapp) return;

    const formattedWhatsapp = formatWhatsAppNumber(contactoWhatsapp);

    if (!formattedWhatsapp) {
      toast.error("Número de WhatsApp no válido");
      return;
    }

    await registrarEnvioMutation.mutateAsync("AbrirWhatsApp");

    const textEncoded = encodeURIComponent(selectedLista.texto);
    window.open(`https://api.whatsapp.com/send?phone=${formattedWhatsapp}&text=${textEncoded}`, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Enviar por WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar lista</label>
          <Input
            placeholder="Busca por nombre o tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
          {filteredListas.length > 0 ? (
            filteredListas.map(lista => (
              <button
                key={lista.id}
                onClick={() => setSelectedListaId(lista.id)}
                className={`w-full text-left p-2 rounded-lg transition-all ${
                  selectedListaId === lista.id
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                <div className="font-medium text-sm">{lista.nombre}</div>
                <div className="text-xs mt-1 opacity-70">{lista.categoria}</div>
              </button>
            ))
          ) : (
            <div className="text-center py-4 text-slate-500 text-sm">
              No hay listas disponibles
            </div>
          )}
        </div>

        {selectedLista && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Vista previa</label>
              <div className="bg-slate-50 rounded-lg p-3 mt-2 text-sm text-slate-900 whitespace-pre-wrap break-words border border-slate-200 max-h-40 overflow-y-auto">
                {selectedLista.texto}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopiar}
                disabled={registrarEnvioMutation.isPending}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
              <Button
                onClick={handleAbrirWhatsApp}
                disabled={registrarEnvioMutation.isPending || !contactoWhatsapp}
                className="flex-1 gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white"
              >
                <Send className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}