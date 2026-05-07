// POST /api/calculadora/cartera/[id]/calcular — Run financial calculations on uploaded cartera
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-server";
import { calculateCredit, aggregatePortfolio, calcStressGrid, calcConcentration } from "@/lib/cartera/valuation";
import type { CreditInput } from "@/lib/cartera/valuation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const sbUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await sbUser.auth.getUser(token);
    if (!userData?.user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }
    const userId = userData.user.id;
    const { id: valuacionId } = await params;

    // 2. Verify ownership and status
    const sb = createServiceClient();
    const { data: valuacion } = await sb
      .from("cartera_valuaciones")
      .select("id, user_id, status, discount_rate")
      .eq("id", valuacionId)
      .single();

    if (!valuacion) {
      return NextResponse.json({ error: "Valuación no encontrada" }, { status: 404 });
    }
    if (valuacion.user_id !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (valuacion.status === "completed" || valuacion.status === "completed_with_errors") {
      return NextResponse.json({ error: "Valuación ya calculada", status: valuacion.status }, { status: 409 });
    }

    const discountRate = Number(valuacion.discount_rate);

    // 3. Load all creditos
    const { data: creditos, error: loadErr } = await sb
      .from("cartera_valuaciones_creditos")
      .select("*")
      .eq("valuacion_id", valuacionId);

    if (loadErr || !creditos || creditos.length === 0) {
      await sb.from("cartera_valuaciones").update({ status: "error" }).eq("id", valuacionId);
      return NextResponse.json({ error: "No hay créditos para calcular" }, { status: 400 });
    }

    // 4. Calculate each credit
    let nCalculados = 0;
    let nErrores = 0;
    const results: (CreditInput & { id: string; npv: number; ytm: number | null; duration_macaulay: number; duration_modified: number; wal: number; expected_loss: number; risk_adjusted_npv: number; schedule: unknown[]; calc_error: string | null; saldo_insoluto_mxn: number; tasa_nominal_anual: number; deudor: string; sector: string; dpd: number })[] = [];

    for (const c of creditos) {
      const input: CreditInput = {
        saldo_insoluto_mxn: Number(c.saldo_insoluto_mxn) || 0,
        tasa_nominal_anual: Number(c.tasa_nominal_anual) || 0,
        fecha_vencimiento: c.fecha_vencimiento,
        fecha_originacion: c.fecha_originacion,
        periodicidad_pago: c.periodicidad_pago ?? "Mensual",
        tipo_credito: c.tipo_credito,
        plazo_meses_original: c.plazo_meses_original,
        pd: Number(c.pd) || 0,
        lgd: Number(c.lgd) || 0,
        garantia_valor_mxn: c.garantia_valor_mxn ? Number(c.garantia_valor_mxn) : 0,
        dpd: c.dpd ?? 0,
      };

      const result = calculateCredit(input, discountRate);

      // Update the credit row
      await sb.from("cartera_valuaciones_creditos").update({
        npv: result.npv,
        ytm: result.ytm,
        duration_macaulay: result.duration_macaulay,
        duration_modified: result.duration_modified,
        wal: result.wal,
        expected_loss: result.expected_loss,
        risk_adjusted_npv: result.risk_adjusted_npv,
        schedule: result.schedule,
        calc_error: result.calc_error,
      }).eq("id", c.id);

      if (result.calc_error) {
        nErrores++;
      } else {
        nCalculados++;
        results.push({ ...input, ...result, id: c.id, deudor: c.deudor, sector: c.sector, dpd: c.dpd ?? 0 });
      }
    }

    // 5. Aggregate portfolio (only successfully calculated credits)
    const aggregated = aggregatePortfolio(results as any);

    // 6. Stress grid
    const stressInputs = results.map(r => ({
      saldo_insoluto_mxn: r.saldo_insoluto_mxn,
      tasa_nominal_anual: r.tasa_nominal_anual,
      fecha_vencimiento: r.fecha_vencimiento,
      fecha_originacion: r.fecha_originacion,
      periodicidad_pago: r.periodicidad_pago,
      tipo_credito: r.tipo_credito,
      plazo_meses_original: r.plazo_meses_original,
      pd: r.pd,
      lgd: r.lgd,
      garantia_valor_mxn: r.garantia_valor_mxn,
      dpd: r.dpd,
    }));
    const stressGrid = calcStressGrid(stressInputs, discountRate);

    // 7. Concentration
    const concentration = calcConcentration(results.map(r => ({
      deudor: r.deudor,
      saldo_insoluto_mxn: r.saldo_insoluto_mxn,
      sector: r.sector,
      dpd: r.dpd,
    })));

    // 8. Determine final status
    const totalCreditos = creditos.length;
    const errorRate = nErrores / totalCreditos;
    let finalStatus: string;
    if (errorRate > 0.5) finalStatus = "error";
    else if (errorRate > 0.1) finalStatus = "completed_with_errors";
    else finalStatus = "completed";

    // 9. Update parent valuación
    await sb.from("cartera_valuaciones").update({
      status: finalStatus,
      n_creditos_calculados: nCalculados,
      npv_total_mxn: aggregated.npv_total,
      el_total_mxn: aggregated.el_total,
      saldo_total_mxn: aggregated.saldo_total,
      yield_ponderado: aggregated.yield_ponderado,
      duration_ponderada: aggregated.duration_ponderada,
      wal_ponderado: aggregated.wal_ponderado,
      stress_grid: stressGrid,
      concentracion: concentration,
    }).eq("id", valuacionId);

    return NextResponse.json({
      ok: true,
      valuacion_id: valuacionId,
      status: finalStatus,
      n_creditos: totalCreditos,
      n_creditos_calculados: nCalculados,
      n_errores: nErrores,
      aggregated: {
        npv_total: aggregated.npv_total,
        el_total: aggregated.el_total,
        yield_ponderado: aggregated.yield_ponderado,
        duration_ponderada: aggregated.duration_ponderada,
        wal_ponderado: aggregated.wal_ponderado,
      },
    });

  } catch (err) {
    console.error("[calcular] Unhandled error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
