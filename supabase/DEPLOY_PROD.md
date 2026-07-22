# Deploy a Producción — Multi-usuario por empresa

**Branch git:** `feat/multi-user-empresas`
**Fecha de preparación:** 2026-07-21
**Estado:** PENDIENTE — no ejecutar hasta que el proyecto temporal pase limpio.

---

## Pre-requisitos

- [ ] Tests A/B/C/D pasaron en proyecto temporal de Supabase
- [ ] Ensayo de restore probado en temporal: dump de prod → restore en temporal → verificar 5 empresas
- [ ] Luis revisó y aprobó las migraciones 001 y 002
- [x] Cuenta "Prueba" (lalvarezzapfe@gmail.com): queda en **free** (decisión 2026-07-21)

---

## Checklist de despliegue

### 1. Backup de producción (OBLIGATORIO antes de tocar la base)

**Supabase Free NO tiene snapshots automáticos ni backups desde el dashboard.**
El único camino es `pg_dump` manual o `supabase db dump`.

#### Opción recomendada: `supabase db dump` (no requiere password)

```bash
# Desde la raíz del proyecto (donde está supabase/config.toml)
cd /Users/lalvarezzapfe/Desktop/pliny

# 1A. Dump del SCHEMA (estructura: tablas, funciones, triggers, RLS)
supabase db dump --linked \
  -f supabase/backups/backup_schema_pre_empresas_$(date +%Y%m%d_%H%M%S).sql

# 1B. Dump de los DATOS (filas de todas las tablas)
supabase db dump --linked --data-only --use-copy \
  -f supabase/backups/backup_data_pre_empresas_$(date +%Y%m%d_%H%M%S).sql

# Crear el directorio de backups primero:
mkdir -p supabase/backups
```

Los archivos se guardan en `supabase/backups/` (local, no se pushean — ya está en .gitignore).

#### Verificar que el backup no está vacío

```bash
# El schema dump debe pesar al menos ~200KB; el data dump depende de tus datos
ls -lh supabase/backups/backup_*

# Verificar que el schema contiene las tablas esperadas
grep -c "CREATE TABLE" supabase/backups/backup_schema_*.sql
# → Esperado: ~30+ tablas

# Verificar que el data dump tiene filas
head -50 supabase/backups/backup_data_*.sql
# → Debe mostrar COPY statements con datos
```

- [ ] `mkdir -p supabase/backups` ejecutado
- [ ] Schema dump creado y pesa > 200KB
- [ ] Data dump creado y contiene COPY statements
- [ ] Ambos archivos verificados visualmente

---

### 2. Ejecutar migraciones en transacción única

Las migraciones 001 y 002 deben correr como una sola transacción.
Si cualquier paso falla, TODO se revierte automáticamente.

```bash
# Concatenar 001 + 002 + verificación en un solo archivo transaccional
cat > supabase/deploy_prod_transaction.sql << 'HEREDOC'
BEGIN;

-- [pegar contenido de 20260721_001_empresas_tables.sql]
-- [pegar contenido de 20260721_002_empresas_backfill_rls.sql]

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL — ANTES DEL COMMIT
-- Si algún COUNT > 0, la EXCEPTION causa ROLLBACK automático.
-- ═══════════════════════════════════════════════════════════════════
DO $chk$
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
  RAISE NOTICE 'VERIFICACIÓN PRE-COMMIT:';
  RAISE NOTICE '  empresa_id NULL en lenders_profile:      %', v_lp;
  RAISE NOTICE '  empresa_id NULL en clients:              %', v_cl;
  RAISE NOTICE '  empresa_id NULL en credits:              %', v_cr;
  RAISE NOTICE '  empresa_id NULL en client_connectors:    %', v_cc;
  RAISE NOTICE '  empresa_id NULL en reportes_crediticios: %', v_rc;
  RAISE NOTICE '  Empresas creadas:                        %', v_empresas;
  RAISE NOTICE '  Members creados:                         %', v_members;
  RAISE NOTICE '════════════════════════════════════════════════';

  IF v_lp + v_cl + v_cr + v_cc + v_rc > 0 THEN
    RAISE EXCEPTION 'ABORT: Hay filas con empresa_id NULL → ROLLBACK. '
      'lenders=%, clients=%, credits=%, connectors=%, reportes=%',
      v_lp, v_cl, v_cr, v_cc, v_rc;
  END IF;

  IF v_empresas < 5 THEN
    RAISE EXCEPTION 'ABORT: Solo % empresas creadas, esperaba 5 → ROLLBACK', v_empresas;
  END IF;

  IF v_members < 5 THEN
    RAISE EXCEPTION 'ABORT: Solo % members creados, esperaba 5 → ROLLBACK', v_members;
  END IF;

  RAISE NOTICE 'PRE-COMMIT OK — todas las filas con empresa_id, 5 empresas, 5 members';
END $chk$;

COMMIT;
HEREDOC

# Ejecutar contra prod
supabase db query --linked -f supabase/deploy_prod_transaction.sql
```

**Clave:** Si la verificación lanza EXCEPTION, PostgreSQL hace ROLLBACK de toda
la transacción. Las tablas, columnas, triggers, y políticas RLS quedan como
si nada hubiera pasado. No se necesita intervención manual.

- [ ] Transacción ejecutada exitosamente (sin EXCEPTION)
- [ ] Output muestra: "PRE-COMMIT OK — todas las filas con empresa_id, 5 empresas, 5 members"

---

### 3. Verificación post-deploy

```sql
-- Verificar que cada empresa tiene el plan correcto
SELECT e.name, e.plan, e.max_seats, em.role, u.email
  FROM public.empresas e
  JOIN public.empresa_members em ON em.empresa_id = e.id
  JOIN auth.users u ON u.id = em.user_id
 ORDER BY e.created_at;
```

Resultado esperado:

| Empresa | Plan | Owner email |
|---------|------|-------------|
| PorCuanto S.A. de C.V., IFC | **pro** | luis@crowdlink.mx |
| Prueba | **free** | lalvarezzapfe@gmail.com |
| Infraestructura en Finanzas AI | **pro** | luis@plinius.mx |
| CAPIPROM SAPI DE CV | **free** | jcastillo@capiprom.com.mx |
| Aethera Solar, SAPI de CV | **free** | ebutchart@aetherasolar.com |

- [ ] Planes verificados (PorCuanto=pro, InfraFinanzas=pro, resto=free)

---

### 4. Smoke test en la app

- [ ] Login como luis@plinius.mx → Dashboard carga, cartera visible
- [ ] Login como jcastillo@capiprom.com.mx → Dashboard carga, sus clientes visibles
- [ ] Verificar que luis@plinius.mx NO ve clientes de CAPIPROM
- [ ] Tab "Configuración" → "Perfil" carga sin error

---

### 5. Rollback si algo falla POST-deploy

Si la transacción falló (paso 2), no hay nada que revertir — PostgreSQL ya
hizo ROLLBACK automático.

Si la transacción pasó pero la app se comporta mal después:

#### Restaurar desde backup

```bash
# PASO 1: Verificar que tienes los backups
ls -lh supabase/backups/backup_*

# PASO 2: Conectar a la base y restaurar
# ┌──────────────────────────────────────────────────────────────────────┐
# │ IMPORTANTE: Usar conexión DIRECTA, NO el pooler.                   │
# │                                                                      │
# │ El pooler (puerto 6543, pgBouncer transaction mode) NO es seguro    │
# │ para restores: sesiones largas, prepared statements, y COPY pueden  │
# │ truncarse a media ejecución.                                         │
# │                                                                      │
# │ Conexión directa:                                                    │
# │   Host:   db.gwkupxksietqzwgxvvhu.supabase.co                      │
# │   Puerto: 5432                                                       │
# │   User:   postgres                                                   │
# │                                                                      │
# │ Encontrar en Dashboard → Settings → Database → "Direct connection"  │
# │ (NO "Connection pooling"). El password está en esa misma sección.   │
# └──────────────────────────────────────────────────────────────────────┘

# 2A. Restaurar schema (DROP + CREATE de todo)
psql "postgresql://postgres:[TU_DB_PASSWORD]@db.gwkupxksietqzwgxvvhu.supabase.co:5432/postgres" \
  -f supabase/backups/backup_schema_pre_empresas_XXXXXXXX_XXXXXX.sql

# 2B. Restaurar datos
psql "postgresql://postgres:[TU_DB_PASSWORD]@db.gwkupxksietqzwgxvvhu.supabase.co:5432/postgres" \
  -f supabase/backups/backup_data_pre_empresas_XXXXXXXX_XXXXXX.sql
```

**Antes de deploy a prod, el restore se ensaya en el proyecto temporal** (ver
pre-requisitos). Un backup nunca restaurado es una hipótesis, no una red.

#### Alternativa: rollback quirúrgico (sin restaurar backup completo)

```sql
-- Solo si prefieres no restaurar todo el backup.
-- Ejecutar en orden inverso:

-- 1. Restaurar políticas RLS viejas (una por una)
DROP POLICY IF EXISTS lenders_profile_select_empresa ON public.lenders_profile;
DROP POLICY IF EXISTS lenders_profile_insert_owner   ON public.lenders_profile;
DROP POLICY IF EXISTS lenders_profile_update_owner   ON public.lenders_profile;
CREATE POLICY lenders_profile_select_own ON public.lenders_profile FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY lenders_profile_insert_own ON public.lenders_profile FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY lenders_profile_update_own ON public.lenders_profile FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS clients_select_empresa ON public.clients;
DROP POLICY IF EXISTS clients_insert_empresa ON public.clients;
DROP POLICY IF EXISTS clients_update_empresa ON public.clients;
DROP POLICY IF EXISTS clients_delete_empresa ON public.clients;
CREATE POLICY clients_select_own ON public.clients FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY clients_insert_own ON public.clients FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY clients_update_own ON public.clients FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY clients_delete_own ON public.clients FOR DELETE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS credits_select_empresa ON public.credits;
DROP POLICY IF EXISTS credits_insert_empresa ON public.credits;
DROP POLICY IF EXISTS credits_update_empresa ON public.credits;
DROP POLICY IF EXISTS credits_delete_empresa ON public.credits;
CREATE POLICY credits_own ON public.credits USING (created_by = auth.uid());

DROP POLICY IF EXISTS cc_select_empresa ON public.client_connectors;
DROP POLICY IF EXISTS cc_insert_empresa ON public.client_connectors;
DROP POLICY IF EXISTS cc_update_empresa ON public.client_connectors;
CREATE POLICY cc_select_own ON public.client_connectors FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY cc_insert_own ON public.client_connectors FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY cc_update_own ON public.client_connectors FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS reportes_select_empresa ON public.reportes_crediticios;
DROP POLICY IF EXISTS reportes_insert_empresa ON public.reportes_crediticios;
CREATE POLICY reportes_select_lender ON public.reportes_crediticios FOR SELECT TO authenticated USING (lender_user_id = auth.uid());
CREATE POLICY reportes_insert_lender ON public.reportes_crediticios FOR INSERT TO authenticated WITH CHECK (lender_user_id = auth.uid());

DROP POLICY IF EXISTS buro_hist_select_empresa ON public.buro_scores_historial;
DROP POLICY IF EXISTS buro_hist_insert_empresa ON public.buro_scores_historial;
CREATE POLICY buro_hist_select ON public.buro_scores_historial FOR SELECT TO authenticated USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));
CREATE POLICY buro_hist_insert ON public.buro_scores_historial FOR INSERT TO authenticated WITH CHECK (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS notas_select_empresa ON public.cliente_notas;
DROP POLICY IF EXISTS notas_insert_empresa ON public.cliente_notas;
DROP POLICY IF EXISTS notas_update_empresa ON public.cliente_notas;
DROP POLICY IF EXISTS notas_delete_empresa ON public.cliente_notas;
CREATE POLICY notas_select ON public.cliente_notas FOR SELECT TO authenticated USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));
CREATE POLICY notas_insert ON public.cliente_notas FOR INSERT TO authenticated WITH CHECK (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));
CREATE POLICY notas_update ON public.cliente_notas FOR UPDATE TO authenticated USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));
CREATE POLICY notas_delete ON public.cliente_notas FOR DELETE TO authenticated USING (client_id IN (SELECT id FROM clients WHERE owner_user_id = auth.uid()));

-- 2. Drop columnas empresa_id de tablas existentes
ALTER TABLE public.lenders_profile     DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE public.clients              DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE public.credits              DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE public.client_connectors    DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE public.reportes_crediticios DROP COLUMN IF EXISTS empresa_id;

-- 3. Drop triggers
DROP TRIGGER IF EXISTS trg_empresa_members_max_seats     ON public.empresa_members;
DROP TRIGGER IF EXISTS trg_empresa_invitations_max_seats ON public.empresa_invitations;

-- 4. Drop tablas nuevas (CASCADE borra las policies)
DROP TABLE IF EXISTS public.empresa_invitations CASCADE;
DROP TABLE IF EXISTS public.empresa_members     CASCADE;
DROP TABLE IF EXISTS public.empresas             CASCADE;

-- 5. Drop funciones
DROP FUNCTION IF EXISTS public.my_empresa_id();
DROP FUNCTION IF EXISTS public.my_empresa_role();
DROP FUNCTION IF EXISTS public.empresa_seat_count(uuid);
DROP FUNCTION IF EXISTS public.trg_enforce_max_seats();
```

- [ ] Rollback ejecutado (si fue necesario)
- [ ] App funciona con políticas viejas restauradas

---

## Notas

- El archivo 003 (test de aislamiento) NO se ejecuta en prod.
- `buro_scores_historial` y `cliente_notas` NO reciben columna `empresa_id`.
  Filtran vía subquery: `client_id IN (SELECT id FROM clients WHERE empresa_id = my_empresa_id())`.
- El trigger `on_auth_user_created` (`handle_new_user_role`) no se ve afectado.
- El API `/api/workspaces/[id]/members` queda deprecated. Eliminar tras confirmar el nuevo flujo.
- Los backups se guardan en `supabase/backups/` (agregar a `.gitignore` si no está).
