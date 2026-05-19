// GET    /api/workspaces/[id]  — workspace detail
// PATCH  /api/workspaces/[id]  — update (owner only via RLS)
// DELETE /api/workspaces/[id]  — delete (owner only via RLS)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const WorkspacePatchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

function getAuthedClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = getAuthedClient(req);
    if (!client) return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });

    const { data: ws, error: errWs } = await client
      .from("workspaces").select("*").eq("id", id).single();

    if (errWs) {
      if (errWs.code === "PGRST116") return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
      return NextResponse.json({ error: errWs.message }, { status: 500 });
    }

    return NextResponse.json({ workspace: ws });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = getAuthedClient(req);
    if (!client) return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = WorkspacePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error: errUpd } = await client
      .from("workspaces").update(parsed.data).eq("id", id).select().single();

    if (errUpd) {
      if (errUpd.code === "PGRST116") return NextResponse.json({ error: "Workspace no encontrado o sin permiso" }, { status: 404 });
      console.error("[PATCH workspace]", errUpd);
      return NextResponse.json({ error: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ workspace: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = getAuthedClient(req);
    if (!client) return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });

    const { error: errDel, count } = await client
      .from("workspaces").delete({ count: "exact" }).eq("id", id);

    if (errDel) {
      console.error("[DELETE workspace]", errDel);
      return NextResponse.json({ error: errDel.message }, { status: 500 });
    }
    if (count === 0) return NextResponse.json({ error: "Workspace no encontrado o sin permiso" }, { status: 404 });

    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
