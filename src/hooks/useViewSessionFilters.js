import { useState, useCallback } from "react";
import { sessionFilterKey, loadSessionFilters, saveSessionFilter } from "@/lib/viewLayout";

/**
 * Runtime multi-select filter state with optional sessionStorage persistence.
 * @param {string} viewId
 * @param {string} workspaceId
 * @param {string[]} filterIds
 */
export default function useViewSessionFilters(viewId, workspaceId, filterIds = []) {
  const key = sessionFilterKey(viewId, workspaceId);

  const [state, setState] = useState(() => {
    const session = loadSessionFilters(key);
    return Object.fromEntries(
      filterIds.map((id) => [id, Array.isArray(session[id]) ? session[id] : []]),
    );
  });

  const setFilter = useCallback(
    (filterId, values) => {
      setState((prev) => ({ ...prev, [filterId]: values }));
      saveSessionFilter(key, filterId, values);
    },
    [key],
  );

  const getFilter = useCallback((filterId) => state[filterId] || [], [state]);

  return { getFilter, setFilter, filters: state };
}
