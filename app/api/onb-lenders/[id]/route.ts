import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { UpdateLenderSchema } from '@/lib/onboarding/schemas'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onb_lenders')
    .select('id, slug, name, logo_url, primary_color, secondary_color, webhook_url, active, metadata, created_at, updated_at')
    .eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Lender no encontrado' }, { status: 404 })
  return NextResponse.json({ lender: data })
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const parsed = UpdateLenderSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('onb_lenders').update(parsed.data).eq('id', id)
      .select('id, slug, name, logo_url, primary_color, secondary_color, active, updated_at').single()
    if (error || !data) return NextResponse.json({ error: 'Lender no encontrado' }, { status: 404 })
    return NextResponse.json({ lender: data })
  } catch (err) {
    console.error('[PUT lender]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createServiceClient()
  const { error } = await supabase.from('onb_lenders').update({ active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Error al desactivar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
