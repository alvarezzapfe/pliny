// DELETE /api/workspaces/[id]/members/[uid] — remove member (owner/admin only)
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  try {
    const { id: workspaceId, uid: userId } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    // Verify caller is owner/admin
    const { data: callerMem } = await admin.from("workspace_members")
      .select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
    if (!callerMem || !["owner", "admin"].includes(callerMem.role)) {
      return NextResponse.json({ error: "Solo owner/admin pueden remover members" }, { status: 403 });
    }

    const { error: errDel, count } = await admin
      .from("workspace_members")
      .delete({ count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (errDel) {
      console.error("[DELETE workspace_member]", errDel);
      return NextResponse.json({ error: errDel.message }, { status: 500 });
    }
    if (count === 0) return NextResponse.json({ error: "Member no encontrado" }, { status: 404 });

    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
