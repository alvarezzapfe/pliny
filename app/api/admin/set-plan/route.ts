import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSuperAdmin, authError } from "@/lib/auth/requireSuperAdmin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if ("status" in auth) return authError(auth);

  const { user_id, plan, role } = await req.json();

  if (!user_id || !plan) {
    return NextResponse.json({ error: "user_id y plan requeridos" }, { status: 400 });
  }

  const { error: planError } = await supabaseAdmin
    .from("plinius_profiles")
    .upsert({ user_id, plan, plan_updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  if (role) {
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id, role }, { onConflict: "user_id" });

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
