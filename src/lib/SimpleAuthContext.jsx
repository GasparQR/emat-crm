import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth } from '@/api/supabaseClient';

const AuthContext = createContext();

function mapAuthUserToContext(profile, authUser) {
  if (!authUser && !profile) return null;
  return {
    id: profile?.id ?? authUser?.id,
    name: profile?.full_name ?? authUser?.email?.split('@')[0] ?? 'Usuario',
    email: profile?.email ?? authUser?.email ?? '',
    role: profile?.role === 'logistica' ? 'logistica' : 'admin',
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
    // #region agent log
    fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:loadSession:start',message:'loadSession started',data:{},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const sessionResult = await auth.getSession();
      // #region agent log
      fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:loadSession:afterGetSession',message:'getSession resolved',data:{hasSession:!!sessionResult?.data?.session,hasUser:!!sessionResult?.data?.session?.user},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const { data: { session } } = sessionResult;
      if (!session?.user) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        // #region agent log
        fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:loadSession:noUser',message:'no session user',data:{},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:loadSession:beforeProfile',message:'ensureUsuarioProfile starting',data:{userId:session.user.id},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const profile = await auth.ensureUsuarioProfile(session.user);
      // #region agent log
      fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:loadSession:afterProfile',message:'ensureUsuarioProfile done',data:{hasProfile:!!profile},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setUser(mapAuthUserToContext(profile, session.user));
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('Auth check failed:', error);
      // #region agent log
      fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:loadSession:error',message:'loadSession error',data:{errorMessage:error?.message},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:init:start',message:'auth init started',data:{mounted},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      await loadSession();
      if (!mounted) return;
      setIsLoadingAuth(false);
      // #region agent log
      fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:init:done',message:'isLoadingAuth set false, registering listener',data:{mounted},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:login:start',message:'login started',data:{hasEmail:!!email?.trim()},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const data = await auth.signInWithPassword(email.trim(), password);
    // #region agent log
    fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:login:afterSignIn',message:'signInWithPassword done',data:{hasUser:!!data?.user},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const authUser = data?.user;
    if (!authUser) return { ok: false, message: 'No se pudo iniciar sesión' };

    const profile = await auth.ensureUsuarioProfile(authUser);
    // #region agent log
    fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'SimpleAuthContext.jsx:login:done',message:'login complete',data:{ok:true},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const ctxUser = mapAuthUserToContext(profile, authUser);
    setUser(ctxUser);
    setIsAuthenticated(true);
    setAuthError(null);
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
