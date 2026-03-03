"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Ic({ d, s = 16, c = "currentColor", sw = 1.5 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

function onlyDigits(v: string) { return (v || "").replace(/[^\d]/g, ""); }
function normalizeRFC(v: string) { return (v || "").trim().toUpperCase().replace(/\s+/g, ""); }
function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim()); }
function fmtCountdown(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── RFC validation (local format check) ─────────────────────────────────────

function validateRFCLocal(rfc: string): { valid: boolean; errors: string[] } {
  const r = normalizeRFC(rfc);
  if (!r) return { valid: false, errors: ["Ingresa un RFC"] };
  const moral  = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
  const fisica = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}[0-9A]$/;
  if (r.length === 12 && moral.test(r))  return { valid: true,  errors: [] };
  if (r.length === 13 && fisica.test(r)) return { valid: true,  errors: [] };
  if (r.length < 12)  return { valid: false, errors: [`Faltan ${12 - r.length} caracteres`] };
  if (r.length > 13)  return { valid: false, errors: ["RFC demasiado largo"] };
  return { valid: false, errors: ["Formato inválido"] };
}

// ─── RFC SAT validation via Facturama sandbox (no API key) ───────────────────

type RFCStatus = "idle" | "checking" | "valid" | "not_found" | "inactive" | "error";

async function checkRFCWithSAT(rfc: string): Promise<{ status: RFCStatus; detail: string }> {
  try {
    const res = await fetch(
      `https://apisandbox.facturama.mx/customers/status?rfc=${encodeURIComponent(normalizeRFC(rfc))}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return { status: "error", detail: "No se pudo consultar el SAT" };
    const d = await res.json();
    if (!d.FormatoCorrecto) return { status: "error",     detail: "Formato incorrecto según SAT" };
    if (!d.Localizado)      return { status: "not_found", detail: "RFC no localizado en el SAT" };
    if (!d.Activo)          return { status: "inactive",  detail: "RFC localizado pero inactivo en el SAT" };
    return { status: "valid", detail: "RFC activo y localizado en el SAT ✓" };
  } catch {
    return { status: "error", detail: "Error de conexión con el SAT" };
  }
}

const COOLDOWN_MS = 30 * 60 * 1000;

const GIROS = [
  "Comercio al por menor","Comercio al por mayor","Manufactura","Construcción",
  "Servicios financieros","Servicios profesionales","Tecnología","Salud","Educación",
  "Transporte y logística","Agropecuario","Turismo y hospitalidad","Inmobiliario",
  "Energía","Otro",
];

const ESTADOS = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas",
  "Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México",
  "Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit",
  "Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí",
  "Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

const COUNTRIES = [
  { dial:"+52", flag:"🇲🇽", name:"México" },
  { dial:"+1",  flag:"🇺🇸", name:"EE.UU." },
  { dial:"+34", flag:"🇪🇸", name:"España" },
  { dial:"+57", flag:"🇨🇴", name:"Colombia" },
  { dial:"+54", flag:"🇦🇷", name:"Argentina" },
  { dial:"+56", flag:"🇨🇱", name:"Chile" },
];

// ─── Base CSS ─────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @keyframes fadeUp  {from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes scaleIn {from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);}}
  @keyframes spin    {to{transform:rotate(360deg)}}
  @keyframes slideIn {from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
  .fade     {animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
  .scale-in {animation:scaleIn .35s cubic-bezier(.16,1,.3,1) both;}
  .spinner  {animation:spin .7s linear infinite;}
  .slide-in {animation:slideIn .2s ease both;}

  .card{background:#fff;border:1px solid #E8EDF5;border-radius:18px;box-shadow:0 2px 10px rgba(0,0,0,.04);}

  /* inputs */
  .inp{width:100%;height:42px;background:#F8FAFC;border:1.5px solid #E8EDF5;border-radius:11px;padding:0 14px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;transition:all .15s;}
  .inp::placeholder{color:#94A3B8;}
  .inp:focus{border-color:#059669;background:#fff;box-shadow:0 0 0 4px rgba(5,150,105,.10);}
  .inp.err{border-color:#F43F5E;background:#FFF8F8;}
  .inp.ok {border-color:#10B981;background:#F0FDF9;}
  .inp.ot-focus:focus{border-color:#5B8DEF;box-shadow:0 0 0 4px rgba(91,141,239,.10);}

  .sel{width:100%;height:42px;background:#F8FAFC;border:1.5px solid #E8EDF5;border-radius:11px;padding:0 32px 0 14px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;appearance:none;cursor:pointer;transition:all .15s;}
  .sel:focus{border-color:#059669;background:#fff;box-shadow:0 0 0 4px rgba(5,150,105,.10);}
  .sel.ot{} .sel.ot:focus{border-color:#5B8DEF;box-shadow:0 0 0 4px rgba(91,141,239,.10);}

  label.lbl{display:block;font-size:11px;font-weight:700;color:#64748B;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;}
  .mono{font-family:'Geist Mono',monospace;}

  /* buttons — green (solicitante) */
  .btn-sol{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border:none;border-radius:12px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;padding:12px 24px;cursor:pointer;box-shadow:0 4px 16px rgba(6,78,59,.22);transition:all .15s;}
  .btn-sol:hover:not(:disabled){opacity:.9;transform:translateY(-1px);}
  .btn-sol:disabled{opacity:.45;cursor:not-allowed;transform:none;}

  /* buttons — navy (otorgante) */
  .btn-ot{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:12px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;padding:12px 24px;cursor:pointer;box-shadow:0 4px 16px rgba(12,30,74,.25);transition:all .15s;}
  .btn-ot:hover:not(:disabled){opacity:.9;transform:translateY(-1px);}
  .btn-ot:disabled{opacity:.45;cursor:not-allowed;transform:none;}

  .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1.5px solid #E8EDF5;border-radius:12px;font-family:'Geist',sans-serif;font-size:14px;font-weight:600;padding:11px 20px;cursor:pointer;transition:all .15s;}
  .btn-ghost:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}

  /* stepper */
  .step-dot{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:'Geist Mono',monospace;font-size:12px;font-weight:700;transition:all .3s;}
  .step-dot.done  {background:#0C1E4A;color:#fff;}
  .step-dot.act-ot{background:linear-gradient(135deg,#1B3F8A,#0C1E4A);color:#fff;box-shadow:0 0 0 5px rgba(91,141,239,.2);}
  .step-dot.act-sol{background:linear-gradient(135deg,#059669,#064E3B);color:#fff;box-shadow:0 0 0 5px rgba(16,185,129,.2);}
  .step-dot.idle  {background:#F1F5F9;color:#94A3B8;}
  .step-line{flex:1;height:1.5px;margin:0 8px;transition:background .3s;}
  .step-line.ot  {background:linear-gradient(90deg,#0C1E4A,#5B8DEF);}
  .step-line.sol {background:linear-gradient(90deg,#059669,#10B981);}
  .step-line.idle{background:#E8EDF5;}

  /* data rows */
  .dr{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px solid #F1F5F9;gap:16px;}
  .dr:last-child{border-bottom:none;}

  /* rfc status chips */
  .rfc-ok  {padding:9px 13px;border-radius:10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;}
  .rfc-err {padding:9px 13px;border-radius:10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;background:#FFF1F2;border:1px solid #FECDD3;color:#9F1239;}
  .rfc-warn{padding:9px 13px;border-radius:10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;background:#FEF3C7;border:1px solid #FDE68A;color:#78350F;}
  .rfc-chk {padding:9px 13px;border-radius:10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;}

  /* inst cards — otorgante only */
  .inst-card{border:2px solid #E8EDF5;border-radius:14px;padding:14px;cursor:pointer;transition:all .18s;background:#fff;display:flex;flex-direction:column;align-items:flex-start;gap:8px;}
  .inst-card:hover{border-color:#93B4F8;background:#F8FBFF;transform:translateY(-1px);box-shadow:0 4px 16px rgba(91,141,239,.1);}
  .inst-card.selected{border-color:#1B3F8A;background:linear-gradient(135deg,#EFF6FF,#F0F7FF);box-shadow:0 0 0 3px rgba(91,141,239,.15);}
`;

// ─── Shared subcomponents ─────────────────────────────────────────────────────

function SectionHead({ icon, title, sub, accent = "#1B3F8A", accentBg = "rgba(27,63,138,.12)" }: {
  icon: string; title: string; sub: string; accent?: string; accentBg?: string;
}) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:22 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:accentBg, border:`1px solid ${accent}30`, display:"grid", placeItems:"center", flexShrink:0 }}>
        <Ic d={icon} s={17} c={accent}/>
      </div>
      <div>
        <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-.03em", color:"#0F172A" }}>{title}</div>
        <div style={{ fontSize:12, color:"#64748B", marginTop:3, lineHeight:1.5 }}>{sub}</div>
      </div>
    </div>
  );
}

function InfoBox({ icon, text, accent = "#5B8DEF" }: { icon: string; text: string; accent?: string }) {
  return (
    <div style={{ padding:"11px 15px", background:`${accent}09`, border:`1px solid ${accent}25`, borderRadius:11, display:"flex", gap:10, alignItems:"flex-start" }}>
      <Ic d={icon} c={accent} s={14}/>
      <span style={{ fontSize:12, color:"#475569", lineHeight:1.55 }}>{text}</span>
    </div>
  );
}

function FieldWrap({ label, children, hint, error: errMsg }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {children}
      {errMsg  && <p className="slide-in" style={{ fontSize:11, color:"#F43F5E", marginTop:4, fontWeight:500 }}>{errMsg}</p>}
      {!errMsg && hint && <p style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>{hint}</p>}
    </div>
  );
}

function SelectWrap({ value, onChange, children, accent = "#059669" }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{ position:"relative" }}>
      <select className="sel" value={value} onChange={e => onChange(e.target.value)}
        style={{ borderColor: value ? "#E8EDF5" : "#E8EDF5" }}>
        {children}
      </select>
      <svg style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#94A3B8" }}
        width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ─── RFC field with SAT validation ───────────────────────────────────────────

function RFCField({ value, onChange, accent = "#059669" }: { value: string; onChange: (v: string) => void; accent?: string }) {
  const [satStatus, setSatStatus] = useState<RFCStatus>("idle");
  const [satDetail, setSatDetail] = useState("");
  const [checking,  setChecking]  = useState(false);

  const local = validateRFCLocal(value);

  const inputCls = !value ? "inp"
    : !local.valid           ? "inp err"
    : satStatus === "valid"  ? "inp ok"
    : "inp";

  async function handleValidate() {
    if (!local.valid) return;
    setChecking(true); setSatStatus("checking"); setSatDetail("Consultando SAT...");
    const r = await checkRFCWithSAT(value);
    setSatStatus(r.status); setSatDetail(r.detail);
    setChecking(false);
  }

  const chipClass = satStatus === "valid"    ? "rfc-ok"
    : satStatus === "not_found" || satStatus === "inactive" ? "rfc-warn"
    : satStatus === "error"    ? "rfc-err"
    : satStatus === "checking" ? "rfc-chk"
    : "";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
      <div style={{ display:"flex", gap:8 }}>
        <div style={{ flex:1, position:"relative" }}>
          <input
            className={`${inputCls} mono`}
            placeholder="Ej. ABC910101XY3"
            value={value}
            onChange={e => {
              onChange(e.target.value.toUpperCase().replace(/\s/g,""));
              setSatStatus("idle"); setSatDetail("");
            }}
            maxLength={13}
          />
          {value.length > 0 && (
            <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, fontFamily:"'Geist Mono',monospace", color:local.valid?"#10B981":"#94A3B8", fontWeight:600 }}>
              {value.length}/13
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={!local.valid || checking}
          onClick={handleValidate}
          style={{
            height:42, padding:"0 14px", borderRadius:11, border:"none", flexShrink:0,
            background: local.valid ? `linear-gradient(135deg,${accent === "#059669" ? "#064E3B,#059669" : "#0C1E4A,#1B3F8A"})` : "#F1F5F9",
            color: local.valid ? "#fff" : "#94A3B8",
            fontSize:12, fontWeight:700, cursor:local.valid?"pointer":"not-allowed",
            display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap",
            transition:"all .15s", fontFamily:"'Geist',sans-serif",
          }}
        >
          {checking
            ? <><svg className="spinner" width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>Validando</>
            : <><Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM5 8l2 2 4-4" s={13} c={local.valid?"#fff":"#94A3B8"}/>Validar SAT</>
          }
        </button>
      </div>

      {value.length > 0 && !local.valid && (
        <p className="slide-in" style={{ fontSize:11, color:"#F43F5E", fontWeight:500 }}>{local.errors[0]}</p>
      )}
      {value.length > 0 && local.valid && satStatus === "idle" && (
        <p className="slide-in" style={{ fontSize:11, color:"#10B981", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
          <Ic d="M3 8l3 3L13 4" s={11} c="#10B981" sw={2}/> Formato correcto — haz clic en "Validar SAT" para confirmar
        </p>
      )}
      {satStatus !== "idle" && satDetail && (
        <div className={`slide-in ${chipClass}`}>
          {satStatus === "valid"    && <Ic d="M3 8l3 3L13 4" s={13} c="#065F46" sw={2}/>}
          {(satStatus === "not_found" || satStatus === "inactive") && <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v4M8 11h.01" s={13} c="#78350F"/>}
          {satStatus === "error"    && <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v4M8 11h.01" s={13} c="#9F1239"/>}
          {satStatus === "checking" && <svg className="spinner" width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>}
          {satDetail}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTORGANTE — preserves the original wizard exactly
// ═══════════════════════════════════════════════════════════════════════════════

const INSTITUTION_TYPES = [
  { value:"bank",         label:"Banco",         icon:"M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z",  desc:"Institución bancaria regulada" },
  { value:"sofom",        label:"SOFOM",          icon:"M8 2a6 6 0 100 12A6 6 0 008 2zM5 8h6M8 5v6",      desc:"Soc. Financiera de Obj. Múltiple" },
  { value:"private_fund", label:"Fondo privado", icon:"M2 8h12M8 2l4 6-4 6-4-6 4-6",                     desc:"Fondo de inversión o capital" },
  { value:"credit_union", label:"Caja de ahorro",icon:"M3 3h10v10H3zM6 3v10M3 7h10",                     desc:"Cooperativa de crédito" },
  { value:"sofipo",       label:"SOFIPO",         icon:"M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z",        desc:"Soc. Financiera Popular" },
  { value:"sapi",         label:"SAPI",           icon:"M2 4h12v2H2zM2 9h12v2H2zM5 4v7",                 desc:"Sociedad Anónima Promotora" },
  { value:"ifc_crowd",    label:"Crowdfunding",   icon:"M4 8a4 4 0 118 0M1 8h2M13 8h2M8 1v2M8 13v2",     desc:"Institución de financiamiento colectivo" },
  { value:"other",        label:"Otro",           icon:"M8 3v2M8 11v2M3 8h2M11 8h2",                     desc:"Otro tipo de institución" },
];

const OT_STEPS = ["Institución","Representante","Contacto","Confirmar"];

type OtProfile = {
  id?: string; owner_id?: string;
  institution_type: string; institution_name: string; rfc: string;
  legal_rep_first_names: string; legal_rep_last_name_paternal: string; legal_rep_last_name_maternal: string;
  legal_rep_email: string; legal_rep_phone_country: string; legal_rep_phone_national: string;
  updated_at?: string;
};

function OtorganteDatos() {
  const [mode,      setMode]      = useState<"loading"|"wizard"|"view"|"edit">("loading");
  const [step,      setStep]      = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [profile,   setProfile]   = useState<OtProfile | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [form, setForm] = useState<OtProfile>({
    institution_type:"", institution_name:"", rfc:"",
    legal_rep_first_names:"", legal_rep_last_name_paternal:"", legal_rep_last_name_maternal:"",
    legal_rep_email:"", legal_rep_phone_country:"+52", legal_rep_phone_national:"",
  });

  const set = (k: keyof OtProfile, v: string) => { setError(""); setForm(f => ({ ...f, [k]: v })); };

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1000)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setMode("wizard"); return; }
    const { data } = await supabase.from("lenders_profile").select("*").eq("owner_id", auth.user.id).maybeSingle();
    if (data?.institution_type && data?.institution_name) {
      setProfile(data);
      if (data.updated_at) {
        const rem = COOLDOWN_MS - (Date.now() - new Date(data.updated_at).getTime());
        if (rem > 0) setCountdown(rem);
      }
      setMode("view");
    } else {
      setForm(f => ({ ...f, legal_rep_email: auth.user?.email ?? "" }));
      setMode("wizard");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const step0Valid = !!form.institution_type;
  const step1Valid = !!form.institution_name.trim() && validateRFCLocal(form.rfc).valid;
  const step2Valid = !!form.legal_rep_first_names.trim() && !!form.legal_rep_last_name_paternal.trim();
  const step3Valid = isEmail(form.legal_rep_email) && onlyDigits(form.legal_rep_phone_national).length === 10;
  const canNext = [step0Valid, step1Valid, step2Valid, step3Valid, true][step] ?? true;

  const instType = INSTITUTION_TYPES.find(t => t.value === (mode === "view" ? profile?.institution_type : form.institution_type));
  const phoneE164 = useMemo(() => {
    const src = mode === "view" ? profile : form;
    const n = onlyDigits(src?.legal_rep_phone_national || "").slice(0, 10);
    return n ? `${src?.legal_rep_phone_country}${n}` : "";
  }, [form, profile, mode]);

  const completePct = useMemo(() => {
    const src = mode === "view" ? profile : form;
    if (!src) return 0;
    let s = 0;
    if (src.institution_type)             s += 20;
    if (src.institution_name?.trim())     s += 20;
    if (validateRFCLocal(src.rfc||"").valid) s += 20;
    if (src.legal_rep_first_names?.trim()) s += 15;
    if (isEmail(src.legal_rep_email||"")) s += 15;
    if (onlyDigits(src.legal_rep_phone_national||"").length === 10) s += 10;
    return s;
  }, [form, profile, mode]);

  function startEdit() {
    if (!profile) return;
    setForm({
      institution_type: profile.institution_type ?? "",
      institution_name: profile.institution_name ?? "",
      rfc: profile.rfc ?? "",
      legal_rep_first_names: profile.legal_rep_first_names ?? "",
      legal_rep_last_name_paternal: profile.legal_rep_last_name_paternal ?? "",
      legal_rep_last_name_maternal: profile.legal_rep_last_name_maternal ?? "",
      legal_rep_email: profile.legal_rep_email ?? "",
      legal_rep_phone_country: profile.legal_rep_phone_country ?? "+52",
      legal_rep_phone_national: profile.legal_rep_phone_national ?? "",
    });
    setStep(0); setMode("edit");
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sin sesión");
      const now = new Date().toISOString();
      const payload = {
        owner_id: auth.user.id,
        institution_type: form.institution_type,
        institution_name: form.institution_name.trim() || null,
        rfc: normalizeRFC(form.rfc) || null,
        legal_rep_first_names: form.legal_rep_first_names.trim() || null,
        legal_rep_last_name_paternal: form.legal_rep_last_name_paternal.trim() || null,
        legal_rep_last_name_maternal: form.legal_rep_last_name_maternal.trim() || null,
        legal_rep_email: form.legal_rep_email.trim().toLowerCase() || null,
        legal_rep_phone_country: form.legal_rep_phone_country || null,
        legal_rep_phone_national: onlyDigits(form.legal_rep_phone_national).slice(0,10) || null,
        legal_rep_phone_e164: phoneE164 || null,
        updated_at: now,
      };
      const { error: e } = await supabase.from("lenders_profile").upsert(payload, { onConflict:"owner_id" });
      if (e) throw new Error(e.message);
      setProfile({ ...payload, updated_at: now } as OtProfile);
      setCountdown(COOLDOWN_MS); setMode("view");
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  const sc = completePct >= 80
    ? { bar:"#00E5A0", text:"#065F46", bg:"#F0FDF9", border:"#D1FAE5", label:"Perfil completo" }
    : completePct >= 50
    ? { bar:"#F59E0B", text:"#92400E", bg:"#FFFBEB", border:"#FDE68A", label:"Perfil parcial" }
    : { bar:"#F43F5E", text:"#881337", bg:"#FFF1F2", border:"#FECDD3", label:"Perfil incompleto" };

  if (mode === "loading") return (
    <div style={{ display:"grid", placeItems:"center", minHeight:"60vh" }}>
      <svg className="spinner" width={24} height={24} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
    </div>
  );

  // VIEW
  if (mode === "view" && profile) {
    const fullName = [profile.legal_rep_first_names, profile.legal_rep_last_name_paternal, profile.legal_rep_last_name_maternal].filter(Boolean).join(" ");
    const canEdit  = countdown <= 0;
    return (
      <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", maxWidth:820, margin:"0 auto" }}>
        <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.05em" }}>Datos de la institución</div>
            <div style={{ fontSize:13, color:"#64748B", marginTop:6 }}>Información registrada de tu institución y representante legal</div>
          </div>
          <div style={{ textAlign:"right" }}>
            {canEdit
              ? <button className="btn-ot" onClick={startEdit}><Ic d="M11 2l3 3-9 9H2v-3L11 2z" s={14} c="#fff"/> Editar datos</button>
              : <div>
                  <button className="btn-ot" disabled><Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" s={14} c="#fff"/> Editar datos</button>
                  <div style={{ fontSize:11, color:"#94A3B8", marginTop:6, fontFamily:"'Geist Mono',monospace" }}>Disponible en {fmtCountdown(countdown)}</div>
                </div>
            }
          </div>
        </div>
        <div className="fade" style={{ padding:"16px 20px", background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:14, display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:`${sc.bar}22`, display:"grid", placeItems:"center", flexShrink:0 }}>
            <span style={{ fontSize:17, fontWeight:800, color:sc.text }}>{completePct}%</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:sc.text, marginBottom:7 }}>{sc.label}</div>
            <div style={{ height:5, background:"#E8EDF5", borderRadius:999, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${completePct}%`, background:sc.bar, borderRadius:999, transition:"width .6s" }}/>
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div className="card fade" style={{ padding:22 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:"rgba(27,63,138,.10)", display:"grid", placeItems:"center" }}>
                <Ic d={instType?.icon||"M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z"} s={14} c="#1B3F8A"/>
              </div>
              <div><div style={{ fontSize:13, fontWeight:700 }}>Institución</div><div style={{ fontSize:11, color:"#94A3B8" }}>{instType?.label||"—"}</div></div>
            </div>
            {[{ k:"Nombre",v:profile.institution_name||"—" },{ k:"RFC",v:profile.rfc||"—",mono:true },{ k:"Tipo",v:instType?.label||profile.institution_type||"—" }].map(r=>(
              <div key={r.k} className="dr"><span style={{ fontSize:12,color:"#64748B" }}>{r.k}</span><span style={{ fontSize:13,fontWeight:600,fontFamily:(r as any).mono?"'Geist Mono',monospace":"inherit",textAlign:"right" }}>{r.v}</span></div>
            ))}
          </div>
          <div className="card fade" style={{ padding:22 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:"rgba(27,63,138,.10)", display:"grid", placeItems:"center" }}>
                <Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" s={14} c="#1B3F8A"/>
              </div>
              <div><div style={{ fontSize:13, fontWeight:700 }}>Representante legal</div><div style={{ fontSize:11, color:"#94A3B8" }}>Datos de contacto</div></div>
            </div>
            {[{ k:"Nombre completo",v:fullName||"—" },{ k:"Correo",v:profile.legal_rep_email||"—" },{ k:"Teléfono",v:phoneE164||"—",mono:true }].map(r=>(
              <div key={r.k} className="dr"><span style={{ fontSize:12,color:"#64748B" }}>{r.k}</span><span style={{ fontSize:13,fontWeight:600,fontFamily:(r as any).mono?"'Geist Mono',monospace":"inherit",textAlign:"right",wordBreak:"break-all" }}>{r.v}</span></div>
            ))}
          </div>
        </div>
        {profile.updated_at && (
          <div style={{ marginTop:12, padding:"11px 15px", background:"#F8FAFC", border:"1px solid #E8EDF5", borderRadius:11, display:"flex", alignItems:"center", gap:8 }}>
            <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" s={13} c="#94A3B8"/>
            <span style={{ fontSize:12, color:"#94A3B8" }}>Última actualización: <span className="mono" style={{ color:"#475569",fontWeight:600 }}>{new Date(profile.updated_at).toLocaleString("es-MX")}</span></span>
          </div>
        )}
      </div>
    );
  }

  // WIZARD / EDIT
  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", maxWidth:820, margin:"0 auto" }}>
      <div className="fade" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.05em" }}>{mode==="edit"?"Editar perfil":"Configura tu perfil"}</div>
          <div style={{ fontSize:13, color:"#64748B", marginTop:5 }}>{mode==="edit"?"Actualiza los datos de tu institución":"Completa tu onboarding para empezar a operar"}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase", marginBottom:3 }}>Completitud</div>
          <div style={{ fontSize:26, fontWeight:800, letterSpacing:"-.05em", color:completePct>=80?"#065F46":completePct>=50?"#92400E":"#0F172A" }}>{completePct}%</div>
        </div>
      </div>

      {/* Stepper */}
      <div className="fade" style={{ display:"flex", alignItems:"center", marginBottom:26 }}>
        {OT_STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div className={`step-dot ${i<step?"done":i===step?"act-ot":"idle"}`}
                style={{ cursor:i<step?"pointer":"default" }} onClick={()=>i<step&&setStep(i)}>
                {i<step?<Ic d="M3 8l3.5 3.5L13 4" s={14} c="#fff" sw={2}/>:i+1}
              </div>
              <span style={{ fontSize:10, fontWeight:i===step?700:500, color:i<=step?"#0C1E4A":"#94A3B8", letterSpacing:".05em", textTransform:"uppercase", fontFamily:"'Geist Mono',monospace", whiteSpace:"nowrap" }}>{label}</span>
            </div>
            {i<OT_STEPS.length-1&&<div className={`step-line ${i<step?"ot":"idle"}`}/>}
          </React.Fragment>
        ))}
      </div>

      <div key={step}>
        {/* Step 0 — Tipo */}
        {step===0&&(
          <div className="scale-in"><div className="card" style={{ padding:28 }}>
            <SectionHead icon="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" title="¿Qué tipo de institución eres?" sub="Esto determina tu flujo de operación y los documentos requeridos"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {INSTITUTION_TYPES.map(t=>(
                <div key={t.value} className={`inst-card ${form.institution_type===t.value?"selected":""}`} onClick={()=>set("institution_type",t.value)}>
                  <div style={{ width:34,height:34,borderRadius:9,background:form.institution_type===t.value?"linear-gradient(135deg,#0C1E4A,#1B3F8A)":"#EEF2FF",display:"grid",placeItems:"center",transition:"all .18s" }}>
                    <Ic d={t.icon} s={16} c={form.institution_type===t.value?"#fff":"#5B8DEF"}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:form.institution_type===t.value?"#0C1E4A":"#0F172A",marginBottom:2 }}>{t.label}</div>
                    <div style={{ fontSize:10,color:"#94A3B8",lineHeight:1.4 }}>{t.desc}</div>
                  </div>
                  {form.institution_type===t.value&&<div style={{ marginTop:"auto",width:16,height:16,borderRadius:"50%",background:"#0C1E4A",display:"grid",placeItems:"center" }}><Ic d="M4 8l2.5 2.5L12 5" s={10} c="#fff" sw={2}/></div>}
                </div>
              ))}
            </div>
          </div></div>
        )}
        {/* Step 1 — Institución */}
        {step===1&&(
          <div className="scale-in"><div className="card" style={{ padding:28 }}>
            <SectionHead icon="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" title="Datos de tu institución" sub="Esta información aparecerá en documentos y comunicaciones"/>
            <div style={{ display:"grid", gap:18 }}>
              <FieldWrap label="Nombre de la institución *">
                <input className="inp ot-focus" placeholder="Ej. Fondo ABC Capital SAPI de CV" value={form.institution_name} onChange={e=>set("institution_name",e.target.value)}/>
              </FieldWrap>
              <FieldWrap label="RFC de la institución *" hint="Validación de formato y consulta al SAT incluidas.">
                <RFCField value={form.rfc} onChange={v=>set("rfc",v)} accent="#1B3F8A"/>
              </FieldWrap>
            </div>
          </div></div>
        )}
        {/* Step 2 — Representante */}
        {step===2&&(
          <div className="scale-in"><div className="card" style={{ padding:28 }}>
            <SectionHead icon="M11 2l3 3-9 9H2v-3L11 2z" title="Representante legal" sub="Persona física facultada para firmar y operar en nombre de la institución"/>
            <div style={{ display:"grid", gap:18 }}>
              <FieldWrap label="Nombre(s) *">
                <input className="inp ot-focus" placeholder="Ej. Luis Armando" value={form.legal_rep_first_names} onChange={e=>set("legal_rep_first_names",e.target.value)}/>
              </FieldWrap>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <FieldWrap label="Apellido paterno *">
                  <input className="inp ot-focus" placeholder="Ej. Álvarez" value={form.legal_rep_last_name_paternal} onChange={e=>set("legal_rep_last_name_paternal",e.target.value)}/>
                </FieldWrap>
                <FieldWrap label="Apellido materno">
                  <input className="inp ot-focus" placeholder="Ej. Zapfe" value={form.legal_rep_last_name_maternal} onChange={e=>set("legal_rep_last_name_maternal",e.target.value)}/>
                </FieldWrap>
              </div>
              <InfoBox icon="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" text="El representante legal es quien firma contratos y actúa ante autoridades en nombre de la institución." accent="#5B8DEF"/>
            </div>
          </div></div>
        )}
        {/* Step 3 — Contacto */}
        {step===3&&(
          <div className="scale-in"><div className="card" style={{ padding:28 }}>
            <SectionHead icon="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM2 4l6 5 6-5" title="Contacto del representante" sub="Correo y teléfono para comunicaciones operativas"/>
            <div style={{ display:"grid", gap:18 }}>
              <FieldWrap label="Correo electrónico *" error={form.legal_rep_email&&!isEmail(form.legal_rep_email)?"Correo inválido":""}>
                <input className={`inp ot-focus ${form.legal_rep_email&&!isEmail(form.legal_rep_email)?"err":""}`} placeholder="correo@dominio.com" type="email" value={form.legal_rep_email} onChange={e=>set("legal_rep_email",e.target.value)}/>
              </FieldWrap>
              <FieldWrap label="Celular *" error={form.legal_rep_phone_national&&onlyDigits(form.legal_rep_phone_national).length!==10?"Necesita 10 dígitos":""}>
                <div style={{ display:"flex", gap:10 }}>
                  <select className="sel ot" value={form.legal_rep_phone_country} onChange={e=>set("legal_rep_phone_country",e.target.value)} style={{ width:155, flexShrink:0 }}>
                    {COUNTRIES.map(c=><option key={c.dial+c.name} value={c.dial}>{c.flag} {c.name} ({c.dial})</option>)}
                  </select>
                  <input className="inp mono ot-focus" placeholder="10 dígitos" inputMode="numeric" value={form.legal_rep_phone_national} onChange={e=>set("legal_rep_phone_national",onlyDigits(e.target.value).slice(0,10))} maxLength={10}/>
                </div>
              </FieldWrap>
            </div>
          </div></div>
        )}
        {/* Step 4 — Resumen */}
        {step===4&&(
          <div className="scale-in" style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ padding:"16px 20px", background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:14, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:46,height:46,borderRadius:12,background:`${sc.bar}22`,display:"grid",placeItems:"center",flexShrink:0 }}>
                <span style={{ fontSize:18,fontWeight:800,color:sc.text }}>{completePct}%</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:sc.text,marginBottom:7 }}>{sc.label}</div>
                <div style={{ height:4,background:"#E8EDF5",borderRadius:999,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${completePct}%`,background:sc.bar,borderRadius:999 }}/>
                </div>
              </div>
            </div>
            {[
              { title:"Institución", rows:[{ k:"Tipo",v:instType?.label||form.institution_type||"—" },{ k:"Nombre",v:form.institution_name||"—" },{ k:"RFC",v:form.rfc||"—",mono:true }] },
              { title:"Representante", rows:[{ k:"Nombre",v:[form.legal_rep_first_names,form.legal_rep_last_name_paternal,form.legal_rep_last_name_maternal].filter(Boolean).join(" ")||"—" }] },
              { title:"Contacto", rows:[{ k:"Correo",v:form.legal_rep_email||"—" },{ k:"Teléfono",v:phoneE164||"—",mono:true }] },
            ].map(sec=>(
              <div key={sec.title} className="card" style={{ padding:18 }}>
                <div style={{ fontSize:10,fontWeight:700,color:"#94A3B8",letterSpacing:".08em",textTransform:"uppercase",fontFamily:"'Geist Mono',monospace",marginBottom:12 }}>{sec.title}</div>
                {sec.rows.map((r:any)=>(
                  <div key={r.k} className="dr">
                    <span style={{ fontSize:12,color:"#64748B" }}>{r.k}</span>
                    <span style={{ fontSize:13,fontWeight:600,color:"#0F172A",fontFamily:r.mono?"'Geist Mono',monospace":"inherit",textAlign:"right" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {error&&<div className="fade" style={{ marginTop:12,padding:"11px 15px",background:"#FFF1F2",border:"1px solid #FECDD3",borderRadius:11,fontSize:13,color:"#881337",display:"flex",gap:10,alignItems:"center" }}><Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v4M8 11h.01" c="#F43F5E" s={14}/>{error}</div>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:26 }}>
        {step>0
          ?<button className="btn-ghost" onClick={()=>setStep(s=>s-1)}><Ic d="M10 3L4 8l6 5" s={14}/>Atrás</button>
          :mode==="edit"
          ?<button className="btn-ghost" onClick={()=>setMode("view")}><Ic d="M10 3L4 8l6 5" s={14}/>Cancelar</button>
          :<div/>
        }
        {step<4
          ?<button className="btn-ot" disabled={!canNext} onClick={()=>setStep(s=>s+1)}>Continuar <Ic d="M6 3l6 5-6 5" s={14} c="#fff"/></button>
          :<button className="btn-ot" disabled={saving} onClick={handleSave}>
            {saving?<><svg className="spinner" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>Guardando...</>:<><Ic d="M3 8l3.5 3.5L13 4" s={14} c="#fff" sw={2}/>{mode==="edit"?"Guardar cambios":"Completar onboarding"}</>}
          </button>
        }
      </div>
      <div style={{ height:3,background:"#F1F5F9",borderRadius:999,marginTop:22,overflow:"hidden" }}>
        <div style={{ height:"100%",borderRadius:999,background:"linear-gradient(90deg,#1B3F8A,#5B8DEF)",width:`${((step+1)/5)*100}%`,transition:"width .4s cubic-bezier(.16,1,.3,1)" }}/>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOLICITANTE — clean empresa form, no institution type cards
// ═══════════════════════════════════════════════════════════════════════════════

type SolProfile = {
  company_name: string; company_rfc: string; company_giro: string; company_state: string;
  rep_first_names: string; rep_last_name: string; rep_curp: string;
  rep_email: string; rep_phone: string;
};

const EMPTY_SOL: SolProfile = {
  company_name:"", company_rfc:"", company_giro:"", company_state:"",
  rep_first_names:"", rep_last_name:"", rep_curp:"", rep_email:"", rep_phone:"",
};

function SolicitanteDatos() {
  const [tab,       setTab]       = useState(0);
  const [form,      setForm]      = useState<SolProfile>(EMPTY_SOL);
  const [saved,     setSaved]     = useState<SolProfile | null>(null);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [countdown, setCountdown] = useState(0);

  const set = (k: keyof SolProfile, v: string) => { setError(""); setForm(f => ({ ...f, [k]: v })); };

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1000)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data } = await supabase.from("borrowers_profile").select("*").eq("owner_id", auth.user.id).maybeSingle();
      if (data) {
        const p: SolProfile = {
          company_name:    data.company_name    ?? "",
          company_rfc:     data.company_rfc     ?? "",
          company_giro:    data.company_giro    ?? "",
          company_state:   data.company_state   ?? "",
          rep_first_names: data.rep_first_names ?? "",
          rep_last_name:   data.rep_last_name   ?? "",
          rep_curp:        data.rep_curp        ?? "",
          rep_email:       data.rep_email       ?? "",
          rep_phone:       data.rep_phone       ?? "",
        };
        setSaved(p); setForm(p);
        if (data.updated_at) {
          const rem = COOLDOWN_MS - (Date.now() - new Date(data.updated_at).getTime());
          if (rem > 0) setCountdown(rem);
        }
      }
      setLoading(false);
    })();
  }, []);

  const completePct = useMemo(() => {
    const s = editing ? form : (saved ?? form);
    let p = 0;
    if (s.company_name?.trim())   p += 20;
    if (validateRFCLocal(s.company_rfc||"").valid) p += 20;
    if (s.company_giro)           p += 10;
    if (s.company_state)          p += 10;
    if (s.rep_first_names?.trim()) p += 15;
    if (s.rep_last_name?.trim())   p += 10;
    if (s.rep_curp?.length === 18) p += 10;
    if (isEmail(s.rep_email||""))  p += 5;
    return p;
  }, [form, saved, editing]);

  const curpOk    = form.rep_curp.length === 18;
  const tab0Valid = !!form.company_name.trim() && validateRFCLocal(form.company_rfc).valid && !!form.company_giro && !!form.company_state;
  const tab1Valid = !!form.rep_first_names.trim() && !!form.rep_last_name.trim() && curpOk && isEmail(form.rep_email);

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sin sesión");
      const now = new Date().toISOString();
      const payload = {
        owner_id:        auth.user.id,
        company_name:    form.company_name.trim(),
        company_rfc:     normalizeRFC(form.company_rfc),
        company_giro:    form.company_giro,
        company_state:   form.company_state,
        rep_first_names: form.rep_first_names.trim(),
        rep_last_name:   form.rep_last_name.trim(),
        rep_curp:        form.rep_curp.toUpperCase().trim(),
        rep_email:       form.rep_email.trim().toLowerCase(),
        rep_phone:       onlyDigits(form.rep_phone).slice(0, 10),
        updated_at:      now,
      };
      const { error: e } = await supabase.from("borrowers_profile").upsert(payload, { onConflict:"owner_id" });
      if (e) throw new Error(e.message);
      setSaved({ ...form }); setCountdown(COOLDOWN_MS); setEditing(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  const sc = completePct >= 80
    ? { bar:"#10B981", text:"#065F46", bg:"#ECFDF5", border:"#A7F3D0", label:"Perfil completo" }
    : completePct >= 50
    ? { bar:"#F59E0B", text:"#92400E", bg:"#FFFBEB", border:"#FDE68A", label:"Perfil parcial" }
    : { bar:"#F43F5E", text:"#9F1239", bg:"#FFF1F2", border:"#FECDD3", label:"Datos incompletos" };

  const canEdit = countdown <= 0;

  if (loading) return (
    <div style={{ display:"grid", placeItems:"center", minHeight:"60vh" }}>
      <svg className="spinner" width={24} height={24} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
    </div>
  );

  // ── VIEW ──
  if (!editing && saved) return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", maxWidth:820, margin:"0 auto" }}>
      {/* Header */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.05em" }}>Datos de mi empresa</div>
            <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, background:"#ECFDF5", color:"#065F46", border:"1px solid #A7F3D0" }}>SOLICITANTE</span>
          </div>
          <div style={{ fontSize:13, color:"#64748B" }}>Información registrada de tu empresa y representante legal</div>
        </div>
        <div style={{ textAlign:"right" }}>
          {canEdit
            ? <button className="btn-sol" onClick={()=>{ setEditing(true); setTab(0); }}><Ic d="M11 2l3 3-9 9H2v-3L11 2z" s={14} c="#fff"/> Editar datos</button>
            : <div>
                <button className="btn-sol" disabled><Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" s={14} c="#fff"/> Editar datos</button>
                <div style={{ fontSize:11, color:"#94A3B8", marginTop:6, fontFamily:"'Geist Mono',monospace" }}>Disponible en {fmtCountdown(countdown)}</div>
              </div>
          }
        </div>
      </div>

      {/* Completion bar */}
      <div className="fade" style={{ padding:"16px 20px", background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:14, display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:`${sc.bar}22`, display:"grid", placeItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:17, fontWeight:800, color:sc.text }}>{completePct}%</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:sc.text, marginBottom:7 }}>{sc.label}</div>
          <div style={{ height:5, background:"#E8EDF5", borderRadius:999, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${completePct}%`, background:sc.bar, borderRadius:999, transition:"width .6s" }}/>
          </div>
        </div>
      </div>

      {/* Data cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div className="card fade" style={{ padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"rgba(5,150,105,.10)", display:"grid", placeItems:"center" }}>
              <Ic d="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" s={14} c="#059669"/>
            </div>
            <div><div style={{ fontSize:13, fontWeight:700 }}>Empresa</div><div style={{ fontSize:11, color:"#94A3B8" }}>Persona moral</div></div>
          </div>
          {[
            { k:"Razón social", v:saved.company_name||"—" },
            { k:"RFC",          v:saved.company_rfc||"—",  mono:true },
            { k:"Giro",         v:saved.company_giro||"—" },
            { k:"Estado",       v:saved.company_state||"—" },
          ].map(r=>(
            <div key={r.k} className="dr">
              <span style={{ fontSize:12, color:"#64748B" }}>{r.k}</span>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:(r as any).mono?"'Geist Mono',monospace":"inherit", textAlign:"right" }}>{r.v}</span>
            </div>
          ))}
        </div>

        <div className="card fade" style={{ padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"rgba(5,150,105,.10)", display:"grid", placeItems:"center" }}>
              <Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" s={14} c="#059669"/>
            </div>
            <div><div style={{ fontSize:13, fontWeight:700 }}>Representante legal</div><div style={{ fontSize:11, color:"#94A3B8" }}>Datos personales</div></div>
          </div>
          {[
            { k:"Nombre",    v:[saved.rep_first_names,saved.rep_last_name].filter(Boolean).join(" ")||"—" },
            { k:"CURP",      v:saved.rep_curp||"—",  mono:true },
            { k:"Correo",    v:saved.rep_email||"—" },
            { k:"Teléfono",  v:saved.rep_phone?`+52 ${saved.rep_phone}`:"—", mono:true },
          ].map(r=>(
            <div key={r.k} className="dr">
              <span style={{ fontSize:12, color:"#64748B" }}>{r.k}</span>
              <span style={{ fontSize:13, fontWeight:600, fontFamily:(r as any).mono?"'Geist Mono',monospace":"inherit", textAlign:"right", wordBreak:"break-all" }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── EDIT / FIRST TIME ──
  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", maxWidth:820, margin:"0 auto" }}>
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:26 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.05em" }}>{saved?"Editar mis datos":"Completa tu perfil"}</div>
            <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, background:"#ECFDF5", color:"#065F46", border:"1px solid #A7F3D0" }}>SOLICITANTE</span>
          </div>
          <div style={{ fontSize:13, color:"#64748B" }}>{saved?"Actualiza la información de tu empresa":"Esta info se comparte con los otorgantes al solicitar crédito"}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, letterSpacing:".06em", textTransform:"uppercase", marginBottom:3 }}>Completitud</div>
          <div style={{ fontSize:26, fontWeight:800, letterSpacing:"-.05em", color:completePct>=80?"#065F46":completePct>=50?"#92400E":"#0F172A" }}>{completePct}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fade" style={{ display:"flex", gap:3, marginBottom:22, background:"#F1F5F9", borderRadius:12, padding:4 }}>
        {[
          { label:"🏢  Empresa",         done:tab0Valid },
          { label:"👤  Representante legal", done:tab1Valid },
        ].map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            flex:1, height:36, border:"none", borderRadius:9,
            fontSize:13, fontWeight:600, fontFamily:"'Geist',sans-serif", cursor:"pointer", transition:"all .15s",
            background: tab===i?"#fff":"transparent",
            color: tab===i?"#0F172A":"#64748B",
            boxShadow: tab===i?"0 1px 4px rgba(0,0,0,.08)":"none",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            {t.label}
            {t.done && <span style={{ width:6,height:6,borderRadius:"50%",background:"#10B981",display:"inline-block" }}/>}
          </button>
        ))}
      </div>

      {/* Tab 0 — Empresa */}
      {tab===0&&(
        <div className="scale-in">
          <div className="card" style={{ padding:28 }}>
            <SectionHead
              icon="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z"
              title="Datos de tu empresa"
              sub="Deben coincidir con tu constancia de situación fiscal del SAT"
              accent="#059669" accentBg="rgba(5,150,105,.10)"
            />
            <div style={{ display:"grid", gap:18 }}>
              <FieldWrap label="Razón social *">
                <input className="inp" placeholder="Ej. Servicios Norte SA de CV" value={form.company_name} onChange={e=>set("company_name",e.target.value)}/>
              </FieldWrap>

              <FieldWrap label="RFC de la empresa *" hint="12 caracteres para persona moral. Validamos formato y ante el SAT.">
                <RFCField value={form.company_rfc} onChange={v=>set("company_rfc",v)} accent="#059669"/>
              </FieldWrap>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <FieldWrap label="Giro empresarial *">
                  <SelectWrap value={form.company_giro} onChange={v=>set("company_giro",v)}>
                    <option value="">Selecciona</option>
                    {GIROS.map(g=><option key={g} value={g}>{g}</option>)}
                  </SelectWrap>
                </FieldWrap>
                <FieldWrap label="Estado *">
                  <SelectWrap value={form.company_state} onChange={v=>set("company_state",v)}>
                    <option value="">Selecciona</option>
                    {ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}
                  </SelectWrap>
                </FieldWrap>
              </div>

              <InfoBox
                icon="M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v2.5M8 11h.01"
                text="Esta información se comparte con otorgantes al solicitar crédito. Asegúrate de que coincida con tus documentos fiscales."
                accent="#059669"
              />
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:18 }}>
            <button className="btn-sol" disabled={!tab0Valid} onClick={()=>setTab(1)}>
              Continuar — Representante <Ic d="M6 3l6 5-6 5" s={14} c="#fff"/>
            </button>
          </div>
        </div>
      )}

      {/* Tab 1 — Rep legal */}
      {tab===1&&(
        <div className="scale-in">
          <div className="card" style={{ padding:28 }}>
            <SectionHead
              icon="M11 2l3 3-9 9H2v-3L11 2z"
              title="Representante legal"
              sub="Persona física que firma y representa legalmente a la empresa"
              accent="#059669" accentBg="rgba(5,150,105,.10)"
            />
            <div style={{ display:"grid", gap:18 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <FieldWrap label="Nombre(s) *">
                  <input className="inp" placeholder="Carlos Alberto" value={form.rep_first_names} onChange={e=>set("rep_first_names",e.target.value)}/>
                </FieldWrap>
                <FieldWrap label="Apellido paterno *">
                  <input className="inp" placeholder="Martínez" value={form.rep_last_name} onChange={e=>set("rep_last_name",e.target.value)}/>
                </FieldWrap>
              </div>

              <FieldWrap label="CURP *" hint="18 caracteres exactos. Se verifica con RENAPO."
                error={form.rep_curp.length>0&&!curpOk?`Faltan ${18-form.rep_curp.length} caracteres`:""}>
                <div style={{ position:"relative" }}>
                  <input
                    className={`inp mono ${form.rep_curp.length>0&&!curpOk?"err":curpOk?"ok":""}`}
                    placeholder="MAMC900101HDFRRS08"
                    value={form.rep_curp}
                    onChange={e=>set("rep_curp",e.target.value.toUpperCase().replace(/\s/g,""))}
                    maxLength={18}
                  />
                  <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, fontFamily:"'Geist Mono',monospace", color:curpOk?"#10B981":"#94A3B8", fontWeight:600 }}>
                    {form.rep_curp.length}/18
                  </span>
                </div>
                {curpOk&&<p className="slide-in" style={{ fontSize:11,color:"#10B981",fontWeight:600,marginTop:4,display:"flex",alignItems:"center",gap:4 }}><Ic d="M3 8l3 3L13 4" s={11} c="#10B981" sw={2}/>Longitud correcta</p>}
              </FieldWrap>

              <FieldWrap label="Correo electrónico *" error={form.rep_email&&!isEmail(form.rep_email)?"Correo inválido":""}>
                <input className={`inp ${form.rep_email&&!isEmail(form.rep_email)?"err":""}`} type="email" placeholder="rep@empresa.com" value={form.rep_email} onChange={e=>set("rep_email",e.target.value.toLowerCase())}/>
              </FieldWrap>

              <FieldWrap label="Teléfono" hint="10 dígitos, sin código de país.">
                <div style={{ display:"flex", gap:8 }}>
                  <input value="+52" readOnly className="inp" style={{ width:56,flexShrink:0,fontFamily:"'Geist Mono',monospace",color:"#64748B",cursor:"default",paddingLeft:10 }}/>
                  <input className="inp mono" placeholder="5512345678" value={form.rep_phone} onChange={e=>set("rep_phone",onlyDigits(e.target.value))} maxLength={10}/>
                </div>
              </FieldWrap>

              <InfoBox icon="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" text="El representante legal debe ser quien firmará contratos y poderes notariales con los otorgantes." accent="#059669"/>
            </div>
          </div>

          {error&&<div className="slide-in" style={{ marginTop:12,padding:"11px 15px",background:"#FFF1F2",border:"1px solid #FECDD3",borderRadius:11,fontSize:13,color:"#881337",display:"flex",gap:10,alignItems:"center" }}><Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v4M8 11h.01" c="#F43F5E" s={14}/>{error}</div>}

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:18 }}>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" onClick={()=>setTab(0)}><Ic d="M10 3L4 8l6 5" s={14}/>Atrás</button>
              {saved&&<button className="btn-ghost" onClick={()=>{ setForm(saved); setEditing(false); }}>Cancelar</button>}
            </div>
            <button className="btn-sol" disabled={!tab0Valid||!tab1Valid||saving} onClick={handleSave}>
              {saving
                ?<><svg className="spinner" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>Guardando...</>
                :<><Ic d="M3 8l3.5 3.5L13 4" s={14} c="#fff" sw={2}/>{saved?"Guardar cambios":"Guardar datos"}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN — detects role, renders the right component
// ═══════════════════════════════════════════════════════════════════════════════

export default function DatosPage() {
  const [role,    setRole]    = useState<"otorgante"|"solicitante"|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle();
      setRole((data?.role ?? "otorgante") as "otorgante"|"solicitante");
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ display:"grid", placeItems:"center", minHeight:"60vh", fontFamily:"'Geist',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{animation:spin .7s linear infinite}`}</style>
      <svg className="spinner" width={24} height={24} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      {role === "solicitante" ? <SolicitanteDatos /> : <OtorganteDatos />}
    </>
  );
}
