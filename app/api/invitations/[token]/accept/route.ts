// POST /api/invitations/[token]/accept — accept invitation (requires auth)
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    const { data: inv, error: errInv } = await admin
      .from("deal_invitations").select("*").eq("token", token).maybeSingle();

    if (errInv || !inv) return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    if (inv.accepted_at) return NextResponse.json({ error: "Invitación ya aceptada" }, { status: 410 });
    if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: "Invitación expirada" }, { status: 410 });

    // Verify email match
    const { data: { user: authUser } } = await admin.auth.admin.getUserById(user.id);
    const userEmail = authUser?.email?.toLowerCase();

    if (!userEmail || userEmail !== inv.email.toLowerCase()) {
      return NextResponse.json({
        error: `Esta invitación es para ${inv.email}, pero estás logueado como ${userEmail}`,
      }, { status: 403 });
    }

    // Add as deal_member
    const { error: errMem } = await admin
      .from("deal_members")
      .insert({
        deal_id: inv.deal_id,
        user_id: user.id,
        role: inv.role,
        is_external: true,
        invited_by: inv.invited_by,
      });

    if (errMem) {
      if (errMem.code === "23505") return NextResponse.json({ error: "Ya eres miembro de este deal" }, { status: 409 });
      console.error("[POST accept]", errMem);
      return NextResponse.json({ error: errMem.message }, { status: 500 });
    }

    // Mark invitation as accepted
    await admin.from("deal_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("token", token);

    // Get workspace slug for redirect
    const { data: deal } = await admin.from("deals")
      .select("id, workspace_id").eq("id", inv.deal_id).maybeSingle();
    const { data: workspace } = deal
      ? await admin.from("workspaces").select("slug").eq("id", deal.workspace_id).maybeSingle()
      : { data: null };

    return NextResponse.json({
      success: true,
      dealId: inv.deal_id,
      workspaceSlug: workspace?.slug,
    });
  } catch (e: any) {
    console.error("[POST accept] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
