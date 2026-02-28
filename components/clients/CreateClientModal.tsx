"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 14, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const SECTORES = ["Manufactura","Comercio","Servicios","Tecnología","Construcción","Agropecuario","Transporte","Salud","Energía","Inmobiliario","Educación","Turismo","Otro"];
const REGIMENES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "605 - Sueldos y Salarios",
  "606 - Arrendamiento",
  "612 - Personas Físicas con Actividades Empresariales",
  "616 - Sin Obligaciones Fiscales",
  "620 - Sociedades Cooperativas de Producción",
  "621 - Incorporación Fiscal",
  "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza",
];
const ESTADOS_MX = ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco","México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"];
const TIPOS_SOCIEDAD = ["S.A. de C.V.","S.A.P.I. de C.V.","S. de R.L. de C.V.","S.A.","A.C.","S.C.","SAPI","SOFOM E.N.R.","SOFOM E.R.","Persona Física","Otro"];
const CARGOS = ["Director General","Director de Finanzas","Director Jurídico","Apoderado Legal","Representante Legal","Administrador Único","Socio","Otro"];
const COUNTRIES = [
  { dial:"+52", flag:"🇲🇽", name:"México" },
  { dial:"+1",  flag:"🇺🇸", name:"EE.UU." },
  { dial:"+34", flag:"🇪🇸", name:"España" },
  { dial:"+57", flag:"🇨🇴", name:"Colombia" },
];

const STEPS = ["Empresa","Contacto","Dirección","Confirmar"];

function onlyDigits(v: string) { return (v||"").replace(/[^\d]/g,""); }
function normalizeRFC(v: string) { return (v||"").trim().toUpperCase().replace(/\s+/g,""); }
function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||"").trim()); }
function validateRFC(v: string) { const r = normalizeRFC(v); return r.length >= 10 && r.length <= 13; }
function isUniqueErr(msg: string) { return msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique") || msg.includes("23505"); }

type Form = {
  // Empresa
  company_name: string; rfc: string; tipo_sociedad: string;
  sector: string; anio_constitucion: string; num_empleados: string;
  sitio_web: string;
  // Contacto
  rep_nombre: string; rep_apellido_p: string; rep_apellido_m: string;
  rep_cargo: string; rep_email: string; rep_email2: string;
  rep_phone_country: string; rep_phone: string;
  // Dirección
  calle: string; num_ext: string; num_int: string;
  colonia: string; cp: string; municipio: string; estado: string;
  regimen_fiscal: string; notas: string;
};

const EMPTY: Form = {
  company_name:"", rfc:"", tipo_sociedad:"S.A. de C.V.", sector:"",
  anio_constitucion:"", num_empleados:"", sitio_web:"",
  rep_nombre:"", rep_apellido_p:"", rep_apellido_m:"", rep_cargo:"Representante Legal",
  rep_email:"", rep_email2:"", rep_phone_country:"+52", rep_phone:"",
  calle:"", num_ext:"", num_int:"", colonia:"", cp:"", municipio:"", estado:"Ciudad de México",
  regimen_fiscal:"601 - General de Ley Personas Morales", notas:"",
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function CreateClientWizard({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof Form, v: string) => { setError(""); setForm(f => ({ ...f, [k]: v })); };

  const rfcNorm = useMemo(() => normalizeRFC(form.rfc), [form.rfc]);
  const phoneE164 = useMemo(() => {
    const n = onlyDigits(form.rep_phone).slice(0,10);
    return n ? `${form.rep_phone_country}${n}` : "";
  }, [form.rep_phone, form.rep_phone_country]);

  // Completitud
  const completePct = useMemo(() => {
    let s = 0;
    if (form.company_name.trim()) s += 15;
    if (validateRFC(form.rfc))   s += 15;
    if (form.sector)             s += 5;
    if (form.tipo_sociedad)      s += 5;
    if (form.rep_nombre.trim())  s += 15;
    if (isEmail(form.rep_email)) s += 15;
    if (onlyDigits(form.rep_phone).length === 10) s += 10;
    if (form.calle.trim())       s += 10;
    if (form.cp.length === 5)    s += 10;
    return s;
  }, [form]);

  // Validation per step
  const step0Valid = form.company_name.trim().length >= 2 && validateRFC(form.rfc);
  const step1Valid = form.rep_nombre.trim().length >= 2 && form.rep_apellido_p.trim().length >= 2 && isEmail(form.rep_email);
  const step2Valid = true; // optional step
  const canNext = step===0?step0Valid : step===1?step1Valid : step===2?step2Valid : true;

  function handleClose() {
    setStep(0); setForm(EMPTY); setError(""); onClose();
  }

  async function handleSubmit() {
    setLoading(true); setError("");
    let createdId: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sin sesión");

      const { data: client, error: e1 } = await supabase
        .from("clients")
        .insert([{
          owner_user_id: auth.user.id,
          company_name:  form.company_name.trim(),
          rfc:           rfcNorm,
          status:        "Onboarding",
        }])
        .select("id").single();
      if (e1) throw e1;
      createdId = client.id;

      const { error: e2 } = await supabase.from("client_connectors").insert([{
        client_id: createdId, owner_user_id: auth.user.id,
        buro_status: "not_connected", sat_status: "not_connected", buro_score: null,
      }]);
      if (e2) throw e2;

      const { error: e3 } = await supabase.from("client_profiles").insert([{
        client_id:     createdId,
        owner_user_id: auth.user.id,
        contact_name:  [form.rep_nombre, form.rep_apellido_p, form.rep_apellido_m].filter(Boolean).join(" "),
        contact_email: form.rep_email.trim().toLowerCase() || null,
        contact_phone: phoneE164 || null,
        billing_email: form.rep_email2.trim().toLowerCase() || null,
        website:       form.sitio_web.trim() || null,
        address:       [form.calle, form.num_ext, form.colonia, form.municipio, form.estado, form.cp].filter(Boolean).join(", ") || null,
        notes:         form.notas.trim() || null,
        // Extended fields stored in notes as JSON supplement
      }]);
      if (e3) throw e3;

      handleClose();
      onCreated();
    } catch (err: any) {
      // Rollback
      if (createdId) {
        await supabase.from("client_profiles").delete().eq("client_id", createdId);
        await supabase.from("client_connectors").delete().eq("client_id", createdId);
        await supabase.from("clients").delete().eq("id", createdId);
      }
      const msg = String(err?.message ?? "Error");
      setError(isUniqueErr(msg) ? "Ese RFC ya está registrado en tus clientes." : msg);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"grid", placeItems:"center", background:"rgba(2,6,23,.55)", backdropFilter:"blur(4px)", padding:16, fontFamily:"'Geist',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.98);}to{opacity:1;transform:scale(1);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .wiz-enter{animation:slideUp .4s cubic-bezier(.16,1,.3,1) both;}
        .panel-enter{animation:scaleIn .3s cubic-bezier(.16,1,.3,1) both;}
        .spinner{animation:spin .7s linear infinite;}
        .w-inp{width:100%;height:40px;background:#F8FAFC;border:1.5px solid #E8EDF5;border-radius:10px;padding:0 13px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;transition:all .14s;}
        .w-inp::placeholder{color:#94A3B8;}
        .w-inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
        .w-inp.err{border-color:#F43F5E;background:#FFF8F8;}
        .w-sel{width:100%;height:40px;background:#F8FAFC;border:1.5px solid #E8EDF5;border-radius:10px;padding:0 13px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;appearance:none;cursor:pointer;transition:all .14s;}
        .w-sel:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
        .w-ta{width:100%;min-height:72px;background:#F8FAFC;border:1.5px solid #E8EDF5;border-radius:10px;padding:10px 13px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;resize:none;transition:all .14s;}
        .w-ta:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
        label.wlbl{display:block;font-size:10px;font-weight:700;color:#64748B;letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px;}
        .mono{font-family:'Geist Mono',monospace;}
        .step-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;transition:all .25s;flex-shrink:0;}
        .step-dot.done{background:#0C1E4A;color:#fff;}
        .step-dot.active{background:linear-gradient(135deg,#1B3F8A,#0C1E4A);color:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.18);}
        .step-dot.idle{background:#F1F5F9;color:#94A3B8;}
        .step-line{flex:1;height:1px;margin:0 6px;transition:background .25s;}
        .step-line.done{background:#0C1E4A;} .step-line.idle{background:#E8EDF5;}
        .review-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #F1F5F9;gap:12px;}
        .review-row:last-child{border-bottom:none;}
        .btn-p{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:700;padding:10px 22px;cursor:pointer;box-shadow:0 3px 12px rgba(12,30,74,.22);transition:all .14s;}
        .btn-p:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
        .btn-p:disabled{opacity:.45;cursor:not-allowed;}
        .btn-g{display:inline-flex;align-items:center;gap:6px;background:#F8FAFC;color:#475569;border:1px solid #E8EDF5;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:10px 18px;cursor:pointer;transition:all .14s;}
        .btn-g:hover{background:#F1F5F9;color:#0F172A;}
        .field-hint{font-size:11px;color:#94A3B8;margin-top:4px;}
        .badge-ok{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:#F0FDF9;color:#065F46;border:1px solid #D1FAE5;}
        .badge-warn{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;}
      `}</style>

      <div className="wiz-enter" style={{ width:"100%", maxWidth:640, background:"#fff", borderRadius:20, boxShadow:"0 24px 60px rgba(2,6,23,.18)", overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"92vh" }}>

        {/* ── HEADER ── */}
        <div style={{ background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", padding:"20px 24px", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"#fff", letterSpacing:"-.03em" }}>Alta de cliente</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginTop:3 }}>Expediente digital completo</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {/* Completitud */}
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:3 }}>Completitud</div>
                <div style={{ fontSize:20, fontWeight:800, color: completePct >= 70 ? "#00E5A0" : completePct >= 40 ? "#F59E0B" : "#fff" }}>{completePct}%</div>
              </div>
              <button onClick={handleClose} style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,.12)", border:"none", cursor:"pointer", display:"grid", placeItems:"center", color:"#fff" }}>
                <Ic d="M4 4l8 8M12 4l-8 8" s={14} c="#fff"/>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height:3, background:"rgba(255,255,255,.15)", borderRadius:999, marginTop:14, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"#00E5A0", borderRadius:999, width:`${((step+1)/4)*100}%`, transition:"width .4s cubic-bezier(.16,1,.3,1)" }}/>
          </div>

          {/* Steps */}
          <div style={{ display:"flex", alignItems:"center", marginTop:16 }}>
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div className={`step-dot ${i<step?"done":i===step?"active":"idle"}`}
                    style={{ cursor:i<step?"pointer":"default", background:i<step?"rgba(255,255,255,.9)":i===step?"#fff":undefined, color:i<step?"#0C1E4A":i===step?"#0C1E4A":"rgba(255,255,255,.3)" }}
                    onClick={() => i < step && setStep(i)}>
                    {i < step ? <Ic d="M3 8l3.5 3.5L13 4" s={12} c="#0C1E4A" sw={2}/> : i+1}
                  </div>
                  <span style={{ fontSize:9, fontWeight:i===step?700:500, color:i<=step?"rgba(255,255,255,.9)":"rgba(255,255,255,.35)", letterSpacing:".05em", textTransform:"uppercase", whiteSpace:"nowrap", fontFamily:"'Geist Mono',monospace" }}>{label}</span>
                </div>
                {i < STEPS.length-1 && <div style={{ flex:1, height:1, margin:"0 6px 14px", background:i<step?"rgba(255,255,255,.5)":"rgba(255,255,255,.15)", transition:"background .25s" }}/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ overflowY:"auto", flex:1, padding:"20px 24px" }}>
          <div key={step} className="panel-enter">
            {step === 0 && <PanelEmpresa form={form} set={set} rfcNorm={rfcNorm} />}
            {step === 1 && <PanelContacto form={form} set={set} phoneE164={phoneE164} />}
            {step === 2 && <PanelDireccion form={form} set={set} />}
            {step === 3 && <PanelResumen form={form} rfcNorm={rfcNorm} phoneE164={phoneE164} completePct={completePct} />}
          </div>

          {error && (
            <div style={{ marginTop:14, padding:"10px 14px", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:10, fontSize:12, color:"#881337", display:"flex", gap:8 }}>
              <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v4M8 11h.01" c="#F43F5E" s={14}/> {error}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #E8EDF5", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, background:"#FAFBFF" }}>
          {step > 0
            ? <button className="btn-g" onClick={() => setStep(s=>s-1)}><Ic d="M10 3L4 8l6 5" s={13}/> Atrás</button>
            : <button className="btn-g" onClick={handleClose}>Cancelar</button>
          }
          {step < 3
            ? <button className="btn-p" disabled={!canNext} onClick={() => setStep(s=>s+1)}>
                Continuar <Ic d="M6 3l6 5-6 5" s={13} c="#fff"/>
              </button>
            : <button className="btn-p" disabled={loading} onClick={handleSubmit}>
                {loading
                  ? <><svg className="spinner" width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Creando...</>
                  : <><Ic d="M3 8l3.5 3.5L13 4" s={13} c="#fff" sw={2}/> Crear cliente</>
                }
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Panel 0: Empresa ─────────────────────────────────────────────────────────
function PanelEmpresa({ form, set, rfcNorm }: { form: Form; set: any; rfcNorm: string }) {
  const rfcOk = rfcNorm.length >= 10;
  const rfcPM = rfcNorm.length === 12;
  const rfcPF = rfcNorm.length === 13;
  return (
    <div>
      <SectionHead icon="M2 5h12a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1zM1 8h14" title="Datos de la empresa" sub="Información fiscal y societaria del acreditado"/>
      <div style={{ display:"grid", gap:14 }}>
        <div>
          <label className="wlbl">Razón social *</label>
          <input className="w-inp" placeholder="Ej. ACME Soluciones S.A. de C.V." value={form.company_name} onChange={e => set("company_name", e.target.value)}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label className="wlbl">Tipo de sociedad</label>
            <select className="w-sel" value={form.tipo_sociedad} onChange={e => set("tipo_sociedad", e.target.value)}>
              {TIPOS_SOCIEDAD.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="wlbl">Sector / Industria</label>
            <select className="w-sel" value={form.sector} onChange={e => set("sector", e.target.value)}>
              <option value="">Selecciona sector</option>
              {SECTORES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="wlbl">RFC *</label>
          <input className={`w-inp mono ${form.rfc && !validateRFC(form.rfc) ? "err" : ""}`}
            placeholder="XAXX010101000" value={form.rfc} onChange={e => set("rfc", e.target.value.toUpperCase())} maxLength={13}/>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:5 }}>
            {rfcOk
              ? <span className="badge-ok"><Ic d="M3 8l3.5 3.5L13 4" s={10} c="#065F46" sw={2}/>{rfcPM ? "Persona Moral (12)" : rfcPF ? "Persona Física (13)" : "Válido"}</span>
              : form.rfc ? <span className="badge-warn">⚠ RFC incompleto</span> : null
            }
            {rfcNorm && <span className="mono" style={{ fontSize:11, color:"#94A3B8" }}>{rfcNorm}</span>}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label className="wlbl">Año de constitución</label>
            <input className="w-inp mono" placeholder="2018" value={form.anio_constitucion} onChange={e => set("anio_constitucion", onlyDigits(e.target.value).slice(0,4))} maxLength={4}/>
          </div>
          <div>
            <label className="wlbl">Núm. empleados aprox.</label>
            <select className="w-sel" value={form.num_empleados} onChange={e => set("num_empleados", e.target.value)}>
              <option value="">Selecciona rango</option>
              {["1–10","11–50","51–200","201–500","501–1000","1000+"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="wlbl">Sitio web</label>
          <input className="w-inp" placeholder="https://empresa.com.mx" value={form.sitio_web} onChange={e => set("sitio_web", e.target.value)}/>
        </div>
        <InfoBox icon="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v2.5M8 11h.01" text="El RFC se valida automáticamente. 12 caracteres = Persona Moral. 13 = Persona Física. Requerido para Buró de Crédito y SAT." />
      </div>
    </div>
  );
}

// ── Panel 1: Contacto ────────────────────────────────────────────────────────
function PanelContacto({ form, set, phoneE164 }: { form: Form; set: any; phoneE164: string }) {
  const emailOk = form.rep_email ? isEmail(form.rep_email) : true;
  const phoneOk = form.rep_phone ? onlyDigits(form.rep_phone).length === 10 : true;
  return (
    <div>
      <SectionHead icon="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" title="Representante de contacto" sub="Persona responsable del proceso de crédito"/>
      <div style={{ display:"grid", gap:14 }}>
        <div>
          <label className="wlbl">Nombre(s) *</label>
          <input className="w-inp" placeholder="Ej. María Fernanda" value={form.rep_nombre} onChange={e => set("rep_nombre", e.target.value)}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label className="wlbl">Apellido paterno *</label>
            <input className="w-inp" placeholder="García" value={form.rep_apellido_p} onChange={e => set("rep_apellido_p", e.target.value)}/>
          </div>
          <div>
            <label className="wlbl">Apellido materno</label>
            <input className="w-inp" placeholder="López" value={form.rep_apellido_m} onChange={e => set("rep_apellido_m", e.target.value)}/>
          </div>
        </div>
        <div>
          <label className="wlbl">Cargo / Función</label>
          <select className="w-sel" value={form.rep_cargo} onChange={e => set("rep_cargo", e.target.value)}>
            {CARGOS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="wlbl">Correo principal *</label>
          <input className={`w-inp ${form.rep_email && !emailOk ? "err" : ""}`} type="email" placeholder="contacto@empresa.com" value={form.rep_email} onChange={e => set("rep_email", e.target.value)}/>
          {form.rep_email && !emailOk && <div className="field-hint" style={{ color:"#F43F5E" }}>Correo inválido</div>}
        </div>
        <div>
          <label className="wlbl">Correo alterno / facturación</label>
          <input className="w-inp" type="email" placeholder="facturas@empresa.com (opcional)" value={form.rep_email2} onChange={e => set("rep_email2", e.target.value)}/>
        </div>
        <div>
          <label className="wlbl">Teléfono celular</label>
          <div style={{ display:"flex", gap:8 }}>
            <select className="w-sel" value={form.rep_phone_country} onChange={e => set("rep_phone_country", e.target.value)} style={{ width:150, flexShrink:0 }}>
              {COUNTRIES.map(c => <option key={c.dial+c.name} value={c.dial}>{c.flag} {c.name} ({c.dial})</option>)}
            </select>
            <input className={`w-inp mono ${form.rep_phone && !phoneOk ? "err" : ""}`} placeholder="10 dígitos" inputMode="numeric" value={form.rep_phone} onChange={e => set("rep_phone", onlyDigits(e.target.value).slice(0,10))} maxLength={10}/>
          </div>
          {phoneE164 && <div className="mono field-hint" style={{ color:"#5B8DEF" }}>{phoneE164}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Panel 2: Dirección ───────────────────────────────────────────────────────
function PanelDireccion({ form, set }: { form: Form; set: any }) {
  return (
    <div>
      <SectionHead icon="M8 2a5 5 0 100 10A5 5 0 008 2zM8 7v1M8 12v2" title="Domicilio fiscal y régimen" sub="Dirección registrada ante el SAT (opcional pero recomendado)"/>
      <div style={{ display:"grid", gap:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 60px", gap:10 }}>
          <div>
            <label className="wlbl">Calle</label>
            <input className="w-inp" placeholder="Av. Insurgentes Sur" value={form.calle} onChange={e => set("calle", e.target.value)}/>
          </div>
          <div>
            <label className="wlbl">Núm. ext.</label>
            <input className="w-inp" placeholder="1602" value={form.num_ext} onChange={e => set("num_ext", e.target.value)}/>
          </div>
          <div>
            <label className="wlbl">Int.</label>
            <input className="w-inp" placeholder="3B" value={form.num_int} onChange={e => set("num_int", e.target.value)}/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 100px", gap:10 }}>
          <div>
            <label className="wlbl">Colonia</label>
            <input className="w-inp" placeholder="Del Valle Centro" value={form.colonia} onChange={e => set("colonia", e.target.value)}/>
          </div>
          <div>
            <label className="wlbl">C.P.</label>
            <input className="w-inp mono" placeholder="03100" value={form.cp} onChange={e => set("cp", onlyDigits(e.target.value).slice(0,5))} maxLength={5}/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label className="wlbl">Municipio / Alcaldía</label>
            <input className="w-inp" placeholder="Benito Juárez" value={form.municipio} onChange={e => set("municipio", e.target.value)}/>
          </div>
          <div>
            <label className="wlbl">Estado</label>
            <select className="w-sel" value={form.estado} onChange={e => set("estado", e.target.value)}>
              {ESTADOS_MX.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="wlbl">Régimen fiscal SAT</label>
          <select className="w-sel" value={form.regimen_fiscal} onChange={e => set("regimen_fiscal", e.target.value)}>
            {REGIMENES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="wlbl">Notas internas</label>
          <textarea className="w-ta" placeholder="Observaciones del analista, contexto del cliente, referidos..." value={form.notas} onChange={e => set("notas", e.target.value)}/>
        </div>
        <InfoBox icon="M2 5h12a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1zM1 8h14" text="Dirección y régimen se usan para la generación de CFDI y validación SAT. Puedes completarlos después desde el detalle del cliente." />
      </div>
    </div>
  );
}

// ── Panel 3: Resumen ─────────────────────────────────────────────────────────
function PanelResumen({ form, rfcNorm, phoneE164, completePct }: { form: Form; rfcNorm: string; phoneE164: string; completePct: number }) {
  const sc = completePct >= 70
    ? { bar:"#00E5A0", text:"#065F46", bg:"#F0FDF9", border:"#D1FAE5", label:"Perfil robusto" }
    : completePct >= 40
    ? { bar:"#F59E0B", text:"#92400E", bg:"#FFFBEB", border:"#FDE68A", label:"Perfil básico" }
    : { bar:"#5B8DEF", text:"#1E40AF", bg:"#EFF6FF", border:"#BFDBFE", label:"Perfil mínimo" };

  const sections = [
    { title:"Empresa", rows:[
      { k:"Razón social", v:form.company_name || "—" },
      { k:"RFC",          v:rfcNorm || "—", mono:true },
      { k:"Tipo",         v:form.tipo_sociedad || "—" },
      { k:"Sector",       v:form.sector || "—" },
    ]},
    { title:"Contacto", rows:[
      { k:"Nombre", v:[form.rep_nombre, form.rep_apellido_p, form.rep_apellido_m].filter(Boolean).join(" ") || "—" },
      { k:"Cargo",  v:form.rep_cargo || "—" },
      { k:"Email",  v:form.rep_email || "—" },
      { k:"Tel",    v:phoneE164 || "—", mono:true },
    ]},
    { title:"Dirección", rows:[
      { k:"Domicilio", v:[form.calle, form.num_ext, form.colonia].filter(Boolean).join(" ") || "—" },
      { k:"Estado",    v:form.estado || "—" },
      { k:"C.P.",      v:form.cp || "—", mono:true },
    ]},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Score */}
      <div style={{ padding:"14px 18px", background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:14, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`${sc.bar}20`, display:"grid", placeItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:800, color:sc.text }}>{completePct}%</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:sc.text }}>{sc.label} — listo para crear</div>
          <div style={{ height:4, background:"rgba(0,0,0,.06)", borderRadius:999, marginTop:8, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${completePct}%`, background:sc.bar, borderRadius:999 }}/>
          </div>
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.title} style={{ background:"#FAFBFF", border:"1px solid #E8EDF5", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", letterSpacing:".08em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace", marginBottom:10 }}>{sec.title}</div>
          {sec.rows.map(r => (
            <div key={r.k} className="review-row">
              <span style={{ fontSize:12, color:"#64748B" }}>{r.k}</span>
              <span style={{ fontSize:12, fontWeight:600, color:"#0F172A", fontFamily:r.mono?"'Geist Mono',monospace":"inherit", textAlign:"right" }}>{r.v}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ padding:"10px 14px", background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, fontSize:12, color:"#1E40AF", display:"flex", gap:8 }}>
        <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v2.5M8 11h.01" c="#3B82F6" s={14}/>
        El cliente se crea en estado <strong>Onboarding</strong>. Podrás completar KYC, SAT y Buró desde su expediente.
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:18 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,rgba(12,30,74,.07),rgba(27,63,138,.14))", border:"1px solid rgba(91,141,239,.2)", display:"grid", placeItems:"center", flexShrink:0 }}>
        <Ic d={icon} s={15} c="#1B3F8A"/>
      </div>
      <div>
        <div style={{ fontSize:14, fontWeight:800, letterSpacing:"-.03em", color:"#0F172A" }}>{title}</div>
        <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{sub}</div>
      </div>
    </div>
  );
}

function InfoBox({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding:"10px 14px", background:"rgba(91,141,239,.05)", border:"1px solid rgba(91,141,239,.15)", borderRadius:10, display:"flex", gap:8 }}>
      <Ic d={icon} c="#5B8DEF" s={14}/>
      <span style={{ fontSize:11, color:"#475569", lineHeight:1.5 }}>{text}</span>
    </div>
  );
}

