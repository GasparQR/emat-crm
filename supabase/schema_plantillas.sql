-- ============================================================
-- Tablas para Plantillas WhatsApp y Variables de Plantillas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── plantillawhatsapp ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS plantillawhatsapp (
  id                 TEXT        PRIMARY KEY,
  workspace_id       TEXT        NOT NULL DEFAULT 'local',
  nombre_plantilla   TEXT,
  "nombrePlantilla"  TEXT,
  categoria_producto TEXT,
  "categoriaProducto" TEXT,
  etapa              TEXT,
  contenido          TEXT,
  activa             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para filtros por workspace
CREATE INDEX IF NOT EXISTS idx_plantillawhatsapp_workspace
  ON plantillawhatsapp (workspace_id);

-- Habilitar Row Level Security
ALTER TABLE plantillawhatsapp ENABLE ROW LEVEL SECURITY;

-- Política: acceso público (ajustar cuando se implemente auth real)
CREATE POLICY "allow_all_plantillawhatsapp"
  ON plantillawhatsapp
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── variableplantilla ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS variableplantilla (
  id           TEXT        PRIMARY KEY,
  workspace_id TEXT        NOT NULL DEFAULT 'local',
  clave        TEXT        NOT NULL,
  valor        TEXT        NOT NULL,
  descripcion  TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para filtros por workspace
CREATE INDEX IF NOT EXISTS idx_variableplantilla_workspace
  ON variableplantilla (workspace_id);

-- Habilitar Row Level Security
ALTER TABLE variableplantilla ENABLE ROW LEVEL SECURITY;

-- Política: acceso público (ajustar cuando se implemente auth real)
CREATE POLICY "allow_all_variableplantilla"
  ON variableplantilla
  FOR ALL
  USING (true)
  WITH CHECK (true);
