import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2';

// Autocontenida a propósito: el deploy manual/dashboard sube cada función como su
// propia carpeta y no incluye la carpeta compartida, así que replicamos aquí el
// mismo callerIsAdmin endurecido del helper compartido (sin el hardcode
// admin@emat.com, sin user_metadata.role —escribible por el propio usuario—, con el
// bypass solo vía ADMIN_BYPASS_EMAIL). A diferencia de las otras admin-* functions,
// esta no necesita nada más de la carpeta compartida.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CallerProfile = { id: string; role: string; active: boolean } | null;

function callerIsAdmin(authUser: User, callerProfile: CallerProfile): boolean {
  if (!authUser || callerProfile?.active === false) return false;

  // Fuente primaria: fila en la tabla usuario gestionada por admins.
  if (callerProfile?.role === 'ADMIN' && callerProfile.active === true) return true;

  // Secundaria: app_metadata escrito al crear el usuario (solo admins lo setean).
  const metaRole = String(authUser.app_metadata?.role ?? '').toUpperCase();
  if (metaRole === 'ADMIN') return true;

  // Escape hatch legacy: configurable por env var, no hardcodeado.
  const bypassEmail = (Deno.env.get('ADMIN_BYPASS_EMAIL') ?? '').trim().toLowerCase();
  if (bypassEmail && (authUser.email ?? '').toLowerCase() === bypassEmail) return true;

  return false;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase environment variables' }, 500);
    }

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
