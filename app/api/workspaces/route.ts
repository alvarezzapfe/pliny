// GET  /api/workspaces     — list workspaces where I'm a member
// POST /api/workspaces     — create workspace (I become owner)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WorkspaceInputSchema } from "@/lib/deals/zod-schema";

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

export async function GET(req: NextRequest) {
  try {
    const { client, user, error } = await getAuthedClient(req);
    if (error || !client || !user) {
      return NextResponse.json({ error: error || "Auth error" }, { status: 401 });
    }

    const { data: workspaces, error: errWs } = await client
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
    const { client, user, error } = await getAuthedClient(req);
    if (error || !client || !user) {
      return NextResponse.json({ error: error || "Auth error" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = WorkspaceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, slug, description } = parsed.data;

    const { data: ws, error: errIns } = await client
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
    const { error: errMem } = await client
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id, role: "owner", added_by: user.id });

    if (errMem) {
      await client.from("workspaces").delete().eq("id", ws.id);
      console.error("[POST /api/workspaces] member insert", errMem);
      return NextResponse.json({ error: "No se pudo crear membership" }, { status: 500 });
    }

    return NextResponse.json({ workspace: ws }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/workspaces] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
