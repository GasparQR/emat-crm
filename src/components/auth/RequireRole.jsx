import { Navigate, useLocation } from "react-router-dom";
import AccessDenied from "@/components/auth/AccessDenied";
import { useAuth } from "@/lib/SimpleAuthContext";
import { normalizeRole } from "@/lib/permissions";

export default function RequireRole({ roles = [], children, denyMode = "screen" }) {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowed = roles.map((r) => normalizeRole(r));
  const currentRole = normalizeRole(user?.role);
  if (allowed.length > 0 && !allowed.includes(currentRole)) {
    if (denyMode === "redirect") {
      return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }
    return <AccessDenied />;
  }

  return children;
}
