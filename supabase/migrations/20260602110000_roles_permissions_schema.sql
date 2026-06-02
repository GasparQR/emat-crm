-- Roles y permisos base para CRM

-- 1) Tabla asesor (catálogo fuente)
CREATE TABLE IF NOT EXISTS public.asesor (
  id text PRIMARY KEY,
  workspace_id text NOT NULL DEFAULT 'local',
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  email text,
  firma text,
  active boolean NOT NULL DEFAULT true,
  auth_user_id text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

-- Seed básico para mantener compatibilidad con datos actuales.
INSERT INTO public.asesor (id, workspace_id, codigo, nombre, active)
VALUES
  ('asesor_local_andres', 'local', 'ANDRES', 'ANDRES', true),
  ('asesor_local_tristan', 'local', 'TRISTAN', 'TRISTAN', true),
  ('asesor_local_valentina', 'local', 'VALENTINA', 'VALENTINA', true),
  ('asesor_local_rocio', 'local', 'ROCIO', 'ROCIO', true),
  ('asesor_local_julian', 'local', 'JULIAN', 'JULIAN', true),
  ('asesor_local_pablo', 'local', 'PABLO', 'PABLO', true),
  ('asesor_local_esteban', 'local', 'ESTEBAN', 'ESTEBAN', true),
  ('asesor_local_maca', 'local', 'MACA', 'MACA', true),
  ('asesor_local_mirta_lopez', 'local', 'MIRTA LOPEZ', 'MIRTA LOPEZ', true)
ON CONFLICT (codigo) DO NOTHING;

-- 2) Extensión de usuario para roles y permisos.
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS can_view_other_advisors boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS asesor_codigo text,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

-- Normalización de roles legacy.
UPDATE public.usuario
SET role = CASE
  WHEN lower(role) = 'admin' THEN 'ADMIN'
  WHEN lower(role) = 'logistica' THEN 'LOGISTICA'
  WHEN lower(role) = 'asesor' THEN 'ASESOR'
  ELSE 'ASESOR'
END
WHERE role IS NOT NULL;

ALTER TABLE public.usuario
  ALTER COLUMN role SET DEFAULT 'ASESOR';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuario_role_check'
      AND conrelid = 'public.usuario'::regclass
  ) THEN
    ALTER TABLE public.usuario
      ADD CONSTRAINT usuario_role_check
      CHECK (role IN ('ADMIN', 'ASESOR', 'LOGISTICA'));
  END IF;
END $$;

-- Regla explícita asesor_codigo por rol.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuario_role_asesor_codigo_check'
      AND conrelid = 'public.usuario'::regclass
  ) THEN
    ALTER TABLE public.usuario
      ADD CONSTRAINT usuario_role_asesor_codigo_check
      CHECK (
        (role = 'ASESOR' AND asesor_codigo IS NOT NULL)
        OR (role IN ('ADMIN', 'LOGISTICA') AND asesor_codigo IS NULL)
      );
  END IF;
END $$;

-- Asegurar asesor_codigo para usuarios asesores existentes.
UPDATE public.usuario u
SET asesor_codigo = COALESCE(
  u.asesor_codigo,
  (SELECT a.codigo FROM public.asesor a WHERE a.email = u.email LIMIT 1),
  upper(split_part(u.full_name, ' ', 1))
)
WHERE u.role = 'ASESOR'
  AND u.asesor_codigo IS NULL;

-- Crear códigos faltantes en catálogo asesor para usuarios asesores existentes.
INSERT INTO public.asesor (id, workspace_id, codigo, nombre, email, active)
SELECT
  'asesor_local_' || md5(u.id),
  COALESCE(u.workspace_id, 'local'),
  u.asesor_codigo,
  COALESCE(NULLIF(u.full_name, ''), u.asesor_codigo),
  u.email,
  u.active
FROM public.usuario u
LEFT JOIN public.asesor a ON a.codigo = u.asesor_codigo
WHERE u.role = 'ASESOR'
  AND u.asesor_codigo IS NOT NULL
  AND a.codigo IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuario_asesor_codigo_fkey'
      AND conrelid = 'public.usuario'::regclass
  ) THEN
    ALTER TABLE public.usuario
      ADD CONSTRAINT usuario_asesor_codigo_fkey
      FOREIGN KEY (asesor_codigo) REFERENCES public.asesor(codigo);
  END IF;
END $$;

-- Índices.
CREATE INDEX IF NOT EXISTS idx_usuario_role ON public.usuario(role);
CREATE INDEX IF NOT EXISTS idx_usuario_active ON public.usuario(active);
CREATE INDEX IF NOT EXISTS idx_usuario_asesor_codigo ON public.usuario(asesor_codigo) WHERE asesor_codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consulta_asesor ON public.consulta(asesor);
CREATE INDEX IF NOT EXISTS idx_contacto_asesor ON public.contacto(asesor);

-- Actualizar trigger de alta para roles nuevos.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_role text;
  generated_codigo text;
BEGIN
  normalized_role := upper(COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'ASESOR'));
  IF normalized_role NOT IN ('ADMIN', 'ASESOR', 'LOGISTICA') THEN
    normalized_role := 'ASESOR';
  END IF;

  generated_codigo := upper(split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1));

  INSERT INTO public.usuario (
    id,
    workspace_id,
    full_name,
    email,
    role,
    asesor_codigo,
    can_view_other_advisors,
    active,
    consulta_follow_up_days,
    consulta_default_condiciones_comerciales,
    consulta_default_observaciones,
    consulta_firmas_asesor,
    created_date,
    updated_date
  )
  VALUES (
    NEW.id::text,
    'local',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    normalized_role,
    CASE WHEN normalized_role = 'ASESOR' THEN generated_codigo ELSE NULL END,
    false,
    true,
    3,
    '',
    '',
    '{}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    asesor_codigo = EXCLUDED.asesor_codigo,
    updated_date = NOW();

  IF normalized_role = 'ASESOR' THEN
    INSERT INTO public.asesor (id, workspace_id, codigo, nombre, email, active)
    VALUES (
      'asesor_local_' || md5(NEW.id::text),
      'local',
      generated_codigo,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      true
    )
    ON CONFLICT (codigo) DO UPDATE
      SET email = EXCLUDED.email, nombre = EXCLUDED.nombre, updated_date = now();
  END IF;

  RETURN NEW;
END;
$$;
