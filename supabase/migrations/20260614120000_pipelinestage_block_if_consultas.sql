-- Block deactivate/delete pipeline stages while consultas reference pipeline_stage

CREATE OR REPLACE FUNCTION public.prevent_pipeline_stage_deactivate_with_consultas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  IF OLD.activa IS NOT FALSE AND NEW.activa IS FALSE THEN
    SELECT COUNT(*)::integer INTO v_count
    FROM public.consulta c
    WHERE c.workspace_id = OLD.workspace_id
      AND c.pipeline_stage = OLD.pipeline_stage;

    IF v_count > 0 THEN
      RAISE EXCEPTION 'Hay consultas en la etapa %', OLD.pipeline_stage;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pipelinestage_prevent_deactivate_with_consultas ON public.pipelinestage;

CREATE TRIGGER pipelinestage_prevent_deactivate_with_consultas
  BEFORE UPDATE OF activa ON public.pipelinestage
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_pipeline_stage_deactivate_with_consultas();

-- Delete: reject if any consultas remain (no reassign flow)
CREATE OR REPLACE FUNCTION public.delete_pipeline_stage_with_reassign(
  p_workspace_id text,
  p_stage_id text,
  p_target_stage_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.pipelinestage%ROWTYPE;
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT * INTO v_stage
  FROM public.pipelinestage
  WHERE id = p_stage_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Etapa no encontrada';
  END IF;

  IF COALESCE(v_stage.es_sistema, false) THEN
    RAISE EXCEPTION 'No se pueden eliminar etapas de sistema';
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM public.consulta c
  WHERE c.workspace_id = p_workspace_id
    AND c.pipeline_stage = v_stage.pipeline_stage;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Hay consultas en la etapa %', v_stage.pipeline_stage;
  END IF;

  DELETE FROM public.pipelinestage WHERE id = p_stage_id;
END;
$$;
