import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ slug: string }> }

// GET /api/onboarding/[slug]/token
// Genera un token temporal firmado para que el portal pueda crear applicants
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: lender } = await supabase
    .from('onb_lenders')
    .select('id, slug, name, primary_color, secondary_color, logo_url, api_key_hash, active, user_id')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!lender) {
    return NextResponse.json({ error: 'Otorgante no encontrado' }, { status: 404 })
  }

  // Gating: validate lender has plan PRO
  if (lender.user_id) {
    const { data: profile } = await supabase
      .from('plinius_profiles')
      .select('plan')
      .eq('user_id', lender.user_id)
      .maybeSingle()

    if (!profile || (profile.plan !== 'pro' && profile.plan !== 'enterprise')) {
      return NextResponse.json({
        error: 'requires_pro',
        message: 'Esta función requiere plan PRO.',
      }, { status: 402 })
    }
  }

  // Generar token temporal firmado con HMAC (válido 2 horas)
  const payload = {
    lender_id: lender.id,
    slug:      lender.slug,
    exp:       Math.floor(Date.now() / 1000) + 7200,
  }

  const secret = process.env.PLINIUS_ADMIN_SECRET ?? ''
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const payloadStr = JSON.stringify(payload)
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr))
  const token = btoa(payloadStr) + '.' + Buffer.from(sig).toString('hex')

  return NextResponse.json({
    token,
    lender: {
      id:              lender.id,
      slug:            lender.slug,
      name:            lender.name,
      logo_url:        lender.logo_url,
      primary_color:   lender.primary_color,
      secondary_color: lender.secondary_color,
    }
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
