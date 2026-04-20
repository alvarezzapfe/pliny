import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rfc, ciec, owner_id, borrower_id } = body;
    if (!rfc || !ciec || !owner_id)
      return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("ekatena_requests")
      .insert({
        rfc,
        ciec_encrypted: "***",
        owner_id,
        borrower_id: borrower_id ?? null,
        status: "pending_payment",
        amount: 400,
        updated_at: new Date().toISOString(),
      })
      .select().maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, request: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, resultado, notas_admin, approved_by } = body;
    if (!id || !status)
      return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });

    const patch: any = { status, updated_at: new Date().toISOString() };
    if (resultado)   patch.resultado    = resultado;
    if (notas_admin) patch.notas_admin  = notas_admin;
    if (approved_by) patch.approved_by  = approved_by;
    if (status === "payment_confirmed") patch.paid_at     = new Date().toISOString();
    if (status === "completed")         patch.approved_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("ekatena_requests")
      .update(patch).eq("id", id)
      .select().maybeSingle();

    if (error) throw error;

    if (status === "completed" && resultado && data?.owner_id) {
      await supabaseAdmin.from("borrowers_profile").update({
        ekatena_verificado:  true,
        ekatena_resultado:   resultado,
        ekatena_consulta_id: data.id,
        ekatena_at:          new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      }).eq("owner_id", data.owner_id);
    }

    return NextResponse.json({ ok: true, request: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    let query = supabaseAdmin
      .from("ekatena_requests")
      .select("*, borrowers_profile(company_name, company_rfc, rep_first_names, rep_last_name)")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, requests: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
