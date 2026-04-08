import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const USERS = {
  admin: {
    id: 'user_1',
    name: 'Demo User',
    email: 'demo@emat.com',
    role: 'admin'
  },
  logistica: {
    id: 'user_logistica',
    name: 'Logística',
    email: 'logistica@emat.com',
    role: 'logistica'
  }
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

        // Check if a user was previously selected
        const savedUser = localStorage.getItem('emat_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setIsAuthenticated(true);
            setAuthError(null);
            return;
          } catch {
            // ignore parse errors
          }
        }

        // Default to admin user
        setUser(USERS.admin);
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
      const newUser = { ...USERS.admin, email };
      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('emat_user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const switchRole = (role) => {
    const selectedUser = USERS[role] || USERS.admin;
    setUser(selectedUser);
    localStorage.setItem('emat_user', JSON.stringify(selectedUser));
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
    switchRole
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
