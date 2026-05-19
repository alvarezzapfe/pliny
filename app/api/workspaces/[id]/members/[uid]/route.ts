// DELETE /api/workspaces/[id]/members/[uid] — remove member (owner/admin only via RLS)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getAuthedClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { client: null, user: null, error: "Sin autorización" as const };
  }
  const token = authHeader.slice(7);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    },
  );
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return { client: null, user: null, error: "Usuario no autenticado" as const };
  await client.auth.setSession({ access_token: token, refresh_token: "" });
  return { client, user, error: null };
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  try {
    const { id: workspaceId, uid: userId } = await params;
    const { client, user, error } = await getAuthedClient(req);
    if (error || !client || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

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
