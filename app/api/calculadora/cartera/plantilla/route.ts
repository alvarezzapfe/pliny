// GET /api/calculadora/cartera/plantilla — Genera y devuelve plantilla_cartera_plinius.xlsx (auth required)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generatePlantilla } from "@/lib/cartera/plantilla-generator";

export async function GET(req: NextRequest) {
  try {
    // Auth — require valid Supabase session
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

    const buffer = await generatePlantilla();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla_cartera_plinius.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[plantilla] Error:", err);
    return NextResponse.json({ error: "Error generando plantilla" }, { status: 500 });
  }
}
