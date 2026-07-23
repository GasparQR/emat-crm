import { Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EMAT_LOGO_URL } from "@/lib/brandAssets";

/**
 * Pantalla de mantenimiento a pantalla completa. La renderiza MaintenanceGate por
 * encima de toda la app cuando app_config.maintenance_mode === true, de modo que no
 * se monta ninguna ruta, dashboard ni módulo interno.
 *
 * @param {{ message?: string }} props
 */
export default function MaintenanceScreen({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 px-6 py-10 text-center">
          <img
            src={EMAT_LOGO_URL}
            alt="EMAT"
            className="h-12 w-auto object-contain"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Wrench className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Sistema en mantenimiento
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              {message}
            </p>
          </div>

          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800"
            role="status"
            aria-label="Cargando"
          />

          <p className="pt-2 text-xs text-slate-400">
            Gracias por su paciencia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
