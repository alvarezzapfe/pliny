// lib/emails/resend.ts
// Resend integration para notificaciones del Onboarding API

const RESEND_API_KEY = process.env.RESEND_ONBOARDING_KEY!
const FROM = 'Plinius <noreply@plinius.mx>'

type SendResult = { ok: boolean; error?: string }

async function sendEmail(payload: {
  to: string | string[]
  subject: string
  html: string
}): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, ...payload }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('[resend] error:', err)
      return { ok: false, error: JSON.stringify(err) }
    }
    return { ok: true }
  } catch (e) {
    console.error('[resend] exception:', e)
    return { ok: false, error: String(e) }
  }
}

// ── Email al SOLICITANTE — confirmación de recepción ─────────
export async function sendApplicantConfirmation({
  to,
  applicantName,
  lenderName,
  lenderColor,
}: {
  to: string
  applicantName: string
  lenderName: string
  lenderColor: string
}): Promise<SendResult> {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.07);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:${lenderColor};padding:28px 36px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${lenderName}</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.65);">Solicitud de crédito</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0A0F1E;letter-spacing:-0.02em;">
              ¡Solicitud recibida!
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:rgba(0,0,0,0.5);line-height:1.6;">
              Hola <strong style="color:#0A0F1E;">${applicantName}</strong>, tu solicitud de crédito con 
              <strong style="color:#0A0F1E;">${lenderName}</strong> ha sido recibida exitosamente.
            </p>

            <!-- Status box -->
            <div style="background:#F0FDF8;border:1px solid rgba(0,214,143,0.2);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#00D68F;flex-shrink:0;"></div>
                <span style="font-size:12px;font-weight:600;color:#00A36C;letter-spacing:0.04em;text-transform:uppercase;">En revisión</span>
              </div>
              <p style="margin:0;font-size:13px;color:rgba(0,0,0,0.55);line-height:1.6;">
                Tu información y documentos están siendo procesados. Te notificaremos en las próximas <strong style="color:#0A0F1E;">24–48 horas hábiles</strong>.
              </p>
            </div>

            <!-- Steps -->
            <p style="margin:0 0 14px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:rgba(0,0,0,0.3);">
              ¿Qué sigue?
            </p>
            ${[
              ['1', 'Revisión de documentos', 'Verificamos la información enviada'],
              ['2', 'Evaluación crediticia', 'Analizamos tu perfil de crédito'],
              ['3', 'Resolución', 'Te contactamos con el resultado'],
            ].map(([n, title, desc]) => `
            <div style="display:flex;gap:14px;margin-bottom:16px;align-items:flex-start;">
              <div style="width:24px;height:24px;border-radius:50%;background:${lenderColor}12;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <span style="font-size:11px;font-weight:700;color:${lenderColor};">${n}</span>
              </div>
              <div>
                <p style="margin:0;font-size:13px;font-weight:600;color:#0A0F1E;">${title}</p>
                <p style="margin:2px 0 0;font-size:12px;color:rgba(0,0,0,0.4);">${desc}</p>
              </div>
            </div>`).join('')}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.3);text-align:center;">
              Este correo fue enviado por <strong style="color:rgba(0,0,0,0.5);">Plinius</strong> en nombre de ${lenderName}.
              <br>Si no solicitaste este crédito, puedes ignorar este mensaje.
            </p>
          </td>
        </tr>

      </table>

      <!-- Plinius branding -->
      <p style="margin:20px 0 0;font-size:11px;color:rgba(0,0,0,0.3);">
        Powered by <strong style="color:#1A3A6B;">Plinius</strong> · Infraestructura de crédito en México
      </p>
    </td></tr>
  </table>
</body>
</html>`

  return sendEmail({
    to,
    subject: `${lenderName} — Tu solicitud fue recibida`,
    html,
  })
}

// ── Email al OTORGANTE — nueva solicitud ─────────────────────
export async function sendLenderNotification({
  to,
  lenderName,
  applicantName,
  applicantEmail,
  applicantPhone,
  applicantId,
  dashboardUrl,
}: {
  to: string
  lenderName: string
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  applicantId: string
  dashboardUrl: string
}): Promise<SendResult> {
  const now = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.07);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#0A0F1E;padding:28px 36px;">
            <p style="margin:0;font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.08em;text-transform:uppercase;">Plinius · Onboarding API</p>
            <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Nueva solicitud recibida</p>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="background:#F0FDF8;border-bottom:1px solid rgba(0,214,143,0.15);padding:14px 36px;">
            <p style="margin:0;font-size:13px;color:#00A36C;">
              <strong>${lenderName}</strong> recibió una nueva solicitud de crédito el ${now}
            </p>
          </td>
        </tr>

        <!-- Applicant data -->
        <tr>
          <td style="padding:32px 36px 24px;">
            <p style="margin:0 0 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:rgba(0,0,0,0.3);">
              Datos del solicitante
            </p>

            ${[
              ['Nombre', applicantName],
              ['Correo', applicantEmail],
              ...(applicantPhone ? [['Teléfono', applicantPhone]] : []),
              ['ID de solicitud', applicantId.slice(0, 8) + '...'],
            ].map(([label, value]) => `
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
              <span style="font-size:12px;color:rgba(0,0,0,0.4);font-weight:500;">${label}</span>
              <span style="font-size:13px;color:#0A0F1E;font-weight:600;">${value}</span>
            </div>`).join('')}

            <!-- CTA -->
            <div style="margin-top:28px;text-align:center;">
              <a href="${dashboardUrl}"
                style="display:inline-block;background:#1A3A6B;color:#ffffff;text-decoration:none;
                  padding:13px 28px;border-radius:10px;font-size:13px;font-weight:700;letter-spacing:-0.01em;">
                Ver solicitud en dashboard →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.3);text-align:center;">
              Notificación automática de <strong style="color:rgba(0,0,0,0.5);">Plinius Onboarding API</strong>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendEmail({
    to,
    subject: `Nueva solicitud — ${applicantName} · ${lenderName}`,
    html,
  })
}
