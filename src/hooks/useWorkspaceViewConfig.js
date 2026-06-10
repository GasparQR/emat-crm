import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspaceSettingsApi } from "@/api/supabaseClient";
import { DEFAULT_FREQUENT_CITIES } from "@/lib/viewLayoutDefaults";
import { mergeViewConfig } from "@/lib/viewLayout";

/**
 * @param {string} [workspaceId]
 */
export default function useWorkspaceViewConfig(workspaceId = "local") {
  const { data, isLoading } = useQuery({
    queryKey: ["workspace-settings", workspaceId],
    queryFn: () => workspaceSettingsApi.get(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const viewConfig = useMemo(
    () => mergeViewConfig(data?.view_layout_config || {}),
    [data?.view_layout_config],
  );

  const frequentCities = useMemo(() => {
    const stored = data?.frequent_cities;
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return DEFAULT_FREQUENT_CITIES;
  }, [data?.frequent_cities]);

  return {
    viewConfig,
    frequentCities,
    isLoading,
    rawSettings: data,
  };
}
