/** Paleta estable: mismo código de asesor → mismo color en toda la app. */

const PALETTE_HEX = [
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

function hashCodigo(codigo) {
  const s = String(codigo ?? "").trim().toUpperCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getAsesorColorIndex(codigo) {
  if (!codigo) return 0;
  return hashCodigo(codigo) % PALETTE_HEX.length;
}

export function getAsesorHexColor(codigo) {
  if (!codigo) return "#94a3b8";
  return PALETTE_HEX[getAsesorColorIndex(codigo)];
}

export function getAsesorBgClass(codigo) {
  if (!codigo) return "bg-slate-400";
  return PALETTE_BG[getAsesorColorIndex(codigo)] ?? "bg-slate-400";
}

export function buildAsesorHexMap(codigos) {
  const map = {};
  for (const codigo of codigos || []) {
    if (codigo) map[codigo] = getAsesorHexColor(codigo);
  }
  return map;
}
