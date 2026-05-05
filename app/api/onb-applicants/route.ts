// POST /api/onb-applicants — Create applicant + evaluate approval rules + notify
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { sanitizePayload, evaluateRules, type ApprovalRule } from '@/lib/onboarding/validators'

// Helper: convierte "", null en undefined antes de validar
const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v)

const CreateSchema = z.object({
  flow_id:    z.string().uuid(),
  email:      z.preprocess(emptyToUndef, z.string().email().optional()),
  full_name:  z.preprocess(emptyToUndef, z.string().optional()),
  phone:      z.preprocess(emptyToUndef, z.string().optional()),
  utm_source: z.preprocess(emptyToUndef, z.string().optional()),
  data:       z.record(z.unknown()).optional(),
})

async function validateToken(token: string): Promise<{ lender_id: string; slug: string } | null> {
  try {
    const [payloadB64, sigHex] = token.split('.')
    if (!payloadB64 || !sigHex) return null

    const payloadStr = atob(payloadB64)
    const payload = JSON.parse(payloadStr) as { lender_id: string; slug: string; exp: number }

    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    const secret = process.env.PLINIUS_ADMIN_SECRET ?? ''
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    )
    const sigBuf = Buffer.from(sigHex, 'hex')
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(payloadStr))
    if (!valid) return null

    return { lender_id: payload.lender_id, slug: payload.slug }
  } catch {
    return null
  }
}

// POST /api/onb-applicants
export async function POST(req: NextRequest) {
  try {
    const token    = req.headers.get('x-portal-token')
    const apiKey   = req.headers.get('x-api-key')
    const supabase = createServiceClient()

    let lender_id: string = ''

    if (token) {
      const result = await validateToken(token)
      if (!result) return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
      lender_id = result.lender_id
    } else if (apiKey) {
      const bcrypt = (await import('bcryptjs')).default
      const { data: lenders } = await supabase
        .from('onb_lenders')
        .select('id, api_key_hash, active')
        .eq('active', true)

      let found = false
      for (const l of lenders ?? []) {
        if (!l.api_key_hash) continue
        const match = await bcrypt.compare(apiKey, l.api_key_hash)
        if (match) { lender_id = l.id; found = true; break }
      }
      if (!found) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    } else {
      return NextResponse.json({ error: 'Se requiere x-portal-token o x-api-key' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[onb-applicants] Zod validation failed:', JSON.stringify(parsed.error.issues))
      console.error('[onb-applicants] Body recibido:', JSON.stringify(body))
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.issues }, { status: 422 })
    }

    // Verify flow belongs to lender
    const { data: flow } = await supabase
      .from('onb_flows')
      .select('id')
      .eq('id', parsed.data.flow_id)
      .eq('lender_id', lender_id)
      .single()

    if (!flow) return NextResponse.json({ error: 'Flow no encontrado' }, { status: 404 })

    // Rate limit check
    const { data: lenderData } = await supabase
      .from('onb_lenders')
      .select('user_id, name')
      .eq('id', lender_id)
      .single()

    const { data: profile } = lenderData?.user_id
      ? await supabase.from('plinius_profiles').select('plan').eq('user_id', lenderData.user_id).maybeSingle()
      : { data: null }

    const plan = profile?.plan ?? 'free'
    const LIMITS: Record<string, number> = { free: 0, basic: 30, pro: 150 }
    const limit = LIMITS[plan] ?? 0

    if (limit > 0) {
      const som = new Date()
      som.setDate(1); som.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('onb_applicants')
        .select('id', { count: 'exact', head: true })
        .eq('lender_id', lender_id)
        .gte('created_at', som.toISOString())

      if ((count ?? 0) >= limit) {
        return NextResponse.json({
          error: 'limit_reached',
          message: `Has alcanzado el límite de ${limit} onboardings este mes.`,
          limit, count,
        }, { status: 429 })
      }
    } else if (limit === 0) {
      return NextResponse.json({
        error: 'limit_reached',
        message: 'Tu plan no incluye onboardings.',
        limit: 0,
      }, { status: 429 })
    }

    // Sanitize data
    const sanitizedData = parsed.data.data ? sanitizePayload(parsed.data.data as Record<string, unknown>) : {}

    // Insert applicant
    const { data: applicant, error: insertErr } = await supabase
      .from('onb_applicants')
      .insert({
        lender_id,
        flow_id:    parsed.data.flow_id,
        email:      parsed.data.email,
        phone:      parsed.data.phone,
        full_name:  parsed.data.full_name,
        utm_source: parsed.data.utm_source,
        status:     'in_progress',
        data:       sanitizedData,
        ip_address: req.headers.get('x-forwarded-for') ?? undefined,
        user_agent: req.headers.get('user-agent') ?? undefined,
      })
      .select('id, lender_id, flow_id, status, email, full_name, created_at')
      .single()

    if (insertErr) throw insertErr

    // Evaluate approval rules
    const { data: rules } = await supabase
      .from('onb_approval_rules')
      .select('id, field, operator, value, message')
      .eq('lender_id', lender_id)
      .eq('is_active', true)

    let finalStatus: 'pre_approved' | 'pending_review' = 'pending_review'
    let failedRules: { field: string; message: string }[] = []

    if (rules && rules.length > 0) {
      const evaluation = evaluateRules(rules as ApprovalRule[], sanitizedData)
      finalStatus = evaluation.passed ? 'pre_approved' : 'pending_review'
      failedRules = evaluation.failed
    }

    // Update status
    await supabase
      .from('onb_applicants')
      .update({ status: finalStatus === 'pre_approved' ? 'completed' : 'in_progress' })
      .eq('id', applicant.id)

    // Send email notifications (non-blocking)
    try {
      const lenderName = lenderData?.name ?? 'Plinius'
      const empresa = sanitizedData.razon_social ?? parsed.data.full_name ?? 'Sin nombre'
      const emailRep = parsed.data.email ?? sanitizedData.email_rep_legal

      // Email to applicant
      if (emailRep) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${lenderName} <noreply@plinius.mx>`,
            to: [String(emailRep)],
            subject: `Recibimos tu solicitud con ${lenderName}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1E2A3A;">
                <h2 style="color:#0C1E4A;">Recibimos tu solicitud</h2>
                <p>Hola ${parsed.data.full_name ?? ''},</p>
                <p>${finalStatus === 'pre_approved'
                  ? 'Tu solicitud fue pre-aprobada. Te contactaremos en las próximas 24 horas con los siguientes pasos.'
                  : 'Estamos revisando tu información. Te contactaremos en las próximas 24 horas.'}
                </p>
                <p style="color:#64748B;font-size:13px;">— Equipo ${lenderName}</p>
              </div>
            `,
          }),
        })
      }

      // Email to lender (luis@plinius.mx)
      const dataEntries = Object.entries(sanitizedData).filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 8px;font-weight:600;color:#64748B;">${k}</td><td style="padding:4px 8px;">${String(v)}</td></tr>`).join('')
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Plinius <noreply@plinius.mx>',
          to: ['luis@plinius.mx'],
          subject: `Nueva solicitud: ${empresa} – ${finalStatus}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E2A3A;">
              <div style="background:#0C1E4A;padding:16px 24px;border-radius:10px 10px 0 0;">
                <h2 style="color:#fff;font-size:16px;margin:0;">Nueva solicitud de onboarding</h2>
              </div>
              <div style="padding:20px 24px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 10px 10px;">
                <p><strong>Status:</strong> <span style="color:${finalStatus === 'pre_approved' ? '#059669' : '#F59E0B'}">${finalStatus}</span></p>
                <p><strong>Lender:</strong> ${lenderName}</p>
                <table style="width:100%;border-collapse:collapse;margin-top:12px;">${dataEntries}</table>
                ${failedRules.length > 0 ? `<div style="margin-top:16px;padding:10px;background:#FFFBEB;border-radius:8px;"><strong>Reglas no cumplidas:</strong><ul>${failedRules.map(r => `<li>${r.message}</li>`).join('')}</ul></div>` : ''}
              </div>
            </div>
          `,
        }),
      })
      console.log('[onb-applicants] Emails sent')
    } catch (emailErr) {
      console.error('[onb-applicants] Email error (non-blocking):', emailErr)
    }

    return NextResponse.json({
      applicant,
      status: finalStatus,
      failed_rules: failedRules,
    }, { status: 201 })

  } catch (err) {
    console.error('[POST /api/onb-applicants]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/onb-applicants
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(req.url)
    const adminSecret = req.headers.get('x-admin-secret')

    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const lender_id = searchParams.get('lender_id')

    let query = supabase
      .from('onb_applicants')
      .select('id, status, email, phone, full_name, utm_source, completed_at, created_at, updated_at, lender_id, data, onb_lenders!inner(id, name, slug, primary_color, secondary_color)')
      .order('created_at', { ascending: false })

    if (lender_id) query = query.eq('lender_id', lender_id)

    const status = searchParams.get('status')
    if (status) query = query.eq('status', status)

    const email = searchParams.get('email')
    if (email) query = query.ilike('email', `%${email}%`)

    const from = searchParams.get('from')
    if (from) query = query.gte('created_at', from)

    const to = searchParams.get('to')
    if (to) query = query.lte('created_at', to)

    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0')
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ applicants: data, count })

  } catch (err) {
    console.error('[GET /api/onb-applicants]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
