-- Solo diagnóstico: duplicados viejos de nroppto (no hace falta corregirlos para la migración).
-- La numeración nueva usa allocate_consulta_nroppto y sigue por encima del MAX(nroppto) actual.

SELECT workspace_id, nroppto, count(*) AS cnt, array_agg(id ORDER BY created_date) AS ids
FROM public.consulta
WHERE nroppto IS NOT NULL
GROUP BY workspace_id, nroppto
HAVING count(*) > 1
ORDER BY workspace_id, nroppto;

-- Si en el futuro quisieras unicidad estricta, habría que renumerar duplicados antes de:
-- CREATE UNIQUE INDEX consulta_workspace_nroppto_unique ON public.consulta (workspace_id, nroppto)
-- WHERE nroppto IS NOT NULL;
