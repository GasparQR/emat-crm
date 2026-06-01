import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import QuickCallButton from "./QuickCallButton";
import { getFechaGanadoFromConsulta } from "@/lib/pipelineStage";

const ASESOR_COLORS = {
  ANDRES: "bg-blue-500", TRISTAN: "bg-purple-500", VALENTINA: "bg-pink-500",
  ROCIO: "bg-rose-500", JULIAN: "bg-indigo-500", PABLO: "bg-orange-500",
  ESTEBAN: "bg-cyan-500", MACA: "bg-fuchsia-500", "MIRTA LOPEZ": "bg-teal-500",
};

export default function MobileConsultaListItem({
  consulta,
  etapaColor,
  onClick,
  onCallTarget,
}) {
  const phone = consulta.contactowhatsapp ?? consulta.contactoWhatsapp;
  const seguimientoVencido =
    consulta.proximoseguimiento &&
    moment(consulta.proximoseguimiento).isBefore(moment(), "day");
  const asesorColor = ASESOR_COLORS[consulta.asesor] || "bg-slate-400";
  const fechaGanado = getFechaGanadoFromConsulta(consulta);

  const handleClick = () => {
    if (phone && onCallTarget) {
      onCallTarget({ phone, label: consulta.contactonombre });
    }
    onClick?.(consulta);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm truncate">
            {consulta.contactonombre || "Sin nombre"}
          </p>
          <QuickCallButton phone={phone} />
        </div>
        {consulta.asesor && (
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
              asesorColor
            )}
            title={consulta.asesor}
          >
            {consulta.asesor[0]}
          </div>
        )}
      </div>

      {consulta.nroppto && (
        <p className="text-xs text-slate-400 mb-1">
          #{consulta.nroppto}
          {consulta.mes || consulta.ano ? ` · ${consulta.mes || ""} ${consulta.ano || ""}` : ""}
        </p>
      )}

      {consulta.ubicacionobra && (
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-1 truncate">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {consulta.ubicacionobra}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {consulta.superficiem2 && (
          <span className="text-xs text-slate-600 flex items-center gap-1 bg-slate-50 rounded px-2 py-0.5">
            <Ruler className="w-3 h-3" />
            {consulta.superficiem2} m²
          </span>
        )}
        {consulta.pipeline_stage && (
          <Badge
            className={cn("text-xs text-white border-0", etapaColor || "bg-slate-500")}
          >
            {consulta.pipeline_stage}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between">
        {consulta.importe ? (
          <span className="font-bold text-slate-900 text-sm">
            ${Number(consulta.importe).toLocaleString("es-AR")}
          </span>
        ) : (
          <span className="text-slate-400 text-sm">-</span>
        )}
        <div className="flex flex-col items-end gap-0.5">
          {fechaGanado && (
            <span className="text-xs text-green-700">
              Ganada {moment(fechaGanado).format("DD/MM/YY")}
            </span>
          )}
          {consulta.proximoseguimiento && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                seguimientoVencido ? "text-red-600 font-medium" : "text-slate-500"
              )}
            >
              <Calendar className="w-3 h-3" />
              {moment(consulta.proximoseguimiento).format("DD/MM/YY")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
