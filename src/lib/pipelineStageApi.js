import { supabase } from "@/api/supabaseClient";

export function stageBlockedByConsultasMessage(stageName, count) {
  const n = Number(count) || 0;
  const suffix =
    n === 1
      ? "hay 1 consulta en la etapa"
      : `hay ${n} consultas en la etapa`;
  return `No es posible: ${suffix} «${stageName}». Movelas a otra etapa desde Consultas o Pipeline antes de continuar.`;
}

export async function previewDeletePipelineStage(workspaceId, stageId) {
  const { data, error } = await supabase.rpc("preview_delete_pipeline_stage", {
    p_workspace_id: workspaceId,
    p_stage_id: stageId,
  });
  if (error) throw error;
  return data;
}

/** @alias previewDeletePipelineStage */
export const previewPipelineStageConsultas = previewDeletePipelineStage;

export async function reorderPipelineStages(workspaceId, orderedIds) {
  const { error } = await supabase.rpc("reorder_pipeline_stages", {
    p_workspace_id: workspaceId,
    p_ordered_ids: orderedIds,
  });
  if (error) throw error;
}

export async function renamePipelineStage(workspaceId, stageId, newName) {
  const { error } = await supabase.rpc("rename_pipeline_stage", {
    p_workspace_id: workspaceId,
    p_stage_id: stageId,
    p_new_name: newName,
  });
  if (error) throw error;
}

export async function deletePipelineStageWithReassign(workspaceId, stageId, targetStageName = null) {
  const { error } = await supabase.rpc("delete_pipeline_stage_with_reassign", {
    p_workspace_id: workspaceId,
    p_stage_id: stageId,
    p_target_stage_name: targetStageName,
  });
  if (error) throw error;
}
