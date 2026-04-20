'use client'

type Lender = { name: string; logo_url: string|null; primary_color: string; secondary_color: string }

export function SuccessScreen({ lender }: { lender: Lender }) {
  const primary   = lender.primary_color   ?? '#1A3A6B'
  const secondary = lender.secondary_color ?? '#00C896'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center',
      }}>
        {lender.logo_url ? (
          <img src={lender.logo_url} alt={lender.name} style={{ height: 28, objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 15, fontWeight: 700, color: primary }}>{lender.name}</span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20,
          padding: '52px 48px', maxWidth: 460, width: '100%', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
        }}>

          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 28px',
            background: `${secondary}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 14l7 7 13-13" stroke={secondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 700, color: '#0A0F1E',
            letterSpacing: '-0.02em', margin: '0 0 10px',
          }}>
            ¡Solicitud enviada!
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, margin: '0 0 32px' }}>
            Tu solicitud ha sido recibida por <strong style={{ color: '#0A0F1E' }}>{lender.name}</strong>.
            Te contactaremos pronto con los siguientes pasos.
          </p>

          {/* Steps */}
          <div style={{
            background: '#F7F8FA', borderRadius: 12, padding: '20px 22px',
            textAlign: 'left', border: '1px solid rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(0,0,0,0.35)', marginBottom: 14 }}>
              ¿Qué sigue?
            </div>
            {[
              'Revisaremos tu información en las próximas 24–48 horas',
              'Recibirás una notificación con el resultado',
              'Puedes cerrar esta ventana con seguridad',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 2 ? 12 : 0, alignItems: 'flex-start' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: `${secondary}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: secondary,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: '16px 32px', textAlign: 'center',
        fontSize: 11, color: 'rgba(0,0,0,0.25)',
        borderTop: '1px solid rgba(0,0,0,0.05)',
      }}>
        Powered by <span style={{ fontWeight: 600, color: primary }}>Plinius</span>
      </div>
    </div>
  )
}
