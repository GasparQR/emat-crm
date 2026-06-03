-- Helpers de RLS + políticas por rol + RPC de reasignación con auditoría.

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.current_usuario()
RETURNS public.usuario
LANGUAGE sql
STABLE
AS $$
  SELECT u.*
  FROM public.usuario u
  WHERE u.id = auth.uid()::text
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.role = 'ADMIN'
      AND u.active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_logistica()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.role = 'LOGISTICA'
      AND u.active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_all_advisors()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND u.can_view_other_advisors = true)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.asesor_codigo_visible(codigo text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = codigo))
        OR (u.role = 'LOGISTICA' AND codigo IS NOT NULL)
      )
  );
$$;

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asesor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuario_select_policy ON public.usuario;
DROP POLICY IF EXISTS usuario_insert_policy ON public.usuario;
DROP POLICY IF EXISTS usuario_update_policy ON public.usuario;

CREATE POLICY usuario_select_policy
ON public.usuario
FOR SELECT
USING (
  public.is_admin()
  OR (id = auth.uid()::text AND active = true)
);

CREATE POLICY usuario_insert_policy
ON public.usuario
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY usuario_update_policy
ON public.usuario
FOR UPDATE
USING (public.is_admin() OR id = auth.uid()::text)
WITH CHECK (public.is_admin() OR id = auth.uid()::text);

DROP POLICY IF EXISTS asesor_select_policy ON public.asesor;
DROP POLICY IF EXISTS asesor_write_policy ON public.asesor;

CREATE POLICY asesor_select_policy
ON public.asesor
FOR SELECT
USING (public.can_view_all_advisors() OR public.is_logistica());

CREATE POLICY asesor_write_policy
ON public.asesor
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS consulta_select_policy ON public.consulta;
DROP POLICY IF EXISTS consulta_insert_policy ON public.consulta;
DROP POLICY IF EXISTS consulta_update_policy ON public.consulta;
DROP POLICY IF EXISTS consulta_delete_policy ON public.consulta;

CREATE POLICY consulta_select_policy
ON public.consulta
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = consulta.asesor))
        OR (u.role = 'LOGISTICA' AND consulta.pipeline_stage IN ('GANADA', 'EJECUTADA'))
      )
  )
);

CREATE POLICY consulta_insert_policy
ON public.consulta
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = consulta.asesor))
      )
  )
);

CREATE POLICY consulta_update_policy
ON public.consulta
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = consulta.asesor))
        OR (u.role = 'LOGISTICA' AND consulta.pipeline_stage IN ('GANADA', 'EJECUTADA'))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = consulta.asesor))
      )
  )
);

CREATE POLICY consulta_delete_policy
ON public.consulta
FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS contacto_select_policy ON public.contacto;
DROP POLICY IF EXISTS contacto_insert_policy ON public.contacto;
DROP POLICY IF EXISTS contacto_update_policy ON public.contacto;
DROP POLICY IF EXISTS contacto_delete_policy ON public.contacto;

CREATE POLICY contacto_select_policy
ON public.contacto
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = contacto.asesor))
        OR u.role = 'LOGISTICA'
      )
  )
);

CREATE POLICY contacto_insert_policy
ON public.contacto
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = contacto.asesor))
      )
  )
);

CREATE POLICY contacto_update_policy
ON public.contacto
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = contacto.asesor))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
      AND (
        u.role = 'ADMIN'
        OR (u.role = 'ASESOR' AND (u.can_view_other_advisors = true OR u.asesor_codigo = contacto.asesor))
      )
  )
);

CREATE POLICY contacto_delete_policy
ON public.contacto
FOR DELETE
USING (public.is_admin());

-- Auditoría de reasignación.
CREATE TABLE IF NOT EXISTS public.cartera_reasignacion_log (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  from_codigo text NOT NULL,
  to_codigo text NOT NULL,
  contactos_count integer NOT NULL DEFAULT 0,
  consultas_count integer NOT NULL DEFAULT 0,
  performed_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cartera_reasignacion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cartera_reasignacion_log_select_policy ON public.cartera_reasignacion_log;
DROP POLICY IF EXISTS cartera_reasignacion_log_insert_policy ON public.cartera_reasignacion_log;

CREATE POLICY cartera_reasignacion_log_select_policy
ON public.cartera_reasignacion_log
FOR SELECT
USING (public.is_admin());

CREATE POLICY cartera_reasignacion_log_insert_policy
ON public.cartera_reasignacion_log
FOR INSERT
WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.preview_reassign_cartera(
  p_workspace_id text,
  p_from_codigo text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'contactos', (SELECT count(*) FROM public.contacto WHERE workspace_id = p_workspace_id AND asesor = p_from_codigo),
    'consultas', (SELECT count(*) FROM public.consulta WHERE workspace_id = p_workspace_id AND asesor = p_from_codigo)
  );
$$;

CREATE OR REPLACE FUNCTION public.reassign_cartera(
  p_workspace_id text,
  p_from_codigo text,
  p_to_codigo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contactos integer := 0;
  v_consultas integer := 0;
  v_log_id text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_from_codigo IS NULL OR p_to_codigo IS NULL OR p_from_codigo = p_to_codigo THEN
    RAISE EXCEPTION 'Parámetros inválidos';
  END IF;

  UPDATE public.contacto
  SET asesor = p_to_codigo,
      updated_date = now()
  WHERE workspace_id = p_workspace_id
    AND asesor = p_from_codigo;
  GET DIAGNOSTICS v_contactos = ROW_COUNT;

  UPDATE public.consulta
  SET asesor = p_to_codigo,
      updated_date = now()
  WHERE workspace_id = p_workspace_id
    AND asesor = p_from_codigo;
  GET DIAGNOSTICS v_consultas = ROW_COUNT;

  v_log_id := 'reassign_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8);

  INSERT INTO public.cartera_reasignacion_log (
    id,
    workspace_id,
    from_codigo,
    to_codigo,
    contactos_count,
    consultas_count,
    performed_by
  ) VALUES (
    v_log_id,
    p_workspace_id,
    p_from_codigo,
    p_to_codigo,
    v_contactos,
    v_consultas,
    auth.uid()::text
  );

  RETURN jsonb_build_object(
    'contactos_updated', v_contactos,
    'consultas_updated', v_consultas
  );
END;
$$;
