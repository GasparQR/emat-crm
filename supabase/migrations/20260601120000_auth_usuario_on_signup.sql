-- Perfil CRM al dar de alta un usuario en Supabase Auth (panel/API admin; sin signup público).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuario (
    id,
    workspace_id,
    full_name,
    email,
    role,
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
    COALESCE(NEW.raw_app_meta_data->>'role', 'admin'),
    3,
    '',
    '',
    '{}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, public.usuario.role),
    updated_date = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
