// app/api/clients/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx.params.id;
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name es obligatorio" }, { status: 400 });
    }

    // Ajusta aquí los campos reales de tu tabla clients
    const updatePayload: any = {
      company_name: name,
    };

    // si tu tabla tiene estos campos, descomenta:
    // updatePayload.email = body?.email ?? null;
    // updatePayload.phone = body?.phone ?? null;

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update(updatePayload)
      .eq("id", id)
      .select("id, company_name, rfc, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ client: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}