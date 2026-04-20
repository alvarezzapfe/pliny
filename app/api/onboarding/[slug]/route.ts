import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = createServiceClient()

  console.log('[onboarding] slug:', slug)

  const { data, error } = await supabase
    .from('onb_context')
    .select('*')
    .eq('slug', slug)
    .single()

  console.log('[onboarding] data:', JSON.stringify(data))
  console.log('[onboarding] error:', JSON.stringify(error))

  if (error || !data) {
    return NextResponse.json({ error: 'Otorgante no encontrado' }, { status: 404 })
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
