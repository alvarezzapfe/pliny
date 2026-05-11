// GET /api/calculadora/cartera/[id]/creditos — List credits for a valuation
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const { id } = await params;

    // Verify ownership
    const { data: val } = await sb
      .from("cartera_valuaciones")
      .select("id")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .single();

    if (!val) {
      return NextResponse.json({ error: "Valuación no encontrada" }, { status: 404 });
    }

    const { data: creditos, error } = await sb
      .from("cartera_valuaciones_creditos")
      .select("id, folio_credito, deudor, sector, tipo_credito, saldo_insoluto_mxn, tasa_nominal_anual, fecha_vencimiento, dpd, npv, expected_loss, ytm, duration_modified, wal, risk_adjusted_npv, calc_error")
      .eq("valuacion_id", id)
      .order("saldo_insoluto_mxn", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("[creditos]", error.message);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }

    return NextResponse.json({ creditos: creditos ?? [] }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[creditos] Unhandled:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
