import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { validateApiKey } from '@/lib/middleware/tenant'

async function validateToken(token: string): Promise<{ lender_id: string } | null> {
  try {
    const [payloadB64, sigHex] = token.split('.')
    if (!payloadB64 || !sigHex) return null
    const payloadStr = atob(payloadB64)
    const payload = JSON.parse(payloadStr) as { lender_id: string; exp: number }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    const secret = process.env.PLINIUS_ADMIN_SECRET ?? ''
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const valid = await crypto.subtle.verify('HMAC', key, Buffer.from(sigHex, 'hex'), encoder.encode(payloadStr))
    if (!valid) return null
    return { lender_id: payload.lender_id }
  } catch { return null }
}

async function authenticate(req: Request): Promise<{ ok: true; lender_id: string } | { ok: false; error: Response }> {
  const adminSecret = (req as any).headers.get('x-admin-secret')
  if (adminSecret === process.env.PLINIUS_ADMIN_SECRET) {
    return { ok: true, lender_id: '*' }
  }
  const token = (req as any).headers.get('x-portal-token')
  if (token) {
    const result = await validateToken(token)
    if (result) return { ok: true, lender_id: result.lender_id }
    return { ok: false, error: new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 }) }
  }
  const auth = await validateApiKey(req as any)
  if (!auth.ok) return { ok: false, error: auth.error }
  return { ok: true, lender_id: auth.lender.lender_id }
}
import { UpdateApplicantSchema } from '@/lib/onboarding/schemas'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    const auth = await authenticate(req)
    if (!auth.ok) return auth.error as any
    let query = supabase.from('onb_applicants').select('*').eq('id', id)
    if (auth.lender_id !== '*') query = query.eq('lender_id', auth.lender_id)
    const { data, error } = await query.single()

    if (error || !data) return NextResponse.json({ error: 'Solicitante no encontrado' }, { status: 404 })

    let signedDocuments: Record<string, string> = {}
    if (data.documents && Object.keys(data.documents).length > 0) {
      const paths = Object.values(data.documents) as string[]
      const { data: signed } = await supabase.storage.from('applicant-docs').createSignedUrls(paths, 3600)
      if (signed) {
        Object.entries(data.documents as Record<string, string>).forEach(([fieldId, path], i) => {
          if (signed[i]?.signedUrl) signedDocuments[fieldId] = signed[i].signedUrl
        })
      }
    }
    return NextResponse.json({ applicant: { ...data, signed_documents: signedDocuments } })
  } catch (err) {
    console.error('[GET applicant]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const auth = await authenticate(req)
    if (!auth.ok) return auth.error as any

    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from('onb_applicants')
      .select('id, lender_id, status, data, documents, email, phone, full_name')
      .eq('id', id)
      .eq('lender_id', auth.lender_id === "*" ? id : auth.lender_id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Solicitante no encontrado' }, { status: 404 })

    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const body = await req.json()
      const parsed = UpdateApplicantSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

      const mergedData = { ...(existing.data ?? {}), ...(parsed.data.data ?? {}) }
      const { data, error } = await supabase
        .from('onb_applicants')
        .update({
          data:      mergedData,
          email:     parsed.data.email     ?? existing.email,
          phone:     parsed.data.phone     ?? existing.phone,
          full_name: parsed.data.full_name ?? existing.full_name,
          status:    existing.status === 'draft' ? 'in_progress' : existing.status,
        })
        .eq('id', id)
        .select('id, status, data, documents, updated_at')
        .single()

      if (error) throw error
      return NextResponse.json({ applicant: data })
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const updatedDocuments = { ...(existing.documents ?? {}) } as Record<string, string>
      const updatedData = { ...(existing.data ?? {}) } as Record<string, unknown>

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          const ext = value.name.split('.').pop()
          const path = `${auth.lender_id === "*" ? id : auth.lender_id}/${id}/${key}.${ext}`
          const buffer = await value.arrayBuffer()
          const { error: storageError } = await supabase.storage
            .from('applicant-docs')
            .upload(path, buffer, { contentType: value.type, upsert: true })
          if (!storageError) updatedDocuments[key] = path
        } else {
          try { updatedData[key] = JSON.parse(value) } catch { updatedData[key] = value }
        }
      }

      const { data, error } = await supabase
        .from('onb_applicants')
        .update({
          data: updatedData, documents: updatedDocuments,
          status: existing.status === 'draft' ? 'in_progress' : existing.status,
        })
        .eq('id', id)
        .select('id, status, data, documents, updated_at')
        .single()

      if (error) throw error
      return NextResponse.json({ applicant: data })
    }

    return NextResponse.json({ error: 'Content-Type no soportado' }, { status: 415 })
  } catch (err) {
    console.error('[PUT applicant]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
