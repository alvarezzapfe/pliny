'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PagaresWizard from '@/components/pagares/PagaresWizard'

interface Pagare {
  id: string; folio: string; created_at: string
  cliente_nombre: string; cliente_curp: string; cliente_clave_elector: string; cliente_domicilio: string
  cliente_fecha_nac: string | null; cliente_sexo: string | null
  monto: number; tasa_mensual: number; plazo_meses: number; metodo_interes: string
  cuota_mensual: number; total_intereses: number; total_pagar: number
  tabla_amortizacion: any[]; fecha_disposicion: string; lugar_firma: string
  status: string; pdf_path: string | null; ine_frente_path: string | null; ine_reverso_path: string | null
  tasa_iva?: number; total_iva?: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  borrador:  { label: 'Borrador',  color: 'bg-gray-100 text-gray-500' },
  activo:    { label: 'Activo',    color: 'bg-green-100 text-green-700' },
  liquidado: { label: 'Liquidado', color: 'bg-blue-100 text-blue-700' },
  vencido:   { label: 'Vencido',   color: 'bg-red-100 text-red-600' },
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fmt(n: number) { return (n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fechaLegible(iso: string) { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${parseInt(d)} de ${MESES[parseInt(m)-1]} de ${y}` }
const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 focus:border-[#1B3A6B]"
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>{children}</div>
}

function ExpandedRow({ p, onUpdated }: { p: Pagare; onUpdated: () => void }) {
  const [form, setForm] = useState({
    cliente_nombre: p.cliente_nombre, cliente_curp: p.cliente_curp,
    cliente_clave_elector: p.cliente_clave_elector ?? '', cliente_domicilio: p.cliente_domicilio,
    monto: p.monto, tasa_mensual: p.tasa_mensual, plazo_meses: p.plazo_meses,
    metodo_interes: p.metodo_interes, fecha_disposicion: p.fecha_disposicion,
    lugar_firma: p.lugar_firma, status: p.status, tasa_iva: p.tasa_iva ?? 16,
  })
  const [saving, setSaving] = useState(false)
  const [regen, setRegen] = useState(false)
  const [msg, setMsg] = useState('')

  function calcTabla(monto: number, tasa: number, plazo: number, metodo: string, fechaBase: string, tasaIva = 16) {
    const rows: any[] = []; let saldo = monto; const cap = monto / plazo; const base = new Date(fechaBase)
    for (let i = 1; i <= plazo; i++) {
      const interes = metodo === 'flat' ? monto * (tasa / 100) : saldo * (tasa / 100)
      const iva = interes * (tasaIva / 100)
      const cuota = cap + interes + iva; const venc = new Date(base); venc.setMonth(venc.getMonth() + i)
      rows.push({ n: i, fecha: `${venc.getDate()} de ${MESES[venc.getMonth()]} de ${venc.getFullYear()}`, capital: cap, interes, iva, cuota, saldo: Math.max(0, saldo - cap) })
      saldo -= cap
    }
    return rows
  }

  const tabla = calcTabla(form.monto, form.tasa_mensual, form.plazo_meses, form.metodo_interes, form.fecha_disposicion, form.tasa_iva)
  const totalIntereses = tabla.reduce((s, r) => s + r.interes, 0)
  const totalIva = tabla.reduce((s, r) => s + (r.iva ?? 0), 0)
  const totalPagar = form.monto + totalIntereses + totalIva
  const cuotaMensual = tabla[0]?.cuota ?? 0
  const vencimiento = tabla[tabla.length - 1]?.fecha ?? ''
  const fechaLeg = fechaLegible(form.fecha_disposicion)

  async function handleSave() {
    setSaving(true); setMsg('')
    try {
      const { error } = await supabase.from('pagares').update({
        cliente_nombre: form.cliente_nombre, cliente_curp: form.cliente_curp,
        cliente_clave_elector: form.cliente_clave_elector, cliente_domicilio: form.cliente_domicilio,
        monto: form.monto, tasa_mensual: form.tasa_mensual, plazo_meses: form.plazo_meses,
        metodo_interes: form.metodo_interes, fecha_disposicion: form.fecha_disposicion,
        lugar_firma: form.lugar_firma, status: form.status,
        tabla_amortizacion: tabla, total_capital: form.monto,
        total_intereses: totalIntereses, total_iva: totalIva, total_pagar: totalPagar,
        cuota_mensual: cuotaMensual, tasa_iva: form.tasa_iva,
      }).eq('id', p.id)
      if (error) throw error
      setMsg('✓ Guardado'); onUpdated()
    } catch (e: any) { setMsg('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function handleRegen() {
    setRegen(true); setMsg('')
    try {
      const payload = {
        folio: p.folio, fecha: fechaLeg, vencimiento, lugar: form.lugar_firma,
        clienteNombre: form.cliente_nombre, clienteCurp: form.cliente_curp,
        clienteClaveElector: form.cliente_clave_elector, clienteDomicilio: form.cliente_domicilio,
        monto: form.monto, tasaMensual: form.tasa_mensual, plazoMeses: form.plazo_meses,
        metodoInteres: form.metodo_interes, cuotaMensual, totalIntereses, totalIva, totalPagar, tabla,
        tasaIva: form.tasa_iva, fechaIso: form.fecha_disposicion,
      }
      const { generarPagarePDF } = await import('@/lib/pagares/PagarePDF')
      const pdfBlob = await generarPagarePDF(payload as any)
      await supabase.storage.from('pagares-docs').upload(`${p.folio}/pagare.pdf`, new File([pdfBlob], `${p.folio}.pdf`, { type: 'application/pdf' }), { upsert: true })
      const docxRes = await fetch('/api/pagares/docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!docxRes.ok) throw new Error('Error generando Word')
      const docxBlob = await docxRes.blob()
      await supabase.storage.from('pagares-docs').upload(`${p.folio}/pagare.docx`, new File([docxBlob], `${p.folio}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), { upsert: true })
      const dlPDF = document.createElement('a'); dlPDF.href = URL.createObjectURL(pdfBlob); dlPDF.download = `pagare_${p.folio}.pdf`; dlPDF.click()
      setTimeout(() => { const dl = document.createElement('a'); dl.href = URL.createObjectURL(docxBlob); dl.download = `pagare_${p.folio}.docx`; dl.click() }, 800)
      setMsg('✓ Regenerados y descargados'); onUpdated()
    } catch (e: any) { setMsg('Error: ' + e.message) } finally { setRegen(false) }
  }

  async function downloadDoc(type: 'pdf' | 'docx') {
    const path = type === 'pdf' ? p.pdf_path : p.pdf_path?.replace('.pdf', '.docx')
    if (!path) return
    const { data } = await supabase.storage.from('pagares-docs').createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <tr>
      <td colSpan={8} className="px-0 py-0 bg-[#F8FAFF] border-b border-[#1B3A6B]/10">
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-6 mb-5">
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#1B3A6B] uppercase tracking-wide border-b border-[#1B3A6B]/20 pb-1">Datos del Cliente</p>
              <Field label="Nombre"><input className={inputCls} value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value.toUpperCase() }))} /></Field>
              <Field label="CURP"><input className={inputCls} value={form.cliente_curp} onChange={e => setForm(f => ({ ...f, cliente_curp: e.target.value.toUpperCase() }))} /></Field>
              <Field label="Clave Elector"><input className={inputCls} value={form.cliente_clave_elector} onChange={e => setForm(f => ({ ...f, cliente_clave_elector: e.target.value.toUpperCase() }))} /></Field>
              <Field label="Domicilio"><input className={inputCls} value={form.cliente_domicilio} onChange={e => setForm(f => ({ ...f, cliente_domicilio: e.target.value.toUpperCase() }))} /></Field>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#1B3A6B] uppercase tracking-wide border-b border-[#1B3A6B]/20 pb-1">Condiciones</p>
              <Field label="Monto ($)"><input type="number" className={inputCls} value={form.monto} onChange={e => setForm(f => ({ ...f, monto: Number(e.target.value) }))} /></Field>
              <Field label="Tasa mensual (%)"><input type="number" className={inputCls} value={form.tasa_mensual} step={0.5} onChange={e => setForm(f => ({ ...f, tasa_mensual: Number(e.target.value) }))} /></Field>
              <Field label="Plazo (meses)"><input type="number" className={inputCls} value={form.plazo_meses} onChange={e => setForm(f => ({ ...f, plazo_meses: Number(e.target.value) }))} /></Field>
              <Field label="Método"><select className={inputCls} value={form.metodo_interes} onChange={e => setForm(f => ({ ...f, metodo_interes: e.target.value }))}><option value="flat">Flat</option><option value="saldo">Sobre saldo</option></select></Field>
              <Field label="Fecha disposición"><input type="date" className={inputCls} value={form.fecha_disposicion} onChange={e => setForm(f => ({ ...f, fecha_disposicion: e.target.value }))} /></Field>
              <Field label="Lugar"><input className={inputCls} value={form.lugar_firma} onChange={e => setForm(f => ({ ...f, lugar_firma: e.target.value }))} /></Field>
              <Field label="IVA sobre intereses (%)"><input type="number" className={inputCls} value={form.tasa_iva} step={1} onChange={e => setForm(f => ({ ...f, tasa_iva: Number(e.target.value) }))} /></Field>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#1B3A6B] uppercase tracking-wide border-b border-[#1B3A6B]/20 pb-1">Resumen</p>
              <div className="bg-[#EBF0FA] rounded-xl p-3 space-y-1.5">
                {[['Cuota mensual', `$${fmt(cuotaMensual)}`],['Total intereses', `$${fmt(totalIntereses)}`],['IVA (intereses)', `$${fmt(totalIva)}`],['Total a pagar', `$${fmt(totalPagar)}`],['Vencimiento', vencimiento]].map(([k,v]) => (
                  <div key={k} className="flex justify-between text-xs"><span className="text-gray-500">{k}</span><span className="font-semibold text-[#1B3A6B]">{v}</span></div>
                ))}
              </div>
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="borrador">Borrador</option><option value="activo">Activo</option><option value="liquidado">Liquidado</option><option value="vencido">Vencido</option>
                </select>
              </Field>
              <div className="flex gap-2 pt-1">
                <button onClick={() => downloadDoc('pdf')} className="flex-1 text-xs bg-white border border-[#1B3A6B]/30 text-[#1B3A6B] font-semibold py-1.5 rounded-lg hover:bg-[#EBF0FA] transition-colors">↓ PDF</button>
                <button onClick={() => downloadDoc('docx')} className="flex-1 text-xs bg-white border border-[#1B3A6B]/30 text-[#1B3A6B] font-semibold py-1.5 rounded-lg hover:bg-[#EBF0FA] transition-colors">↓ Word</button>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 text-xs bg-[#1B3A6B] text-white font-semibold py-2 rounded-lg hover:bg-[#14306B] disabled:opacity-40 transition-colors">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
                <button onClick={handleRegen} disabled={regen} className="flex-1 text-xs bg-orange-500 text-white font-semibold py-2 rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors">{regen ? 'Generando...' : '↻ Regenerar docs'}</button>
              </div>
              {msg && <p className={`text-xs font-medium ${msg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#1B3A6B] uppercase tracking-wide mb-2">Tabla de Amortización</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead><tr className="bg-[#1B3A6B] text-white">{['#','Vencimiento','Capital','Interés','IVA','Cuota','Saldo'].map(h => <th key={h} className="px-3 py-2 text-right first:text-center font-semibold">{h}</th>)}</tr></thead>
                <tbody>{tabla.map((r,i) => (<tr key={r.n} className={i%2===0?'bg-white':'bg-[#F5F7FA]'}><td className="px-3 py-1.5 text-center text-gray-500">{r.n}</td><td className="px-3 py-1.5 text-gray-600">{r.fecha}</td><td className="px-3 py-1.5 text-right">${fmt(r.capital)}</td><td className="px-3 py-1.5 text-right text-orange-600">${fmt(r.interes)}</td><td className="px-3 py-1.5 text-right text-purple-600">${fmt(r.iva ?? 0)}</td><td className="px-3 py-1.5 text-right font-bold text-[#1B3A6B]">${fmt(r.cuota)}</td><td className="px-3 py-1.5 text-right text-gray-400">${fmt(r.saldo)}</td></tr>))}</tbody>
                <tfoot><tr className="bg-[#EBF0FA] font-bold"><td colSpan={2} className="px-3 py-1.5">TOTALES</td><td className="px-3 py-1.5 text-right">${fmt(form.monto)}</td><td className="px-3 py-1.5 text-right text-orange-600">${fmt(totalIntereses)}</td><td className="px-3 py-1.5 text-right text-purple-600">${fmt(totalIva)}</td><td className="px-3 py-1.5 text-right text-[#1B3A6B]">${fmt(totalPagar)}</td><td className="px-3 py-1.5 text-right">—</td></tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function PagaresPage() {
  const [pagares, setPagares] = useState<Pagare[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'generador' | 'cartera'>('generador')

  async function fetchPagares() {
    setLoading(true)
    const { data } = await supabase.from('pagares').select('*').order('created_at', { ascending: false })
    setPagares(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPagares() }, [])

  const filtered = pagares.filter(p => {
    const matchSearch = p.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) || p.folio?.toLowerCase().includes(search.toLowerCase()) || p.cliente_curp?.toLowerCase().includes(search.toLowerCase())
    return matchSearch && (statusFilter === 'all' || p.status === statusFilter)
  })

  const totalMonto  = pagares.filter(p => p.status === 'activo').reduce((s,p) => s + (p.monto ?? 0), 0)
  const totalCuotas = pagares.filter(p => p.status === 'activo').reduce((s,p) => s + (p.cuota_mensual ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-2xl font-bold text-gray-900">Pagarés</h1><p className="text-sm text-gray-500 mt-0.5">Créditos simples personales</p></div>
          {activeTab === 'generador' && <button onClick={() => setShowWizard(true)} className="bg-[#1B3A6B] hover:bg-[#14306B] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"><span>+</span> Nuevo Pagaré</button>}
        </div>
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {([['generador','📄 Generador de Pagarés'],['cartera','📊 Cartera de Crédito']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === key ? 'border-[#1B3A6B] text-[#1B3A6B] bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>{label}</button>
          ))}
        </div>
        {activeTab === 'generador' && <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[{label:'Total pagarés',value:pagares.length,sub:'todos los estados'},{label:'Activos',value:pagares.filter(p=>p.status==='activo').length,sub:'en curso',accent:true},{label:'Cartera activa',value:`$${fmt(totalMonto)}`,sub:'capital vigente'},{label:'Flujo mensual',value:`$${fmt(totalCuotas)}`,sub:'cuotas mes actual'}].map(k => (
            <div key={k.label} className={`rounded-xl p-4 border ${k.accent ? 'bg-[#EBF0FA] border-[#1B3A6B]/20' : 'bg-white border-gray-100'}`}>
              <p className="text-xs text-gray-500 font-medium">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.accent ? 'text-[#1B3A6B]' : 'text-gray-800'}`}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mb-4">
          <input className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" placeholder="Buscar por nombre, folio o CURP..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Todos</option><option value="borrador">Borrador</option><option value="activo">Activo</option><option value="liquidado">Liquidado</option><option value="vencido">Vencido</option>
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Cargando pagarés...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400"><div className="text-4xl mb-3">📄</div><p className="text-sm font-medium">No hay pagarés{search ? ' que coincidan' : ' aún'}</p></div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">{['','Folio','Cliente','Monto','Tasa / Plazo','Cuota','Estado','Creado'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(p => {
                  const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.borrador
                  const isOpen = expanded === p.id
                  return (
                    <>
                      <tr key={p.id} onClick={() => setExpanded(isOpen ? null : p.id)} className={`cursor-pointer transition-colors border-b border-gray-50 ${isOpen ? 'bg-[#EBF0FA]' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-3 text-gray-400 text-xs">{isOpen ? '▼' : '▶'}</td>
                        <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-[#1B3A6B] bg-[#EBF0FA] px-2 py-0.5 rounded">{p.folio}</span></td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[160px] truncate">{p.cliente_nombre}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-800">${fmt(p.monto)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500"><span className="font-semibold">{p.tasa_mensual}%</span> / {p.plazo_meses} meses</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#1B3A6B]">${fmt(p.cuota_mensual)}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${st.color}`}>{st.label}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('es-MX')}</td>
                      </tr>
                      {isOpen && <ExpandedRow key={`${p.id}-exp`} p={p} onUpdated={fetchPagares} />}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        </> }
      </div>
        {activeTab === 'cartera' && (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[{label:'Total cartera',value:`$${fmt(pagares.filter(p=>p.status==='activo').reduce((s,p)=>s+(p.monto??0),0))}`,sub:'capital activo'},{label:'Pagarés activos',value:pagares.filter(p=>p.status==='activo').length,sub:'en curso'},{label:'Total intereses',value:`$${fmt(pagares.filter(p=>p.status==='activo').reduce((s,p)=>s+(p.total_intereses??0),0))}`,sub:'por cobrar'},{label:'Flujo mensual',value:`$${fmt(pagares.filter(p=>p.status==='activo').reduce((s,p)=>s+(p.cuota_mensual??0),0))}`,sub:'cuotas mes actual'}].map(k => (
                <div key={k.label} className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                  <p className="text-xl font-bold mt-1 text-[#1B3A6B]">{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-gray-100 bg-[#1B3A6B] text-white">{['Folio','Cliente','Monto','Intereses','IVA','Total a Pagar','Cuota','Status'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead>
                <tbody>
                  {pagares.map((p,i) => {
                    const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.borrador
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-gray-50'}`}>
                        <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-[#1B3A6B] bg-[#EBF0FA] px-2 py-0.5 rounded">{p.folio}</span></td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[140px] truncate">{p.cliente_nombre}</td>
                        <td className="px-4 py-3 text-sm font-bold">${fmt(p.monto)}</td>
                        <td className="px-4 py-3 text-sm text-orange-600">${fmt(p.total_intereses)}</td>
                        <td className="px-4 py-3 text-sm text-purple-600">${fmt((p as any).total_iva ?? 0)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-[#1B3A6B]">${fmt(p.total_pagar)}</td>
                        <td className="px-4 py-3 text-sm">${fmt(p.cuota_mensual)}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${st.color}`}>{st.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot><tr className="bg-[#EBF0FA] font-bold"><td colSpan={2} className="px-4 py-3 text-sm">TOTALES</td><td className="px-4 py-3 text-sm">${fmt(pagares.reduce((s,p)=>s+(p.monto??0),0))}</td><td className="px-4 py-3 text-sm text-orange-600">${fmt(pagares.reduce((s,p)=>s+(p.total_intereses??0),0))}</td><td className="px-4 py-3 text-sm text-purple-600">${fmt(pagares.reduce((s,p)=>s+((p as any).total_iva??0),0))}</td><td className="px-4 py-3 text-sm text-[#1B3A6B]">${fmt(pagares.reduce((s,p)=>s+(p.total_pagar??0),0))}</td><td colSpan={2} className="px-4 py-3">—</td></tr></tfoot>
              </table>
            </div>
          </div>
        )}
      {showWizard && <PagaresWizard onClose={() => setShowWizard(false)} onSaved={() => { setShowWizard(false); fetchPagares() }} />}
    </div>
  )
}
