-- ============================================================================
-- MIGRACIÓN: reportes_crediticios — flujo manual asistido por admin
-- Fecha:     2026-04-21
-- ============================================================================
-- NOTA: El bucket de Supabase Storage "reportes-crediticios" debe crearse
-- manualmente desde el dashboard de Supabase (Settings > Storage > New bucket).
-- Configurar como PRIVATE. La migración solo crea tabla + función + RLS.
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. CREATE TABLE reportes_crediticios
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reportes_crediticios (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lender_user_id        uuid NOT NULL,
  estado                text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','procesando','completado','cancelado')),
  solicitado_at         timestamptz DEFAULT now(),
  procesado_at          timestamptz,
  completado_at         timestamptz,
  score                 integer,
  reporte_pdf_url       text,
  reporte_pdf_filename  text,
  admin_notas           text,
  lender_notas          text,
  fuente                text DEFAULT 'buro_empresas_plinius',
  periodo_mes           text NOT NULL,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_reportes_estado
  ON reportes_crediticios (estado)
  WHERE estado IN ('pendiente','procesando');

CREATE INDEX IF NOT EXISTS idx_reportes_lender
  ON reportes_crediticios (lender_user_id, periodo_mes);

CREATE INDEX IF NOT EXISTS idx_reportes_client
  ON reportes_crediticios (client_id, solicitado_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RLS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE reportes_crediticios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reportes_select_lender ON reportes_crediticios;
CREATE POLICY reportes_select_lender ON reportes_crediticios
  FOR SELECT TO authenticated
  USING (lender_user_id = auth.uid());

DROP POLICY IF EXISTS reportes_insert_lender ON reportes_crediticios;
CREATE POLICY reportes_insert_lender ON reportes_crediticios
  FOR INSERT TO authenticated
  WITH CHECK (lender_user_id = auth.uid());

DROP POLICY IF EXISTS reportes_all_service ON reportes_crediticios;
CREATE POLICY reportes_all_service ON reportes_crediticios
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. FUNCIÓN: contar reportes usados en un mes
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_reportes_usados_mes(p_user_id uuid, p_mes text)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM reportes_crediticios
  WHERE lender_user_id = p_user_id
    AND periodo_mes = p_mes
    AND estado != 'cancelado';
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. ALTER plans_config — agregar límite mensual de reportes
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE plans_config
  ADD COLUMN IF NOT EXISTS reportes_crediticios_limite_mes integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN plans_config.reportes_crediticios_limite_mes IS
  'Reportes crediticios por mes. -1 = ilimitado. 0 = deshabilitado.';

-- Backfill valores por plan
UPDATE plans_config SET reportes_crediticios_limite_mes = 0  WHERE id = 'free';
UPDATE plans_config SET reportes_crediticios_limite_mes = 5  WHERE id = 'basic';
UPDATE plans_config SET reportes_crediticios_limite_mes = 25 WHERE id = 'pro';
UPDATE plans_config SET reportes_crediticios_limite_mes = -1 WHERE id = 'enterprise';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. COMENTARIOS
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE reportes_crediticios IS
  'Reportes crediticios solicitados por lenders, procesados manualmente por admin.';
COMMENT ON COLUMN reportes_crediticios.periodo_mes IS
  'Formato YYYY-MM. Usado para control de cuota mensual.';
COMMENT ON COLUMN reportes_crediticios.score IS
  'Score de buró capturado por admin al procesar el reporte.';

COMMIT;
