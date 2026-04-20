import { z } from 'zod'

// ── Field types soportados en el wizard ──────────────────────
export const FieldSchema = z.object({
  id:         z.string().min(1),
  label:      z.string().min(1),
  type:       z.enum(['text','email','phone','number','select','date','file','boolean']),
  required:   z.boolean().default(false),
  options:    z.array(z.string()).optional(),   // para type: select
  accept:     z.string().optional(),            // para type: file (MIME types)
  maxSizeMB:  z.number().optional(),            // para type: file
  validation: z.object({
    pattern:  z.string().optional(),
    min:      z.number().optional(),
    max:      z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }).optional(),
})

export const StepSchema = z.object({
  id:     z.string().min(1),
  title:  z.string().min(1),
  order:  z.number().int().positive(),
  fields: z.array(FieldSchema).min(1),
})

// ── Lender ───────────────────────────────────────────────────
export const CreateLenderSchema = z.object({
  slug:            z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  name:            z.string().min(2).max(100),
  primary_color:   z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  webhook_url:     z.string().url().optional(),
  metadata:        z.record(z.unknown()).optional(),
})

export const UpdateLenderSchema = CreateLenderSchema.partial().omit({ slug: true })

// ── Branding ─────────────────────────────────────────────────
export const UpdateBrandingSchema = z.object({
  primary_color:   z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

// ── Flow ─────────────────────────────────────────────────────
export const CreateFlowSchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().optional(),
  is_active:   z.boolean().default(true),
  steps:       z.array(StepSchema).min(1),
})

export const UpdateFlowSchema = CreateFlowSchema.partial()

// ── Applicant ────────────────────────────────────────────────
export const CreateApplicantSchema = z.object({
  flow_id:    z.string().uuid(),
  email:      z.string().email().optional(),
  phone:      z.string().optional(),
  full_name:  z.string().optional(),
  utm_source: z.string().optional(),
})

export const UpdateApplicantSchema = z.object({
  data:      z.record(z.unknown()).optional(),
  documents: z.record(z.string()).optional(),  // field_id → storage path
  email:     z.string().email().optional(),
  phone:     z.string().optional(),
  full_name: z.string().optional(),
})

export const UpdateStatusSchema = z.object({
  status: z.enum(['draft','in_progress','completed','rejected','expired']),
})

export type CreateLender    = z.infer<typeof CreateLenderSchema>
export type UpdateLender    = z.infer<typeof UpdateLenderSchema>
export type CreateFlow      = z.infer<typeof CreateFlowSchema>
export type UpdateFlow      = z.infer<typeof UpdateFlowSchema>
export type CreateApplicant = z.infer<typeof CreateApplicantSchema>
export type UpdateApplicant = z.infer<typeof UpdateApplicantSchema>
