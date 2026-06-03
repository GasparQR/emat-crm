export function nombreToInitials(nombre) {
  const parts = String(nombre ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.length >= 2
      ? (w[0] + w[1]).toUpperCase()
      : w[0].toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function buildAsesorNameByCodigo(catalogRows = []) {
  const map = {};
  for (const row of catalogRows) {
    const codigo = row?.codigo?.trim();
    const nombre = row?.nombre?.trim() || codigo;
    if (codigo) map[codigo.toUpperCase()] = nombre;
  }
  return map;
}

export function getAsesorNombre(codigo, nameByCodigo = {}) {
  const key = String(codigo ?? "").trim().toUpperCase();
  if (!key) return "";
  return nameByCodigo[key] || "";
}

export function getAsesorInitials(codigo, nameByCodigo = {}) {
  const key = String(codigo ?? "").trim();
  if (!key) return "?";
  const nombre = getAsesorNombre(key, nameByCodigo);
  if (nombre) return nombreToInitials(nombre);
  return nombreToInitials(key);
}
