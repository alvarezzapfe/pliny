-- =============================================================================
-- MIGRACIÓN 1/3: Tablas base para multi-usuario por empresa
-- Autor: Claude Code + Luis Alvarez
-- Fecha: 2026-07-21
-- Branch: feat/multi-user-empresas  (NO aplicar en prod sin revisión)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabla: empresas  (el tenant / la cuenta)
-- ---------------------------------------------------------------------------
CREATE TABLE public.empresas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                 -- razón social / nombre comercial
  rfc         text,
  plan        text NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  max_seats   int  NOT NULL DEFAULT 3,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.empresas IS 'Tenant principal. Cada empresa agrupa usuarios, cartera y configuración.';
COMMENT ON COLUMN public.empresas.max_seats IS 'Máximo de asientos (miembros activos + invitaciones pendientes). Default 3.';

-- ---------------------------------------------------------------------------
-- 2. Tabla: empresa_members  (relación usuario ↔ empresa, 1:1 por diseño)
-- ---------------------------------------------------------------------------
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

  -- AJUSTE 1: UNIQUE(user_id) fuerza 1:1 — un usuario pertenece a UNA empresa.
  -- Si en el futuro se necesita multi-empresa, cambiar a UNIQUE(empresa_id, user_id).
  -- Excepción para super_admins: se maneja vía políticas admins_read_*, no rompiendo este constraint.
  CONSTRAINT empresa_members_user_unique UNIQUE (user_id)
);

COMMENT ON COLUMN public.empresa_members.user_id IS 'UNIQUE: un usuario solo pertenece a una empresa (1:1). Super admins acceden a otras empresas vía políticas RLS, no vía membresía múltiple.';

-- Índice para búsquedas frecuentes por empresa
CREATE INDEX idx_empresa_members_empresa ON public.empresa_members(empresa_id);

-- ---------------------------------------------------------------------------
-- 3. Tabla: empresa_invitations  (invitaciones pendientes por correo)
-- ---------------------------------------------------------------------------
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

-- AJUSTE 3: Partial unique index — solo 1 invitación pendiente por email por empresa.
-- Permite re-invitar a alguien cuya invitación fue revocada o expiró.
CREATE UNIQUE INDEX idx_empresa_invitations_pending
  ON public.empresa_invitations(empresa_id, email)
  WHERE status = 'pending';

-- Índice para lookup por token (aceptar invitación)
CREATE INDEX idx_empresa_invitations_token ON public.empresa_invitations(token);

-- ---------------------------------------------------------------------------
-- 4. Función helper: empresa_seat_count(empresa_id)
--    Cuenta miembros activos + invitaciones pendientes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.empresa_seat_count(eid uuid)
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT count(*)::int FROM (
    SELECT user_id FROM public.empresa_members
     WHERE empresa_id = eid AND status = 'active'
    UNION ALL
    SELECT null FROM public.empresa_invitations
     WHERE empresa_id = eid AND status = 'pending'
  ) t;
$$;

COMMENT ON FUNCTION public.empresa_seat_count IS 'Cuenta asientos ocupados: miembros activos + invitaciones pendientes.';

-- ---------------------------------------------------------------------------
-- 5. Función helper: my_empresa_id()
--    Devuelve el empresa_id del usuario autenticado.
--    ASUME relación 1:1 (LIMIT 1). Ver constraint UNIQUE(user_id) arriba.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_empresa_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  -- AJUSTE 1: Asume 1:1 usuario↔empresa. El UNIQUE(user_id) en empresa_members
  -- garantiza que nunca hay más de una fila, pero LIMIT 1 es defensivo.
  SELECT empresa_id FROM public.empresa_members
   WHERE user_id = auth.uid() AND status = 'active'
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.my_empresa_id IS '1:1 — devuelve la empresa del usuario autenticado. LIMIT 1 es defensivo; UNIQUE(user_id) ya garantiza unicidad.';

-- ---------------------------------------------------------------------------
-- 6. Función helper: my_empresa_role()
--    Devuelve el role (owner/member) del usuario en su empresa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_empresa_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.empresa_members
   WHERE user_id = auth.uid() AND status = 'active'
   LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 7. TRIGGER: enforce_max_seats  (AJUSTE 3)
--    Previene exceder max_seats al insertar en empresa_members o empresa_invitations.
--    Usa SELECT ... FOR UPDATE sobre empresas para evitar race conditions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_max_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Necesario: el trigger hace SELECT FOR UPDATE en empresas,
                  -- que requiere pasar RLS de UPDATE (solo owner). Sin SECURITY DEFINER,
                  -- un member autenticado no puede pasar el FOR UPDATE y el trigger falla.
AS $$
DECLARE
  v_max_seats int;
  v_current   int;
BEGIN
  -- Lock the empresa row to prevent concurrent seat additions
  SELECT max_seats INTO v_max_seats
    FROM public.empresas
   WHERE id = NEW.empresa_id
     FOR UPDATE;

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
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_max_seats();

CREATE TRIGGER trg_empresa_invitations_max_seats
  BEFORE INSERT ON public.empresa_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enforce_max_seats();

-- ---------------------------------------------------------------------------
-- 8. Agregar columna empresa_id a tablas existentes
-- ---------------------------------------------------------------------------
ALTER TABLE public.lenders_profile
  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

ALTER TABLE public.clients
  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

ALTER TABLE public.credits
  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

ALTER TABLE public.client_connectors
  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

ALTER TABLE public.reportes_crediticios
  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- Índices para las nuevas FK
CREATE INDEX idx_lenders_profile_empresa  ON public.lenders_profile(empresa_id);
CREATE INDEX idx_clients_empresa          ON public.clients(empresa_id);
CREATE INDEX idx_credits_empresa          ON public.credits(empresa_id);
CREATE INDEX idx_client_connectors_empresa ON public.client_connectors(empresa_id);
CREATE INDEX idx_reportes_empresa         ON public.reportes_crediticios(empresa_id);

-- ---------------------------------------------------------------------------
-- 9. RLS: Habilitar en tablas nuevas
-- ---------------------------------------------------------------------------
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_invitations ENABLE ROW LEVEL SECURITY;

-- ── empresas ──
-- Todos los miembros activos pueden ver su empresa
CREATE POLICY empresas_select_own ON public.empresas
  FOR SELECT USING (id = public.my_empresa_id());

-- Solo owners pueden actualizar la empresa
CREATE POLICY empresas_update_owner ON public.empresas
  FOR UPDATE USING (
    id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

-- Super admins pueden ver todas las empresas (para pruebas/soporte)
CREATE POLICY empresas_select_admin ON public.empresas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  );

-- service_role bypass
CREATE POLICY empresas_service ON public.empresas
  TO service_role USING (true) WITH CHECK (true);

-- ── empresa_members ──
-- Todos los miembros ven los miembros de su empresa
CREATE POLICY empresa_members_select ON public.empresa_members
  FOR SELECT USING (empresa_id = public.my_empresa_id());

-- AJUSTE 4: Solo owners pueden agregar miembros (defensa en dos capas: RLS + middleware)
CREATE POLICY empresa_members_insert_owner ON public.empresa_members
  FOR INSERT WITH CHECK (
    empresa_id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

-- AJUSTE 4: Solo owners pueden eliminar miembros
CREATE POLICY empresa_members_delete_owner ON public.empresa_members
  FOR DELETE USING (
    empresa_id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

-- Super admins ven todos los miembros
CREATE POLICY empresa_members_select_admin ON public.empresa_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  );

-- service_role bypass
CREATE POLICY empresa_members_service ON public.empresa_members
  TO service_role USING (true) WITH CHECK (true);

-- ── empresa_invitations ──
-- Miembros ven las invitaciones de su empresa
CREATE POLICY empresa_invitations_select ON public.empresa_invitations
  FOR SELECT USING (empresa_id = public.my_empresa_id());

-- AJUSTE 4: Solo owners pueden crear invitaciones
CREATE POLICY empresa_invitations_insert_owner ON public.empresa_invitations
  FOR INSERT WITH CHECK (
    empresa_id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

-- AJUSTE 4: Solo owners pueden revocar invitaciones (UPDATE status)
CREATE POLICY empresa_invitations_update_owner ON public.empresa_invitations
  FOR UPDATE USING (
    empresa_id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

-- AJUSTE 4: Solo owners pueden eliminar invitaciones
CREATE POLICY empresa_invitations_delete_owner ON public.empresa_invitations
  FOR DELETE USING (
    empresa_id = public.my_empresa_id()
    AND public.my_empresa_role() = 'owner'
  );

-- Super admins ven todas las invitaciones
CREATE POLICY empresa_invitations_select_admin ON public.empresa_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  );

-- service_role bypass
CREATE POLICY empresa_invitations_service ON public.empresa_invitations
  TO service_role USING (true) WITH CHECK (true);
