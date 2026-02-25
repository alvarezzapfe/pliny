import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function monthKey(isoDate: string) {
  const s = String(isoDate || "");
  return s.slice(0, 7); // YYYY-MM
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await ctx.params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("client_sat_cfdi")
    .select("fecha,total,rfc_emisor,rfc_receptor")
    .eq("client_id", clientId)
    .limit(200000);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as Array<{ fecha: string; total: number }>;

  const byMonth: Record<string, number> = {};
  for (const r of rows) {
    const k = monthKey(r.fecha);
    byMonth[k] = (byMonth[k] ?? 0) + (Number(r.total) || 0);
  }

  const series = Object.entries(byMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));

  // nivel simple usando últimos 3 meses
  const last3 = series.slice(-3);
  const avg3 = last3.length ? last3.reduce((s, x) => s + x.amount, 0) / last3.length : 0;

  let tier: "Bajo" | "Medio" | "Alto" | "Enterprise" = "Bajo";
  if (avg3 >= 2_000_000) tier = "Enterprise";
  else if (avg3 >= 500_000) tier = "Alto";
  else if (avg3 >= 100_000) tier = "Medio";

  return NextResponse.json(
    { ok: true, count: rows.length, series, avg3, tier },
    { status: 200 }
  );
}