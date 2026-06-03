-- Pegar y ejecutar en Supabase → SQL Editor (una sola vez).
-- Mismo contenido que supabase/migrations/20260603120000_fix_auth_user_trigger.sql

-- Fix: trigger insertaba usuario antes que asesor → FK fallaba → "Database error creating new user"

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_role text;
  resolved_codigo text;
  display_name text;
BEGIN
  normalized_role := upper(COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'ASESOR'));
  IF normalized_role NOT IN ('ADMIN', 'ASESOR', 'LOGISTICA') THEN
    normalized_role := 'ASESOR';
  END IF;

  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  resolved_codigo := upper(COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'asesor_codigo'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'asesorCode'), ''),
    split_part(display_name, ' ', 1)
  ));

  IF normalized_role = 'ASESOR' THEN
    INSERT INTO public.asesor (id, workspace_id, codigo, nombre, email, active)
    VALUES (
      'asesor_local_' || md5(NEW.id::text),
      'local',
      resolved_codigo,
      display_name,
      NEW.email,
      true
    )
    ON CONFLICT (codigo) DO UPDATE
      SET email = EXCLUDED.email,
          nombre = EXCLUDED.nombre,
          updated_date = now();
  END IF;

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
    display_name,
    NEW.email,
    normalized_role,
    CASE WHEN normalized_role = 'ASESOR' THEN resolved_codigo ELSE NULL END,
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
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    asesor_codigo = EXCLUDED.asesor_codigo,
    updated_date = NOW();

  RETURN NEW;
END;
$$;
