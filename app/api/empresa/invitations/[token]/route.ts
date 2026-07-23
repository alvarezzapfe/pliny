import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/empresa/invitations/[token] — lookup invitation info (public, no auth)
// Only returns safe fields: empresa name, role, status, expiry. Never the token itself.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: inv } = await supabaseAdmin
    .from("empresa_invitations")
    .select("id, empresa_id, email, role, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!inv) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  // Check expiry
  const expired = new Date(inv.expires_at) < new Date();
  if (expired && inv.status === "pending") {
    await supabaseAdmin
      .from("empresa_invitations")
      .update({ status: "expired" })
      .eq("id", inv.id);
    inv.status = "expired";
  }

  // Get empresa name
  const { data: empresa } = await supabaseAdmin
    .from("empresas")
    .select("name")
    .eq("id", inv.empresa_id)
    .single();

  return NextResponse.json({
    status: inv.status,
    email: inv.email,
    role: inv.role,
    empresa_name: empresa?.name ?? "Empresa",
    expires_at: inv.expires_at,
  });
}
