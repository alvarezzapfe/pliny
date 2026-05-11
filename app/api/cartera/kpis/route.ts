// GET /api/cartera/kpis — KPIs agregados de la cartera de créditos del lender
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CarteraKPIs, CreditoEstatus } from "@/lib/cartera-gestion/types";
import { ESTATUS_VALUES } from "@/lib/cartera-gestion/types";

const MORA_STATUSES = ["mora_30", "mora_60", "mora_90"];

export async function GET(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData } = await sb.auth.getUser(token);
    if (!userData?.user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    // ── Fetch all credits for this user ──────────────────────
    // RLS filters by created_by, belt-and-suspenders with explicit eq
    const { data: credits, error } = await sb
      .from("credits")
      .select("estatus, tipo_credito, saldo_actual, tasa_anual, plazo_meses")
      .eq("created_by", userData.user.id);

    if (error) {
      console.error("[cartera/kpis]", error.message);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }

    const rows = credits ?? [];

    // ── Compute KPIs ─────────────────────────────────────────
    const vigentes = rows.filter((r) => r.estatus === "vigente");
    const moraRows = rows.filter((r) => MORA_STATUSES.includes(r.estatus));

    const carteraViva = vigentes.reduce((sum, r) => sum + (r.saldo_actual ?? 0), 0);
    const moraMonto = moraRows.reduce((sum, r) => sum + (r.saldo_actual ?? 0), 0);

    // Yield promedio ponderado: sum(saldo * tasa) / sum(saldo) for vigentes
    let yieldProm: number | null = null;
    if (vigentes.length > 0 && carteraViva > 0) {
      const sumSaldoTasa = vigentes.reduce(
        (sum, r) => sum + (r.saldo_actual ?? 0) * (r.tasa_anual ?? 0),
        0,
      );
      yieldProm = sumSaldoTasa / carteraViva;
    }

    // Plazo promedio for vigentes
    const vigentesConPlazo = vigentes.filter((r) => r.plazo_meses != null);
    const plazoProm =
      vigentesConPlazo.length > 0
        ? vigentesConPlazo.reduce((sum, r) => sum + r.plazo_meses!, 0) /
          vigentesConPlazo.length
        : null;

    // Distribución por estatus
    const distribEstatus = {} as Record<CreditoEstatus, { count: number; saldo_mxn: number }>;
    for (const est of ESTATUS_VALUES) {
      distribEstatus[est] = { count: 0, saldo_mxn: 0 };
    }
    for (const r of rows) {
      const est = r.estatus as CreditoEstatus;
      if (distribEstatus[est]) {
        distribEstatus[est].count++;
        distribEstatus[est].saldo_mxn += r.saldo_actual ?? 0;
      }
    }

    // Distribución por tipo
    const distribTipo: Record<string, { count: number; saldo_mxn: number }> = {};
    for (const r of rows) {
      const tipo = r.tipo_credito ?? "Sin tipo";
      if (!distribTipo[tipo]) {
        distribTipo[tipo] = { count: 0, saldo_mxn: 0 };
      }
      distribTipo[tipo].count++;
      distribTipo[tipo].saldo_mxn += r.saldo_actual ?? 0;
    }

    // ── Build response ───────────────────────────────────────
    const kpis: CarteraKPIs = {
      total_creditos: rows.length,
      creditos_vigentes: vigentes.length,
      cartera_viva_mxn: carteraViva,
      mora_30_plus_mxn: moraMonto,
      mora_30_plus_count: moraRows.length,
      ticket_promedio_mxn: vigentes.length > 0 ? carteraViva / vigentes.length : null,
      yield_promedio_ponderado: yieldProm,
      plazo_promedio_meses: plazoProm,
      distribucion_estatus: distribEstatus,
      distribucion_tipo: distribTipo,
    };

    return NextResponse.json(kpis, {
      headers: { "Cache-Control": "private, no-store, must-revalidate" },
    });
  } catch (err) {
    console.error("[cartera/kpis] Unhandled:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
