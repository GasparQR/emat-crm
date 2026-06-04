import { parseIvaPercent } from "@/lib/consultaIva";

/**
 * Resuelve condiciones y observaciones para presupuestos nuevos:
 * override del usuario (asesor) si tiene texto; si no, global del workspace.
 */
export function getConsultaPresupuestoDefaults(workspaceSettings, user) {
  const globalCond = workspaceSettings?.consulta_default_condiciones_comerciales ?? "";
  const globalObs = workspaceSettings?.consulta_default_observaciones ?? "";
  const userCond = user?.consulta_default_condiciones_comerciales ?? "";
  const userObs = user?.consulta_default_observaciones ?? "";
  return {
    condicionesComerciales: userCond.trim() || globalCond.trim() || "",
    observaciones: userObs.trim() || globalObs.trim() || "",
    defaultIva: parseIvaPercent(workspaceSettings?.consulta_default_iva, 21),
  };
}
