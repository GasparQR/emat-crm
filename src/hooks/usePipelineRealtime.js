import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

// "contactos" excluded: pipeline/consulta changes don't affect the contacto table.
// The contacto table has its own subscription below, so saving a presupuesto that
// creates a contact still refreshes the contact list on other open sessions.
const PIPELINE_QUERY_KEYS = [
  "pipeline-stages",
  "consultas-pipeline",
  "consultas",
  "consultas-hoy",
];

const CONTACTO_QUERY_KEYS = ["contactos"];

export default function usePipelineRealtime(workspaceId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return undefined;

    const invalidateKeys = (keys) => {
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key, workspaceId] });
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    };

    const invalidate = () => invalidateKeys(PIPELINE_QUERY_KEYS);
    const invalidateContactos = () => invalidateKeys(CONTACTO_QUERY_KEYS);

    const channel = supabase
      .channel(`pipeline-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pipelinestage",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consulta",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contacto",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        invalidateContactos,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);
}
