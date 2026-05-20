// Plinius Deal Rooms — TypeScript types

export type WorkspaceRole = "owner" | "admin" | "member";
export type DealType = "debt" | "equity" | "ma" | "advisory" | "other";
export type DealStage =
  | "sourcing"
  | "dd"
  | "pricing"
  | "term_sheet"
  | "loi"
  | "closing"
  | "live"
  | "closed_won"
  | "closed_lost";
export type DealMemberRole = "lead" | "contributor" | "viewer";
export type InvitationRole = "contributor" | "viewer";

export const WORKSPACE_ROLE_VALUES: WorkspaceRole[] = ["owner", "admin", "member"];
export const DEAL_TYPE_VALUES: DealType[] = ["debt", "equity", "ma", "advisory", "other"];
export const DEAL_STAGE_VALUES: DealStage[] = [
  "sourcing", "dd", "pricing", "term_sheet", "loi", "closing", "live", "closed_won", "closed_lost",
];
export const DEAL_MEMBER_ROLE_VALUES: DealMemberRole[] = ["lead", "contributor", "viewer"];
export const INVITATION_ROLE_VALUES: InvitationRole[] = ["contributor", "viewer"];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  sourcing: "Sourcing",
  dd: "Due Diligence",
  pricing: "Pricing",
  term_sheet: "Term Sheet",
  loi: "LOI",
  closing: "Closing",
  live: "Live",
  closed_won: "Cerrado (Exitoso)",
  closed_lost: "Cerrado (No prosperó)",
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  debt: "Deuda",
  equity: "Equity",
  ma: "M&A",
  advisory: "Advisory",
  other: "Otro",
};

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  added_by: string | null;
  joined_at: string;
}

export interface Deal {
  id: string;
  workspace_id: string;
  name: string;
  client_name: string | null;
  type: DealType;
  stage: DealStage;
  amount_mxn: number | null;
  currency: string;
  target_close_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DealMember {
  deal_id: string;
  user_id: string;
  role: DealMemberRole;
  is_external: boolean;
  invited_by: string;
  invited_at: string;
}

export interface DealInvitation {
  id: string;
  deal_id: string;
  email: string;
  role: InvitationRole;
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string;
  token: string;
}

export interface WorkspaceInput {
  name: string;
  slug: string;
  description?: string;
}

export interface DealInput {
  workspace_id: string;
  name: string;
  type: DealType;
  client_name?: string;
  stage?: DealStage;
  amount_mxn?: number;
  currency?: string;
  target_close_date?: string;
  notes?: string;
}

export interface DealUpdate {
  name?: string;
  client_name?: string | null;
  type?: DealType;
  stage?: DealStage;
  amount_mxn?: number | null;
  currency?: string;
  target_close_date?: string | null;
  notes?: string | null;
}

export interface InvitationInput {
  email: string;
  role: InvitationRole;
}
