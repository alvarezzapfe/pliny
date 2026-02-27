"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 14, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const TIPOS = [
  { value:"Crédito simple",          icon:"M3 3h10v10H3zM2 6h12", desc:"Préstamo a plazo fijo" },
  { value:"Crédito revolvente",      icon:"M13 8A5 5 0 103 8M13 8l-2-2M13 8l-2 2", desc:"Línea reutilizable" },
  { value:"Arrendamiento puro",      icon:"M2 5h12v8H2zM5 5V3a1 1 0 012 0v2M9 5V3a1 1 0 012 0v2", desc:"Sin opción de compra" },
  { value:"Arrendamiento financiero",icon:"M2 5h12v8H2zM5 5V3a1 1 0 012 0v2M9 5V3a1 1 0 012 0v2", desc:"Con opción de compra" },
];
const AMORTIZA = [
  { value:"SI",     label:"Amortiza",       desc:"Pagos periódicos de capital + interés" },
  { value:"BULLET", label:"Bullet",         desc:"Capital al vencimiento, solo intereses" },
  { value:"NO",     label:"Sin amortización",desc:"Solo intereses, sin pago de capital" },
];
const SECTORES = ["Manufactura","Comercio","Servicios","Tecnología","Construcción","Agropecuario","Transporte","Salud","Otro"];
const STEPS = ["Deudor","Crédito","Condiciones"];

function fmt(v: string) {
  const n = v.replace(/\D/g,"");
  return n ? Number(n).toLocaleString("es-MX") : "";
}

interface Form {
  clienteMode: "existente"|"nuevo";
  clienteId: string;
  deudor: string; rfc: string; sector: string;
  tipo: string; amortiza: string;
  monto_original: string; saldo_actual: string;
  tasa_anual: string; plazo_meses: string;
  garantia: string;
  fecha_inicio: string; fecha_vencimiento: string; ultimo_pago: string;
  dpd: string; estatus: string; notas: string;
}

export default function NuevoCreditoPage() {
  const [step, setStep]         = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [form, setForm]         = useState<Form>({
    clienteMode:"existente", clienteId:"", deudor:"", rfc:"", sector:"",
    tipo:"", amortiza:"SI",
    monto_original:"", saldo_actual:"",
    tasa_anual:"", plazo_meses:"",
    garantia:"",
    fecha_inicio:"", fecha_vencimiento:"", ultimo_pago:"",
    dpd:"0", estatus:"activo", notas:"",
  });

  useEffect(() => {
    supabase.from("clients").select("id, company_name, rfc").order("company_name")
      .then(({ data }) => { if (data) setClientes(data.map(c => ({ id:c.id, empresa:c.company_name, rfc:c.rfc }))); });
  }, []);

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const selectedClient = clientes.find(c => c.id === form.clienteId);
  const filteredClients = clientes.filter(c =>
    c.empresa.toLowerCase().includes(search.toLowerCase()) || c.rfc.toLowerCase().includes(search.toLowerCase())
  );

  const step0Valid = form.clienteMode === "existente"
    ? !!form.clienteId
    : !!form.deudor && !!form.rfc;
  const step1Valid = !!form.tipo && !!form.monto_original && !!form.plazo_meses;
  const step2Valid = !!form.fecha_inicio && !!form.estatus;
  const canNext = step===0 ? step0Valid : step===1 ? step1Valid : step2Valid;

  const deudorLabel = form.clienteMode === "existente" ? selectedClient?.empresa || "—" : form.deudor || "—";
  const rfcLabel    = form.clienteMode === "existente" ? selectedClient?.rfc      || "—" : form.rfc    || "—";

  async function handleSubmit() {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión activa");

      let clientId = form.clienteId;
      if (form.clienteMode === "nuevo" && form.deudor) {
        const { data, error: e } = await supabase.from("clients").insert({
          company_name: form.deudor,
          rfc: form.rfc.toUpperCase(),
          status: "active",
          owner_user_id: user.id,
        }).select("id").single();
        if (e) throw new Error(e.message);
        clientId = data.id;
      }

      const montoNum  = Number(form.monto_original.replace(/,/g,""));
      const saldoNum  = form.saldo_actual ? Number(form.saldo_actual.replace(/,/g,"")) : montoNum;

      const { error: e } = await supabase.from("credits").insert({
        created_by:     user.id,
        client_id:      clientId || null,
        deudor:         deudorLabel,
        rfc:            rfcLabel,
        tipo_credito:   form.tipo,
        monto_original: montoNum,
        saldo_actual:   saldoNum,
        tasa_anual:     form.tasa_anual ? Number(form.tasa_anual) : null,
        plazo_meses:    Number(form.plazo_meses),
        amortiza:       form.amortiza,
        garantia:       form.garantia,
        fecha_inicio:   form.fecha_inicio || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        ultimo_pago:    form.ultimo_pago || null,
        dpd:            Number(form.dpd) || 0,
        estatus:        form.estatus,
        notas:          form.notas,
      });
      if (e) throw new Error(e.message);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <SuccessScreen deudor={deudorLabel} tipo={form.tipo} monto={form.monto_original} />;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", maxWidth:780, margin:"0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
        .scale-in{animation:scaleIn .35s cubic-bezier(.16,1,.3,1) both;}
        .card{background:#fff;border:1px solid #E8EDF5;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
        .inp,.sel,.textarea{width:100%;height:40px;background:#F8FAFC;border:1px solid #E8EDF5;border-radius:10px;padding:0 14px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;transition:border-color .15s,box-shadow .15s,background .15s;appearance:none;}
        .textarea{height:72px;padding:10px 14px;resize:none;}
        .inp::placeholder,.textarea::placeholder{color:#94A3B8;}
        .inp:focus,.sel:focus,.textarea:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
        label.lbl{display:block;font-size:11px;font-weight:600;color:#475569;letter-spacing:.05em;text-transform:uppercase;margin-bottom:5px;}
        .tipo-card{border:1.5px solid #E8EDF5;border-radius:12px;padding:12px 14px;cursor:pointer;transition:all .15s;background:#fff;display:flex;align-items:flex-start;gap:10;}
        .tipo-card:hover{border-color:#93B4F8;background:#F8FBFF;}
        .tipo-card.selected{border-color:#1B3F8A;background:#EFF6FF;box-shadow:0 0 0 3px rgba(91,141,239,.12);}
        .cli-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1.5px solid #E8EDF5;border-radius:11px;cursor:pointer;transition:all .14s;background:#fff;}
        .cli-row:hover{border-color:#93B4F8;background:#F8FBFF;}
        .cli-row.selected{border-color:#1B3F8A;background:#EFF6FF;}
        .tab-btn{flex:1;padding:8px 0;border-radius:8px;border:none;cursor:pointer;font-family:'Geist',sans-serif;font-size:12px;font-weight:500;transition:all .15s;}
        .tab-btn.active{background:#0C1E4A;color:#fff;font-weight:700;}
        .tab-btn:not(.active){background:transparent;color:#64748B;}
        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:10px 22px;cursor:pointer;box-shadow:0 2px 12px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;}
        .btn-primary:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
        .btn-primary:disabled{opacity:.45;cursor:not-allowed;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1px solid #E8EDF5;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;padding:10px 18px;cursor:pointer;transition:all .14s;text-decoration:none;}
        .btn-ghost:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}
        .mono{font-family:'Geist Mono',monospace;}
        .step-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;transition:all .25s;}
        .step-dot.done{background:#0C1E4A;color:#fff;}
        .step-dot.active{background:linear-gradient(135deg,#1B3F8A,#0C1E4A);color:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.18);}
        .step-dot.idle{background:#F1F5F9;color:#94A3B8;}
        .step-line{flex:1;height:1px;background:#E8EDF5;margin:0 6px;}
        .step-line.done{background:#0C1E4A;}
        .review-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #F1F5F9;}
        .review-row:last-child{border-bottom:none;}
        .spinner{animation:spin .7s linear infinite;}
      `}</style>

      {/* HEADER */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <Link href="/dashboard/cartera" style={{ display:"flex", color:"#94A3B8", textDecoration:"none" }}>
              <Ic d="M10 3L4 8l6 5" s={15} c="#94A3B8" />
            </Link>
            <span style={{ fontSize:12, color:"#94A3B8" }}>Cartera</span>
            <span style={{ fontSize:12, color:"#CBD5E1" }}>/</span>
            <span style={{ fontSize:12, color:"#0F172A", fontWeight:600 }}>Nuevo crédito</span>
          </div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em" }}>Nuevo crédito</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>Registra un crédito en 3 pasos</div>
        </div>
      </div>

      {/* STEPS */}
      <div className="fade" style={{ display:"flex", alignItems:"center", marginBottom:28, padding:"0 4px" }}>
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <div className={`step-dot ${i < step ? "done" : i === step ? "active" : "idle"}`}>
                {i < step ? <Ic d="M3 8l3.5 3.5L13 4" s={12} c="#fff" sw={2}/> : i+1}
              </div>
              <span style={{ fontSize:10, fontWeight:i===step?700:500, color:i<=step?"#0C1E4A":"#94A3B8", letterSpacing:".04em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace" }}>{label}</span>
            </div>
            {i < STEPS.length-1 && <div className={`step-line ${i < step ? "done" : ""}`}/>}
          </React.Fragment>
        ))}
      </div>

      {/* PANELS */}
      {step === 0 && <Step0Deudor form={form} set={set} search={search} setSearch={setSearch} filteredClients={filteredClients} selectedClient={selectedClient} />}
      {step === 1 && <Step1Credito form={form} set={set} />}
      {step === 2 && <Step2Condiciones form={form} set={set} deudorLabel={deudorLabel} rfcLabel={rfcLabel} />}

      {error && (
        <div style={{ marginTop:12, padding:"10px 14px", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:10, fontSize:12, color:"#881337", display:"flex", gap:8 }}>
          <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v3M8 11h.01" c="#F43F5E" s={14}/> {error}
        </div>
      )}

      {/* NAV */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", marginTop:24 }}>
        {step > 0
          ? <button className="btn-ghost" onClick={() => setStep(s=>s-1)}><Ic d="M10 3L4 8l6 5" s={13}/> Atrás</button>
          : <Link href="/dashboard/cartera" className="btn-ghost"><Ic d="M10 3L4 8l6 5" s={13}/> Cancelar</Link>
        }
        {step < 2
          ? <button className="btn-primary" disabled={!canNext} onClick={() => setStep(s=>s+1)}>
              Continuar <Ic d="M6 3l6 5-6 5" s={13} c="#fff"/>
            </button>
          : <button className="btn-primary" disabled={loading} onClick={handleSubmit}>
              {loading
                ? <><svg className="spinner" width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Guardando...</>
                : <><Ic d="M3 8l3.5 3.5L13 4" s={13} c="#fff" sw={2}/> Registrar crédito</>
              }
            </button>
        }
      </div>

      <div style={{ height:3, background:"#F1F5F9", borderRadius:999, marginTop:20, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:999, background:"linear-gradient(90deg,#1B3F8A,#5B8DEF)", width:`${((step+1)/3)*100}%`, transition:"width .4s cubic-bezier(.16,1,.3,1)" }}/>
      </div>
    </div>
  );
}

function Step0Deudor({ form, set, search, setSearch, filteredClients, selectedClient }: any) {
  return (
    <div className="card scale-in" style={{ padding:24 }}>
      <SectionTitle icon="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" title="Deudor / Empresa" />
      <div style={{ display:"flex", background:"#F8FAFC", borderRadius:10, padding:3, marginBottom:20, border:"1px solid #E8EDF5" }}>
        <button className={`tab-btn ${form.clienteMode==="existente"?"active":""}`} onClick={() => set("clienteMode","existente")}>Cliente existente</button>
        <button className={`tab-btn ${form.clienteMode==="nuevo"?"active":""}`} onClick={() => set("clienteMode","nuevo")}>+ Nuevo cliente</button>
      </div>
      {form.clienteMode === "existente" ? (
        <>
          <div style={{ position:"relative", marginBottom:12 }}>
            <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#94A3B8" }}>
              <Ic d="M11 11l3 3M7 2a5 5 0 100 10A5 5 0 007 2z" s={13}/>
            </div>
            <input className="inp" style={{ paddingLeft:36 }} placeholder="Buscar por nombre o RFC..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filteredClients.length === 0 && <div style={{ textAlign:"center", padding:"24px 0", color:"#94A3B8", fontSize:13 }}>Sin resultados.</div>}
            {filteredClients.map((c: any) => (
              <div key={c.id} className={`cli-row ${form.clienteId===c.id?"selected":""}`} onClick={() => set("clienteId", c.id)}>
                <div style={{ width:34, height:34, borderRadius:9, background:form.clienteId===c.id?"linear-gradient(135deg,#0C1E4A,#1B3F8A)":"#EEF2FF", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" s={15} c={form.clienteId===c.id?"#fff":"#5B8DEF"}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c.empresa}</div>
                  <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{c.rfc}</div>
                </div>
                {form.clienteId===c.id && <div style={{ width:18, height:18, borderRadius:"50%", background:"#0C1E4A", display:"grid", placeItems:"center" }}><Ic d="M4 8l2.5 2.5L12 5" s={11} c="#fff" sw={2}/></div>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label className="lbl">Razón social</label>
            <input className="inp" placeholder="Empresa SA de CV" value={form.deudor} onChange={e => set("deudor", e.target.value)}/>
          </div>
          <div>
            <label className="lbl">RFC</label>
            <input className="inp mono" placeholder="XAXX010101000" value={form.rfc} onChange={e => set("rfc", e.target.value.toUpperCase())} maxLength={13}/>
          </div>
          <div>
            <label className="lbl">Sector</label>
            <select className="sel" value={form.sector} onChange={e => set("sector", e.target.value)}>
              <option value="">Selecciona sector</option>
              {["Manufactura","Comercio","Servicios","Tecnología","Construcción","Agropecuario","Transporte","Salud","Otro"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function Step1Credito({ form, set }: any) {
  return (
    <div className="card scale-in" style={{ padding:24 }}>
      <SectionTitle icon="M2 4h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1zM1 7h14" title="Tipo de crédito" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
        {TIPOS.map(t => (
          <div key={t.value} className={`tipo-card ${form.tipo===t.value?"selected":""}`} onClick={() => set("tipo",t.value)}>
            <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:form.tipo===t.value?"linear-gradient(135deg,#0C1E4A,#1B3F8A)":"#EEF2FF", display:"grid", placeItems:"center" }}>
              <Ic d={t.icon} s={15} c={form.tipo===t.value?"#fff":"#5B8DEF"}/>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:form.tipo===t.value?"#0C1E4A":"#0F172A" }}>{t.value}</div>
              <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{t.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle icon="M8 2v12M3 7l5-5 5 5" title="Amortización" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:20 }}>
        {AMORTIZA.map(a => (
          <div key={a.value} className={`tipo-card ${form.amortiza===a.value?"selected":""}`} onClick={() => set("amortiza",a.value)} style={{ flexDirection:"column", gap:4 }}>
            <div style={{ fontSize:13, fontWeight:700, color:form.amortiza===a.value?"#0C1E4A":"#0F172A" }}>{a.label}</div>
            <div style={{ fontSize:11, color:"#94A3B8", lineHeight:1.4 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <label className="lbl">Monto original (MXN) *</label>
          <div style={{ position:"relative" }}>
            <span className="mono" style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8" }}>$</span>
            <input className="inp mono" style={{ paddingLeft:26 }} placeholder="0" value={form.monto_original} onChange={e => set("monto_original", fmt(e.target.value))}/>
          </div>
        </div>
        <div>
          <label className="lbl">Saldo actual (MXN)</label>
          <div style={{ position:"relative" }}>
            <span className="mono" style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8" }}>$</span>
            <input className="inp mono" style={{ paddingLeft:26 }} placeholder="Igual al monto original" value={form.saldo_actual} onChange={e => set("saldo_actual", fmt(e.target.value))}/>
          </div>
        </div>
        <div>
          <label className="lbl">Tasa anual (%)</label>
          <input className="inp mono" placeholder="12.5" value={form.tasa_anual} onChange={e => set("tasa_anual", e.target.value)}/>
        </div>
        <div>
          <label className="lbl">Plazo (meses) *</label>
          <input className="inp mono" placeholder="36" value={form.plazo_meses} onChange={e => set("plazo_meses", e.target.value.replace(/\D/g,""))} maxLength={3}/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <label className="lbl">Garantía</label>
          <input className="inp" placeholder="Hipotecaria, prendaria, aval..." value={form.garantia} onChange={e => set("garantia", e.target.value)}/>
        </div>
      </div>
    </div>
  );
}

function Step2Condiciones({ form, set, deudorLabel, rfcLabel }: any) {
  const reviewRows = [
    { section:"Deudor", items:[{ k:"Empresa", v:deudorLabel },{ k:"RFC", v:rfcLabel, mono:true }]},
    { section:"Crédito", items:[
      { k:"Tipo",     v:form.tipo||"—" },
      { k:"Amortiza", v:form.amortiza },
      { k:"Monto",    v:form.monto_original ? `$${form.monto_original} MXN` : "—", mono:true },
      { k:"Plazo",    v:form.plazo_meses ? `${form.plazo_meses} meses` : "—", mono:true },
      { k:"Tasa",     v:form.tasa_anual ? `${form.tasa_anual}%` : "—", mono:true },
    ]},
  ];
  return (
    <div className="scale-in" style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="card" style={{ padding:24 }}>
        <SectionTitle icon="M2 5h12v8H2zM2 8h12" title="Fechas y seguimiento" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <label className="lbl">Fecha inicio *</label>
            <input className="inp" type="date" value={form.fecha_inicio} onChange={e => set("fecha_inicio", e.target.value)}/>
          </div>
          <div>
            <label className="lbl">Fecha vencimiento</label>
            <input className="inp" type="date" value={form.fecha_vencimiento} onChange={e => set("fecha_vencimiento", e.target.value)}/>
          </div>
          <div>
            <label className="lbl">Último pago</label>
            <input className="inp" type="date" value={form.ultimo_pago} onChange={e => set("ultimo_pago", e.target.value)}/>
          </div>
          <div>
            <label className="lbl">DPD (días de mora)</label>
            <input className="inp mono" placeholder="0" value={form.dpd} onChange={e => set("dpd", e.target.value.replace(/\D/g,""))}/>
          </div>
          <div>
            <label className="lbl">Estatus *</label>
            <select className="sel" value={form.estatus} onChange={e => set("estatus", e.target.value)}>
              <option value="activo">Activo</option>
              <option value="mora">Mora</option>
              <option value="liquidado">Liquidado</option>
              <option value="reestructurado">Reestructurado</option>
            </select>
          </div>
          <div>
            <label className="lbl">Notas</label>
            <input className="inp" placeholder="Observaciones opcionales" value={form.notas} onChange={e => set("notas", e.target.value)}/>
          </div>
        </div>
      </div>

      {/* Review */}
      {reviewRows.map(sec => (
        <div key={sec.section} className="card" style={{ padding:18 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", letterSpacing:".08em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace", marginBottom:12 }}>{sec.section}</div>
          {sec.items.map(row => (
            <div key={row.k} className="review-row">
              <span style={{ fontSize:12, color:"#64748B" }}>{row.k}</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#0F172A", fontFamily:row.mono?"'Geist Mono',monospace":"inherit" }}>{row.v}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SuccessScreen({ deudor, tipo, monto }: { deudor: string; tipo: string; monto: string }) {
  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", minHeight:"60vh", display:"grid", placeItems:"center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes ring{0%{transform:scale(0);opacity:0;}70%{transform:scale(1.08);}100%{transform:scale(1);opacity:1;}}
        @keyframes check{0%{transform:scale(0);}60%{transform:scale(1.2);}100%{transform:scale(1);}}
        .fade{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.1s;}.d2{animation-delay:.2s;}.d3{animation-delay:.3s;}
        .ring{animation:ring .5s cubic-bezier(.16,1,.3,1) both;}
        .chk{animation:check .4s cubic-bezier(.16,1,.3,1) .3s both;}
        .btn-p{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:10px 20px;cursor:pointer;text-decoration:none;box-shadow:0 2px 12px rgba(12,30,74,.22);}
        .btn-g{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1px solid #E8EDF5;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;padding:10px 16px;cursor:pointer;text-decoration:none;}
      `}</style>
      <div style={{ textAlign:"center", maxWidth:380 }}>
        <div className="ring" style={{ width:68, height:68, borderRadius:"50%", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", display:"grid", placeItems:"center", margin:"0 auto 20px", boxShadow:"0 0 0 12px rgba(91,141,239,.12)" }}>
          <div className="chk"><Ic d="M3 8l3.5 3.5L13 4" s={26} c="#fff" sw={2}/></div>
        </div>
        <div className="fade d1" style={{ fontSize:20, fontWeight:800, letterSpacing:"-.04em", marginBottom:8 }}>¡Crédito registrado!</div>
        <div className="fade d2" style={{ fontSize:13, color:"#64748B", lineHeight:1.6, marginBottom:20 }}>
          <strong style={{ color:"#0F172A" }}>{deudor}</strong> — {tipo}<br/>
          <span style={{ fontFamily:"'Geist Mono',monospace", fontWeight:600 }}>${monto} MXN</span> agregado a la cartera.
        </div>
        <div className="fade d3" style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <Link href="/dashboard/cartera/nuevo" className="btn-g">Otro crédito</Link>
          <Link href="/dashboard/cartera" className="btn-p">Ver cartera <Ic d="M6 3l6 5-6 5" s={13} c="#fff"/></Link>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
      <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,rgba(12,30,74,.07),rgba(27,63,138,.12))", border:"1px solid rgba(91,141,239,.2)", display:"grid", placeItems:"center" }}>
        <Ic d={icon} s={14} c="#1B3F8A"/>
      </div>
      <div style={{ fontSize:13, fontWeight:700, letterSpacing:"-.02em" }}>{title}</div>
    </div>
  );
}
