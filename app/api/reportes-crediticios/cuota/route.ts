import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCuotaMensual } from "@/lib/reportes-crediticios";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET — Cuota de reportes del mes actual
export async function GET(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sb = createClient(url, anon, { global: { headers: { Authorization: h } } });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const cuota = await getCuotaMensual(sb, u.user.id);
  return NextResponse.json(cuota);
}
