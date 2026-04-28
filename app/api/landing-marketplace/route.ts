import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

const GARANTIA_LABELS: Record<string, string> = {
  hipotecaria: "Hipotecaria",
  prendaria: "Prendaria",
  aval: "Aval",
  sin_garantia: "Sin garantía",
};

const FACT_LABELS: Record<string, string> = {
  menos_1m: "< $1M",
  "1m_5m": "$1M–$5M",
  "5m_20m": "$5M–$20M",
  "20m_50m": "$20M–$50M",
  "50m_100m": "$50M–$100M",
  mas_100m: "> $100M",
};

function fmtMonto(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

export async function GET() {
  try {
    const sb = createServiceClient();

    const { data } = await sb
      .from("solicitudes")
      .select("id, monto, plazo_meses, tasa_solicitada, fin_facturacion_anual, fin_sector, garantia_tipo, destino")
      .eq("tipo", "subasta")
      .in("status", ["enviada", "en_revision"])
      .order("created_at", { ascending: false })
      .limit(6);

    const ops = (data ?? []).map(r => ({
      sector: r.fin_sector ?? "—",
      monto: r.monto ? fmtMonto(r.monto) : "—",
      plazo: r.plazo_meses ? `${r.plazo_meses}m` : "—",
      garantia: GARANTIA_LABELS[r.garantia_tipo] ?? r.garantia_tipo ?? "—",
      fact: FACT_LABELS[r.fin_facturacion_anual] ?? r.fin_facturacion_anual ?? "—",
      tag: r.destino ?? "—",
    }));

    return NextResponse.json({ ops }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Error", ops: [] }, { status: 500 });
  }
}
