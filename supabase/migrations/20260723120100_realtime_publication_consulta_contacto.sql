-- Declara en migraciones las tablas que usePipelineRealtime necesita en la
-- publicación supabase_realtime.
--
-- Hasta ahora solo public.pipelinestage estaba agregada por migración
-- (20260613120000_pipelinestage_admin.sql); consulta se había habilitado a mano
-- desde el dashboard y contacto no estaba contemplada. src/hooks/usePipelineRealtime.js
-- ahora suscribe también a contacto para refrescar la lista de contactos del resto
-- de las sesiones cuando se guarda un presupuesto con contacto nuevo; sin esta
-- publicación esa suscripción quedaría muda.
--
-- Idempotente: mismo patrón que la migración de pipelinestage.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.consulta;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contacto;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
