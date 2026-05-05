import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServiceClient()

  // Get active lenders
  const { data: lenders, error } = await supabase
    .from('onb_lenders')
    .select('id, slug, name, logo_url, primary_color, secondary_color, descripcion, tasa_min, tasa_max, monto_min, monto_max, sectores, tipo_credito, user_id')
    .eq('active', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Error al obtener otorgantes' }, { status: 500 })
  }

  // Filter to only PRO/enterprise lenders
  const lenderIds = (lenders ?? []).filter(l => l.user_id).map(l => l.user_id as string)

  let proUserIds: Set<string> = new Set()
  if (lenderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('plinius_profiles')
      .select('user_id, plan')
      .in('user_id', lenderIds)
      .in('plan', ['pro', 'enterprise'])

    proUserIds = new Set((profiles ?? []).map(p => p.user_id))
  }

  const filtered = (lenders ?? [])
    .filter(l => l.user_id && proUserIds.has(l.user_id))
    .map(({ user_id, ...rest }) => rest) // Strip user_id from public response

  return NextResponse.json({ lenders: filtered }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
  })
}
