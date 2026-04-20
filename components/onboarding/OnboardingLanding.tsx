'use client'

import { useRouter } from 'next/navigation'

type Step = { id: string; title: string; order: number; fields: { id: string }[] }
type Lender = { id: string; slug: string; name: string; logo_url: string|null; primary_color: string; secondary_color: string }
type Flow = { id: string; name: string; steps: Step[] }

type Props = { lender: Lender; flow: Flow|null }

export function OnboardingLanding({ lender, flow }: Props) {
  const router = useRouter()
  const primary   = lender.primary_color   ?? '#1A3A6B'
  const secondary = lender.secondary_color ?? '#00C896'

  const steps = flow?.steps.sort((a, b) => a.order - b.order) ?? []
  const totalFields = steps.reduce((acc, s) => acc + s.fields.length, 0)

  function start() {
    router.push(`/onboarding/${lender.slug}?start=1`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        padding: '0 40px', height: 64,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: '#fff', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lender.logo_url ? (
            <img src={lender.logo_url} alt={lender.name} style={{ height: 30, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 800, color: primary, letterSpacing: '-0.02em' }}>
              {lender.name}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          Solicitud de crédito
        </div>
      </div>

      {/* Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px', textAlign: 'center',
      }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 20, marginBottom: 32,
          background: `${secondary}12`,
          border: `1px solid ${secondary}30`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: secondary }}/>
          <span style={{ fontSize: 12, fontWeight: 700, color: secondary, letterSpacing: '0.04em' }}>
            100% Digital · Sin papeles
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800, color: '#0F172A',
          letterSpacing: '-0.03em', lineHeight: 1.1,
          margin: '0 0 20px', maxWidth: 680,
        }}>
          Solicita tu crédito con{' '}
          <span style={{ color: primary }}>{lender.name}</span>
        </h1>

        <p style={{
          fontSize: 18, color: '#64748B', lineHeight: 1.6,
          margin: '0 0 48px', maxWidth: 500,
        }}>
          Proceso completamente digital. Sube tus documentos, recibe respuesta en 24–48 horas.
        </p>

        {/* CTA principal */}
        <button
          onClick={start}
          style={{
            height: 56, padding: '0 40px',
            background: primary, color: '#fff',
            border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 800,
            cursor: 'pointer', letterSpacing: '-0.01em',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: `0 8px 24px ${primary}40`,
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = `0 12px 32px ${primary}50`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = `0 8px 24px ${primary}40`
          }}
        >
          Iniciar mi solicitud
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p style={{ margin: '16px 0 0', fontSize: 12, color: '#94A3B8' }}>
          Sin costo · Sin compromiso · {totalFields > 0 ? `${totalFields} campos en ${steps.length} pasos` : 'Proceso rápido'}
        </p>

        {/* Steps preview */}
        {steps.length > 0 && (
          <div style={{
            display: 'flex', gap: 12, marginTop: 64,
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {steps.map((step, i) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 20px', borderRadius: 12,
                  background: '#F8FAFC', border: '1px solid #E2E8F0',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${primary}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: primary,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    {step.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust bar */}
      <div style={{
        padding: '20px 40px',
        borderTop: '1px solid #F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40,
        flexWrap: 'wrap',
      }}>
        {[
          ['🔒', 'Información cifrada'],
          ['📋', 'Proceso regulado'],
          ['⚡', 'Respuesta en 24–48h'],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>{text}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#CBD5E1' }}>
          Powered by <strong style={{ color: primary }}>Plinius</strong>
        </div>
      </div>
    </div>
  )
}
