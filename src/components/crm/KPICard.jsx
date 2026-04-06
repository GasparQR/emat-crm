import { cn } from "@/lib/utils";

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendUp, className }) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-slate-50 rounded-xl">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1.5">
          <span className={cn(
            "text-sm font-medium",
            trendUp ? "text-emerald-600" : "text-red-500"
          )}>
            {trendUp ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-slate-400">vs período anterior</span>
        </div>
      )}
    </div>
  );
}