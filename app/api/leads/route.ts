import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { plan, company, name, email, phone, notes } = body;

  if (!company || !name || !email) {
    return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
  }

  // 1. Save to Supabase
  const { error: dbError } = await supabase.from("leads").insert({
    plan,
    company,
    name,
    email,
    phone: phone || null,
    notes: notes || null,
  });

  if (dbError) {
    console.error("Supabase error:", dbError);
    // Continue even if DB fails — still send emails
  }

  const planLabel = plan === "pro" ? "Pro — $500/mes" : "Basic — $70/mes";

  // 2. Email to admin
  await resend.emails.send({
    from: "Plinius <noreply@plinius.mx>",
    to: "luis@plinius.mx",
    subject: `Nuevo lead: ${company} (${plan})`,
    html: `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#064E3B,#059669);padding:28px 32px;">
          <div style="font-size:11px;letter-spacing:.12em;color:rgba(209,250,229,.6);font-weight:700;margin-bottom:6px;text-transform:uppercase;">Nuevo lead</div>
          <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.03em;">${company}</div>
          <div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;color:#fff;">${planLabel}</div>
        </div>
        <div style="padding:28px 32px;">
          <table style="width:100%;border-collapse:collapse;">
            ${[
              ["Nombre", name],
              ["Email", email],
              ["Teléfono", phone || "—"],
              ["Notas", notes || "—"],
            ].map(([k, v]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em;width:100px;">${k}</td>
                <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:500;">${v}</td>
              </tr>
            `).join("")}
          </table>
          <div style="margin-top:20px;font-size:11px;color:#94A3B8;">Recibido el ${new Date().toLocaleString("es-MX", { dateStyle:"full", timeStyle:"short" })}</div>
        </div>
      </div>
    `,
  });

  // 3. Confirmation to prospect
  await resend.emails.send({
    from: "Plinius <noreply@plinius.mx>",
    to: email,
    subject: "Recibimos tu solicitud — Plinius",
    html: `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#064E3B,#059669);padding:28px 32px;">
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.03em;">Plinius</div>
          <div style="font-size:10px;letter-spacing:.12em;color:rgba(209,250,229,.6);font-weight:700;margin-top:2px;">CREDIT OS</div>
        </div>
        <div style="padding:32px;">
          <div style="font-size:20px;font-weight:800;color:#0F172A;letter-spacing:-0.03em;margin-bottom:8px;">Hola, ${name.split(" ")[0]} 👋</div>
          <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">Recibimos tu solicitud para el plan <strong>${planLabel}</strong>. Nos pondremos en contacto contigo en las próximas 24 horas para coordinar el demo.</p>
          <div style="background:#F8FAFC;border:1px solid #E8EDF5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;color:#94A3B8;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;">Tu solicitud</div>
            <div style="font-size:13px;color:#0F172A;font-weight:600;">${company}</div>
            <div style="font-size:12px;color:#64748B;margin-top:2px;">${planLabel}</div>
          </div>
          <p style="font-size:12px;color:#94A3B8;margin:0;">¿Tienes dudas? Escríbenos a <a href="mailto:hola@plinius.mx" style="color:#059669;text-decoration:none;font-weight:600;">hola@plinius.mx</a></p>
        </div>
        <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #E8EDF5;">
          <p style="font-size:11px;color:#94A3B8;margin:0;">© ${new Date().getFullYear()} Infraestructura en Finanzas AI S.A.P.I. de C.V. · Plinius</p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
