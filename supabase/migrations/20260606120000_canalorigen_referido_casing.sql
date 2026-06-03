-- Normalizar canal de origen: REFERIDO -> Referido (alineado con UI y filtros Pipeline)
UPDATE public.consulta
SET canalorigen = 'Referido'
WHERE upper(trim(canalorigen)) = 'REFERIDO';

UPDATE public.contacto
SET canalorigen = 'Referido'
WHERE upper(trim(canalorigen)) = 'REFERIDO';
