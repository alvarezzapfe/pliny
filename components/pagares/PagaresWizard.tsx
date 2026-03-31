'use client'
import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { generarPagarePDF, CuotaAmortizacion, PagareData } from '@/lib/pagares/PagarePDF'

interface ClienteForm {
  nombre: string; curp: string; claveElector: string
  domicilio: string; fechaNac: string; sexo: string
}
interface CondicionesForm {
  monto: number; tasaMensual: number; plazoMeses: number
  metodoInteres: 'flat' | 'saldo'; fechaDisposicion: string; lugar: string
}
interface INEFiles {
  frente: File | null; reverso: File | null
  frentePreview: string; reversoPreview: string
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const STEPS = ['Cliente','INE / KYC','Condiciones','Amortización','Generar']

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcAmortizacion(monto: number, tasa: number, plazo: number, metodo: 'flat' | 'saldo', fechaBase: string): CuotaAmortizacion[] {
  const rows: CuotaAmortizacion[] = []
  let saldo = monto
  const capitalMensual = monto / plazo
  const base = new Date(fechaBase)
  for (let i = 1; i <= plazo; i++) {
    const interes = metodo === 'flat' ? monto * (tasa / 100) : saldo * (tasa / 100)
    const cuota = capitalMensual + interes
    const venc = new Date(base)
    venc.setMonth(venc.getMonth() + i)
    rows.push({ n: i, fecha: `${venc.getDate()} de ${MESES[venc.getMonth()]} de ${venc.getFullYear()}`, capital: capitalMensual, interes, cuota, saldo: Math.max(0, saldo - capitalMensual) })
    saldo -= capitalMensual
  }
  return rows
}

function fechaLegible(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1]} de ${y}`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${i < current ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white' : i === current ? 'bg-white border-[#1B3A6B] text-[#1B3A6B]' : 'bg-white border-gray-200 text-gray-400'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium whitespace-nowrap ${i === current ? 'text-[#1B3A6B]' : 'text-gray-400'}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-1 mt-[-12px] ${i < current ? 'bg-[#1B3A6B]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/30 focus:border-[#1B3A6B]"

export default function PagaresWizard({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClientComponentClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cliente, setCliente] = useState<ClienteForm>({ nombre: '', curp: '', claveElector: '', domicilio: '', fechaNac: '', sexo: '' })
  const [ine, setIne] = useState<INEFiles>({ frente: null, reverso: null, frentePreview: '', reversoPreview: '' })
  const today = new Date().toISOString().split('T')[0]
  const [condiciones, setCondiciones] = useState<CondicionesForm>({ monto: 10000, tasaMensual: 11, plazoMeses: 6, metodoInteres: 'flat', fechaDisposicion: today, lugar: 'Ciudad de México' })

  const tabla = calcAmortizacion(condiciones.monto, condiciones.tasaMensual, condiciones.plazoMeses, condiciones.metodoInteres, condiciones.fechaDisposicion)
  const totalIntereses = tabla.reduce((s, r) => s + r.interes, 0)
  const totalPagar = condiciones.monto + totalIntereses
  const cuotaMensual = tabla[0]?.cuota ?? 0
  const vencimiento = tabla[tabla.length - 1]?.fecha ?? ''
  const fechaLeg = fechaLegible(condiciones.fechaDisposicion)

  function handleINE(side: 'frente' | 'reverso', file: File | null) {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setIne(prev => side === 'frente' ? { ...prev, frente: file, frentePreview: preview } : { ...prev, reverso: file, reversoPreview: preview })
  }

  function DropZone({ side }: { side: 'frente' | 'reverso' }) {
    const ref = useRef<HTMLInputElement>(null)
    const preview = side === 'frente' ? ine.frentePreview : ine.reversoPreview
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{side === 'frente' ? 'Frente' : 'Reverso'}</p>
        <div onClick={() => ref.current?.click()} className={`border-2 border-dashed rounded-xl cursor-pointer flex items-center justify-center overflow-hidden ${preview ? 'border-[#1B3A6B]' : 'border-gray-200 hover:border-[#1B3A6B]/50'} transition-colors`} style={{ height: 160 }}>
          {preview ? <img src={preview} alt={side} className="w-full h-full object-cover" /> : (
            <div className="text-center p-4">
              <div className="text-3xl mb-2">📄</div>
              <p className="text-xs text-gray-400">Click para subir imagen del INE</p>
              <p className="text-xs text-gray-300 mt-1">JPG, PNG — máx 5MB</p>
            </div>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleINE(side, e.target.files?.[0] ?? null)} />
      </div>
    )
  }

  async function handleGenerar() {
    setLoading(true); setError('')
    try {
      const { data: folioData } = await supabase.rpc('generate_folio')
      const folio = folioData ?? `CR-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`
      let ineFrente64 = '', ineReverso64 = '', ineFrentePath = '', ineReversoPath = ''
      if (ine.frente) {
        ineFrente64 = await fileToBase64(ine.frente)
        const path = `${folio}/ine_frente.jpg`
        await supabase.storage.from('pagares-docs').upload(path, ine.frente, { upsert: true })
        ineFrentePath = path
      }
      if (ine.reverso) {
        ineReverso64 = await fileToBase64(ine.reverso)
        const path = `${folio}/ine_reverso.jpg`
        await supabase.storage.from('pagares-docs').upload(path, ine.reverso, { upsert: true })
        ineReversoPath = path
      }
      const pdfData: PagareData = {
        folio, fecha: fechaLeg, vencimiento, lugar: condiciones.lugar,
        clienteNombre: cliente.nombre.toUpperCase(), clienteCurp: cliente.curp.toUpperCase(),
        clienteClaveElector: cliente.claveElector.toUpperCase(), clienteDomicilio: cliente.domicilio.toUpperCase(),
        monto: condiciones.monto, tasaMensual: condiciones.tasaMensual, plazoMeses: condiciones.plazoMeses,
        metodoInteres: condiciones.metodoInteres, cuotaMensual, totalIntereses, totalPagar, tabla,
        ineFrente: ineFrente64 || undefined, ineReverso: ineReverso64 || undefined,
      }
      const pdfBlob = await generarPagarePDF(pdfData)
      const pdfFile = new File([pdfBlob], `${folio}.pdf`, { type: 'application/pdf' })
      const pdfPath = `${folio}/pagare.pdf`
      await supabase.storage.from('pagares-docs').upload(pdfPath, pdfFile, { upsert: true })
      const { error: dbErr } = await supabase.from('pagares').insert({
        folio, cliente_nombre: cliente.nombre.toUpperCase(), cliente_curp: cliente.curp.toUpperCase(),
        cliente_clave_elector: cliente.claveElector.toUpperCase(), cliente_domicilio: cliente.domicilio.toUpperCase(),
        cliente_fecha_nac: cliente.fechaNac || null, cliente_sexo: cliente.sexo || null,
        ine_frente_path: ineFrentePath || null, ine_reverso_path: ineReversoPath || null,
        monto: condiciones.monto, tasa_mensual: condiciones.tasaMensual, plazo_meses: condiciones.plazoMeses,
        metodo_interes: condiciones.metodoInteres, fecha_disposicion: condiciones.fechaDisposicion,
        lugar_firma: condiciones.lugar, tabla_amortizacion: tabla,
        total_capital: condiciones.monto, total_intereses: totalIntereses,
        total_pagar: totalPagar, cuota_mensual: cuotaMensual, status: 'activo', pdf_path: pdfPath,
      })
      if (dbErr) throw dbErr
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a'); a.href = url; a.download = `pagare_${folio}.pdf`; a.click()
      URL.revokeObjectURL(url)
      onSaved()
    } catch (e: any) {
      setError(e.message ?? 'Error al generar el pagaré')
    } finally {
      setLoading(false)
    }
  }

  function canNext() {
    if (step === 0) return cliente.nombre && cliente.curp && cliente.domicilio
    if (step === 2) return condiciones.monto > 0 && condiciones.tasaMensual > 0 && condiciones.plazoMeses > 0
    return true
  }

  function renderStep() {
    switch (step) {
      case 0: return (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Nombre completo" required><input className={inputCls} placeholder="COLIN ARRIAGA ANGELA" value={cliente.nombre} onChange={e => setCliente(p => ({ ...p, nombre: e.target.value.toUpperCase() }))} /></Field></div>
          <Field label="CURP" required><input className={inputCls} placeholder="COAA521002MMCLRN05" maxLength={18} value={cliente.curp} onChange={e => setCliente(p => ({ ...p, curp: e.target.value.toUpperCase() }))} /></Field>
          <Field label="Clave de Elector"><input className={inputCls} placeholder="CLARAN52100215M300" value={cliente.claveElector} onChange={e => setCliente(p => ({ ...p, claveElector: e.target.value.toUpperCase() }))} /></Field>
          <div className="col-span-2"><Field label="Domicilio completo" required><input className={inputCls} placeholder="C. MORELOS MZA 14 LT 4, COL. LA ERA 09720, IZTAPALAPA, CDMX" value={cliente.domicilio} onChange={e => setCliente(p => ({ ...p, domicilio: e.target.value.toUpperCase() }))} /></Field></div>
          <Field label="Fecha de nacimiento"><input type="date" className={inputCls} value={cliente.fechaNac} onChange={e => setCliente(p => ({ ...p, fechaNac: e.target.value }))} /></Field>
          <Field label="Sexo"><select className={inputCls} value={cliente.sexo} onChange={e => setCliente(p => ({ ...p, sexo: e.target.value }))}><option value="">— Seleccionar —</option><option value="M">Femenino (M)</option><option value="H">Masculino (H)</option></select></Field>
        </div>
      )
      case 1: return (
        <div>
          <p className="text-sm text-gray-500 mb-4">Sube las imágenes de la credencial INE del cliente. Opcional pero recomendado para el expediente.</p>
          <div className="grid grid-cols-2 gap-6"><DropZone side="frente" /><DropZone side="reverso" /></div>
        </div>
      )
      case 2: return (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto del crédito ($)" required><input type="number" className={inputCls} min={1000} step={1000} value={condiciones.monto} onChange={e => setCondiciones(p => ({ ...p, monto: Number(e.target.value) }))} /></Field>
          <Field label="Tasa mensual (%)" required><input type="number" className={inputCls} min={1} max={30} step={0.5} value={condiciones.tasaMensual} onChange={e => setCondiciones(p => ({ ...p, tasaMensual: Number(e.target.value) }))} /></Field>
          <Field label="Plazo (meses)" required><input type="number" className={inputCls} min={1} max={60} value={condiciones.plazoMeses} onChange={e => setCondiciones(p => ({ ...p, plazoMeses: Number(e.target.value) }))} /></Field>
          <Field label="Método de interés"><select className={inputCls} value={condiciones.metodoInteres} onChange={e => setCondiciones(p => ({ ...p, metodoInteres: e.target.value as 'flat' | 'saldo' }))}><option value="flat">Flat (sobre capital original)</option><option value="saldo">Sobre saldo insoluto</option></select></Field>
          <Field label="Fecha de disposición"><input type="date" className={inputCls} value={condiciones.fechaDisposicion} onChange={e => setCondiciones(p => ({ ...p, fechaDisposicion: e.target.value }))} /></Field>
          <Field label="Lugar de firma"><input className={inputCls} value={condiciones.lugar} onChange={e => setCondiciones(p => ({ ...p, lugar: e.target.value }))} /></Field>
          <div className="col-span-2 bg-[#EBF0FA] rounded-xl p-4 grid grid-cols-3 gap-4 mt-2">
            <div className="text-center"><p className="text-xs text-gray-500 mb-1">Cuota mensual</p><p className="text-lg font-bold text-[#1B3A6B]">${fmt(cuotaMensual)}</p></div>
            <div className="text-center"><p className="text-xs text-gray-500 mb-1">Total intereses</p><p className="text-lg font-bold text-orange-600">${fmt(totalIntereses)}</p></div>
            <div className="text-center"><p className="text-xs text-gray-500 mb-1">Total a pagar</p><p className="text-lg font-bold text-gray-800">${fmt(totalPagar)}</p></div>
          </div>
        </div>
      )
      case 3: return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">{condiciones.metodoInteres === 'flat' ? 'Cuota fija (Flat)' : 'Amortización sobre saldo'} — {condiciones.plazoMeses} pagos de <span className="text-[#1B3A6B] font-bold">${fmt(cuotaMensual)}</span></p>
            <span className="text-xs bg-[#EBF0FA] text-[#1B3A6B] font-semibold px-3 py-1 rounded-full">Tasa {condiciones.tasaMensual}% mensual</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#1B3A6B] text-white">{['#','Vencimiento','Capital','Interés','Cuota Total','Saldo'].map(h => <th key={h} className="px-3 py-2 text-right first:text-center font-semibold text-xs">{h}</th>)}</tr></thead>
              <tbody>{tabla.map((r, i) => (<tr key={r.n} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F7FA]'}><td className="px-3 py-2 text-center text-gray-500">{r.n}</td><td className="px-3 py-2 text-gray-600">{r.fecha}</td><td className="px-3 py-2 text-right">${fmt(r.capital)}</td><td className="px-3 py-2 text-right text-orange-600">${fmt(r.interes)}</td><td className="px-3 py-2 text-right font-bold text-[#1B3A6B]">${fmt(r.cuota)}</td><td className="px-3 py-2 text-right text-gray-400">${fmt(r.saldo)}</td></tr>))}</tbody>
              <tfoot><tr className="bg-[#EBF0FA] font-bold"><td colSpan={2} className="px-3 py-2 text-sm">TOTALES</td><td className="px-3 py-2 text-right">${fmt(condiciones.monto)}</td><td className="px-3 py-2 text-right text-orange-600">${fmt(totalIntereses)}</td><td className="px-3 py-2 text-right text-[#1B3A6B]">${fmt(totalPagar)}</td><td className="px-3 py-2 text-right">—</td></tr></tfoot>
            </table>
          </div>
        </div>
      )
      case 4: return (
        <div className="space-y-4">
          <div className="bg-[#EBF0FA] rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-[#1B3A6B] text-sm uppercase tracking-wide">Resumen del Pagaré</h3>
            {[['Cliente', cliente.nombre],['CURP', cliente.curp],['Domicilio', cliente.domicilio],['Monto', `$${fmt(condiciones.monto)} M.N.`],['Tasa', `${condiciones.tasaMensual}% mensual (${condiciones.metodoInteres})`],['Plazo', `${condiciones.plazoMeses} meses`],['Cuota mensual', `$${fmt(cuotaMensual)}`],['Total a pagar', `$${fmt(totalPagar)}`],['Fecha disposición', fechaLeg],['Vencimiento', vencimiento],['INE', ine.frente && ine.reverso ? '✓ Ambas caras' : ine.frente ? '✓ Solo frente' : '⚠ No cargada']].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm"><span className="text-gray-500 font-medium">{k}</span><span className="text-gray-800 font-semibold text-right max-w-xs">{v}</span></div>
            ))}
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}
          <button onClick={handleGenerar} disabled={loading} className="w-full bg-[#1B3A6B] hover:bg-[#14306B] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin">⏳</span> Generando pagaré...</> : <><span>📄</span> Guardar en Supabase y descargar PDF</>}
          </button>
          <p className="text-xs text-gray-400 text-center">El pagaré se guardará en tu base de datos y se descargará automáticamente.</p>
        </div>
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-[#1B3A6B] px-6 py-4 flex items-center justify-between">
          <div><h2 className="text-white font-bold text-lg">Nuevo Pagaré</h2><p className="text-blue-200 text-xs">Crédito Simple Personal</p></div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6"><StepBar current={step} />{renderStep()}</div>
        <div className="border-t border-gray-100 px-6 py-4 flex justify-between items-center">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">← Anterior</button>
          <span className="text-xs text-gray-400">Paso {step + 1} de {STEPS.length}</span>
          {step < STEPS.length - 1 && <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="px-5 py-2 bg-[#1B3A6B] hover:bg-[#14306B] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40">Siguiente →</button>}
        </div>
      </div>
    </div>
  )
}
