import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rfc = String(body?.rfc || "").trim().toUpperCase();

    if (!rfc || rfc.length < 10) {
      return NextResponse.json({ error: "RFC inválido" }, { status: 400 });
    }

    // MOCK (luego aquí llamas tu worker / proveedor SAT)
    return NextResponse.json({
      ok: true,
      status: "connected",
      identity: {
        rfc,
        companyName: body?.companyName || "EMPRESA DEMO SA DE CV",
        verifiedAt: new Date().toISOString(),
      },
      revenue: [], // futuro: 24 meses
    });
  } catch {
    return NextResponse.json({ error: "Error interno SAT process" }, { status: 500 });
  }
}
