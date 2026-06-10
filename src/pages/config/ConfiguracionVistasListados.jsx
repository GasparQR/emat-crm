import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, LayoutList, Save } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import useWorkspaceViewConfig from "@/hooks/useWorkspaceViewConfig";
import { workspaceSettingsApi } from "@/api/supabaseClient";
import { DEFAULT_VIEW_LAYOUT, DEFAULT_FREQUENT_CITIES, VIEW_IDS } from "@/lib/viewLayoutDefaults";

const VIEW_LABELS = {
  consultas: "Presupuestos",
  contactos: "Contactos",
  pipeline: "Pipeline",
  hoy: "Hoy",
  reportes: "Reportes",
};

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

export default function ConfiguracionVistasListados() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";
  const { viewConfig, frequentCities, isLoading } = useWorkspaceViewConfig(workspaceId);

  const [draft, setDraft] = useState(null);
  const [citiesDraft, setCitiesDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newCity, setNewCity] = useState("");

  const workingConfig = draft ?? viewConfig;
  const workingCities = citiesDraft ?? frequentCities;

  const toggleColumn = (viewId, columnId, enabled) => {
    setDraft((prev) => {
      const base = cloneConfig(prev ?? viewConfig);
      const cols = base[viewId]?.columns;
      if (!cols) return base;
      base[viewId].columns = cols.map((c) =>
        c.id === columnId ? { ...c, enabled } : c,
      );
      return base;
    });
  };

  const toggleFilter = (viewId, filterId, enabled) => {
    setDraft((prev) => {
      const base = cloneConfig(prev ?? viewConfig);
      base[viewId].filters = base[viewId].filters.map((f) =>
        f.id === filterId ? { ...f, enabled } : f,
      );
      return base;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await workspaceSettingsApi.saveViewLayout(workspaceId, workingConfig);
      await workspaceSettingsApi.saveFrequentCities(workspaceId, workingCities);
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", workspaceId] });
      setDraft(null);
      setCitiesDraft(null);
      toast.success("Vistas y filtros guardados para todo el workspace");
    } catch (e) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const addCity = () => {
    const val = newCity.trim();
    if (!val) return;
    if (workingCities.some((c) => c.toLowerCase() === val.toLowerCase())) {
      toast.error("Esa ciudad ya está en la lista");
      return;
    }
    setCitiesDraft([...(citiesDraft ?? frequentCities), val]);
    setNewCity("");
  };

  const removeCity = (city) => {
    setCitiesDraft((workingCities).filter((c) => c !== city));
  };

  const resetDefaults = () => {
    setDraft(cloneConfig(DEFAULT_VIEW_LAYOUT));
    setCitiesDraft([...DEFAULT_FREQUENT_CITIES]);
    toast.info("Borrador restaurado a defaults — guardá para aplicar");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to={createPageUrl("Ajustes")}>
            <Button variant="ghost" className="gap-2 mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Ajustes
            </Button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <LayoutList className="w-7 h-7 text-blue-600" />
                Vistas y filtros
              </h1>
              <p className="text-slate-500 mt-1">
                Configuración global del workspace: columnas y filtros visibles para todos los usuarios
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving || isLoading} className="gap-2 shrink-0">
              <Save className="w-4 h-4" />
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando configuración…</p>
        ) : (
          <Tabs defaultValue="consultas">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {VIEW_IDS.map((id) => (
                <TabsTrigger key={id} value={id} className="text-xs sm:text-sm">
                  {VIEW_LABELS[id]}
                </TabsTrigger>
              ))}
            </TabsList>

            {VIEW_IDS.map((viewId) => (
              <TabsContent key={viewId} value={viewId} className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Filtros — {VIEW_LABELS[viewId]}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {workingConfig[viewId]?.filters?.map((f) => (
                      <div key={f.id} className="flex items-center justify-between py-1">
                        <Label htmlFor={`filter-${viewId}-${f.id}`}>{f.label}</Label>
                        <Switch
                          id={`filter-${viewId}-${f.id}`}
                          checked={f.enabled !== false}
                          onCheckedChange={(v) => toggleFilter(viewId, f.id, v)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {workingConfig[viewId]?.columns && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Columnas — {VIEW_LABELS[viewId]}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {workingConfig[viewId].columns.map((c) => (
                        <div key={c.id} className="flex items-center justify-between py-1">
                          <Label htmlFor={`col-${viewId}-${c.id}`}>{c.label}</Label>
                          <Switch
                            id={`col-${viewId}-${c.id}`}
                            checked={c.enabled !== false}
                            onCheckedChange={(v) => toggleColumn(viewId, c.id, v)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {viewId === "contactos" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ciudades frecuentes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Atajos en el filtro Ciudad (campo localidad en contactos).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {workingCities.map((city) => (
                          <span
                            key={city}
                            className="inline-flex items-center gap-1 text-sm bg-slate-100 rounded-full px-3 py-1"
                          >
                            {city}
                            <button
                              type="button"
                              className="text-slate-400 hover:text-red-600 ml-1"
                              onClick={() => removeCity(city)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          placeholder="Agregar ciudad…"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCity())}
                        />
                        <Button type="button" variant="secondary" onClick={addCity}>
                          Agregar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDefaults} disabled={isLoading}>
            Restaurar defaults en borrador
          </Button>
        </div>
      </div>
    </div>
  );
}
