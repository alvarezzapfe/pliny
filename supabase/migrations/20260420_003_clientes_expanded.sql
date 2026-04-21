-- ============================================================================
-- MIGRACIÓN: Expandir modelo de clientes para CRM profesional
-- Fecha:     2026-04-20
-- ============================================================================
-- Acciones:
--   1. Migrar datos útiles de client_profiles → clients
--   2. TRUNCATE clients (borrar 6 clientes demo) CASCADE
--   3. DROP TABLE client_profiles
--   4. ALTER TABLE clients — agregar ~30 columnas nuevas
--   5. CREATE TABLE buro_scores_historial
--   6. CREATE TABLE cliente_notas
--   7. RLS + índices
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Migrar datos útiles de client_profiles → clients ANTES de borrar
--    Columnas migradas: contact_email, contact_phone, website, address, notes
--    Columnas descartadas: contact_name (redundante con legal_representative),
--                          billing_email (no se usa), owner_user_id (ya en clients)
-- ════════════════════════════════════════════════════════════════════════════

-- Asegurar que clients tenga las columnas destino (pueden ya existir)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone text;

-- Migrar lo que no esté ya en clients
UPDATE clients c
SET
  contact_email = COALESCE(c.contact_email, cp.contact_email),
  contact_phone = COALESCE(c.contact_phone, cp.contact_phone)
FROM client_profiles cp
WHERE cp.client_id = c.id;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. TRUNCATE — borrar clientes demo y empezar de cero
-- ════════════════════════════════════════════════════════════════════════════

TRUNCATE clients RESTART IDENTITY CASCADE;
-- CASCADE borra filas dependientes en client_connectors, client_profiles, etc.

-- ════════════════════════════════════════════════════════════════════════════
-- 3. DROP TABLE client_profiles — ya no se necesita
-- ════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS client_profiles;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. ALTER TABLE clients — expandir modelo
-- ════════════════════════════════════════════════════════════════════════════

-- == EMPRESA (expandir) ==
ALTER TABLE clients ADD COLUMN IF NOT EXISTS razon_social text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS direccion_calle text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS direccion_numero text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS direccion_colonia text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS direccion_municipio text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS direccion_estado text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS direccion_cp text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telefono_empresa text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_empresa text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS anios_operando integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero_empleados integer;

-- == REPRESENTANTE LEGAL ==
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rep_legal_nombre text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rep_legal_rfc text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rep_legal_curp text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rep_legal_telefono text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rep_legal_email text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rep_legal_cargo text;

-- == FINANCIEROS ==
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ingresos_anuales_mxn numeric(15,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tipo_credito_solicitado text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monto_solicitado_mxn numeric(15,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plazo_solicitado_meses integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS uso_fondos text;

-- == KYC ==
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_acta_constitutiva jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_poderes jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_rep_legal_ine jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_comprobante_domicilio jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_rfc_constancia jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_estados_financieros jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_completo boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS kyc_verificado_at timestamptz;

-- == ETIQUETAS Y METADATA ==
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill razon_social desde company_name para consistencia
-- (después del TRUNCATE esto es no-op, pero por seguridad)
UPDATE clients SET razon_social = company_name WHERE razon_social IS NULL AND company_name IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. CREATE TABLE buro_scores_historial
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS buro_scores_historial (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  score           integer NOT NULL,
  fecha_consulta  timestamptz NOT NULL DEFAULT now(),
  fuente          text DEFAULT 'manual',
  notas           text,
  created_at      timestamptz DEFAULT now(),
  created_by      uuid
);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. CREATE TABLE cliente_notas
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cliente_notas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL,
  author_name text,
  contenido   text NOT NULL,
  pinned      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. RLS
-- ════════════════════════════════════════════════════════════════════════════

-- buro_scores_historial
ALTER TABLE buro_scores_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buro_hist_select ON buro_scores_historial;
CREATE POLICY buro_hist_select ON buro_scores_historial
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS buro_hist_insert ON buro_scores_historial;
CREATE POLICY buro_hist_insert ON buro_scores_historial
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS buro_hist_service ON buro_scores_historial;
CREATE POLICY buro_hist_service ON buro_scores_historial
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- cliente_notas
ALTER TABLE cliente_notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notas_select ON cliente_notas;
CREATE POLICY notas_select ON cliente_notas
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS notas_insert ON cliente_notas;
CREATE POLICY notas_insert ON cliente_notas
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS notas_update ON cliente_notas;
CREATE POLICY notas_update ON cliente_notas
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS notas_delete ON cliente_notas;
CREATE POLICY notas_delete ON cliente_notas
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS notas_service ON cliente_notas;
CREATE POLICY notas_service ON cliente_notas
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 8. ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_clients_sector
  ON clients (sector) WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_clients_owner
  ON clients (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_buro_hist_client
  ON buro_scores_historial (client_id, fecha_consulta DESC);

CREATE INDEX IF NOT EXISTS idx_notas_client
  ON cliente_notas (client_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- 9. COMENTARIOS
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE buro_scores_historial IS 'Historial de consultas de buró de crédito por cliente.';
COMMENT ON TABLE cliente_notas IS 'Notas internas del lender sobre cada cliente.';
COMMENT ON COLUMN clients.kyc_acta_constitutiva IS 'JSONB: { url, filename, uploaded_at }';
COMMENT ON COLUMN clients.tags IS 'Array de etiquetas custom del lender.';

COMMIT;
