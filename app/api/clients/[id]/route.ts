import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { id: string };

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin(); // ✅ aquí adentro
    const { id } = await params;

    const body = await request.json();
    const company_name = String(body?.company_name ?? body?.name ?? "").trim();

    if (!company_name) {
      return NextResponse.json({ error: "company_name es obligatorio" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update({
        company_name,
        legal_representative: body?.legal_representative ?? null,
        contact_phone: body?.contact_phone ?? null,
        contact_email: body?.contact_email ?? null,
      })
      .eq("id", id)
      .select("id, company_name, rfc, status, created_at, legal_representative, contact_phone, contact_email")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ client: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}