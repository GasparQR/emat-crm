import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const DEMO_USER = {
  id: 'user_1',
  name: 'Demo User',
  email: 'demo@emat.com',
  role: 'admin'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Simulate auth check
    const checkAuth = async () => {
      try {
        setIsLoadingAuth(true);
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Auto-login demo user for now
        setUser(DEMO_USER);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthError({ type: 'auth_error', message: error.message });
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const navigateToLogin = () => {
    // Placeholder for future login redirect
    console.log('Redirect to login');
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('emat_user');
  };

  const login = (email, password) => {
    // Simple demo login
    if (email && password) {
      const newUser = { ...DEMO_USER, email };
      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('emat_user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
    logout,
    login
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
