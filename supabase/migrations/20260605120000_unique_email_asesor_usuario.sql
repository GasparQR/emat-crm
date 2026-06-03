-- Email único en catálogo asesor y perfiles usuario (case-insensitive, ignora vacíos).

CREATE UNIQUE INDEX IF NOT EXISTS asesor_email_unique_idx
  ON public.asesor (lower(trim(email)))
  WHERE email IS NOT NULL AND trim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_unique_idx
  ON public.usuario (lower(trim(email)))
  WHERE email IS NOT NULL AND trim(email) <> '';
