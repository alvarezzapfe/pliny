// POST /api/deals/[id]/invite — create invitation + send email via Resend
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";
import { InvitationInputSchema, generateInvitationToken } from "@/lib/deals/zod-schema";

const DEAL_TYPE_LABELS: Record<string, string> = {
  debt: "Deuda", equity: "Equity", ma: "M&A", advisory: "Advisory", other: "Otro",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: dealId } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const body = await req.json();
    const parsed = InvitationInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify caller is lead of this deal
    const { data: callerMem } = await admin.from("deal_members")
      .select("role").eq("deal_id", dealId).eq("user_id", user.id).maybeSingle();
    if (!callerMem || callerMem.role !== "lead") {
      return NextResponse.json({ error: "Solo el lead del deal puede invitar externos" }, { status: 403 });
    }

    // Get deal details for email
    const { data: deal } = await admin.from("deals")
      .select("id, name, client_name, type, workspace_id").eq("id", dealId).maybeSingle();
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const { data: workspace } = await admin.from("workspaces")
      .select("name, slug").eq("id", deal.workspace_id).maybeSingle();

    // Get inviter info
    const { data: { user: inviter } } = await admin.auth.admin.getUserById(user.id);
    const inviterName = inviter?.user_metadata?.name || inviter?.email || "Usuario Plinius";
    const inviterEmail = inviter?.email || "";

    // Check if email already has pending invitation
    const { data: existingInv } = await admin.from("deal_invitations")
      .select("id, accepted_at, expires_at")
      .eq("deal_id", dealId).eq("email", parsed.data.email).maybeSingle();

    if (existingInv && !existingInv.accepted_at && new Date(existingInv.expires_at) > new Date()) {
      return NextResponse.json({ error: "Ya existe una invitación activa para este email" }, { status: 409 });
    }

    // Check if user already exists + already member
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email?.toLowerCase() === parsed.data.email);
    if (existingUser) {
      const { data: existingMem } = await admin.from("deal_members")
        .select("user_id").eq("deal_id", dealId).eq("user_id", existingUser.id).maybeSingle();
      if (existingMem) {
        return NextResponse.json({ error: "Este usuario ya es miembro del deal" }, { status: 409 });
      }
    }

    // Generate token + insert invitation
    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // If there's an expired/old invitation for same email, delete it first
    if (existingInv) {
      await admin.from("deal_invitations").delete().eq("id", existingInv.id);
    }

    const { data: invitation, error: errIns } = await admin
      .from("deal_invitations")
      .insert({ deal_id: dealId, email: parsed.data.email, role: parsed.data.role, invited_by: user.id, token, expires_at: expiresAt })
      .select().single();

    if (errIns) {
      console.error("[POST invite]", errIns);
      return NextResponse.json({ error: errIns.message }, { status: 500 });
    }

    // Send email via Resend
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://plinius.mx"}/invitations/${token}`;

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E2E8F0;">
        <tr><td style="padding:32px;">
          <div style="margin-bottom:24px;">
            <span style="color:#0C1E4A;font-size:14px;font-weight:700;">Plinius</span>
            <span style="color:#94A3B8;font-size:13px;margin-left:6px;">Deal Rooms</span>
          </div>
          <h1 style="color:#0F172A;font-size:20px;font-weight:700;margin:0 0 12px 0;line-height:1.3;">
            ${inviterName} te invitó a colaborar
          </h1>
          <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
            Has sido invitado como <strong style="color:#0C1E4A;">${parsed.data.role}</strong> en un deal room.
          </p>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <div style="color:#94A3B8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Deal</div>
            <div style="color:#0F172A;font-size:16px;font-weight:600;margin-bottom:8px;">${deal.name}</div>
            ${deal.client_name ? `<div style="color:#64748B;font-size:13px;margin-bottom:4px;">Cliente: ${deal.client_name}</div>` : ""}
            <div style="color:#64748B;font-size:13px;">Tipo: ${DEAL_TYPE_LABELS[deal.type] || deal.type}</div>
            ${workspace ? `<div style="color:#64748B;font-size:13px;margin-top:4px;">Workspace: ${workspace.name}</div>` : ""}
          </div>
          <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
            Aceptar invitación
          </a>
          <p style="color:#94A3B8;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
            Esta invitación expira en 7 días. Necesitarás una cuenta en Plinius para acceder.
          </p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">
          <p style="color:#94A3B8;font-size:11px;margin:0;">
            Invitado por ${inviterName}${inviterEmail ? ` (${inviterEmail})` : ""} · Plinius Credit OS
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

    const resend = new Resend(process.env.RESEND_API_KEY!);
    let emailResult = await resend.emails.send({
      from: "Plinius Deal Rooms <noreply@plinius.mx>",
      to: parsed.data.email,
      subject: `[Plinius] ${inviterName} te invitó al deal ${deal.name}`,
      html: emailHtml,
    });

    if (emailResult.error && (
      emailResult.error.message?.includes("not verified") ||
      emailResult.error.message?.includes("domain")
    )) {
      console.warn("[POST invite] plinius.mx not verified, using fallback");
      emailResult = await resend.emails.send({
        from: "Plinius <onboarding@resend.dev>",
        to: parsed.data.email,
        subject: `[Plinius] ${inviterName} te invitó al deal ${deal.name}`,
        html: emailHtml,
      });
    }

    if (emailResult.error) {
      console.error("[POST invite] resend error:", emailResult.error);
    }

    return NextResponse.json({
      invitation,
      inviteUrl,
      emailSent: !emailResult.error,
    }, { status: 201 });
  } catch (e: any) {
    console.error("[POST invite] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
