import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/supabaseClient";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { getDefaultAsesorForUser, isAdmin } from "@/lib/permissions";

export function useAsesores(user) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || "local";

  const query = useQuery({
    queryKey: ["asesores", workspaceId],
    queryFn: async () => {
      const rows = await entities.Asesor.filter({ workspace_id: workspaceId }, "nombre", 2000);
      return (rows || []).filter((a) => a.active !== false && a.activo !== false);
    },
    enabled: !!workspaceId,
  });

  const asesorOptions = useMemo(() => {
    const items = (query.data || []).map((a) => ({
      value: a.codigo || a.nombre,
      label: a.nombre || a.codigo,
      raw: a,
    }));

    if (isAdmin(user) || user?.can_view_other_advisors) {
      return items;
    }

    const ownCode = getDefaultAsesorForUser(user);
    if (!ownCode) return items;
    return items.filter((item) => item.value === ownCode);
  }, [query.data, user]);

  return {
    ...query,
    asesorOptions,
    asesorCodes: asesorOptions.map((o) => o.value),
  };
}
