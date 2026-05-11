// GET /api/calculadora/cartera/list — Lista valuaciones del usuario autenticado
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await sb.auth.getUser(token);
    if (!userData?.user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    // Pagination — safe parsing with fallback to defaults
    const sp = new URL(req.url).searchParams;
    const limitRaw = parseInt(sp.get("limit") ?? "20", 10);
    const offsetRaw = parseInt(sp.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    // Defense-in-depth: RLS already filters by user_id, but explicit filter is belt-and-suspenders
    const { data, error, count } = await sb
      .from("cartera_valuaciones")
      .select("id, nombre, status, n_creditos, n_creditos_calculados, npv_total_mxn, saldo_total_mxn, el_total_mxn, discount_rate, created_at", { count: "exact" })
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[cartera/list]", error.message);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }

    return NextResponse.json({
      valuaciones: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    }, {
      headers: { "Cache-Control": "private, no-store, must-revalidate" },
    });
  } catch (err) {
    console.error("[cartera/list] Unhandled:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
