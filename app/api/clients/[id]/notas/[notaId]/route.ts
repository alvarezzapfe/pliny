import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; notaId: string }> }) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sb = createClient(url, anon, { global: { headers: { Authorization: h } } });
  const { notaId } = await params;

  const { error } = await sb.from("cliente_notas").delete().eq("id", notaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
