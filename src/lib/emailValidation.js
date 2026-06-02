export const DUPLICATE_ASESOR_EMAIL_ERROR =
  "No es posible guardar, ya existe un asesor con ese email.";

export const DUPLICATE_USUARIO_EMAIL_ERROR =
  "No es posible guardar, ya existe un usuario con ese email.";

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function isDuplicateAsesorEmail(email, asesores, { excludeId = null } = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (asesores || []).some(
    (a) =>
      normalizeEmail(a.email) === normalized &&
      a.id !== excludeId
  );
}

export function isDuplicateUsuarioEmail(email, usuarios, { excludeId = null } = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (usuarios || []).some(
    (u) =>
      normalizeEmail(u.email) === normalized &&
      u.id !== excludeId
  );
}

export function mapDuplicateEmailError(message) {
  const msg = String(message ?? "");
  if (/already registered|already been registered|duplicate|unique|usuario_email_unique|asesor_email_unique/i.test(msg)) {
    if (/asesor/i.test(msg)) return DUPLICATE_ASESOR_EMAIL_ERROR;
    return DUPLICATE_USUARIO_EMAIL_ERROR;
  }
  if (msg.includes(DUPLICATE_ASESOR_EMAIL_ERROR) || msg.includes(DUPLICATE_USUARIO_EMAIL_ERROR)) {
    return msg;
  }
  return null;
}
