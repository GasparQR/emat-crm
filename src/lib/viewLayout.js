import { DEFAULT_VIEW_LAYOUT, VIEW_IDS } from "@/lib/viewLayoutDefaults";

/**
 * @param {import('./viewLayoutDefaults').ViewColumnDef[]} defaults
 * @param {import('./viewLayoutDefaults').ViewColumnDef[]} [stored]
 */
function mergeColumns(defaults, stored) {
  const storedMap = new Map((stored || []).map((c) => [c.id, c]));
  const merged = defaults.map((def, index) => {
    const s = storedMap.get(def.id);
    return {
      ...def,
      enabled: s?.enabled ?? def.enabled,
      order: s?.order ?? def.order ?? index,
      label: s?.label || def.label,
    };
  });
  stored?.forEach((s) => {
    if (!defaults.some((d) => d.id === s.id)) {
      merged.push({ ...s });
    }
  });
  return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * @param {import('./viewLayoutDefaults').ViewFilterDef[]} defaults
 * @param {import('./viewLayoutDefaults').ViewFilterDef[]} [stored]
 */
function mergeFilters(defaults, stored) {
  const storedMap = new Map((stored || []).map((f) => [f.id, f]));
  const merged = defaults.map((def) => {
    const s = storedMap.get(def.id);
    return {
      ...def,
      enabled: s?.enabled ?? def.enabled,
      label: s?.label || def.label,
    };
  });
  stored?.forEach((s) => {
    if (!defaults.some((d) => d.id === s.id)) {
      merged.push({ ...s });
    }
  });
  return merged;
}

/**
 * @param {object} [stored]
 * @returns {Record<string, import('./viewLayoutDefaults').ViewLayoutSection>}
 */
export function mergeViewConfig(stored = {}) {
  /** @type {Record<string, import('./viewLayoutDefaults').ViewLayoutSection>} */
  const result = {};
  VIEW_IDS.forEach((viewId) => {
    const defaults = DEFAULT_VIEW_LAYOUT[viewId];
    const section = stored[viewId] || {};
    result[viewId] = {
      filters: mergeFilters(defaults.filters, section.filters),
      ...(defaults.columns
        ? { columns: mergeColumns(defaults.columns, section.columns) }
        : {}),
    };
  });
  return result;
}

/**
 * @param {string} viewId
 * @param {Record<string, import('./viewLayoutDefaults').ViewLayoutSection>} config
 */
export function getEnabledColumns(viewId, config) {
  const section = config?.[viewId];
  if (!section?.columns?.length) return [];
  return [...section.columns]
    .filter((c) => c.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * @param {string} viewId
 * @param {Record<string, import('./viewLayoutDefaults').ViewLayoutSection>} config
 */
export function getEnabledFilters(viewId, config) {
  const section = config?.[viewId];
  if (!section?.filters?.length) return [];
  return section.filters.filter((f) => f.enabled !== false);
}

/**
 * @param {string} viewId
 * @param {Record<string, import('./viewLayoutDefaults').ViewLayoutSection>} config
 * @param {string} filterId
 */
export function isFilterEnabled(viewId, config, filterId) {
  const filters = config?.[viewId]?.filters;
  if (!filters?.length) {
    return DEFAULT_VIEW_LAYOUT[viewId]?.filters?.find((f) => f.id === filterId)?.enabled !== false;
  }
  const f = filters.find((x) => x.id === filterId);
  return f ? f.enabled !== false : false;
}

/**
 * @param {string} viewId
 * @param {Record<string, import('./viewLayoutDefaults').ViewLayoutSection>} config
 * @param {string} columnId
 */
export function isColumnEnabled(viewId, config, columnId) {
  const columns = config?.[viewId]?.columns;
  if (!columns?.length) {
    return DEFAULT_VIEW_LAYOUT[viewId]?.columns?.find((c) => c.id === columnId)?.enabled !== false;
  }
  const c = columns.find((x) => x.id === columnId);
  return c ? c.enabled !== false : false;
}

/**
 * Empty selected = no filter (show all). OR match within filter.
 * @param {string[]} selected
 * @param {string|null|undefined} itemValue
 */
export function matchesMultiFilter(selected, itemValue) {
  if (!selected?.length) return true;
  const val = String(itemValue ?? "").trim();
  if (!val) return false;
  const norm = val.toLowerCase();
  return selected.some((s) => String(s).trim().toLowerCase() === norm);
}

/**
 * Case-insensitive partial match for city search in multi filter
 * @param {string[]} selected
 * @param {string|null|undefined} itemValue
 */
export function matchesCityMultiFilter(selected, itemValue) {
  if (!selected?.length) return true;
  const val = String(itemValue ?? "").trim().toLowerCase();
  if (!val) return false;
  return selected.some((s) => {
    const needle = String(s).trim().toLowerCase();
    return needle === val || val.includes(needle) || needle.includes(val);
  });
}

/**
 * @param {string} viewId
 * @param {string} workspaceId
 */
export function sessionFilterKey(viewId, workspaceId) {
  return `emat_filters_${workspaceId}_${viewId}`;
}

/**
 * @param {string} key
 * @returns {Record<string, string[]>}
 */
export function loadSessionFilters(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {string} key
 * @param {string} filterId
 * @param {string[]} values
 */
export function saveSessionFilter(key, filterId, values) {
  try {
    const current = loadSessionFilters(key);
    current[filterId] = values;
    sessionStorage.setItem(key, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}
