-- RLS consulta: comparación case-insensitive de asesor + helper centralizado.
-- Corrige PGRST116 (UPDATE devuelve 0 filas) cuando usuario.asesor_codigo y consulta.asesor
-- difieren solo en mayúsculas/espacios, y cierra WITH CHECK para LOGISTICA en etapas ganadas.

CREATE OR REPLACE FUNCTION public.consulta_visible_to_current_user(c public.consulta)
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
        OR (
          u.role = 'ASESOR'
          AND (
            u.can_view_other_advisors = true
            OR upper(trim(coalesce(u.asesor_codigo, ''))) = upper(trim(coalesce(c.asesor, '')))
          )
        )
        OR (
          u.role = 'LOGISTICA'
          AND c.pipeline_stage IN ('GANADA', 'EJECUTADA')
        )
      )
  );
$$;

DROP POLICY IF EXISTS consulta_select_policy ON public.consulta;
DROP POLICY IF EXISTS consulta_insert_policy ON public.consulta;
DROP POLICY IF EXISTS consulta_update_policy ON public.consulta;

CREATE POLICY consulta_select_policy
ON public.consulta
FOR SELECT
USING (public.consulta_visible_to_current_user(consulta));

CREATE POLICY consulta_insert_policy
ON public.consulta
FOR INSERT
WITH CHECK (public.consulta_visible_to_current_user(consulta));

CREATE POLICY consulta_update_policy
ON public.consulta
FOR UPDATE
USING (public.consulta_visible_to_current_user(consulta))
WITH CHECK (public.consulta_visible_to_current_user(consulta));
