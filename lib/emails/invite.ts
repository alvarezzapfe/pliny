// lib/emails/invite.ts
// Email de invitación que el otorgante manda al prospecto

const RESEND_API_KEY = process.env.RESEND_ONBOARDING_KEY!
const FROM = 'Plinius <noreply@plinius.mx>'

export async function sendInviteEmail({
  to,
  lenderName,
  lenderColor,
  lenderSecondary,
  portalUrl,
  customMessage,
}: {
  to: string
  lenderName: string
  lenderColor: string
  lenderSecondary: string
  portalUrl: string
  customMessage?: string
}): Promise<{ ok: boolean; error?: string }> {

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:48px 20px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

  <!-- Header con color del otorgante -->
  <tr>
    <td style="background:${lenderColor};padding:36px 40px 32px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.6);letter-spacing:0.05em;text-transform:uppercase;">
        Invitación de crédito
      </p>
      <p style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em;">
        ${lenderName}
      </p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:40px 40px 32px;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.02em;">
        Te invitamos a solicitar financiamiento
      </h2>

      ${customMessage ? `
      <div style="background:#F8FAFC;border-left:3px solid ${lenderSecondary};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;font-style:italic;">
          "${customMessage}"
        </p>
      </div>
      ` : `
      <p style="margin:0 0 24px;font-size:14px;color:#64748B;line-height:1.7;">
        <strong style="color:#0F172A;">${lenderName}</strong> te ha habilitado para completar tu solicitud de crédito de forma rápida y segura. El proceso toma menos de 5 minutos.
      </p>
      `}

      <!-- Pasos -->
      <div style="margin-bottom:32px;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">
          Cómo funciona
        </p>
        ${[
          ['1', 'Completa tus datos personales', 'Nombre, RFC, contacto'],
          ['2', 'Sube tus documentos', 'INE y comprobante de domicilio'],
          ['3', 'Recibe respuesta', 'En 24–48 horas hábiles'],
        ].map(([n, t, d]) => `
        <div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;">
          <div style="width:28px;height:28px;border-radius:8px;background:${lenderColor}12;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-size:12px;font-weight:800;color:${lenderColor};">${n}</span>
          </div>
          <div>
            <p style="margin:0;font-size:13px;font-weight:600;color:#0F172A;">${t}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#94A3B8;">${d}</p>
          </div>
        </div>`).join('')}
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${portalUrl}"
          style="display:inline-block;background:${lenderColor};color:#fff;text-decoration:none;
            padding:15px 40px;border-radius:12px;font-size:15px;font-weight:700;
            letter-spacing:-0.01em;box-shadow:0 4px 14px ${lenderColor}40;">
          Iniciar mi solicitud →
        </a>
      </div>
      <p style="margin:12px 0 0;text-align:center;font-size:11px;color:#CBD5E1;">
        O copia este link: <span style="color:#64748B;">${portalUrl}</span>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 40px;border-top:1px solid #F1F5F9;background:#FAFAFA;">
      <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;line-height:1.6;">
        Este correo fue enviado por <strong style="color:#64748B;">${lenderName}</strong> a través de
        <strong style="color:#1A3A6B;">Plinius</strong>.<br>
        Si no esperabas este mensaje, puedes ignorarlo.
      </p>
    </td>
  </tr>

</table>

<p style="margin:20px 0 0;font-size:11px;color:#CBD5E1;text-align:center;">
  Powered by <strong style="color:#1A3A6B;">Plinius</strong> · Infraestructura de crédito en México
</p>
</td></tr>
</table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: `${lenderName} te invita a solicitar financiamiento`,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { ok: false, error: JSON.stringify(err) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
