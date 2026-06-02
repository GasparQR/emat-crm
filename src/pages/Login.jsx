import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/SimpleAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoadingAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Ingresá email y contraseña");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.ok) {
        toast.success("Sesión iniciada");
        navigate("/", { replace: true });
      } else {
        toast.error(result?.message ?? "Credenciales inválidas");
      }
    } catch (err) {
      const msg = err?.message ?? "";
      if (/invalid login credentials/i.test(msg)) {
        toast.error("Email o contraseña incorrectos");
      } else if (/email not confirmed/i.test(msg)) {
        toast.error("Tu cuenta no está activa. Pedí al administrador que confirme el usuario en Supabase");
      } else if (/signup.*disabled|signups not allowed/i.test(msg)) {
        toast.error("No hay registro público. Pedí acceso al administrador");
      } else {
        toast.error(msg || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">EMAT CRM</h1>
            <p className="text-sm text-slate-500">
              Acceso solo para usuarios dados de alta por el administrador
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="comercial@emat.com"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
