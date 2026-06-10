-- URLs de redes en pie de PDF de presupuesto (config admin por workspace).

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS pdf_footer_instagram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pdf_footer_website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pdf_footer_linkedin text NOT NULL DEFAULT '';
