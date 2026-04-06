import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import moment from "moment";

const prioridadColors = {
  Alta: "bg-red-50 text-red-700 border-red-200",
  Media: "bg-amber-50 text-amber-700 border-amber-200",
  Baja: "bg-slate-50 text-slate-600 border-slate-200"
};

const MOTIVOS_PERDIDA = [
  { value: "Caro", label: "Caro" },
  { value: "SinStock", label: "Sin stock" },
  { value: "ComproOtro", label: "Compró otro" },
  { value: "NoResponde", label: "No responde" },
  { value: "Financiacion", label: "Financiación" },
  { value: "Otro", label: "Otro" },
];

export default function ConsultaCard({ consulta, onWhatsApp, onEdit, onConcretarVenta, onMarcarPerdido, isDragging }) {
  const seguimientoVencido = consulta.proximoSeguimiento &&
    moment(consulta.proximoSeguimiento).isBefore(moment(), 'day');
  const seguimientoHoy = consulta.proximoSeguimiento &&
    moment(consulta.proximoSeguimiento).isSame(moment(), 'day');

  return (
    <div className={cn(
      "bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group",
      isDragging && "shadow-xl rotate-2 scale-105",
      seguimientoVencido && "ring-2 ring-red-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm">
            {consulta.contactoNombre || "Sin nombre"}
          </span>
        </div>
        <Badge variant="outline" className={cn("text-xs", prioridadColors[consulta.prioridad])}>
          {consulta.prioridad}
        </Badge>
      </div>

      {/* Producto */}
      <p className="text-sm text-slate-600 mb-2 line-clamp-1">
        {consulta.productoConsultado}
        {consulta.variante && <span className="text-slate-400"> · {consulta.variante}</span>}
      </p>

      {/* Precio */}
      {consulta.precioCotizado && (
        <p className="text-lg font-bold text-slate-900 mb-3">
          {consulta.moneda === "USD" ? "US$" : "$"} {consulta.precioCotizado.toLocaleString()}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {consulta.canalOrigen && (
          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
            {consulta.canalOrigen}
          </Badge>
        )}
        {consulta.categoriaProducto && (
          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
            {consulta.categoriaProducto}
          </Badge>
        )}
      </div>

      {/* Seguimiento */}
      {consulta.proximoSeguimiento && (
        <div className={cn(
          "flex items-center gap-1.5 text-xs mb-3 px-2 py-1 rounded-lg w-fit",
          seguimientoVencido ? "bg-red-50 text-red-600" :
          seguimientoHoy ? "bg-amber-50 text-amber-600" :
          "bg-slate-50 text-slate-500"
        )}>
          <Calendar className="w-3 h-3" />
          {seguimientoVencido ? "Vencido: " : seguimientoHoy ? "Hoy" : ""}
          {!seguimientoHoy && moment(consulta.proximoSeguimiento).format("DD/MM")}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); onWhatsApp?.(consulta); }}
          className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white gap-1.5 h-8"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); }}
              className="h-8 w-8 p-0"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(consulta); }}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onConcretarVenta?.(consulta); }}
              className="text-emerald-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Concretar Venta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Marcar como perdido con submenú de motivos */}
            {MOTIVOS_PERDIDA.map(motivo => (
              <DropdownMenuItem
                key={motivo.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarcarPerdido?.(consulta, motivo.value);
                }}
                className="text-red-600"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Perdido — {motivo.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
