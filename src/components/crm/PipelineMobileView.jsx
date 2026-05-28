import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
  onPreviewPdf,
}) {
  const [collapsedStages, setCollapsedStages] = useState(() => new Set());

  const toggleStage = (stageKey) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageKey)) next.delete(stageKey);
      else next.add(stageKey);
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-8 touch-pan-y">
      {etapas.map((etapa) => {
        const stageKey = etapa.pipeline_stage;
        const consultas = consultasPorEtapa[stageKey] || [];
        const total = consultas.reduce((sum, c) => sum + (c.importe || 0), 0);
        const isExpanded = !collapsedStages.has(stageKey);

        return (
          <section key={stageKey} className="bg-slate-50/80 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleStage(stageKey)}
              aria-expanded={isExpanded}
              className="w-full p-4 border-b border-slate-100 bg-white text-left cursor-pointer hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn("w-3 h-3 rounded-full flex-shrink-0", etapa.color || "bg-blue-500")}
                  />
                  <h3 className="font-semibold text-slate-900 truncate">{stageKey}</h3>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200",
                      !isExpanded && "-rotate-90"
                    )}
                  />
                </div>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {consultas.length}
                </span>
              </div>
              {total > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  $ {total.toLocaleString("es-AR")}
                </p>
              )}
            </button>
            {isExpanded && (
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
                      onPreviewPdf={onPreviewPdf}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
