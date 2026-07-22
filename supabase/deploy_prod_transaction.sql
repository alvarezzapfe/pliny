-- =============================================================================
-- DEPLOY A PRODUCCIÓN — TRANSACCIÓN ÚNICA
-- Fecha: 2026-07-22
-- Ref PROD: gwkupxksietqzwgxvvhu
--
-- Contiene: 001 (tablas) + 002 (backfill + RLS) + verificación pre-commit.
-- Si CUALQUIER verificación falla → RAISE EXCEPTION → ROLLBACK automático.
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: TABLAS, FUNCIONES, TRIGGERS, COLUMNAS  (de 001_empresas_tables.sql)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.empresas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  rfc         text,
  plan        text NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  max_seats   int  NOT NULL DEFAULT 3,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.empresas IS 'Tenant principal. Cada empresa agrupa usuarios, cartera y configuración.';
COMMENT ON COLUMN public.empresas.max_seats IS 'Máximo de asientos (miembros activos + invitaciones pendientes). Default 3.';

CREATE TABLE public.empresa_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'member')),
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive')),
  invited_by  uuid REFERENCES auth.users(id),
  invited_at  timestamptz DEFAULT now(),
  joined_at   timestamptz,
  CONSTRAINT empresa_members_user_unique UNIQUE (user_id)
);

COMMENT ON COLUMN public.empresa_members.user_id IS 'UNIQUE: un usuario solo pertenece a una empresa (1:1).';

CREATE INDEX idx_empresa_members_empresa ON public.empresa_members(empresa_id);

CREATE TABLE public.empresa_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'member')),
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_empresa_invitations_pending
  ON public.empresa_invitations(empresa_id, email)
  WHERE status = 'pending';

CREATE INDEX idx_empresa_invitations_token ON public.empresa_invitations(token);

CREATE OR REPLACE FUNCTION public.empresa_seat_count(eid uuid)
RETURNS int LANGUAGE sql STABLE AS $$
  SELECT count(*)::int FROM (
    SELECT user_id FROM public.empresa_members
     WHERE empresa_id = eid AND status = 'active'
    UNION ALL
    SELECT null FROM public.empresa_invitations
     WHERE empresa_id = eid AND status = 'pending'
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.my_empresa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT empresa_id FROM public.empresa_members
   WHERE user_id = auth.uid() AND status = 'active'
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_empresa_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.empresa_members
   WHERE user_id = auth.uid() AND status = 'active'
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.trg_enforce_max_seats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max_seats int;
  v_current   int;
BEGIN
  SELECT max_seats INTO v_max_seats
    FROM public.empresas WHERE id = NEW.empresa_id FOR UPDATE;
  IF v_max_seats IS NULL THEN
    RAISE EXCEPTION 'Empresa % no existe', NEW.empresa_id;
  END IF;
  v_current := public.empresa_seat_count(NEW.empresa_id);
  IF v_current >= v_max_seats THEN
    RAISE EXCEPTION 'Límite de asientos alcanzado (% de %)', v_current, v_max_seats
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empresa_members_max_seats
  BEFORE INSERT ON public.empresa_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_max_seats();

CREATE TRIGGER trg_empresa_invitations_max_seats
  BEFORE INSERT ON public.empresa_invitations
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_max_seats();

ALTER TABLE public.lenders_profile     ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.clients              ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.credits              ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.client_connectors    ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.reportes_crediticios ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

CREATE INDEX idx_lenders_profile_empresa   ON public.lenders_profile(empresa_id);
CREATE INDEX idx_clients_empresa           ON public.clients(empresa_id);
CREATE INDEX idx_credits_empresa           ON public.credits(empresa_id);
CREATE INDEX idx_client_connectors_empresa ON public.client_connectors(empresa_id);
CREATE INDEX idx_reportes_empresa          ON public.reportes_crediticios(empresa_id);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresas_select_own ON public.empresas
  FOR SELECT USING (id = public.my_empresa_id());
CREATE POLICY empresas_update_owner ON public.empresas
  FOR UPDATE USING (id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');
CREATE POLICY empresas_select_admin ON public.empresas
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));
CREATE POLICY empresas_service ON public.empresas
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY empresa_members_select ON public.empresa_members
  FOR SELECT USING (empresa_id = public.my_empresa_id());
CREATE POLICY empresa_members_insert_owner ON public.empresa_members
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');
CREATE POLICY empresa_members_delete_owner ON public.empresa_members
  FOR DELETE USING (empresa_id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');
CREATE POLICY empresa_members_select_admin ON public.empresa_members
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));
CREATE POLICY empresa_members_service ON public.empresa_members
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY empresa_invitations_select ON public.empresa_invitations
  FOR SELECT USING (empresa_id = public.my_empresa_id());
CREATE POLICY empresa_invitations_insert_owner ON public.empresa_invitations
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');
CREATE POLICY empresa_invitations_update_owner ON public.empresa_invitations
  FOR UPDATE USING (empresa_id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');
CREATE POLICY empresa_invitations_delete_owner ON public.empresa_invitations
  FOR DELETE USING (empresa_id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');
CREATE POLICY empresa_invitations_select_admin ON public.empresa_invitations
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));
CREATE POLICY empresa_invitations_service ON public.empresa_invitations
  TO service_role USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: BACKFILL + RLS  (de 002_empresas_backfill_rls.sql)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Fase 1: Detección de huérfanos ──
DO $orphans$
DECLARE
  v_clients_orphans    int;
  v_credits_orphans    int;
  v_connectors_orphans int;
  v_reportes_orphans   int;
BEGIN
  SELECT count(*) INTO v_clients_orphans
    FROM public.clients c
   WHERE NOT EXISTS (SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = c.owner_user_id);
  SELECT count(*) INTO v_credits_orphans
    FROM public.credits cr
   WHERE NOT EXISTS (SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = cr.created_by);
  SELECT count(*) INTO v_connectors_orphans
    FROM public.client_connectors cc
   WHERE NOT EXISTS (SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = cc.owner_user_id);
  SELECT count(*) INTO v_reportes_orphans
    FROM public.reportes_crediticios rc
   WHERE NOT EXISTS (SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = rc.lender_user_id);

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'REPORTE DE HUÉRFANOS:';
  RAISE NOTICE '  clients:              %', v_clients_orphans;
  RAISE NOTICE '  credits:              %', v_credits_orphans;
  RAISE NOTICE '  client_connectors:    %', v_connectors_orphans;
  RAISE NOTICE '  reportes_crediticios: %', v_reportes_orphans;
  RAISE NOTICE '══════════════════════════════════════════════════';

  IF v_clients_orphans + v_credits_orphans + v_connectors_orphans + v_reportes_orphans > 0 THEN
    RAISE EXCEPTION 'ABORT: HAY FILAS HUÉRFANAS → ROLLBACK. clients=%, credits=%, connectors=%, reportes=%',
      v_clients_orphans, v_credits_orphans, v_connectors_orphans, v_reportes_orphans;
  END IF;
END $orphans$;

-- ── Fase 2: Backfill ──

-- 1. Crear empresa por cada lenders_profile
INSERT INTO public.empresas (id, name, rfc, plan, created_at)
SELECT
  lp.id,
  COALESCE(NULLIF(trim(lp.institution_name), ''),
    'SIN NOMBRE — REVISAR (owner: ' || COALESCE(u.email, lp.owner_id::text) || ')'),
  lp.rfc,
  COALESCE(pp.plan, 'free'),
  lp.created_at
FROM public.lenders_profile lp
LEFT JOIN public.plinius_profiles pp ON pp.user_id = lp.owner_id
LEFT JOIN auth.users u ON u.id = lp.owner_id
ON CONFLICT (id) DO NOTHING;

-- 2. Registrar owners
INSERT INTO public.empresa_members (empresa_id, user_id, role, status, joined_at)
SELECT lp.id, lp.owner_id, 'owner', 'active', lp.created_at
FROM public.lenders_profile lp
ON CONFLICT (user_id) DO NOTHING;

-- 3. empresa_id en lenders_profile
UPDATE public.lenders_profile SET empresa_id = id WHERE empresa_id IS NULL;

-- 4. empresa_id en clients
UPDATE public.clients c SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = c.owner_user_id AND c.empresa_id IS NULL;

-- 5. empresa_id en credits
UPDATE public.credits cr SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = cr.created_by AND cr.empresa_id IS NULL;

-- 6. empresa_id en client_connectors
UPDATE public.client_connectors cc SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = cc.owner_user_id AND cc.empresa_id IS NULL;

-- 7. empresa_id en reportes_crediticios
UPDATE public.reportes_crediticios rc SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = rc.lender_user_id AND rc.empresa_id IS NULL;

-- ── Fase 2b: Verificación post-backfill ──
DO $postcheck$
DECLARE
  v_lp int; v_cl int; v_cr int; v_cc int; v_rc int;
BEGIN
  SELECT count(*) INTO v_lp FROM public.lenders_profile     WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cl FROM public.clients              WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cr FROM public.credits              WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cc FROM public.client_connectors    WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_rc FROM public.reportes_crediticios WHERE empresa_id IS NULL;

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'POST-BACKFILL (empresa_id IS NULL):';
  RAISE NOTICE '  lenders_profile:      %', v_lp;
  RAISE NOTICE '  clients:              %', v_cl;
  RAISE NOTICE '  credits:              %', v_cr;
  RAISE NOTICE '  client_connectors:    %', v_cc;
  RAISE NOTICE '  reportes_crediticios: %', v_rc;
  RAISE NOTICE '══════════════════════════════════════════════════';

  IF v_lp + v_cl + v_cr + v_cc + v_rc > 0 THEN
    RAISE EXCEPTION 'ABORT: Filas con empresa_id NULL → ROLLBACK. lp=%, cl=%, cr=%, cc=%, rc=%',
      v_lp, v_cl, v_cr, v_cc, v_rc;
  END IF;

  RAISE NOTICE 'POST-BACKFILL OK: todas las filas tienen empresa_id';
END $postcheck$;

-- ── Fase 3: Actualización de políticas RLS ──

DROP POLICY IF EXISTS lenders_profile_select_own ON public.lenders_profile;
DROP POLICY IF EXISTS lenders_profile_insert_own ON public.lenders_profile;
DROP POLICY IF EXISTS lenders_profile_update_own ON public.lenders_profile;

CREATE POLICY lenders_profile_select_empresa ON public.lenders_profile
  FOR SELECT USING (empresa_id = public.my_empresa_id());
CREATE POLICY lenders_profile_insert_owner ON public.lenders_profile
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');
CREATE POLICY lenders_profile_update_owner ON public.lenders_profile
  FOR UPDATE USING (empresa_id = public.my_empresa_id() AND public.my_empresa_role() = 'owner');

DROP POLICY IF EXISTS clients_select_own ON public.clients;
DROP POLICY IF EXISTS clients_insert_own ON public.clients;
DROP POLICY IF EXISTS clients_update_own ON public.clients;
DROP POLICY IF EXISTS clients_delete_own ON public.clients;

CREATE POLICY clients_select_empresa ON public.clients
  FOR SELECT USING (empresa_id = public.my_empresa_id());
CREATE POLICY clients_insert_empresa ON public.clients
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id());
CREATE POLICY clients_update_empresa ON public.clients
  FOR UPDATE USING (empresa_id = public.my_empresa_id());
CREATE POLICY clients_delete_empresa ON public.clients
  FOR DELETE USING (empresa_id = public.my_empresa_id());

DROP POLICY IF EXISTS credits_own ON public.credits;

CREATE POLICY credits_select_empresa ON public.credits
  FOR SELECT USING (empresa_id = public.my_empresa_id());
CREATE POLICY credits_insert_empresa ON public.credits
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id());
CREATE POLICY credits_update_empresa ON public.credits
  FOR UPDATE USING (empresa_id = public.my_empresa_id());
CREATE POLICY credits_delete_empresa ON public.credits
  FOR DELETE USING (empresa_id = public.my_empresa_id());

DROP POLICY IF EXISTS cc_select_own ON public.client_connectors;
DROP POLICY IF EXISTS cc_insert_own ON public.client_connectors;
DROP POLICY IF EXISTS cc_update_own ON public.client_connectors;

CREATE POLICY cc_select_empresa ON public.client_connectors
  FOR SELECT USING (empresa_id = public.my_empresa_id());
CREATE POLICY cc_insert_empresa ON public.client_connectors
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id());
CREATE POLICY cc_update_empresa ON public.client_connectors
  FOR UPDATE USING (empresa_id = public.my_empresa_id());

DROP POLICY IF EXISTS reportes_select_lender ON public.reportes_crediticios;
DROP POLICY IF EXISTS reportes_insert_lender ON public.reportes_crediticios;

CREATE POLICY reportes_select_empresa ON public.reportes_crediticios
  FOR SELECT USING (empresa_id = public.my_empresa_id());
CREATE POLICY reportes_insert_empresa ON public.reportes_crediticios
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id());

DROP POLICY IF EXISTS buro_hist_select ON public.buro_scores_historial;
DROP POLICY IF EXISTS buro_hist_insert ON public.buro_scores_historial;

CREATE POLICY buro_hist_select_empresa ON public.buro_scores_historial
  FOR SELECT TO authenticated USING (
    client_id IN (SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()));
CREATE POLICY buro_hist_insert_empresa ON public.buro_scores_historial
  FOR INSERT TO authenticated WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()));

DROP POLICY IF EXISTS notas_select ON public.cliente_notas;
DROP POLICY IF EXISTS notas_insert ON public.cliente_notas;
DROP POLICY IF EXISTS notas_update ON public.cliente_notas;
DROP POLICY IF EXISTS notas_delete ON public.cliente_notas;

CREATE POLICY notas_select_empresa ON public.cliente_notas
  FOR SELECT TO authenticated USING (
    client_id IN (SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()));
CREATE POLICY notas_insert_empresa ON public.cliente_notas
  FOR INSERT TO authenticated WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()));
CREATE POLICY notas_update_empresa ON public.cliente_notas
  FOR UPDATE TO authenticated USING (
    client_id IN (SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()));
CREATE POLICY notas_delete_empresa ON public.cliente_notas
  FOR DELETE TO authenticated USING (
    client_id IN (SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()));


-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 3: VERIFICACIÓN PRE-COMMIT FINAL
-- Si CUALQUIER check falla → RAISE EXCEPTION → ROLLBACK de todo.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $final$
DECLARE
  v_lp  int; v_cl int; v_cr int; v_cc int; v_rc int;
  v_empresas int; v_members int;
BEGIN
  SELECT count(*) INTO v_lp FROM public.lenders_profile     WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cl FROM public.clients              WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cr FROM public.credits              WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cc FROM public.client_connectors    WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_rc FROM public.reportes_crediticios WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_empresas FROM public.empresas;
  SELECT count(*) INTO v_members  FROM public.empresa_members;

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN PRE-COMMIT FINAL:';
  RAISE NOTICE '  empresa_id NULL en lenders_profile:      %', v_lp;
  RAISE NOTICE '  empresa_id NULL en clients:              %', v_cl;
  RAISE NOTICE '  empresa_id NULL en credits:              %', v_cr;
  RAISE NOTICE '  empresa_id NULL en client_connectors:    %', v_cc;
  RAISE NOTICE '  empresa_id NULL en reportes_crediticios: %', v_rc;
  RAISE NOTICE '  Empresas creadas:                        %', v_empresas;
  RAISE NOTICE '  Members creados:                         %', v_members;
  RAISE NOTICE '════════════════════════════════════════════════';

  IF v_lp + v_cl + v_cr + v_cc + v_rc > 0 THEN
    RAISE EXCEPTION 'ABORT: Hay filas con empresa_id NULL → ROLLBACK. lp=%, cl=%, cr=%, cc=%, rc=%',
      v_lp, v_cl, v_cr, v_cc, v_rc;
  END IF;

  IF v_empresas < 5 THEN
    RAISE EXCEPTION 'ABORT: Solo % empresas creadas, esperaba 5 → ROLLBACK', v_empresas;
  END IF;

  IF v_members < 5 THEN
    RAISE EXCEPTION 'ABORT: Solo % members creados, esperaba 5 → ROLLBACK', v_members;
  END IF;

  RAISE NOTICE 'PRE-COMMIT OK: 0 NULLs, % empresas, % members — seguro hacer COMMIT', v_empresas, v_members;
END $final$;

COMMIT;
