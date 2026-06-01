import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, MoreHorizontal, Edit, MessageCircle, Mail, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import QuickCallButton from "./QuickCallButton";

const ASESOR_COLORS = {
  ANDRES: "bg-blue-500", TRISTAN: "bg-purple-500", VALENTINA: "bg-pink-500",
  ROCIO: "bg-rose-500", JULIAN: "bg-indigo-500", PABLO: "bg-orange-500",
  ESTEBAN: "bg-cyan-500", MACA: "bg-fuchsia-500", "MIRTA LOPEZ": "bg-teal-500",
};

export default function MobileContactoListItem({
  contacto,
  consulta,
  stageColor,
  onSelect,
  onEdit,
  onWhatsApp,
  onMail,
  onDelete,
  onEtapaClick,
}) {
  const phone = contacto.whatsapp;

  const handleSelect = () => {
    if (phone) {
      onSelect?.({ phone, label: contacto.nombre });
    }
    onEdit?.(contacto);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={handleSelect}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-slate-900 text-sm truncate">
              {contacto.nombre}
            </p>
            <QuickCallButton phone={phone} />
          </div>
          {contacto.empresa && contacto.empresa !== contacto.nombre && (
            <p className="text-xs text-slate-500 truncate">{contacto.empresa}</p>
          )}
          {(contacto.localidad || contacto.provincia) && (
            <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {contacto.localidad || contacto.provincia}
            </p>
          )}
          {(contacto.telefonoDisplay || contacto.whatsapp) && (
            <p className="text-xs text-slate-600 mt-1">
              {contacto.telefonoDisplay || contacto.whatsapp}
            </p>
          )}
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          {contacto.asesor && (
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold",
                ASESOR_COLORS[contacto.asesor] || "bg-slate-400"
              )}
              title={contacto.asesor}
            >
              {contacto.asesor?.[0]}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(contacto)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {contacto.whatsapp && (
                <DropdownMenuItem onClick={() => onWhatsApp?.(contacto)}>
                  <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" />
                  WhatsApp
                </DropdownMenuItem>
              )}
              {!contacto.whatsapp && contacto.email && (
                <DropdownMenuItem onClick={() => onMail?.(contacto)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete?.(contacto)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        {contacto.segmento && (
          <Badge variant="secondary" className="text-xs">
            {contacto.segmento}
          </Badge>
        )}
        {consulta && (
          <button
            type="button"
            onClick={() => onEtapaClick?.(contacto)}
            className="flex items-center gap-1.5 text-xs text-slate-700 rounded-md px-2 py-0.5 bg-slate-50 hover:bg-slate-100"
          >
            <div className={cn("w-2 h-2 rounded-full", stageColor || "bg-slate-400")} />
            {consulta.pipeline_stage}
          </button>
        )}
      </div>
    </div>
  );
}
