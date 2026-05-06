// GET /api/onb-applicants/admin/list — Lista applicants del lender del user (PRO only)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const sb = createClient(url, anon, { global: { headers: { Authorization: h } } });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  // Get lender
  const { data: lender } = await sb.from("onb_lenders").select("id, name, slug, user_id").eq("user_id", u.user.id).eq("active", true).maybeSingle();
  if (!lender) return NextResponse.json({ error: "no_lender" }, { status: 404 });

  // Verify PRO
  const { data: profile } = await sb.from("plinius_profiles").select("plan").eq("user_id", u.user.id).maybeSingle();
  const plan = (profile as { plan: string } | null)?.plan;
  if (plan !== "pro" && plan !== "enterprise") return NextResponse.json({ error: "requires_pro" }, { status: 402 });

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const search = sp.get("search");
  const from = sp.get("from");
  const limit = Math.min(parseInt(sp.get("limit") ?? "50"), 100);
  const offset = parseInt(sp.get("offset") ?? "0");

  let query = sb
    .from("onb_applicants")
    .select("id, status, email, full_name, data, failed_rules, created_at, updated_at", { count: "exact" })
    .eq("lender_id", lender.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data: applicants, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ applicants: applicants ?? [], total: count ?? 0 });
}
