// DELETE /api/workspaces/[id]/members/[uid] — remove member (owner/admin only via RLS)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  try {
    const { id: workspaceId, uid: userId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });

    const { error: errDel, count } = await client
      .from("workspace_members")
      .delete({ count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (errDel) {
      console.error("[DELETE workspace_member]", errDel);
      return NextResponse.json({ error: errDel.message }, { status: 500 });
    }
    if (count === 0) {
      return NextResponse.json({ error: "Member no encontrado o sin permiso" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
