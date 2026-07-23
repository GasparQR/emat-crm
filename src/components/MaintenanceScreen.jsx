import { Wrench } from "lucide-react";
import { EMAT_LOGO_URL } from "@/lib/brandAssets";

// Degradado de marca (mismo que el encabezado del PDF de reportes,
// REPORTES_THEME.brand): azul #1e40af → slate #0f172a. Fondo oscuro para que el
// logo EMAT (texto blanco sobre transparencia) sea legible.
const BRAND_GRADIENT = "linear-gradient(135deg, #1e40af 0%, #0f172a 100%)";

/**
 * Pantalla de mantenimiento a pantalla completa. La renderiza MaintenanceGate por
 * encima de toda la app cuando app_config.maintenance_mode === true, de modo que no
 * se monta ninguna ruta, dashboard ni módulo interno.
 *
 * @param {{ message?: string }} props
 */
export default function MaintenanceScreen({ message }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 text-white"
      style={{ background: BRAND_GRADIENT }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col items-center gap-6 px-6 py-10 text-center">
          <img
            src={EMAT_LOGO_URL}
            alt="EMAT"
            className="h-12 w-auto object-contain"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white/80">
            <Wrench className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              Sistema en mantenimiento
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              {message}
            </p>
          </div>

          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"
            role="status"
            aria-label="Cargando"
          />

          <p className="pt-2 text-xs text-white/50">
            Gracias por su paciencia.
          </p>
        </div>
      </div>
    </div>
  );
}
