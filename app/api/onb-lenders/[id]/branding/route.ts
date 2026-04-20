import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { UpdateBrandingSchema } from '@/lib/onboarding/schemas'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== process.env.PLINIUS_ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceClient()
    const { data: lender } = await supabase
      .from('onb_lenders').select('id, slug').eq('id', id).single()

    if (!lender) return NextResponse.json({ error: 'Lender no encontrado' }, { status: 404 })

    const formData = await req.formData()
    const logoFile = formData.get('logo') as File | null
    const primaryColor   = formData.get('primary_color') as string | null
    const secondaryColor = formData.get('secondary_color') as string | null

    const colorsResult = UpdateBrandingSchema.partial().safeParse({
      primary_color: primaryColor ?? undefined,
      secondary_color: secondaryColor ?? undefined,
    })
    if (!colorsResult.success) {
      return NextResponse.json({ error: colorsResult.error.flatten() }, { status: 422 })
    }

    let logo_url: string | undefined
    if (logoFile) {
      const allowed = ['image/png','image/jpeg','image/svg+xml','image/webp']
      if (!allowed.includes(logoFile.type))
        return NextResponse.json({ error: 'Tipo no permitido' }, { status: 422 })
      if (logoFile.size > 2 * 1024 * 1024)
        return NextResponse.json({ error: 'Máx 2MB' }, { status: 422 })

      const ext = logoFile.name.split('.').pop()
      const path = `${id}/logo.${ext}`
      const buffer = await logoFile.arrayBuffer()
      const { error: storageError } = await supabase.storage
        .from('lender-assets').upload(path, buffer, { contentType: logoFile.type, upsert: true })
      if (storageError) return NextResponse.json({ error: 'Error al subir logo' }, { status: 500 })
      const { data: urlData } = supabase.storage.from('lender-assets').getPublicUrl(path)
      logo_url = urlData.publicUrl
    }

    const updates: Record<string, string> = {}
    if (logo_url)      updates.logo_url        = logo_url
    if (primaryColor)  updates.primary_color   = primaryColor
    if (secondaryColor) updates.secondary_color = secondaryColor

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

    const { data, error } = await supabase
      .from('onb_lenders').update(updates).eq('id', id)
      .select('id, slug, logo_url, primary_color, secondary_color').single()

    if (error) throw error
    return NextResponse.json({ branding: data })
  } catch (err) {
    console.error('[POST branding]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onb_lenders')
    .select('id, slug, name, logo_url, primary_color, secondary_color')
    .eq('id', id).eq('active', true).single()

  if (error || !data) return NextResponse.json({ error: 'Lender no encontrado' }, { status: 404 })
  return NextResponse.json({ branding: data })
}
