import { z } from "zod";
import {
  DEAL_TYPE_VALUES,
  DEAL_STAGE_VALUES,
  INVITATION_ROLE_VALUES,
} from "./types";
import type { DealType, DealStage, InvitationRole } from "./types";

const slugSchema = z
  .string()
  .min(3, "Slug debe tener al menos 3 caracteres")
  .max(40, "Slug máximo 40 caracteres")
  .regex(/^[a-z0-9-]+$/, "Slug solo permite minúsculas, números y guiones");

export const WorkspaceInputSchema = z.object({
  name: z.string().min(2, "Nombre muy corto").max(100, "Nombre muy largo"),
  slug: slugSchema,
  description: z.string().max(500).optional(),
});

export const DealInputSchema = z.object({
  workspace_id: z.string().uuid("workspace_id inválido"),
  name: z.string().min(2, "Nombre muy corto").max(200),
  client_name: z.string().max(200).optional(),
  type: z.enum(DEAL_TYPE_VALUES as [DealType, ...DealType[]]),
  stage: z.enum(DEAL_STAGE_VALUES as [DealStage, ...DealStage[]]).optional(),
  amount_mxn: z.number().nonnegative("Monto debe ser positivo").optional(),
  currency: z.string().length(3).optional(),
  target_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").optional(),
  notes: z.string().max(10000).optional(),
});

export const DealUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  client_name: z.string().max(200).nullable().optional(),
  type: z.enum(DEAL_TYPE_VALUES as [DealType, ...DealType[]]).optional(),
  stage: z.enum(DEAL_STAGE_VALUES as [DealStage, ...DealStage[]]).optional(),
  amount_mxn: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  target_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
});

export const InvitationInputSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  role: z.enum(INVITATION_ROLE_VALUES as [InvitationRole, ...InvitationRole[]]),
});

export function generateInvitationToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}
