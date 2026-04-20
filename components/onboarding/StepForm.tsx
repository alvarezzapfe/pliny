'use client'

import { useState, useRef } from 'react'

type Field = {
  id: string; label: string
  type: 'text'|'email'|'phone'|'number'|'select'|'date'|'file'|'boolean'
  required: boolean; options?: string[]; accept?: string; maxSizeMB?: number
}
type Step = { id: string; title: string; order: number; fields: Field[] }
type Props = {
  step: Step; defaultValues: Record<string, unknown>
  primaryColor: string; secondaryColor: string
  loading: boolean; isLast: boolean
  onBack?: () => void
  onSubmit: (data: Record<string, unknown>, files: Record<string, File>) => void
}

// Campos que usan boxes visuales en lugar de dropdown
const BOX_FIELDS = ['facturacion']
// Campos que requieren validación RFC
const RFC_FIELDS = ['rfc']

function validateRFC(rfc: string): string | null {
  const r = rfc.trim().toUpperCase()
  if (!r) return null
  const moral  = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/
  const fisica = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}[0-9A]$/
  if (moral.test(r) || fisica.test(r)) return null
  if (r.length < 12) return `Faltan ${12 - r.length} caracteres`
  if (r.length > 13) return 'RFC demasiado largo'
  return 'Formato inválido — debe ser como XAXX010101000'
}

function fmtMonto(val: string): string {
  const num = val.replace(/[^0-9]/g, '')
  if (!num) return ''
  return parseInt(num).toLocaleString('es-MX')
}

export function StepForm({ step, defaultValues, primaryColor, secondaryColor, loading, isLast, onBack, onSubmit }: Props) {
  const [values, setValues]   = useState<Record<string, unknown>>({})
  const [files, setFiles]     = useState<Record<string, File>>({})
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [focused, setFocused] = useState<string|null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement|null>>({})

  function getValue(id: string): unknown {
    return values[id] ?? defaultValues[id] ?? ''
  }

  function setValue(id: string, val: unknown) {
    setValues(v => ({ ...v, [id]: val }))
    setErrors(e => ({ ...e, [id]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const f of step.fields) {
      if (f.type === 'file') {
        if (f.required && !files[f.id]) errs[f.id] = 'Requerido'
      } else if (f.type === 'boolean') {
        if (f.required && !getValue(f.id)) errs[f.id] = 'Debes aceptar para continuar'
      } else {
        const v = getValue(f.id)
        if (f.required && (!v || String(v).trim() === '')) {
          errs[f.id] = 'Este campo es requerido'
        }
        // RFC validation
        if (RFC_FIELDS.includes(f.id) && v) {
          const rfcErr = validateRFC(String(v))
          if (rfcErr) errs[f.id] = rfcErr
        }
        // Email validation
        if (f.type === 'email' && v) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) errs[f.id] = 'Correo inválido'
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const data: Record<string, unknown> = {}
    for (const f of step.fields) {
      if (f.type !== 'file') {
        let val = getValue(f.id)
        // Limpiar formato de monto
        if (f.type === 'number' && typeof val === 'string') {
          val = val.replace(/[^0-9.]/g, '')
        }
        data[f.id] = val
      }
    }
    onSubmit(data, files)
  }

  function fieldStyle(id: string, hasErr: boolean): React.CSSProperties {
    const isFocused = focused === id
    return {
      width: '100%', padding: '11px 14px', borderRadius: 10,
      fontSize: 14, outline: 'none', transition: 'all 0.15s',
      boxSizing: 'border-box' as const,
      border: hasErr ? '1.5px solid #FECACA' : isFocused ? `1.5px solid ${primaryColor}` : '1.5px solid rgba(0,0,0,0.09)',
      background: hasErr ? '#FFF8F8' : isFocused ? '#fff' : '#FAFAFA',
      color: '#0A0F1E',
      boxShadow: isFocused && !hasErr ? `0 0 0 3px ${primaryColor}14` : 'none',
    }
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#475569', marginBottom: 6, letterSpacing: '-0.01em',
  }

  return (
    <div style={{ padding: '28px 28px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {step.fields.map(field => {
          const hasErr = !!errors[field.id]
          const val = getValue(field.id)

          return (
            <div key={field.id}>
              {field.type !== 'boolean' && (
                <label style={{ ...lbl, color: hasErr ? '#B91C1C' : '#475569' }}>
                  {field.label}
                  {field.required && <span style={{ color: secondaryColor, marginLeft: 3 }}>*</span>}
                </label>
              )}

              {/* TEXT / EMAIL */}
              {(field.type === 'text' || field.type === 'email') && (
                <div style={{ position: 'relative' }}>
                  <input
                    type={field.type}
                    style={fieldStyle(field.id, hasErr)}
                    value={String(val)}
                    onChange={e => {
                      let v = e.target.value
                      if (RFC_FIELDS.includes(field.id)) v = v.toUpperCase().replace(/\s/g, '')
                      setValue(field.id, v)
                    }}
                    onFocus={() => setFocused(field.id)}
                    onBlur={() => {
                      setFocused(null)
                      // Validar RFC al salir
                      if (RFC_FIELDS.includes(field.id) && val) {
                        const err = validateRFC(String(val))
                        if (err) setErrors(e => ({ ...e, [field.id]: err }))
                      }
                    }}
                    placeholder={field.label}
                  />
                  {/* RFC indicator */}
                  {RFC_FIELDS.includes(field.id) && !!val && !hasErr && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
              )}

              {/* PHONE */}
              {field.type === 'phone' && (
                <input
                  type="tel"
                  style={fieldStyle(field.id, hasErr)}
                  value={String(val)}
                  onChange={e => setValue(field.id, e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                  onFocus={() => setFocused(field.id)}
                  onBlur={() => setFocused(null)}
                  placeholder="10 dígitos"
                />
              )}

              {/* NUMBER — con formato de miles */}
              {field.type === 'number' && (
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    style={{ ...fieldStyle(field.id, hasErr), paddingLeft: 28 }}
                    value={String(val)}
                    onChange={e => setValue(field.id, fmtMonto(e.target.value))}
                    onFocus={() => setFocused(field.id)}
                    onBlur={() => setFocused(null)}
                    placeholder="0"
                  />
                </div>
              )}

              {/* DATE */}
              {field.type === 'date' && (
                <input
                  type="date"
                  style={fieldStyle(field.id, hasErr)}
                  value={String(val)}
                  onChange={e => setValue(field.id, e.target.value)}
                  onFocus={() => setFocused(field.id)}
                  onBlur={() => setFocused(null)}
                />
              )}

              {/* SELECT — normal o boxes */}
              {field.type === 'select' && BOX_FIELDS.includes(field.id) ? (
                // BOXES para facturación
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {field.options?.map(opt => {
                    const selected = val === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setValue(field.id, opt)}
                        style={{
                          padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                          border: `1.5px solid ${selected ? primaryColor : hasErr ? '#FECACA' : '#E2E8F0'}`,
                          background: selected ? `${primaryColor}08` : hasErr ? '#FFF8F8' : '#FAFAFA',
                          textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${selected ? primaryColor : '#CBD5E1'}`,
                            background: selected ? primaryColor : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }}/>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? primaryColor : '#334155' }}>
                            {opt}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : field.type === 'select' ? (
                // SELECT normal
                <select
                  style={{ ...fieldStyle(field.id, hasErr), cursor: 'pointer', height: 44 }}
                  value={String(val)}
                  onChange={e => setValue(field.id, e.target.value)}
                  onFocus={() => setFocused(field.id)}
                  onBlur={() => setFocused(null)}
                >
                  <option value="">Selecciona una opción</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : null}

              {/* FILE */}
              {field.type === 'file' && (
                <>
                  <input
                    type="file"
                    accept={field.accept}
                    ref={el => { fileRefs.current[field.id] = el }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (field.maxSizeMB && f.size > field.maxSizeMB * 1024 * 1024) {
                        setErrors(er => ({ ...er, [field.id]: `Máx ${field.maxSizeMB}MB` }))
                        return
                      }
                      setFiles(prev => ({ ...prev, [field.id]: f }))
                      setErrors(er => ({ ...er, [field.id]: '' }))
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRefs.current[field.id]?.click()}
                    style={{
                      width: '100%', padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                      border: files[field.id] ? `1.5px solid ${secondaryColor}50` : hasErr ? '1.5px dashed #FECACA' : '1.5px dashed rgba(0,0,0,0.12)',
                      background: files[field.id] ? `${secondaryColor}08` : hasErr ? '#FFF8F8' : '#FAFAFA',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    {files[field.id] ? (
                      <>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${secondaryColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8l4 4 8-8" stroke={secondaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: secondaryColor }}>{files[field.id].name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>Toca para cambiar</span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v8M4 6l4-4 4 4M2 13h12" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}>Subir {field.label}</span>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)' }}>
                          {field.accept?.includes('image') ? 'PNG, JPG' : ''}{field.accept?.includes('pdf') ? ', PDF' : ''} · Máx {field.maxSizeMB ?? 5}MB
                        </span>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* BOOLEAN */}
              {field.type === 'boolean' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                  <div style={{ position: 'relative', marginTop: 1, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
                      checked={!!val}
                      onChange={e => setValue(field.id, e.target.checked)}
                    />
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      border: `1.5px solid ${!!val ? primaryColor : hasErr ? '#FECACA' : 'rgba(0,0,0,0.15)'}`,
                      background: !!val ? primaryColor : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {!!val && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: '#0A0F1E', lineHeight: 1.5 }}>
                    {field.label}
                    {field.required && <span style={{ color: secondaryColor, marginLeft: 3 }}>*</span>}
                  </span>
                </label>
              )}

              {/* Error */}
              {hasErr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="#EF4444" strokeWidth="1.2"/>
                    <path d="M6 4v3M6 8.5h.01" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 500 }}>{errors[field.id]}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        {onBack && (
          <button type="button" onClick={onBack} disabled={loading}
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 10,
              border: '1.5px solid rgba(0,0,0,0.09)', background: '#fff',
              fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.5)',
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
            Atrás
          </button>
        )}
        <button type="button" onClick={handleSubmit} disabled={loading}
          style={{
            flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
            background: loading ? 'rgba(0,0,0,0.1)' : primaryColor,
            fontSize: 13, fontWeight: 700, color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loading ? 'Guardando...' : isLast ? 'Enviar solicitud →' : 'Continuar →'}
        </button>
      </div>
    </div>
  )
}
