import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Lista todos los reportes (admin only)
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.PLINIUS_ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const estado = new URL(req.url).searchParams.get("estado");

  let query = admin
    .from("reportes_crediticios")
    .select("*, clients!inner(company_name, rfc, sector, rep_legal_nombre)")
    .order("solicitado_at", { ascending: false })
    .limit(100);

  if (estado && estado !== "todos") {
    query = query.eq("estado", estado);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with lender email
  const lenderIds = [...new Set((data ?? []).map(r => r.lender_user_id))];
  const emailMap: Record<string, string> = {};

  if (lenderIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users?.users ?? []) {
      if (lenderIds.includes(u.id)) {
        emailMap[u.id] = u.email ?? "";
      }
    }
  }

  const enriched = (data ?? []).map(r => ({
    ...r,
    lender_email: emailMap[r.lender_user_id] ?? "desconocido",
  }));

  return NextResponse.json({ reportes: enriched });
}
