import { resolveDefaultAsesorCodigo } from "@/lib/asesorDefaults";

const ROLE = {
  ADMIN: 'ADMIN',
  ASESOR: 'ASESOR',
  LOGISTICA: 'LOGISTICA',
};

export function normalizeRole(role) {
  const value = String(role ?? '').toUpperCase();
  if (value === ROLE.ADMIN || value === ROLE.ASESOR || value === ROLE.LOGISTICA) return value;
  if (value === 'ADMINISTRADOR') return ROLE.ADMIN;
  return ROLE.ASESOR;
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === ROLE.ADMIN;
}

export function isAsesor(user) {
  return normalizeRole(user?.role) === ROLE.ASESOR;
}

export function isLogistica(user) {
  return normalizeRole(user?.role) === ROLE.LOGISTICA;
}

export function canManageUsers(user) {
  return isAdmin(user);
}

export function canViewReportes(user) {
  return isAdmin(user) || isAsesor(user);
}

export function canViewGlobalData(user) {
  if (isAdmin(user)) return true;
  return isAsesor(user) && user?.can_view_other_advisors === true;
}

export function canViewAsesorData(user, asesorCodigo) {
  if (!asesorCodigo) return true;
  if (isAdmin(user)) return true;
  if (isLogistica(user)) return true;
  if (!isAsesor(user)) return false;
  if (user?.can_view_other_advisors) return true;
  return (
    String(user?.asesor_codigo ?? "").trim().toUpperCase() ===
    String(asesorCodigo).trim().toUpperCase()
  );
}

function matchesUserAsesorCodigo(recordAsesor, userAsesorCodigo) {
  return (
    String(recordAsesor ?? "").trim().toUpperCase() ===
    String(userAsesorCodigo ?? "").trim().toUpperCase()
  );
}

export function getDefaultAsesorForUser(user, catalogRows = []) {
  if (!isAsesor(user)) return "";
  return resolveDefaultAsesorCodigo(user, catalogRows);
}

export function filterConsultasByVisibility(consultas, user) {
  if (!Array.isArray(consultas)) return [];
  if (isAdmin(user)) return consultas;
  if (isLogistica(user)) {
    return consultas.filter((c) => c.pipeline_stage === 'GANADA' || c.pipeline_stage === 'EJECUTADA');
  }
  if (isAsesor(user) && !user?.can_view_other_advisors) {
    return consultas.filter((c) =>
      matchesUserAsesorCodigo(c?.asesor, user?.asesor_codigo)
    );
  }
  return consultas;
}

export function filterContactosByVisibility(contactos, user) {
  if (!Array.isArray(contactos)) return [];
  if (isAdmin(user) || isLogistica(user)) return contactos;
  if (isAsesor(user) && !user?.can_view_other_advisors) {
    return contactos.filter((c) =>
      matchesUserAsesorCodigo(c?.asesor, user?.asesor_codigo)
    );
  }
  return contactos;
}

export function getNavItemsForRole(user) {
  if (isLogistica(user)) {
    return [
      { name: 'Hoy', icon: 'Calendar', page: 'Hoy' },
      { name: 'Presupuestos', icon: 'List', page: 'Consultas' },
    ];
  }

  if (isAdmin(user)) {
    return [
      { name: 'Home', icon: 'LayoutDashboard', page: 'Home' },
      { name: 'Pipeline', icon: 'Kanban', page: 'Pipeline' },
      { name: 'Hoy', icon: 'Calendar', page: 'Hoy' },
      { name: 'Presupuestos', icon: 'List', page: 'Consultas' },
      { name: 'Contactos', icon: 'Users', page: 'Contactos' },
      { name: 'Reportes', icon: 'BarChart3', page: 'Reportes' },
      { name: 'Ajustes', icon: 'Settings', page: 'Ajustes' },
    ];
  }

  return [
    { name: 'Home', icon: 'LayoutDashboard', page: 'Home' },
    { name: 'Pipeline', icon: 'Kanban', page: 'Pipeline' },
    { name: 'Hoy', icon: 'Calendar', page: 'Hoy' },
    { name: 'Presupuestos', icon: 'List', page: 'Consultas' },
    { name: 'Contactos', icon: 'Users', page: 'Contactos' },
    { name: 'Reportes', icon: 'BarChart3', page: 'Reportes' },
    { name: 'Ajustes', icon: 'Settings', page: 'Ajustes' },
  ];
}

export function canAccessRoute(user, pathName) {
  const path = String(pathName || '/');
  if (path === '/login') return true;

  if (path.startsWith('/configuracion/usuarios') || path.startsWith('/configuracion/asesores')) {
    return isAdmin(user);
  }
  if (path === '/Reportes' || path === '/reportes') {
    return isAdmin(user) || isAsesor(user);
  }
  return true;
}

