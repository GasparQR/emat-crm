/** Paleta CRM: colores elegibles en catálogo de asesores. */

export const ASESOR_PALETTE_HEX = [
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#6366f1",
  "#f97316",
  "#06b6d4",
  "#d946ef",
  "#14b8a6",
  "#22d3ee",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

const PALETTE_HEX = ASESOR_PALETTE_HEX;

const PALETTE_BG = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-red-500",
];

const FALLBACK_HEX = "#94a3b8";

function normalizeCodigoKey(codigo) {
  return String(codigo ?? "").trim().toUpperCase();
}

function hashCodigo(codigo) {
  const s = normalizeCodigoKey(codigo);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function isValidAsesorPaletteHex(hex) {
  if (!hex) return false;
  const n = String(hex).trim().toLowerCase();
  return ASESOR_PALETTE_HEX.some((p) => p.toLowerCase() === n);
}

export function getAsesorColorIndex(codigo) {
  if (!codigo) return 0;
  return hashCodigo(codigo) % PALETTE_HEX.length;
}

/** Color por hash del código (sin catálogo). */
export function getAsesorHexColorFromHash(codigo) {
  if (!codigo) return FALLBACK_HEX;
  return PALETTE_HEX[getAsesorColorIndex(codigo)];
}

/**
 * Mapa codigo UPPER → hex desde filas del catálogo (color_hex o hash).
 */
export function buildAsesorColorByCodigo(catalogRows = []) {
  const map = {};
  for (const row of catalogRows || []) {
    const codigo = row?.codigo;
    if (!codigo) continue;
    const key = normalizeCodigoKey(codigo);
    const stored = row?.color_hex?.trim();
    map[key] =
      stored && isValidAsesorPaletteHex(stored)
        ? stored
        : getAsesorHexColorFromHash(codigo);
  }
  return map;
}

export function getAsesorHexColor(codigo, colorByCodigo = null) {
  const key = normalizeCodigoKey(codigo);
  if (!key) return FALLBACK_HEX;
  if (colorByCodigo && colorByCodigo[key]) {
    return colorByCodigo[key];
  }
  return getAsesorHexColorFromHash(codigo);
}

export function getAsesorAvatarStyle(codigo, colorByCodigo = null) {
  return {
    backgroundColor: getAsesorHexColor(codigo, colorByCodigo),
    color: "#ffffff",
  };
}

/** @deprecated Preferir getAsesorAvatarStyle con color del catálogo */
export function getAsesorBgClass(codigo) {
  if (!codigo) return "bg-slate-400";
  return PALETTE_BG[getAsesorColorIndex(codigo)] ?? "bg-slate-400";
}

export function buildAsesorHexMap(codigos, colorByCodigo = null) {
  const map = {};
  for (const codigo of codigos || []) {
    if (codigo) map[codigo] = getAsesorHexColor(codigo, colorByCodigo);
  }
  return map;
}
