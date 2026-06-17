import moment from "moment";
import { Calendar, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import AsesorAvatar from "@/components/crm/AsesorAvatar";
import QuickCallButton from "@/components/crm/QuickCallButton";

export default function HoyConsultaItem({
  consulta,
  tipo,
  etapas = [],
  etapaColorMap = {},
  stagePending = false,
  getAsesorNombre,
  onStageChange,
  onWhatsApp,
  onMarcarCompletado,
  canEditStage,
}) {
  const fechaMostrar = consulta.proximoseguimiento;
  const stageColor = etapaColorMap[consulta.pipeline_stage] || "bg-slate-500";
  const phone = consulta.contactowhatsapp ?? consulta.contactoWhatsapp;
  const currentStage = consulta.pipeline_stage ?? "";
  const stageInList = etapas.some((s) => s.pipeline_stage === currentStage);

  const stageEditable = canEditStage ? canEditStage(consulta) : true;

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{consulta.contactonombre}</h3>
              <div className="min-w-[140px]">
                <Select
                  value={currentStage}
                  onValueChange={(v) => onStageChange?.(consulta, v)}
                  disabled={stagePending || !stageEditable}
                >
                  <SelectTrigger
                    className={cn("h-8 text-xs text-white border-0", stageColor)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!stageInList && currentStage && (
                      <SelectItem value={currentStage}>{currentStage}</SelectItem>
                    )}
                    {etapas.map((s) => (
                      <SelectItem key={s.pipeline_stage} value={s.pipeline_stage}>
                        {s.pipeline_stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {consulta.asesor && (
                <div className="flex items-center gap-1">
                  <AsesorAvatar
                    codigo={consulta.asesor}
                    size="xs"
                    title={getAsesorNombre?.(consulta.asesor) || consulta.asesor}
                  />
                  <span className="text-xs font-medium text-slate-600">
                    {getAsesorNombre?.(consulta.asesor) || consulta.asesor}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-1">{consulta.productoConsultado}</p>
            {consulta.variante && (
              <p className="text-xs text-slate-400">{consulta.variante}</p>
            )}
            {consulta.precioCotizado && (
              <p className="text-sm font-medium text-slate-900 mt-2">
                {consulta.moneda === "USD" ? "US$" : "$"} {consulta.precioCotizado.toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span
                className={cn(
                  "text-xs",
                  tipo === "vencido" ? "text-red-600 font-medium" : "text-slate-500",
                )}
              >
                {moment(fechaMostrar).format("DD/MM/YYYY")}
                {tipo === "vencido" && " (vencido)"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <QuickCallButton
              phone={phone}
              className="h-9 w-9 min-h-9 min-w-9 p-0 rounded-md"
            />
            <Button
              size="sm"
              onClick={() => onWhatsApp?.(consulta)}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white h-9 w-9 p-0"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarcarCompletado?.(consulta)}
              className="h-9 w-9 p-0"
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
