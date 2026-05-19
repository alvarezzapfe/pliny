// GET  /api/workspaces/[id]/members  — list members
// POST /api/workspaces/[id]/members  — add member by email (owner/admin only)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const MemberInputSchema = z.object({
  user_email: z.string().email("Email inválido").toLowerCase(),
  role: z.enum(["owner", "admin", "member"]),
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

    const { data: members, error: errMem } = await client
      .from("workspace_members")
      .select("workspace_id, user_id, role, added_by, joined_at")
      .eq("workspace_id", id)
      .order("joined_at", { ascending: true });

    if (errMem) return NextResponse.json({ error: errMem.message }, { status: 500 });

    return NextResponse.json({ members: members ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params;
    const client = getAuthedClient(req);
    if (!client) return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = MemberInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Service role client for user lookup by email
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: { users }, error: errLookup } = await adminClient.auth.admin.listUsers();
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

    // Insert membership using authed client (RLS validates owner/admin)
    const { data: member, error: errIns } = await client
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: target.id,
        role: parsed.data.role,
        added_by: user.id,
      })
      .select()
      .single();

    if (errIns) {
      if (errIns.code === "23505") {
        return NextResponse.json({ error: "Este usuario ya es member del workspace" }, { status: 409 });
      }
      console.error("[POST members]", errIns);
      return NextResponse.json({ error: errIns.message }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
