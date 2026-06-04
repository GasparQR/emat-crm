-- Default de IVA para presupuestos nuevos (solo workspace_settings, sin tocar consulta).

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS consulta_default_iva numeric NOT NULL DEFAULT 21;
