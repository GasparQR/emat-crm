import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth } from '@/api/supabaseClient';
import { normalizeRole } from '@/lib/permissions';

const AuthContext = createContext();

function mapAuthUserToContext(profile, authUser) {
  if (!authUser && !profile) return null;
  return {
    id: profile?.id ?? authUser?.id,
    name: profile?.full_name ?? authUser?.email?.split('@')[0] ?? 'Usuario',
    email: profile?.email ?? authUser?.email ?? '',
    role: normalizeRole(profile?.role ?? authUser?.app_metadata?.role),
    active: profile?.active !== false,
    can_view_other_advisors: profile?.can_view_other_advisors === true,
    asesor_codigo: profile?.asesor_codigo ?? null,
    profile,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const loadSession = useCallback(async () => {
    try {
      const { data: { session } } = await auth.getSession();
      if (!session?.user) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return;
      }

      const profile = await auth.ensureUsuarioProfile(session.user);
      if (profile?.active === false) {
        await auth.signOut();
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_error', message: 'Tu cuenta está desactivada. Contactá al administrador.' });
        return;
      }
      setUser(mapAuthUserToContext(profile, session.user));
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_error', message: error.message });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const applySessionUser = (authUser) => {
      void (async () => {
        if (!mounted || !authUser) return;
        try {
          const profile = await auth.ensureUsuarioProfile(authUser);
          if (profile?.active === false) {
            await auth.signOut();
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_error', message: 'Tu cuenta está desactivada. Contactá al administrador.' });
            return;
          }
          if (!mounted) return;
          setUser(mapAuthUserToContext(profile, authUser));
          setIsAuthenticated(true);
          setAuthError(null);
        } catch (error) {
          if (!mounted) return;
          setAuthError({ type: 'auth_error', message: error.message });
        }
      })();
    };

    const init = async () => {
      setIsLoadingAuth(true);
      await loadSession();
      if (!mounted) return;
      setIsLoadingAuth(false);

      // Registrar listener DESPUÉS de getSession para evitar deadlock del SDK (supabase-js #762 / #2344).
      // No usar async/await dentro del callback: diferir llamadas al cliente con setTimeout(0).
      const { data: { subscription: sub } } = auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }
        if (event === 'INITIAL_SESSION') return;
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const authUser = session.user;
          setTimeout(() => applySessionUser(authUser), 0);
        }
      });
      subscription = sub;
    };

    init();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadSession]);

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const logout = async () => {
    await auth.logout();
  };

  const login = async (email, password) => {
    const data = await auth.signInWithPassword(email.trim(), password);
    const authUser = data?.user;
    if (!authUser) return { ok: false, message: 'No se pudo iniciar sesión' };

    const profile = await auth.ensureUsuarioProfile(authUser);
    if (profile?.active === false) {
      await auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      return { ok: false, message: 'Tu cuenta está desactivada.' };
    }
    const ctxUser = mapAuthUserToContext(profile, authUser);
    setUser(ctxUser);
    setIsAuthenticated(true);
    setAuthError(null);
    await auth.setLastSignIn();
    return { ok: true };
  };

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
    logout,
    login,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
