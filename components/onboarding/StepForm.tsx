// components/onboarding/StepForm.tsx — Renderiza campos de un step del onboarding wizard
'use client'

import { useState } from 'react'
import { PATTERNS } from '@/lib/onboarding/validators'

type FieldDef = {
  id: string; label: string
  type: string
  required?: boolean; options?: unknown[]
  pattern?: string; min?: number; max?: number; maxLength?: number
}

type Props = {
  fields: FieldDef[]
  initialData: Record<string, unknown>
  primaryColor: string
  onSubmit: (data: Record<string, unknown>) => void
  loading: boolean
  showBack: boolean
  onBack: () => void
  isLastStep: boolean
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 })
}

function parseCurrency(s: string): number {
  return Number(s.replace(/[^0-9]/g, '')) || 0
}

export function StepForm({ fields, initialData, primaryColor, onSubmit, loading, showBack, onBack, isLastStep }: Props) {
  const [data, setData] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {}
    for (const f of fields) { init[f.id] = initialData[f.id] ?? '' }
    return init
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(id: string, val: unknown) {
    setData(d => ({ ...d, [id]: val }))
    setErrors(e => { const n = { ...e }; delete n[id]; return n })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      const v = data[f.id]
      const str = typeof v === 'string' ? v.trim() : ''

      if (f.required && (v === '' || v === null || v === undefined)) {
        errs[f.id] = `${f.label} es obligatorio`
        continue
      }
      if (!v && !f.required) continue

      if (f.pattern && str) {
        const pat = PATTERNS[f.pattern as keyof typeof PATTERNS]
        if (pat && !pat.test(str)) errs[f.id] = 'Formato inválido'
      }
      if (f.type === 'email' && str && !PATTERNS.email.test(str)) errs[f.id] = 'Email inválido'
      if (f.type === 'phone_mx' && str && !PATTERNS.phone_mx.test(str.replace(/\D/g, ''))) errs[f.id] = '10 dígitos requeridos'
      if (f.type === 'currency' && f.required) {
        const n = typeof v === 'number' ? v : parseCurrency(String(v))
        if (f.min !== undefined && n < f.min) errs[f.id] = `Mínimo ${formatCurrency(f.min)}`
        if (f.max !== undefined && n > f.max) errs[f.id] = `Máximo ${formatCurrency(f.max)}`
      }
      if (f.type === 'number' && typeof v === 'number') {
        if (f.min !== undefined && v < f.min) errs[f.id] = `Mínimo ${f.min}`
        if (f.max !== undefined && v > f.max) errs[f.id] = `Máximo ${f.max}`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const out: Record<string, unknown> = {}
    for (const f of fields) {
      const v = data[f.id]
      if (f.type === 'currency') out[f.id] = typeof v === 'number' ? v : parseCurrency(String(v))
      else if (f.type === 'number') out[f.id] = typeof v === 'number' ? v : Number(v) || null
      else out[f.id] = v
    }
    // Include _min fields for card_select (rule evaluation)
    for (const [k, v] of Object.entries(data)) {
      if (k.endsWith('_min')) out[k] = v
    }
    onSubmit(out)
  }

  const S = {
    field: { marginBottom: 20 } as React.CSSProperties,
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 } as React.CSSProperties,
    input: { width: '100%', height: 44, borderRadius: 8, border: '1.5px solid #E2E8F0', padding: '0 14px', fontSize: 14, fontFamily: "'Geist', system-ui, sans-serif", color: '#0F172A', background: '#fff', outline: 'none', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box' as const } as React.CSSProperties,
    select: { width: '100%', height: 44, borderRadius: 8, border: '1.5px solid #E2E8F0', padding: '0 12px', fontSize: 14, fontFamily: "'Geist', system-ui, sans-serif", color: '#0F172A', background: '#fff', outline: 'none', cursor: 'pointer', appearance: 'none' as const, boxSizing: 'border-box' as const } as React.CSSProperties,
    error: { fontSize: 12, color: '#EF4444', marginTop: 4 } as React.CSSProperties,
    chips: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 } as React.CSSProperties,
    chip: (active: boolean) => ({
      padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${active ? primaryColor : '#E2E8F0'}`,
      background: active ? `${primaryColor}0A` : '#fff', color: active ? primaryColor : '#64748B',
      fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all .15s',
      fontFamily: "'Geist', system-ui, sans-serif",
    }) as React.CSSProperties,
    card: (active: boolean) => ({
      padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${active ? primaryColor : '#E2E8F0'}`,
      background: active ? `${primaryColor}06` : '#fff', cursor: 'pointer', transition: 'all .15s',
    }) as React.CSSProperties,
  }

  function focusStyle(el: HTMLElement) { el.style.borderColor = primaryColor; el.style.boxShadow = `0 0 0 3px ${primaryColor}18`; }
  function blurStyle(el: HTMLElement, id: string) { el.style.borderColor = errors[id] ? '#EF4444' : '#E2E8F0'; el.style.boxShadow = 'none'; }

  return (
    <form onSubmit={handleSubmit}>
      {fields.map(f => (
        <div key={f.id} style={S.field}>
          <label style={S.label}>
            {f.label}
            {f.required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
          </label>

          {(f.type === 'text' || f.type === 'email') && (
            <input
              type={f.type === 'email' ? 'email' : 'text'}
              style={{ ...S.input, borderColor: errors[f.id] ? '#EF4444' : '#E2E8F0' }}
              value={String(data[f.id] ?? '')}
              onChange={e => set(f.id, e.target.value)}
              maxLength={f.maxLength}
              onFocus={e => focusStyle(e.currentTarget)}
              onBlur={e => blurStyle(e.currentTarget, f.id)}
            />
          )}

          {f.type === 'phone_mx' && (
            <input
              type="tel"
              style={{ ...S.input, borderColor: errors[f.id] ? '#EF4444' : '#E2E8F0' }}
              value={String(data[f.id] ?? '')}
              onChange={e => set(f.id, e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
              placeholder="5512345678"
              onFocus={e => focusStyle(e.currentTarget)}
              onBlur={e => blurStyle(e.currentTarget, f.id)}
            />
          )}

          {f.type === 'number' && (
            <input
              type="number"
              style={{ ...S.input, borderColor: errors[f.id] ? '#EF4444' : '#E2E8F0' }}
              value={data[f.id] === '' ? '' : String(data[f.id] ?? '')}
              onChange={e => set(f.id, e.target.value === '' ? '' : Number(e.target.value))}
              min={f.min}
              max={f.max}
              onFocus={e => focusStyle(e.currentTarget)}
              onBlur={e => blurStyle(e.currentTarget, f.id)}
            />
          )}

          {f.type === 'currency' && (
            <input
              type="text"
              inputMode="numeric"
              style={{ ...S.input, fontFamily: "'Geist Mono', monospace", borderColor: errors[f.id] ? '#EF4444' : '#E2E8F0' }}
              value={data[f.id] ? formatCurrency(typeof data[f.id] === 'number' ? data[f.id] as number : parseCurrency(String(data[f.id]))) : ''}
              onChange={e => { const n = parseCurrency(e.target.value); set(f.id, n || ''); }}
              placeholder="$0"
              onFocus={e => focusStyle(e.currentTarget)}
              onBlur={e => blurStyle(e.currentTarget, f.id)}
            />
          )}

          {f.type === 'select' && (
            <select
              style={{ ...S.select, borderColor: errors[f.id] ? '#EF4444' : '#E2E8F0' }}
              value={String(data[f.id] ?? '')}
              onChange={e => set(f.id, e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {(f.options as string[] ?? []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {f.type === 'chips' && (
            <div style={S.chips}>
              {(f.options as { value: unknown; label: string }[] ?? []).map(o => (
                <div key={String(o.value)} style={S.chip(data[f.id] === o.value)} onClick={() => set(f.id, o.value)}>
                  {o.label}
                </div>
              ))}
            </div>
          )}

          {f.type === 'card_select' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {(f.options as { value: string; label: string; min?: number }[] ?? []).map(o => (
                <div
                  key={o.value}
                  style={S.card(data[f.id] === o.value)}
                  onClick={() => setData(d => ({ ...d, [f.id]: o.value, [`${f.id}_min`]: o.min ?? 0 }))}
                >
                  <div style={{ fontSize: 13, fontWeight: data[f.id] === o.value ? 600 : 400, color: data[f.id] === o.value ? primaryColor : '#374151' }}>
                    {o.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors[f.id] && <div style={S.error}>{errors[f.id]}</div>}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 28, position: 'sticky', bottom: 20, background: '#FAFBFC', padding: '16px 0' }}>
        {showBack && (
          <button type="button" onClick={onBack} style={{
            height: 48, padding: '0 20px', borderRadius: 10, border: '1.5px solid #E2E8F0',
            background: '#fff', color: '#64748B', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: "'Geist', system-ui, sans-serif",
          }}>
            ← Atrás
          </button>
        )}
        <button type="submit" disabled={loading} style={{
          flex: 1, height: 48, borderRadius: 10, border: 'none',
          background: primaryColor, color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          fontFamily: "'Geist', system-ui, sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? 'Enviando...' : isLastStep ? 'Enviar solicitud' : 'Siguiente →'}
        </button>
      </div>
    </form>
  )
}
