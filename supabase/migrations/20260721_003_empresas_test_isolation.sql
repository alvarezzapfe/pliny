-- =============================================================================
-- SCRIPT DE PRUEBA DE AISLAMIENTO (AJUSTE 6)
-- NO es una migración de prod — ejecutar SOLO en branch de Supabase.
--
-- Crea 3 usuarios test en auth.users, 2 empresas, datos de cartera,
-- y valida aislamiento ejecutando queries como cada usuario.
--
-- BLINDAJES:
--   1. Cada test (A/B/C) empieza con ASSERT auth.uid() IS NOT NULL
--      para evitar falso verde por sesión no simulada.
--   2. Test D captura WHEN check_violation (SQLSTATE 23514), que es el
--      ERRCODE explícito que lanza trg_enforce_max_seats.
--   3. auth.users INSERT incluye raw_app_meta_data, raw_user_meta_data,
--      y es compatible con trigger on_auth_user_created (handle_new_user_role).
--
-- ORDEN DE EJECUCIÓN:
--   Paso 1: Correr SOLO el bloque SETUP. Verificar que no truene.
--   Paso 2: Si limpio, correr tests A, B, C, D.
--   Paso 3: Correr CLEANUP al terminar.
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 1: SETUP — Crear usuarios y datos ficticios
-- Ejecutar AISLADO primero. Si truena, crear usuarios desde dashboard.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_owner_a   uuid := '00000000-aaaa-aaaa-aaaa-000000000001';
  v_owner_b   uuid := '00000000-bbbb-bbbb-bbbb-000000000002';
  v_member_a  uuid := '00000000-cccc-cccc-cccc-000000000003';

  v_empresa_a uuid := '11111111-aaaa-aaaa-aaaa-111111111111';
  v_empresa_b uuid := '22222222-bbbb-bbbb-bbbb-222222222222';

  v_client_a  uuid := '33333333-aaaa-aaaa-aaaa-333333333333';
  v_client_b  uuid := '44444444-bbbb-bbbb-bbbb-444444444444';

  v_credit_a  uuid := '55555555-aaaa-aaaa-aaaa-555555555555';
  v_credit_b  uuid := '66666666-bbbb-bbbb-bbbb-666666666666';

  v_user_count int;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- auth.users: incluye raw_app_meta_data y raw_user_meta_data para
  -- compatibilidad con el trigger on_auth_user_created (handle_new_user_role)
  -- que lee raw_user_meta_data->>'user_role'. Le pasamos 'otorgante'.
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES
    (v_owner_a,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'owner-a@test.plinius.mx', crypt('test1234', gen_salt('bf')),
     now(), now(), now(), '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"user_role":"otorgante"}'::jsonb),
    (v_owner_b,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'owner-b@test.plinius.mx', crypt('test1234', gen_salt('bf')),
     now(), now(), now(), '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"user_role":"otorgante"}'::jsonb),
    (v_member_a,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'member-a@test.plinius.mx', crypt('test1234', gen_salt('bf')),
     now(), now(), now(), '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"user_role":"otorgante"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Verificar que los 3 usuarios existen
  SELECT count(*) INTO v_user_count
    FROM auth.users
   WHERE id IN (v_owner_a, v_owner_b, v_member_a);
  ASSERT v_user_count = 3,
    format('SETUP FAIL: Solo %s de 3 usuarios creados en auth.users', v_user_count);

  -- ── Empresas ──
  INSERT INTO public.empresas (id, name, rfc, plan, max_seats) VALUES
    (v_empresa_a, 'Empresa Alpha Test', 'AAA010101AAA', 'pro',   3),
    (v_empresa_b, 'Empresa Beta Test',  'BBB020202BBB', 'basic', 3)
  ON CONFLICT (id) DO NOTHING;

  -- ── Miembros ──
  INSERT INTO public.empresa_members (empresa_id, user_id, role, status, joined_at) VALUES
    (v_empresa_a, v_owner_a,  'owner',  'active', now()),
    (v_empresa_b, v_owner_b,  'owner',  'active', now()),
    (v_empresa_a, v_member_a, 'member', 'active', now())
  ON CONFLICT (user_id) DO NOTHING;

  -- ── Lenders profile ──
  INSERT INTO public.lenders_profile (id, owner_id, institution_name, rfc, empresa_id) VALUES
    (gen_random_uuid(), v_owner_a, 'Alpha Lending', 'AAA010101AAA', v_empresa_a),
    (gen_random_uuid(), v_owner_b, 'Beta Lending',  'BBB020202BBB', v_empresa_b)
  ON CONFLICT DO NOTHING;

  -- ── Clients (cartera) ──
  INSERT INTO public.clients (id, company_name, rfc, owner_user_id, empresa_id) VALUES
    (v_client_a, 'Cliente de Alpha', 'CLI010101AAA', v_owner_a, v_empresa_a),
    (v_client_b, 'Cliente de Beta',  'CLI020202BBB', v_owner_b, v_empresa_b)
  ON CONFLICT (id) DO NOTHING;

  -- ── Credits ──
  INSERT INTO public.credits (id, created_by, deudor, tipo_credito, monto_original, saldo_actual, empresa_id) VALUES
    (v_credit_a, v_owner_a, 'Deudor Alpha', 'Crédito simple', 1000000, 800000, v_empresa_a),
    (v_credit_b, v_owner_b, 'Deudor Beta',  'Crédito simple', 500000,  400000, v_empresa_b)
  ON CONFLICT (id) DO NOTHING;

  -- ── Notas (columna real: author_id) ──
  INSERT INTO public.cliente_notas (client_id, author_id, author_name, contenido) VALUES
    (v_client_a, v_owner_a, 'Owner A', 'Nota de prueba Alpha'),
    (v_client_b, v_owner_b, 'Owner B', 'Nota de prueba Beta');

  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'SETUP OK: 3 usuarios, 2 empresas, cartera creada';
  RAISE NOTICE '  Owner  A: 00000000-aaaa-aaaa-aaaa-000000000001';
  RAISE NOTICE '  Owner  B: 00000000-bbbb-bbbb-bbbb-000000000002';
  RAISE NOTICE '  Member A: 00000000-cccc-cccc-cccc-000000000003';
  RAISE NOTICE '  Empresa Alpha: 11111111-aaaa-aaaa-aaaa-111111111111';
  RAISE NOTICE '  Empresa Beta:  22222222-bbbb-bbbb-bbbb-222222222222';
  RAISE NOTICE '══════════════════════════════════════════════════';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 2: TESTS  (correr después de verificar que SETUP pasó limpio)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- TEST A: Owner A ve TODO de A y NADA de B
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_empresa  uuid;
  v_role     text;
  v_clients  int;
  v_credits  int;
  v_empresas int;
  v_members  int;
  v_notas    int;
BEGIN
  -- ▶ SIMULAR OWNER A
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-aaaa-aaaa-aaaa-000000000001","role":"authenticated"}', true);

  -- BLINDAJE 1: Verificar que la sesión se simuló correctamente.
  -- Si auth.uid() es NULL, los SELECTs retornarían 0 filas = falso verde.
  ASSERT auth.uid() IS NOT NULL,
    'TEST A GUARD FAIL: auth.uid() es NULL — set_config no simuló la sesión';
  ASSERT auth.uid() = '00000000-aaaa-aaaa-aaaa-000000000001',
    format('TEST A GUARD FAIL: auth.uid() = %s, esperaba owner_a', auth.uid());

  SELECT public.my_empresa_id() INTO v_empresa;
  SELECT public.my_empresa_role() INTO v_role;

  ASSERT v_empresa = '11111111-aaaa-aaaa-aaaa-111111111111',
    format('TEST A FAIL: my_empresa_id = %s, esperaba 11111111-aaaa...', v_empresa);
  ASSERT v_role = 'owner',
    format('TEST A FAIL: my_empresa_role = %s, esperaba owner', v_role);

  SELECT count(*) INTO v_clients  FROM public.clients;
  SELECT count(*) INTO v_credits  FROM public.credits;
  SELECT count(*) INTO v_empresas FROM public.empresas;
  SELECT count(*) INTO v_members  FROM public.empresa_members;
  SELECT count(*) INTO v_notas    FROM public.cliente_notas;

  ASSERT v_clients = 1,  format('TEST A FAIL: clients = %s, esperaba 1', v_clients);
  ASSERT v_credits = 1,  format('TEST A FAIL: credits = %s, esperaba 1', v_credits);
  ASSERT v_empresas = 1, format('TEST A FAIL: empresas = %s, esperaba 1', v_empresas);
  ASSERT v_members = 2,  format('TEST A FAIL: members = %s, esperaba 2 (owner+member)', v_members);
  ASSERT v_notas = 1,    format('TEST A FAIL: notas = %s, esperaba 1', v_notas);

  RAISE NOTICE 'TEST A PASSED: Owner A ve solo datos de Alpha';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- TEST B: Owner B ve TODO de B y NADA de A
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_empresa  uuid;
  v_clients  int;
  v_credits  int;
  v_empresas int;
  v_members  int;
  v_notas    int;
BEGIN
  -- ▶ SIMULAR OWNER B
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-bbbb-bbbb-bbbb-000000000002","role":"authenticated"}', true);

  -- BLINDAJE 1: Guard contra falso verde
  ASSERT auth.uid() IS NOT NULL,
    'TEST B GUARD FAIL: auth.uid() es NULL — set_config no simuló la sesión';
  ASSERT auth.uid() = '00000000-bbbb-bbbb-bbbb-000000000002',
    format('TEST B GUARD FAIL: auth.uid() = %s, esperaba owner_b', auth.uid());

  SELECT public.my_empresa_id() INTO v_empresa;

  ASSERT v_empresa = '22222222-bbbb-bbbb-bbbb-222222222222',
    format('TEST B FAIL: my_empresa_id = %s, esperaba 22222222-bbbb...', v_empresa);

  SELECT count(*) INTO v_clients  FROM public.clients;
  SELECT count(*) INTO v_credits  FROM public.credits;
  SELECT count(*) INTO v_empresas FROM public.empresas;
  SELECT count(*) INTO v_members  FROM public.empresa_members;
  SELECT count(*) INTO v_notas    FROM public.cliente_notas;

  ASSERT v_clients = 1,  format('TEST B FAIL: clients = %s, esperaba 1', v_clients);
  ASSERT v_credits = 1,  format('TEST B FAIL: credits = %s, esperaba 1', v_credits);
  ASSERT v_empresas = 1, format('TEST B FAIL: empresas = %s, esperaba 1', v_empresas);
  ASSERT v_members = 1,  format('TEST B FAIL: members = %s, esperaba 1 (solo owner)', v_members);
  ASSERT v_notas = 1,    format('TEST B FAIL: notas = %s, esperaba 1', v_notas);

  RAISE NOTICE 'TEST B PASSED: Owner B ve solo datos de Beta';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- TEST C: Member de A ve cartera pero NO puede editar perfil ni invitar
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_empresa   uuid;
  v_role      text;
  v_clients   int;
  v_credits   int;
  v_updated   int;
  v_clients_b int;
BEGIN
  -- ▶ SIMULAR MEMBER A
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-cccc-cccc-cccc-000000000003","role":"authenticated"}', true);

  -- BLINDAJE 1: Guard contra falso verde
  ASSERT auth.uid() IS NOT NULL,
    'TEST C GUARD FAIL: auth.uid() es NULL — set_config no simuló la sesión';
  ASSERT auth.uid() = '00000000-cccc-cccc-cccc-000000000003',
    format('TEST C GUARD FAIL: auth.uid() = %s, esperaba member_a', auth.uid());

  SELECT public.my_empresa_id() INTO v_empresa;
  SELECT public.my_empresa_role() INTO v_role;

  ASSERT v_empresa = '11111111-aaaa-aaaa-aaaa-111111111111',
    format('TEST C FAIL: my_empresa_id = %s, esperaba empresa Alpha', v_empresa);
  ASSERT v_role = 'member',
    format('TEST C FAIL: my_empresa_role = %s, esperaba member', v_role);

  -- C.1: Member VE la cartera de Alpha
  SELECT count(*) INTO v_clients FROM public.clients;
  SELECT count(*) INTO v_credits FROM public.credits;
  ASSERT v_clients = 1, format('TEST C.1 FAIL: clients = %s, esperaba 1', v_clients);
  ASSERT v_credits = 1, format('TEST C.1 FAIL: credits = %s, esperaba 1', v_credits);

  -- C.2: Member NO puede actualizar perfil de empresa (RLS: role='owner')
  UPDATE public.lenders_profile SET institution_name = 'HACKEADO'
   WHERE empresa_id = '11111111-aaaa-aaaa-aaaa-111111111111';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  ASSERT v_updated = 0,
    format('TEST C.2 FAIL: member pudo actualizar lenders_profile (%s filas)', v_updated);

  -- C.3: Member NO puede insertar invitaciones (RLS: role='owner')
  BEGIN
    INSERT INTO public.empresa_invitations (empresa_id, email, invited_by)
      VALUES ('11111111-aaaa-aaaa-aaaa-111111111111', 'hack@test.com',
              '00000000-cccc-cccc-cccc-000000000003');
    RAISE EXCEPTION 'TEST C.3 FAIL: member pudo crear invitación — RLS no bloqueó';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;  -- RLS bloquea con "new row violates policy"
    WHEN others THEN
      -- Algunos PG reportan check_violation en vez de insufficient_privilege para RLS
      IF SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%' THEN
        NULL;  -- OK, fue RLS
      ELSE
        RAISE;  -- Error inesperado, re-lanzar
      END IF;
  END;

  -- C.4: Member NO puede agregar miembros (RLS: role='owner')
  BEGIN
    INSERT INTO public.empresa_members (empresa_id, user_id, role, status)
      VALUES ('11111111-aaaa-aaaa-aaaa-111111111111', gen_random_uuid(), 'member', 'active');
    RAISE EXCEPTION 'TEST C.4 FAIL: member pudo agregar miembro — RLS no bloqueó';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN others THEN
      IF SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%' THEN
        NULL;
      ELSE
        RAISE;
      END IF;
  END;

  -- C.5: Member NO puede ver datos de Empresa B
  SELECT count(*) INTO v_clients_b
    FROM public.clients WHERE empresa_id = '22222222-bbbb-bbbb-bbbb-222222222222';
  ASSERT v_clients_b = 0,
    format('TEST C.5 FAIL: member ve datos de empresa B (%s filas)', v_clients_b);

  RAISE NOTICE 'TEST C PASSED: Member ve cartera, NO edita perfil, NO invita, NO ve empresa B';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- TEST D: Trigger de max_seats
-- Ejecuta como postgres (bypass RLS) para probar SOLO la lógica del trigger.
-- El trigger lanza: RAISE EXCEPTION ... USING ERRCODE = 'check_violation'
-- El test captura:  WHEN check_violation  (SQLSTATE 23514) — CUADRAN.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_extra_user uuid;
  v_overflow   uuid;
BEGIN
  -- Volver a role postgres para probar trigger sin RLS
  PERFORM set_config('role', 'postgres', true);

  -- Empresa A ya tiene 2 miembros (owner_a + member_a). max_seats = 3.
  -- Agregar tercero: debe pasar
  v_extra_user := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_extra_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'extra@test.plinius.mx', crypt('test1234', gen_salt('bf')),
    now(), now(), now(), '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"user_role":"otorgante"}'::jsonb
  );

  INSERT INTO public.empresa_members (empresa_id, user_id, role, status, joined_at)
    VALUES ('11111111-aaaa-aaaa-aaaa-111111111111', v_extra_user, 'member', 'active', now());
  RAISE NOTICE 'TEST D.1: Tercer asiento aceptado (3/3)';

  -- Cuarto: debe fallar con check_violation (ERRCODE 23514)
  v_overflow := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_overflow, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'overflow@test.plinius.mx', crypt('test1234', gen_salt('bf')),
    now(), now(), now(), '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"user_role":"otorgante"}'::jsonb
  );

  BEGIN
    INSERT INTO public.empresa_members (empresa_id, user_id, role, status, joined_at)
      VALUES ('11111111-aaaa-aaaa-aaaa-111111111111', v_overflow, 'member', 'active', now());
    RAISE EXCEPTION 'TEST D.2 FAIL: cuarto miembro fue aceptado en empresa de 3 asientos';
  EXCEPTION WHEN check_violation THEN
    -- Trigger lanza ERRCODE='check_violation' — cuadra
    ASSERT SQLERRM ILIKE '%asientos%',
      format('TEST D.2 WARN: capturó check_violation pero mensaje inesperado: %s', SQLERRM);
    RAISE NOTICE 'TEST D.2: Cuarto asiento rechazado (msg: %)', SQLERRM;
  END;

  -- D.3-D.5: Invitación pendiente cuenta como asiento
  -- Empresa B tiene 1 miembro (owner_b). max_seats = 3.
  INSERT INTO public.empresa_invitations (empresa_id, email, invited_by)
    VALUES ('22222222-bbbb-bbbb-bbbb-222222222222', 'inv1@test.com',
            '00000000-bbbb-bbbb-bbbb-000000000002');
  RAISE NOTICE 'TEST D.3: Invitacion 1 aceptada (2/3)';

  INSERT INTO public.empresa_invitations (empresa_id, email, invited_by)
    VALUES ('22222222-bbbb-bbbb-bbbb-222222222222', 'inv2@test.com',
            '00000000-bbbb-bbbb-bbbb-000000000002');
  RAISE NOTICE 'TEST D.4: Invitacion 2 aceptada (3/3)';

  BEGIN
    INSERT INTO public.empresa_invitations (empresa_id, email, invited_by)
      VALUES ('22222222-bbbb-bbbb-bbbb-222222222222', 'inv3@test.com',
              '00000000-bbbb-bbbb-bbbb-000000000002');
    RAISE EXCEPTION 'TEST D.5 FAIL: tercera invitacion aceptada (excede 3 asientos)';
  EXCEPTION WHEN check_violation THEN
    ASSERT SQLERRM ILIKE '%asientos%',
      format('TEST D.5 WARN: capturó check_violation pero mensaje inesperado: %s', SQLERRM);
    RAISE NOTICE 'TEST D.5: Tercera invitacion rechazada (msg: %)', SQLERRM;
  END;

  RAISE NOTICE 'TEST D PASSED: Trigger de max_seats funciona';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RESUMEN
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE 'TODOS LOS TESTS PASARON';
  RAISE NOTICE '  A — Owner A ve solo Alpha, nada de Beta';
  RAISE NOTICE '  B — Owner B ve solo Beta, nada de Alpha';
  RAISE NOTICE '  C — Member ve cartera, no edita perfil, no invita';
  RAISE NOTICE '  D — Trigger max_seats bloquea excedentes';
  RAISE NOTICE '══════════════════════════════════════════════════';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO 3: CLEANUP — Ejecutar DESPUÉS de revisar resultados
-- ═══════════════════════════════════════════════════════════════════════════════
-- Descomenta y ejecuta SOLO cuando quieras limpiar:
/*
DO $$
BEGIN
  DELETE FROM public.empresa_invitations WHERE empresa_id IN (
    '11111111-aaaa-aaaa-aaaa-111111111111', '22222222-bbbb-bbbb-bbbb-222222222222');
  DELETE FROM public.cliente_notas WHERE client_id IN (
    '33333333-aaaa-aaaa-aaaa-333333333333', '44444444-bbbb-bbbb-bbbb-444444444444');
  DELETE FROM public.credits WHERE id IN (
    '55555555-aaaa-aaaa-aaaa-555555555555', '66666666-bbbb-bbbb-bbbb-666666666666');
  DELETE FROM public.clients WHERE id IN (
    '33333333-aaaa-aaaa-aaaa-333333333333', '44444444-bbbb-bbbb-bbbb-444444444444');
  DELETE FROM public.lenders_profile WHERE empresa_id IN (
    '11111111-aaaa-aaaa-aaaa-111111111111', '22222222-bbbb-bbbb-bbbb-222222222222');
  DELETE FROM public.empresa_members WHERE empresa_id IN (
    '11111111-aaaa-aaaa-aaaa-111111111111', '22222222-bbbb-bbbb-bbbb-222222222222');
  DELETE FROM public.empresas WHERE id IN (
    '11111111-aaaa-aaaa-aaaa-111111111111', '22222222-bbbb-bbbb-bbbb-222222222222');
  -- Limpiar usuarios test (incluyendo extras del test D)
  DELETE FROM auth.users WHERE email IN (
    'owner-a@test.plinius.mx', 'owner-b@test.plinius.mx', 'member-a@test.plinius.mx',
    'extra@test.plinius.mx', 'overflow@test.plinius.mx');
  RAISE NOTICE 'CLEANUP: Datos de prueba eliminados';
END $$;
*/
