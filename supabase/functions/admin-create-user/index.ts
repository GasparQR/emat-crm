import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callerIsAdmin, corsHeaders, jsonResponse } from '../_shared/adminAuth.ts';
import {
  ensureAsesorCatalog,
  generateUniqueAsesorCodigo,
} from '../_shared/asesorCode.ts';
import { assertEmailAvailableForNewUser, DUPLICATE_USUARIO_EMAIL_ERROR } from '../_shared/emailValidation.ts';

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
        {
          error:
            'Access denied: necesitás rol ADMIN en usuario (o app_metadata.role ADMIN).',
        },
        403,
      );
    }

    const body = await req.json();
    const full_name = (body?.full_name ?? '').trim();
    const email = (body?.email ?? '').trim().toLowerCase();
    const password = body?.password ?? '';
    const role = String(body?.role ?? 'ASESOR').toUpperCase();
    const active = body?.active !== false;
    const can_view_other_advisors = body?.can_view_other_advisors === true;

    if (!full_name || !email || !password) {
      return jsonResponse({ error: 'full_name, email and password are required' }, 400);
    }
    if (!['ADMIN', 'ASESOR', 'LOGISTICA'].includes(role)) {
      return jsonResponse({ error: 'Invalid role' }, 400);
    }

    const emailCheck = await assertEmailAvailableForNewUser(adminClient, email);
    if (emailCheck.error) {
      return jsonResponse({ error: emailCheck.error }, 400);
    }

    let asesor_codigo: string | null = null;

    if (role === 'ASESOR') {
      const generated = await generateUniqueAsesorCodigo(adminClient, full_name, email);
      if ('error' in generated) {
        return jsonResponse({ error: generated.error }, 400);
      }
      asesor_codigo = generated.codigo;

      const catalog = await ensureAsesorCatalog(
        adminClient,
        asesor_codigo,
        full_name,
        email,
      );
      if (catalog.error) {
        return jsonResponse({ error: catalog.error }, 400);
      }
    }

    const { data: createdAuth, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: {
        full_name,
        ...(role === 'ASESOR' && asesor_codigo ? { asesor_codigo } : {}),
      },
    });

    if (createErr || !createdAuth.user) {
      const msg = createErr?.message ?? 'Could not create auth user';
      if (/already registered|already been registered|duplicate/i.test(msg)) {
        return jsonResponse({ error: DUPLICATE_USUARIO_EMAIL_ERROR }, 400);
      }
      const hint =
        /database error/i.test(msg)
          ? ' Ejecutá la migración 20260603120000_fix_auth_user_trigger.sql en Supabase (trigger insertaba usuario antes que asesor).'
          : '';
      return jsonResponse({ error: msg + hint }, 400);
    }

    const now = new Date().toISOString();
    const payload = {
      id: createdAuth.user.id,
      workspace_id: 'local',
      full_name,
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
