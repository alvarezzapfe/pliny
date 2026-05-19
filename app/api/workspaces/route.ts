// GET  /api/workspaces     — list workspaces where I'm a member
// POST /api/workspaces     — create workspace (I become owner)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WorkspaceInputSchema } from "@/lib/deals/zod-schema";

function getAuthedClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return {
    token,
    client: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    ),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthedClient(req);
    if (!auth) return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    const { data: { user } } = await auth.client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });

    const { data: workspaces, error: errWs } = await auth.client
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (errWs) {
      console.error("[GET /api/workspaces]", errWs);
      return NextResponse.json({ error: errWs.message }, { status: 500 });
    }

    return NextResponse.json({ workspaces: workspaces ?? [] });
  } catch (e: any) {
    console.error("[GET /api/workspaces] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthedClient(req);
    if (!auth) return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    const { data: { user } } = await auth.client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = WorkspaceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, slug, description } = parsed.data;

    const { data: ws, error: errIns } = await auth.client
      .from("workspaces")
      .insert({ name, slug, description: description ?? null, owner_user_id: user.id })
      .select()
      .single();

    if (errIns) {
      if (errIns.code === "23505") {
        return NextResponse.json({ error: "El slug ya existe" }, { status: 409 });
      }
      console.error("[POST /api/workspaces] insert", errIns);
      return NextResponse.json({ error: errIns.message }, { status: 500 });
    }

    // Create owner membership — RLS allows via "first owner" exception
    const { error: errMem } = await auth.client
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id, role: "owner", added_by: user.id });

    if (errMem) {
      await auth.client.from("workspaces").delete().eq("id", ws.id);
      console.error("[POST /api/workspaces] member insert", errMem);
      return NextResponse.json({ error: "No se pudo crear membership" }, { status: 500 });
    }

    return NextResponse.json({ workspace: ws }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/workspaces] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
