import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

const PIPELINE_QUERY_KEYS = [
  "pipeline-stages",
  "consultas-pipeline",
  "consultas",
  "consultas-hoy",
  "contactos",
];

export default function usePipelineRealtime(workspaceId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return undefined;

    const invalidate = () => {
      PIPELINE_QUERY_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key, workspaceId] });
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    };

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);
}
