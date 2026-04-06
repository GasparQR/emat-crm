# EMAT CRM

Sistema CRM para WhatsApp Sales de EMAT (Empresa de Aislación Fibra Celulosa).

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

### Configurar Variables de Entorno en Vercel

En el dashboard de Vercel:
1. Ir a **Settings → Environment Variables**
2. Agregar las variables necesarias para tu backend
3. Deploy automático al hacer push a `main`

## Scripts disponibles

```bash
npm run dev          # Ejecutar en desarrollo
npm run build        # Build para producción
npm run preview      # Preview del build
npm run lint         # Ejecutar ESLint
npm run lint:fix     # Arreglar errores de ESLint
npm run typecheck    # TypeScript check
```

## Stack tecnológico

- **Frontend**: React 18 + Vite
- **Estilos**: Tailwind CSS + shadcn/ui
- **UI Components**: Radix UI
- **Build**: Vite
- **Deploy**: Vercel

## Documentación

- [Vite Docs](https://vitejs.dev)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
