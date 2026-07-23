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

  const { data, error } = await admin.from("discounts").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ discounts: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if ("status" in auth) return authError(auth);

  const body = await req.json();
  const { error } = await admin.from("discounts").insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if ("status" in auth) return authError(auth);

  const { id, ...updates } = await req.json();
  const { error } = await admin.from("discounts").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
