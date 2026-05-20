-- ========================================
-- DEAL ROOMS — MVP Schema
-- Migration: 20260514_001
-- ========================================

-- ────────────────────────────────────────
-- WORKSPACES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS workspaces_slug_idx ON workspaces(slug);

-- ────────────────────────────────────────
-- WORKSPACE MEMBERS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members(user_id);

-- ────────────────────────────────────────
-- DEALS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  client_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('debt','equity','ma','advisory','other')),
  stage TEXT NOT NULL DEFAULT 'sourcing' CHECK (stage IN (
    'sourcing','dd','pricing','term_sheet','loi','closing','live','closed_won','closed_lost'
  )),

  amount_mxn NUMERIC(18,2),
  currency TEXT DEFAULT 'MXN',
  target_close_date DATE,

  notes TEXT,

  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deals_workspace_stage_idx ON deals(workspace_id, stage);
CREATE INDEX IF NOT EXISTS deals_created_by_idx ON deals(created_by);

-- ────────────────────────────────────────
-- DEAL MEMBERS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_members (
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('lead','contributor','viewer')),
  is_external BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, user_id)
);

CREATE INDEX IF NOT EXISTS deal_members_user_idx ON deal_members(user_id);

-- ────────────────────────────────────────
-- DEAL INVITATIONS (pre-signup pending)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('contributor','viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  token TEXT UNIQUE NOT NULL,
  UNIQUE(deal_id, email)
);

CREATE INDEX IF NOT EXISTS deal_invitations_token_idx ON deal_invitations(token);
CREATE INDEX IF NOT EXISTS deal_invitations_email_idx ON deal_invitations(email);

-- ────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_deals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_deals();

DROP TRIGGER IF EXISTS deals_updated_at ON deals;
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_deals();

-- ────────────────────────────────────────
-- RLS — Row Level Security
-- ────────────────────────────────────────
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_invitations ENABLE ROW LEVEL SECURITY;

-- ─── WORKSPACES ───
DROP POLICY IF EXISTS workspaces_select ON workspaces;
CREATE POLICY workspaces_select ON workspaces FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workspaces_insert ON workspaces;
CREATE POLICY workspaces_insert ON workspaces FOR INSERT WITH CHECK (
  owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS workspaces_update ON workspaces;
CREATE POLICY workspaces_update ON workspaces FOR UPDATE USING (
  owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS workspaces_delete ON workspaces;
CREATE POLICY workspaces_delete ON workspaces FOR DELETE USING (
  owner_user_id = auth.uid()
);

-- ─── WORKSPACE_MEMBERS ───
DROP POLICY IF EXISTS workspace_members_select ON workspace_members;
CREATE POLICY workspace_members_select ON workspace_members FOR SELECT USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workspace_members_insert ON workspace_members;
CREATE POLICY workspace_members_insert ON workspace_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
      AND w.owner_user_id = auth.uid()
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'owner'
  )
);

DROP POLICY IF EXISTS workspace_members_delete ON workspace_members;
CREATE POLICY workspace_members_delete ON workspace_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
);

-- ─── DEALS ───
DROP POLICY IF EXISTS deals_select ON deals;
CREATE POLICY deals_select ON deals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = deals.workspace_id AND wm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM deal_members dm
    WHERE dm.deal_id = deals.id AND dm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS deals_insert ON deals;
CREATE POLICY deals_insert ON deals FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = deals.workspace_id AND wm.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS deals_update ON deals;
CREATE POLICY deals_update ON deals FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = deals.workspace_id AND wm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM deal_members dm
    WHERE dm.deal_id = deals.id
      AND dm.user_id = auth.uid()
      AND dm.role IN ('lead','contributor')
  )
);

DROP POLICY IF EXISTS deals_delete ON deals;
CREATE POLICY deals_delete ON deals FOR DELETE USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = deals.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
);

-- ─── DEAL_MEMBERS ───
DROP POLICY IF EXISTS deal_members_select ON deal_members;
CREATE POLICY deal_members_select ON deal_members FOR SELECT USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM deal_members dm2
    WHERE dm2.deal_id = deal_members.deal_id AND dm2.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM deals d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = deal_members.deal_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS deal_members_insert ON deal_members;
CREATE POLICY deal_members_insert ON deal_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM deal_members dm
    WHERE dm.deal_id = deal_members.deal_id
      AND dm.user_id = auth.uid()
      AND dm.role = 'lead'
  )
  OR
  EXISTS (
    SELECT 1 FROM deals d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = deal_members.deal_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
);

DROP POLICY IF EXISTS deal_members_delete ON deal_members;
CREATE POLICY deal_members_delete ON deal_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM deal_members dm
    WHERE dm.deal_id = deal_members.deal_id
      AND dm.user_id = auth.uid()
      AND dm.role = 'lead'
  )
  OR
  EXISTS (
    SELECT 1 FROM deals d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = deal_members.deal_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
);

-- ─── DEAL_INVITATIONS ───
DROP POLICY IF EXISTS deal_invitations_select ON deal_invitations;
CREATE POLICY deal_invitations_select ON deal_invitations FOR SELECT USING (
  invited_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM deals d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = deal_invitations.deal_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS deal_invitations_insert ON deal_invitations;
CREATE POLICY deal_invitations_insert ON deal_invitations FOR INSERT WITH CHECK (
  invited_by = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM deal_members dm
    WHERE dm.deal_id = deal_invitations.deal_id
      AND dm.user_id = auth.uid()
      AND dm.role = 'lead'
  )
);

DROP POLICY IF EXISTS deal_invitations_delete ON deal_invitations;
CREATE POLICY deal_invitations_delete ON deal_invitations FOR DELETE USING (
  invited_by = auth.uid()
);

COMMENT ON TABLE workspaces IS 'Plinius Deal Rooms — multi-tenant workspace for investment banking deals';
COMMENT ON TABLE deals IS 'Investment banking deals (debt, equity, m&a, advisory)';
COMMENT ON TABLE deal_members IS 'Granular access per deal, including external invitees';
COMMENT ON TABLE deal_invitations IS 'Pending email invitations awaiting signup acceptance';
