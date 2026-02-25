// app/api/lender/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: regresa el profile por user_id (lo mandas por header o query en MVP)
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabase
    .from("lenders_profile")
    .select(
      "user_id,institution_type,institution_name,rfc,legal_rep_first_names,legal_rep_last_name_paternal,legal_rep_last_name_maternal,legal_rep_email,legal_rep_phone_country,legal_rep_phone_national,updated_at"
    )
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, profile: data }, { status: 200 });
}

// PUT: upsert profile
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  const body = await req.json().catch(() => null);
  if (!body?.userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const payload = {
    user_id: body.userId,
    institution_type: body.institution_type ?? null,
    institution_name: body.institution_name ?? null,
    rfc: body.rfc ?? null,
    legal_rep_first_names: body.legal_rep_first_names ?? null,
    legal_rep_last_name_paternal: body.legal_rep_last_name_paternal ?? null,
    legal_rep_last_name_maternal: body.legal_rep_last_name_maternal ?? null,
    legal_rep_email: body.legal_rep_email ?? null,
    legal_rep_phone_country: body.legal_rep_phone_country ?? null,
    legal_rep_phone_national: body.legal_rep_phone_national ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("lenders_profile")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, profile: data }, { status: 200 });
}