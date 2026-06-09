-- Workspace-wide view layout (columns/filters) and frequent cities for Contactos

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS view_layout_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS frequent_cities text[] NOT NULL DEFAULT '{}'::text[];
