-- Fecha de cierre comercial al pasar a GANADA o EJECUTADA (sin backfill histórico)

ALTER TABLE public.consulta
  ADD COLUMN IF NOT EXISTS fecha_ganado date NULL;

COMMENT ON COLUMN public.consulta.fecha_ganado IS
  'Fecha de cierre comercial; se completa al pasar a GANADA o EJECUTADA.';

CREATE OR REPLACE FUNCTION public.set_fecha_ganado_on_won_stage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pipeline_stage IN ('GANADA', 'EJECUTADA')
     AND NEW.fecha_ganado IS NULL
  THEN
    IF TG_OP = 'INSERT' THEN
      NEW.fecha_ganado := CURRENT_DATE;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.pipeline_stage IS NULL
         OR OLD.pipeline_stage NOT IN ('GANADA', 'EJECUTADA')
      THEN
        NEW.fecha_ganado := CURRENT_DATE;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consulta_set_fecha_ganado_insert ON public.consulta;
CREATE TRIGGER trg_consulta_set_fecha_ganado_insert
  BEFORE INSERT ON public.consulta
  FOR EACH ROW
  EXECUTE FUNCTION public.set_fecha_ganado_on_won_stage();

DROP TRIGGER IF EXISTS trg_consulta_set_fecha_ganado_update ON public.consulta;
CREATE TRIGGER trg_consulta_set_fecha_ganado_update
  BEFORE UPDATE ON public.consulta
  FOR EACH ROW
  EXECUTE FUNCTION public.set_fecha_ganado_on_won_stage();
