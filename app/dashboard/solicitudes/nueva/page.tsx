"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { crearClienteSiNuevo, crearSolicitud } from "@/lib/solicitudes";

// ── Icon helper ──────────────────────────────────────────────────────────────
function Ic({ d, s = 14, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
type TipoCredito = "Crédito simple" | "Crédito revolvente" | "Arrendamiento puro" | "Arrendamiento financiero";

interface FormData {
  clienteMode: "existente" | "nuevo";
  clienteId: string;
  empresa: string;
  rfc: string;
  sector: string;
  tipo: TipoCredito | "";
  monto: string;
  plazo: string;
  plazoUnidad: "meses" | "años";
  tasaReferencia: string;
  garantia: string;
  destino: string;
}

const TIPOS: { value: TipoCredito; icon: string; desc: string }[] = [
  { value: "Crédito simple",           icon: "M3 3h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zM2 6h12",  desc: "Préstamo a plazo fijo con amortización programada" },
  { value: "Crédito revolvente",       icon: "M13 8A5 5 0 103 8M13 8l-2-2M13 8l-2 2",                                        desc: "Línea de crédito reutilizable según necesidades" },
  { value: "Arrendamiento puro",       icon: "M2 5h12v8H2zM5 5V3a1 1 0 012 0v2M9 5V3a1 1 0 012 0v2",                        desc: "Uso del activo sin opción de compra al término" },
  { value: "Arrendamiento financiero", icon: "M2 5h12v8H2zM5 5V3a1 1 0 012 0v2M9 5V3a1 1 0 012 0v2M10 11l1.5 1.5",         desc: "Arrendamiento con opción de compra al vencimiento" },
];

const SECTORES = ["Manufactura", "Comercio", "Servicios", "Tecnología", "Construcción", "Agropecuario", "Transporte", "Salud", "Otro"];

const STEPS = ["Empresa", "Crédito", "Resumen"];

function fmtMonto(val: string) {
  const num = val.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("es-MX");
}

// ── Component ────────────────────────────────────────────────────────────────
export default function NuevaSolicitudPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    clienteMode: "existente",
    clienteId: "",
    empresa: "",
    rfc: "",
    sector: "",
    tipo: "",
    monto: "",
    plazo: "",
    plazoUnidad: "meses",
    tasaReferencia: "",
    garantia: "",
    destino: "",
  });
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientes, setClientes] = useState<{ id: string; empresa: string; rfc: string }[]>([]);

  // Cargar clientes reales de Supabase
  React.useEffect(() => {
    supabase
      .from("clients")
      .select("id, company_name, rfc")
      .order("company_name")
      .then(({ data }) => {
        if (data) setClientes(data.map(c => ({ id: c.id, empresa: c.company_name, rfc: c.rfc })));
      });
  }, []);

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filteredClients = clientes.filter(c =>
    c.empresa.toLowerCase().includes(search.toLowerCase()) ||
    c.rfc.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = clientes.find(c => c.id === form.clienteId);

  const step1Valid =
    form.clienteMode === "existente"
      ? !!form.clienteId
      : !!form.empresa && !!form.rfc && !!form.sector;

  const step2Valid = !!form.tipo && !!form.monto && !!form.plazo && !!form.destino;
  const canNext = step === 0 ? step1Valid : step === 1 ? step2Valid : true;

  const empresaLabel = form.clienteMode === "existente" ? selectedClient?.empresa || "—" : form.empresa || "—";
  const rfcLabel     = form.clienteMode === "existente" ? selectedClient?.rfc     || "—" : form.rfc     || "—";

  // ── SUBMIT ──
  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa.");

      let clientId = form.clienteId;

      if (form.clienteMode === "nuevo") {
        clientId = await crearClienteSiNuevo({
          empresa: form.empresa,
          rfc: form.rfc,
          sector: form.sector,
          ownerUserId: user.id,
        });
      }

      await crearSolicitud({
        client_id:       clientId,
        empresa_nombre:  form.clienteMode === "nuevo" ? form.empresa    : undefined,
        empresa_rfc:     form.clienteMode === "nuevo" ? form.rfc        : undefined,
        empresa_sector:  form.clienteMode === "nuevo" ? form.sector     : undefined,
        tipo:            form.tipo,
        monto:           Number(form.monto.replace(/,/g, "")),
        plazo_valor:     Number(form.plazo),
        plazo_unidad:    form.plazoUnidad,
        tasa_referencia: form.tasaReferencia,
        garantia:        form.garantia,
        destino:         form.destino,
      }, user.id);

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Error al guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <SuccessScreen empresa={empresaLabel} tipo={form.tipo} monto={form.monto} />;
  }

  return (
    <div style={{ fontFamily: "'Geist',sans-serif", color: "#0F172A", maxWidth: 780, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
        @keyframes checkPop{0%{transform:scale(0);}60%{transform:scale(1.2);}100%{transform:scale(1);}}
        .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
        .scale-in{animation:scaleIn .35s cubic-bezier(.16,1,.3,1) both;}
        .card{background:#fff;border:1px solid #E8EDF5;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
        .inp,.sel,.textarea{width:100%;height:40px;background:#F8FAFC;border:1px solid #E8EDF5;border-radius:10px;padding:0 14px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;transition:border-color .15s,box-shadow .15s,background .15s;appearance:none;}
        .textarea{height:80px;padding:10px 14px;resize:none;}
        .inp::placeholder,.textarea::placeholder{color:#94A3B8;}
        .inp:focus,.sel:focus,.textarea:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
        label.lbl{display:block;font-size:11px;font-weight:600;color:#475569;letter-spacing:.05em;text-transform:uppercase;margin-bottom:5px;}
        .tipo-card{border:1.5px solid #E8EDF5;border-radius:12px;padding:14px 16px;cursor:pointer;transition:all .15s;background:#fff;display:flex;align-items:flex-start;}
        .tipo-card:hover{border-color:#93B4F8;background:#F8FBFF;}
        .tipo-card.selected{border-color:#1B3F8A;background:#EFF6FF;box-shadow:0 0 0 3px rgba(91,141,239,.12);}
        .cli-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1.5px solid #E8EDF5;border-radius:11px;cursor:pointer;transition:all .14s;background:#fff;}
        .cli-row:hover{border-color:#93B4F8;background:#F8FBFF;}
        .cli-row.selected{border-color:#1B3F8A;background:#EFF6FF;}
        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:10px 22px;cursor:pointer;box-shadow:0 2px 12px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;letter-spacing:-.01em;}
        .btn-primary:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
        .btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1px solid #E8EDF5;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;padding:10px 18px;cursor:pointer;transition:all .14s;}
        .btn-ghost:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}
        .tab-btn{flex:1;padding:8px 0;border-radius:8px;border:none;cursor:pointer;font-family:'Geist',sans-serif;font-size:12px;font-weight:500;transition:all .15s;}
        .tab-btn.active{background:#0C1E4A;color:#fff;font-weight:700;}
        .tab-btn:not(.active){background:transparent;color:#64748B;}
        .mono{font-family:'Geist Mono',monospace;}
        .review-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F1F5F9;}
        .review-row:last-child{border-bottom:none;}
        .step-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;transition:all .25s;}
        .step-dot.done{background:#0C1E4A;color:#fff;}
        .step-dot.active{background:linear-gradient(135deg,#1B3F8A,#0C1E4A);color:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.18);}
        .step-dot.idle{background:#F1F5F9;color:#94A3B8;}
        .step-line{flex:1;height:1px;background:#E8EDF5;margin:0 6px;}
        .step-line.done{background:#0C1E4A;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinner{animation:spin .7s linear infinite;}
      `}</style>

      {/* HEADER */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <Link href="/dashboard/solicitudes" style={{ display:"flex", color:"#94A3B8", textDecoration:"none" }}>
              <Ic d="M10 3L4 8l6 5" s={15} c="#94A3B8" />
            </Link>
            <span style={{ fontSize:12, color:"#94A3B8" }}>Solicitudes</span>
            <span style={{ fontSize:12, color:"#CBD5E1" }}>/</span>
            <span style={{ fontSize:12, color:"#0F172A", fontWeight:600 }}>Nueva</span>
          </div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em" }}>Nueva solicitud</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>Completa los 3 pasos para enviar a revisión</div>
        </div>
      </div>

      {/* STEP INDICATOR */}
      <div className="fade" style={{ display:"flex", alignItems:"center", marginBottom:28, padding:"0 4px" }}>
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <div className={`step-dot ${i < step ? "done" : i === step ? "active" : "idle"}`}>
                {i < step ? <Ic d="M3 8l3.5 3.5L13 4" s={12} c="#fff" sw={2} /> : i + 1}
              </div>
              <span style={{ fontSize:10, fontWeight:i===step?700:500, color:i<=step?"#0C1E4A":"#94A3B8", letterSpacing:".04em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace" }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`step-line ${i < step ? "done" : ""}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* PANELS */}
      {step === 0 && <StepEmpresa form={form} set={set} search={search} setSearch={setSearch} filteredClients={filteredClients} selectedClient={selectedClient} />}
      {step === 1 && <StepCredito form={form} set={set} />}
      {step === 2 && <StepResumen form={form} empresaLabel={empresaLabel} rfcLabel={rfcLabel} />}

      {/* ERROR */}
      {error && (
        <div style={{ marginTop:12, padding:"10px 14px", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:10, fontSize:12, color:"#881337", display:"flex", gap:8, alignItems:"center" }}>
          <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v3M8 11h.01" c="#F43F5E" s={14} />
          {error}
        </div>
      )}

      {/* NAVIGATION */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:24 }}>
        {step > 0
          ? <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>
              <Ic d="M10 3L4 8l6 5" s={13} /> Atrás
            </button>
          : <Link href="/dashboard/solicitudes" className="btn-ghost" style={{ textDecoration:"none" }}>
              <Ic d="M10 3L4 8l6 5" s={13} /> Cancelar
            </Link>
        }
        {step < 2
          ? <button className="btn-primary" disabled={!canNext} onClick={() => setStep(s => s + 1)}>
              Continuar <Ic d="M6 3l6 5-6 5" s={13} c="#fff" />
            </button>
          : <button className="btn-primary" disabled={loading} onClick={handleSubmit}>
              {loading
                ? <><svg className="spinner" width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Guardando...</>
                : <><Ic d="M3 8l3.5 3.5L13 4" s={13} c="#fff" sw={2} /> Enviar solicitud</>
              }
            </button>
        }
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:"#F1F5F9", borderRadius:999, marginTop:20, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:999, background:"linear-gradient(90deg,#1B3F8A,#5B8DEF)", width:`${((step+1)/3)*100}%`, transition:"width .4s cubic-bezier(.16,1,.3,1)" }} />
      </div>
    </div>
  );
}

// ── STEP 1 ───────────────────────────────────────────────────────────────────
function StepEmpresa({ form, set, search, setSearch, filteredClients, selectedClient }: any) {
  return (
    <div className="card scale-in" style={{ padding:24 }}>
      <SectionTitle icon="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" title="Empresa solicitante" />
      <div style={{ display:"flex", background:"#F8FAFC", borderRadius:10, padding:3, marginBottom:22, border:"1px solid #E8EDF5" }}>
        <button className={`tab-btn ${form.clienteMode==="existente"?"active":""}`} onClick={() => set("clienteMode","existente")}>Cliente existente</button>
        <button className={`tab-btn ${form.clienteMode==="nuevo"?"active":""}`} onClick={() => set("clienteMode","nuevo")}>+ Nuevo cliente</button>
      </div>

      {form.clienteMode === "existente" ? (
        <>
          <div style={{ position:"relative", marginBottom:14 }}>
            <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#94A3B8" }}>
              <Ic d="M11 11l3 3M7 2a5 5 0 100 10A5 5 0 007 2z" s={13} />
            </div>
            <input className="inp" style={{ paddingLeft:36 }} placeholder="Buscar por nombre o RFC..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filteredClients.length === 0 && (
              <div style={{ textAlign:"center", padding:"28px 0", color:"#94A3B8", fontSize:13 }}>Sin resultados.</div>
            )}
            {filteredClients.map((c: any) => (
              <div key={c.id} className={`cli-row ${form.clienteId===c.id?"selected":""}`} onClick={() => set("clienteId", c.id)}>
                <div style={{ width:36, height:36, borderRadius:9, background:form.clienteId===c.id?"linear-gradient(135deg,#0C1E4A,#1B3F8A)":"#EEF2FF", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" s={16} c={form.clienteId===c.id?"#fff":"#5B8DEF"} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{c.empresa}</div>
                  <div className="mono" style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{c.rfc}</div>
                </div>
                {form.clienteId===c.id && (
                  <div style={{ width:20, height:20, borderRadius:"50%", background:"#0C1E4A", display:"grid", placeItems:"center" }}>
                    <Ic d="M4 8l2.5 2.5L12 5" s={12} c="#fff" sw={2} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label className="lbl">Razón social</label>
            <input className="inp" placeholder="Empresa SA de CV" value={form.empresa} onChange={e => set("empresa", e.target.value)} />
          </div>
          <div>
            <label className="lbl">RFC</label>
            <input className="inp mono" placeholder="XAXX010101000" value={form.rfc} onChange={e => set("rfc", e.target.value.toUpperCase())} maxLength={13} />
          </div>
          <div>
            <label className="lbl">Sector</label>
            <select className="sel" value={form.sector} onChange={e => set("sector", e.target.value)}>
              <option value="">Selecciona sector</option>
              {SECTORES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <InfoBox text="Al crear un nuevo cliente, se generará automáticamente su perfil en la plataforma." />
        </div>
      )}
    </div>
  );
}

// ── STEP 2 ───────────────────────────────────────────────────────────────────
function StepCredito({ form, set }: any) {
  return (
    <div className="card scale-in" style={{ padding:24 }}>
      <SectionTitle icon="M2 4h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1zM1 7h14" title="Tipo y condiciones del crédito" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:22 }}>
        {TIPOS.map(t => (
          <div key={t.value} className={`tipo-card ${form.tipo===t.value?"selected":""}`} onClick={() => set("tipo", t.value)} style={{ gap:12 }}>
            <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:form.tipo===t.value?"linear-gradient(135deg,#0C1E4A,#1B3F8A)":"#EEF2FF", display:"grid", placeItems:"center", transition:"all .15s" }}>
              <Ic d={t.icon} s={16} c={form.tipo===t.value?"#fff":"#5B8DEF"} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:form.tipo===t.value?"#0C1E4A":"#0F172A" }}>{t.value}</div>
              <div style={{ fontSize:11, color:"#94A3B8", marginTop:2, lineHeight:1.4 }}>{t.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <label className="lbl">Monto solicitado (MXN)</label>
          <div style={{ position:"relative" }}>
            <span className="mono" style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8" }}>$</span>
            <input className="inp mono" style={{ paddingLeft:26 }} placeholder="0" value={form.monto} onChange={e => set("monto", fmtMonto(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="lbl">Plazo</label>
          <div style={{ display:"flex", gap:6 }}>
            <input className="inp mono" placeholder="24" value={form.plazo} onChange={e => set("plazo", e.target.value.replace(/\D/g,""))} style={{ flex:1 }} maxLength={3} />
            <select className="sel" value={form.plazoUnidad} onChange={e => set("plazoUnidad", e.target.value)} style={{ width:84, flex:"none" }}>
              <option value="meses">meses</option>
              <option value="años">años</option>
            </select>
          </div>
        </div>
        <div>
          <label className="lbl">Tasa de referencia</label>
          <input className="inp mono" placeholder="TIIE + 3.5" value={form.tasaReferencia} onChange={e => set("tasaReferencia", e.target.value)} />
        </div>
        <div>
          <label className="lbl">Garantía</label>
          <input className="inp" placeholder="Hipotecaria, prendaria..." value={form.garantia} onChange={e => set("garantia", e.target.value)} />
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <label className="lbl">Destino del crédito <span style={{ color:"#F43F5E" }}>*</span></label>
          <textarea className="textarea" placeholder="Describe brevemente para qué se utilizarán los recursos..." value={form.destino} onChange={e => set("destino", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ── STEP 3 ───────────────────────────────────────────────────────────────────
function StepResumen({ form, empresaLabel, rfcLabel }: any) {
  const rows = [
    { section:"Empresa", items:[
      { k:"Razón social", v:empresaLabel },
      { k:"RFC", v:rfcLabel, mono:true },
    ]},
    { section:"Crédito", items:[
      { k:"Tipo",      v:form.tipo || "—" },
      { k:"Monto",     v:form.monto ? `$${form.monto} MXN` : "—", mono:true },
      { k:"Plazo",     v:form.plazo ? `${form.plazo} ${form.plazoUnidad}` : "—", mono:true },
      { k:"Tasa",      v:form.tasaReferencia || "—", mono:true },
      { k:"Garantía",  v:form.garantia || "—" },
      { k:"Destino",   v:form.destino || "—" },
    ]},
  ];
  return (
    <div className="scale-in" style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {rows.map(sec => (
        <div key={sec.section} className="card" style={{ padding:20 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", letterSpacing:".08em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace", marginBottom:14 }}>{sec.section}</div>
          {sec.items.map(row => (
            <div key={row.k} className="review-row">
              <span style={{ fontSize:12, color:"#64748B" }}>{row.k}</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#0F172A", fontFamily:row.mono?"'Geist Mono',monospace":"inherit", maxWidth:"55%", textAlign:"right" }}>{row.v}</span>
            </div>
          ))}
        </div>
      ))}
      <InfoBox text="Al enviar, la solicitud cambiará a estado 'En revisión'. Recibirás una notificación cuando se emita un fallo." />
    </div>
  );
}

// ── Success ───────────────────────────────────────────────────────────────────
function SuccessScreen({ empresa, tipo, monto }: { empresa: string; tipo: string; monto: string }) {
  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", minHeight:"60vh", display:"grid", placeItems:"center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes successRing{0%{transform:scale(0);opacity:0;}70%{transform:scale(1.08);}100%{transform:scale(1);opacity:1;}}
        @keyframes checkPop{0%{transform:scale(0);}60%{transform:scale(1.2);}100%{transform:scale(1);}}
        .fade{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.1s;}.d2{animation-delay:.2s;}.d3{animation-delay:.3s;}
        .ring{animation:successRing .5s cubic-bezier(.16,1,.3,1) both;}
        .check{animation:checkPop .4s cubic-bezier(.16,1,.3,1) .3s both;}
        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:10px 22px;cursor:pointer;text-decoration:none;box-shadow:0 2px 12px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;}
        .btn-primary:hover{opacity:.88;transform:translateY(-1px);}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1px solid #E8EDF5;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;padding:10px 18px;cursor:pointer;text-decoration:none;transition:all .14s;}
        .btn-ghost:hover{background:#F4F6FB;border-color:#C7D4F0;}
      `}</style>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <div className="ring" style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", display:"grid", placeItems:"center", margin:"0 auto 20px", boxShadow:"0 0 0 12px rgba(91,141,239,.12)" }}>
          <div className="check">
            <Ic d="M3 8l3.5 3.5L13 4" s={28} c="#fff" sw={2} />
          </div>
        </div>
        <div className="fade d1" style={{ fontSize:20, fontWeight:800, letterSpacing:"-.04em", marginBottom:8 }}>¡Solicitud enviada!</div>
        <div className="fade d2" style={{ fontSize:13, color:"#64748B", lineHeight:1.6, marginBottom:6 }}>
          <strong style={{ color:"#0F172A" }}>{empresa}</strong> ha sido registrada.<br />
          {tipo} por <span style={{ fontFamily:"'Geist Mono',monospace", fontWeight:600 }}>${monto} MXN</span> está en revisión.
        </div>
        <div className="fade d2" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:20, padding:"4px 12px", fontSize:11, color:"#92400E", marginBottom:24, fontFamily:"'Geist Mono',monospace", fontWeight:600 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#F59E0B", display:"inline-block" }} />
          En revisión
        </div>
        <div className="fade d3" style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <Link href="/dashboard/solicitudes/nueva" className="btn-ghost">Nueva solicitud</Link>
          <Link href="/dashboard/solicitudes" className="btn-primary">
            Ver solicitudes <Ic d="M6 3l6 5-6 5" s={13} c="#fff" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
      <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(12,30,74,.07),rgba(27,63,138,.12))", border:"1px solid rgba(91,141,239,.2)", display:"grid", placeItems:"center" }}>
        <Ic d={icon} s={15} c="#1B3F8A" />
      </div>
      <div style={{ fontSize:14, fontWeight:700, letterSpacing:"-.02em" }}>{title}</div>
    </div>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <div style={{ gridColumn:"1/-1", padding:"11px 14px", background:"rgba(91,141,239,.06)", border:"1px solid rgba(91,141,239,.18)", borderRadius:10, display:"flex", gap:10, alignItems:"flex-start" }}>
      <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v2.5M8 11h.01" c="#5B8DEF" s={14} />
      <span style={{ fontSize:12, color:"#475569", lineHeight:1.5 }}>{text}</span>
    </div>
  );
}
