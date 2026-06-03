import { useQuery } from "@tanstack/react-query";
import { workspaceSettingsApi } from "@/api/supabaseClient";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { getConsultaPresupuestoDefaults } from "@/lib/consultaDefaults";

export function useConsultaDefaults() {
  const { workspace } = useWorkspace();
  const { data: currentUser } = useCurrentUser();
  const workspaceId = workspace?.id || "local";

  const { data: workspaceSettings, isLoading } = useQuery({
    queryKey: ["workspace-settings", workspaceId],
    queryFn: () => workspaceSettingsApi.get(workspaceId),
    staleTime: 60_000,
  });

  const resolved = getConsultaPresupuestoDefaults(workspaceSettings, currentUser);

  return {
    workspaceSettings,
    resolved,
    isLoading,
    workspaceId,
  };
}
