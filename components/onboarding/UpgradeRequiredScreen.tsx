// components/onboarding/UpgradeRequiredScreen.tsx — Shown when lender plan < PRO
'use client'

export function UpgradeRequiredScreen() {
  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Geist', system-ui, sans-serif",
      background: '#FAFBFC',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');`}</style>

      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 24px',
          background: '#FFF7ED', border: '1.5px solid #FED7AA',
          display: 'grid', placeItems: 'center',
        }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 10 }}>
          Esta función no está disponible
        </h1>
        <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, marginBottom: 32 }}>
          El otorgante necesita actualizar su plan para activar el portal de onboarding.
        </p>

        <a
          href="https://www.plinius.mx"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10,
            background: '#0F172A', color: '#fff',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            transition: 'opacity .15s',
          }}
        >
          Conoce Plinius →
        </a>
      </div>
    </div>
  )
}
