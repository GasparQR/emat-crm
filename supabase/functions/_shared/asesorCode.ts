import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const NAME_EQUALS_CODE_ERROR =
  'No es posible guardar, el nombre no puede ser igual al codigo asesor.';

function sanitizeCodePart(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function firstWordCode(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  return sanitizeCodePart(first);
}

function emailLocalPart(email: string): string {
  const local = email.split('@')[0] ?? '';
  return sanitizeCodePart(local);
}

function buildCandidates(fullName: string, email: string): string[] {
  const first = firstWordCode(fullName);
  const fromEmail = emailLocalPart(email);
  const bases: string[] = [];
  if (first) bases.push(first);
  if (fromEmail && !bases.includes(fromEmail)) bases.push(fromEmail);
  if (!bases.length) bases.push('ASESOR');

  const candidates: string[] = [];
  for (const base of bases) {
    candidates.push(base);
    for (let i = 2; i <= 50; i++) {
      candidates.push(`${base}_${i}`);
    }
  }
  return candidates.filter((c, i, arr) => arr.indexOf(c) === i);
}

async function codigoExists(
  adminClient: SupabaseClient,
  codigo: string,
): Promise<boolean> {
  const { data } = await adminClient
    .from('asesor')
    .select('codigo')
    .eq('codigo', codigo)
    .maybeSingle();
  return !!data;
}

export async function generateUniqueAsesorCodigo(
  adminClient: SupabaseClient,
  fullName: string,
  email: string,
): Promise<{ codigo: string } | { error: string }> {
  const nameUpper = fullName.trim().toUpperCase();

  for (const candidate of buildCandidates(fullName, email)) {
    if (candidate === nameUpper) continue;
    const exists = await codigoExists(adminClient, candidate);
    if (!exists) return { codigo: candidate };
  }

  return { error: NAME_EQUALS_CODE_ERROR };
}

export async function ensureAsesorCatalog(
  adminClient: SupabaseClient,
  codigo: string,
  fullName: string,
  email: string,
): Promise<{ error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await adminClient.from('asesor').upsert(
    {
      id: `asesor_local_${codigo.toLowerCase()}`,
      workspace_id: 'local',
      codigo,
      nombre: fullName,
      email: normalizedEmail || null,
      active: true,
      activo: true,
    },
    { onConflict: 'codigo' },
  );

  if (error) return { error: error.message };
  return {};
}
