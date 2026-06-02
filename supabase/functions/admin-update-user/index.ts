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
    const role = body?.role ? String(body.role).toUpperCase() : undefined;
    const asesor_codigo = body?.asesor_codigo ? String(body.asesor_codigo).toUpperCase() : null;
    const full_name = body?.full_name?.trim();
    const active = typeof body?.active === 'boolean' ? body.active : undefined;
    const can_view_other_advisors =
      typeof body?.can_view_other_advisors === 'boolean' ? body.can_view_other_advisors : undefined;

    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    if (role && !['ADMIN', 'ASESOR', 'LOGISTICA'].includes(role)) {
      return jsonResponse({ error: 'Invalid role' }, 400);
    }
    if (role === 'ASESOR' && !asesor_codigo) {
      return jsonResponse({ error: 'asesor_codigo is required for ASESOR' }, 400);
    }

    if (role === 'ASESOR' && asesor_codigo) {
      const { data: asesorRow } = await adminClient
        .from('asesor')
        .select('codigo')
        .eq('codigo', asesor_codigo)
        .maybeSingle();
      if (!asesorRow) {
        return jsonResponse(
          { error: `El código de asesor "${asesor_codigo}" no existe en el catálogo` },
          400,
        );
      }
    }

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

    if (profileErr) return jsonResponse({ error: profileErr.message }, 400);

    if (role !== undefined || full_name !== undefined) {
      await adminClient.auth.admin.updateUserById(id, {
        app_metadata: role ? { role } : undefined,
        user_metadata: full_name ? { full_name } : undefined,
      });
    }

    return jsonResponse({ ok: true, user: profile }, 200);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
