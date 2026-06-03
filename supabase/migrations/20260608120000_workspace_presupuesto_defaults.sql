-- Defaults globales de presupuesto por workspace (solo admin escribe).

CREATE TABLE IF NOT EXISTS public.workspace_settings (
  workspace_id text PRIMARY KEY,
  consulta_default_condiciones_comerciales text NOT NULL DEFAULT '',
  consulta_default_observaciones text NOT NULL DEFAULT '',
  updated_date timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.workspace_settings (workspace_id)
VALUES ('local')
ON CONFLICT (workspace_id) DO NOTHING;

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_settings_select_policy ON public.workspace_settings;
DROP POLICY IF EXISTS workspace_settings_write_policy ON public.workspace_settings;

CREATE POLICY workspace_settings_select_policy
ON public.workspace_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY workspace_settings_write_policy
ON public.workspace_settings
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
