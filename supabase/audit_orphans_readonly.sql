-- =============================================================================
-- AUDITORÍA DE HUÉRFANOS — SOLO LECTURA
-- Fecha: 2026-07-21
-- Objetivo: Contar filas en tablas hijas cuyo owner/created_by/lender NO
--           tiene lenders_profile (y por tanto no tendrían empresa tras backfill).
--
-- GARANTÍA: Este archivo contiene ÚNICAMENTE sentencias SELECT.
--           NO contiene INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.
-- =============================================================================

-- 1. Clients cuyo owner_user_id NO tiene lenders_profile
SELECT 'clients_huerfanos' AS tabla,
       count(*) AS filas_sin_empresa
  FROM public.clients c
 WHERE NOT EXISTS (
   SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = c.owner_user_id
 );

-- 2. Credits cuyo created_by NO tiene lenders_profile
SELECT 'credits_huerfanos' AS tabla,
       count(*) AS filas_sin_empresa
  FROM public.credits cr
 WHERE NOT EXISTS (
   SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = cr.created_by
 );

-- 3. Client_connectors cuyo owner_user_id NO tiene lenders_profile
SELECT 'client_connectors_huerfanos' AS tabla,
       count(*) AS filas_sin_empresa
  FROM public.client_connectors cc
 WHERE NOT EXISTS (
   SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = cc.owner_user_id
 );

-- 4. Reportes_crediticios cuyo lender_user_id NO tiene lenders_profile
SELECT 'reportes_crediticios_huerfanos' AS tabla,
       count(*) AS filas_sin_empresa
  FROM public.reportes_crediticios rc
 WHERE NOT EXISTS (
   SELECT 1 FROM public.lenders_profile lp WHERE lp.owner_id = rc.lender_user_id
 );

-- 5. Buro_scores_historial cuyo client_id apunta a un client sin lenders_profile
SELECT 'buro_scores_huerfanos' AS tabla,
       count(*) AS filas_sin_empresa
  FROM public.buro_scores_historial bsh
 WHERE NOT EXISTS (
   SELECT 1 FROM public.clients c
    JOIN public.lenders_profile lp ON lp.owner_id = c.owner_user_id
   WHERE c.id = bsh.client_id
 );

-- 6. Cliente_notas cuyo client_id apunta a un client sin lenders_profile
SELECT 'cliente_notas_huerfanos' AS tabla,
       count(*) AS filas_sin_empresa
  FROM public.cliente_notas cn
 WHERE NOT EXISTS (
   SELECT 1 FROM public.clients c
    JOIN public.lenders_profile lp ON lp.owner_id = c.owner_user_id
   WHERE c.id = cn.client_id
 );

-- 7. Lenders sin institution_name (para bautizar manualmente)
SELECT 'lenders_sin_nombre' AS tabla,
       count(*) AS total
  FROM public.lenders_profile
 WHERE institution_name IS NULL OR trim(institution_name) = '';

-- 8. Detalle de lenders sin nombre (para que Luis ponga el nombre real)
SELECT lp.id,
       lp.owner_id,
       lp.institution_name,
       lp.rfc,
       lp.institution_type,
       lp.created_at
  FROM public.lenders_profile lp
 WHERE lp.institution_name IS NULL OR trim(lp.institution_name) = ''
 ORDER BY lp.created_at;

-- 9. Conteos totales de cada tabla (para contexto de proporción)
SELECT 'total_clients' AS tabla, count(*) AS total FROM public.clients
UNION ALL
SELECT 'total_credits', count(*) FROM public.credits
UNION ALL
SELECT 'total_client_connectors', count(*) FROM public.client_connectors
UNION ALL
SELECT 'total_reportes_crediticios', count(*) FROM public.reportes_crediticios
UNION ALL
SELECT 'total_buro_scores', count(*) FROM public.buro_scores_historial
UNION ALL
SELECT 'total_cliente_notas', count(*) FROM public.cliente_notas
UNION ALL
SELECT 'total_lenders_profile', count(*) FROM public.lenders_profile;
