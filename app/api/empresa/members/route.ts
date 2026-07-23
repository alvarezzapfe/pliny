import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/empresa/members — lista miembros de mi empresa con emails
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (error || !user) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // Get caller's empresa
  const { data: membership } = await supabaseAdmin
    .from("empresa_members")
    .select("empresa_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "No perteneces a ninguna empresa" }, { status: 404 });
  }

  // Get empresa info
  const { data: empresa } = await supabaseAdmin
    .from("empresas")
    .select("id, name, max_seats, plan")
    .eq("id", membership.empresa_id)
    .single();

  // Get all active members
  const { data: members } = await supabaseAdmin
    .from("empresa_members")
    .select("id, user_id, role, status, joined_at")
    .eq("empresa_id", membership.empresa_id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  // Get pending invitations
  const { data: invitations } = await supabaseAdmin
    .from("empresa_invitations")
    .select("id, email, role, status, expires_at, created_at")
    .eq("empresa_id", membership.empresa_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Enrich members with emails from auth
  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      return { ...m, email: u?.email ?? null };
    })
  );

  return NextResponse.json({
    empresa,
    members: enriched,
    invitations: invitations ?? [],
    my_role: membership.role,
  });
}
