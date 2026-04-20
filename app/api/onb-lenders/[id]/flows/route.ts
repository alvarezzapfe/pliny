import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { CreateFlowSchema } from '@/lib/onboarding/schemas'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onb_flows')
    .select('id, name, description, is_active, steps, created_at, updated_at')
    .eq('lender_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al obtener flows' }, { status: 500 })
  }
  return NextResponse.json({ flows: data })
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = CreateFlowSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const supabase = createServiceClient()
    const { data: lender } = await supabase
      .from('onb_lenders')
      .select('id')
      .eq('id', id)
      .single()

    if (!lender) {
      return NextResponse.json({ error: 'Lender no encontrado' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('onb_flows')
      .insert({ ...parsed.data, lender_id: id })
      .select('id, name, description, is_active, steps, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ flow: data }, { status: 201 })

  } catch (err) {
    console.error('[POST flows]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
