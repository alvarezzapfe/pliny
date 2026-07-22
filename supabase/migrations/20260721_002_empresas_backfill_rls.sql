-- =============================================================================
-- MIGRACIÓN 2/3: Backfill de datos + actualización de RLS existente
-- Autor: Claude Code + Luis Alvarez
-- Fecha: 2026-07-21
-- Branch: feat/multi-user-empresas  (NO aplicar en prod sin revisión)
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ NOTA SOBRE ENTORNO DE EJECUCIÓN:                                      │
-- │                                                                        │
-- │ EN PROYECTO TEMPORAL (Supabase free de prueba):                        │
-- │   Las tablas lenders_profile, clients, credits, etc. estarán VACÍAS.  │
-- │   El backfill (Fase 2) no moverá datos reales — solo valida que el    │
-- │   SQL sea sintácticamente correcto y que las políticas RLS se creen.  │
-- │   El aislamiento real se prueba con datos ficticios del archivo 003.  │
-- │                                                                        │
-- │ EN PRODUCCIÓN (deploy real):                                           │
-- │   El backfill (Fase 2) migrará las 5 empresas reales + su cartera:    │
-- │     - PorCuanto (pro), Prueba (free), InfraFinanzas (pro),            │
-- │       CAPIPROM (free), Aethera (free)                                 │
-- │   La Fase 1 verificará huérfanos y la Fase 2 verificará que           │
-- │   empresa_id quede lleno en todas las filas ANTES de activar RLS.     │
-- │   Ver DEPLOY_PROD.md para el checklist de despliegue seguro.          │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- AJUSTE 5: Columnas verificadas contra schema_prod.sql (2026-07-21):
--   lenders_profile: institution_name (text, nullable), rfc (text, nullable),
--                    owner_id (uuid), id (uuid)
--   plinius_profiles: user_id (uuid PK), plan (text: free/basic/pro)
--   clients:                owner_user_id (uuid)
--   credits:                created_by    (uuid)
--   client_connectors:      owner_user_id (uuid)
--   reportes_crediticios:   lender_user_id (uuid)
--   buro_scores_historial:  client_id (uuid) → clients  (sin empresa_id directo)
--   cliente_notas:          client_id (uuid) → clients  (sin empresa_id directo)
--
-- AUDITORÍA DE DATOS REALES (2026-07-21, conteo en prod):
--   Huérfanos: 0 en TODAS las tablas.
--   Lenders sin nombre: 0.
--   Totales: 5 lenders, 4 clients, 5 credits, 2 connectors, 1 reporte.
--
-- ORDEN CRÍTICO (verificación 3):
--   Statements 1-9  = BACKFILL  (llenan empresa_id en todas las filas)
--   Statements 10+  = RLS       (activan filtros por empresa_id)
--   Al ejecutarse en una transacción, el backfill completa ANTES de que
--   el RLS se active. Pero incluso si se ejecuta statement-by-statement,
--   el RLS viejo (por owner_id) sigue activo hasta el DROP POLICY,
--   y el nuevo RLS se crea inmediatamente después en el mismo archivo.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 1: DETECCIÓN DE HUÉRFANOS (verificación 2)
-- Ejecutar ANTES del backfill para identificar filas sin lenders_profile.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Estas queries se ejecutan como DO blocks que RAISE NOTICE.
-- Si hay huérfanos, el backfill continuará pero los dejará con empresa_id NULL,
-- y la verificación post-backfill los detectará.

DO $$
DECLARE
  v_clients_orphans      int;
  v_credits_orphans      int;
  v_connectors_orphans   int;
  v_reportes_orphans     int;
  v_buro_orphans         int;
  v_notas_orphans        int;
  v_lenders_no_name      int;
BEGIN
  -- Clients cuyo owner_user_id no tiene lenders_profile
  SELECT count(*) INTO v_clients_orphans
    FROM public.clients c
   WHERE NOT EXISTS (
     SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = c.owner_user_id
   );

  -- Credits cuyo created_by no tiene lenders_profile
  SELECT count(*) INTO v_credits_orphans
    FROM public.credits cr
   WHERE NOT EXISTS (
     SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = cr.created_by
   );

  -- Client_connectors cuyo owner_user_id no tiene lenders_profile
  SELECT count(*) INTO v_connectors_orphans
    FROM public.client_connectors cc
   WHERE NOT EXISTS (
     SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = cc.owner_user_id
   );

  -- Reportes_crediticios cuyo lender_user_id no tiene lenders_profile
  SELECT count(*) INTO v_reportes_orphans
    FROM public.reportes_crediticios rc
   WHERE NOT EXISTS (
     SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = rc.lender_user_id
   );

  -- Buro_scores_historial cuyo client_id no pertenece a un client con lenders_profile
  SELECT count(*) INTO v_buro_orphans
    FROM public.buro_scores_historial bsh
   WHERE NOT EXISTS (
     SELECT 1 FROM public.clients c
      JOIN public.lenders_profile lp ON lp.owner_id = c.owner_user_id
     WHERE c.id = bsh.client_id
   );

  -- Cliente_notas cuyo client_id no pertenece a un client con lenders_profile
  SELECT count(*) INTO v_notas_orphans
    FROM public.cliente_notas cn
   WHERE NOT EXISTS (
     SELECT 1 FROM public.clients c
      JOIN public.lenders_profile lp ON lp.owner_id = c.owner_user_id
     WHERE c.id = cn.client_id
   );

  -- Lenders sin institution_name (para bautizar manualmente)
  SELECT count(*) INTO v_lenders_no_name
    FROM public.lenders_profile
   WHERE institution_name IS NULL OR trim(institution_name) = '';

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'REPORTE DE HUÉRFANOS (filas sin lenders_profile):';
  RAISE NOTICE '  clients:              %', v_clients_orphans;
  RAISE NOTICE '  credits:              %', v_credits_orphans;
  RAISE NOTICE '  client_connectors:    %', v_connectors_orphans;
  RAISE NOTICE '  reportes_crediticios: %', v_reportes_orphans;
  RAISE NOTICE '  buro_scores_historial: %', v_buro_orphans;
  RAISE NOTICE '  cliente_notas:        %', v_notas_orphans;
  RAISE NOTICE '  lenders SIN nombre:   %', v_lenders_no_name;
  RAISE NOTICE '══════════════════════════════════════════════════';

  -- Si hay huérfanos, DETENER la migración para resolverlos primero.
  -- Descomenta el IF para hacer obligatorio:
  -- IF v_clients_orphans + v_credits_orphans + v_connectors_orphans
  --    + v_reportes_orphans > 0 THEN
  --   RAISE EXCEPTION 'HAY FILAS HUÉRFANAS. Resolver antes de continuar.';
  -- END IF;
END $$;

-- Listar lenders sin institution_name (para que Luis les ponga nombre real):
SELECT lp.id, lp.owner_id, lp.institution_name, lp.rfc, lp.institution_type,
       u.email as owner_email
  FROM public.lenders_profile lp
  LEFT JOIN auth.users u ON u.id = lp.owner_id
 WHERE lp.institution_name IS NULL OR trim(lp.institution_name) = '';


-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 2: BACKFILL (statements 1-9)
-- Todo empresa_id se llena ANTES de tocar políticas RLS.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------------
-- 1. Crear una empresa por cada lenders_profile existente
--    AJUSTE 2: Copiar el plan desde plinius_profiles del owner.
--    institution_name NULL => se deja como placeholder TEMPORAL.
--    Luis revisará el listado de arriba y pondrá nombres reales.
-- ---------------------------------------------------------------------------
INSERT INTO public.empresas (id, name, rfc, plan, created_at)
SELECT
  lp.id,
  COALESCE(
    NULLIF(trim(lp.institution_name), ''),
    'SIN NOMBRE — REVISAR (owner: ' || COALESCE(u.email, lp.owner_id::text) || ')'
  ),
  lp.rfc,
  COALESCE(pp.plan, 'free'),  -- AJUSTE 2: plan del owner, NADIE amanece en free si tenía pro
  lp.created_at
FROM public.lenders_profile lp
LEFT JOIN public.plinius_profiles pp ON pp.user_id = lp.owner_id
LEFT JOIN auth.users u ON u.id = lp.owner_id
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Registrar cada owner como owner de su empresa
-- ---------------------------------------------------------------------------
INSERT INTO public.empresa_members (empresa_id, user_id, role, status, joined_at)
SELECT
  lp.id,
  lp.owner_id,
  'owner',
  'active',
  lp.created_at
FROM public.lenders_profile lp
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Backfill: empresa_id en lenders_profile
-- ---------------------------------------------------------------------------
UPDATE public.lenders_profile
   SET empresa_id = id
 WHERE empresa_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Backfill: empresa_id en clients
--    Columna de aislamiento actual: owner_user_id
-- ---------------------------------------------------------------------------
UPDATE public.clients c
   SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = c.owner_user_id
   AND c.empresa_id IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Backfill: empresa_id en credits
--    Columna de aislamiento actual: created_by
-- ---------------------------------------------------------------------------
UPDATE public.credits cr
   SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = cr.created_by
   AND cr.empresa_id IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Backfill: empresa_id en client_connectors
--    Columna de aislamiento actual: owner_user_id
-- ---------------------------------------------------------------------------
UPDATE public.client_connectors cc
   SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = cc.owner_user_id
   AND cc.empresa_id IS NULL;

-- ---------------------------------------------------------------------------
-- 7. Backfill: empresa_id en reportes_crediticios
--    Columna de aislamiento actual: lender_user_id
-- ---------------------------------------------------------------------------
UPDATE public.reportes_crediticios rc
   SET empresa_id = lp.empresa_id
  FROM public.lenders_profile lp
 WHERE lp.owner_id = rc.lender_user_id
   AND rc.empresa_id IS NULL;

-- ---------------------------------------------------------------------------
-- 8. buro_scores_historial y cliente_notas:
--    NO reciben columna empresa_id directa. Filtran vía subquery:
--      client_id IN (SELECT id FROM clients WHERE empresa_id = my_empresa_id())
--    Esto es correcto: la FK client_id → clients ya da la trazabilidad.
--    Si un client tiene empresa_id, sus buró/notas quedan aislados.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 9. VERIFICACIÓN POST-BACKFILL: Contar filas con empresa_id IS NULL
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_lp  int; v_cl int; v_cr int; v_cc int; v_rc int;
BEGIN
  SELECT count(*) INTO v_lp FROM public.lenders_profile    WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cl FROM public.clients             WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cr FROM public.credits             WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_cc FROM public.client_connectors   WHERE empresa_id IS NULL;
  SELECT count(*) INTO v_rc FROM public.reportes_crediticios WHERE empresa_id IS NULL;

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN POST-BACKFILL (empresa_id IS NULL):';
  RAISE NOTICE '  lenders_profile:      %', v_lp;
  RAISE NOTICE '  clients:              %', v_cl;
  RAISE NOTICE '  credits:              %', v_cr;
  RAISE NOTICE '  client_connectors:    %', v_cc;
  RAISE NOTICE '  reportes_crediticios: %', v_rc;
  RAISE NOTICE '══════════════════════════════════════════════════';

  IF v_lp + v_cl + v_cr + v_cc + v_rc > 0 THEN
    RAISE WARNING '⚠️  HAY FILAS CON empresa_id NULL. Resolver huérfanos antes de activar RLS.';
    -- Descomenta para hacer obligatorio:
    -- RAISE EXCEPTION 'ABORTAR: filas con empresa_id NULL detectadas.';
  ELSE
    RAISE NOTICE '✅ Todas las filas tienen empresa_id. Seguro activar RLS.';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 3: ACTUALIZACIÓN DE POLÍTICAS RLS (statements 10+)
-- Se ejecuta DESPUÉS de que todo empresa_id está lleno.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------------
-- 10. RLS: lenders_profile — ahora por empresa + role
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS lenders_profile_select_own ON public.lenders_profile;
DROP POLICY IF EXISTS lenders_profile_insert_own ON public.lenders_profile;
DROP POLICY IF EXISTS lenders_profile_update_own ON public.lenders_profile;
-- Mantener admins_read_lenders (super admins)

CREATE POLICY lenders_profile_select_empresa ON public.lenders_profile
  FOR SELECT USING (
    empresa_id = public.my_empresa_id()
  );

CREATE POLICY lenders_profile_insert_owner ON public.lenders_profile
  FOR INSERT WITH CHECK (
    empresa_id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

CREATE POLICY lenders_profile_update_owner ON public.lenders_profile
  FOR UPDATE USING (
    empresa_id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

-- ---------------------------------------------------------------------------
-- 11. RLS: clients — ahora por empresa
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 12. RLS: credits — ahora por empresa
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS credits_own ON public.credits;

CREATE POLICY credits_select_empresa ON public.credits
  FOR SELECT USING (empresa_id = public.my_empresa_id());

CREATE POLICY credits_insert_empresa ON public.credits
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id());

CREATE POLICY credits_update_empresa ON public.credits
  FOR UPDATE USING (empresa_id = public.my_empresa_id());

CREATE POLICY credits_delete_empresa ON public.credits
  FOR DELETE USING (empresa_id = public.my_empresa_id());

-- ---------------------------------------------------------------------------
-- 13. RLS: client_connectors — ahora por empresa
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS cc_select_own ON public.client_connectors;
DROP POLICY IF EXISTS cc_insert_own ON public.client_connectors;
DROP POLICY IF EXISTS cc_update_own ON public.client_connectors;

CREATE POLICY cc_select_empresa ON public.client_connectors
  FOR SELECT USING (empresa_id = public.my_empresa_id());

CREATE POLICY cc_insert_empresa ON public.client_connectors
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id());

CREATE POLICY cc_update_empresa ON public.client_connectors
  FOR UPDATE USING (empresa_id = public.my_empresa_id());

-- ---------------------------------------------------------------------------
-- 14. RLS: reportes_crediticios — ahora por empresa
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS reportes_select_lender ON public.reportes_crediticios;
DROP POLICY IF EXISTS reportes_insert_lender ON public.reportes_crediticios;

CREATE POLICY reportes_select_empresa ON public.reportes_crediticios
  FOR SELECT USING (empresa_id = public.my_empresa_id());

CREATE POLICY reportes_insert_empresa ON public.reportes_crediticios
  FOR INSERT WITH CHECK (empresa_id = public.my_empresa_id());

-- ---------------------------------------------------------------------------
-- 15. RLS: buro_scores_historial — vía subquery a clients.empresa_id
--     (buro_scores_historial NO tiene columna empresa_id propia;
--      filtra por client_id → clients.empresa_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS buro_hist_select ON public.buro_scores_historial;
DROP POLICY IF EXISTS buro_hist_insert ON public.buro_scores_historial;
-- Mantener buro_hist_service (service_role)

CREATE POLICY buro_hist_select_empresa ON public.buro_scores_historial
  FOR SELECT TO authenticated USING (
    client_id IN (
      SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()
    )
  );

CREATE POLICY buro_hist_insert_empresa ON public.buro_scores_historial
  FOR INSERT TO authenticated WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 16. RLS: cliente_notas — vía subquery a clients.empresa_id
--     (cliente_notas NO tiene columna empresa_id propia;
--      filtra por client_id → clients.empresa_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS notas_select ON public.cliente_notas;
DROP POLICY IF EXISTS notas_insert ON public.cliente_notas;
DROP POLICY IF EXISTS notas_update ON public.cliente_notas;
DROP POLICY IF EXISTS notas_delete ON public.cliente_notas;
-- Mantener notas_service (service_role)

CREATE POLICY notas_select_empresa ON public.cliente_notas
  FOR SELECT TO authenticated USING (
    client_id IN (
      SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()
    )
  );

CREATE POLICY notas_insert_empresa ON public.cliente_notas
  FOR INSERT TO authenticated WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()
    )
  );

CREATE POLICY notas_update_empresa ON public.cliente_notas
  FOR UPDATE TO authenticated USING (
    client_id IN (
      SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()
    )
  );

CREATE POLICY notas_delete_empresa ON public.cliente_notas
  FOR DELETE TO authenticated USING (
    client_id IN (
      SELECT id FROM public.clients WHERE empresa_id = public.my_empresa_id()
    )
  );
