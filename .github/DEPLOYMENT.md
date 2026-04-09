# 🚀 Deployment Guide — EMAT CRM

Guía completa para deployar EMAT CRM en Vercel con Supabase backend.

---

## 📋 Pre-requisitos

- ✅ GitHub cuenta con repo `GasparQR/emat-crm`
- ✅ Vercel account (vercel.com) — conectado a GitHub
- ✅ Supabase project creado (https://app.supabase.com)
- ✅ PR #34 mergeado a `main`

---

## 🔧 Configuración Supabase

### Paso 1: Obtener Credenciales

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto (o crea uno nuevo si aún no existe)
3. Ir a **Settings → API**
4. Copiar:
   - **Project URL** → Extract PROJECT_ID (ej: `https://ywbgeqjqjfnhldqqqklj.supabase.co` → `ywbgeqjqjfnhldqqqklj`)
   - **Anon/Public Key** → `sb_publishable_*` (tiene formato específico)

### Paso 2: Verificar Variables Locales (Dev)

En tu máquina local, crea `.env.local` basado en `.env.example`:

```bash
# .env.local (NO COMMITS — .gitignore lo protege)
VITE_APP_BASE_URL=http://localhost:5173
VITE_SUPABASE_PROJECT_ID=ywbgeqjqjfnhldqqqklj
VITE_SUPABASE_ANON_KEY=sb_publishable_tTjxPIfD_RqADONQwLdJTg_8Xj6iPJx
```

Verifica que funciona localmente:
```bash
npm run dev    # debe cargar sin errores de env vars
npm run lint   # 0 errores
npm run build  # debe generar dist/ sin errores
```

---

## 🌐 Deployment en Vercel

### Paso 1: Conectar GitHub Repo

1. Ve a https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Selecciona **Import Git Repository**
4. Busca y selecciona `GasparQR/emat-crm`
5. Vercel detectará automáticamente:
   - ✅ Framework: Vite
   - ✅ Build Command: `npm run build`
   - ✅ Output Directory: `dist`

### Paso 2: Configurar Environment Variables

En el formulario de importación (o luego en **Project Settings → Environment Variables**):

Agregar estas variables:

| Variable | Valor | Notas |
|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | `ywbgeqjqjfnhldqqqklj` | Tu Supabase Project ID |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_*` | Tu Supabase Anon Key |
| `VITE_APP_BASE_URL` | `https://emat-crm.vercel.app` | (opcional, Vercel deduce automáticamente) |

**⚠️ NO incluyas en .env.example:**
- Valores reales
- Keys secretas
- Project IDs activos

### Paso 3: Deploy

1. Click **Deploy**
2. Vercel automáticamente:
   - ✅ Clona el repo
   - ✅ Instala dependencias (`npm install`)
   - ✅ Corre build (`npm run build`)
   - ✅ Deploya `dist/` a CDN global
3. Espera ~2-3 minutos
4. Verás URL: `https://emat-crm.vercel.app` (o tu dominio custom)

---

## ✅ Post-Deployment Checks

### 1. Health Check Frontend

```bash
curl -I https://emat-crm.vercel.app
# ✅ Debe devolver: HTTP 200 OK
```

### 2. Verificar en Browser

1. Abre https://emat-crm.vercel.app
2. Abre DevTools → **Console**
3. Verifica que NO hay errores:
   - ❌ `VITE_SUPABASE_PROJECT_ID no configurada`
   - ❌ `VITE_SUPABASE_ANON_KEY no configurada`
4. Haz login (demo@emat.com / password)
5. Navega por el app

### 3. Vercel Dashboard

En https://vercel.com

| Check | Debe estar | Status |
|---|---|---|
| **Deployments** | Ver "Production" verde | ✅ |
| **Environment** | Variables visibles | ✅ |
| **Build Logs** | `✓ Built` sin errores | ✅ |
| **Domains** | `emat-crm.vercel.app` | ✅ |

---

## 🔄 Continuous Deployment (CD)

**Automático:** Cada push a `main` → Vercel auto-deploya

```bash
# Workflow automático:
git push origin main
  ↓
GitHub → Vercel webhook trigger
  ↓
Vercel instala → build → deploy
  ↓
Production actualizado (2-3 min)
```

---

## 🐛 Troubleshooting

### Error: "VITE_SUPABASE_PROJECT_ID no está configurada"

**Causa:** Env variables no configuradas en Vercel

**Solución:**
1. Ir a https://vercel.com/dashboard
2. Selecciona proyecto `emat-crm`
3. **Settings → Environment Variables**
4. Agregar missing variables
5. Re-deploy (click **Deployments** → último deploy → **Redeploy**)

---

### Error: "Cannot connect to Supabase"

**Causa:** Supabase credentials incorrectas o proyecto no existe

**Solución:**
1. Verificar Project ID correcto en vercel.json env vars
2. Verificar Anon Key es correcta (comienza con `sb_publishable_`)
3. En Supabase, confirmar que tablas existen
4. Verificar RLS policies no bloquean anon access

---

### Build falla en Vercel pero pasa localmente

**Causa:** Diferencia Node.js version o dependencias

**Solución:**
1. Crear `vercel.json` (✅ ya existe)
2. Especificar Node version explícitamente:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "nodejs": "18"
   }
   ```
3. Re-deploy

---

## 📱 Dominio Custom

Si queres usar `emat-crm.tudominio.com` en lugar de vercel.app:

1. En Vercel: **Project Settings → Domains**
2. Agregar dominio
3. Vercel te da **CNAME records** para DNS
4. En tu DNS provider (GoDaddy, Cloudflare, etc.):
   - Agregar CNAME como Vercel indica
   - Esperar propagación (5-30 min)

---

## 🔐 Seguridad Post-Deploy

Checklist:

- [ ] `.env.local` NO está en GitHub (`.gitignore` lo protege)
- [ ] `.env.example` tiene **placeholders** (no valores reales)
- [ ] Variables secretas están SOLO en Vercel (not in code)
- [ ] Supabase RLS policies están habilitadas
- [ ] No hay logs con datos sensibles

---

## 📊 Monitoreo

En Vercel Dashboard → **Analytics** puedes ver:

| Métrica | Ubicación | Útil para |
|---|---|---|
| **Page Performance** | Analytics | Detectar páginas lentas |
| **Error Tracking** | Logs | Bugs en producción |
| **Deployment History** | Deployments | Rollback si necesario |
| **Environment Status** | Project Settings | Verify env vars |

---

## 🔄 Rollback (si algo explota)

Si necesitas revertir a deploy anterior:

1. En Vercel: **Deployments**
2. Selecciona deploy anterior que funcionaba
3. Click **Promote to Production**

O desde GitHub:
```bash
git revert HEAD  # Revierte último commit
git push origin main
# Vercel auto-triggers new deploy con revert
```

---

## 📞 Support

Si algo no funciona:

1. **Vercel Logs:** Check deploy logs en Vercel dashboard
2. **Browser Console:** DevTools → Console para errores frontend
3. **Supabase Status:** Verificar https://status.supabase.com
4. **GitHub Issues:** Crear issue con error específico

---

**Last Updated:** April 9, 2026  
**Status:** Production Ready ✅
