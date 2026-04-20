import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { generateApiKey } from '@/lib/middleware/tenant'
import { CreateLenderSchema } from '@/lib/onboarding/schemas'

// POST /api/onb-lenders
// Solo accesible con ADMIN_SECRET header (operación interna de Plinius)
export async function POST(req: NextRequest) {
  try {
    // Auth: solo admin interno
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = CreateLenderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const { rawKey, hash } = await generateApiKey()

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('onb_lenders')
      .insert({
        ...parsed.data,
        api_key_hash: hash,
      })
      .select('id, slug, name, primary_color, secondary_color, active, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 })
      }
      throw error
    }

    // Retornamos el rawKey UNA SOLA VEZ — nunca más se puede recuperar
    return NextResponse.json({
      lender: data,
      api_key: rawKey,
      warning: 'Guarda este API key. No se puede recuperar.',
    }, { status: 201 })

  } catch (err) {
    console.error('[POST /api/onb-lenders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/onb-lenders — listar todos (solo admin)
export async function GET(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret')
  if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onb_lenders')
    .select('id, slug, name, logo_url, primary_color, secondary_color, active, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return NextResponse.json({ lenders: data })
}
