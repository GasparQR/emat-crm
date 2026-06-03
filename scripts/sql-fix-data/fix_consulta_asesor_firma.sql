-- Corregir presupuestos/contactos con asesor en formato antiguo (nombre) o vacío,
-- y firmaasesor vacía o igual al nombre/código.
--
-- Ejecutar en Supabase SQL Editor (workspace 'local' o el que uses).
-- 1) Revisar los SELECT de diagnóstico.
-- 2) Ejecutar el bloque BEGIN…COMMIT si los conteos son los esperados.

-- ─── Diagnóstico: consultas con asesor distinto del catálogo ───
SELECT
  c.id,
  c.nroppto,
  c.contactonombre,
  c.asesor AS asesor_actual,
  c.firmaasesor,
  a.codigo AS codigo_catalogo,
  a.nombre AS nombre_catalogo,
  a.firma AS firma_catalogo
FROM public.consulta c
LEFT JOIN public.asesor a
  ON a.workspace_id = c.workspace_id
  AND (
    upper(trim(c.asesor)) = upper(trim(a.codigo))
    OR upper(trim(c.asesor)) = upper(trim(a.nombre))
    OR (
      trim(coalesce(c.asesor, '')) = ''
      AND trim(coalesce(c.firmaasesor, '')) <> ''
      AND (
        upper(trim(c.firmaasesor)) = upper(trim(a.nombre))
        OR upper(trim(c.firmaasesor)) = upper(trim(a.firma))
      )
    )
  )
WHERE trim(coalesce(c.asesor, '')) = ''
   OR c.asesor IS DISTINCT FROM a.codigo
   OR trim(coalesce(c.firmaasesor, '')) = ''
   OR upper(trim(coalesce(c.firmaasesor, ''))) = upper(trim(c.asesor))
   OR upper(trim(coalesce(c.firmaasesor, ''))) = upper(trim(a.nombre))
ORDER BY c.created_date DESC NULLS LAST
LIMIT 200;

-- ─── Diagnóstico: contactos ───
SELECT
  c.id,
  c.nombre,
  c.asesor AS asesor_actual,
  a.codigo AS codigo_catalogo,
  a.nombre AS nombre_catalogo
FROM public.contacto c
LEFT JOIN public.asesor a
  ON a.workspace_id = c.workspace_id
  AND (
    upper(trim(c.asesor)) = upper(trim(a.codigo))
    OR upper(trim(c.asesor)) = upper(trim(a.nombre))
  )
WHERE trim(coalesce(c.asesor, '')) = ''
   OR c.asesor IS DISTINCT FROM a.codigo
ORDER BY c.updated_date DESC NULLS LAST
LIMIT 100;

-- ─── Corrección (transacción) ───
BEGIN;

-- 0) Asegurar columna asesor_id (si aún no existe)
ALTER TABLE public.consulta ADD COLUMN IF NOT EXISTS asesor_id text;

-- 1) consulta.asesor: nombre antiguo → codigo del catálogo + asesor_id
UPDATE public.consulta c
SET
  asesor = a.codigo,
  asesor_id = a.id,
  updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) <> ''
  AND upper(trim(c.asesor)) <> upper(trim(a.codigo))
  AND (
    upper(trim(c.asesor)) = upper(trim(a.nombre))
    OR upper(trim(c.asesor)) = upper(trim(a.codigo))
  );

-- 2) consulta.asesor vacío: inferir por firmaasesor = nombre o texto de firma del catálogo
UPDATE public.consulta c
SET
  asesor = a.codigo,
  asesor_id = a.id,
  updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) = ''
  AND trim(coalesce(c.firmaasesor, '')) <> ''
  AND (
    upper(trim(c.firmaasesor)) = upper(trim(a.nombre))
    OR upper(trim(c.firmaasesor)) = upper(trim(coalesce(a.firma, '')))
  );

-- 3) consulta.firmaasesor desde catálogo (cuando falta o es copia del nombre/código)
UPDATE public.consulta c
SET
  firmaasesor = trim(a.firma),
  updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND c.asesor = a.codigo
  AND nullif(trim(a.firma), '') IS NOT NULL
  AND (
    c.firmaasesor IS NULL
    OR trim(c.firmaasesor) = ''
    OR upper(trim(c.firmaasesor)) = upper(trim(c.asesor))
    OR upper(trim(c.firmaasesor)) = upper(trim(a.nombre))
    OR upper(trim(c.firmaasesor)) = upper(trim(a.codigo))
  );

-- 4) contacto.asesor: mismo criterio nombre → codigo (+ asesor_id si existe la columna)
ALTER TABLE public.contacto ADD COLUMN IF NOT EXISTS asesor_id text;

UPDATE public.contacto c
SET
  asesor = a.codigo,
  asesor_id = a.id,
  updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) <> ''
  AND upper(trim(c.asesor)) <> upper(trim(a.codigo))
  AND (
    upper(trim(c.asesor)) = upper(trim(a.nombre))
    OR upper(trim(c.asesor)) = upper(trim(a.codigo))
  );

UPDATE public.contacto c
SET
  asesor = a.codigo,
  asesor_id = a.id,
  updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) = ''
  AND EXISTS (
    SELECT 1
    FROM public.consulta q
    WHERE q.workspace_id = c.workspace_id
      AND q.contactonombre = c.nombre
      AND q.asesor = a.codigo
  );

COMMIT;

-- ─── Verificación post-fix ───
SELECT
  count(*) FILTER (WHERE trim(coalesce(asesor, '')) = '') AS sin_asesor,
  count(*) FILTER (WHERE trim(coalesce(asesor_id, '')) = '') AS sin_asesor_id,
  count(*) FILTER (WHERE trim(coalesce(firmaasesor, '')) = '') AS sin_firma,
  count(*) FILTER (
    WHERE trim(coalesce(asesor, '')) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.asesor a
        WHERE a.workspace_id = consulta.workspace_id
          AND a.codigo = consulta.asesor
      )
  ) AS asesor_sin_catalogo
FROM public.consulta;

-- Filas que siguen mal (revisar manualmente; ajustar CASE o UPDATE puntual)
SELECT id, nroppto, contactonombre, asesor, asesor_id, firmaasesor, created_date
FROM public.consulta
WHERE trim(coalesce(asesor, '')) = ''
   OR trim(coalesce(asesor_id, '')) = ''
   OR trim(coalesce(firmaasesor, '')) = ''
   OR NOT EXISTS (
     SELECT 1 FROM public.asesor a
     WHERE a.workspace_id = consulta.workspace_id AND a.codigo = consulta.asesor
   )
ORDER BY created_date DESC NULLS LAST
LIMIT 50;
