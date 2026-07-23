import { useAppConfig } from "@/lib/AppConfigContext";
import MaintenanceScreen from "@/components/MaintenanceScreen";

/**
 * Compuerta global de mantenimiento. Se monta por encima de AuthProvider y del router:
 *
 *  - loading            → splash (nunca renderiza la app antes de conocer el estado,
 *                         para evitar el flash del dashboard).
 *  - maintenanceMode    → MaintenanceScreen y corta el árbol: no se monta auth,
 *                         ni rutas, ni módulos internos (bloqueo total).
 *  - en otro caso       → children (la app normal).
 *
 * @param {{ children: import("react").ReactNode }} props
 */
export default function MaintenanceGate({ children }) {
  const { loading, maintenanceMode, maintenanceMessage } = useAppConfig();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (maintenanceMode) {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  return children;
}
