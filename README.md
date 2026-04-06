# EMAT Celulosa CRM

Sistema CRM de gestión de presupuestos y clientes para EMAT - Especialistas en Fibra Celulosa y Aislación.

## Requisitos previos

- Node.js 18+
- npm o yarn

## Instalación local

1. Clonar el repositorio
```bash
git clone https://github.com/GasparQR/emat-crm.git
cd emat-crm
```

2. Instalar dependencias
```bash
npm install
```

3. Crear archivo `.env.local`
```bash
cp .env.example .env.local
```

4. Ejecutar en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Deploy en Vercel

### Pasos iniciales

1. **Sincronizar con GitHub** ✓ (ya realizado)
2. **Conectar Vercel a GitHub**: https://vercel.com/new
3. **Importar proyecto** `GasparQR/emat-crm`

### Configurar en Vercel

En el dashboard de Vercel:
1. Conectar el repositorio `GasparQR/emat-crm`
2. El build se configurará automáticamente
3. Deploy automático al hacer push a `main`

**No requiere variables de entorno** - El CRM usa localStorage para almacenar datos localmente.

## Scripts disponibles

```bash
npm run dev          # Ejecutar en desarrollo
npm run build        # Build para producción
npm run preview      # Preview del build
npm run lint         # Ejecutar ESLint
npm run lint:fix     # Arreglar errores de ESLint
npm run typecheck    # TypeScript check
```

## Características

- **Gestión de Clientes**: Registro y seguimiento de clientes de celulosa
- **Pipeline de Presupuestos**: Kanban board para tracking de propuestas
- **Historial de Contactos**: Registro de todas las comunicaciones
- **Datos Persistentes**: Almacenamiento local con localStorage
- **Responsive Design**: Funciona en desktop, tablet y mobile

## Stack tecnológico

- **Frontend**: React 18 + Vite
- **Estilos**: Tailwind CSS + shadcn/ui
- **UI Components**: Radix UI
- **Data**: localStorage (sin backend requerido)
- **Deploy**: Vercel

## Datos Iniciales

El CRM viene precargado con:
- ~1,200 clientes potenciales
- Presupuestos de ejemplo para 2026
- Pipeline de ventas de demostración

Los datos se almacenan en el navegador y persisten entre sesiones.

## Documentación

- [Vite Docs](https://vitejs.dev)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel Deployment](https://vercel.com/docs)
