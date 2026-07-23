-- Restringe la política DELETE de public.consulta para excluir a LOGÍSTICA.
--
-- Problema: la migración 20260623120000_consulta_delete_policy_restore.sql creó
-- consulta_delete_policy reusando consulta_visible_to_current_user(), que habilita
-- a LOGÍSTICA sobre las consultas en etapa GANADA/EJECUTADA. La UI esconde el botón
-- "Eliminar" para ese rol (src/pages/Consultas.jsx), pero eso no es una barrera:
-- un usuario LOGÍSTICA con su propio token puede hacer un DELETE directo al endpoint
-- REST y borrar justamente los presupuestos ganados o ejecutados.
--
-- Solución: mantener el helper de visibilidad como base y agregar la exclusión de
-- LOGÍSTICA, replicando en SQL el criterio de canEditConsultaStage() en
-- src/lib/permissions.js. Coherente con consulta_update_policy, que ya cerró la
-- escritura para LOGÍSTICA vía WITH CHECK.
--
-- Además se agrega TO authenticated: sin esa cláusula la política aplica también al
-- rol anon. No era explotable (el helper exige un auth.uid() activo), pero evita
-- ejecutar una función SECURITY DEFINER en peticiones anónimas.

CREATE OR REPLACE FUNCTION public.current_user_can_delete_consulta()
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
      AND u.role <> 'LOGISTICA'
  );
$$;

DROP POLICY IF EXISTS consulta_delete_policy ON public.consulta;

CREATE POLICY consulta_delete_policy
ON public.consulta
FOR DELETE
TO authenticated
USING (
  public.consulta_visible_to_current_user(consulta)
  AND public.current_user_can_delete_consulta()
);
