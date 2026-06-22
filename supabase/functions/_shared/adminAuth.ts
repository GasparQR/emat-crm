import type { User } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CallerProfile = { id: string; role: string; active: boolean } | null;

/**
 * Determines if the caller has ADMIN privileges.
 *
 * Priority order:
 *   1. callerProfile.role === 'ADMIN' in the usuario table (normal path)
 *   2. app_metadata.role === 'ADMIN' (set when user is created via admin panel)
 *   3. ADMIN_BYPASS_EMAIL env var — legacy escape hatch for a single superuser email.
 *      Set this secret in Supabase Dashboard → Edge Functions → Secrets.
 *      Leave it empty (or unset) to disable the bypass for new deployments.
 */
export function callerIsAdmin(authUser: User, callerProfile: CallerProfile): boolean {
  if (!authUser || callerProfile?.active === false) return false;

  // Primary check: row in usuario table managed by admins
  if (callerProfile?.role === 'ADMIN' && callerProfile.active === true) return true;

  // Secondary check: app_metadata written at user-creation time
  const metaRole = String(
    authUser.app_metadata?.role ?? authUser.user_metadata?.role ?? '',
  ).toUpperCase();
  if (metaRole === 'ADMIN') return true;

  // Legacy escape hatch: configurable via env var, not hardcoded
  const bypassEmail = (Deno.env.get('ADMIN_BYPASS_EMAIL') ?? '').trim().toLowerCase();
  if (bypassEmail && (authUser.email ?? '').toLowerCase() === bypassEmail) return true;

  return false;
}

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
