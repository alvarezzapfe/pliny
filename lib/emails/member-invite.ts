// lib/emails/member-invite.ts
// Email de invitación para unirse al equipo de una empresa en Plinius

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM = "Plinius <noreply@plinius.mx>";

type SendResult = { ok: boolean; error?: string };

export async function sendMemberInviteEmail({
  to,
  empresaName,
  inviterEmail,
  role,
  inviteUrl,
}: {
  to: string;
  empresaName: string;
  inviterEmail: string;
  role: string;
  inviteUrl: string;
}): Promise<SendResult> {
  const roleLabel = role === "admin" ? "Administrador" : "Miembro";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:48px 20px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr>
    <td style="background:#071A3A;padding:36px 40px 32px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:0.05em;text-transform:uppercase;">
        Invitaci&oacute;n de equipo
      </p>
      <p style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em;">
        ${empresaName}
      </p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:40px 40px 32px;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.02em;">
        Te invitaron a unirte al equipo
      </h2>

      <p style="margin:0 0 24px;font-size:14px;color:#64748B;line-height:1.7;">
        <strong style="color:#0F172A;">${inviterEmail}</strong> te ha invitado como
        <strong style="color:#0F172A;">${roleLabel}</strong> en
        <strong style="color:#0F172A;">${empresaName}</strong> en Plinius.
      </p>

      <!-- Rol info -->
      <div style="background:#F8FAFC;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">
          Tu rol
        </p>
        <p style="margin:0;font-size:14px;color:#0F172A;font-weight:600;">
          ${roleLabel}
        </p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748B;">
          ${role === "admin"
            ? "Podr&aacute;s gestionar usuarios, editar el perfil de empresa y operar la cartera."
            : "Podr&aacute;s ver y operar la cartera de cr&eacute;dito de la empresa."
          }
        </p>
      </div>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${inviteUrl}" style="display:inline-block;padding:14px 36px;background:#071A3A;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;box-shadow:0 4px 14px rgba(7,26,58,0.3);letter-spacing:-0.01em;">
              Aceptar invitaci&oacute;n &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
        Este enlace expira en 7 d&iacute;as.
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 40px 28px;border-top:1px solid #F1F5F9;">
      <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
        Plinius &mdash; Infraestructura de cr&eacute;dito
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `Te invitaron a ${empresaName} en Plinius`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[member-invite] resend error:", err);
      return { ok: false, error: JSON.stringify(err) };
    }

    return { ok: true };
  } catch (e) {
    console.error("[member-invite] exception:", e);
    return { ok: false, error: String(e) };
  }
}
