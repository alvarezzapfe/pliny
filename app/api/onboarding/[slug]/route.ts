import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('onb_context')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Otorgante no encontrado' }, { status: 404 })
  }

  // Gating: validate lender has plan PRO
  const { data: lender } = await supabase
    .from('onb_lenders')
    .select('user_id')
    .eq('id', data.lender_id)
    .single()

  if (lender?.user_id) {
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

  return NextResponse.json({
    lender: {
      id:              data.lender_id,
      slug:            data.slug,
      name:            data.lender_name,
      logo_url:        data.logo_url,
      primary_color:   data.primary_color,
      secondary_color: data.secondary_color,
    },
    flow: data.flow_id ? {
      id:    data.flow_id,
      name:  data.flow_name,
      steps: data.steps,
    } : null,
  })
}
