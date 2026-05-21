/**
 * Normaliza un número de teléfono para Argentina (prefijo 54).
 * Misma lógica que WhatsAppSender / ContactoWhatsAppSender.
 */
export function normalizePhone(raw) {
  if (!raw) return "";
  let clean = String(raw).replace(/[^0-9]/g, "");
  if (clean.length > 0 && !clean.startsWith("54")) {
    clean = "54" + clean;
  }
  return clean;
}

export function hasCallablePhone(phone) {
  const normalized = normalizePhone(phone);
  return normalized.length >= 8;
}

export function getTelHref(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `tel:+${normalized}`;
}
