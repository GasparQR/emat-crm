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

/** Mapa codigo UPPER → { firma, asesor_id, codigo, nombre } */
export function buildFirmasYAsesoresMap(catalogRows = []) {
  return Object.fromEntries(
    (catalogRows || [])
      .filter((row) => row?.codigo && row?.id)
      .map((row) => [
        String(row.codigo).trim().toUpperCase(),
        {
          firma: row.firma,
          asesor_id: row.id,
          codigo: row.codigo,
          nombre: row.nombre,
        },
      ])
  );
}

export function resolveAsesorFromMap(input, firmasYAsesoresMap = {}) {
  const key = String(input ?? "").trim().toUpperCase();
  if (!key) return null;

  let data = firmasYAsesoresMap[key];
  if (!data) {
    data = Object.values(firmasYAsesoresMap).find(
      (a) => String(a?.nombre ?? "").trim().toUpperCase() === key
    );
  }
  if (!data?.asesor_id) return null;

  const firma =
    data.firma?.trim() || data.nombre?.trim() || data.codigo || "Asesor";

  return {
    asesor_id: data.asesor_id,
    codigo: data.codigo,
    nombre: data.nombre,
    firma,
  };
}
