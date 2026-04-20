import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// GET /api/onb-lenders/by-user?user_id=uuid  o  ?email=x@x.com
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  const email  = req.nextUrl.searchParams.get('email')

  if (!userId && !email) {
    return NextResponse.json({ error: 'Se requiere user_id o email' }, { status: 400 })
  }

  const supabase = createServiceClient()

  let query = supabase
    .from('onb_lenders')
    .select('id, slug, name, logo_url, primary_color, secondary_color, descripcion, tasa_min, tasa_max, monto_min, monto_max, sectores, tipo_credito, active')
    .eq('active', true)

  if (userId) query = query.eq('user_id', userId)
  else if (email) query = query.eq('user_id', email.toLowerCase().trim())

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ lender: null })
  }

  return NextResponse.json({ lender: data })
}
