import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, MoreHorizontal, MapPin, Ruler, Send, FileText } from "lucide-react";
import QuickCallButton from "./QuickCallButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useAsesores } from "@/components/hooks/useAsesores";
import AsesorAvatar from "@/components/crm/AsesorAvatar";
import moment from "moment";

const MOTIVOS_PERDIDA = [
  { value: "Sin respuesta", label: "Sin respuesta" },
  { value: "Se canceló la obra", label: "Canceló la obra" },
  { value: "Ganó la competencia", label: "Ganó competencia" },
  { value: "Eligió otro material", label: "Otro material" },
  { value: "Costos", label: "Costos" },
  { value: "Distancia/Logística", label: "Distancia" },
  { value: "Otro", label: "Otro" },
];

export default function ConsultaCard({ consulta, onWhatsApp, onEdit, onMarcarPerdido, onPreviewPdf, isDragging }) {
  const seguimientoVencido = consulta.proximoseguimiento &&
    moment(consulta.proximoseguimiento).isBefore(moment(), "day");
  const seguimientoHoy = consulta.proximoseguimiento &&
    moment(consulta.proximoseguimiento).isSame(moment(), "day");

  const { data: currentUser } = useCurrentUser();
  const { getAsesorNombre } = useAsesores(currentUser);
  const asesorTitle = getAsesorNombre(consulta.asesor) || consulta.asesor;

  return (
    <div className={cn(
      "bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group",
      isDragging && "shadow-xl rotate-2 scale-105 opacity-90",
      seguimientoVencido && "ring-2 ring-red-200",
    )}>
      {/* Header: asesor avatar + nombre + menú */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <AsesorAvatar codigo={consulta.asesor} size="sm" title={asesorTitle} />
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-1">
              {consulta.contactonombre || "Sin nombre"}
            </p>
            {consulta.nroppto && (
              <p className="text-xs text-slate-400">#{consulta.nroppto}</p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit?.(consulta); }}>
              Editar
            </DropdownMenuItem>
            {consulta.contactowhatsapp && (
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onWhatsApp?.(consulta); }}>
                <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" />
                WhatsApp
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onPreviewPdf?.(consulta); }}>
              <FileText className="w-4 h-4 mr-2" />
              Ver PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <p className="text-xs text-slate-400 px-2 py-1">Marcar como perdido</p>
            {MOTIVOS_PERDIDA.map(m => (
              <DropdownMenuItem
                key={m.value}
                className="text-red-600 text-xs"
                onClick={e => { e.stopPropagation(); onMarcarPerdido?.(consulta, m.value); }}
              >
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Ubicación */}
      {consulta.ubicacionobra && (
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{consulta.ubicacionobra}</span>
        </div>
      )}

      {/* Superficie + tipo */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {consulta.superficiem2 && (
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 rounded px-2 py-0.5">
            <Ruler className="w-3 h-3" />
            {consulta.superficiem2} m²
          </div>
        )}
        {consulta.tipoaplicacion && (
          <Badge variant="secondary" className="text-xs py-0">{consulta.tipoaplicacion}</Badge>
        )}
      </div>

      {/* Importe */}
      {consulta.importe && (
        <p className="text-base font-bold text-slate-900 mb-2">
          ${Number(consulta.importe).toLocaleString("es-AR")}
        </p>
      )}

      {consulta.notas && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 mb-2">
          <p className="text-xs font-medium text-amber-900 mb-0.5">Notas</p>
          <p className="text-xs text-slate-600 line-clamp-3">{consulta.notas}</p>
        </div>
      )}

      {/* Footer: canal + seguimiento + whatsapp */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-2">
          {(consulta.canalOrigen ?? consulta.canalorigen) && (
            <span className="text-xs text-slate-400">{consulta.canalOrigen ?? consulta.canalorigen}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {consulta.proximoseguimiento && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              seguimientoVencido ? "text-red-500" : seguimientoHoy ? "text-amber-600" : "text-slate-400"
            )}>
              <Calendar className="w-3 h-3" />
              {moment(consulta.proximoseguimiento).format("DD/MM")}
            </div>
          )}
          <QuickCallButton phone={consulta.contactowhatsapp} className="h-6 w-6 sm:min-h-6 sm:min-w-6" />
          {consulta.contactowhatsapp && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-[#25D366] hover:bg-green-50"
              onClick={e => { e.stopPropagation(); onWhatsApp?.(consulta); }}
              title="Enviar WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
