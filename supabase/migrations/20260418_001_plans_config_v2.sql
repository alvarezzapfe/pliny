-- ============================================================================
-- MIGRACIÓN: plans_config v2 — columnas tipadas para feature gates,
--            onb_lenders.plan_id + grandfathering, client_features extendido,
--            vistas con security_invoker, RLS policies
-- Fecha:     2026-04-18
-- ============================================================================
-- CONVENCIÓN: -1 = ilimitado, 0 = deshabilitado
-- NO toca: price_usd, price_mxn, features (jsonb), limits (jsonb)
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. ALTER TABLE plans_config — agregar 12 columnas tipadas
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE plans_config
  ADD COLUMN IF NOT EXISTS applicant_limit     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flow_limit          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_mb          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS api_rate_limit      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ekatena_limit       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_users           integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ai_analysis         text    NOT NULL DEFAULT 'none'
    CHECK (ai_analysis IN ('none', 'basic', 'custom')),
  ADD COLUMN IF NOT EXISTS custom_domain       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_events      text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS email_templates     text    NOT NULL DEFAULT 'basic'
    CHECK (email_templates IN ('basic', 'custom', 'whitelabel')),
  ADD COLUMN IF NOT EXISTS data_retention_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS is_custom           boolean NOT NULL DEFAULT false;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. UPDATE plans_config — backfill columnas tipadas para free/basic/pro
--    NO toca price_usd, price_mxn, features, limits, label, description
-- ════════════════════════════════════════════════════════════════════════════

-- ── free ─────────────────────────────────────────────────────────────────
UPDATE plans_config SET
  applicant_limit     = 0,
  flow_limit          = 0,
  storage_mb          = 0,
  api_rate_limit      = 0,
  ekatena_limit       = 0,
  max_users           = 1,
  ai_analysis         = 'none',
  custom_domain       = false,
  webhook_events      = '{}',
  email_templates     = 'basic',
  data_retention_days = 30,
  is_custom           = false
WHERE id = 'free';

-- ── basic ────────────────────────────────────────────────────────────────
UPDATE plans_config SET
  applicant_limit     = 50,
  flow_limit          = 1,
  storage_mb          = 500,
  api_rate_limit      = 100,
  ekatena_limit       = 10,
  max_users           = 2,
  ai_analysis         = 'none',
  custom_domain       = false,
  webhook_events      = ARRAY['applicant.completed','applicant.created'],
  email_templates     = 'basic',
  data_retention_days = 90,
  is_custom           = false
WHERE id = 'basic';

-- ── pro ──────────────────────────────────────────────────────────────────
UPDATE plans_config SET
  applicant_limit     = 500,
  flow_limit          = -1,
  storage_mb          = 5120,
  api_rate_limit      = 500,
  ekatena_limit       = -1,
  max_users           = 5,
  ai_analysis         = 'basic',
  custom_domain       = false,
  webhook_events      = ARRAY['applicant.completed','applicant.created','status.changed','document.uploaded'],
  email_templates     = 'custom',
  data_retention_days = 365,
  is_custom           = false
WHERE id = 'pro';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. INSERT enterprise — precio NULL para que se llene desde super admin
--    features y limits jsonb vacíos (se llenan desde /admin/producto)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO plans_config (
  id, label, price_usd, price_mxn, description,
  features, limits, active,
  applicant_limit, flow_limit, storage_mb, api_rate_limit,
  ekatena_limit, max_users, ai_analysis,
  custom_domain, webhook_events, email_templates,
  data_retention_days, is_custom, updated_at
) VALUES (
  'enterprise', 'Enterprise', NULL, NULL,
  'Para operaciones de alto volumen con soporte dedicado.',
  '[]'::jsonb, '{}'::jsonb, true,
  -1, -1, -1, -1,
  -1, -1, 'custom',
  true,
  ARRAY['applicant.completed','applicant.created','status.changed','document.uploaded'],
  'whitelabel',
  -1, true, now()
)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. ALTER TABLE onb_lenders — plan_id FK + grandfathering
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE onb_lenders
  ADD COLUMN IF NOT EXISTS plan_id                 text        DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS is_grandfathered        boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_monthly_price_mxn numeric(10,2) DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_onb_lenders_plan'
      AND table_name = 'onb_lenders'
  ) THEN
    ALTER TABLE onb_lenders
      ADD CONSTRAINT fk_onb_lenders_plan
      FOREIGN KEY (plan_id) REFERENCES plans_config(id);
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Backfill onb_lenders.plan_id desde plinius_profiles
-- ════════════════════════════════════════════════════════════════════════════

UPDATE onb_lenders ol
SET plan_id = pp.plan
FROM plinius_profiles pp
WHERE pp.user_id = ol.user_id
  AND pp.plan IS NOT NULL
  AND pp.plan IN (SELECT id FROM plans_config WHERE active = true);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Grandfathering — solo lenders activos, pre 2026-04-01, con applicants
--    reales. NO setea legacy_monthly_price_mxn (ver bloque manual al final)
-- ════════════════════════════════════════════════════════════════════════════

UPDATE onb_lenders
SET is_grandfathered = true
WHERE active = true
  AND created_at < '2026-04-01T00:00:00Z'
  AND id IN (
    SELECT DISTINCT lender_id
    FROM onb_applicants
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 7. ALTER TABLE client_features — agregar level y metadata
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE client_features
  ADD COLUMN IF NOT EXISTS level    text  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Vistas, RLS, índices
-- ════════════════════════════════════════════════════════════════════════════

-- ── 8a. Vista plan_limits (user_id → límites tipados) ────────────────────

CREATE OR REPLACE VIEW plan_limits AS
SELECT
  pp.user_id,
  pp.plan,
  pc.price_mxn,
  pc.applicant_limit,
  pc.flow_limit,
  pc.storage_mb,
  pc.api_rate_limit,
  pc.ekatena_limit,
  pc.max_users,
  pc.ai_analysis,
  pc.custom_domain,
  pc.webhook_events,
  pc.email_templates,
  pc.data_retention_days
FROM plinius_profiles pp
JOIN plans_config pc ON pc.id = pp.plan AND pc.active = true;

ALTER VIEW plan_limits SET (security_invoker = true);

-- ── 8b. Vista lender_plan_limits (lender_id → límites + pricing) ─────────

CREATE OR REPLACE VIEW lender_plan_limits AS
SELECT
  ol.id                      AS lender_id,
  ol.slug                    AS lender_slug,
  ol.name                    AS lender_name,
  ol.plan_id                 AS plan,
  ol.is_grandfathered,
  ol.legacy_monthly_price_mxn,
  pc.price_mxn               AS standard_price_mxn,
  COALESCE(ol.legacy_monthly_price_mxn, pc.price_mxn)
                             AS effective_price_mxn,
  pc.applicant_limit,
  pc.flow_limit,
  pc.storage_mb,
  pc.api_rate_limit,
  pc.ekatena_limit,
  pc.max_users,
  pc.ai_analysis,
  pc.custom_domain,
  pc.webhook_events,
  pc.email_templates,
  pc.data_retention_days
FROM onb_lenders ol
LEFT JOIN plans_config pc ON pc.id = ol.plan_id AND pc.active = true;

ALTER VIEW lender_plan_limits SET (security_invoker = true);

-- ── 8c. RLS — plans_config ───────────────────────────────────────────────

ALTER TABLE plans_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_config_select_authenticated ON plans_config;
CREATE POLICY plans_config_select_authenticated ON plans_config
  FOR SELECT TO authenticated
  USING (active = true);

DROP POLICY IF EXISTS plans_config_all_service ON plans_config;
CREATE POLICY plans_config_all_service ON plans_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 8d. RLS — client_features ────────────────────────────────────────────

ALTER TABLE client_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_features_select_own ON client_features;
CREATE POLICY client_features_select_own ON client_features
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS client_features_all_service ON client_features;
CREATE POLICY client_features_all_service ON client_features
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 8e. RLS — plinius_profiles ───────────────────────────────────────────

ALTER TABLE plinius_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plinius_profiles_select_own ON plinius_profiles;
CREATE POLICY plinius_profiles_select_own ON plinius_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS plinius_profiles_all_service ON plinius_profiles;
CREATE POLICY plinius_profiles_all_service ON plinius_profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 8f. Índices ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_plans_config_id_active
  ON plans_config (id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_client_features_user_feature
  ON client_features (user_id, feature);

CREATE INDEX IF NOT EXISTS idx_onb_applicants_lender_created
  ON onb_applicants (lender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onb_lenders_plan_id
  ON onb_lenders (plan_id);

-- ── 8g. Comentarios ──────────────────────────────────────────────────────

COMMENT ON COLUMN plans_config.applicant_limit     IS 'Máximo de applicants/mes. -1 = ilimitado. 0 = deshabilitado.';
COMMENT ON COLUMN plans_config.flow_limit          IS 'Máximo de flows activos por lender. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.storage_mb          IS 'Storage de documentos en MB. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.api_rate_limit      IS 'Requests por minuto. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.ekatena_limit       IS 'Verificaciones Ekatena/mes. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.max_users           IS 'Usuarios por cuenta de lender. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.ai_analysis         IS 'Nivel de análisis AI: none | basic | custom.';
COMMENT ON COLUMN plans_config.data_retention_days IS 'Días de retención de datos de applicants. -1 = ilimitado.';
COMMENT ON COLUMN onb_lenders.plan_id              IS 'Plan tier del lender. FK a plans_config(id). Default: basic.';
COMMENT ON COLUMN onb_lenders.is_grandfathered     IS 'Cliente pre 2026-04-01 con uso real. Respeta legacy_monthly_price_mxn si está seteado.';
COMMENT ON COLUMN onb_lenders.legacy_monthly_price_mxn IS 'Precio mensual acordado antes del nuevo pricing. NULL = usa precio estándar del plan.';
COMMENT ON COLUMN client_features.level            IS 'Nivel del feature (e.g. ai_analysis: none/basic/custom). NULL = usa enabled boolean.';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. MANUAL — Setear precio legacy del cliente grandfathered
--    Correr DESPUÉS de validar con Paulina el monto exacto.
-- ════════════════════════════════════════════════════════════════════════════
-- UPDATE onb_lenders
-- SET legacy_monthly_price_mxn = XXX.XX
-- WHERE slug = 'slug-del-cliente';
-- ════════════════════════════════════════════════════════════════════════════
