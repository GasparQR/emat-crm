import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callerIsAdmin, corsHeaders, jsonResponse } from '../_shared/adminAuth.ts';

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
    const asesor_codigo = body?.asesor_codigo ? String(body.asesor_codigo).toUpperCase() : null;

    if (!full_name || !email || !password) {
      return jsonResponse({ error: 'full_name, email and password are required' }, 400);
    }
    if (!['ADMIN', 'ASESOR', 'LOGISTICA'].includes(role)) {
      return jsonResponse({ error: 'Invalid role' }, 400);
    }
    if (role === 'ASESOR' && !asesor_codigo) {
      return jsonResponse({ error: 'asesor_codigo is required for ASESOR' }, 400);
    }

    if (role === 'ASESOR') {
      const { data: asesorRow, error: asesorErr } = await adminClient
        .from('asesor')
        .select('codigo')
        .eq('codigo', asesor_codigo)
        .maybeSingle();

      if (asesorErr) {
        return jsonResponse({ error: asesorErr.message }, 400);
      }
      if (!asesorRow) {
        return jsonResponse(
          { error: `El código de asesor "${asesor_codigo}" no existe en el catálogo` },
          400,
        );
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
      return jsonResponse({ error: createErr?.message ?? 'Could not create auth user' }, 400);
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
