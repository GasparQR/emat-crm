import Papa from "papaparse";

const UTF8_BOM = "\uFEFF";

function serializeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

export function flattenRow(row) {
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, serializeValue(value)])
  );
}

export function rowsToCsv(rows) {
  const flatRows = (rows || []).map(flattenRow);
  if (flatRows.length === 0) return UTF8_BOM;
  return UTF8_BOM + Papa.unparse(flatRows);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
