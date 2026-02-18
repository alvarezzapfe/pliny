import { NextResponse } from "next/server";

export const runtime = "nodejs"; // importante para formData + buffers

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const rfc = String(form.get("rfc") || "").trim().toUpperCase();
    const cer = form.get("cer") as File | null;
    const key = form.get("key") as File | null;
    const ciec = String(form.get("ciec") || "").trim();

    if (!rfc || rfc.length < 10) {
      return NextResponse.json({ error: "RFC inválido" }, { status: 400 });
    }

    if (!((cer && key) || ciec)) {
      return NextResponse.json({ error: "Faltan archivos (.cer/.key) o CIEC" }, { status: 400 });
    }

    // TODO:
    // 1) guardar en Supabase Storage (server-side)
    // 2) encolar job de procesamiento
    // 3) devolver job_id

    return NextResponse.json({
      ok: true,
      status: "uploaded",
      message: cer && key ? "Archivos e.firma recibidos." : "CIEC recibida.",
      job_id: `sat_${Date.now()}`,
    });
  } catch {
    return NextResponse.json({ error: "Error interno SAT upload" }, { status: 500 });
  }
}
