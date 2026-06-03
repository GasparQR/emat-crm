-- Normalizar consulta/contacto: asesor = codigo del catálogo y firmaasesor desde asesor.firma

UPDATE public.consulta c
SET asesor = a.codigo, updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) <> ''
  AND upper(trim(c.asesor)) <> upper(trim(a.codigo))
  AND (
    upper(trim(c.asesor)) = upper(trim(a.nombre))
    OR upper(trim(c.asesor)) = upper(trim(a.codigo))
  );

UPDATE public.consulta c
SET asesor = a.codigo, updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) = ''
  AND trim(coalesce(c.firmaasesor, '')) <> ''
  AND (
    upper(trim(c.firmaasesor)) = upper(trim(a.nombre))
    OR upper(trim(c.firmaasesor)) = upper(trim(coalesce(a.firma, '')))
  );

UPDATE public.consulta c
SET firmaasesor = trim(a.firma), updated_date = now()
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

UPDATE public.contacto c
SET asesor = a.codigo, updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) <> ''
  AND upper(trim(c.asesor)) <> upper(trim(a.codigo))
  AND (
    upper(trim(c.asesor)) = upper(trim(a.nombre))
    OR upper(trim(c.asesor)) = upper(trim(a.codigo))
  );

UPDATE public.contacto c
SET asesor = a.codigo, updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) = ''
  AND EXISTS (
    SELECT 1 FROM public.consulta q
    WHERE q.workspace_id = c.workspace_id
      AND q.contactonombre = c.nombre
      AND q.asesor = a.codigo
  );
