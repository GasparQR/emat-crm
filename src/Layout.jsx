import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, Kanban, List, Users, Calendar,
  Menu, X, CheckCircle2, PanelLeftClose, PanelLeftOpen, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { WorkspaceProvider } from "@/components/context/WorkspaceContext";

const NAV_ITEMS = [
  { name: "Home", icon: LayoutDashboard, page: "Home" },
  { name: "Pipeline", icon: Kanban, page: "Pipeline" },
  { name: "Hoy", icon: Calendar, page: "Hoy" },
  { name: "Presupuestos", icon: List, page: "Consultas" },
  { name: "Ventas", icon: LayoutDashboard, page: "Ventas" },
  { name: "Contactos", icon: Users, page: "Contactos" },

  { name: "Ajustes", icon: Users, page: "Ajustes" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />
      
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-bold text-slate-900">EMAT CRM</span>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full bg-white border-r border-slate-100 z-50 transition-all duration-300 flex flex-col",
        sidebarCollapsed ? "lg:w-16" : "lg:w-64",
        sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className={cn("p-4 flex items-center border-b border-slate-100", sidebarCollapsed ? "justify-center" : "justify-between")}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-bold text-slate-900">EMAT CRM</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  sidebarCollapsed ? "justify-center" : "",
                  isActive 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-slate-100">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
              <p className="text-xs text-blue-200 mb-1">CRM Celulosa</p>
              <p className="text-sm font-medium">Gestión de Presupuestos</p>
              <p className="text-xs text-blue-200 mt-2">EMAT · Celulosa & Fibras</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        {children}
      </main>
      </div>
    </WorkspaceProvider>
  );
}
