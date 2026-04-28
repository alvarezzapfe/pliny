import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const sb = createServiceClient();

    const [
      { count: solicitudes },
      { data: montos },
      { count: lenders },
    ] = await Promise.all([
      sb.from("solicitudes").select("*", { count: "exact", head: true }).in("status", ["enviada", "en_revision"]),
      sb.from("solicitudes").select("monto, tasa_solicitada").in("status", ["enviada", "en_revision"]),
      sb.from("onb_lenders").select("*", { count: "exact", head: true }).eq("active", true),
    ]);

    const rows = montos ?? [];
    const monto_subasta = rows.reduce((s, r) => s + (r.monto ?? 0), 0);
    const tasas = rows.map(r => r.tasa_solicitada).filter((t): t is number => t != null);
    const tasa_promedio = tasas.length > 0 ? tasas.reduce((s, t) => s + t, 0) / tasas.length : 0;

    return NextResponse.json({
      solicitudes_activas: solicitudes ?? 0,
      monto_subasta,
      tasa_promedio: Number(tasa_promedio.toFixed(1)),
      lenders_activos: lenders ?? 0,
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Error" }, { status: 500 });
  }
}
