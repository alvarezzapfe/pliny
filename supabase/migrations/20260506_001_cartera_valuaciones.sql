-- ============================================================================
-- MIGRACIÓN: Valuador de Cartera — schema de valuaciones, créditos, audit
-- Fecha:     2026-05-06
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. cartera_valuaciones — una por upload
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cartera_valuaciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  nombre              text,
  discount_rate       numeric(8,6) NOT NULL,
  n_creditos          integer NOT NULL,
  saldo_total_mxn     numeric(15,2),
  npv_total_mxn       numeric(15,2),
  el_total_mxn        numeric(15,2),
  yield_ponderado     numeric(8,4),
  duration_ponderada  numeric(8,4),
  wal_ponderado       numeric(8,4),
  stress_grid         jsonb,
  concentracion       jsonb,
  status              text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing','completed','error')),
  created_at          timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. cartera_valuaciones_creditos — N rows por valuación
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cartera_valuaciones_creditos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valuacion_id          uuid NOT NULL REFERENCES cartera_valuaciones(id) ON DELETE CASCADE,
  folio_credito         text NOT NULL,
  deudor                text NOT NULL,
  sector                text NOT NULL,
  tipo_credito          text NOT NULL,
  monto_original_mxn    numeric(15,2),
  saldo_insoluto_mxn    numeric(15,2),
  tasa_nominal_anual    numeric(8,6),
  fecha_originacion     date,
  fecha_vencimiento     date NOT NULL,
  plazo_meses_original  integer,
  periodicidad_pago     text,
  dpd                   integer DEFAULT 0,
  pd                    numeric(6,4),
  lgd                   numeric(6,4),
  garantia_tipo         text,
  garantia_valor_mxn    numeric(15,2),
  pd_lgd_source         text DEFAULT 'provided'
    CHECK (pd_lgd_source IN ('provided','estimated')),
  originacion_inferred  boolean DEFAULT false,
  npv                   numeric(15,2),
  ytm                   numeric(8,6),
  duration_macaulay     numeric(8,4),
  duration_modified     numeric(8,4),
  wal                   numeric(8,4),
  expected_loss         numeric(15,2),
  risk_adjusted_npv     numeric(15,2),
  schedule              jsonb,

  CONSTRAINT chk_fecha_o_plazo CHECK (
    fecha_originacion IS NOT NULL OR plazo_meses_original IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. audit_log — genérica, extensible
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  event_type  text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. RLS
-- ════════════════════════════════════════════════════════════════════════════

-- cartera_valuaciones
ALTER TABLE cartera_valuaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cv_select_own ON cartera_valuaciones;
CREATE POLICY cv_select_own ON cartera_valuaciones
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS cv_insert_own ON cartera_valuaciones;
CREATE POLICY cv_insert_own ON cartera_valuaciones
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cv_all_service ON cartera_valuaciones;
CREATE POLICY cv_all_service ON cartera_valuaciones
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- cartera_valuaciones_creditos — INSERT solo service_role vía endpoint (default deny para authenticated)
ALTER TABLE cartera_valuaciones_creditos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cvc_select_own ON cartera_valuaciones_creditos;
CREATE POLICY cvc_select_own ON cartera_valuaciones_creditos
  FOR SELECT TO authenticated
  USING (valuacion_id IN (
    SELECT id FROM cartera_valuaciones WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS cvc_all_service ON cartera_valuaciones_creditos;
CREATE POLICY cvc_all_service ON cartera_valuaciones_creditos
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- audit_log — INSERT solo service_role (default deny para authenticated por ausencia de policy de INSERT)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS al_select_own ON audit_log;
CREATE POLICY al_select_own ON audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS al_all_service ON audit_log;
CREATE POLICY al_all_service ON audit_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Índices
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cv_user_created
  ON cartera_valuaciones (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cvc_valuacion
  ON cartera_valuaciones_creditos (valuacion_id);

CREATE INDEX IF NOT EXISTS idx_cvc_folio
  ON cartera_valuaciones_creditos (folio_credito);

CREATE INDEX IF NOT EXISTS idx_al_user_created
  ON audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_al_event_type
  ON audit_log (event_type);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Comentarios
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE cartera_valuaciones IS 'Cada upload de cartera genera una valuación con métricas agregadas.';
COMMENT ON TABLE cartera_valuaciones_creditos IS 'Créditos individuales de una valuación con métricas calculadas server-side.';
COMMENT ON TABLE audit_log IS 'Audit trail genérico. event_type=cartera_upload para uploads de cartera.';
COMMENT ON COLUMN cartera_valuaciones.discount_rate IS 'Tasa de descuento usada en la valuación. Permite auditar y recalcular.';
COMMENT ON COLUMN cartera_valuaciones_creditos.pd_lgd_source IS 'provided = usuario subió valores, estimated = defaults por sector.';

COMMIT;
