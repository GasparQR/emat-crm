-- Restaura la política DELETE en public.consulta.
--
-- Problema: la tabla consulta tiene RLS habilitado pero NO existe ninguna
-- política FOR DELETE (la migración 20260617 recreó select/insert/update y la
-- política consulta_delete_policy quedó eliminada del esquema en producción).
-- Con RLS activo y sin política permisiva de DELETE, Postgres bloquea TODOS los
-- borrados: el DELETE afecta 0 filas y el wrapper de datos lanza
-- "No tenés permiso para modificar este registro...". Esto afectaba incluso al
-- usuario ADMIN al intentar eliminar un presupuesto.
--
-- Solución: crear consulta_delete_policy usando el mismo helper de visibilidad
-- que select/update, de modo que ADMIN pueda borrar cualquier presupuesto y un
-- ASESOR pueda borrar los presupuestos que tiene permitido ver (coherente con la
-- UI, que muestra "Eliminar" a todos los roles excepto LOGISTICA).

DROP POLICY IF EXISTS consulta_delete_policy ON public.consulta;

CREATE POLICY consulta_delete_policy
ON public.consulta
FOR DELETE
USING (public.consulta_visible_to_current_user(consulta));
