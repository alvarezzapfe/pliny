import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Ekatena API wrapper
// Docs: https://docs.ekatena.com (sustituir con credenciales reales)
const EKATENA_BASE = process.env.EKATENA_API_URL ?? "https://api.ekatena.com/v1";
const EKATENA_KEY  = process.env.EKATENA_API_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, rfc, curp, nombre, apellido_paterno, apellido_materno } = body;

    if (!EKATENA_KEY) {
      // Modo sandbox — devuelve datos mock para desarrollo
      await new Promise(r => setTimeout(r, 1200));
      return NextResponse.json({
        ok: true,
        sandbox: true,
        consultaId: `SANDBOX-${Date.now()}`,
        status: "completado",
        resultado: {
          identidad_verificada: true,
          rfc_valido: true,
          lista_negra: false,
          pld_score: 12,
          score_credito: 680,
          nivel_riesgo: "bajo",
          detalles: {
            nombre_sat: nombre ?? "NOMBRE DE PRUEBA",
            rfc_sat: rfc ?? "TEST000000000",
            curp_renapo: curp ?? null,
          },
        },
      });
    }

    if (action === "consultar_rfc") {
      const res = await fetch(`${EKATENA_BASE}/rfc/consultar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": EKATENA_KEY,
        },
        body: JSON.stringify({ rfc, nombre, apellido_paterno, apellido_materno }),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, ...data });
    }

    if (action === "verificar_identidad") {
      const res = await fetch(`${EKATENA_BASE}/identidad/verificar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": EKATENA_KEY,
        },
        body: JSON.stringify({ rfc, curp, nombre, apellido_paterno, apellido_materno }),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, ...data });
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida" }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? "Error interno" }, { status: 500 });
  }
}
