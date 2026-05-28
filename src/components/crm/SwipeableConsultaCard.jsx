import { useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import ConsultaCard from "./ConsultaCard";

const SWIPE_THRESHOLD = 80;

export default function SwipeableConsultaCard({
  consulta,
  etapas = [],
  onStageChange,
  onEdit,
  onWhatsApp,
  onMarcarPerdido,
  onSelect,
  onPreviewPdf,
}) {
  const x = useMotionValue(0);
  const [swipeHint, setSwipeHint] = useState(null);

  const currentIndex = etapas.findIndex(
    (e) => e.pipeline_stage === consulta.pipeline_stage
  );
  const prevStage = currentIndex > 0 ? etapas[currentIndex - 1] : null;
  const nextStage =
    currentIndex >= 0 && currentIndex < etapas.length - 1
      ? etapas[currentIndex + 1]
      : null;

  const handleDrag = (_, info) => {
    if (info.offset.x < -30 && nextStage) {
      setSwipeHint("next");
    } else if (info.offset.x > 30 && prevStage) {
      setSwipeHint("prev");
    } else {
      setSwipeHint(null);
    }
  };

  const handleDragEnd = (_, info) => {
    setSwipeHint(null);
    if (info.offset.x < -SWIPE_THRESHOLD && nextStage) {
      onStageChange?.(consulta, nextStage.pipeline_stage);
    } else if (info.offset.x > SWIPE_THRESHOLD && prevStage) {
      onStageChange?.(consulta, prevStage.pipeline_stage);
    }
    animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  };

  const handleCardClick = () => {
    onSelect?.(consulta);
    onEdit?.(consulta);
  };

  return (
    <div className="relative touch-pan-y">
      {swipeHint === "next" && nextStage && (
        <div className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-blue-600 pointer-events-none z-0">
          → {nextStage.pipeline_stage}
        </div>
      )}
      {swipeHint === "prev" && prevStage && (
        <div className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-blue-600 pointer-events-none z-0">
          ← {prevStage.pipeline_stage}
        </div>
      )}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        className={cn("relative z-10 cursor-pointer")}
      >
        <ConsultaCard
          consulta={consulta}
          onWhatsApp={onWhatsApp}
          onEdit={onEdit}
          onMarcarPerdido={onMarcarPerdido}
          onPreviewPdf={onPreviewPdf}
        />
      </motion.div>
    </div>
  );
}
