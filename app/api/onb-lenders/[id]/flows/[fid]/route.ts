import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { UpdateFlowSchema } from '@/lib/onboarding/schemas'

type Params = { params: Promise<{ id: string; fid: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id, fid } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onb_flows')
    .select('id, name, description, is_active, steps, created_at, updated_at')
    .eq('id', fid).eq('lender_id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Flow no encontrado' }, { status: 404 })
  return NextResponse.json({ flow: data })
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id, fid } = await params
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const parsed = UpdateFlowSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('onb_flows').update(parsed.data)
      .eq('id', fid).eq('lender_id', id)
      .select('id, name, description, is_active, steps, updated_at').single()
    if (error || !data) return NextResponse.json({ error: 'Flow no encontrado' }, { status: 404 })
    return NextResponse.json({ flow: data })
  } catch (err) {
    console.error('[PUT flow]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, fid } = await params
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createServiceClient()
  const { error } = await supabase.from('onb_flows').delete().eq('id', fid).eq('lender_id', id)
  if (error) return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
