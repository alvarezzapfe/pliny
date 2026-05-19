// GET  /api/workspaces/[id]/deals  — list deals in workspace
// POST /api/workspaces/[id]/deals  — create deal (creator becomes lead)
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";
import { DealInputSchema } from "@/lib/deals/zod-schema";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    // Verify membership
    const { data: mem } = await admin.from("workspace_members")
      .select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
    if (!mem) return NextResponse.json({ error: "Sin acceso a este workspace" }, { status: 403 });

    const url = new URL(req.url);
    const stage = url.searchParams.get("stage");
    const type = url.searchParams.get("type");

    let query = admin.from("deals").select("*")
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
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    // Verify membership
    const { data: mem } = await admin.from("workspace_members")
      .select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
    if (!mem) return NextResponse.json({ error: "Sin acceso a este workspace" }, { status: 403 });

    const body = await req.json();
    const payload = { ...body, workspace_id: workspaceId };

    const parsed = DealInputSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data: deal, error: errIns } = await admin
      .from("deals")
      .insert({ ...parsed.data, created_by: user.id })
      .select().single();

    if (errIns) {
      console.error("[POST deal]", errIns);
      return NextResponse.json({ error: errIns.message }, { status: 500 });
    }

    // Auto-assign creator as lead
    const { error: errLead } = await admin
      .from("deal_members")
      .insert({ deal_id: deal.id, user_id: user.id, role: "lead", is_external: false, invited_by: user.id });

    if (errLead) console.error("[POST deal] lead assignment failed", errLead);

    return NextResponse.json({ deal }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
