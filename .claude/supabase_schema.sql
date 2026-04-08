-- ============================================================
-- EMAT Celulosa CRM — Schema completo Supabase
-- Ejecutar en Supabase SQL Editor (proyecto: ywbgeqjqjfnhldqqqklj)
-- ============================================================

-- ─── CONSULTA (Presupuestos) ────────────────────────────────
CREATE TABLE IF NOT EXISTS "Consulta" (
  id                  TEXT PRIMARY KEY,
  workspace_id        TEXT NOT NULL DEFAULT 'workspace_default',
  nroPpto             INTEGER,
  contactoNombre      TEXT,
  contactoWhatsapp    TEXT,
  empresa             TEXT,
  email               TEXT,
  asesor              TEXT,
  tipoAplicacion      TEXT,
  ubicacionObra       TEXT,
  provincia           TEXT,
  superficieM2        NUMERIC,
  fibraKg             NUMERIC,
  adhLts              NUMERIC,
  kmObra              NUMERIC,
  tipoCliente         TEXT,
  canalOrigen         TEXT,
  importe             NUMERIC,
  etapa               TEXT DEFAULT 'NUEVO LEAD',
  mes                 TEXT,
  ano                 INTEGER,
  fechaConsulta       DATE,
  proximoSeguimiento  DATE,
  ultimoContacto      DATE,
  observaciones       TEXT,
  razonPerdida        TEXT,
  primerMensaje       TEXT,
  created_date        TIMESTAMPTZ DEFAULT NOW(),
  updated_date        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consulta_workspace ON "Consulta"(workspace_id);
CREATE INDEX IF NOT EXISTS idx_consulta_etapa ON "Consulta"(etapa);
CREATE INDEX IF NOT EXISTS idx_consulta_nroppto ON "Consulta"(nroPpto DESC);
CREATE INDEX IF NOT EXISTS idx_consulta_asesor ON "Consulta"(asesor);

-- ─── CONTACTO ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Contacto" (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL DEFAULT 'workspace_default',
  nombre          TEXT NOT NULL,
  empresa         TEXT,
  whatsapp        TEXT,
  telefonoDisplay TEXT,
  email           TEXT,
  ciudad          TEXT,
  provincia       TEXT,
  segmento        TEXT,
  canalOrigen     TEXT,
  notas           TEXT,
  etapaPipeline   TEXT,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacto_workspace ON "Contacto"(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacto_nombre ON "Contacto"(nombre);

-- ─── PIPELINE STAGE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PipelineStage" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  nombre       TEXT NOT NULL,
  orden        INTEGER DEFAULT 0,
  activa       BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_workspace ON "PipelineStage"(workspace_id);

-- ─── PLANTILLA WHATSAPP ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlantillaWhatsApp" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  nombre       TEXT NOT NULL,
  mensaje      TEXT,
  variables    TEXT[],
  activa       BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plantilla_workspace ON "PlantillaWhatsApp"(workspace_id);

-- ─── ENVIO WHATSAPP ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EnvioWhatsApp" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  contactoId   TEXT,
  plantillaId  TEXT,
  mensaje      TEXT,
  estado       TEXT DEFAULT 'enviado',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_envio_workspace ON "EnvioWhatsApp"(workspace_id);

-- ─── HISTORIAL ENVIOS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HistorialEnvios" (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL DEFAULT 'workspace_default',
  contactoNombre  TEXT,
  whatsapp        TEXT,
  mensaje         TEXT,
  plantillaNombre TEXT,
  estado          TEXT DEFAULT 'enviado',
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_workspace ON "HistorialEnvios"(workspace_id);

-- ─── LISTA WHATSAPP ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ListaWhatsApp" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  contactos    JSONB DEFAULT '[]',
  activa       BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lista_workspace ON "ListaWhatsApp"(workspace_id);

-- ─── VARIABLE PLANTILLA ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "VariablePlantilla" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  nombre       TEXT NOT NULL,
  valor        TEXT,
  descripcion  TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variable_workspace ON "VariablePlantilla"(workspace_id);

-- ─── USUARIO ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Usuario" (
  id                      TEXT PRIMARY KEY,
  workspace_id            TEXT NOT NULL DEFAULT 'workspace_default',
  nombre                  TEXT,
  email                   TEXT,
  rol                     TEXT DEFAULT 'asesor',
  consulta_follow_up_days INTEGER DEFAULT 3,
  created_date            TIMESTAMPTZ DEFAULT NOW(),
  updated_date            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_workspace ON "Usuario"(workspace_id);

-- ─── VENTA ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Venta" (
  id                       TEXT PRIMARY KEY,
  workspace_id             TEXT NOT NULL DEFAULT 'workspace_default',
  codigo                   TEXT,
  fecha                    DATE,
  nombreSnapshot           TEXT,
  productoSnapshot         TEXT,
  modelo                   TEXT,
  marketplace              TEXT,
  estado                   TEXT DEFAULT 'Finalizada',
  costo                    NUMERIC,
  ganancia                 NUMERIC,
  moneda                   TEXT DEFAULT 'ARS',
  proveedorId              TEXT,
  proveedorNombreSnapshot  TEXT,
  notas                    TEXT,
  created_date             TIMESTAMPTZ DEFAULT NOW(),
  updated_date             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venta_workspace ON "Venta"(workspace_id);
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON "Venta"(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_venta_proveedor ON "Venta"(proveedorId);

-- ─── PROVEEDOR ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Proveedor" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  nombre       TEXT NOT NULL,
  whatsapp     TEXT,
  email        TEXT,
  categorias   TEXT[],
  verificado   BOOLEAN DEFAULT FALSE,
  activo       BOOLEAN DEFAULT TRUE,
  notas        TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedor_workspace ON "Proveedor"(workspace_id);

-- ─── POSTVENTA ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Postventa" (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL DEFAULT 'workspace_default',
  ventaId         TEXT,
  consultaId      TEXT,
  contactoNombre  TEXT,
  tipo            TEXT,
  descripcion     TEXT,
  estado          TEXT DEFAULT 'pendiente',
  fechaResolucion DATE,
  created_date    TIMESTAMPTZ DEFAULT NOW(),
  updated_date    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postventa_workspace ON "Postventa"(workspace_id);

-- ─── MENSAJE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Mensaje" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  de           TEXT,
  para         TEXT,
  contenido    TEXT,
  tipo         TEXT DEFAULT 'whatsapp',
  leido        BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensaje_workspace ON "Mensaje"(workspace_id);

-- ─── CLIENTE (legacy, por compatibilidad) ───────────────────
CREATE TABLE IF NOT EXISTS "Cliente" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  nombre       TEXT,
  empresa      TEXT,
  whatsapp     TEXT,
  email        TEXT,
  ciudad       TEXT,
  provincia    TEXT,
  notas        TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRESUPUESTO (legacy, por compatibilidad) ───────────────
CREATE TABLE IF NOT EXISTS "Presupuesto" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  clienteId    TEXT,
  importe      NUMERIC,
  estado       TEXT,
  notas        TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKSPACE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Workspace" (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT 'EMAT Celulosa',
  owner_user_id  TEXT,
  created_date   TIMESTAMPTZ DEFAULT NOW(),
  updated_date   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKSPACE MEMBER ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'workspace_default',
  user_id      TEXT,
  rol          TEXT DEFAULT 'member',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- Por ahora deshabilitado (sin auth). Activar cuando se implemente Supabase Auth.
-- ============================================================

ALTER TABLE "Consulta"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Contacto"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PlantillaWhatsApp" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "EnvioWhatsApp"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HistorialEnvios"   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ListaWhatsApp"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "VariablePlantilla" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Venta"             DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Proveedor"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Postventa"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Mensaje"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Cliente"           DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Presupuesto"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember"   DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Workspace default inicial (necesario para que funcione el CRM)
-- ============================================================

INSERT INTO "Workspace" (id, name, owner_user_id, created_date, updated_date)
VALUES (
  'workspace_default',
  'EMAT Celulosa',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Pipeline stages por defecto
-- ============================================================

INSERT INTO "PipelineStage" (id, workspace_id, nombre, orden, activa, created_date, updated_date)
VALUES
  ('stage_nuevo_lead',    'workspace_default', 'NUEVO LEAD',  1, TRUE, NOW(), NOW()),
  ('stage_a_cotizar',     'workspace_default', 'A COTIZAR',   2, TRUE, NOW(), NOW()),
  ('stage_negociacion',   'workspace_default', 'NEGOCIACION', 3, TRUE, NOW(), NOW()),
  ('stage_ganada',        'workspace_default', 'GANADA',      4, TRUE, NOW(), NOW()),
  ('stage_ejecutada',     'workspace_default', 'EJECUTADA',   5, TRUE, NOW(), NOW()),
  ('stage_pausada',       'workspace_default', 'PAUSADA',     6, TRUE, NOW(), NOW()),
  ('stage_perdida',       'workspace_default', 'PERDIDA',     7, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Verificación
-- ============================================================

SELECT
  'Consulta'          AS tabla, COUNT(*) AS registros FROM "Consulta"
UNION ALL SELECT 'Contacto',          COUNT(*) FROM "Contacto"
UNION ALL SELECT 'PipelineStage',     COUNT(*) FROM "PipelineStage"
UNION ALL SELECT 'PlantillaWhatsApp', COUNT(*) FROM "PlantillaWhatsApp"
UNION ALL SELECT 'Venta',             COUNT(*) FROM "Venta"
UNION ALL SELECT 'Proveedor',         COUNT(*) FROM "Proveedor"
UNION ALL SELECT 'Workspace',         COUNT(*) FROM "Workspace";
