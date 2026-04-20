import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { validateApiKey } from '@/lib/middleware/tenant'
import { UpdateStatusSchema } from '@/lib/onboarding/schemas'
import { sendApplicantConfirmation, sendLenderNotification } from '@/lib/emails/resend'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await validateApiKey(req)
    if (!auth.ok) return auth.error

    const body = await req.json()
    const parsed = UpdateStatusSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const supabase = createServiceClient()
    const { data: applicant } = await supabase
      .from('onb_applicants')
      .select('id, status, email, full_name, phone, lender_id')
      .eq('id', id).eq('lender_id', auth.lender.lender_id).single()

    if (!applicant) return NextResponse.json({ error: 'Solicitante no encontrado' }, { status: 404 })

    const { data: updated, error } = await supabase
      .from('onb_applicants').update({ status: parsed.data.status }).eq('id', id)
      .select('id, status, completed_at, updated_at').single()

    if (error) throw error

    if (parsed.data.status === 'completed' && applicant.status !== 'completed') {
      const { data: lender } = await supabase
        .from('onb_lenders')
        .select('name, primary_color, webhook_url, webhook_secret, metadata')
        .eq('id', auth.lender.lender_id).single()

      if (lender) {
        const lenderEmail = (lender.metadata as Record<string, string>)?.contact_email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.plinius.mx'

        if (applicant.email) {
          sendApplicantConfirmation({
            to: applicant.email,
            applicantName: applicant.full_name ?? 'Solicitante',
            lenderName: lender.name,
            lenderColor: lender.primary_color ?? '#1A3A6B',
          }).catch(e => console.error('[email applicant]', e))
        }

        if (lenderEmail) {
          sendLenderNotification({
            to: lenderEmail,
            lenderName: lender.name,
            applicantName: applicant.full_name ?? 'Sin nombre',
            applicantEmail: applicant.email ?? 'Sin correo',
            applicantPhone: applicant.phone ?? undefined,
            applicantId: id,
            dashboardUrl: `${appUrl}/dashboard/applicants`,
          }).catch(e => console.error('[email lender]', e))
        }

        if (lender.webhook_url) {
          const payload = {
            event: 'applicant.completed', applicant_id: id,
            lender_id: auth.lender.lender_id,
            email: applicant.email, full_name: applicant.full_name,
            timestamp: new Date().toISOString(),
          }
          fetch(lender.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(e => console.error('[webhook]', e))
        }
      }
    }

    return NextResponse.json({ applicant: updated })
  } catch (err) {
    console.error('[PATCH status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
