import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    // Get all auth users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get roles, profiles, counts in parallel
    const [{ data: roles }, { data: profiles }, { data: sols }, { data: ofertas }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("plinius_profiles").select("user_id,plan,onboarding_completed"),
      supabaseAdmin.from("solicitudes").select("owner_id"),
      supabaseAdmin.from("ofertas").select("otorgante_id"),
    ]);

    const roleMap: Record<string, string> = {};
    (roles ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    const planMap: Record<string, { plan: string; onboarding_completed: boolean }> = {};
    (profiles ?? []).forEach((p: any) => { planMap[p.user_id] = { plan: p.plan ?? "free", onboarding_completed: p.onboarding_completed }; });

    const solMap: Record<string, number> = {};
    (sols ?? []).forEach((s: any) => { solMap[s.owner_id] = (solMap[s.owner_id] || 0) + 1; });

    const ofertaMap: Record<string, number> = {};
    (ofertas ?? []).forEach((o: any) => { ofertaMap[o.otorgante_id] = (ofertaMap[o.otorgante_id] || 0) + 1; });

    const result = users.map(u => ({
      id: u.id,
      email: u.email ?? "—",
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      provider: u.app_metadata?.provider ?? "email",
      role: roleMap[u.id] ?? null,
      plan: planMap[u.id]?.plan ?? "free",
      onboarding_completed: planMap[u.id]?.onboarding_completed ?? false,
      solicitudes_count: solMap[u.id] ?? 0,
      ofertas_count: ofertaMap[u.id] ?? 0,
    }));

    return NextResponse.json({ users: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
