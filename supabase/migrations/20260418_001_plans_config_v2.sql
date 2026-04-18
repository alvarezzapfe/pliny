-- ============================================================================
-- MIGRACIÓN: plans_config v2 + onb_lenders plan_slug + grandfathering +
--            client_features extendido + vistas con security_invoker + RLS
-- Fecha:     2026-04-18
-- Objetivo:  Centralizar límites y feature gates por tier en lugar de
--            hardcodear. Soportar grandfathering de clientes actuales.
-- ============================================================================
-- CONVENCIÓN: -1 = ilimitado, 0 = deshabilitado
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. REFACTOR plans_config: agregar columnas de límites y metadata
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE plans_config
  ADD COLUMN IF NOT EXISTS price_mxn          numeric(10,2),
  ADD COLUMN IF NOT EXISTS slug               text UNIQUE,
  ADD COLUMN IF NOT EXISTS name               text,
  ADD COLUMN IF NOT EXISTS is_custom          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS applicant_limit    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flow_limit         integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS storage_mb         integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS api_rate_limit     integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ekatena_limit      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_users          integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ai_analysis        text DEFAULT 'none'
    CHECK (ai_analysis IN ('none', 'basic', 'custom')),
  ADD COLUMN IF NOT EXISTS custom_domain      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_events     text[] DEFAULT ARRAY['applicant.completed'],
  ADD COLUMN IF NOT EXISTS email_templates    text DEFAULT 'basic'
    CHECK (email_templates IN ('basic', 'custom', 'whitelabel')),
  ADD COLUMN IF NOT EXISTS data_retention_days integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS active             boolean DEFAULT true;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. SEED los 3 tiers con los valores acordados (idempotente)
-- ════════════════════════════════════════════════════════════════════════════

-- Desactivar rows legacy (sin slug) para que no colisionen
UPDATE plans_config SET active = false WHERE slug IS NULL;

INSERT INTO plans_config (
  slug, name, price_mxn, is_custom,
  applicant_limit, flow_limit, storage_mb, api_rate_limit,
  ekatena_limit, max_users, ai_analysis,
  custom_domain, webhook_events, email_templates,
  data_retention_days, active, updated_at
) VALUES
  -- ── Basic ─────────────────────────────────────────────────────────────
  (
    'basic', 'Basic', 1499.00, false,
    50,   -- applicants/mes
    1,    -- 1 flow activo
    500,  -- 500 MB storage
    100,  -- 100 req/min
    10,   -- 10 verificaciones Ekatena sandbox/mes
    1,    -- 1 usuario
    'none',
    false,
    ARRAY['applicant.completed'],
    'basic',
    90,   -- 90 días retención
    true, now()
  ),
  -- ── Pro ───────────────────────────────────────────────────────────────
  (
    'pro', 'Pro', 4999.00, false,
    500,  -- applicants/mes
    -1,   -- flows ilimitados
    5120, -- 5 GB storage
    500,  -- 500 req/min
    -1,   -- Ekatena sandbox ilimitado
    3,    -- 3 usuarios
    'basic',
    false,
    ARRAY['applicant.completed','applicant.created','status.changed','document.uploaded'],
    'custom',
    365,  -- 1 año retención
    true, now()
  ),
  -- ── Enterprise ────────────────────────────────────────────────────────
  (
    'enterprise', 'Enterprise', 15000.00, true,
    -1, -1, -1, -1,  -- todo ilimitado
    -1,               -- Ekatena producción ilimitado
    -1,               -- usuarios ilimitados
    'custom',
    true,
    ARRAY['applicant.completed','applicant.created','status.changed','document.uploaded'],
    'whitelabel',
    -1,   -- retención ilimitada
    true, now()
  )
ON CONFLICT (slug) DO UPDATE SET
  name                = EXCLUDED.name,
  price_mxn           = EXCLUDED.price_mxn,
  is_custom           = EXCLUDED.is_custom,
  applicant_limit     = EXCLUDED.applicant_limit,
  flow_limit          = EXCLUDED.flow_limit,
  storage_mb          = EXCLUDED.storage_mb,
  api_rate_limit      = EXCLUDED.api_rate_limit,
  ekatena_limit       = EXCLUDED.ekatena_limit,
  max_users           = EXCLUDED.max_users,
  ai_analysis         = EXCLUDED.ai_analysis,
  custom_domain       = EXCLUDED.custom_domain,
  webhook_events      = EXCLUDED.webhook_events,
  email_templates     = EXCLUDED.email_templates,
  data_retention_days = EXCLUDED.data_retention_days,
  active              = EXCLUDED.active,
  updated_at          = now();

-- ════════════════════════════════════════════════════════════════════════════
-- 3. onb_lenders: agregar plan_slug FK + columnas de grandfathering
-- ════════════════════════════════════════════════════════════════════════════

-- 3a. plan_slug — vínculo directo lender → tier (elimina join indirecto
--     vía plinius_profiles que dependía de user_id)
ALTER TABLE onb_lenders
  ADD COLUMN IF NOT EXISTS plan_slug              text DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS is_grandfathered       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_monthly_price_mxn numeric(10,2) DEFAULT NULL;

-- 3b. FK a plans_config(slug) — solo si no existe ya
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_onb_lenders_plan'
      AND table_name = 'onb_lenders'
  ) THEN
    ALTER TABLE onb_lenders
      ADD CONSTRAINT fk_onb_lenders_plan
      FOREIGN KEY (plan_slug) REFERENCES plans_config(slug);
  END IF;
END $$;

-- 3c. Backfill: sincronizar plan_slug desde plinius_profiles para lenders
--     que ya tienen user_id asignado
UPDATE onb_lenders ol
SET plan_slug = pp.plan
FROM plinius_profiles pp
WHERE pp.user_id = ol.user_id
  AND pp.plan IS NOT NULL
  AND pp.plan IN (SELECT slug FROM plans_config WHERE active = true);

-- 3d. Grandfathering: marcar SOLO lenders que realmente usan la plataforma:
--     - tienen applicants reales (count > 0 en onb_applicants)
--     - fueron creados antes del 2026-04-01 (corte pre-pricing nuevo)
--     Excluye cuentas de prueba, internas y recién creadas.
UPDATE onb_lenders
SET is_grandfathered = true
WHERE active = true
  AND created_at < '2026-04-01T00:00:00Z'
  AND id IN (
    SELECT DISTINCT lender_id
    FROM onb_applicants
  );

COMMENT ON COLUMN onb_lenders.is_grandfathered IS
  'true = cliente anterior al cambio de pricing (pre 2026-04-01, con applicants reales). Respeta legacy_monthly_price_mxn si está seteado.';
COMMENT ON COLUMN onb_lenders.legacy_monthly_price_mxn IS
  'Precio mensual acordado antes del nuevo pricing. NULL = usa precio estándar del plan.';
COMMENT ON COLUMN onb_lenders.plan_slug IS
  'Plan tier del lender. FK a plans_config(slug). Default: basic.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. EXTENDER client_features: agregar nivel (no solo boolean)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE client_features
  ADD COLUMN IF NOT EXISTS level    text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

COMMENT ON COLUMN client_features.level IS
  'Nivel del feature (e.g. ai_analysis: none/basic/custom). NULL = usa enabled boolean.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. VISTAS con security_invoker = true
-- ════════════════════════════════════════════════════════════════════════════

-- 5a. plan_limits: user_id → todos sus límites de plan
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
JOIN plans_config pc ON pc.slug = pp.plan AND pc.active = true;

ALTER VIEW plan_limits SET (security_invoker = true);

-- 5b. lender_plan_limits: lender_id → sus límites (ahora usa plan_slug directo)
CREATE OR REPLACE VIEW lender_plan_limits AS
SELECT
  ol.id                     AS lender_id,
  ol.slug                   AS lender_slug,
  ol.name                   AS lender_name,
  ol.plan_slug              AS plan,
  ol.is_grandfathered,
  ol.legacy_monthly_price_mxn,
  pc.price_mxn              AS standard_price_mxn,
  -- El precio efectivo: legacy si existe, sino estándar
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
LEFT JOIN plans_config pc ON pc.slug = ol.plan_slug AND pc.active = true;

ALTER VIEW lender_plan_limits SET (security_invoker = true);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. RLS: asegurar que authenticated puede SELECT las tablas de las vistas
-- ════════════════════════════════════════════════════════════════════════════

-- 6a. plans_config — lectura pública (es catálogo de precios)
ALTER TABLE plans_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_config_select_authenticated ON plans_config;
CREATE POLICY plans_config_select_authenticated ON plans_config
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Solo service_role puede modificar planes
DROP POLICY IF EXISTS plans_config_all_service ON plans_config;
CREATE POLICY plans_config_all_service ON plans_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6b. client_features — cada usuario ve solo sus propios features
ALTER TABLE client_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_features_select_own ON client_features;
CREATE POLICY client_features_select_own ON client_features
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- service_role puede leer/escribir todo
DROP POLICY IF EXISTS client_features_all_service ON client_features;
CREATE POLICY client_features_all_service ON client_features
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6c. plinius_profiles — cada usuario ve solo su propio perfil
ALTER TABLE plinius_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plinius_profiles_select_own ON plinius_profiles;
CREATE POLICY plinius_profiles_select_own ON plinius_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS plinius_profiles_all_service ON plinius_profiles;
CREATE POLICY plinius_profiles_all_service ON plinius_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_plans_config_slug_active
  ON plans_config (slug) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_client_features_user_feature
  ON client_features (user_id, feature);

CREATE INDEX IF NOT EXISTS idx_onb_applicants_lender_created
  ON onb_applicants (lender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onb_lenders_plan_slug
  ON onb_lenders (plan_slug);

-- ════════════════════════════════════════════════════════════════════════════
-- 8. COMENTARIOS de documentación (convención -1 = ilimitado)
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN plans_config.applicant_limit IS
  'Máximo de applicants/mes. -1 = ilimitado. 0 = deshabilitado.';
COMMENT ON COLUMN plans_config.flow_limit IS
  'Máximo de flows activos por lender. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.storage_mb IS
  'Storage de documentos en MB. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.ekatena_limit IS
  'Verificaciones Ekatena/mes. -1 = ilimitado (sandbox en Pro, prod en Enterprise).';
COMMENT ON COLUMN plans_config.max_users IS
  'Usuarios por cuenta de lender. -1 = ilimitado.';
COMMENT ON COLUMN plans_config.ai_analysis IS
  'Nivel de análisis AI: none (Basic), basic (Pro), custom (Enterprise).';
COMMENT ON COLUMN plans_config.data_retention_days IS
  'Días de retención de datos de applicants. -1 = ilimitado.';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. MANUAL: Setear precio legacy del cliente grandfathered
--    Correr DESPUÉS de validar con Paulina el monto exacto.
-- ════════════════════════════════════════════════════════════════════════════
-- UPDATE onb_lenders
-- SET legacy_monthly_price_mxn = XXX.XX
-- WHERE slug = 'slug-del-cliente';
-- ════════════════════════════════════════════════════════════════════════════

COMMIT;
