import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { entities } from "@/api/supabaseClient";
import { useWorkspace } from "@/components/context/WorkspaceContext";

/**
 * Selector de plantillas de WhatsApp para el detalle de contacto y de presupuesto.
 *
 * Lee las plantillas reales del workspace (tabla plantillawhatsapp). Antes mostraba
 * una lista de ejemplo hardcodeada ("Saludos"), herencia de Base44: el módulo de
 * listas apuntaba a una tabla listawhatsapp que nunca existió en Supabase.
 *
 * Nota de esquema: plantillawhatsapp arrastra columnas duplicadas snake_case y
 * camelCase (nombre_plantilla/nombrePlantilla, categoria_producto/categoriaProducto).
 * Los datos viven en las camelCase; se leen ambas por robustez.
 */
export default function SelectorListasWhatsApp({ contactoWhatsapp, onMessageSent }) {
  const { workspace } = useWorkspace();
  const [selectedPlantillaId, setSelectedPlantillaId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: plantillas = [], isLoading } = useQuery({
    queryKey: ["plantillas", workspace?.id],
    queryFn: () =>
      workspace
        ? entities.PlantillaWhatsApp.filter({ workspace_id: workspace.id }, "-created_date")
        : [],
    enabled: !!workspace,
  });

  const activas = useMemo(
    () =>
      plantillas
        .filter((p) => p.activa !== false)
        .map((p) => ({
          id: p.id,
          nombre: p.nombrePlantilla ?? p.nombre_plantilla ?? "Sin nombre",
          categoria: p.categoriaProducto ?? p.categoria_producto ?? "",
          etapa: p.etapa ?? "",
          texto: p.contenido ?? "",
        })),
    [plantillas],
  );

  const selectedPlantilla = useMemo(
    () => activas.find((p) => p.id === selectedPlantillaId),
    [selectedPlantillaId, activas],
  );

  const filteredPlantillas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activas;
    return activas.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.etapa.toLowerCase().includes(q),
    );
  }, [activas, search]);

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.length > 0 && !clean.startsWith("54") && clean.length <= 10) {
      clean = "54" + clean;
    }
    return clean;
  };

  const handleCopiar = async () => {
    if (!selectedPlantilla) return;
    try {
      await navigator.clipboard.writeText(selectedPlantilla.texto);
      toast.success("Copiado al portapapeles");
      onMessageSent?.();
    } catch {
      toast.error("Error al copiar");
    }
  };

  const handleAbrirWhatsApp = () => {
    if (!selectedPlantilla || !contactoWhatsapp) return;

    const formattedWhatsapp = formatWhatsAppNumber(contactoWhatsapp);
    if (!formattedWhatsapp) {
      toast.error("Número de WhatsApp no válido");
      return;
    }

    toast.success("Abierto WhatsApp");
    onMessageSent?.();

    const textEncoded = encodeURIComponent(selectedPlantilla.texto);
    window.open(
      `https://api.whatsapp.com/send?phone=${formattedWhatsapp}&text=${textEncoded}`,
      "_blank",
    );
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
          <label className="text-sm font-medium">Buscar plantilla</label>
          <Input
            placeholder="Busca por nombre, categoría o etapa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
          {isLoading ? (
            <div className="text-center py-4 text-slate-500 text-sm">
              Cargando plantillas…
            </div>
          ) : filteredPlantillas.length > 0 ? (
            filteredPlantillas.map((plantilla) => (
              <button
                key={plantilla.id}
                onClick={() => setSelectedPlantillaId(plantilla.id)}
                className={`w-full text-left p-2 rounded-lg transition-all ${
                  selectedPlantillaId === plantilla.id
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                <div className="font-medium text-sm">{plantilla.nombre}</div>
                <div className="text-xs mt-1 opacity-70">
                  {[plantilla.categoria, plantilla.etapa].filter(Boolean).join(" · ")}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-4 text-slate-500 text-sm">
              {activas.length === 0
                ? "No hay plantillas activas. Creá una en Plantillas."
                : "Ninguna plantilla coincide con la búsqueda"}
            </div>
          )}
        </div>

        {selectedPlantilla && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Vista previa</label>
              <div className="bg-slate-50 rounded-lg p-3 mt-2 text-sm text-slate-900 whitespace-pre-wrap break-words border border-slate-200 max-h-40 overflow-y-auto">
                {selectedPlantilla.texto}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopiar} variant="outline" className="flex-1 gap-2">
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
              <Button
                onClick={handleAbrirWhatsApp}
                disabled={!contactoWhatsapp}
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
