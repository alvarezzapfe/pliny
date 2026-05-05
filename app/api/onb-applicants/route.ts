import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Helper: convierte "" en undefined antes de validar
const emptyToUndef = (v: unknown) => (v === '' ? undefined : v)

const CreateSchema = z.object({
  flow_id:    z.string().uuid(),
  email:      z.preprocess(emptyToUndef, z.string().email().optional()),
  full_name:  z.preprocess(emptyToUndef, z.string().optional()),
  phone:      z.preprocess(emptyToUndef, z.string().optional()),
  utm_source: z.preprocess(emptyToUndef, z.string().optional()),
})

async function validateToken(token: string): Promise<{ lender_id: string; slug: string } | null> {
  try {
    const [payloadB64, sigHex] = token.split('.')
    if (!payloadB64 || !sigHex) return null

    const payloadStr = atob(payloadB64)
    const payload = JSON.parse(payloadStr) as { lender_id: string; slug: string; exp: number }

    // Verificar expiración
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    // Verificar firma
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
    // Aceptar tanto token firmado como API key legacy
    const token    = req.headers.get('x-portal-token')
    const apiKey   = req.headers.get('x-api-key')
    const supabase = createServiceClient()

    let lender_id: string

    if (token) {
      const result = await validateToken(token)
      if (!result) return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
      lender_id = result.lender_id
    } else if (apiKey) {
      // Fallback legacy: validar API key
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

    // Verificar flow pertenece al lender
    const { data: flow } = await supabase
      .from('onb_flows')
      .select('id')
      .eq('id', parsed.data.flow_id)
      .eq('lender_id', lender_id!)
      .single()

    if (!flow) return NextResponse.json({ error: 'Flow no encontrado' }, { status: 404 })

    // ── Validar límite mensual de onboardings por plan ──────────────────────
    const { data: lenderData } = await supabase
      .from('onb_lenders')
      .select('user_id')
      .eq('id', lender_id!)
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
        .eq('lender_id', lender_id!)
        .gte('created_at', som.toISOString())

      if ((count ?? 0) >= limit) {
        return NextResponse.json({
          error: 'limit_reached',
          message: `Has alcanzado el límite de ${limit} onboardings este mes. Contacta a luis@plinius.mx para ampliar tu plan.`,
          limit,
          count,
        }, { status: 429 })
      }
    } else if (limit === 0) {
      return NextResponse.json({
        error: 'limit_reached',
        message: 'Tu plan no incluye onboardings. Contacta a luis@plinius.mx para activar esta función.',
        limit: 0,
      }, { status: 429 })
    }
    // ────────────────────────────────────────────────────────────────────────

    const { data, error } = await supabase
      .from('onb_applicants')
      .insert({
        lender_id:  lender_id!,
        flow_id:    parsed.data.flow_id,
        email:      parsed.data.email,
        phone:      parsed.data.phone,
        full_name:  parsed.data.full_name,
        utm_source: parsed.data.utm_source,
        status:     'draft',
        ip_address: req.headers.get('x-forwarded-for') ?? undefined,
        user_agent: req.headers.get('user-agent') ?? undefined,
      })
      .select('id, lender_id, flow_id, status, email, full_name, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ applicant: data }, { status: 201 })

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

    let lender_id: string | null = null

    if (adminSecret === process.env.PLINIUS_ADMIN_SECRET) {
      lender_id = searchParams.get('lender_id')
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = supabase
      .from('onb_applicants')
      .select('id, status, email, phone, full_name, utm_source, completed_at, created_at, updated_at, lender_id, onb_lenders!inner(id, name, slug, primary_color, secondary_color)')
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
