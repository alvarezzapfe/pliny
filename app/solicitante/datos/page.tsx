"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Step = 1 | 2 | 3 | 4 | 5;

interface KYCForm {
  company_name: string; company_razon_social: string; company_rfc: string;
  company_regimen_fiscal: string; company_fecha_constitucion: string;
  company_giro: string; company_state: string; company_calle: string;
  company_colonia: string; company_municipio: string; company_cp: string;
  rep_first_names: string; rep_last_name: string; rep_curp: string;
  rep_rfc: string; rep_email: string; rep_phone: string; rep_cargo: string;
  fin_facturacion_anual: string; fin_antiguedad: string; fin_num_empleados: string;
  fin_sector: string; fin_banco: string; fin_clabe: string;
}

const EMPTY: KYCForm = {
  company_name:"", company_razon_social:"", company_rfc:"", company_regimen_fiscal:"",
  company_fecha_constitucion:"", company_giro:"", company_state:"", company_calle:"",
  company_colonia:"", company_municipio:"", company_cp:"",
  rep_first_names:"", rep_last_name:"", rep_curp:"", rep_rfc:"",
  rep_email:"", rep_phone:"", rep_cargo:"",
  fin_facturacion_anual:"", fin_antiguedad:"", fin_num_empleados:"",
  fin_sector:"", fin_banco:"", fin_clabe:"",
};

function Ic({ d, s=16, c="currentColor" }: { d:string; s?:number; c?:string }) {
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

function validateRFC(rfc: string) { return /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc); }
function validateCURP(curp: string) { return /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/.test(curp); }
function validateCLABE(clabe: string) { return clabe.length === 18 && /^[0-9]+$/.test(clabe); }

const STEPS = [
  { n:1, label:"Empresa",   icon:"M2 7l6-5 6 5v7H2V7z",                                  desc:"Datos fiscales y domicilio" },
  { n:2, label:"Rep. Legal",icon:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5",          desc:"Quien firma los contratos" },
  { n:3, label:"Finanzas",  icon:"M2 12L6 7l3 3 3-4 2 2",                                 desc:"Facturación y cuenta bancaria" },
  { n:4, label:"Documentos",icon:"M4 2h8v12H4zM6 6h4M6 9h4",                              desc:"Lista de lo requerido" },
  { n:5, label:"Listo",     icon:"M2 8l4 4 8-8",                                           desc:"Enviar a revisión" },
];

function KycBadge({ status }: { status: string }) {
  const map: Record<string, { label:string; bg:string; color:string; dot:string }> = {
    pendiente:   { label:"Pendiente",    bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
    en_revision: { label:"En revisión",  bg:"#EFF6FF", color:"#1E40AF", dot:"#3B82F6" },
    aprobado:    { label:"Aprobado ✓",   bg:"#ECFDF5", color:"#065F46", dot:"#10B981" },
    rechazado:   { label:"Rechazado",    bg:"#FFF1F2", color:"#9F1239", dot:"#F43F5E" },
  };
  const m = map[status] ?? map.pendiente;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, borderRadius:999, padding:"4px 10px", fontSize:11, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:m.bg, color:m.color }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:m.dot, display:"inline-block" }}/>
      KYC {m.label}
    </span>
  );
}

function ProfileProgress({ form }: { form: KYCForm }) {
  const vals = Object.values(form);
  const pct = Math.round((vals.filter(v=>v.trim()!=="").length / vals.length) * 100);
  const color = pct>=80?"#10B981":pct>=50?"#F59E0B":"#F43F5E";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ flex:1, height:5, background:"#F1F5F9", borderRadius:999, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:999, transition:"width .6s cubic-bezier(.16,1,.3,1)" }}/>
      </div>
      <span style={{ fontSize:12, fontWeight:800, color, fontFamily:"'Geist Mono',monospace", minWidth:36 }}>{pct}%</span>
    </div>
  );
}

// ── Floating Label Input ───────────────────────────────────────────────────
function FInput({ label, value, onChange, placeholder, type="text", maxLength, hint, error, prefix, suffix, required }: {
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string;
  type?:string; maxLength?:number; hint?:string; error?:string; prefix?:string; suffix?:string; required?:boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasVal = value.length > 0;
  const active = focused || hasVal;
  return (
    <div style={{ position:"relative", marginBottom:4 }}>
      <div style={{
        position:"relative", borderRadius:12,
        border: `1.5px solid ${error ? "#EF4444" : focused ? "#059669" : hasVal ? "#A7F3D0" : "#DDE5F7"}`,
        background: focused ? "#fff" : hasVal ? "#F9FFFB" : "#F8FAFF",
        transition:"all .15s", overflow:"hidden",
        boxShadow: focused ? "0 0 0 3px rgba(5,150,105,.10)" : "none",
      }}>
        <label style={{
          position:"absolute", left: prefix ? 38 : 14,
          top: active ? 7 : "50%", transform: active ? "none" : "translateY(-50%)",
          fontSize: active ? 10 : 13, fontWeight: active ? 700 : 400,
          color: active ? (error ? "#EF4444" : "#059669") : "#94A3B8",
          fontFamily:"'Geist',sans-serif", letterSpacing: active ? ".04em" : 0,
          transition:"all .15s", pointerEvents:"none", zIndex:1,
        }}>
          {label}{required && <span style={{ color:"#EF4444" }}> *</span>}
        </label>
        {prefix && (
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8", fontWeight:600, pointerEvents:"none", marginTop: active ? 7 : 0, transition:"margin .15s" }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          maxLength={maxLength}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setFocused(false)}
          onChange={e=>onChange(e.target.value)}
          placeholder={active ? placeholder : ""}
          style={{
            width:"100%", height:56, border:"none", outline:"none", background:"transparent",
            paddingTop: active ? 20 : 0, paddingBottom: active ? 4 : 0,
            paddingLeft: prefix ? 38 : 14, paddingRight: suffix ? 36 : 14,
            fontSize:14, color:"#0F172A", fontFamily:"'Geist',sans-serif",
            transition:"padding .15s",
          }}
        />
        {suffix && (
          <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8", fontWeight:600, pointerEvents:"none" }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <div style={{ fontSize:11, color:"#EF4444", marginTop:4, paddingLeft:4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize:11, color:"#94A3B8", marginTop:4, paddingLeft:4 }}>{hint}</div>}
    </div>
  );
}

// ── Floating Label Select ──────────────────────────────────────────────────
function FSelect({ label, value, onChange, options, required, hint }: {
  label:string; value:string; onChange:(v:string)=>void;
  options: { value:string; label:string }[]; required?:boolean; hint?:string;
}) {
  const [focused, setFocused] = useState(false);
  const hasVal = value !== "";
  const active = focused || hasVal;
  return (
    <div style={{ position:"relative", marginBottom:4 }}>
      <div style={{
        position:"relative", borderRadius:12,
        border:`1.5px solid ${focused ? "#059669" : hasVal ? "#A7F3D0" : "#DDE5F7"}`,
        background: focused ? "#fff" : hasVal ? "#F9FFFB" : "#F8FAFF",
        transition:"all .15s",
        boxShadow: focused ? "0 0 0 3px rgba(5,150,105,.10)" : "none",
      }}>
        <label style={{
          position:"absolute", left:14,
          top: active ? 7 : "50%", transform: active ? "none" : "translateY(-50%)",
          fontSize: active ? 10 : 13, fontWeight: active ? 700 : 400,
          color: active ? "#059669" : "#94A3B8",
          fontFamily:"'Geist',sans-serif", letterSpacing: active ? ".04em" : 0,
          transition:"all .15s", pointerEvents:"none", zIndex:1,
        }}>
          {label}{required && <span style={{ color:"#EF4444" }}> *</span>}
        </label>
        <select
          value={value}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setFocused(false)}
          onChange={e=>onChange(e.target.value)}
          style={{
            width:"100%", height:56, border:"none", outline:"none", background:"transparent",
            paddingTop: active ? 18 : 0, paddingBottom: active ? 4 : 0,
            paddingLeft:14, paddingRight:32,
            fontSize:14, color: value ? "#0F172A" : "transparent",
            fontFamily:"'Geist',sans-serif", cursor:"pointer",
            appearance:"none", transition:"padding .15s",
          }}
        >
          <option value=""/>
          {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
          <Ic d="M4 6l4 4 4-4" s={13} c="#94A3B8"/>
        </div>
      </div>
      {hint && <div style={{ fontSize:11, color:"#94A3B8", marginTop:4, paddingLeft:4 }}>{hint}</div>}
    </div>
  );
}

export default function DatosPage() {
  const router = useRouter();
  const [mode, setMode]     = useState<"view"|"edit">("view");
  const [step, setStep]     = useState<Step>(1);
  const [dir, setDir]       = useState<1|-1>(1);
  const [form, setForm]     = useState<KYCForm>(EMPTY);
  const [saved, setSaved]   = useState<KYCForm>(EMPTY);
  const [kycStatus, setKycStatus] = useState("pendiente");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved_ok, setSavedOk]    = useState(false);
  const [profileId, setProfileId] = useState<string|null>(null);
  const [userId, setUserId]       = useState<string|null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    (async()=>{
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUserId(auth.user.id);
      const { data } = await supabase.from("borrowers_profile").select("*").eq("owner_id", auth.user.id).maybeSingle();
      if (data) {
        setProfileId(data.id);
        setKycStatus(data.kyc_status ?? "pendiente");
        const f: KYCForm = Object.fromEntries(
          Object.keys(EMPTY).map(k => [k, (data as any)[k] ?? ""])
        ) as KYCForm;
        setForm(f); setSaved(f);
      }
      setLoading(false);
    })();
  }, [router]);

  function upd(k: keyof KYCForm, v: string) { setForm(f=>({...f,[k]:v})); }

  async function saveStep() {
    if (!userId) return;
    setSaving(true);
    const payload = { ...form, kyc_step: step, updated_at: new Date().toISOString() };
    if (profileId) {
      await supabase.from("borrowers_profile").update(payload).eq("id", profileId);
    } else {
      const { data } = await supabase.from("borrowers_profile")
        .insert({ ...payload, owner_id: userId, kyc_status:"pendiente" })
        .select().maybeSingle();
      if (data) setProfileId(data.id);
    }
    setSaved({...form});
    setSaving(false);
    setSavedOk(true);
    setTimeout(()=>setSavedOk(false), 2000);
  }

  async function goNext() {
    await saveStep();
    setDir(1);
    setStep(s=>(s+1) as Step);
    contentRef.current?.scrollTo({ top:0, behavior:"smooth" });
  }

  async function goBack() {
    setDir(-1);
    setStep(s=>(s-1) as Step);
    contentRef.current?.scrollTo({ top:0, behavior:"smooth" });
  }

  async function submitKYC() {
    if (!userId) return;
    setSaving(true);
    const payload = { ...form, kyc_status:"en_revision", kyc_step:5, onboarding_done:true, updated_at: new Date().toISOString() };
    if (profileId) {
      await supabase.from("borrowers_profile").update(payload).eq("id", profileId);
    } else {
      await supabase.from("borrowers_profile").insert({ ...payload, owner_id: userId });
    }
    setKycStatus("en_revision");
    setSaved({...form});
    setSaving(false);
    setMode("view");
  }

  const rfcErr   = form.company_rfc   && !validateRFC(form.company_rfc)   ? "RFC inválido (ej. ABC900101XYZ)" : undefined;
  const curpErr  = form.rep_curp      && !validateCURP(form.rep_curp)     ? "CURP inválido" : undefined;
  const clabeErr = form.fin_clabe     && !validateCLABE(form.fin_clabe)   ? "CLABE debe tener 18 dígitos" : undefined;
  const repRfcErr= form.rep_rfc       && !validateRFC(form.rep_rfc)       ? "RFC inválido" : undefined;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes slideIn{from{opacity:0;transform:translateX(var(--dir,30px));}to{opacity:1;transform:translateX(0);}}
    @keyframes slideOut{from{opacity:1;transform:translateX(0);}to{opacity:0;transform:translateX(calc(var(--dir,30px)*-1));}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pop{0%{transform:scale(.8);opacity:0;}60%{transform:scale(1.1);}100%{transform:scale(1);opacity:1;}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
    .mono{font-family:'Geist Mono',monospace;}
    .spinner{animation:spin .7s linear infinite;}
    .step-content{animation:slideIn .3s cubic-bezier(.16,1,.3,1) both;}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
    .d1{animation-delay:.05s;}.d2{animation-delay:.10s;}.d3{animation-delay:.15s;}
    .info-row{padding:11px 0;border-bottom:1px solid #F1F5F9;}
    .info-row:last-child{border-bottom:none;}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:16px;}
    .btn-main{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border:none;border-radius:12px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;padding:13px 22px;cursor:pointer;box-shadow:0 4px 14px rgba(6,78,59,.25);transition:all .15s;letter-spacing:-.01em;}
    .btn-main:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(6,78,59,.30);}
    .btn-main:active{transform:translateY(0);}
    .btn-main:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none;}
    .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#64748B;border:1.5px solid #E2E8F0;border-radius:12px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:12px 18px;cursor:pointer;transition:all .15s;}
    .btn-ghost:hover{background:#F8FAFC;border-color:#CBD5E1;color:#0F172A;}
    .btn-save{display:inline-flex;align-items:center;gap:6px;background:#F0FDF9;color:#059669;border:1.5px solid #A7F3D0;border-radius:12px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:12px 18px;cursor:pointer;transition:all .15s;}
    .btn-save:hover{background:#ECFDF5;}
    .btn-save.ok{background:#ECFDF5;color:#065F46;animation:pop .3s ease both;}
    .doc-row{display:flex;align-items:center;gap:12px;padding:13px 16px;background:#FAFBFF;border:1px solid #EEF2FF;border-radius:12px;transition:all .15s;}
    .doc-row:hover{background:#F0FDF9;border-color:#A7F3D0;}
  `;

  if (loading) return (
    <div style={{ fontFamily:"'Geist',sans-serif", display:"grid", placeItems:"center", minHeight:320 }}>
      <style>{CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <svg className="spinner" width={28} height={28} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
        <span style={{ color:"#94A3B8", fontSize:13 }}>Cargando perfil...</span>
      </div>
    </div>
  );

  // ── VIEW ──────────────────────────────────────────────────────────────────
  if (mode === "view") {
    const sections = [
      { title:"Empresa", icon:"M2 7l6-5 6 5v7H2V7z", rows:[
        ["Nombre comercial", saved.company_name],
        ["Razón social",     saved.company_razon_social],
        ["RFC",              saved.company_rfc],
        ["Giro",             saved.company_giro],
        ["Estado",           saved.company_state],
        ["Dirección",        [saved.company_calle, saved.company_colonia, saved.company_municipio].filter(Boolean).join(", ")],
      ]},
      { title:"Representante Legal", icon:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5", rows:[
        ["Nombre",   [saved.rep_first_names, saved.rep_last_name].filter(Boolean).join(" ")],
        ["Cargo",    saved.rep_cargo],
        ["RFC",      saved.rep_rfc],
        ["CURP",     saved.rep_curp],
        ["Email",    saved.rep_email],
        ["Teléfono", saved.rep_phone ? `+52 ${saved.rep_phone}` : ""],
      ]},
      { title:"Información Financiera", icon:"M2 12L6 7l3 3 3-4 2 2", rows:[
        ["Facturación anual", saved.fin_facturacion_anual],
        ["Antigüedad",        saved.fin_antiguedad],
        ["Empleados",         saved.fin_num_empleados],
        ["Sector",            saved.fin_sector],
        ["Banco",             saved.fin_banco],
        ["CLABE",             saved.fin_clabe ? `····${saved.fin_clabe.slice(-4)}` : ""],
      ]},
    ];
    return (
      <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
        <style>{CSS}</style>
        <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", marginBottom:6 }}>Mis datos</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <KycBadge status={kycStatus}/>
              {saved.company_name && <span style={{ fontSize:12, color:"#94A3B8" }}>{saved.company_name}</span>}
            </div>
          </div>
          <button className="btn-main" onClick={()=>{setMode("edit");setStep(1);}}>
            <Ic d="M11 2l3 3-8 8H3v-3L11 2z" s={13} c="#fff"/> Editar perfil
          </button>
        </div>

        <div className="card fade d1" style={{ padding:"16px 20px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#64748B" }}>Completitud del perfil</span>
            <span style={{ fontSize:11, color:"#94A3B8" }}>Completa más campos para mejores ofertas</span>
          </div>
          <ProfileProgress form={saved}/>
        </div>

        {kycStatus === "en_revision" && (
          <div className="fade d1" style={{ marginBottom:14, padding:"14px 18px", background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:14, display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"#DBEAFE", display:"grid", placeItems:"center", flexShrink:0 }}>
              <Ic d="M8 2a6 6 0 100 12M8 5v3l2 2" s={17} c="#1E40AF"/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1E40AF" }}>KYC en revisión</div>
              <div style={{ fontSize:12, color:"#3B82F6", marginTop:2 }}>Verificando tu información. Te notificamos en 1-3 días hábiles.</div>
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {sections.map((sec, si) => (
            <div key={sec.title} className={`card fade d${si+2}`} style={{ padding:"18px 20px", gridColumn: si===2 ? "1/-1" : undefined }}>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14, paddingBottom:12, borderBottom:"1px solid #F1F5F9" }}>
                <div style={{ width:32, height:32, borderRadius:9, background:"#ECFDF5", display:"grid", placeItems:"center" }}>
                  <Ic d={sec.icon} s={14} c="#059669"/>
                </div>
                <span style={{ fontSize:13, fontWeight:700 }}>{sec.title}</span>
              </div>
              {sec.rows.map(([lbl, val])=>(
                <div key={lbl} className="info-row">
                  <div className="mono" style={{ fontSize:9, color:"#94A3B8", letterSpacing:".08em", marginBottom:2 }}>{lbl.toUpperCase()}</div>
                  <div style={{ fontSize:13, fontWeight:500, color: val ? "#0F172A" : "#CBD5E1" }}>{val || "—"}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── WIZARD ────────────────────────────────────────────────────────────────
  const pct = Math.round(((step-1)/5)*100);

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", maxWidth:640, margin:"0 auto" }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.04em" }}>Verificación KYC</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>Paso {step} de 5 · {STEPS[step-1].desc}</div>
        </div>
        <button className="btn-ghost" onClick={()=>setMode("view")}>
          <Ic d="M8 2v12M2 8h12" s={11} c="#64748B" /> Salir
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", gap:4, marginBottom:10 }}>
          {STEPS.map(s=>(
            <div key={s.n} style={{
              flex:1, height:4, borderRadius:999,
              background: s.n < step ? "#059669" : s.n === step ? "linear-gradient(90deg,#059669,#34D399)" : "#E2E8F0",
              transition:"background .3s",
            }}/>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          {STEPS.map(s=>(
            <div key={s.n} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1 }}>
              <div style={{
                width:28, height:28, borderRadius:"50%", display:"grid", placeItems:"center",
                background: s.n < step ? "#059669" : s.n===step ? "#064E3B" : "#F1F5F9",
                boxShadow: s.n===step ? "0 0 0 4px rgba(5,150,105,.15)" : "none",
                transition:"all .25s",
              }}>
                {s.n < step
                  ? <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <Ic d={s.icon} s={12} c={s.n===step ? "#fff" : "#CBD5E1"}/>
                }
              </div>
              <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Geist Mono',monospace", letterSpacing:".04em", color: s.n===step ? "#059669" : s.n<step ? "#064E3B" : "#CBD5E1", whiteSpace:"nowrap" }}>
                {s.label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content card */}
      <div className="card" style={{ overflow:"hidden" }}>
        <div ref={contentRef} className="step-content" key={step} style={{ padding:28, display:"flex", flexDirection:"column", gap:16 }}>

          {/* STEP 1 — Empresa */}
          {step===1 && <>
            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", marginBottom:3 }}>Datos de la empresa</div>
              <div style={{ fontSize:12, color:"#94A3B8" }}>Información fiscal y domicilio registrado ante el SAT</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FInput label="Nombre comercial" value={form.company_name} onChange={v=>upd("company_name",v)} placeholder="Ej: Grupo XYZ" required/>
              <FInput label="Razón social" value={form.company_razon_social} onChange={v=>upd("company_razon_social",v)} placeholder="S.A. de C.V." required hint="Como aparece en el acta"/>
              <FInput label="RFC empresa" value={form.company_rfc} onChange={v=>upd("company_rfc",v.toUpperCase())} placeholder="GIX900101ABC" maxLength={13} error={rfcErr} required/>
              <FSelect label="Régimen fiscal" value={form.company_regimen_fiscal} onChange={v=>upd("company_regimen_fiscal",v)} options={[
                {value:"601",label:"601 · General Ley Personas Morales"},
                {value:"612",label:"612 · Act. Empresariales y Profesionales"},
                {value:"626",label:"626 · Régimen Simplificado de Confianza"},
                {value:"603",label:"603 · Sin Fines Lucrativos"},
                {value:"620",label:"620 · Cooperativas de Producción"},
              ]}/>
              <FSelect label="Giro / Actividad" value={form.company_giro} onChange={v=>upd("company_giro",v)} required options={[
                {value:"Comercio al por mayor",label:"Comercio al por mayor"},
                {value:"Comercio al por menor",label:"Comercio al por menor"},
                {value:"Manufactura",label:"Manufactura / Producción"},
                {value:"Servicios profesionales",label:"Servicios profesionales"},
                {value:"Construcción",label:"Construcción"},
                {value:"Tecnología",label:"Tecnología / Software"},
                {value:"Agro / Alimentos",label:"Agro / Alimentos"},
                {value:"Salud",label:"Salud / Farmacéutica"},
                {value:"Transporte",label:"Transporte / Logística"},
                {value:"Financiero",label:"Servicios financieros"},
                {value:"Otro",label:"Otro"},
              ]}/>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#64748B", fontFamily:"'Geist',sans-serif", letterSpacing:".02em" }}>Fecha de constitución</label>
                <input type="date" value={form.company_fecha_constitucion} onChange={e=>upd("company_fecha_constitucion",e.target.value)}
                  style={{ height:48, borderRadius:12, border:"1.5px solid #DDE5F7", background:"#F8FAFF", padding:"0 14px", fontSize:14, color:"#0F172A", fontFamily:"'Geist',sans-serif", outline:"none", width:"100%" }}/>
              </div>
            </div>
            <div style={{ borderTop:"1px dashed #E2E8F0", paddingTop:16, marginTop:4 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".08em", marginBottom:12 }}>DOMICILIO FISCAL</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <FSelect label="Estado" value={form.company_state} onChange={v=>upd("company_state",v)} required options={
                  ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"].map(s=>({value:s,label:s}))
                }/>
                <FInput label="Municipio / Alcaldía" value={form.company_municipio} onChange={v=>upd("company_municipio",v)} placeholder="Ej: Monterrey"/>
                <FInput label="Colonia" value={form.company_colonia} onChange={v=>upd("company_colonia",v)} placeholder="Ej: Del Valle"/>
                <FInput label="Código postal" value={form.company_cp} onChange={v=>upd("company_cp",v.replace(/\D/g,""))} placeholder="64000" maxLength={5}/>
                <div style={{ gridColumn:"1/-1" }}>
                  <FInput label="Calle y número" value={form.company_calle} onChange={v=>upd("company_calle",v)} placeholder="Av. Insurgentes 123 Int. 4B"/>
                </div>
              </div>
            </div>
          </>}

          {/* STEP 2 — Rep Legal */}
          {step===2 && <>
            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", marginBottom:3 }}>Representante legal</div>
              <div style={{ fontSize:12, color:"#94A3B8" }}>Persona que firmará los contratos de crédito</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FInput label="Nombre(s)" value={form.rep_first_names} onChange={v=>upd("rep_first_names",v)} placeholder="Juan Carlos" required/>
              <FInput label="Apellidos" value={form.rep_last_name} onChange={v=>upd("rep_last_name",v)} placeholder="García Martínez" required/>
              <FSelect label="Cargo" value={form.rep_cargo} onChange={v=>upd("rep_cargo",v)} required options={[
                {value:"Director General",label:"Director General / CEO"},
                {value:"Apoderado Legal",label:"Apoderado Legal"},
                {value:"Administrador Único",label:"Administrador Único"},
                {value:"Socio",label:"Socio / Accionista"},
                {value:"Presidente del Consejo",label:"Presidente del Consejo"},
                {value:"Otro",label:"Otro"},
              ]}/>
              <FInput label="Email personal" value={form.rep_email} onChange={v=>upd("rep_email",v)} type="email" placeholder="rep@empresa.com" required/>
              <FInput label="RFC personal" value={form.rep_rfc} onChange={v=>upd("rep_rfc",v.toUpperCase())} placeholder="GAMA900101XYZ" maxLength={13} error={repRfcErr} required/>
              <FInput label="CURP" value={form.rep_curp} onChange={v=>upd("rep_curp",v.toUpperCase())} placeholder="GAMA900101HDFLRN09" maxLength={18} error={curpErr} required/>
              <div style={{ gridColumn:"1/-1" }}>
                <FInput label="Teléfono celular" value={form.rep_phone} onChange={v=>upd("rep_phone",v.replace(/\D/g,""))} placeholder="55 1234 5678" maxLength={10} prefix="+52" hint="10 dígitos incluyendo LADA" required/>
              </div>
            </div>
            <div style={{ padding:"13px 16px", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12, fontSize:12, color:"#92400E", lineHeight:1.7 }}>
              <strong>Nota:</strong> El representante debe tener poderes notariales vigentes para contratar a nombre de la empresa.
            </div>
          </>}

          {/* STEP 3 — Financiero */}
          {step===3 && <>
            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", marginBottom:3 }}>Información financiera</div>
              <div style={{ fontSize:12, color:"#94A3B8" }}>Ayuda a los otorgantes a evaluar tu solicitud</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FSelect label="Facturación anual (MXN)" value={form.fin_facturacion_anual} onChange={v=>upd("fin_facturacion_anual",v)} required options={[
                {value:"menos_1m",label:"Menos de $1M"},
                {value:"1m_5m",label:"$1M – $5M"},
                {value:"5m_20m",label:"$5M – $20M"},
                {value:"20m_50m",label:"$20M – $50M"},
                {value:"50m_100m",label:"$50M – $100M"},
                {value:"mas_100m",label:"Más de $100M"},
              ]}/>
              <FSelect label="Antigüedad de la empresa" value={form.fin_antiguedad} onChange={v=>upd("fin_antiguedad",v)} required options={[
                {value:"menos_1",label:"Menos de 1 año"},
                {value:"1_2",label:"1 – 2 años"},
                {value:"2_5",label:"2 – 5 años"},
                {value:"5_10",label:"5 – 10 años"},
                {value:"mas_10",label:"Más de 10 años"},
              ]}/>
              <FSelect label="Número de empleados" value={form.fin_num_empleados} onChange={v=>upd("fin_num_empleados",v)} required options={[
                {value:"1_10",label:"1 – 10"},
                {value:"11_50",label:"11 – 50"},
                {value:"51_200",label:"51 – 200"},
                {value:"201_500",label:"201 – 500"},
                {value:"mas_500",label:"Más de 500"},
              ]}/>
              <FSelect label="Sector" value={form.fin_sector} onChange={v=>upd("fin_sector",v)} required options={[
                {value:"comercio",label:"Comercio"},
                {value:"manufactura",label:"Manufactura"},
                {value:"servicios",label:"Servicios"},
                {value:"construccion",label:"Construcción"},
                {value:"tecnologia",label:"Tecnología"},
                {value:"agro",label:"Agro / Alimentos"},
                {value:"salud",label:"Salud"},
                {value:"transporte",label:"Transporte / Logística"},
                {value:"educacion",label:"Educación"},
                {value:"otro",label:"Otro"},
              ]}/>
              <FSelect label="Banco principal" value={form.fin_banco} onChange={v=>upd("fin_banco",v)} options={
                ["BBVA","Banorte","Santander","HSBC","Citibanamex","Scotiabank","Inbursa","BanBajío","Bansí","Multiva","Afirme","Mifel","Intercam","Otro"].map(b=>({value:b,label:b}))
              }/>
              <FInput label="CLABE interbancaria" value={form.fin_clabe} onChange={v=>upd("fin_clabe",v.replace(/\D/g,""))} placeholder="18 dígitos" maxLength={18} error={clabeErr}
                hint={form.fin_clabe.length > 0 ? `${form.fin_clabe.length}/18${form.fin_clabe.length===18?" ✓":""}` : "Se usará para el depósito del crédito"}/>
            </div>
          </>}

          {/* STEP 4 — Documentos */}
          {step===4 && <>
            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", marginBottom:3 }}>Documentos</div>
              <div style={{ fontSize:12, color:"#94A3B8" }}>Todos opcionales — entre más subas, mejores ofertas recibirás</div>
            </div>

            {/* Boost banner */}
            <div style={{ padding:"12px 14px", background:"linear-gradient(135deg,#ECFDF5,#F0FDF9)", border:"1px solid #6EE7B7", borderRadius:12, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"#059669", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Ic d="M2 12L6 7l3 3 3-4 2 2" s={14} c="#fff"/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#065F46" }}>Perfil verificado = más visibilidad</div>
                <div style={{ fontSize:11, color:"#059669", marginTop:1 }}>Los otorgantes prefieren solicitudes con documentos adjuntos. Puedes subirlos después.</div>
              </div>
            </div>

            {/* Compact list */}
            <div style={{ border:"1px solid #E8EDF5", borderRadius:12, overflow:"hidden" }}>
              {[
                { doc:"Acta constitutiva",             desc:"Con notario y sello de registro" },
                { doc:"Poderes notariales",             desc:"Rep. legal vigentes" },
                { doc:"Identificación oficial",         desc:"INE o pasaporte del rep. legal" },
                { doc:"Constancia situación fiscal",    desc:"Portal del SAT" },
                { doc:"Estados de cuenta (3 meses)",    desc:"Cuenta principal empresa" },
                { doc:"Comprobante de domicilio",       desc:"No mayor a 3 meses" },
                { doc:"Declaración anual",              desc:"Último ejercicio fiscal" },
                { doc:"Estados financieros",            desc:"Balance y resultados" },
              ].map((item,i,arr)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom: i<arr.length-1?"1px solid #F1F5F9":"none", background:"#fff" }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#A7F3D0", flexShrink:0 }}/>
                  <span style={{ fontSize:13, fontWeight:600, flex:1 }}>{item.doc}</span>
                  <span style={{ fontSize:11, color:"#94A3B8" }}>{item.desc}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:"11px 14px", background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, fontSize:12, color:"#1E40AF" }}>
              La carga estará disponible pronto. Continúa para enviar tu perfil a revisión.
            </div>
          </>}

          {/* STEP 5 — Resumen */}
          {step===5 && <>
            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", marginBottom:3 }}>Todo listo</div>
              <div style={{ fontSize:12, color:"#94A3B8" }}>Revisa y envía tu perfil a verificación</div>
            </div>
            <div style={{ marginBottom:8 }}>
              <ProfileProgress form={form}/>
            </div>
            {[
              { title:"Empresa", rows:[["Empresa",form.company_name],["RFC",form.company_rfc],["Giro",form.company_giro],["Estado",form.company_state]] },
              { title:"Rep. Legal", rows:[["Nombre",[form.rep_first_names,form.rep_last_name].filter(Boolean).join(" ")],["Cargo",form.rep_cargo],["RFC",form.rep_rfc]] },
              { title:"Finanzas", rows:[["Facturación",form.fin_facturacion_anual],["Sector",form.fin_sector],["Banco",form.fin_banco]] },
            ].map(sec=>(
              <div key={sec.title} style={{ border:"1px solid #E8EDF5", borderRadius:12, overflow:"hidden" }}>
                <div style={{ padding:"9px 14px", background:"#F8FAFC", borderBottom:"1px solid #E8EDF5", fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", color:"#64748B", letterSpacing:".08em" }}>
                  {sec.title.toUpperCase()}
                </div>
                <div style={{ padding:"4px 14px" }}>
                  {sec.rows.map(([lbl,val])=>(
                    <div key={lbl} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #F8FAFC" }}>
                      <span style={{ fontSize:12, color:"#64748B" }}>{lbl}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:val?"#0F172A":"#CBD5E1" }}>{val||"—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ padding:"16px 18px", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#065F46", marginBottom:6 }}>¿Qué pasa después?</div>
              <div style={{ fontSize:12, color:"#065F46", lineHeight:1.9 }}>
                1. Revisamos tu información en 1-3 días hábiles<br/>
                2. Recibirás email de confirmación<br/>
                3. Con KYC aprobado, tus solicitudes tendrán mayor visibilidad
              </div>
            </div>
          </>}
        </div>

        {/* Footer nav */}
        <div style={{ padding:"16px 28px", borderTop:"1px solid #F1F5F9", background:"#FAFBFF", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <button className="btn-ghost" onClick={()=>step>1?goBack():setMode("view")}>
            <Ic d="M9.5 1.5L5 6l4.5 4.5" s={12}/> {step===1?"Cancelar":"Atrás"}
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button className={`btn-save${saved_ok?" ok":""}`} disabled={saving} onClick={saveStep}>
              {saved_ok
                ? <><Ic d="M2 8l4 4 8-8" s={13} c="#065F46"/> Guardado</>
                : saving ? "Guardando..." : "Guardar avance"
              }
            </button>
            {step < 5
              ? <button className="btn-main" onClick={goNext} disabled={saving}>
                  Continuar <Ic d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" s={13} c="#fff"/>
                </button>
              : <button className="btn-main" disabled={saving} onClick={submitKYC}>
                  {saving
                    ? <><svg className="spinner" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Enviando...</>
                    : <>Enviar a revisión <Ic d="M2 8l4 4 8-8" s={13} c="#fff"/></>
                  }
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
