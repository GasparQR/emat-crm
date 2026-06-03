import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callerIsAdmin, corsHeaders, jsonResponse } from '../_shared/adminAuth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) return jsonResponse({ error: 'Invalid session' }, 401);

    const { data: callerProfile, error: callerErr } = await adminClient
      .from('usuario')
      .select('id,role,active')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (callerErr) return jsonResponse({ error: callerErr.message }, 500);

    if (!callerIsAdmin(authData.user, callerProfile)) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }

    const body = await req.json();
    const id = String(body?.id ?? '');
    const active = body?.active === true;
    if (!id) return jsonResponse({ error: 'id is required' }, 400);

    const { data: profile, error: profileErr } = await adminClient
      .from('usuario')
      .update({ active, updated_date: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (profileErr) return jsonResponse({ error: profileErr.message }, 400);

    return jsonResponse({ ok: true, user: profile }, 200);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
