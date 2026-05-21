import { cn } from "@/lib/utils";
import SwipeableConsultaCard from "./SwipeableConsultaCard";

export default function PipelineMobileView({
  etapas = [],
  consultasPorEtapa = {},
  onStageChange,
  onEdit,
  onWhatsApp,
  onMarcarPerdido,
  onSelectConsulta,
}) {
  return (
    <div className="space-y-6 pb-8 touch-pan-y">
      {etapas.map((etapa) => {
        const stageKey = etapa.pipeline_stage;
        const consultas = consultasPorEtapa[stageKey] || [];
        const total = consultas.reduce((sum, c) => sum + (c.importe || 0), 0);

        return (
          <section key={stageKey} className="bg-slate-50/80 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn("w-3 h-3 rounded-full", etapa.color || "bg-blue-500")}
                  />
                  <h3 className="font-semibold text-slate-900">{stageKey}</h3>
                </div>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {consultas.length}
                </span>
              </div>
              {total > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  $ {total.toLocaleString("es-AR")}
                </p>
              )}
            </div>
            <div className="p-3 space-y-3 min-h-[60px]">
              {consultas.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin consultas</p>
              ) : (
                consultas.map((consulta) => (
                  <SwipeableConsultaCard
                    key={consulta.id}
                    consulta={consulta}
                    etapas={etapas}
                    onStageChange={onStageChange}
                    onEdit={onEdit}
                    onWhatsApp={onWhatsApp}
                    onMarcarPerdido={onMarcarPerdido}
                    onSelect={onSelectConsulta}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
