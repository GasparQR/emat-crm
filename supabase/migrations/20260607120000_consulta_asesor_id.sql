-- consulta.asesor_id → asesor.id (paridad con producción + backfill)

ALTER TABLE public.consulta
  ADD COLUMN IF NOT EXISTS asesor_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consulta_asesor_id_fkey'
  ) THEN
    ALTER TABLE public.consulta
      ADD CONSTRAINT consulta_asesor_id_fkey
      FOREIGN KEY (asesor_id) REFERENCES public.asesor(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consulta_asesor_id ON public.consulta(asesor_id)
  WHERE asesor_id IS NOT NULL;

UPDATE public.consulta c
SET
  asesor_id = a.id,
  asesor = a.codigo,
  updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) <> ''
  AND (
    upper(trim(c.asesor)) = upper(trim(a.codigo))
    OR upper(trim(c.asesor)) = upper(trim(a.nombre))
    OR c.asesor_id = a.id
  )
  AND (c.asesor_id IS DISTINCT FROM a.id OR c.asesor IS DISTINCT FROM a.codigo);

UPDATE public.consulta c
SET
  asesor_id = a.id,
  asesor = a.codigo,
  updated_date = now()
FROM public.asesor a
WHERE a.workspace_id = c.workspace_id
  AND trim(coalesce(c.asesor, '')) = ''
  AND trim(coalesce(c.firmaasesor, '')) <> ''
  AND (
    upper(trim(c.firmaasesor)) = upper(trim(a.nombre))
    OR upper(trim(c.firmaasesor)) = upper(trim(coalesce(a.firma, '')))
  );

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
