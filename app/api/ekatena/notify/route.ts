import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { id, ekatena_link, notas_admin } = await req.json();
    if (!id || !ekatena_link)
      return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });

    // Obtener datos de la solicitud y el usuario
    const { data: request } = await supabaseAdmin
      .from("ekatena_requests")
      .select("*, borrowers_profile(company_name, rep_first_names, rep_last_name, rep_email)")
      .eq("id", id)
      .maybeSingle();

    if (!request) return NextResponse.json({ ok: false, error: "Solicitud no encontrada" }, { status: 404 });

    // Obtener email del usuario
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(request.owner_id);
    const email = authUser?.user?.email;
    if (!email) return NextResponse.json({ ok: false, error: "Email no encontrado" }, { status: 404 });

    const company = request.borrowers_profile?.company_name ?? "tu empresa";
    const nombre  = request.borrowers_profile?.rep_first_names ?? "Estimado usuario";

    // Guardar link en la solicitud
    await supabaseAdmin.from("ekatena_requests").update({
      ekatena_link,
      notas_admin:  notas_admin ?? request.notas_admin,
      status:       "link_enviado",
      updated_at:   new Date().toISOString(),
    }).eq("id", id);

    // Enviar mail con Resend
    const mailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    "Plinius <noreply@plinius.mx>",
        to:      [email],
        subject: `Siguiente paso: ingresa tus datos en Ekatena — ${company}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0F172A;">
            <img src="https://plinius.mx/plinius.png" alt="Plinius" style="height:28px;margin-bottom:24px;"/>
            <h2 style="font-size:22px;font-weight:900;letter-spacing:-0.04em;margin-bottom:8px;">
              Tu verificacion Ekatena esta lista
            </h2>
            <p style="color:#64748B;font-size:14px;margin-bottom:24px;">
              Hola ${nombre}, tu reporte de verificacion para <strong>${company}</strong> ha sido procesado.
            </p>
            <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:20px;margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;color:#065F46;letter-spacing:.08em;margin-bottom:12px;">REPORTE EKATENA</div>
              <a href="${ekatena_link}" target="_blank"
                style="display:inline-block;background:linear-gradient(135deg,#064E3B,#059669);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;">
                Ver reporte completo →
              </a>
            </div>
            ${notas_admin ? `<div style="background:#F8FAFC;border:1px solid #E8EDF5;border-radius:10px;padding:16px;margin-bottom:24px;font-size:13px;color:#475569;"><strong>Notas:</strong> ${notas_admin}</div>` : ""}
            <p style="font-size:12px;color:#94A3B8;">
              Tambien puedes ver tu reporte en <a href="https://plinius.mx/solicitante/verificacion" style="color:#059669;">plinius.mx/solicitante/verificacion</a>
            </p>
            <hr style="border:none;border-top:1px solid #E8EDF5;margin:24px 0;"/>
            <p style="font-size:11px;color:#CBD5E1;">Plinius · Credit OS · plinius.mx</p>
          </div>
        `,
      }),
    });

    if (!mailRes.ok) {
      const mailErr = await mailRes.json();
      throw new Error(mailErr.message ?? "Error al enviar email");
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
