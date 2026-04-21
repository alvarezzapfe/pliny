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
    .from("cliente_notas")
    .select("*")
    .eq("client_id", id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notas: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const body = await req.json();
  if (!body.contenido?.trim()) {
    return NextResponse.json({ error: "contenido es requerido" }, { status: 422 });
  }

  const { data, error } = await sb
    .from("cliente_notas")
    .insert({
      client_id: id,
      author_id: u.user.id,
      author_name: body.author_name || u.user.email?.split("@")[0] || "Usuario",
      contenido: body.contenido.trim(),
      pinned: false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ nota: data }, { status: 201 });
}
