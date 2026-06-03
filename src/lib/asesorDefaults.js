function isAsesorRole(role) {
  const value = String(role ?? "").toUpperCase();
  return value === "ASESOR";
}

export function resolveDefaultAsesorCodigo(user, catalogRows = []) {
  const codigo = user?.asesor_codigo?.trim();
  if (codigo) return codigo.toUpperCase();

  if (!isAsesorRole(user?.role)) return "";

  const email = user?.email?.trim().toLowerCase();
  if (!email) return "";

  const match = (catalogRows || []).find(
    (a) => a.email?.trim().toLowerCase() === email
  );
  return match?.codigo ? String(match.codigo).toUpperCase() : "";
}
