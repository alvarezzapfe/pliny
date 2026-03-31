'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import PagaresWizard from '@/components/pagares/PagaresWizard'

interface Pagare {
  id: string; folio: string; created_at: string; cliente_nombre: string
  cliente_curp: string; monto: number; tasa_mensual: number; plazo_meses: number
  cuota_mensual: number; total_pagar: number; status: string; pdf_path: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  borrador:  { label: 'Borrador',  color: 'bg-gray-100 text-gray-500' },
  activo:    { label: 'Activo',    color: 'bg-green-100 text-green-700' },
  liquidado: { label: 'Liquidado', color: 'bg-blue-100 text-blue-700' },
  vencido:   { label: 'Vencido',   color: 'bg-red-100 text-red-600' },
}

function fmt(n: number) {
  return n?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'
}

export default function PagaresPage() {
  const supabase = createClientComponentClient()
  const [pagares, setPagares] = useState<Pagare[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  async function fetchPagares() {
    setLoading(true)
    const { data } = await supabase.from('pagares')
      .select('id,folio,created_at,cliente_nombre,cliente_curp,monto,tasa_mensual,plazo_meses,cuota_mensual,total_pagar,status,pdf_path')
      .order('created_at', { ascending: false })
    setPagares(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPagares() }, [])

  async function downloadPDF(p: Pagare) {
    if (!p.pdf_path) return
    const { data } = await supabase.storage.from('pagares-docs').createSignedUrl(p.pdf_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('pagares').update({ status }).eq('id', id)
    fetchPagares()
  }

  const filtered = pagares.filter(p => {
    const matchSearch = p.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) || p.folio?.toLowerCase().includes(search.toLowerCase()) || p.cliente_curp?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalMonto = pagares.filter(p => p.status === 'activo').reduce((s, p) => s + (p.monto ?? 0), 0)
  const totalCuotas = pagares.filter(p => p.status === 'activo').reduce((s, p) => s + (p.cuota_mensual ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">Pagarés</h1><p className="text-sm text-gray-500 mt-0.5">Créditos simples personales</p></div>
          <button onClick={() => setShowWizard(true)} className="bg-[#1B3A6B] hover:bg-[#14306B] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
            <span className="text-base">+</span> Nuevo Pagaré
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total pagarés', value: pagares.length, sub: 'todos los estados' },
            { label: 'Activos', value: pagares.filter(p => p.status === 'activo').length, sub: 'en curso', accent: true },
            { label: 'Cartera activa', value: `$${fmt(totalMonto)}`, sub: 'capital vigente' },
            { label: 'Flujo mensual', value: `$${fmt(totalCuotas)}`, sub: 'cuotas mes actual' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl p-4 border ${k.accent ? 'bg-[#EBF0FA] border-[#1B3A6B]/20' : 'bg-white border-gray-100'}`}>
              <p className="text-xs text-gray-500 font-medium">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.accent ? 'text-[#1B3A6B]' : 'text-gray-800'}`}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <input className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" placeholder="Buscar por nombre, folio o CURP..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="activo">Activo</option>
            <option value="liquidado">Liquidado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Cargando pagarés...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm font-medium">No hay pagarés{search ? ' que coincidan' : ' aún'}</p>
              {!search && <p className="text-xs mt-1">Crea el primero con el botón "Nuevo Pagaré"</p>}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Folio','Cliente','CURP','Monto','Tasa / Plazo','Cuota','Estado','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.borrador
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-[#1B3A6B] bg-[#EBF0FA] px-2 py-0.5 rounded">{p.folio}</span></td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[160px] truncate">{p.cliente_nombre}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.cliente_curp}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">${fmt(p.monto)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500"><span className="font-semibold">{p.tasa_mensual}%</span> / {p.plazo_meses} meses</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#1B3A6B]">${fmt(p.cuota_mensual)}</td>
                      <td className="px-4 py-3">
                        <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)} className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${st.color}`}>
                          <option value="borrador">Borrador</option>
                          <option value="activo">Activo</option>
                          <option value="liquidado">Liquidado</option>
                          <option value="vencido">Vencido</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {p.pdf_path && <button onClick={() => downloadPDF(p)} className="text-xs text-[#1B3A6B] hover:underline font-medium">↓ PDF</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showWizard && <PagaresWizard onClose={() => setShowWizard(false)} onSaved={() => { setShowWizard(false); fetchPagares() }} />}
    </div>
  )
}
