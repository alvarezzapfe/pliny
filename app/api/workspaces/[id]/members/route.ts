// @deprecated — Reemplazado por /api/empresa/members y /api/empresa/invitations.
// Este endpoint opera sobre workspace_members (tabla que no existe en prod).
// Se mantiene temporalmente como referencia; eliminar tras migrar a empresa_members.
//
// GET  /api/workspaces/[id]/members  — list members
// POST /api/workspaces/[id]/members  — add member by email (owner/admin only)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedClient, getAdminClient } from "@/lib/deals/api-helpers";
import { z } from "zod";

const MemberInputSchema = z.object({
  user_email: z.string().email("Email inválido").toLowerCase(),
  role: z.enum(["owner", "admin", "member"]),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthedClient(req);
    if (error || !user) return NextResponse.json({ error: error || "Auth error" }, { status: 401 });

    const admin = getAdminClient();

    // Verify caller is member
    const { data: mem } = await admin.from("workspace_members")
      .select("role").eq("workspace_id", id).eq("user_id", user.id).maybeSingle();
    if (!mem) return NextResponse.json({ error: "Sin acceso a este workspace" }, { status: 403 });

    const { data: members, error: errMem } = await admin
      .from("workspace_members")
      .select("workspace_id, user_id, role, added_by, joined_at")
      .eq("workspace_id", id)
      .order("joined_at", { ascending: true });

    if (errMem) return NextResponse.json({ error: errMem.message }, { status: 500 });

    return NextResponse.json({ members: members ?? [] });
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

    // Verify caller is owner/admin
    const { data: callerMem } = await admin.from("workspace_members")
      .select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
    if (!callerMem || !["owner", "admin"].includes(callerMem.role)) {
      return NextResponse.json({ error: "Solo owner/admin pueden agregar members" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = MemberInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Lookup user by email via admin auth
    const { data: { users }, error: errLookup } = await admin.auth.admin.listUsers();
    if (errLookup) {
      console.error("[POST members] lookup", errLookup);
      return NextResponse.json({ error: "Error buscando usuario" }, { status: 500 });
    }

    const target = users.find(u => u.email?.toLowerCase() === parsed.data.user_email);
    if (!target) {
      return NextResponse.json({
        error: `Usuario con email ${parsed.data.user_email} no encontrado. Debe registrarse primero.`,
      }, { status: 404 });
    }

    const { data: member, error: errIns } = await admin
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: target.id, role: parsed.data.role, added_by: user.id })
      .select().single();

    if (errIns) {
      if (errIns.code === "23505") return NextResponse.json({ error: "Este usuario ya es member" }, { status: 409 });
      console.error("[POST members]", errIns);
      return NextResponse.json({ error: errIns.message }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
