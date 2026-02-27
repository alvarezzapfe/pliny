"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ── Icons ────────────────────────────────────────────────────────────────────
function Ic({ d, s = 16, c = "currentColor", sw = 1.5 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const INSTITUTION_TYPES = [
  { value:"bank",         label:"Banco",           icon:"M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z",   desc:"Institución bancaria regulada" },
  { value:"sofom",        label:"SOFOM",            icon:"M8 2a6 6 0 100 12A6 6 0 008 2zM5 8h6M8 5v6",       desc:"Soc. Financiera de Obj. Múltiple" },
  { value:"private_fund", label:"Fondo privado",   icon:"M2 8h12M8 2l4 6-4 6-4-6 4-6",                      desc:"Fondo de inversión o capital" },
  { value:"credit_union", label:"Caja de ahorro",  icon:"M3 3h10v10H3zM6 3v10M3 7h10",                      desc:"Cooperativa de crédito" },
  { value:"sofipo",       label:"SOFIPO",           icon:"M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z",         desc:"Soc. Financiera Popular" },
  { value:"sapi",         label:"SAPI",             icon:"M2 4h12v2H2zM2 9h12v2H2zM5 4v7",                  desc:"Sociedad Anónima Promotora" },
  { value:"ifc_crowd",    label:"Crowdfunding",     icon:"M4 8a4 4 0 118 0M1 8h2M13 8h2M8 1v2M8 13v2",      desc:"Institución de financiamiento colectivo" },
  { value:"other",        label:"Otro",             icon:"M8 3v2M8 11v2M3 8h2M11 8h2",                      desc:"Otro tipo de institución" },
];

const COUNTRIES = [
  { dial:"+52",  flag:"🇲🇽", name:"México" },
  { dial:"+1",   flag:"🇺🇸", name:"EE.UU." },
  { dial:"+34",  flag:"🇪🇸", name:"España" },
  { dial:"+57",  flag:"🇨🇴", name:"Colombia" },
  { dial:"+54",  flag:"🇦🇷", name:"Argentina" },
  { dial:"+56",  flag:"🇨🇱", name:"Chile" },
  { dial:"+51",  flag:"🇵🇪", name:"Perú" },
  { dial:"+55",  flag:"🇧🇷", name:"Brasil" },
];

const STEPS = ["Institución","Representante","Contacto","Confirmar"];

function onlyDigits(v: string) { return (v||"").replace(/[^\d]/g,""); }
function normalizeRFC(v: string) { return (v||"").trim().toUpperCase().replace(/\s+/g,""); }
function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||"").trim()); }
function validateRFC(v: string) { const r = normalizeRFC(v); return r.length >= 10 && r.length <= 13; }

type Profile = {
  id?: string;
  owner_id?: string;
  institution_type: string;
  institution_name: string;
  rfc: string;
  legal_rep_first_names: string;
  legal_rep_last_name_paternal: string;
  legal_rep_last_name_maternal: string;
  legal_rep_email: string;
  legal_rep_phone_country: string;
  legal_rep_phone_national: string;
};

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DatosPage() {
  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");
  const [existing, setExisting] = useState(false);

  const [form, setForm] = useState<Profile>({
    institution_type: "",
    institution_name: "",
    rfc: "",
    legal_rep_first_names: "",
    legal_rep_last_name_paternal: "",
    legal_rep_last_name_maternal: "",
    legal_rep_email: "",
    legal_rep_phone_country: "+52",
    legal_rep_phone_national: "",
  });

  const set = (k: keyof Profile, v: string) => {
    setError("");
    setForm(f => ({ ...f, [k]: v }));
  };

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }

      const { data } = await supabase
        .from("lenders_profile")
        .select("*")
        .eq("owner_id", auth.user.id)
        .maybeSingle();

      if (data) {
        setExisting(true);
        setForm({
          institution_type:            data.institution_type            ?? "",
          institution_name:            data.institution_name            ?? "",
          rfc:                         data.rfc                         ?? "",
          legal_rep_first_names:       data.legal_rep_first_names       ?? "",
          legal_rep_last_name_paternal:data.legal_rep_last_name_paternal?? "",
          legal_rep_last_name_maternal:data.legal_rep_last_name_maternal?? "",
          legal_rep_email:             data.legal_rep_email             ?? (auth.user.email ?? ""),
          legal_rep_phone_country:     data.legal_rep_phone_country     ?? "+52",
          legal_rep_phone_national:    data.legal_rep_phone_national    ?? "",
        });
        // If profile is complete go straight to confirm step
        if (data.institution_type && data.institution_name && data.rfc &&
            data.legal_rep_first_names && data.legal_rep_email) {
          setStep(3);
        }
      } else {
        const { data: authData } = await supabase.auth.getUser();
        setForm(f => ({ ...f, legal_rep_email: authData.user?.email ?? "" }));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Validation per step
  const step0Valid = !!form.institution_type;
  const step1Valid = !!form.institution_name.trim() && validateRFC(form.rfc);
  const step2Valid = !!form.legal_rep_first_names.trim() && !!form.legal_rep_last_name_paternal.trim();
  const step3Valid = isEmail(form.legal_rep_email) && onlyDigits(form.legal_rep_phone_national).length === 10;
  const canNext = step===0?step0Valid : step===1?step1Valid : step===2?step2Valid : step===3?step3Valid : true;

  const instType = INSTITUTION_TYPES.find(t => t.value === form.institution_type);
  const phoneE164 = useMemo(() => {
    const n = onlyDigits(form.legal_rep_phone_national).slice(0,10);
    return n ? `${form.legal_rep_phone_country}${n}` : "";
  }, [form.legal_rep_phone_country, form.legal_rep_phone_national]);

  const completePct = useMemo(() => {
    let s = 0;
    if (form.institution_type)            s += 20;
    if (form.institution_name.trim())     s += 20;
    if (validateRFC(form.rfc))            s += 20;
    if (form.legal_rep_first_names.trim()) s += 15;
    if (isEmail(form.legal_rep_email))    s += 15;
    if (onlyDigits(form.legal_rep_phone_national).length === 10) s += 10;
    return s;
  }, [form]);

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sin sesión");

      const payload = {
        owner_id:                    auth.user.id,
        institution_type:            form.institution_type,
        institution_name:            form.institution_name.trim() || null,
        rfc:                         normalizeRFC(form.rfc) || null,
        legal_rep_first_names:       form.legal_rep_first_names.trim() || null,
        legal_rep_last_name_paternal:form.legal_rep_last_name_paternal.trim() || null,
        legal_rep_last_name_maternal:form.legal_rep_last_name_maternal.trim() || null,
        legal_rep_email:             form.legal_rep_email.trim().toLowerCase() || null,
        legal_rep_phone_country:     form.legal_rep_phone_country || null,
        legal_rep_phone_national:    onlyDigits(form.legal_rep_phone_national).slice(0,10) || null,
        legal_rep_phone_e164:        phoneE164 || null,
        updated_at:                  new Date().toISOString(),
      };

      const { error: e } = await supabase.from("lenders_profile").upsert(payload, { onConflict:"owner_id" });
      if (e) throw new Error(e.message);
      setSaved(true);
      setExisting(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ fontFamily:"'Geist',sans-serif", display:"grid", placeItems:"center", minHeight:"60vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.sp{animation:spin .8s linear infinite}`}</style>
      <svg className="sp" width={24} height={24} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
    </div>
  );

  if (saved) return <SuccessScreen name={form.institution_name} pct={completePct} onEdit={() => { setSaved(false); setStep(3); }} />;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", maxWidth:820, margin:"0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .fade{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;}
        .scale-in{animation:scaleIn .4s cubic-bezier(.16,1,.3,1) both;}
        .spinner{animation:spin .7s linear infinite;}

        .card{background:#fff;border:1px solid #E8EDF5;border-radius:18px;box-shadow:0 2px 8px rgba(0,0,0,.04);}
        .inp{width:100%;height:42px;background:#F8FAFC;border:1.5px solid #E8EDF5;border-radius:11px;padding:0 14px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;transition:all .15s;}
        .inp::placeholder{color:#94A3B8;}
        .inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.10);}
        .inp.error{border-color:#F43F5E;background:#FFF8F8;}
        .sel{width:100%;height:42px;background:#F8FAFC;border:1.5px solid #E8EDF5;border-radius:11px;padding:0 14px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;appearance:none;cursor:pointer;transition:all .15s;}
        .sel:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.10);}
        label.lbl{display:block;font-size:11px;font-weight:700;color:#64748B;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;}
        .mono{font-family:'Geist Mono',monospace;}

        .inst-card{border:2px solid #E8EDF5;border-radius:14px;padding:14px;cursor:pointer;transition:all .18s;background:#fff;display:flex;flex-direction:column;align-items:flex-start;gap:8px;}
        .inst-card:hover{border-color:#93B4F8;background:#F8FBFF;transform:translateY(-1px);box-shadow:0 4px 16px rgba(91,141,239,.1);}
        .inst-card.selected{border-color:#1B3F8A;background:linear-gradient(135deg,#EFF6FF,#F0F7FF);box-shadow:0 0 0 3px rgba(91,141,239,.15);}

        .btn-primary{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:12px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;padding:12px 28px;cursor:pointer;box-shadow:0 4px 16px rgba(12,30,74,.25);transition:all .15s;letter-spacing:-.01em;}
        .btn-primary:hover:not(:disabled){opacity:.9;transform:translateY(-1px);box-shadow:0 6px 20px rgba(12,30,74,.3);}
        .btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1.5px solid #E8EDF5;border-radius:12px;font-family:'Geist',sans-serif;font-size:14px;font-weight:600;padding:12px 22px;cursor:pointer;transition:all .15s;}
        .btn-ghost:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}

        .step-dot{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-family:'Geist Mono',monospace;font-size:12px;font-weight:700;transition:all .3s;}
        .step-dot.done{background:#0C1E4A;color:#fff;box-shadow:0 2px 8px rgba(12,30,74,.3);}
        .step-dot.active{background:linear-gradient(135deg,#1B3F8A,#0C1E4A);color:#fff;box-shadow:0 0 0 5px rgba(91,141,239,.2);}
        .step-dot.idle{background:#F1F5F9;color:#94A3B8;}
        .step-line{flex:1;height:1.5px;margin:0 8px;transition:background .3s;}
        .step-line.done{background:linear-gradient(90deg,#0C1E4A,#5B8DEF);}
        .step-line.idle{background:#E8EDF5;}

        .review-row{display:flex;justify-content:space-between;align-items:flex-start;padding:11px 0;border-bottom:1px solid #F1F5F9;gap:16px;}
        .review-row:last-child{border-bottom:none;}

        .progress-bar{height:4px;background:#F1F5F9;border-radius:999px;overflow:hidden;margin-top:16px;}
        .progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#1B3F8A,#5B8DEF);transition:width .5s cubic-bezier(.16,1,.3,1);}
      `}</style>

      {/* HEADER */}
      <div className="fade" style={{ marginBottom:32 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.05em", lineHeight:1 }}>
              {existing ? "Datos de la institución" : "Configura tu perfil"}
            </div>
            <div style={{ fontSize:13, color:"#64748B", marginTop:6 }}>
              {existing ? "Actualiza la información de tu institución" : "Completa tu onboarding para empezar a operar"}
            </div>
          </div>
          {/* Completitud badge */}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase", marginBottom:4 }}>Completitud</div>
            <div style={{ fontSize:28, fontWeight:800, letterSpacing:"-.05em", color: completePct >= 80 ? "#065F46" : completePct >= 50 ? "#92400E" : "#0F172A" }}>
              {completePct}%
            </div>
            <div className="progress-bar" style={{ width:80 }}>
              <div className="progress-fill" style={{ width:`${completePct}%`, background: completePct >= 80 ? "linear-gradient(90deg,#059669,#00E5A0)" : completePct >= 50 ? "linear-gradient(90deg,#D97706,#F59E0B)" : "linear-gradient(90deg,#1B3F8A,#5B8DEF)" }}/>
            </div>
          </div>
        </div>
      </div>

      {/* STEP INDICATOR */}
      <div className="fade" style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div
                className={`step-dot ${i < step ? "done" : i === step ? "active" : "idle"}`}
                style={{ cursor: i < step ? "pointer" : "default" }}
                onClick={() => i < step && setStep(i)}
              >
                {i < step ? <Ic d="M3 8l3.5 3.5L13 4" s={14} c="#fff" sw={2}/> : i+1}
              </div>
              <span style={{ fontSize:10, fontWeight:i===step?700:500, color:i<=step?"#0C1E4A":"#94A3B8", letterSpacing:".05em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace", whiteSpace:"nowrap" }}>{label}</span>
            </div>
            {i < STEPS.length-1 && <div className={`step-line ${i < step ? "done" : "idle"}`}/>}
          </React.Fragment>
        ))}
      </div>

      {/* PANELS */}
      <div key={step}>
        {step === 0 && <StepTipo form={form} set={set} />}
        {step === 1 && <StepInstitucion form={form} set={set} />}
        {step === 2 && <StepRepresentante form={form} set={set} />}
        {step === 3 && <StepContacto form={form} set={set} phoneE164={phoneE164} />}
        {step === 4 && <StepResumen form={form} instType={instType} phoneE164={phoneE164} completePct={completePct} />}
      </div>

      {/* ERROR */}
      {error && (
        <div className="fade" style={{ marginTop:12, padding:"12px 16px", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:12, fontSize:13, color:"#881337", display:"flex", gap:10, alignItems:"center" }}>
          <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v4M8 11h.01" c="#F43F5E" s={15}/>
          {error}
        </div>
      )}

      {/* NAVIGATION */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:28 }}>
        {step > 0
          ? <button className="btn-ghost" onClick={() => setStep(s=>s-1)}>
              <Ic d="M10 3L4 8l6 5" s={14}/> Atrás
            </button>
          : <div/>
        }
        {step < 4
          ? <button className="btn-primary" disabled={!canNext} onClick={() => setStep(s=>s+1)}>
              Continuar <Ic d="M6 3l6 5-6 5" s={14} c="#fff"/>
            </button>
          : <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving
                ? <><svg className="spinner" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Guardando...</>
                : <><Ic d="M3 8l3.5 3.5L13 4" s={14} c="#fff" sw={2}/> {existing ? "Actualizar datos" : "Completar onboarding"}</>
              }
            </button>
        }
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:"#F1F5F9", borderRadius:999, marginTop:24, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:999, background:"linear-gradient(90deg,#1B3F8A,#5B8DEF)", width:`${((step+1)/5)*100}%`, transition:"width .4s cubic-bezier(.16,1,.3,1)" }}/>
      </div>
    </div>
  );
}

// ── Step 0: Tipo de institución ───────────────────────────────────────────────
function StepTipo({ form, set }: { form: Profile; set: (k: keyof Profile, v: string) => void }) {
  return (
    <div className="scale-in">
      <div className="card" style={{ padding:28 }}>
        <SectionHead
          icon="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z"
          title="¿Qué tipo de institución eres?"
          sub="Esto determina tu flujo de operación y los documentos requeridos"
        />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {INSTITUTION_TYPES.map(t => (
            <div
              key={t.value}
              className={`inst-card ${form.institution_type===t.value?"selected":""}`}
              onClick={() => set("institution_type", t.value)}
            >
              <div style={{ width:36, height:36, borderRadius:10, background:form.institution_type===t.value?"linear-gradient(135deg,#0C1E4A,#1B3F8A)":"#EEF2FF", display:"grid", placeItems:"center", transition:"all .18s" }}>
                <Ic d={t.icon} s={17} c={form.institution_type===t.value?"#fff":"#5B8DEF"}/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:form.institution_type===t.value?"#0C1E4A":"#0F172A", marginBottom:3 }}>{t.label}</div>
                <div style={{ fontSize:10, color:"#94A3B8", lineHeight:1.4 }}>{t.desc}</div>
              </div>
              {form.institution_type===t.value && (
                <div style={{ marginTop:"auto", width:18, height:18, borderRadius:"50%", background:"#0C1E4A", display:"grid", placeItems:"center" }}>
                  <Ic d="M4 8l2.5 2.5L12 5" s={11} c="#fff" sw={2}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Datos institución ─────────────────────────────────────────────────
function StepInstitucion({ form, set }: { form: Profile; set: (k: keyof Profile, v: string) => void }) {
  const rfcValid = form.rfc ? validateRFC(form.rfc) : true;
  return (
    <div className="scale-in">
      <div className="card" style={{ padding:28 }}>
        <SectionHead
          icon="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4"
          title="Datos de tu institución"
          sub="Esta información aparecerá en documentos y comunicaciones"
        />
        <div style={{ display:"grid", gap:18 }}>
          <div>
            <label className="lbl">Nombre de la institución *</label>
            <input className="inp" placeholder="Ej. Fondo ABC Capital SAPI de CV" value={form.institution_name} onChange={e => set("institution_name", e.target.value)}/>
          </div>
          <div>
            <label className="lbl">RFC de la institución *</label>
            <input className={`inp mono ${form.rfc && !rfcValid ? "error" : ""}`} placeholder="XAXX010101000" value={form.rfc} onChange={e => set("rfc", e.target.value.toUpperCase())} maxLength={13}/>
            {form.rfc && !rfcValid && (
              <div style={{ fontSize:11, color:"#F43F5E", marginTop:5, display:"flex", alignItems:"center", gap:5 }}>
                <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v3M8 11h.01" s={12} c="#F43F5E"/> RFC debe tener entre 10 y 13 caracteres
              </div>
            )}
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:5 }}>Se normaliza automáticamente a mayúsculas</div>
          </div>
          <InfoBox icon="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v2.5M8 11h.01" text="El RFC se usa para validación fiscal y generación de documentos legales en la plataforma." />
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Representante legal ───────────────────────────────────────────────
function StepRepresentante({ form, set }: { form: Profile; set: (k: keyof Profile, v: string) => void }) {
  return (
    <div className="scale-in">
      <div className="card" style={{ padding:28 }}>
        <SectionHead
          icon="M11 2l3 3-9 9H2v-3L11 2z"
          title="Representante legal"
          sub="Persona física facultada para firmar y operar en nombre de la institución"
        />
        <div style={{ display:"grid", gap:18 }}>
          <div>
            <label className="lbl">Nombre(s) *</label>
            <input className="inp" placeholder="Ej. Luis Armando" value={form.legal_rep_first_names} onChange={e => set("legal_rep_first_names", e.target.value)}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label className="lbl">Apellido paterno *</label>
              <input className="inp" placeholder="Ej. Álvarez" value={form.legal_rep_last_name_paternal} onChange={e => set("legal_rep_last_name_paternal", e.target.value)}/>
            </div>
            <div>
              <label className="lbl">Apellido materno</label>
              <input className="inp" placeholder="Ej. Zapfe" value={form.legal_rep_last_name_maternal} onChange={e => set("legal_rep_last_name_maternal", e.target.value)}/>
            </div>
          </div>
          <InfoBox icon="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" text="El representante legal es quien firma contratos y actúa ante autoridades en nombre de la institución." />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Contacto ──────────────────────────────────────────────────────────
function StepContacto({ form, set, phoneE164 }: { form: Profile; set: (k: keyof Profile, v: string) => void; phoneE164: string }) {
  const emailValid = form.legal_rep_email ? isEmail(form.legal_rep_email) : true;
  const phoneLen   = onlyDigits(form.legal_rep_phone_national).length;
  const phoneValid = form.legal_rep_phone_national ? phoneLen === 10 : true;

  return (
    <div className="scale-in">
      <div className="card" style={{ padding:28 }}>
        <SectionHead
          icon="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM2 4l6 5 6-5"
          title="Contacto del representante"
          sub="Correo y teléfono para comunicaciones operativas y verificación"
        />
        <div style={{ display:"grid", gap:18 }}>
          <div>
            <label className="lbl">Correo electrónico *</label>
            <input className={`inp ${form.legal_rep_email && !emailValid ? "error" : ""}`} placeholder="correo@dominio.com" type="email" value={form.legal_rep_email} onChange={e => set("legal_rep_email", e.target.value)}/>
            {form.legal_rep_email && !emailValid && (
              <div style={{ fontSize:11, color:"#F43F5E", marginTop:5, display:"flex", alignItems:"center", gap:5 }}>
                <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v3M8 11h.01" s={12} c="#F43F5E"/> Correo inválido
              </div>
            )}
          </div>
          <div>
            <label className="lbl">Celular *</label>
            <div style={{ display:"flex", gap:10 }}>
              <select className="sel" value={form.legal_rep_phone_country} onChange={e => set("legal_rep_phone_country", e.target.value)} style={{ width:160, flexShrink:0 }}>
                {COUNTRIES.map(c => (
                  <option key={c.dial+c.name} value={c.dial}>{c.flag} {c.name} ({c.dial})</option>
                ))}
              </select>
              <input className={`inp mono ${form.legal_rep_phone_national && !phoneValid ? "error" : ""}`} placeholder="10 dígitos" inputMode="numeric" value={form.legal_rep_phone_national} onChange={e => set("legal_rep_phone_national", onlyDigits(e.target.value).slice(0,10))} maxLength={10}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
              {form.legal_rep_phone_national && !phoneValid
                ? <div style={{ fontSize:11, color:"#F43F5E", display:"flex", alignItems:"center", gap:5 }}><Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v3M8 11h.01" s={12} c="#F43F5E"/> Necesita 10 dígitos</div>
                : <div style={{ fontSize:11, color:"#94A3B8" }}>Solo números, sin código de país</div>
              }
              {phoneE164 && <div className="mono" style={{ fontSize:11, color:"#5B8DEF" }}>{phoneE164}</div>}
            </div>
          </div>
          <InfoBox icon="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM2 4l6 5 6-5" text="Se usará para confirmaciones, alertas de operación y contacto ante incidencias." />
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Resumen ───────────────────────────────────────────────────────────
function StepResumen({ form, instType, phoneE164, completePct }: any) {
  const sc = completePct >= 80 ? { bar:"#00E5A0", text:"#065F46", bg:"#F0FDF9", label:"Perfil completo" }
           : completePct >= 50 ? { bar:"#F59E0B", text:"#92400E", bg:"#FFFBEB", label:"Perfil parcial" }
           : { bar:"#F43F5E", text:"#881337", bg:"#FFF1F2", label:"Perfil incompleto" };

  const sections = [
    { title:"Institución", rows:[
      { k:"Tipo",   v: instType?.label || form.institution_type || "—" },
      { k:"Nombre", v: form.institution_name || "—" },
      { k:"RFC",    v: form.rfc || "—", mono:true },
    ]},
    { title:"Representante legal", rows:[
      { k:"Nombre", v: [form.legal_rep_first_names, form.legal_rep_last_name_paternal, form.legal_rep_last_name_maternal].filter(Boolean).join(" ") || "—" },
    ]},
    { title:"Contacto", rows:[
      { k:"Correo",   v: form.legal_rep_email || "—" },
      { k:"Teléfono", v: phoneE164 || "—", mono:true },
    ]},
  ];

  return (
    <div className="scale-in" style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Completitud */}
      <div style={{ padding:"18px 22px", background:sc.bg, border:`1px solid ${sc.bar}30`, borderRadius:16, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:`${sc.bar}20`, display:"grid", placeItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:22, fontWeight:800, color:sc.text }}>{completePct}%</span>
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:sc.text }}>{sc.label}</div>
          <div style={{ height:4, background:"#E8EDF5", borderRadius:999, marginTop:8, width:200, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${completePct}%`, background:sc.bar, borderRadius:999 }}/>
          </div>
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.title} className="card" style={{ padding:20 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", letterSpacing:".08em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace", marginBottom:14 }}>{sec.title}</div>
          {sec.rows.map((row: any) => (
            <div key={row.k} className="review-row">
              <span style={{ fontSize:12, color:"#64748B", flexShrink:0 }}>{row.k}</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#0F172A", fontFamily:row.mono?"'Geist Mono',monospace":"inherit", textAlign:"right" }}>{row.v}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Success ───────────────────────────────────────────────────────────────────
function SuccessScreen({ name, pct, onEdit }: { name: string; pct: number; onEdit: () => void }) {
  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", minHeight:"60vh", display:"grid", placeItems:"center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes ring{0%{transform:scale(0);opacity:0;}70%{transform:scale(1.1);}100%{transform:scale(1);opacity:1;}}
        @keyframes chk{0%{transform:scale(0);}60%{transform:scale(1.2);}100%{transform:scale(1);}}
        .fade{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.1s;}.d2{animation-delay:.22s;}.d3{animation-delay:.35s;}
        .ring-anim{animation:ring .55s cubic-bezier(.16,1,.3,1) both;}
        .chk-anim{animation:chk .4s cubic-bezier(.16,1,.3,1) .35s both;}
      `}</style>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <div className="ring-anim" style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", display:"grid", placeItems:"center", margin:"0 auto 24px", boxShadow:"0 0 0 14px rgba(91,141,239,.12)" }}>
          <div className="chk-anim">
            <svg width={30} height={30} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3.5 3.5L13 4"/></svg>
          </div>
        </div>
        <div className="fade d1" style={{ fontSize:22, fontWeight:800, letterSpacing:"-.05em", marginBottom:8 }}>¡Perfil guardado!</div>
        <div className="fade d2" style={{ fontSize:13, color:"#64748B", lineHeight:1.7, marginBottom:8 }}>
          <strong style={{ color:"#0F172A" }}>{name}</strong> ha sido configurado correctamente.
        </div>
        <div className="fade d2" style={{ display:"inline-flex", alignItems:"center", gap:6, background: pct >= 80 ? "#F0FDF9" : "#FFFBEB", border:`1px solid ${pct >= 80 ? "#D1FAE5" : "#FDE68A"}`, borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:700, color: pct >= 80 ? "#065F46" : "#92400E", marginBottom:28, fontFamily:"'Geist Mono',monospace" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background: pct >= 80 ? "#00E5A0" : "#F59E0B", display:"inline-block" }}/>
          Completitud: {pct}%
        </div>
        <div className="fade d3" style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={onEdit} style={{ display:"inline-flex", alignItems:"center", gap:6, background:"transparent", color:"#475569", border:"1.5px solid #E8EDF5", borderRadius:12, fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:600, padding:"10px 18px", cursor:"pointer" }}>
            Editar datos
          </button>
          <a href="/dashboard" style={{ display:"inline-flex", alignItems:"center", gap:7, background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", border:"none", borderRadius:12, fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:700, padding:"10px 22px", cursor:"pointer", textDecoration:"none", boxShadow:"0 4px 16px rgba(12,30,74,.25)" }}>
            Ir al dashboard
            <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l6 5-6 5"/></svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:24 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,rgba(12,30,74,.07),rgba(27,63,138,.14))", border:"1px solid rgba(91,141,239,.2)", display:"grid", placeItems:"center", flexShrink:0 }}>
        <Ic d={icon} s={17} c="#1B3F8A"/>
      </div>
      <div>
        <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-.03em", color:"#0F172A" }}>{title}</div>
        <div style={{ fontSize:12, color:"#64748B", marginTop:3, lineHeight:1.5 }}>{sub}</div>
      </div>
    </div>
  );
}

function InfoBox({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding:"12px 16px", background:"rgba(91,141,239,.05)", border:"1px solid rgba(91,141,239,.15)", borderRadius:12, display:"flex", gap:10, alignItems:"flex-start" }}>
      <Ic d={icon} c="#5B8DEF" s={15}/>
      <span style={{ fontSize:12, color:"#475569", lineHeight:1.5 }}>{text}</span>
    </div>
  );
}