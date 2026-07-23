import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, appConfigApi, APP_CONFIG_ID } from "@/api/supabaseClient";

/**
 * @typedef {import("@/api/supabaseClient").AppConfigRow} AppConfigRow
 *
 * @typedef {Object} AppConfigValue
 * @property {boolean} loading         True solo mientras se resuelve la primera lectura.
 * @property {boolean} maintenanceMode Estado del modo mantenimiento (fail-open: false ante error).
 * @property {string}  maintenanceMessage
 * @property {AppConfigRow | null} config Fila completa; base para futuras banderas globales.
 */

const DEFAULT_MAINTENANCE_MESSAGE =
  "Estamos realizando tareas de mantenimiento. Volveremos en unos minutos.";

/** @type {import("react").Context<AppConfigValue>} */
const AppConfigContext = createContext({
  loading: true,
  maintenanceMode: false,
  maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
  config: null,
});

export const APP_CONFIG_QUERY_KEY = ["app-config"];

/**
 * Provee la config global. Carga la fila una sola vez (staleTime Infinity) y la
 * mantiene sincronizada con Supabase Realtime, escribiendo el payload directo en la
 * caché de TanStack Query para no disparar refetches.
 */
export function AppConfigProvider({ children }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: APP_CONFIG_QUERY_KEY,
    queryFn: appConfigApi.get,
    staleTime: Infinity,
  });

  useEffect(() => {
    const channel = supabase
      .channel("app-config")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_config",
          filter: `id=eq.${APP_CONFIG_ID}`,
        },
        (payload) => {
          // UPDATE/INSERT traen la fila nueva; la escribimos en caché sin refetch.
          // Ante DELETE (no debería ocurrir) invalidamos para releer el estado real.
          if (payload.eventType === "DELETE") {
            queryClient.invalidateQueries({ queryKey: APP_CONFIG_QUERY_KEY });
            return;
          }
          queryClient.setQueryData(APP_CONFIG_QUERY_KEY, payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const value = useMemo(() => {
    // Fail-open: si la lectura falla (tabla ausente antes de migrar, red caída) no
    // bloqueamos a todos — tratamos el mantenimiento como inactivo.
    const config = isError ? null : data ?? null;
    return {
      loading: isLoading && !isError,
      maintenanceMode: config?.maintenance_mode === true,
      maintenanceMessage: config?.maintenance_message || DEFAULT_MAINTENANCE_MESSAGE,
      config,
    };
  }, [data, isLoading, isError]);

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

/**
 * Config global de la app, reactiva a Realtime.
 * @returns {AppConfigValue}
 */
export function useAppConfig() {
  return useContext(AppConfigContext);
}
