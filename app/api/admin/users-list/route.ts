import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: profiles } = await admin.from("plinius_profiles").select("user_id, plan");
  const planMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.plan]));
  const users = data.users.map(u => ({
    id: u.id,
    email: u.email ?? "",
    plan: planMap[u.id] ?? "free",
  }));
  return NextResponse.json({ users });
}
