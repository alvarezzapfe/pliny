// GET  /api/workspaces/[id]/deals  — list deals in workspace (with optional stage/type filter)
// POST /api/workspaces/[id]/deals  — create deal (creator becomes lead)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DealInputSchema } from "@/lib/deals/zod-schema";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params;
    const { client, user, error } = await getAuthedClient(req);
    if (error || !client || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const url = new URL(req.url);
    const stage = url.searchParams.get("stage");
    const type = url.searchParams.get("type");

    let query = client.from("deals").select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (stage) query = query.eq("stage", stage);
    if (type) query = query.eq("type", type);

    const { data: deals, error: errDeals } = await query;

    if (errDeals) {
      console.error("[GET workspace deals]", errDeals);
      return NextResponse.json({ error: errDeals.message }, { status: 500 });
    }

    return NextResponse.json({ deals: deals ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params;
    const { client, user, error } = await getAuthedClient(req);
    if (error || !client || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const body = await req.json();
    const payload = { ...body, workspace_id: workspaceId };

    const parsed = DealInputSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data: deal, error: errIns } = await client
      .from("deals")
      .insert({ ...parsed.data, created_by: user.id })
      .select()
      .single();

    if (errIns) {
      console.error("[POST deal]", errIns);
      return NextResponse.json({ error: errIns.message }, { status: 500 });
    }

    // Auto-assign creator as lead
    const { error: errLead } = await client
      .from("deal_members")
      .insert({
        deal_id: deal.id,
        user_id: user.id,
        role: "lead",
        is_external: false,
        invited_by: user.id,
      });

    if (errLead) {
      console.error("[POST deal] lead assignment failed", errLead);
    }

    return NextResponse.json({ deal }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
