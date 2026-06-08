import { supabase } from '@/api/supabaseClient';

const UNIQUE_VIOLATION = '23505';
const MAX_ALLOCATE_ATTEMPTS = 3;

export function isNropptoUniqueViolation(error) {
  return error?.code === UNIQUE_VIOLATION;
}

/**
 * Asigna el próximo nroppto de forma atómica (RPC Postgres).
 */
export async function allocateConsultaNroPpto(workspaceId = 'local') {
  const { data, error } = await supabase.rpc('allocate_consulta_nroppto', {
    p_workspace_id: workspaceId,
  });
  if (error) throw error;
  const nro = Number(data);
  if (!Number.isFinite(nro) || nro < 1) {
    throw new Error('No se pudo asignar número de presupuesto');
  }
  return nro;
}

/**
 * Vista previa sin consumir número (solo UI).
 */
export async function peekNextConsultaNroPpto(workspaceId = 'local') {
  const { data, error } = await supabase.rpc('peek_next_consulta_nroppto', {
    p_workspace_id: workspaceId,
  });
  if (error) throw error;
  const nro = Number(data);
  if (!Number.isFinite(nro) || nro < 1) return 1;
  return nro;
}

/**
 * Crea consulta con nroppto asignado atómicamente; reintenta si hay colisión única.
 */
export async function createConsultaWithNroppto(createFn, payload, workspaceId = 'local') {
  const { nroppto: _ignored, ...payloadWithoutNro } = payload ?? {};
  let lastError;
  for (let attempt = 0; attempt < MAX_ALLOCATE_ATTEMPTS; attempt += 1) {
    try {
      const nroppto = await allocateConsultaNroPpto(workspaceId);
      return await createFn({ ...payloadWithoutNro, nroppto });
    } catch (err) {
      lastError = err;
      if (isNropptoUniqueViolation(err) && attempt < MAX_ALLOCATE_ATTEMPTS - 1) {
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error('No se pudo asignar número de presupuesto; intentá de nuevo.');
}
