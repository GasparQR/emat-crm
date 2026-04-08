# 🚀 Guía de Migración a Supabase

Esta guía explica cómo migrar todos los datos de localStorage a Supabase para EMAT Celulosa CRM.

## 📋 Requisitos

- Cuenta Supabase (gratuita en https://supabase.com)
- Project ID: `ywbgeqjqjfnhldqqqklj`
- Publishable Key: `sb_publishable_tTjxPIfD_RqADONQwLdJTg_8Xj6iPJx`
- Service Role Key (obtener desde Supabase Dashboard)

## 🔧 Paso 1: Crear las Tablas en Supabase

1. Ir a https://app.supabase.com
2. Seleccionar proyecto `ywbgeqjqjfnhldqqqklj`
3. Ir a **SQL Editor** (izquierda)
4. Crear nueva query
5. Copiar y pegar todo el contenido de `.claude/supabase_schema.sql`
6. Ejecutar (Cmd+Enter)

**Tablas creadas:**
- ✅ Consulta (presupuestos)
- ✅ Contacto
- ✅ PipelineStage
- ✅ PlantillaWhatsApp
- ✅ EnvioWhatsApp
- ✅ Usuario

## 🗂️ Paso 2: Migrar los Datos

### Opción A: Script Automático (Recomendado)

```bash
# 1. Instalar dependencias Python
pip3 install supabase

# 2. Obtener la SERVICE ROLE KEY de Supabase
# Dashboard → Settings → API → Service Role

# 3. Ejecutar migración
cd /Users/gaspar
python3 .claude/migrate_to_supabase.py
```

El script pedirá la Service Role Key y migrarás automáticamente:
- 1,246+ Consultas
- 1,118 Contactos
- Pipeline Stages

### Opción B: Manual via Supabase Dashboard

1. Descargar seed_data.json como JSON
2. En Supabase Dashboard → Table Editor
3. Click en tabla → Insert → Paste from JSON
4. Copiar datos de presupuestos/clientes/stages

## 🔑 Paso 3: Configurar Variables de Entorno

1. Copiar `.env.example` a `.env.local`
2. Actualizar con tu Publishable Key:

```env
VITE_SUPABASE_ANON_KEY=sb_publishable_tTjxPIfD_RqADONQwLdJTg_8Xj6iPJx
```

## 💻 Paso 4: Activar Supabase en la Aplicación

### Opción A: Reemplazar Cliente (Producción)

```bash
# Backup del archivo actual
cp src/api/base44Client.js src/api/base44Client.js.backup

# Reemplazar con Supabase
cp src/api/supabaseClient.js src/api/base44Client.js
```

### Opción B: Dual Mode (Testing)

Mantener ambos clientes y cambiar según variable:

En `src/api/base44Client.js`:

```javascript
// Al inicio del archivo
const USE_SUPABASE = process.env.VITE_USE_SUPABASE === 'true';

if (USE_SUPABASE) {
  export { base44 } from './supabaseClient.js';
} else {
  // ... código original localStorage
}
```

En `.env.local`:
```env
VITE_USE_SUPABASE=true
```

## 🧪 Paso 5: Verificar la Migración

```bash
# 1. Iniciar dev server
npm run dev

# 2. Abrir la app en http://localhost:5173

# 3. Verificar:
- [ ] Home muestra número correcto de presupuestos
- [ ] Pipeline carga sin errores
- [ ] Pueden editar presupuestos
- [ ] Pueden crear nuevos presupuestos
- [ ] WhatsApp button aparece en tarjetas
- [ ] Nuevo presupuesto dialog funciona
```

## 📊 Monitoreo

En Supabase Dashboard, ver:
- **SQL Editor**: Ejecutar queries de verificación
- **Table Editor**: Ver datos en tiempo real
- **Logs**: Monitorear errores

### Query de verificación:

```sql
SELECT
  'Consulta' as tabla, COUNT(*) as registros
FROM Consulta
UNION ALL
SELECT 'Contacto', COUNT(*) FROM Contacto
UNION ALL
SELECT 'PipelineStage', COUNT(*) FROM PipelineStage;
```

## ⚠️ Problemas Comunes

### Error: "VITE_SUPABASE_ANON_KEY no está configurada"

- Verificar que `.env.local` existe
- Reiniciar dev server después de cambios en .env
- Vite no recarga .env automáticamente

### Error: "Table not found"

- Ejecutar SQL schema desde Supabase SQL Editor
- Verificar que las tablas están en PUBLIC schema
- No ejecutar las migraciones dos veces

### Datos no aparecen después de migrar

- Verificar que insert fue exitoso (ver Supabase Logs)
- Hacer hard refresh (Cmd+Shift+R)
- Limpiar localStorage: `localStorage.clear()` en console

## 🔄 Rollback (Volver a localStorage)

Si algo falla, volver a localStorage es simple:

```bash
# Restaurar archivo original
cp src/api/base44Client.js.backup src/api/base44Client.js

# Limpiar .env
# VITE_USE_SUPABASE=false

# Reiniciar dev server
npm run dev
```

## 📝 Notas de Implementación

- **IDs**: Mantienen formato `{tabla}_{timestamp}_{random}` para compatibilidad
- **Timestamps**: Todos en ISO 8601 (created_date, updated_date automáticos)
- **workspace_id**: Siempre "local" (single tenant)
- **Auth**: Actualmente usa usuario mock, implementar real auth después

## 🚀 Próximos Pasos

1. Implementar Real-time subscription (Supabase WebSockets)
2. Agregar autenticación real con Supabase Auth
3. Agregar Storage para archivos (facturas, documentos)
4. Backups automáticos

## 📞 Soporte

Si hay errores:

1. Verificar logs en Supabase Dashboard
2. Ver console de navegador (F12 → Console)
3. Comparar estructura de datos entre localStorage y Supabase

---

**Status**: 🟡 En desarrollo - Las tablas están creadas, falta completar migración de datos
