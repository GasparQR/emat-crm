-- Opcional: recalcular subtotal, iva_value y total_importe desde items (JSON array).
-- Revisar en staging antes de ejecutar en producción.

WITH parsed AS (
  SELECT
    c.id,
    COALESCE(NULLIF(c.iva, 0), 21) AS iva_pct,
    COALESCE(
      (
        SELECT SUM(
          COALESCE(
            NULLIF(elem->>'importe', '')::numeric,
            COALESCE(NULLIF(elem->>'precioUnitario', '')::numeric, NULLIF(elem->>'preciounitario', '')::numeric, 0)
              * COALESCE(NULLIF(elem->>'cantidad', '')::numeric, 0)
          )
        )
        FROM jsonb_array_elements(
          CASE
            WHEN c.items IS NULL OR trim(c.items::text) IN ('', '[]', 'null') THEN '[]'::jsonb
            WHEN left(trim(c.items::text), 1) = '[' THEN c.items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS elem
      ),
      0
    ) AS subtotal
  FROM public.consulta c
)
UPDATE public.consulta c
SET
  subtotal = ROUND(p.subtotal, 2),
  iva_value = ROUND(p.subtotal * p.iva_pct / 100, 2),
  total_importe = ROUND(p.subtotal * (1 + p.iva_pct / 100), 2),
  importe = ROUND(p.subtotal * (1 + p.iva_pct / 100), 2),
  updated_date = now()
FROM parsed p
WHERE c.id = p.id
  AND p.subtotal > 0
  AND (
    c.subtotal IS NULL OR c.subtotal = 0
    OR c.total_importe IS NULL OR c.total_importe = 0
  );
