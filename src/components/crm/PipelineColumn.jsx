import { Droppable, Draggable } from "@hello-pangea/dnd";
import ConsultaCard from "./ConsultaCard";
import { cn } from "@/lib/utils";

export default function PipelineColumn({ etapa, etapaColor, consultas = [], onWhatsApp, onEdit, onMarcarPerdido }) {
  const total = consultas.reduce((sum, c) => sum + (c.importe || 0), 0);

  return (
    <div className="flex flex-col bg-slate-50/50 rounded-2xl min-w-[300px] max-w-[300px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", etapaColor || "bg-blue-500")} />
            <h3 className="font-semibold text-slate-900">{etapa}</h3>
          </div>
          <span className="text-sm font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full">
            {consultas.length}
          </span>
        </div>
        {total > 0 && (
          <p className="text-xs text-slate-400">
            $ {total.toLocaleString("es-AR")}
          </p>
        )}
      </div>

      {/* Cards */}
      <Droppable droppableId={etapa}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-3 space-y-3 min-h-[200px] transition-colors duration-200",
              snapshot.isDraggingOver && "bg-slate-100/80"
            )}
          >
            {consultas.map((consulta, index) => (
              <Draggable key={consulta.id} draggableId={consulta.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <ConsultaCard
                      consulta={consulta}
                      onWhatsApp={onWhatsApp}
                      onEdit={onEdit}
                      onMarcarPerdido={onMarcarPerdido}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
