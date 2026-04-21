import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { id: string };

// PUT — legacy update (company_name + basic fields)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
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
        updated_at: new Date().toISOString(),
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

// PATCH — inline field update (any column)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id } = await params;
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
