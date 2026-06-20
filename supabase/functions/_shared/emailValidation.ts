import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const DUPLICATE_ASESOR_EMAIL_ERROR =
  'No es posible guardar, ya existe un asesor con ese email.';

export const DUPLICATE_USUARIO_EMAIL_ERROR =
  'No es posible guardar, ya existe un usuario con ese email.';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findAsesorByEmail(
  adminClient: SupabaseClient,
  email: string,
  excludeCodigo?: string | null,
) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data, error } = await adminClient
    .from('asesor')
    .select('codigo, email')
    .ilike('email', normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (excludeCodigo && data.codigo === excludeCodigo) return null;
  return data;
}

export async function findUsuarioByEmail(
  adminClient: SupabaseClient,
  email: string,
  excludeUserId?: string | null,
) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data, error } = await adminClient
    .from('usuario')
    .select('id, email')
    .ilike('email', normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (excludeUserId && data.id === excludeUserId) return null;
  return data;
}

export async function assertEmailAvailableForNewUser(
  adminClient: SupabaseClient,
  email: string,
): Promise<{ error?: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return {};

  const existingUsuario = await findUsuarioByEmail(adminClient, normalized);
  if (existingUsuario) {
    return { error: DUPLICATE_USUARIO_EMAIL_ERROR };
  }

  const existingAsesor = await findAsesorByEmail(adminClient, normalized);
  if (existingAsesor) {
    return { error: DUPLICATE_ASESOR_EMAIL_ERROR };
  }

  return {};
}

export async function assertEmailAvailableForUserOnly(
  adminClient: SupabaseClient,
  email: string,
  excludeUserId?: string | null,
): Promise<{ error?: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return {};

  const existingUsuario = await findUsuarioByEmail(adminClient, normalized, excludeUserId);
  if (existingUsuario) {
    return { error: DUPLICATE_USUARIO_EMAIL_ERROR };
  }

  return {};
}

export async function assertEmailAvailableForAsesor(
  adminClient: SupabaseClient,
  email: string,
  excludeCodigo?: string | null,
  excludeUserId?: string | null,
): Promise<{ error?: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return {};

  const existingAsesor = await findAsesorByEmail(adminClient, normalized, excludeCodigo);
  if (existingAsesor) {
    return { error: DUPLICATE_ASESOR_EMAIL_ERROR };
  }

  const existingUsuario = await findUsuarioByEmail(adminClient, normalized, excludeUserId);
  if (existingUsuario) {
    return { error: DUPLICATE_ASESOR_EMAIL_ERROR };
  }

  return {};
}
