// GET    /api/deals/[id]  — deal detail
// PATCH  /api/deals/[id]  — update deal
// DELETE /api/deals/[id]  — delete deal
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";
import { DealUpdateSchema } from "@/lib/deals/zod-schema";

/** Check if user has access to deal (workspace member or deal member) */
async function canAccessDeal(admin: ReturnType<typeof getAdminClient>, dealId: string, userId: string) {
  const { data: deal } = await admin.from("deals").select("id, workspace_id, created_by").eq("id", dealId).maybeSingle();
  if (!deal) return { access: false, deal: null, role: null };

  // Check workspace membership
  const { data: wsMem } = await admin.from("workspace_members")
    .select("role").eq("workspace_id", deal.workspace_id).eq("user_id", userId).maybeSingle();
  if (wsMem) return { access: true, deal, role: wsMem.role as string };

  // Check deal membership
  const { data: dealMem } = await admin.from("deal_members")
    .select("role").eq("deal_id", dealId).eq("user_id", userId).maybeSingle();
  if (dealMem) return { access: true, deal, role: dealMem.role as string };

  return { access: false, deal: null, role: null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();
    const { access } = await canAccessDeal(admin, id, user.id);
    if (!access) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const { data: deal, error: errDeal } = await admin
      .from("deals").select("*").eq("id", id).single();

    if (errDeal) return NextResponse.json({ error: errDeal.message }, { status: 500 });

    return NextResponse.json({ deal });
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
    const { access, role } = await canAccessDeal(admin, id, user.id);
    if (!access) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    // Viewers can't edit
    if (role === "viewer") return NextResponse.json({ error: "Sin permiso para editar" }, { status: 403 });

    const body = await req.json();
    const parsed = DealUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    const { data: deal, error: errUpd } = await admin
      .from("deals").update(parsed.data).eq("id", id).select().single();

    if (errUpd) return NextResponse.json({ error: errUpd.message }, { status: 500 });

    return NextResponse.json({ deal });
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
    const { access, deal, role } = await canAccessDeal(admin, id, user.id);
    if (!access || !deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    // Only creator, workspace owner, or workspace admin can delete
    const isCreator = deal.created_by === user.id;
    const isWsAdmin = role === "owner" || role === "admin";
    if (!isCreator && !isWsAdmin) {
      return NextResponse.json({ error: "Sin permiso para eliminar" }, { status: 403 });
    }

    const { error: errDel } = await admin.from("deals").delete().eq("id", id);

    if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 });

    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
