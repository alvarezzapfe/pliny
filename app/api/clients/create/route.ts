import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeRFC(rfc: string) {
  return rfc.trim().toUpperCase().replace(/\s+/g, "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const company_name = String(body?.company_name ?? "").trim();
  const rfc = normalizeRFC(String(body?.rfc ?? ""));
  const status = String(body?.status ?? "Onboarding").trim();

  if (!company_name || !rfc) {
    return NextResponse.json(
      { ok: false, error: "company_name and rfc are required" },
      { status: 400 }
    );
  }

  // Validación simple RFC (12 o 13 chars). No es perfecta, pero evita basura.
  if (!(rfc.length === 12 || rfc.length === 13)) {
    return NextResponse.json({ ok: false, error: "RFC inválido (12 o 13 caracteres)" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert([{ company_name, rfc, status }])
    .select("id, company_name, rfc, status, created_at")
    .single();

  if (error) {
    const msg =
      error.code === "23505" ? "RFC ya existe" : (error.message ?? "Error inserting client");
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, client: data });
}