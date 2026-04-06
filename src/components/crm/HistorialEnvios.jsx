import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import moment from "moment";

export default function HistorialEnvios({ contactoId, consultaId }) {
  const { data: envios = [] } = useQuery({
    queryKey: ['envios-whatsapp', contactoId, consultaId],
    queryFn: async () => {
      let query = { contactoId };
      if (consultaId) {
        query.consultaId = consultaId;
      }
      return await base44.entities.EnvioWhatsApp.filter(query, "-created_date", 100);
    }
  });

  const { data: listas = [] } = useQuery({
    queryKey: ['listas-whatsapp-map'],
    queryFn: () => base44.entities.ListaWhatsApp.list("-updated_date", 1000)
  });

  const getListaNombre = (listaId) => {
    const lista = listas.find(l => l.id === listaId);
    return lista?.nombre || "Lista eliminada";
  };

  const accionColors = {
    "Copiado": "bg-blue-100 text-blue-800",
    "AbrirWhatsApp": "bg-green-100 text-green-800"
  };

  if (envios.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Historial de envíos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {envios.map(envio => (
            <div key={envio.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
              <div className="flex-1 space-y-1">
                <div className="font-medium text-sm text-slate-900">
                  {getListaNombre(envio.listaId)}
                </div>
                <div className="text-xs text-slate-500">
                  {moment(envio.created_date).format("DD/MM/YYYY HH:mm")}
                </div>
              </div>
              <Badge className={accionColors[envio.accion]}>
                {envio.accion}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}