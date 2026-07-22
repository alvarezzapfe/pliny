-- =============================================================================
-- SMOKE TEST DE AISLAMIENTO — POST-DEPLOY EN PROD
-- Fecha: 2026-07-22
-- Ref PROD: gwkupxksietqzwgxvvhu
--
-- Verifica que el RLS por empresa_id aísla correctamente la cartera
-- de cada tenant usando usuarios REALES de prod.
--
-- Usa set_config para simular auth.uid() — NO corre como service_role.
-- Si algún ASSERT falla, el bloque truena con el detalle del fallo.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SMOKE 1: Owner de CAPIPROM (jcastillo@capiprom.com.mx)
--   Debe ver: 1 client, 1 credit (los suyos)
--   Debe ver: 0 de PorCuanto, 0 de Aethera, 0 de InfraFinanzas
-- ─────────────────────────────────────────────────────────────────────────────
DO $smoke1$
DECLARE
  v_uid      uuid := '0713eebf-c652-4a5d-ba3d-ae3555fd1301';  -- jcastillo@capiprom.com.mx
  v_empresa  uuid;
  v_role     text;
  v_clients  int;
  v_credits  int;
  v_empresas int;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"0713eebf-c652-4a5d-ba3d-ae3555fd1301","role":"authenticated"}', true);

  -- Guard: verificar que la sesión se simuló
  ASSERT auth.uid() IS NOT NULL,
    'SMOKE 1 GUARD FAIL: auth.uid() es NULL — set_config no funcionó';
  ASSERT auth.uid() = v_uid,
    format('SMOKE 1 GUARD FAIL: auth.uid() = %s, esperaba CAPIPROM owner', auth.uid());

  SELECT public.my_empresa_id() INTO v_empresa;
  SELECT public.my_empresa_role() INTO v_role;

  RAISE NOTICE 'SMOKE 1 (CAPIPROM): auth.uid() = %', auth.uid();
  RAISE NOTICE 'SMOKE 1 (CAPIPROM): my_empresa_id = %, role = %', v_empresa, v_role;

  ASSERT v_empresa = '246b38e4-23fc-401d-a4f0-c520ce1a206a',
    format('SMOKE 1 FAIL: empresa_id = %s, esperaba CAPIPROM', v_empresa);
  ASSERT v_role = 'owner',
    format('SMOKE 1 FAIL: role = %s, esperaba owner', v_role);

  -- Contar lo que ve
  SELECT count(*) INTO v_clients  FROM public.clients;
  SELECT count(*) INTO v_credits  FROM public.credits;
  SELECT count(*) INTO v_empresas FROM public.empresas;

  RAISE NOTICE 'SMOKE 1 (CAPIPROM): clients=%, credits=%, empresas=%', v_clients, v_credits, v_empresas;

  ASSERT v_clients = 1,
    format('SMOKE 1 FAIL: CAPIPROM ve %s clients, esperaba 1', v_clients);
  ASSERT v_credits = 1,
    format('SMOKE 1 FAIL: CAPIPROM ve %s credits, esperaba 1', v_credits);
  ASSERT v_empresas = 1,
    format('SMOKE 1 FAIL: CAPIPROM ve %s empresas, esperaba 1 (solo la suya)', v_empresas);

  RAISE NOTICE 'SMOKE 1 PASSED: CAPIPROM ve solo su cartera (1 client, 1 credit, 1 empresa)';
END $smoke1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SMOKE 2: Owner de PorCuanto (luis@crowdlink.mx)
--   Debe ver: 1 client, 3 credits (los suyos)
--   Debe ver: 0 de CAPIPROM, 0 de Aethera
-- ─────────────────────────────────────────────────────────────────────────────
DO $smoke2$
DECLARE
  v_uid      uuid := 'ed2d17d1-99f4-45e9-a427-cdb236734497';  -- luis@crowdlink.mx
  v_empresa  uuid;
  v_role     text;
  v_clients  int;
  v_credits  int;
  v_empresas int;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"ed2d17d1-99f4-45e9-a427-cdb236734497","role":"authenticated"}', true);

  -- Guard
  ASSERT auth.uid() IS NOT NULL,
    'SMOKE 2 GUARD FAIL: auth.uid() es NULL';
  ASSERT auth.uid() = v_uid,
    format('SMOKE 2 GUARD FAIL: auth.uid() = %s, esperaba PorCuanto owner', auth.uid());

  SELECT public.my_empresa_id() INTO v_empresa;
  SELECT public.my_empresa_role() INTO v_role;

  RAISE NOTICE 'SMOKE 2 (PorCuanto): auth.uid() = %', auth.uid();
  RAISE NOTICE 'SMOKE 2 (PorCuanto): my_empresa_id = %, role = %', v_empresa, v_role;

  ASSERT v_empresa = 'ad8718d5-31d6-4ad5-9587-572d9ee63084',
    format('SMOKE 2 FAIL: empresa_id = %s, esperaba PorCuanto', v_empresa);
  ASSERT v_role = 'owner',
    format('SMOKE 2 FAIL: role = %s, esperaba owner', v_role);

  SELECT count(*) INTO v_clients  FROM public.clients;
  SELECT count(*) INTO v_credits  FROM public.credits;
  SELECT count(*) INTO v_empresas FROM public.empresas;

  RAISE NOTICE 'SMOKE 2 (PorCuanto): clients=%, credits=%, empresas=%', v_clients, v_credits, v_empresas;

  ASSERT v_clients = 1,
    format('SMOKE 2 FAIL: PorCuanto ve %s clients, esperaba 1', v_clients);
  ASSERT v_credits = 3,
    format('SMOKE 2 FAIL: PorCuanto ve %s credits, esperaba 3', v_credits);
  ASSERT v_empresas = 1,
    format('SMOKE 2 FAIL: PorCuanto ve %s empresas, esperaba 1', v_empresas);

  RAISE NOTICE 'SMOKE 2 PASSED: PorCuanto ve solo su cartera (1 client, 3 credits, 1 empresa)';
END $smoke2$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SMOKE 3: Cross-check — CAPIPROM no ve clients de PorCuanto por empresa_id
-- ─────────────────────────────────────────────────────────────────────────────
DO $smoke3$
DECLARE
  v_cross int;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"0713eebf-c652-4a5d-ba3d-ae3555fd1301","role":"authenticated"}', true);

  -- Intentar leer clients de PorCuanto por empresa_id directo
  SELECT count(*) INTO v_cross
    FROM public.clients
   WHERE empresa_id = 'ad8718d5-31d6-4ad5-9587-572d9ee63084';  -- PorCuanto

  ASSERT v_cross = 0,
    format('SMOKE 3 FAIL: CAPIPROM ve %s clients de PorCuanto — FUGA DE DATOS', v_cross);

  RAISE NOTICE 'SMOKE 3 PASSED: CAPIPROM no ve clients de PorCuanto (cross-check = 0)';
END $smoke3$;


-- ─────────────────────────────────────────────────────────────────────────────
-- RESUMEN
-- ─────────────────────────────────────────────────────────────────────────────
DO $summary$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'SMOKE TEST COMPLETO:';
  RAISE NOTICE '  1 — CAPIPROM ve solo su cartera (1c, 1cr)';
  RAISE NOTICE '  2 — PorCuanto ve solo su cartera (1c, 3cr)';
  RAISE NOTICE '  3 — Cross-check: CAPIPROM no ve PorCuanto';
  RAISE NOTICE 'AISLAMIENTO CONFIRMADO EN PROD';
  RAISE NOTICE '════════════════════════════════════════════════';
END $summary$;
