// PATCH/DELETE individual rule
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function authed(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return createClient(url, anon, { global: { headers: { Authorization: h } } });
}

// PATCH — Update rule
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  const { id } = await params;

  // Verify ownership
  const { data: rule } = await sb.from("onb_approval_rules").select("id, lender_id").eq("id", id).single();
  if (!rule) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });

  const { data: lender } = await sb.from("onb_lenders").select("user_id").eq("id", rule.lender_id).single();
  if (lender?.user_id !== u.user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.field !== undefined) updates.field = body.field;
  if (body.operator !== undefined) updates.operator = body.operator;
  if (body.value !== undefined) updates.value = body.value;
  if (body.message_if_fail !== undefined) updates.message_if_fail = body.message_if_fail;

  const { data: updated, error } = await sb
    .from("onb_approval_rules")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: updated });
}

// DELETE — Soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  const { id } = await params;

  // Verify ownership
  const { data: rule } = await sb.from("onb_approval_rules").select("id, lender_id").eq("id", id).single();
  if (!rule) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });

  const { data: lender } = await sb.from("onb_lenders").select("user_id").eq("id", rule.lender_id).single();
  if (lender?.user_id !== u.user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { error } = await sb.from("onb_approval_rules").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
