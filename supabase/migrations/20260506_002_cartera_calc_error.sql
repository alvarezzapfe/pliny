-- ============================================================================
-- MIGRACIÓN: Cartera valuaciones — agregar calc_error, n_creditos_calculados,
--            y status 'completed_with_errors'
-- Fecha:     2026-05-06
-- Depende de: 20260506_001_cartera_valuaciones.sql
-- ============================================================================

BEGIN;

-- 1. Agregar columna calc_error a créditos individuales
ALTER TABLE cartera_valuaciones_creditos
  ADD COLUMN IF NOT EXISTS calc_error text;

COMMENT ON COLUMN cartera_valuaciones_creditos.calc_error IS
  'NULL = cálculo exitoso. String = mensaje de error. Excluido de agregados.';

-- 2. Agregar n_creditos_calculados al padre
ALTER TABLE cartera_valuaciones
  ADD COLUMN IF NOT EXISTS n_creditos_calculados integer;

COMMENT ON COLUMN cartera_valuaciones.n_creditos_calculados IS
  'Créditos que calcularon sin error. Puede ser < n_creditos.';

-- 3. Drop cualquier CHECK constraint existente sobre status (nombre puede variar)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'cartera_valuaciones'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE cartera_valuaciones DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 4. Recrear CHECK con 'completed_with_errors' incluido
ALTER TABLE cartera_valuaciones
  ADD CONSTRAINT cartera_valuaciones_status_check
  CHECK (status IN ('processing', 'completed', 'completed_with_errors', 'error'));

COMMIT;
