-- Admin: todas las firmas; ASESOR: leer y actualizar solo su fila del catálogo.

DROP POLICY IF EXISTS asesor_select_policy ON public.asesor;
DROP POLICY IF EXISTS asesor_write_policy ON public.asesor;
DROP POLICY IF EXISTS asesor_update_own_firma_policy ON public.asesor;
DROP POLICY IF EXISTS asesor_insert_admin_policy ON public.asesor;
DROP POLICY IF EXISTS asesor_delete_admin_policy ON public.asesor;

CREATE POLICY asesor_select_policy
ON public.asesor
FOR SELECT
USING (
  public.can_view_all_advisors()
  OR public.is_logistica()
  OR public.asesor_codigo_visible(codigo)
);

CREATE POLICY asesor_insert_admin_policy
ON public.asesor
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY asesor_update_policy
ON public.asesor
FOR UPDATE
USING (
  public.is_admin()
  OR (
    (SELECT u.role FROM public.current_usuario() u) = 'ASESOR'
    AND codigo = (SELECT u.asesor_codigo FROM public.current_usuario() u)
  )
)
WITH CHECK (
  public.is_admin()
  OR codigo = (SELECT u.asesor_codigo FROM public.current_usuario() u)
);

CREATE POLICY asesor_delete_admin_policy
ON public.asesor
FOR DELETE
USING (public.is_admin());
