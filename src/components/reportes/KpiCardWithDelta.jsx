import { cn } from "@/lib/utils";
import ComparativeBadge from "@/components/reportes/ComparativeBadge";

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {object} [props.delta]
 * @param {string} [props.accent]
 * @param {string} [props.variant]
 * @param {string} [props.className]
 */
export default function KpiCardWithDelta({
  label,
  value,
  delta,
  accent = "slate",
  variant = "screen",
  className,
}) {
  const accentMap = {
    slate: "border-l-slate-400 bg-slate-50",
    green: "border-l-emerald-500 bg-emerald-50/50",
    amber: "border-l-amber-500 bg-amber-50/50",
    blue: "border-l-blue-500 bg-blue-50/50",
    red: "border-l-red-500 bg-red-50/50",
  };

  const isPdf = variant === "pdf";

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 border-l-4 p-3",
        accentMap[accent] || accentMap.slate,
        className,
      )}
    >
      <p
        className={cn(
          "uppercase tracking-wide text-slate-500 font-medium",
          isPdf ? "text-[10px]" : "text-xs",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-bold text-slate-900 mt-1 tabular-nums",
          isPdf ? "text-lg" : "text-2xl",
        )}
      >
        {value}
      </p>
      {delta?.label && (
        <div className="mt-1.5">
          <ComparativeBadge delta={delta} size={isPdf ? "sm" : "sm"} />
        </div>
      )}
    </div>
  );
}
