// GET /api/invitations/[token] — public endpoint to view invitation details
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/deals/api-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: inv, error } = await admin
      .from("deal_invitations")
      .select("id, deal_id, email, role, expires_at, accepted_at, invited_by, invited_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !inv) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (inv.accepted_at) {
      return NextResponse.json({ error: "Invitación ya aceptada" }, { status: 410 });
    }

    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitación expirada" }, { status: 410 });
    }

    const { data: deal } = await admin.from("deals")
      .select("id, name, client_name, type, workspace_id").eq("id", inv.deal_id).maybeSingle();

    if (!deal) return NextResponse.json({ error: "Deal no existe" }, { status: 404 });

    const { data: workspace } = await admin.from("workspaces")
      .select("name, slug").eq("id", deal.workspace_id).maybeSingle();

    const { data: { user: inviter } } = await admin.auth.admin.getUserById(inv.invited_by);
    const inviterName = inviter?.user_metadata?.name || inviter?.email?.split("@")[0] || "Usuario";

    return NextResponse.json({
      invitation: { email: inv.email, role: inv.role, expiresAt: inv.expires_at },
      deal: { name: deal.name, clientName: deal.client_name, type: deal.type },
      workspace: workspace ? { name: workspace.name } : null,
      inviter: { name: inviterName },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
