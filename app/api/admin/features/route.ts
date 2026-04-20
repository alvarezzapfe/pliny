import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const uid = new URL(req.url).searchParams.get("user_id");
  if (!uid) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });
  const { data, error } = await admin.from("client_features").select("*").eq("user_id", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ features: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { error } = await admin.from("client_features")
    .upsert({ user_id: body.user_id, feature: body.feature, enabled: body.enabled }, { onConflict: "user_id,feature" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
