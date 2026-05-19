// GET    /api/workspaces/[id]  — workspace detail
// PATCH  /api/workspaces/[id]  — update (owner only)
// DELETE /api/workspaces/[id]  — delete (owner only)
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";
import { z } from "zod";

const WorkspacePatchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    // Verify membership
    const { data: mem } = await admin.from("workspace_members")
      .select("role").eq("workspace_id", id).eq("user_id", user.id).maybeSingle();
    if (!mem) return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });

    const { data: ws, error: errWs } = await admin
      .from("workspaces").select("*").eq("id", id).single();

    if (errWs) return NextResponse.json({ error: errWs.message }, { status: 500 });

    return NextResponse.json({ workspace: ws });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    // Only owner can update
    const { data: ws } = await admin.from("workspaces").select("owner_user_id").eq("id", id).maybeSingle();
    if (!ws) return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    if (ws.owner_user_id !== user.id) return NextResponse.json({ error: "Solo el owner puede editar" }, { status: 403 });

    const body = await req.json();
    const parsed = WorkspacePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error: errUpd } = await admin
      .from("workspaces").update(parsed.data).eq("id", id).select().single();

    if (errUpd) return NextResponse.json({ error: errUpd.message }, { status: 500 });

    return NextResponse.json({ workspace: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    // Only owner can delete
    const { data: ws } = await admin.from("workspaces").select("owner_user_id").eq("id", id).maybeSingle();
    if (!ws) return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    if (ws.owner_user_id !== user.id) return NextResponse.json({ error: "Solo el owner puede eliminar" }, { status: 403 });

    const { error: errDel } = await admin.from("workspaces").delete().eq("id", id);

    if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 });

    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
