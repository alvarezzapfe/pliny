import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendInviteEmail } from '@/lib/emails/invite'
import { z } from 'zod'

const Schema = z.object({
  email:          z.string().email(),
  custom_message: z.string().max(300).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const supabase = createServiceClient()
    const { data: lender } = await supabase
      .from('onb_lenders')
      .select('id, slug, name, primary_color, secondary_color, active')
      .eq('id', id)
      .single()

    if (!lender || !lender.active) {
      return NextResponse.json({ error: 'Otorgante no encontrado' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const portalUrl = `${appUrl}/onboarding/${lender.slug}`

    const result = await sendInviteEmail({
      to:             parsed.data.email,
      lenderName:     lender.name,
      lenderColor:    lender.primary_color ?? '#1A3A6B',
      lenderSecondary: lender.secondary_color ?? '#00C896',
      portalUrl,
      customMessage:  parsed.data.custom_message,
    })

    if (!result.ok) {
      return NextResponse.json({ error: 'Error al enviar email', detail: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, portal_url: portalUrl, sent_to: parsed.data.email })

  } catch (err) {
    console.error('[POST invite]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
