import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientId = String(body?.clientId ?? "");

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "Missing clientId" },
        { status: 400 }
      );
    }

    // ✅ Mock de procesamiento SAT (dummy)
    return NextResponse.json({
      ok: true,
      clientId,
      status: "connected",
      lastChecked: new Date().toISOString(),
      metrics: {
        ingresos_12m_mxn: 9_850_000,
        cfdi_count_12m: 1240,
        nomina_count_12m: 96,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? "SAT process failed") },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Use POST with { clientId }",
  });
}