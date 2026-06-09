import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function ComparativeBadge({
  delta,
  className,
  size = "sm",
}) {
  if (!delta?.label) return null;

  const Icon =
    delta.direction === "up" ? TrendingUp : delta.direction === "down" ? TrendingDown : Minus;

  const colorClass =
    delta.sentiment === "positive"
      ? "text-emerald-700 bg-emerald-50"
      : delta.sentiment === "negative"
        ? "text-red-700 bg-red-50"
        : "text-slate-600 bg-slate-100";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        colorClass,
        className,
      )}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {delta.label}
    </span>
  );
}
