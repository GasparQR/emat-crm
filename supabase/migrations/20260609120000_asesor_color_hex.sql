-- Color de avatar por asesor (configurable desde Ajustes → Asesores).

ALTER TABLE public.asesor
  ADD COLUMN IF NOT EXISTS color_hex text;

COMMENT ON COLUMN public.asesor.color_hex IS
  'Color hex de la paleta CRM para avatares con iniciales; NULL usa hash por codigo en la app.';
