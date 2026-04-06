/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Ajustes from './pages/Ajustes';
import Configuracion from './pages/Configuracion';
import ConfigurarPipeline from './pages/ConfigurarPipeline';
import Consultas from './pages/Consultas';
import Contactos from './pages/Contactos';
import EditorListaWhatsApp from './pages/EditorListaWhatsApp';
import ExportarVentas from './pages/ExportarVentas';
import Home from './pages/Home';
import Hoy from './pages/Hoy';
import ImportarVentas from './pages/ImportarVentas';
import ListasWhatsApp from './pages/ListasWhatsApp';
import Pipeline from './pages/Pipeline';
import Plantillas from './pages/Plantillas';
import Postventa from './pages/Postventa';
import ProveedorDetalle from './pages/ProveedorDetalle';
import Proveedores from './pages/Proveedores';
import Reportes from './pages/Reportes';
import Variables from './pages/Variables';
import VentaDetalle from './pages/VentaDetalle';
import Ventas from './pages/Ventas';
import VentasDashboard from './pages/VentasDashboard';
import __Layout from './Layout.jsx';
import InteligenciaNegocio from './pages/InteligenciaNegocio';



export const PAGES = {
    "Ajustes": Ajustes,
    "Configuracion": Configuracion,
    "ConfigurarPipeline": ConfigurarPipeline,
    "Consultas": Consultas,
    "Contactos": Contactos,
    "EditorListaWhatsApp": EditorListaWhatsApp,
    "ExportarVentas": ExportarVentas,
    "Home": Home,
    "Hoy": Hoy,
    "ImportarVentas": ImportarVentas,
    "ListasWhatsApp": ListasWhatsApp,
    "Pipeline": Pipeline,
    "Plantillas": Plantillas,
    "Postventa": Postventa,
    "ProveedorDetalle": ProveedorDetalle,
    "Proveedores": Proveedores,
    "Reportes": Reportes,
    "Variables": Variables,
    "VentaDetalle": VentaDetalle,
    "Ventas": Ventas,
    "VentasDashboard": VentasDashboard,
    "InteligenciaNegocio": InteligenciaNegocio,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
