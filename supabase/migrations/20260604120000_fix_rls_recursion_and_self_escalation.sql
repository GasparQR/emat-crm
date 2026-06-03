-- Fix de dos problemas de la migración 20260602111000_rls_and_reassign.sql:
--
--  #2 Recursión infinita en RLS de public.usuario:
--     usuario_select_policy llama a public.is_admin(), que es SECURITY INVOKER y
--     a su vez hace SELECT sobre public.usuario → se vuelve a aplicar la misma
--     política → Postgres reporta "infinite recursion" en auth.me()/listUsuarios().
--     Los helpers que leen usuario pasan a SECURITY DEFINER con search_path fijo
--     para leer la fila real sin re-evaluar RLS.
--
--  #3 Escalada de privilegios self-service:
--     usuario_update_policy permitía el auto-update (id = auth.uid()) sin
--     restringir columnas, por lo que cualquier usuario podía ponerse
--     role='ADMIN', active=true o can_view_other_advisors=true. El nuevo
--     WITH CHECK obliga a que un no-admin conserve esas columnas tal como están
--     en la BD; solo puede editar campos de perfil seguros (full_name, ajustes
--     de consulta, etc.).

-- ── #2: helpers que leen public.usuario → SECURITY DEFINER ──────────────────
CREATE OR REPLACE FUNCTION public.current_usuario()
RETURNS public.usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
SECURITY DEFINER
SET search_path = public
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
SECURITY DEFINER
SET search_path = public
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
SECURITY DEFINER
SET search_path = public
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
SECURITY DEFINER
SET search_path = public
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

-- ── #3: bloquear escalada de privilegios en el auto-update ──────────────────
DROP POLICY IF EXISTS usuario_update_policy ON public.usuario;

CREATE POLICY usuario_update_policy
ON public.usuario
FOR UPDATE
USING (public.is_admin() OR id = auth.uid()::text)
WITH CHECK (
  public.is_admin()
  OR (
    id = auth.uid()::text
    -- Un no-admin no puede modificar sus columnas privilegiadas: deben quedar
    -- iguales a las almacenadas (current_usuario() las lee como DEFINER).
    AND role = (public.current_usuario()).role
    AND active = (public.current_usuario()).active
    AND can_view_other_advisors = (public.current_usuario()).can_view_other_advisors
    AND asesor_codigo IS NOT DISTINCT FROM (public.current_usuario()).asesor_codigo
  )
);
