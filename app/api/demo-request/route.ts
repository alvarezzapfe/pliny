// POST /api/demo-request — Guarda lead de demo + notifica por email
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

type DemoPayload = {
  empresa: string;
  tipo: string;
  tipo_otro?: string;
  cartera: string;
  volumen: string;
  intereses: string[];
  intereses_otro?: string;
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
};

export async function POST(req: NextRequest) {
  console.log("[demo-request] === NEW REQUEST ===");

  try {
    const body: DemoPayload = await req.json();

    // Validaciones
    if (!body.empresa?.trim()) return NextResponse.json({ error: "Empresa requerida." }, { status: 400 });
    if (!body.tipo) return NextResponse.json({ error: "Tipo de organización requerido." }, { status: 400 });
    if (!body.cartera) return NextResponse.json({ error: "Cartera requerida." }, { status: 400 });
    if (!body.volumen) return NextResponse.json({ error: "Volumen requerido." }, { status: 400 });
    if (!body.intereses?.length) return NextResponse.json({ error: "Selecciona al menos un interés." }, { status: 400 });
    if (!body.nombre?.trim()) return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    if (!body.telefono?.trim() || body.telefono.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });
    if (!body.cargo?.trim()) return NextResponse.json({ error: "Cargo requerido." }, { status: 400 });

    // Insert en Supabase
    const sb = createServiceClient();
    const { error: dbErr } = await sb.from("demo_requests").insert({
      empresa: body.empresa.trim(),
      tipo: body.tipo,
      tipo_otro: body.tipo_otro?.trim() || null,
      cartera: body.cartera,
      volumen: body.volumen,
      intereses: body.intereses,
      intereses_otro: body.intereses_otro?.trim() || null,
      nombre: body.nombre.trim(),
      email: body.email.trim().toLowerCase(),
      telefono: body.telefono.trim(),
      cargo: body.cargo.trim(),
    });

    if (dbErr) {
      console.error("[demo-request] DB insert failed:", dbErr.message);
      return NextResponse.json({ error: "Error guardando solicitud." }, { status: 500 });
    }

    console.log("[demo-request] DB insert OK:", body.email);

    // Email a luis@plinius.mx (no-blocking: si falla no afecta al usuario)
    try {
      const interesesList = body.intereses.map(i => `<li>${i}</li>`).join("");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Plinius <noreply@plinius.mx>",
          to: ["luis@plinius.mx"],
          subject: `Nueva demo request: ${body.empresa} (${body.tipo})`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E2A3A;">
              <div style="background:#0C1E4A;padding:20px 28px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;font-size:18px;margin:0;">Nueva solicitud de demo</h1>
              </div>
              <div style="padding:24px 28px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="font-size:14px;color:#64748B;margin:0 0 16px;">Empresa</h2>
                <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                  <tr><td style="padding:6px 0;font-weight:600;width:140px;">Empresa</td><td>${body.empresa}</td></tr>
                  <tr><td style="padding:6px 0;font-weight:600;">Tipo</td><td>${body.tipo}${body.tipo_otro ? ` (${body.tipo_otro})` : ""}</td></tr>
                  <tr><td style="padding:6px 0;font-weight:600;">Cartera</td><td>${body.cartera}</td></tr>
                  <tr><td style="padding:6px 0;font-weight:600;">Volumen mensual</td><td>${body.volumen}</td></tr>
                </table>
                <h2 style="font-size:14px;color:#64748B;margin:0 0 10px;">Intereses</h2>
                <ul style="margin:0 0 20px;padding-left:20px;">${interesesList}</ul>
                ${body.intereses_otro ? `<p style="color:#64748B;font-size:13px;">Otro: ${body.intereses_otro}</p>` : ""}
                <h2 style="font-size:14px;color:#64748B;margin:0 0 10px;">Contacto</h2>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;font-weight:600;width:140px;">Nombre</td><td>${body.nombre}</td></tr>
                  <tr><td style="padding:6px 0;font-weight:600;">Email</td><td><a href="mailto:${body.email}">${body.email}</a></td></tr>
                  <tr><td style="padding:6px 0;font-weight:600;">Teléfono</td><td>${body.telefono}</td></tr>
                  <tr><td style="padding:6px 0;font-weight:600;">Cargo</td><td>${body.cargo}</td></tr>
                </table>
              </div>
            </div>
          `,
        }),
      });
      console.log("[demo-request] Email sent OK");
    } catch (emailErr) {
      console.error("[demo-request] Email failed (non-blocking):", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    console.error("[demo-request] CATCH:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
