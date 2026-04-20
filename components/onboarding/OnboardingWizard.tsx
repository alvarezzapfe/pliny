'use client'

import { useState } from 'react'
import { StepForm } from '@/components/onboarding/StepForm'
import { SuccessScreen } from '@/components/onboarding/SuccessScreen'

type Field = {
  id: string; label: string
  type: 'text'|'email'|'phone'|'number'|'select'|'date'|'file'|'boolean'
  required: boolean; options?: string[]; accept?: string; maxSizeMB?: number
  validation?: Record<string, unknown>
}
type Step = { id: string; title: string; order: number; fields: Field[] }
type Lender = { id: string; slug: string; name: string; logo_url: string|null; primary_color: string; secondary_color: string }
type Flow = { id: string; name: string; steps: Step[] }

type Props = {
  lender: Lender
  flow: Flow|null
  apiKey: string      // puede ser API key legacy O token firmado
  useToken?: boolean  // si true, usa x-portal-token en lugar de x-api-key
}

export function OnboardingWizard({ lender, flow, apiKey, useToken = false }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [applicantId, setApplicantId] = useState<string|null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [fileData, setFileData] = useState<Record<string, File>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [done, setDone] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  const primary   = lender.primary_color   ?? '#1A3A6B'
  const secondary = lender.secondary_color ?? '#00C896'
  const steps = flow?.steps.sort((a, b) => a.order - b.order) ?? []

  if (limitReached) return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: '#FFF7ED', border: '2px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>⏸</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>Portal temporalmente pausado</h2>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 28 }}>
          {lender.name} ha alcanzado el límite de solicitudes para este mes.<br/>
          Por favor intenta nuevamente el próximo mes o contacta directamente a la institución.
        </p>
        <a href={`mailto:luis@plinius.mx?subject=Ampliar%20plan%20onboarding%20${encodeURIComponent(lender.name)}`}
          style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 12, background: primary, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          Contactar soporte →
        </a>
        <div style={{ marginTop: 16, fontSize: 12, color: '#94A3B8' }}>luis@plinius.mx</div>
      </div>
    </div>
  )
  const totalSteps = steps.length
  const step = steps[currentStep]

  function authHeaders(): Record<string, string> {
    return useToken
      ? { 'x-portal-token': apiKey }
      : { 'x-api-key': apiKey }
  }

  async function ensureApplicant(data: Record<string, unknown>): Promise<string> {
    if (applicantId) return applicantId
    // Construir full_name desde campos del flow
    const fullName = data.full_name
      ?? (data.nombre ? `${data.nombre} ${data.apellido_paterno ?? ''}`.trim() : null)
      ?? null

    const res = await fetch('/api/onb-applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        flow_id:   flow!.id,
        email:     data.email,
        full_name: fullName,
        phone:     data.telefono ?? data.phone,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      if (res.status === 429 || json.error === 'limit_reached') {
        setLimitReached(true)
        throw new Error('limit_reached')
      }
      throw new Error(json.error ?? 'Error al crear solicitud')
    }
    setApplicantId(json.applicant.id)
    return json.applicant.id
  }

  async function saveStep(stepData: Record<string, unknown>, stepFiles: Record<string, File>) {
    setLoading(true); setError(null)
    try {
      const merged = { ...formData, ...stepData }
      setFormData(merged); setFileData({ ...fileData, ...stepFiles })
      const id = await ensureApplicant(merged)

      if (Object.keys(stepFiles).length > 0) {
        const fd = new FormData()
        for (const [k, v] of Object.entries(stepData)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v))
        for (const [k, f] of Object.entries(stepFiles)) fd.append(k, f)
        const res = await fetch(`/api/onb-applicants/${id}`, {
          method: 'PUT', headers: authHeaders(), body: fd,
        })
        if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error') }
      } else {
        const res = await fetch(`/api/onb-applicants/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ data: stepData }),
        })
        if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Error') }
      }

      if (currentStep === totalSteps - 1) {
        await fetch(`/api/onb-applicants/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ status: 'completed' }),
        })
        setDone(true)
      } else {
        setCurrentStep(s => s + 1)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (!flow) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'rgba(0,0,0,0.4)', fontSize: 14 }}>Portal sin flujo configurado.</p>
    </div>
  )

  if (done) return <SuccessScreen lender={lender} />

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lender.logo_url ? (
            <img src={lender.logo_url} alt={lender.name} style={{ height: 28, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, color: primary, letterSpacing: '-0.02em' }}>
              {lender.name}
            </span>
          )}
        </div>

        {/* Step pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: i < currentStep ? `${secondary}15` : i === currentStep ? `${primary}10` : 'transparent',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700,
                  background: i < currentStep ? secondary : i === currentStep ? primary : 'rgba(0,0,0,0.08)',
                  color: i <= currentStep ? '#fff' : 'rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: i === currentStep ? primary : i < currentStep ? secondary : 'rgba(0,0,0,0.35)',
                }}>
                  {s.title}
                </span>
              </div>
              {i < totalSteps - 1 && (
                <div style={{ width: 20, height: 1, background: i < currentStep ? secondary : 'rgba(0,0,0,0.1)' }}/>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontWeight: 500 }}>
          {currentStep + 1} / {totalSteps}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(0,0,0,0.04)' }}>
        <div style={{
          height: '100%', background: secondary,
          width: `${((currentStep + 1) / totalSteps) * 100}%`,
          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}/>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: secondary, marginBottom: 8,
            }}>
              Paso {currentStep + 1} de {totalSteps}
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 700, color: '#0A0F1E',
              letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2,
            }}>
              {step.title}
            </h1>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 24,
              background: '#FFF1F1', border: '1px solid rgba(255,91,91,0.2)',
              fontSize: 13, color: '#D83636',
            }}>
              {error}
            </div>
          )}

          <div style={{
            background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16,
            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
          }}>
            <StepForm
              step={step}
              defaultValues={formData}
              primaryColor={primary}
              secondaryColor={secondary}
              loading={loading}
              isLast={currentStep === totalSteps - 1}
              onBack={currentStep > 0 ? () => setCurrentStep(s => s - 1) : undefined}
              onSubmit={saveStep}
            />
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
