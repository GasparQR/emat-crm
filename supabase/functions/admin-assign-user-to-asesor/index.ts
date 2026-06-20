import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callerIsAdmin, corsHeaders, jsonResponse } from '../_shared/adminAuth.ts';
import {
  assertEmailAvailableForUserOnly,
  DUPLICATE_USUARIO_EMAIL_ERROR,
} from '../_shared/emailValidation.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase environment variables' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    const { data: callerProfile, error: callerErr } = await adminClient
      .from('usuario')
      .select('id,role,active')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (callerErr) {
      return jsonResponse({ error: callerErr.message }, 500);
    }

    if (!callerIsAdmin(authData.user, callerProfile)) {
      return jsonResponse(
        { error: 'Access denied: necesitás rol ADMIN en usuario.' },
        403,
      );
    }

    const body = await req.json();
    const asesor_codigo = body?.asesor_codigo
      ? String(body.asesor_codigo).trim().toUpperCase()
      : '';
    const email = (body?.email ?? '').trim().toLowerCase();
    const password = body?.password ?? '';
    const full_name = (body?.full_name ?? '').trim();
    const role = String(body?.role ?? 'ASESOR').toUpperCase();
    const active = body?.active !== false;
    const can_view_other_advisors = body?.can_view_other_advisors === true;

    if (!asesor_codigo) {
      return jsonResponse({ error: 'asesor_codigo es obligatorio' }, 400);
    }
    if (!email || !password) {
      return jsonResponse({ error: 'email y password son obligatorios' }, 400);
    }
    if (!['ADMIN', 'ASESOR', 'LOGISTICA'].includes(role)) {
      return jsonResponse({ error: 'Rol inválido' }, 400);
    }

    // Verify the asesor exists
    const { data: existingAsesor, error: asesorErr } = await adminClient
      .from('asesor')
      .select('codigo, nombre, email')
      .eq('codigo', asesor_codigo)
      .maybeSingle();

    if (asesorErr || !existingAsesor) {
      return jsonResponse(
        { error: `No existe un asesor con código: ${asesor_codigo}` },
        400,
      );
    }

    // Verify the asesor doesn't already have a linked user
    const { data: existingLinkedUser } = await adminClient
      .from('usuario')
      .select('id, email')
      .eq('asesor_codigo', asesor_codigo)
      .maybeSingle();

    if (existingLinkedUser) {
      return jsonResponse(
        {
          error: `El asesor ${asesor_codigo} ya tiene un usuario asignado (${existingLinkedUser.email}).`,
        },
        400,
      );
    }

    // Check email uniqueness only in usuario table (asesor may already have this email)
    const emailCheck = await assertEmailAvailableForUserOnly(adminClient, email);
    if (emailCheck.error) {
      return jsonResponse({ error: emailCheck.error }, 400);
    }

    const resolvedName = full_name || existingAsesor.nombre || asesor_codigo;

    const { data: createdAuth, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: {
        full_name: resolvedName,
        asesor_codigo,
      },
    });

    if (createErr || !createdAuth.user) {
      const msg = createErr?.message ?? 'No se pudo crear el usuario de autenticación';
      if (/already registered|already been registered|duplicate/i.test(msg)) {
        return jsonResponse({ error: DUPLICATE_USUARIO_EMAIL_ERROR }, 400);
      }
      return jsonResponse({ error: msg }, 400);
    }

    const now = new Date().toISOString();
    const payload = {
      id: createdAuth.user.id,
      workspace_id: 'local',
      full_name: resolvedName,
      email,
      role,
      active,
      can_view_other_advisors: role === 'ASESOR' ? can_view_other_advisors : false,
      asesor_codigo: role === 'ASESOR' ? asesor_codigo : null,
      created_date: now,
      updated_date: now,
    };

    const { data: profile, error: profileErr } = await adminClient
      .from('usuario')
      .upsert([payload], { onConflict: 'id' })
      .select()
      .single();

    if (profileErr) {
      await adminClient.auth.admin.deleteUser(createdAuth.user.id);
      return jsonResponse({ error: profileErr.message }, 400);
    }

    return jsonResponse({ ok: true, user: profile }, 200);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
