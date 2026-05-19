// GET    /api/deals/[id]  — deal detail
// PATCH  /api/deals/[id]  — update deal (workspace member or deal lead/contributor via RLS)
// DELETE /api/deals/[id]  — delete deal (creator or workspace owner/admin via RLS)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DealUpdateSchema } from "@/lib/deals/zod-schema";

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

    const { data: deal, error: errDeal } = await client
      .from("deals").select("*").eq("id", id).single();

    if (errDeal) {
      if (errDeal.code === "PGRST116") return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
      return NextResponse.json({ error: errDeal.message }, { status: 500 });
    }

    return NextResponse.json({ deal });
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
    const parsed = DealUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    const { data: deal, error: errUpd } = await client
      .from("deals").update(parsed.data).eq("id", id).select().single();

    if (errUpd) {
      if (errUpd.code === "PGRST116") return NextResponse.json({ error: "Deal no encontrado o sin permiso" }, { status: 404 });
      console.error("[PATCH deal]", errUpd);
      return NextResponse.json({ error: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ deal });
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
      .from("deals").delete({ count: "exact" }).eq("id", id);

    if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 });
    if (count === 0) return NextResponse.json({ error: "Deal no encontrado o sin permiso" }, { status: 404 });

    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
