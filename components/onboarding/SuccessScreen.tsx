// components/onboarding/SuccessScreen.tsx — Pantalla post-submit con resultado de pre-aprobación
'use client'

type Lender = { name: string; logo_url: string|null; primary_color: string; secondary_color: string }

type Props = {
  lender: Lender
  status: 'pre_approved' | 'pending_review'
  failedRules?: { field: string; message: string }[]
  data: Record<string, unknown>
}

function formatMXN(n: unknown): string {
  const num = typeof n === 'number' ? n : Number(n)
  if (isNaN(num)) return '—'
  return '$' + num.toLocaleString('es-MX', { maximumFractionDigits: 0 })
}

export function SuccessScreen({ lender, status, failedRules, data }: Props) {
  const primary = lender.primary_color ?? '#1A3A6B'
  const isApproved = status === 'pre_approved'

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Geist', system-ui, sans-serif",
      background: isApproved
        ? 'linear-gradient(180deg, #F0FDF9 0%, #FAFBFC 40%)'
        : 'linear-gradient(180deg, #EFF6FF 0%, #FAFBFC 40%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '60px 20px',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');`}</style>

      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 24px',
          background: isApproved ? '#ECFDF5' : '#EFF6FF',
          border: `1.5px solid ${isApproved ? '#A7F3D0' : '#BFDBFE'}`,
          display: 'grid', placeItems: 'center',
        }}>
          {isApproved ? (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 10 }}>
          {isApproved ? '¡Tu solicitud avanza!' : 'Recibimos tu solicitud'}
        </h1>
        <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, marginBottom: 32 }}>
          {isApproved
            ? 'Pre-aprobamos tu solicitud. En las próximas 24 horas recibirás un correo para subir tus documentos y completar el proceso.'
            : 'Estamos revisando tu información. Te contactaremos en las próximas 24 horas con una respuesta.'}
        </p>

        {/* Failed rules (pending_review only) */}
        {!isApproved && failedRules && failedRules.length > 0 && (
          <div style={{ textAlign: 'left', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 8 }}>Observaciones:</div>
            {failedRules.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6, display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#F59E0B' }}>•</span>
                {r.message}
              </div>
            ))}
          </div>
        )}

        {/* Summary card */}
        <div style={{ background: '#fff', border: '1px solid #E8EDF5', borderRadius: 12, padding: '20px 24px', textAlign: 'left', marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Resumen</div>
          {[
            { label: 'Empresa', value: data.razon_social },
            { label: 'Monto solicitado', value: data.monto_solicitado_mxn ? formatMXN(data.monto_solicitado_mxn) : null },
            { label: 'Plazo', value: data.plazo_meses ? `${data.plazo_meses} meses` : null },
            { label: 'Destino', value: data.destino_credito },
          ].filter(r => r.value).map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{String(r.value)}</span>
            </div>
          ))}
        </div>

        {/* Lender contact */}
        <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
          ¿Tienes preguntas? Contacta a{' '}
          <a href={`mailto:contacto@plinius.mx`} style={{ color: primary, fontWeight: 600, textDecoration: 'none' }}>
            {lender.name}
          </a>
        </div>

        {/* Back to home */}
        <a href="/" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>
          ← Volver al inicio
        </a>
      </div>
    </div>
  )
}
