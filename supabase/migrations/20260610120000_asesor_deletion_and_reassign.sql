-- Preview eliminación de asesor + reasignación de cartera con asesor_id y firmaasesor.

ALTER TABLE public.contacto
  ADD COLUMN IF NOT EXISTS asesor_id text;

CREATE OR REPLACE FUNCTION public.preview_asesor_deletion(
  p_workspace_id text,
  p_asesor_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text;
  v_nombre text;
  v_contactos integer;
  v_consultas integer;
  v_usuarios integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT a.codigo, a.nombre
  INTO v_codigo, v_nombre
  FROM public.asesor a
  WHERE a.id = p_asesor_id
    AND a.workspace_id = p_workspace_id;

  IF v_codigo IS NULL THEN
    RAISE EXCEPTION 'Asesor no encontrado';
  END IF;

  SELECT count(*)::integer INTO v_contactos
  FROM public.contacto c
  WHERE c.workspace_id = p_workspace_id
    AND (c.asesor = v_codigo OR c.asesor_id = p_asesor_id);

  SELECT count(*)::integer INTO v_consultas
  FROM public.consulta q
  WHERE q.workspace_id = p_workspace_id
    AND (q.asesor = v_codigo OR q.asesor_id = p_asesor_id);

  SELECT count(*)::integer INTO v_usuarios
  FROM public.usuario u
  WHERE u.asesor_codigo = v_codigo;

  RETURN jsonb_build_object(
    'contactos', v_contactos,
    'consultas', v_consultas,
    'usuarios', v_usuarios,
    'codigo', v_codigo,
    'nombre', v_nombre,
    'can_delete', (v_contactos + v_consultas) = 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_reassign_cartera(
  p_workspace_id text,
  p_from_codigo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_id text;
  v_contactos integer;
  v_consultas integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT a.id INTO v_from_id
  FROM public.asesor a
  WHERE a.workspace_id = p_workspace_id
    AND a.codigo = p_from_codigo;

  SELECT count(*)::integer INTO v_contactos
  FROM public.contacto c
  WHERE c.workspace_id = p_workspace_id
    AND (
      c.asesor = p_from_codigo
      OR (v_from_id IS NOT NULL AND c.asesor_id = v_from_id)
    );

  SELECT count(*)::integer INTO v_consultas
  FROM public.consulta q
  WHERE q.workspace_id = p_workspace_id
    AND (
      q.asesor = p_from_codigo
      OR (v_from_id IS NOT NULL AND q.asesor_id = v_from_id)
    );

  RETURN jsonb_build_object(
    'contactos', v_contactos,
    'consultas', v_consultas
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reassign_cartera(
  p_workspace_id text,
  p_from_codigo text,
  p_to_codigo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_id text;
  v_to_id text;
  v_to_firma text;
  v_contactos integer := 0;
  v_consultas integer := 0;
  v_log_id text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  IF p_from_codigo IS NULL OR p_to_codigo IS NULL OR p_from_codigo = p_to_codigo THEN
    RAISE EXCEPTION 'Parámetros inválidos';
  END IF;

  SELECT a.id INTO v_from_id
  FROM public.asesor a
  WHERE a.workspace_id = p_workspace_id
    AND a.codigo = p_from_codigo;

  SELECT a.id, trim(coalesce(nullif(trim(a.firma), ''), a.nombre, a.codigo))
  INTO v_to_id, v_to_firma
  FROM public.asesor a
  WHERE a.workspace_id = p_workspace_id
    AND a.codigo = p_to_codigo;

  IF v_to_id IS NULL THEN
    RAISE EXCEPTION 'Asesor destino no encontrado';
  END IF;

  UPDATE public.contacto c
  SET asesor = p_to_codigo,
      asesor_id = v_to_id,
      updated_date = now()
  WHERE c.workspace_id = p_workspace_id
    AND (
      c.asesor = p_from_codigo
      OR (v_from_id IS NOT NULL AND c.asesor_id = v_from_id)
    );
  GET DIAGNOSTICS v_contactos = ROW_COUNT;

  UPDATE public.consulta q
  SET asesor = p_to_codigo,
      asesor_id = v_to_id,
      firmaasesor = v_to_firma,
      updated_date = now()
  WHERE q.workspace_id = p_workspace_id
    AND (
      q.asesor = p_from_codigo
      OR (v_from_id IS NOT NULL AND q.asesor_id = v_from_id)
    );
  GET DIAGNOSTICS v_consultas = ROW_COUNT;

  v_log_id := 'reassign_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8);

  INSERT INTO public.cartera_reasignacion_log (
    id,
    workspace_id,
    from_codigo,
    to_codigo,
    contactos_count,
    consultas_count,
    performed_by
  ) VALUES (
    v_log_id,
    p_workspace_id,
    p_from_codigo,
    p_to_codigo,
    v_contactos,
    v_consultas,
    auth.uid()::text
  );

  RETURN jsonb_build_object(
    'contactos_updated', v_contactos,
    'consultas_updated', v_consultas
  );
END;
$$;
