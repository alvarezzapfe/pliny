// GET /api/calculadora/cartera/plantilla — Genera y devuelve plantilla_cartera_plinius.xlsx
import { NextResponse } from "next/server";
import { generatePlantilla } from "@/lib/cartera/plantilla-generator";

export async function GET() {
  try {
    const buffer = await generatePlantilla();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla_cartera_plinius.xlsx"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[plantilla] Error:", err);
    return NextResponse.json({ error: "Error generando plantilla" }, { status: 500 });
  }
}
