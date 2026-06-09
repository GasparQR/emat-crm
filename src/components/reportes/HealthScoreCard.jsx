import { HEALTH_SCORE_LABELS, REPORTES_THEME } from "@/lib/reportesTheme";
import { cn } from "@/lib/utils";

export default function HealthScoreCard({
  healthScore,
  variant = "screen",
  className,
}) {
  if (!healthScore) return null;

  const isPdf = variant === "pdf";
  const colorMap = {
    green: { ring: "#059669", bg: "#ecfdf5", text: "#047857" },
    amber: { ring: "#d97706", bg: "#fffbeb", text: "#b45309" },
    red: { ring: "#dc2626", bg: "#fef2f2", text: "#b91c1c" },
  };
  const colors = colorMap[healthScore.color] || colorMap.amber;

  return (
    <div
      className={cn(
        "rounded-xl border-2 overflow-hidden",
        className,
      )}
      style={{ borderColor: colors.ring, backgroundColor: colors.bg }}
    >
      <div className={cn("p-4", isPdf ? "p-5" : "p-6")}>
        <p
          className={cn(
            "uppercase tracking-wider font-semibold",
            isPdf ? "text-[10px]" : "text-xs",
          )}
          style={{ color: colors.text }}
        >
          Salud comercial
        </p>
        <div className="flex items-end gap-3 mt-2">
          <span className={isPdf ? "text-2xl" : "text-3xl"}>{healthScore.emoji}</span>
          <p
            className={cn("font-bold tabular-nums", isPdf ? "text-4xl" : "text-5xl")}
            style={{ color: REPORTES_THEME.brand.dark }}
          >
            {healthScore.score}
            <span className={cn("font-normal text-slate-500", isPdf ? "text-lg" : "text-xl")}>
              {" "}/ 100
            </span>
          </p>
        </div>
        <p
          className={cn("capitalize mt-1 font-medium", isPdf ? "text-xs" : "text-sm")}
          style={{ color: colors.text }}
        >
          {healthScore.grade}
        </p>

        <div className={cn("mt-4 space-y-2", isPdf ? "text-[10px]" : "text-xs")}>
          {Object.entries(healthScore.breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-slate-600">{HEALTH_SCORE_LABELS[key]}</span>
              <div className="flex-1 h-2 bg-white/80 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${value}%`,
                    backgroundColor: REPORTES_THEME.brand.primary,
                  }}
                />
              </div>
              <span className="w-8 text-right font-semibold tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
