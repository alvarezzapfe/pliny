import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/empresa/invitations/accept — aceptar una invitación por token
export async function POST(req: NextRequest) {
  // Authenticate caller
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr || !user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  // Find invitation
  const { data: inv, error: invErr } = await supabaseAdmin
    .from("empresa_invitations")
    .select("id, empresa_id, email, role, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (invErr || !inv) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  if (inv.status === "accepted") {
    return NextResponse.json({ error: "Esta invitación ya fue aceptada" }, { status: 409 });
  }

  if (inv.status === "revoked") {
    return NextResponse.json({ error: "Esta invitación fue revocada" }, { status: 410 });
  }

  if (new Date(inv.expires_at) < new Date()) {
    await supabaseAdmin
      .from("empresa_invitations")
      .update({ status: "expired" })
      .eq("id", inv.id);
    return NextResponse.json({ error: "Esta invitación expiró" }, { status: 410 });
  }

  // Verify email matches
  if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return NextResponse.json({
      error: `Esta invitación es para ${inv.email}, pero estás logueado como ${user.email}`,
    }, { status: 403 });
  }

  // Check user isn't already in an empresa
  const { data: existing } = await supabaseAdmin
    .from("empresa_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      error: "Ya perteneces a una empresa. Un usuario solo puede estar en una empresa.",
    }, { status: 409 });
  }

  // Create membership
  const { error: memErr } = await supabaseAdmin
    .from("empresa_members")
    .insert({
      empresa_id: inv.empresa_id,
      user_id: user.id,
      role: inv.role,
      status: "active",
      invited_by: null, // could look up from invitation but not critical
      joined_at: new Date().toISOString(),
    });

  if (memErr) {
    if (memErr.code === "23505") {
      return NextResponse.json({ error: "Ya eres miembro de esta empresa" }, { status: 409 });
    }
    if (memErr.message?.includes("asientos")) {
      return NextResponse.json({ error: "La empresa ya no tiene asientos disponibles" }, { status: 409 });
    }
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from("empresa_invitations")
    .update({ status: "accepted" })
    .eq("id", inv.id);

  return NextResponse.json({ ok: true, empresa_id: inv.empresa_id, role: inv.role });
}
