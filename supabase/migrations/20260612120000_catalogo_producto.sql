-- Catálogo de productos/servicios predeterminados por workspace (CRUD admin, lectura para presupuestos)

CREATE TABLE IF NOT EXISTS public.catalogo_producto (
  id              text PRIMARY KEY,
  workspace_id    text NOT NULL DEFAULT 'local',
  nombre          text NOT NULL,
  descripcion     text,
  precio_unitario numeric(14, 2) NOT NULL DEFAULT 0,
  unidad_medida   text NOT NULL DEFAULT 'un',
  activo          boolean NOT NULL DEFAULT true,
  created_date    timestamptz NOT NULL DEFAULT now(),
  updated_date    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_producto_workspace_activo
  ON public.catalogo_producto (workspace_id, activo);

CREATE INDEX IF NOT EXISTS idx_catalogo_producto_workspace_nombre
  ON public.catalogo_producto (workspace_id, nombre);

ALTER TABLE public.catalogo_producto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_producto_select_policy ON public.catalogo_producto;
DROP POLICY IF EXISTS catalogo_producto_write_policy ON public.catalogo_producto;

CREATE POLICY catalogo_producto_select_policy
ON public.catalogo_producto
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.usuario u
    WHERE u.id = auth.uid()::text
      AND u.active = true
  )
);

CREATE POLICY catalogo_producto_write_policy
ON public.catalogo_producto
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

INSERT INTO public.catalogo_producto (id, workspace_id, nombre, descripcion, precio_unitario, unidad_medida, activo)
VALUES
  (
    'catalogo_local_soplado_m2',
    'local',
    'Aplicación soplado celulosa',
    'Suministro e instalación de aislación térmica soplada',
    8500,
    'm²',
    true
  ),
  (
    'catalogo_local_proyectado_m2',
    'local',
    'Aplicación proyectado celulosa',
    'Suministro e instalación de aislación térmica proyectada',
    9200,
    'm²',
    true
  ),
  (
    'catalogo_local_fibra_kg',
    'local',
    'Fibra celulosa a granel',
    'Suministro de fibra celulosa tratada',
    450,
    'kg',
    true
  )
ON CONFLICT (id) DO NOTHING;
