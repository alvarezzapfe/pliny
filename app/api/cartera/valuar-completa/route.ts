// POST /api/cartera/valuar-completa — Valúa todos los créditos vigentes/mora del usuario
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateCredit, aggregatePortfolio } from "@/lib/cartera/valuation";
import type { CreditInput, CreditResult } from "@/lib/cartera/valuation";
import { PD_LGD_DEFAULTS } from "@/lib/cartera/zod-schema";

const DEFAULT_DISCOUNT_RATE = 0.12; // 12% annual discount rate

function getPdLgd(sector: string | null): { pd: number; lgd: number } {
  if (!sector) return { pd: 0.05, lgd: 0.45 };
  const defaults = PD_LGD_DEFAULTS[sector];
  if (defaults) return defaults;
  return { pd: 0.05, lgd: 0.45 };
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });
    }

    // ── Fetch credits ────────────────────────────────
    const { data: creditos, error: errCreds } = await supabase
      .from("credits")
      .select("*")
      .eq("created_by", user.id)
      .in("estatus", ["vigente", "mora_30", "mora_60", "mora_90"]);

    if (errCreds) {
      console.error("[valuar-completa] fetch credits error", errCreds);
      return NextResponse.json({ error: "Error al cargar créditos" }, { status: 500 });
    }

    if (!creditos || creditos.length === 0) {
      return NextResponse.json({ error: "No hay créditos vigentes para valuar" }, { status: 400 });
    }

    // ── Map credits to CreditInput + calculate ───────
    const results: { creditId: string; folio: string; input: CreditInput; result: CreditResult }[] = [];

    for (const c of creditos) {
      const tasaDecimal = (Number(c.tasa_anual) || 0) / 100;
      const { pd, lgd } = getPdLgd(c.sector);

      // Build fecha_vencimiento: use stored value, or infer from fecha_inicio + plazo_meses
      let fechaVenc = c.fecha_vencimiento;
      if (!fechaVenc && c.fecha_inicio && c.plazo_meses) {
        const d = new Date(c.fecha_inicio);
        d.setMonth(d.getMonth() + Number(c.plazo_meses));
        fechaVenc = d.toISOString().split("T")[0];
      }
      if (!fechaVenc) {
        // Fallback: 12 months from now
        const d = new Date();
        d.setMonth(d.getMonth() + 12);
        fechaVenc = d.toISOString().split("T")[0];
      }

      const input: CreditInput = {
        saldo_insoluto_mxn: Number(c.saldo_actual) || 0,
        tasa_nominal_anual: tasaDecimal,
        fecha_vencimiento: fechaVenc,
        fecha_originacion: c.fecha_inicio || null,
        periodicidad_pago: "mensual",
        tipo_credito: c.tipo_credito || "Crédito simple",
        plazo_meses_original: c.plazo_meses ? Number(c.plazo_meses) : null,
        pd,
        lgd,
        garantia_valor_mxn: null,
        dpd: Number(c.dpd) || 0,
      };

      const result = calculateCredit(input, DEFAULT_DISCOUNT_RATE);
      results.push({ creditId: c.id, folio: c.folio, input, result });
    }

    // ── Aggregate portfolio ──────────────────────────
    const combined = results.map(r => ({ ...r.input, ...r.result }));
    const agg = aggregatePortfolio(combined);
    const calculados = results.filter(r => r.result.calc_error === null).length;

    // ── Insert valuación record ──────────────────────
    const status = calculados === results.length
      ? "completed"
      : calculados > 0
        ? "completed_with_errors"
        : "error";

    const { data: valuacion, error: errVal } = await supabase
      .from("cartera_valuaciones")
      .insert({
        user_id: user.id,
        nombre: `Valuación cartera ${new Date().toISOString().split("T")[0]}`,
        discount_rate: DEFAULT_DISCOUNT_RATE,
        n_creditos: creditos.length,
        n_creditos_calculados: calculados,
        saldo_total_mxn: agg.saldo_total,
        npv_total_mxn: agg.npv_total,
        el_total_mxn: agg.el_total,
        yield_ponderado: agg.yield_ponderado,
        duration_ponderada: agg.duration_ponderada,
        wal_ponderado: agg.wal_ponderado,
        status,
      })
      .select("id")
      .single();

    if (errVal) {
      console.error("[valuar-completa] insert valuación error", errVal);
      return NextResponse.json({ error: "Error al guardar valuación" }, { status: 500 });
    }

    // ── Update credits with individual metrics ───────
    const now = new Date().toISOString();
    const updateErrors: string[] = [];

    for (const r of results) {
      if (r.result.calc_error) continue;

      const { error: errUpd } = await supabase
        .from("credits")
        .update({
          npv_mxn: r.result.npv,
          duration_modified: r.result.duration_modified,
          ytm: r.result.ytm,
          expected_loss_mxn: r.result.expected_loss,
          last_valuation_at: now,
          last_valuation_id: valuacion.id,
        })
        .eq("id", r.creditId)
        .eq("created_by", user.id);

      if (errUpd) {
        console.error(`[valuar-completa] update credit ${r.folio} error`, errUpd);
        updateErrors.push(r.folio ?? r.creditId);
      }
    }

    // ── Response ─────────────────────────────────────
    return NextResponse.json({
      success: true,
      valuacion_id: valuacion.id,
      total_creditos: creditos.length,
      creditos_calculados: calculados,
      creditos_con_error: results.length - calculados,
      saldo_total: agg.saldo_total,
      npv_total: agg.npv_total,
      expected_loss_total: agg.el_total,
      ytm_promedio: agg.yield_ponderado,
      duration_promedio: agg.duration_ponderada,
      update_errors: updateErrors.length > 0 ? updateErrors : undefined,
    });
  } catch (e: any) {
    console.error("[valuar-completa] unexpected error", e);
    return NextResponse.json({ error: e?.message || "Error inesperado" }, { status: 500 });
  }
}
