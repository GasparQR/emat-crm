import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: callerProfile, error: callerErr } = await adminClient
      .from('usuario')
      .select('id,role,active')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (callerErr || !callerProfile || callerProfile.role !== 'ADMIN' || callerProfile.active !== true) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: 'full_name, email and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!['ADMIN', 'ASESOR', 'LOGISTICA'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (role === 'ASESOR' && !asesor_codigo) {
      return new Response(JSON.stringify({ error: 'asesor_codigo is required for ASESOR' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: createdAuth, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name },
    });

    if (createErr || !createdAuth.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? 'Could not create auth user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = {
      id: createdAuth.user.id,
      workspace_id: 'local',
      full_name,
      email,
      role,
      active,
      can_view_other_advisors: role === 'ASESOR' ? can_view_other_advisors : false,
      asesor_codigo: role === 'ASESOR' ? asesor_codigo : null,
      updated_date: new Date().toISOString(),
    };

    const { data: profile, error: profileErr } = await adminClient
      .from('usuario')
      .upsert([payload], { onConflict: 'id' })
      .select()
      .single();

    if (profileErr) {
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, user: profile }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
