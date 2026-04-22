-- ============================================================================
-- MIGRACIÓN: Permitir lectura anónima de plans_config (landing page)
-- Fecha:     2026-04-22
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS plans_config_select_anon ON plans_config;
CREATE POLICY plans_config_select_anon ON plans_config
  FOR SELECT TO anon
  USING (active = true);

COMMIT;
