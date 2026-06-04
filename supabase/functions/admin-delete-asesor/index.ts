import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callerIsAdmin, corsHeaders, jsonResponse } from './adminAuth.ts';

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
    const asesorId = String(body?.asesor_id ?? '').trim();
    const workspaceId = String(body?.workspace_id ?? 'local').trim();

    if (!asesorId) return jsonResponse({ error: 'asesor_id is required' }, 400);

    const { data: preview, error: previewErr } = await adminClient.rpc('preview_asesor_deletion', {
      p_workspace_id: workspaceId,
      p_asesor_id: asesorId,
    });

    if (previewErr) return jsonResponse({ error: previewErr.message }, 400);

    const contactos = Number(preview?.contactos ?? 0);
    const consultas = Number(preview?.consultas ?? 0);

    if (contactos + consultas > 0) {
      return jsonResponse(
        {
          error:
            'Hay presupuestos o contactos asignados a este asesor. Reasigná la cartera antes de eliminarlo.',
          contactos,
          consultas,
        },
        400,
      );
    }

    const codigo = String(preview?.codigo ?? '');
    if (!codigo) return jsonResponse({ error: 'Asesor no encontrado' }, 404);

    const { data: linkedUsers, error: usersErr } = await adminClient
      .from('usuario')
      .select('id')
      .eq('asesor_codigo', codigo);

    if (usersErr) return jsonResponse({ error: usersErr.message }, 500);

    let usuariosDeleted = 0;

    for (const row of linkedUsers ?? []) {
      const userId = String(row.id ?? '');
      if (!userId) continue;

      const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(userId);
      if (authDeleteErr) {
        return jsonResponse({ error: authDeleteErr.message }, 400);
      }
      usuariosDeleted += 1;
    }

    const { error: usuarioDeleteErr } = await adminClient
      .from('usuario')
      .delete()
      .eq('asesor_codigo', codigo);

    if (usuarioDeleteErr) return jsonResponse({ error: usuarioDeleteErr.message }, 400);

    const { error: asesorDeleteErr } = await adminClient
      .from('asesor')
      .delete()
      .eq('id', asesorId)
      .eq('workspace_id', workspaceId);

    if (asesorDeleteErr) return jsonResponse({ error: asesorDeleteErr.message }, 400);

    return jsonResponse({ ok: true, usuarios_deleted: usuariosDeleted }, 200);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
