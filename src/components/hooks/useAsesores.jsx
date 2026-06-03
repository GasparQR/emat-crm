import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/supabaseClient";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { getAsesorBgClass, getAsesorHexColor } from "@/lib/asesorColors";
import { getDefaultAsesorForUser, isAdmin } from "@/lib/permissions";

/** Opciones de filtro: catálogo + códigos que aparecen en datos (históricos). */
export function buildAsesorFilterOptions(asesorOptions, items, field = "asesor") {
  const byCode = new Map((asesorOptions || []).map((o) => [o.value, o]));
  for (const item of items || []) {
    const code = item?.[field];
    if (!code) continue;
    if (!byCode.has(code)) {
      byCode.set(code, { value: code, label: code, raw: null });
    }
  }
  return [...byCode.values()].sort((a, b) =>
    String(a.label).localeCompare(String(b.label), "es")
  );
}

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

  const asesorCodes = useMemo(() => asesorOptions.map((o) => o.value), [asesorOptions]);

  return {
    ...query,
    asesorOptions,
    asesorCodes,
    getAsesorHexColor: (codigo) => getAsesorHexColor(codigo),
    getAsesorBgClass: (codigo) => getAsesorBgClass(codigo),
  };
}
