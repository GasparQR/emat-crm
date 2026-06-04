import type { User } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CallerProfile = { id: string; role: string; active: boolean } | null;

/** Alineado con RLS is_admin() + excepción legacy admin@emat.com y app_metadata.role */
export function callerIsAdmin(authUser: User, callerProfile: CallerProfile): boolean {
  if (!authUser || callerProfile?.active === false) return false;

  const email = (authUser.email ?? '').toLowerCase();
  if (email === 'admin@emat.com') return true;

  const metaRole = String(
    authUser.app_metadata?.role ?? authUser.user_metadata?.role ?? '',
  ).toUpperCase();
  if (metaRole === 'ADMIN') return true;

  return callerProfile?.role === 'ADMIN' && callerProfile.active === true;
}

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
