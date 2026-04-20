import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export type LenderContext = {
  lender_id: string
  slug: string
  name: string
}

/**
 * Valida el header x-api-key contra el hash en onb_lenders.
 * Usado por endpoints que el portal público llama (POST /onb-applicants, etc.)
 */
export async function validateApiKey(req: NextRequest): Promise<
  { ok: true; lender: LenderContext } | { ok: false; error: NextResponse }
> {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    return {
      ok: false,
      error: NextResponse.json({ error: 'Missing x-api-key header' }, { status: 401 }),
    }
  }

  const supabase = createServiceClient()
  const { data: lenders, error } = await supabase
    .from('onb_lenders')
    .select('id, slug, name, api_key_hash, active')
    .eq('active', true)

  if (error || !lenders?.length) {
    return {
      ok: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Buscar el lender cuyo hash matchea (O(n) pero n es pequeño)
  for (const lender of lenders) {
    if (!lender.api_key_hash) continue
    const match = await bcrypt.compare(apiKey, lender.api_key_hash)
    if (match) {
      return {
        ok: true,
        lender: { lender_id: lender.id, slug: lender.slug, name: lender.name },
      }
    }
  }

  return {
    ok: false,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }
}

/**
 * Genera un nuevo API key y retorna { rawKey, hash }
 * rawKey se entrega UNA SOLA VEZ al otorgante. Solo el hash se guarda.
 */
export async function generateApiKey(): Promise<{ rawKey: string; hash: string }> {
  const rawKey = `pk_live_${crypto.randomUUID().replace(/-/g, '')}`
  const hash = await bcrypt.hash(rawKey, 12)
  return { rawKey, hash }
}
