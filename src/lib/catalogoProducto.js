export const UNIDADES_MEDIDA = ["m²", "kg", "l", "ml", "hm", "un", "global"];

export const UNIDAD_OTRA = "__otra__";

export function normalizeCatalogoRow(row = {}) {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    nombre: row.nombre ?? "",
    descripcion: row.descripcion ?? "",
    precio_unitario: Number(row.precio_unitario ?? row.precioUnitario ?? 0),
    unidad_medida: row.unidad_medida ?? row.unidadMedida ?? "un",
    activo: row.activo !== false,
    created_date: row.created_date,
    updated_date: row.updated_date,
  };
}

export function formatCatalogoPrecio(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function buildDescripcionFromCatalogo(producto) {
  const nombre = String(producto.nombre || "").trim();
  const descripcion = String(producto.descripcion || "").trim();
  const unidad = String(producto.unidad_medida || "").trim();

  let text = nombre;
  if (descripcion) text += ` — ${descripcion}`;
  if (unidad) text += ` (${unidad})`;
  return text;
}

export function mapCatalogoToConsultaItem(producto, { cantidad = 1, precioUnitario } = {}) {
  const normalized = normalizeCatalogoRow(producto);
  const qty = cantidad === "" ? "" : String(cantidad);
  const price =
    precioUnitario !== undefined && precioUnitario !== ""
      ? String(precioUnitario)
      : String(normalized.precio_unitario ?? "");

  return {
    descripcionServicio: buildDescripcionFromCatalogo(normalized),
    precioUnitario: price,
    cantidad: qty,
  };
}

export function filterCatalogoProductos(list = [], { search = "", unidad = "todos", soloActivos = true } = {}) {
  const q = String(search || "").trim().toLowerCase();

  return list.filter((raw) => {
    const item = normalizeCatalogoRow(raw);
    if (soloActivos && !item.activo) return false;
    if (unidad !== "todos" && item.unidad_medida !== unidad) return false;
    if (!q) return true;

    const haystack = `${item.nombre} ${item.descripcion} ${item.unidad_medida}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function resolveUnidadMedidaSelectValue(unidad) {
  const value = String(unidad || "").trim();
  if (!value) return "un";
  if (UNIDADES_MEDIDA.includes(value)) return value;
  return UNIDAD_OTRA;
}
