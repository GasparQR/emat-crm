import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import moment from "moment";

export default function HistorialEnvios({ contactoId, consultaId }) {
  const [envios] = useState([]);
  const [listas] = useState([]);

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