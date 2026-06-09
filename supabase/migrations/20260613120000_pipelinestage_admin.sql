-- Pipeline stages: codigo interno, admin CRUD, agrupación en reportes, RPCs

CREATE TABLE IF NOT EXISTS public.pipelinestage (
  id              text PRIMARY KEY,
  workspace_id    text NOT NULL DEFAULT 'local',
  pipeline_stage  text NOT NULL,
  orden           integer NOT NULL DEFAULT 0,
  color           text,
  activa          boolean NOT NULL DEFAULT true,
  created_date    timestamptz NOT NULL DEFAULT now(),
  updated_date    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipelinestage
  ADD COLUMN IF NOT EXISTS codigo text;

ALTER TABLE public.pipelinestage
  ADD COLUMN IF NOT EXISTS es_sistema boolean NOT NULL DEFAULT false;

ALTER TABLE public.pipelinestage
  ADD COLUMN IF NOT EXISTS agrupa_en_reporte_codigo text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelinestage_workspace_codigo
  ON public.pipelinestage (workspace_id, codigo)
  WHERE codigo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelinestage_workspace_name
  ON public.pipelinestage (workspace_id, pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_pipelinestage_workspace_orden
  ON public.pipelinestage (workspace_id, orden);

-- Backfill codigo / flags on existing rows (stage_0, stage_1, … or any legacy id)
UPDATE public.pipelinestage
SET
  codigo = CASE pipeline_stage
    WHEN 'NUEVO LEAD' THEN 'NUEVO_LEAD'
    WHEN 'A COTIZAR' THEN 'A_COTIZAR'
    WHEN 'NEGOCIACION' THEN 'NEGOCIACION'
    WHEN 'GANADA' THEN 'GANADA'
    WHEN 'EJECUTADA' THEN 'EJECUTADA'
    WHEN 'PAUSADA' THEN 'PAUSADA'
    WHEN 'PERDIDA' THEN 'PERDIDA'
    ELSE COALESCE(codigo, 'CUSTOM_' || substr(replace(id, 'pipelinestage_', ''), 1, 12))
  END,
  es_sistema = CASE
    WHEN pipeline_stage IN (
      'NUEVO LEAD', 'A COTIZAR', 'NEGOCIACION', 'GANADA', 'EJECUTADA', 'PAUSADA', 'PERDIDA'
    ) THEN true
    ELSE es_sistema
  END,
  agrupa_en_reporte_codigo = CASE
    WHEN pipeline_stage = 'EJECUTADA' THEN COALESCE(agrupa_en_reporte_codigo, 'GANADA')
    ELSE agrupa_en_reporte_codigo
  END,
  updated_date = now()
WHERE workspace_id = 'local'
  AND (
    codigo IS NULL
    OR pipeline_stage IN (
      'NUEVO LEAD', 'A COTIZAR', 'NEGOCIACION', 'GANADA', 'EJECUTADA', 'PAUSADA', 'PERDIDA'
    )
  );

-- Seed only missing system stages (fresh DB). Skip when backfill already created codigos on stage_* rows.
INSERT INTO public.pipelinestage (
  id, workspace_id, codigo, pipeline_stage, orden, color, activa, es_sistema, agrupa_en_reporte_codigo
)
SELECT
  v.id,
  v.workspace_id,
  v.codigo,
  v.pipeline_stage,
  v.orden,
  v.color,
  v.activa,
  v.es_sistema,
  v.agrupa_en_reporte_codigo
FROM (
  VALUES
    ('pipelinestage_nuevo_lead', 'local', 'NUEVO_LEAD', 'NUEVO LEAD', 0, 'bg-cyan-500', true, true, null::text),
    ('pipelinestage_a_cotizar', 'local', 'A_COTIZAR', 'A COTIZAR', 1, 'bg-slate-400', true, true, null::text),
    ('pipelinestage_negociacion', 'local', 'NEGOCIACION', 'NEGOCIACION', 2, 'bg-amber-500', true, true, null::text),
    ('pipelinestage_ganada', 'local', 'GANADA', 'GANADA', 3, 'bg-emerald-500', true, true, null::text),
    ('pipelinestage_ejecutada', 'local', 'EJECUTADA', 'EJECUTADA', 4, 'bg-green-600', true, true, 'GANADA'),
    ('pipelinestage_pausada', 'local', 'PAUSADA', 'PAUSADA', 5, 'bg-gray-500', true, true, null::text),
    ('pipelinestage_perdida', 'local', 'PERDIDA', 'PERDIDA', 6, 'bg-red-500', true, true, null::text)
) AS v(
  id, workspace_id, codigo, pipeline_stage, orden, color, activa, es_sistema, agrupa_en_reporte_codigo
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pipelinestage ps
  WHERE ps.workspace_id = v.workspace_id
    AND (ps.codigo = v.codigo OR ps.pipeline_stage = v.pipeline_stage)
);

ALTER TABLE public.pipelinestage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipelinestage_select_policy ON public.pipelinestage;
DROP POLICY IF EXISTS pipelinestage_write_policy ON public.pipelinestage;

CREATE POLICY pipelinestage_select_policy
ON public.pipelinestage
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id = auth.uid()::text AND u.active = true
  )
);

CREATE POLICY pipelinestage_write_policy
ON public.pipelinestage
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Preview delete: count consultas in stage
CREATE OR REPLACE FUNCTION public.preview_delete_pipeline_stage(
  p_workspace_id text,
  p_stage_id text
)
RETURNS jsonb
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
  WHERE id = p_stage_id AND workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Etapa no encontrada';
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM public.consulta c
  WHERE c.workspace_id = p_workspace_id
    AND c.pipeline_stage = v_stage.pipeline_stage;

  RETURN jsonb_build_object(
    'consulta_count', v_count,
    'es_sistema', COALESCE(v_stage.es_sistema, false),
    'pipeline_stage', v_stage.pipeline_stage,
    'codigo', v_stage.codigo
  );
END;
$$;

-- Reorder stages by id array
CREATE OR REPLACE FUNCTION public.reorder_pipeline_stages(
  p_workspace_id text,
  p_ordered_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
  v_ord integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    UPDATE public.pipelinestage
    SET orden = v_ord, updated_date = now()
    WHERE id = v_id AND workspace_id = p_workspace_id;
    v_ord := v_ord + 1;
  END LOOP;
END;
$$;

-- Rename visible label and sync consultas
CREATE OR REPLACE FUNCTION public.rename_pipeline_stage(
  p_workspace_id text,
  p_stage_id text,
  p_new_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_name text;
  v_trimmed text := trim(p_new_name);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'Nombre vacío';
  END IF;

  SELECT pipeline_stage INTO v_old_name
  FROM public.pipelinestage
  WHERE id = p_stage_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Etapa no encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pipelinestage
    WHERE workspace_id = p_workspace_id
      AND pipeline_stage = v_trimmed
      AND id <> p_stage_id
  ) THEN
    RAISE EXCEPTION 'Ya existe una etapa con ese nombre';
  END IF;

  UPDATE public.consulta
  SET pipeline_stage = v_trimmed, updated_date = now()
  WHERE workspace_id = p_workspace_id AND pipeline_stage = v_old_name;

  UPDATE public.pipelinestage
  SET pipeline_stage = v_trimmed, updated_date = now()
  WHERE id = p_stage_id;
END;
$$;

-- Reassign consultas then delete stage
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
    IF p_target_stage_name IS NULL OR trim(p_target_stage_name) = '' THEN
      RAISE EXCEPTION 'Hay % consultas en esta etapa', v_count;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.pipelinestage
      WHERE workspace_id = p_workspace_id
        AND pipeline_stage = trim(p_target_stage_name)
        AND activa IS NOT FALSE
    ) THEN
      RAISE EXCEPTION 'Etapa destino no válida';
    END IF;

    UPDATE public.consulta
    SET pipeline_stage = trim(p_target_stage_name), updated_date = now()
    WHERE workspace_id = p_workspace_id AND pipeline_stage = v_stage.pipeline_stage;
  END IF;

  DELETE FROM public.pipelinestage WHERE id = p_stage_id;
END;
$$;

-- fecha_ganado trigger: resolve by codigo instead of hardcoded names
CREATE OR REPLACE FUNCTION public.set_fecha_ganado_on_won_stage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_codigo text;
  v_old_codigo text;
BEGIN
  SELECT ps.codigo INTO v_codigo
  FROM public.pipelinestage ps
  WHERE ps.workspace_id = NEW.workspace_id
    AND ps.pipeline_stage = NEW.pipeline_stage
  LIMIT 1;

  IF v_codigo IS NULL AND NEW.pipeline_stage IN ('GANADA', 'EJECUTADA') THEN
    v_codigo := CASE NEW.pipeline_stage
      WHEN 'GANADA' THEN 'GANADA'
      WHEN 'EJECUTADA' THEN 'EJECUTADA'
      ELSE NULL
    END;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.pipeline_stage IS NOT NULL THEN
    SELECT ps.codigo INTO v_old_codigo
    FROM public.pipelinestage ps
    WHERE ps.workspace_id = OLD.workspace_id
      AND ps.pipeline_stage = OLD.pipeline_stage
    LIMIT 1;

    IF v_old_codigo IS NULL AND OLD.pipeline_stage IN ('GANADA', 'EJECUTADA') THEN
      v_old_codigo := OLD.pipeline_stage;
    END IF;
  END IF;

  IF v_codigo IN ('GANADA', 'EJECUTADA') AND NEW.fecha_ganado IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.fecha_ganado := CURRENT_DATE;
    ELSIF TG_OP = 'UPDATE' THEN
      IF v_old_codigo IS NULL OR v_old_codigo NOT IN ('GANADA', 'EJECUTADA') THEN
        NEW.fecha_ganado := CURRENT_DATE;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Realtime (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pipelinestage;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
