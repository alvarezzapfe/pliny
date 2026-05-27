// GET  /api/onb-lenders/me — read my lender (JWT auth)
// PATCH /api/onb-lenders/me — update my lender (JWT auth, slug immutable)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-server";
import { z } from "zod";

const LENDER_SELECT = "id, slug, name, logo_url, primary_color, secondary_color, descripcion, tasa_min, tasa_max, monto_min, monto_max, sectores, tipo_credito, active, webhook_url, api_key_last4, created_at, updated_at";

// Extended update schema — allows all editable fields (slug, id, user_id, api_key_hash excluded)
const MyLenderUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(500).nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  tasa_min: z.number().min(0).max(200).nullable().optional(),
  tasa_max: z.number().min(0).max(200).nullable().optional(),
  monto_min: z.number().min(0).nullable().optional(),
  monto_max: z.number().min(0).nullable().optional(),
  sectores: z.array(z.string()).nullable().optional(),
  tipo_credito: z.string().max(200).nullable().optional(),
  active: z.boolean().optional(),
  webhook_url: z.string().url().nullable().optional(),
});

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const sb = createServiceClient();
    const { data: lender, error } = await sb
      .from("onb_lenders")
      .select(LENDER_SELECT)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/onb-lenders/me]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!lender) {
      return NextResponse.json({ error: "No tienes un portal configurado" }, { status: 404 });
    }

    return NextResponse.json({ lender });
  } catch (e: any) {
    console.error("[GET /api/onb-lenders/me] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const sb = createServiceClient();

    // Find my lender
    const { data: existing } = await sb
      .from("onb_lenders")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "No tienes un portal configurado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = MyLenderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    const { data: lender, error: errUpd } = await sb
      .from("onb_lenders")
      .update(parsed.data)
      .eq("id", existing.id)
      .select(LENDER_SELECT)
      .single();

    if (errUpd) {
      console.error("[PATCH /api/onb-lenders/me]", errUpd);
      return NextResponse.json({ error: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ lender });
  } catch (e: any) {
    console.error("[PATCH /api/onb-lenders/me] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
