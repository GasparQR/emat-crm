export const IVA_RATES = [0, 10.5, 21];

export function parseIvaPercent(value, fallback = 21) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatIvaLabel(rate) {
  const n = parseIvaPercent(rate, 21);
  return n === 10.5 ? "10,5" : String(n);
}

export function ivaSelectValue(rate) {
  return String(parseIvaPercent(rate, 21));
}
