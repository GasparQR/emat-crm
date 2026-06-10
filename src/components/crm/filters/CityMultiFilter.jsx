import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   frequentCities?: string[],
 *   dynamicCities?: { label: string, count?: number }[],
 *   selected: string[],
 *   onChange: (values: string[]) => void,
 *   className?: string,
 * }} props
 */
export default function CityMultiFilter({
  frequentCities = [],
  dynamicCities = [],
  selected,
  onChange,
  className,
}) {
  const [customInput, setCustomInput] = useState("");

  const options = useMemo(() => {
    const map = new Map();
    frequentCities.forEach((c) => {
      const key = c.trim();
      if (key) map.set(key.toLowerCase(), { value: key, label: key });
    });
    dynamicCities.forEach((c) => {
      const key = c.label.trim();
      if (!key) return;
      const existing = map.get(key.toLowerCase());
      map.set(key.toLowerCase(), {
        value: key,
        label: key,
        count: c.count ?? existing?.count,
      });
    });
    selected.forEach((s) => {
      const key = s.trim();
      if (key && !map.has(key.toLowerCase())) {
        map.set(key.toLowerCase(), { value: key, label: key });
      }
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [frequentCities, dynamicCities, selected]);

  const summary = useMemo(() => {
    if (!selected.length) return "Todas";
    if (selected.length === 1) return selected[0];
    return `${selected.length} ciudades`;
  }, [selected]);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    if (!selected.includes(val)) {
      onChange([...selected, val]);
    }
    setCustomInput("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-between gap-2 font-normal min-w-[140px]">
          <span className="truncate text-left">
            <span className="text-slate-500 text-xs block leading-tight">Ciudad</span>
            <span className="text-sm">{summary}</span>
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-64 p-2", className)} align="start">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium text-slate-600">Ciudad</span>
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
        {frequentCities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 px-1">
            {frequentCities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => toggle(city)}
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                  selected.includes(city)
                    ? "bg-blue-100 border-blue-300 text-blue-800"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
                )}
              >
                {city}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
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
        <div className="flex gap-1 px-1">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Otra ciudad…"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <Button type="button" size="sm" variant="secondary" className="h-8" onClick={addCustom}>
            +
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
