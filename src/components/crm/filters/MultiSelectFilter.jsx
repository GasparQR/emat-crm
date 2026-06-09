import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   label: string,
 *   options: { value: string, label: string, count?: number }[],
 *   selected: string[],
 *   onChange: (values: string[]) => void,
 *   className?: string,
 *   triggerClassName?: string,
 * }} props
 */
export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  className,
  triggerClassName,
}) {
  const summary = useMemo(() => {
    if (!selected.length) return `Todos`;
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt?.label || selected[0];
    }
    return `${selected.length} seleccionados`;
  }, [selected, options]);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-9 justify-between gap-2 font-normal min-w-[130px]", triggerClassName)}
        >
          <span className="truncate text-left">
            <span className="text-slate-500 text-xs block leading-tight">{label}</span>
            <span className="text-sm">{summary}</span>
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-56 p-2", className)} align="start">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium text-slate-600">{label}</span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => onChange([])}
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              <span className="flex-1 truncate">{opt.label}</span>
              {opt.count != null && (
                <span className="text-xs text-slate-400 tabular-nums">{opt.count}</span>
              )}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
