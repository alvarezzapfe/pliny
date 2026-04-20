import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

const Schema = z.object({
  user_id:      z.string().optional(),
  descripcion:  z.string().optional(),
  tipo_credito: z.string().optional(),
  tasa_min:     z.number().nullable().optional(),
  tasa_max:     z.number().nullable().optional(),
  monto_min:    z.number().nullable().optional(),
  monto_max:    z.number().nullable().optional(),
  sectores:     z.array(z.string()).nullable().optional(),
  webhook_url:  z.string().url().optional(),
  metadata:     z.record(z.unknown()).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('onb_lenders')
      .update(parsed.data)
      .eq('id', id)
      .select('id, slug, name, user_id, descripcion, tipo_credito, tasa_min, tasa_max, monto_min, monto_max, sectores')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Lender no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ lender: data })
  } catch (err) {
    console.error('[PUT profile]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
