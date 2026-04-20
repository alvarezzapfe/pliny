import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('onb_lenders')
    .select('id, slug, name, logo_url, primary_color, secondary_color, descripcion, tasa_min, tasa_max, monto_min, monto_max, sectores, tipo_credito')
    .eq('active', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Error al obtener otorgantes' }, { status: 500 })
  }

  return NextResponse.json({ lenders: data ?? [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
  })
}
