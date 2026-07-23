import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSuperAdmin, authError } from "@/lib/auth/requireSuperAdmin";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if ("status" in auth) return authError(auth);

  const { data, error } = await admin.from("plans_config").select("*").order("price_usd", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if ("status" in auth) return authError(auth);

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const { error } = await admin.from("plans_config").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
