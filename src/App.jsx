import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/SimpleAuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from '@/pages/Login';
import RequireRole from '@/components/auth/RequireRole';
import ConfiguracionUsuarios from '@/pages/config/ConfiguracionUsuarios';
import ConfiguracionAsesores from '@/pages/config/ConfiguracionAsesores';
import ConfiguracionCatalogoProductos from '@/pages/config/ConfiguracionCatalogoProductos';
import { canAccessRoute } from '@/lib/permissions';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    } else if (authError.type === 'auth_error') {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <p className="text-lg font-semibold text-slate-900">Error de autenticación</p>
            <p className="text-sm text-slate-600">{authError.message}</p>
            <button
              type="button"
              className="text-sm text-blue-600 underline"
              onClick={() => navigateToLogin()}
            >
              Ir al login
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />
      {!isAuthenticated ? (
        <Route path="*" element={<Navigate to="/login" replace />} />
      ) : (
        <>
          <Route
            path="/configuracion/usuarios"
            element={
              <RequireRole roles={['ADMIN']}>
                <LayoutWrapper currentPageName="Ajustes">
                  <ConfiguracionUsuarios />
                </LayoutWrapper>
              </RequireRole>
            }
          />
          <Route
            path="/configuracion/asesores"
            element={
              <RequireRole roles={['ADMIN']}>
                <LayoutWrapper currentPageName="Ajustes">
                  <ConfiguracionAsesores />
                </LayoutWrapper>
              </RequireRole>
            }
          />
          <Route
            path="/configuracion/catalogo-productos"
            element={
              <RequireRole roles={['ADMIN']}>
                <LayoutWrapper currentPageName="Ajustes">
                  <ConfiguracionCatalogoProductos />
                </LayoutWrapper>
              </RequireRole>
            }
          />
          <Route path="/" element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          } />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <RequireRole roles={path === 'Reportes' ? ['ADMIN', 'ASESOR'] : ['ADMIN', 'ASESOR', 'LOGISTICA']} denyMode="redirect">
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                </RequireRole>
              }
            />
          ))}
          <Route
            path="/reportes"
            element={
              <RequireRole roles={['ADMIN', 'ASESOR']} denyMode="redirect">
                <Navigate to="/Reportes" replace />
              </RequireRole>
            }
          />
          <Route
            path="/forbidden"
            element={canAccessRoute(user, '/forbidden') ? <PageNotFound /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<PageNotFound />} />
        </>
      )}
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
