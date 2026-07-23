-- Configuración global de la aplicación (fila única id = 1).
--
-- Fuente de verdad para el Modo Mantenimiento y, a futuro, otras banderas globales
-- (versión mínima, anuncios, feature flags). Toda la app lee esta fila; se mantiene
-- sincronizada en tiempo real vía Supabase Realtime.
--
-- Control exclusivo del equipo dev: la tabla es de SOLO LECTURA para cualquier
-- sesión (anon o authenticated, incluido el rol ADMIN del CRM). No hay política de
-- escritura, así que RLS bloquea todo INSERT/UPDATE/DELETE desde la app. El único
-- que puede cambiar maintenance_mode es el service_role / el SQL Editor del
-- dashboard, que saltean RLS. No hay panel de administración en la app.

CREATE TABLE IF NOT EXISTS public.app_config (
  id integer PRIMARY KEY CHECK (id = 1),
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text NOT NULL DEFAULT 'Estamos realizando tareas de mantenimiento. Volveremos en unos minutos.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fila única id = 1 (idempotente).
INSERT INTO public.app_config (id, maintenance_mode, maintenance_message)
VALUES (1, false, 'Estamos realizando tareas de mantenimiento. Volveremos en unos minutos.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cubre anon + authenticated. Necesario para bloquear también la
-- pantalla de login y para que Realtime entregue el cambio a cualquier cliente.
DROP POLICY IF EXISTS app_config_select_policy ON public.app_config;
CREATE POLICY app_config_select_policy
ON public.app_config
FOR SELECT
USING (true);

-- Sin políticas de INSERT/UPDATE/DELETE a propósito: RLS niega toda escritura desde
-- la app. Solo el dashboard / service_role (equipo dev) modifica la fila.

-- Realtime (ignore if already added).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
