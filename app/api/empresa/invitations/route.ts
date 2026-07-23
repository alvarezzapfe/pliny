import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMemberInviteEmail } from "@/lib/emails/member-invite";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/empresa/invitations — crear invitación (owner o admin)
export async function POST(req: NextRequest) {
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

  // Get caller's empresa and role
  const { data: membership } = await supabaseAdmin
    .from("empresa_members")
    .select("empresa_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "No perteneces a ninguna empresa" }, { status: 404 });
  }

  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Solo owner o admin pueden invitar" }, { status: 403 });
  }

  // Parse body
  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role ?? "member";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  if (!["member", "admin"].includes(role)) {
    return NextResponse.json({ error: "Rol debe ser member o admin" }, { status: 400 });
  }

  // Check seat availability
  const { data: empresa } = await supabaseAdmin
    .from("empresas")
    .select("max_seats")
    .eq("id", membership.empresa_id)
    .single();

  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  // Count active members + pending invitations
  const { count: memberCount } = await supabaseAdmin
    .from("empresa_members")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", membership.empresa_id)
    .eq("status", "active");

  const { count: invCount } = await supabaseAdmin
    .from("empresa_invitations")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", membership.empresa_id)
    .eq("status", "pending");

  const seatsTaken = (memberCount ?? 0) + (invCount ?? 0);
  if (seatsTaken >= empresa.max_seats) {
    return NextResponse.json({
      error: `Límite de asientos alcanzado (${seatsTaken}/${empresa.max_seats})`,
    }, { status: 409 });
  }

  // Check if user is already a member
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const targetUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email);

  if (targetUser) {
    const { data: existingMember } = await supabaseAdmin
      .from("empresa_members")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: "Este usuario ya es miembro de una empresa" }, { status: 409 });
    }
  }

  // Create invitation
  const { data: invitation, error: insErr } = await supabaseAdmin
    .from("empresa_invitations")
    .insert({
      empresa_id: membership.empresa_id,
      email,
      role,
      invited_by: user.id,
    })
    .select("id, email, role, status, token, expires_at, created_at")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ error: "Ya hay una invitación pendiente para este email" }, { status: 409 });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Send invite email (fire-and-forget — don't block the response)
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.plinius.mx";
  const inviteUrl = `${appUrl}/invite/${invitation.token}`;

  // Get empresa name for the email
  const { data: emp } = await supabaseAdmin
    .from("empresas")
    .select("name")
    .eq("id", membership.empresa_id)
    .single();

  const emailResult = await sendMemberInviteEmail({
    to: email,
    empresaName: emp?.name ?? "Tu empresa",
    inviterEmail: user.email ?? "un administrador",
    role,
    inviteUrl,
  });

  return NextResponse.json({
    invitation,
    email_sent: emailResult.ok,
    email_error: emailResult.ok ? undefined : emailResult.error,
  }, { status: 201 });
}
