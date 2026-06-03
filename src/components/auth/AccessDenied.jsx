import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function AccessDenied() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md text-center space-y-3">
        <p className="text-xl font-semibold text-slate-900">Acceso denegado</p>
        <p className="text-sm text-slate-600">
          No tenés permisos para acceder a esta sección.
        </p>
        <Link to={createPageUrl("Home")}>
          <Button>Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
