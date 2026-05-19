// GET  /api/workspaces     — list workspaces where I'm a member
// POST /api/workspaces     — create workspace (I become owner)
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";
import { WorkspaceInputSchema } from "@/lib/deals/zod-schema";

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    const { data: memberships, error: errMem } = await admin
      .from("workspace_members").select("workspace_id").eq("user_id", user.id);

    if (errMem) {
      console.error("[GET workspaces] memberships", errMem);
      return NextResponse.json({ error: errMem.message }, { status: 500 });
    }

    const ids = (memberships ?? []).map(m => m.workspace_id);
    if (ids.length === 0) return NextResponse.json({ workspaces: [] });

    const { data: workspaces, error: errWs } = await admin
      .from("workspaces").select("*").in("id", ids).order("created_at", { ascending: false });

    if (errWs) {
      console.error("[GET workspaces]", errWs);
      return NextResponse.json({ error: errWs.message }, { status: 500 });
    }

    return NextResponse.json({ workspaces: workspaces ?? [] });
  } catch (e: any) {
    console.error("[GET workspaces] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const body = await req.json();
    const parsed = WorkspaceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, slug, description } = parsed.data;
    const admin = getAdminClient();

    const { data: ws, error: errIns } = await admin
      .from("workspaces")
      .insert({ name, slug, description: description ?? null, owner_user_id: user.id })
      .select().single();

    if (errIns) {
      if (errIns.code === "23505") return NextResponse.json({ error: "El slug ya existe" }, { status: 409 });
      console.error("[POST workspace]", errIns);
      return NextResponse.json({ error: errIns.message }, { status: 500 });
    }

    const { error: errMem } = await admin
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id, role: "owner", added_by: user.id });

    if (errMem) {
      await admin.from("workspaces").delete().eq("id", ws.id);
      console.error("[POST workspace] member", errMem);
      return NextResponse.json({ error: "No se pudo crear membership" }, { status: 500 });
    }

    return NextResponse.json({ workspace: ws }, { status: 201 });
  } catch (e: any) {
    console.error("[POST workspace] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
