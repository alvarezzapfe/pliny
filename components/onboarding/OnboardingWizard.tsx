// components/onboarding/OnboardingWizard.tsx — Multi-step onboarding wizard (Stripe/Linear style)
'use client'

import { useState, useCallback } from 'react'
import { StepForm } from '@/components/onboarding/StepForm'
import { SuccessScreen } from '@/components/onboarding/SuccessScreen'

type Field = {
  id: string; label: string
  type: 'text'|'email'|'phone_mx'|'number'|'select'|'date'|'file'|'boolean'|'currency'|'card_select'|'chips'
  required?: boolean; options?: unknown[]; accept?: string; maxSizeMB?: number
  pattern?: string; min?: number; max?: number; maxLength?: number
  validation?: Record<string, unknown>
}
type Step = { id: string; title: string; order: number; fields: Field[] }
type Lender = { id: string; slug: string; name: string; logo_url: string|null; primary_color: string; secondary_color: string }
type Flow = { id: string; name: string; steps: Step[] }

type SubmitResult = {
  ok: boolean
  applicant_id?: string
  status?: 'pre_approved' | 'pending_review'
  failed_rules?: { field: string; message: string }[]
  error?: string
}

type Props = {
  lender: Lender
  flow: Flow|null
  apiKey: string
  useToken?: boolean
}

export function OnboardingWizard({ lender, flow, apiKey, useToken = false }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [result, setResult] = useState<SubmitResult|null>(null)
  const [limitReached, setLimitReached] = useState(false)

  const primary = lender.primary_color ?? '#1A3A6B'
  const secondary = lender.secondary_color ?? '#00C896'
  const steps = flow?.steps.sort((a, b) => a.order - b.order) ?? []
  const totalSteps = steps.length
  const step = steps[currentStep]

  function authHeaders(): Record<string, string> {
    return useToken ? { 'x-portal-token': apiKey } : { 'x-api-key': apiKey }
  }

  const handleStepSubmit = useCallback((stepData: Record<string, unknown>) => {
    const merged = { ...formData, ...stepData }
    setFormData(merged)
    setError(null)

    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1)
    } else {
      submitAll(merged)
    }
  }, [formData, currentStep, totalSteps])

  async function submitAll(data: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onb-applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          flow_id: flow!.id,
          email: data.email_rep_legal,
          full_name: data.nombre_rep_legal,
          phone: data.telefono_rep_legal,
          data,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 429 || json.error === 'limit_reached') {
          setLimitReached(true)
          return
        }
        throw new Error(json.error ?? json.details?.[0]?.message ?? 'Error al enviar solicitud')
      }
      setResult({
        ok: true,
        applicant_id: json.applicant?.id ?? json.applicant_id,
        status: json.status ?? 'pending_review',
        failed_rules: json.failed_rules,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // Limit reached screen
  if (limitReached) return (
    <div style={{ minHeight: '100vh', background: '#FAFBFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Geist', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FFF7ED', border: '1.5px solid #FED7AA', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>Portal temporalmente pausado</h2>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>
          {lender.name} ha alcanzado el límite de solicitudes este mes. Por favor intenta el próximo mes.
        </p>
      </div>
    </div>
  )

  // No flow configured
  if (!flow || steps.length === 0) return (
    <div style={{ minHeight: '100vh', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Geist', system-ui, sans-serif" }}>
      <p style={{ color: '#94A3B8', fontSize: 14 }}>Portal sin flujo configurado.</p>
    </div>
  )

  // Success
  if (result) return (
    <SuccessScreen
      lender={lender}
      status={result.status ?? 'pending_review'}
      failedRules={result.failed_rules}
      data={formData}
    />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFBFC', fontFamily: "'Geist', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes slideIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
        .step-slide{animation:slideIn .3s cubic-bezier(.16,1,.3,1) both;}
      `}</style>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E8EDF5',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lender.logo_url ? (
            <img src={lender.logo_url} alt={lender.name} style={{ height: 28, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, color: primary, letterSpacing: '-0.02em' }}>{lender.name}</span>
          )}
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>
          Paso {currentStep + 1} de {totalSteps}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#E8EDF5' }}>
        <div style={{
          height: '100%', background: primary, borderRadius: '0 2px 2px 0',
          width: `${((currentStep + 1) / totalSteps) * 100}%`,
          transition: 'width .4s cubic-bezier(.16,1,.3,1)',
        }} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 120px' }}>
        {/* Step title */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {step.title}
          </h2>
          <p style={{ fontSize: 14, color: '#94A3B8' }}>
            Completa la información para continuar
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#9F1239', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01"/></svg>
            {error}
          </div>
        )}

        {/* Step form */}
        <div key={step.id} className="step-slide">
          <StepForm
            fields={step.fields}
            initialData={formData}
            primaryColor={primary}
            onSubmit={handleStepSubmit}
            loading={loading}
            showBack={currentStep > 0}
            onBack={() => { setCurrentStep(s => s - 1); setError(null); }}
            isLastStep={currentStep === totalSteps - 1}
          />
        </div>
      </div>
    </div>
  )
}
