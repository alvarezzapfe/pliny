import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET — Detalle de reporte con URL firmada del PDF
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sb = createClient(url, anon, { global: { headers: { Authorization: h } } });
  const { id } = await params;

  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const { data, error } = await sb
    .from("reportes_crediticios")
    .select("*")
    .eq("id", id)
    .eq("lender_user_id", u.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }

  let signed_url: string | null = null;
  if (data.reporte_pdf_url) {
    const { data: signed } = await sb.storage
      .from("reportes-crediticios")
      .createSignedUrl(data.reporte_pdf_url, 3600);
    signed_url = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ reporte: { ...data, signed_url } });
}
