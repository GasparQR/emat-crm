import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: callerProfile } = await adminClient.from('usuario').select('id,role,active').eq('id', authData.user.id).maybeSingle();
    if (!callerProfile || callerProfile.role !== 'ADMIN' || callerProfile.active !== true) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const id = String(body?.id ?? '');
    const role = body?.role ? String(body.role).toUpperCase() : undefined;
    const asesor_codigo = body?.asesor_codigo ? String(body.asesor_codigo).toUpperCase() : null;
    const full_name = body?.full_name?.trim();
    const active = typeof body?.active === 'boolean' ? body.active : undefined;
    const can_view_other_advisors = typeof body?.can_view_other_advisors === 'boolean' ? body.can_view_other_advisors : undefined;

    if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (role && !['ADMIN', 'ASESOR', 'LOGISTICA'].includes(role)) return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (role === 'ASESOR' && !asesor_codigo) return new Response(JSON.stringify({ error: 'asesor_codigo is required for ASESOR' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const patch: Record<string, unknown> = { updated_date: new Date().toISOString() };
    if (full_name !== undefined) patch.full_name = full_name;
    if (role !== undefined) patch.role = role;
    if (active !== undefined) patch.active = active;
    if (can_view_other_advisors !== undefined) patch.can_view_other_advisors = can_view_other_advisors;
    if (role !== undefined) patch.asesor_codigo = role === 'ASESOR' ? asesor_codigo : null;

    const { data: profile, error: profileErr } = await adminClient
      .from('usuario')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (profileErr) return new Response(JSON.stringify({ error: profileErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (role !== undefined || full_name !== undefined) {
      await adminClient.auth.admin.updateUserById(id, {
        app_metadata: role ? { role } : undefined,
        user_metadata: full_name ? { full_name } : undefined,
      });
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
