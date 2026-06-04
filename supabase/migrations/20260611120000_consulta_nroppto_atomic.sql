-- Numeración atómica de nroppto por workspace.
-- No se crea índice UNIQUE: pueden coexistir duplicados históricos; los números nuevos
-- salen del contador y no repiten el max existente (incluye duplicados viejos).

CREATE TABLE IF NOT EXISTS public.consulta_nroppto_counter (
  workspace_id text PRIMARY KEY,
  last_nroppto integer NOT NULL DEFAULT 0
);

ALTER TABLE public.consulta_nroppto_counter ENABLE ROW LEVEL SECURITY;

-- Sin políticas: solo la función SECURITY DEFINER escribe/lee el contador.

INSERT INTO public.consulta_nroppto_counter (workspace_id, last_nroppto)
SELECT workspace_id, COALESCE(MAX(nroppto), 0)
FROM public.consulta
WHERE nroppto IS NOT NULL
GROUP BY workspace_id
ON CONFLICT (workspace_id) DO UPDATE
SET last_nroppto = GREATEST(
  consulta_nroppto_counter.last_nroppto,
  EXCLUDED.last_nroppto
);

INSERT INTO public.consulta_nroppto_counter (workspace_id, last_nroppto)
VALUES ('local', 0)
ON CONFLICT (workspace_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.allocate_consulta_nroppto(p_workspace_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_workspace_id IS NULL OR btrim(p_workspace_id) = '' THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  INSERT INTO public.consulta_nroppto_counter (workspace_id, last_nroppto)
  SELECT p_workspace_id, COALESCE(MAX(q.nroppto), 0)
  FROM public.consulta q
  WHERE q.workspace_id = p_workspace_id
    AND q.nroppto IS NOT NULL
  ON CONFLICT (workspace_id) DO NOTHING;

  UPDATE public.consulta_nroppto_counter
  SET last_nroppto = last_nroppto + 1
  WHERE workspace_id = p_workspace_id
  RETURNING last_nroppto INTO v_next;

  IF NOT FOUND THEN
    INSERT INTO public.consulta_nroppto_counter (workspace_id, last_nroppto)
    VALUES (p_workspace_id, 1)
    RETURNING last_nroppto INTO v_next;
  END IF;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_consulta_nroppto(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_consulta_nroppto(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.peek_next_consulta_nroppto(p_workspace_id text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter integer;
  v_max_consulta integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_workspace_id IS NULL OR btrim(p_workspace_id) = '' THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  SELECT c.last_nroppto INTO v_counter
  FROM public.consulta_nroppto_counter c
  WHERE c.workspace_id = p_workspace_id;

  SELECT COALESCE(MAX(q.nroppto), 0) INTO v_max_consulta
  FROM public.consulta q
  WHERE q.workspace_id = p_workspace_id
    AND q.nroppto IS NOT NULL;

  RETURN GREATEST(COALESCE(v_counter, 0), v_max_consulta) + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.peek_next_consulta_nroppto(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_next_consulta_nroppto(text) TO authenticated;
