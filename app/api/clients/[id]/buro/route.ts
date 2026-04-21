import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function authed(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return createClient(url, anon, { global: { headers: { Authorization: h } } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const { data, error } = await sb
    .from("buro_scores_historial")
    .select("*")
    .eq("client_id", id)
    .order("fecha_consulta", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scores: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const body = await req.json();
  if (!body.score || typeof body.score !== "number") {
    return NextResponse.json({ error: "score (number) es requerido" }, { status: 422 });
  }

  const { data, error } = await sb
    .from("buro_scores_historial")
    .insert({
      client_id: id,
      score: body.score,
      fecha_consulta: body.fecha_consulta || new Date().toISOString(),
      fuente: body.fuente || "manual",
      notas: body.notas || null,
      created_by: u.user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ score: data }, { status: 201 });
}
