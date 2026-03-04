"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface SolicitudForm {
  tipo_credito: string; monto: string; destino: string; descripcion: string;
  plazo_meses: string; tasa_solicitada: string; amortizacion: string;
  garantia_tipo: string; garantia_detalle: string;
  facturacion_anual: string; antiguedad_anos: string; sector: string; num_empleados: string;
}

const EMPTY_FORM: SolicitudForm = {
  tipo_credito:"", monto:"", destino:"", descripcion:"",
  plazo_meses:"", tasa_solicitada:"", amortizacion:"",
  garantia_tipo:"", garantia_detalle:"",
  facturacion_anual:"", antiguedad_anos:"", sector:"", num_empleados:"",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" });
}
function parseMonto(s: string): number { return parseInt(s.replace(/,/g,"") || "0"); }
function fmtMonto(n: number): string {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(2)}M MXN`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K MXN`;
  return `$${n.toLocaleString("es-MX")} MXN`;
}
const MAX_MONTO = 250_000_000;

const STATUS_META: Record<string,{label:string;bg:string;color:string;border:string}> = {
  borrador:    {label:"Borrador",    bg:"#F8FAFC",color:"#475569",border:"#E2E8F0"},
  enviada:     {label:"Enviada",     bg:"#EFF6FF",color:"#1E40AF",border:"#BFDBFE"},
  en_revision: {label:"En revisión", bg:"#FFFBEB",color:"#92400E",border:"#FDE68A"},
  ofertada:    {label:"Ofertada",    bg:"#F5F3FF",color:"#5B21B6",border:"#DDD6FE"},
  aprobada:    {label:"Aprobada",    bg:"#ECFDF5",color:"#065F46",border:"#A7F3D0"},
  rechazada:   {label:"Rechazada",   bg:"#FFF1F2",color:"#9F1239",border:"#FECDD3"},
  cancelada:   {label:"Cancelada",   bg:"#F8FAFC",color:"#94A3B8",border:"#E2E8F0"},
};

function Ic({d,s=16,c="currentColor"}:{d:string;s?:number;c?:string}) {
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

function OptionCard({label,desc,value,selected,onClick,icon}:{label:string;desc?:string;value:string;selected:boolean;onClick:()=>void;icon?:string}) {
  return (
    <div onClick={onClick} style={{border:`2px solid ${selected?"#059669":"#E2E8F0"}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",background:selected?"#ECFDF5":"#fff",transition:"all .15s",display:"flex",alignItems:"center",gap:12}}>
      {icon && <div style={{width:36,height:36,borderRadius:9,background:selected?"rgba(5,150,105,.15)":"#F8FAFC",display:"grid",placeItems:"center",flexShrink:0}}><Ic d={icon} s={16} c={selected?"#059669":"#94A3B8"}/></div>}
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:selected?"#064E3B":"#0F172A"}}>{label}</div>
        {desc && <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>{desc}</div>}
      </div>
      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${selected?"#059669":"#CBD5E1"}`,background:selected?"#059669":"transparent",display:"grid",placeItems:"center",flexShrink:0}}>
        {selected && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2L7.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
    </div>
  );
}

function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>{label}</label>
      {children}
      {hint && <span style={{fontSize:11,color:"#94A3B8"}}>{hint}</span>}
    </div>
  );
}

const STEPS = [
  {n:1,label:"Tipo y monto"},{n:2,label:"Destino"},{n:3,label:"Plazo"},
  {n:4,label:"Garantía"},{n:5,label:"Empresa"},{n:6,label:"Resumen"},
];

function Stepper({step}:{step:Step}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:28}}>
      {STEPS.map((s,i) => {
        const state = s.n<step?"done":s.n===step?"active":"idle";
        return (
          <React.Fragment key={s.n}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:28,height:28,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:11,fontWeight:700,fontFamily:"'Geist Mono',monospace",background:state==="done"?"#059669":state==="active"?"#064E3B":"#F1F5F9",color:state==="idle"?"#94A3B8":"#fff",boxShadow:state==="active"?"0 0 0 4px rgba(5,150,105,.2)":"none",transition:"all .2s"}}>
                {state==="done"?<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>:s.n}
              </div>
              <span style={{fontSize:9,fontWeight:600,fontFamily:"'Geist Mono',monospace",letterSpacing:".04em",color:state==="idle"?"#CBD5E1":state==="active"?"#059669":"#064E3B",whiteSpace:"nowrap"}}>{s.label.toUpperCase()}</span>
            </div>
            {i<STEPS.length-1 && <div style={{flex:1,height:2,background:s.n<step?"#059669":"#E2E8F0",margin:"0 4px",marginBottom:16,transition:"background .3s"}}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Shared insert payload ──────────────────────────────────────────────────
function buildPayload(userId: string, form: SolicitudForm, status: string) {
  return {
    borrower_id:          userId,
    tipo:                 "subasta",
    monto:                parseFloat(form.monto.replace(/,/g,"")) || 0,
    plazo_meses:          parseInt(form.plazo_meses) || 12,
    tasa_solicitada:      parseFloat(form.tasa_solicitada) || null,
    destino:              form.destino,
    descripcion:          form.descripcion,
    garantia_tipo:        form.garantia_tipo || null,
    garantia_detalle:     form.garantia_detalle || null,
    status,
    // ── Campos que aparecen en el marketplace ──
    fin_sector:           form.sector            || null,
    fin_facturacion_anual:form.facturacion_anual || null,
    fin_antiguedad:       form.antiguedad_anos   || null,
    fin_num_empleados:    form.num_empleados     || null,
  };
}

export default function SolicitudesPage() {
  const router = useRouter();
  const [view,        setView]        = useState<"list"|"wizard">("list");
  const [step,        setStep]        = useState<Step>(1);
  const [form,        setForm]        = useState<SolicitudForm>(EMPTY_FORM);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [userId,      setUserId]      = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUserId(auth.user.id);
      const { data } = await supabase
        .from("solicitudes").select("*")
        .eq("borrower_id", auth.user.id)
        .order("created_at", { ascending:false });
      setSolicitudes(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  function upd(k: keyof SolicitudForm, v: string) { setForm(f=>({...f,[k]:v})); }

  function handleMontoChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g,"");
    if (!digits) { upd("monto",""); return; }
    const num = Math.min(parseInt(digits), MAX_MONTO);
    upd("monto", num.toLocaleString("es-MX"));
  }

  async function saveDraft() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("solicitudes").insert(buildPayload(userId, form, "borrador"));
    setSaving(false);
  }

  async function handleSubmit() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("solicitudes").insert(buildPayload(userId, form, "enviada"));
    setSaving(false);
    if (!error) {
      setView("list"); setForm(EMPTY_FORM); setStep(1);
      const { data } = await supabase.from("solicitudes").select("*")
        .eq("borrower_id", userId).order("created_at", { ascending:false });
      setSolicitudes(data ?? []);
    }
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
    .mono{font-family:'Geist Mono',monospace;}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
    .btn-sol{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:10px 18px;cursor:pointer;box-shadow:0 2px 10px rgba(6,78,59,.22);transition:opacity .15s,transform .15s;}
    .btn-sol:hover{opacity:.9;transform:translateY(-1px);}
    .btn-sol:disabled{opacity:.5;cursor:not-allowed;transform:none;}
    .btn-g{display:inline-flex;align-items:center;gap:6px;background:#F8FAFC;color:#475569;border:1.5px solid #E2E8F0;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:10px 18px;cursor:pointer;transition:all .15s;}
    .btn-g:hover{background:#F1F5F9;border-color:#CBD5E1;color:#0F172A;}
    .inp{height:44px;border-radius:10px;border:1.5px solid #DDE5F7;background:#F8FAFF;padding:0 14px;font-size:13px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;width:100%;transition:border-color .15s,box-shadow .15s;}
    .inp:focus{border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.10);}
    .sel{height:44px;border-radius:10px;border:1.5px solid #DDE5F7;background:#F8FAFF;padding:0 14px;font-size:13px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;width:100%;cursor:pointer;transition:border-color .15s;}
    .sel:focus{border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.10);}
    .tr{display:grid;align-items:center;padding:12px 16px;border-bottom:1px solid #F1F5F9;transition:background .12s;cursor:pointer;}
    .tr:last-child{border-bottom:none;}
    .tr:hover{background:#F7FDF9;}
    .spinner{animation:spin .7s linear infinite;}
    textarea.inp{height:auto;padding:12px 14px;resize:vertical;}
  `;

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div style={{fontFamily:"'Geist',sans-serif",color:"#0F172A"}}>
      <style>{CSS}</style>
      <div className="fade" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <div style={{fontSize:19,fontWeight:800,letterSpacing:"-0.04em",marginBottom:3}}>Mis solicitudes</div>
          <div style={{fontSize:12,color:"#94A3B8"}}>Historial y estado de tus solicitudes de crédito</div>
        </div>
        <button className="btn-sol" onClick={()=>{setView("wizard");setStep(1);setForm(EMPTY_FORM);}}>
          <Ic d="M8 2v12M2 8h12" s={13} c="#fff"/> Nueva solicitud
        </button>
      </div>

      <div className="fade" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          {label:"Total",      val:solicitudes.length,                                                                    color:"#059669"},
          {label:"En proceso", val:solicitudes.filter(s=>["enviada","en_revision","ofertada"].includes(s.status)).length, color:"#F5A623"},
          {label:"Aprobadas",  val:solicitudes.filter(s=>s.status==="aprobada").length,                                   color:"#10B981"},
          {label:"Rechazadas", val:solicitudes.filter(s=>s.status==="rechazada").length,                                  color:"#F43F5E"},
        ].map(k=>(
          <div key={k.label} className="card" style={{padding:"14px 16px"}}>
            <div className="mono" style={{fontSize:10,color:"#94A3B8",letterSpacing:".08em",marginBottom:6}}>{k.label.toUpperCase()}</div>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.05em",color:"#0F172A"}}>{k.val}</div>
            <div style={{height:3,background:"#F1F5F9",borderRadius:999,marginTop:8}}>
              <div style={{width:solicitudes.length?`${(k.val/solicitudes.length)*100}%`:"0%",height:"100%",background:k.color,borderRadius:999,transition:"width .8s"}}/>
            </div>
          </div>
        ))}
      </div>

      <div className="card fade" style={{overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid #E8EDF5"}}>
          <div style={{fontSize:13,fontWeight:700}}>Solicitudes</div>
        </div>
        {loading ? (
          <div style={{padding:40,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <svg className="spinner" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
            <span style={{fontSize:13,color:"#94A3B8"}}>Cargando...</span>
          </div>
        ) : solicitudes.length===0 ? (
          <div style={{padding:"48px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12,textAlign:"center"}}>
            <div style={{width:52,height:52,borderRadius:14,background:"#F1F5F9",display:"grid",placeItems:"center"}}>
              <Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" s={22} c="#94A3B8"/>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:"#475569"}}>Sin solicitudes aún</div>
            <div style={{fontSize:12,color:"#94A3B8",maxWidth:"28ch"}}>Crea tu primera solicitud y accede a múltiples otorgantes.</div>
            <button className="btn-sol" style={{marginTop:4}} onClick={()=>{setView("wizard");setStep(1);}}>Crear solicitud</button>
          </div>
        ) : (
          <>
            <div className="tr" style={{gridTemplateColumns:"1fr 110px 80px 110px 110px",background:"#FAFBFF",cursor:"default"}}>
              {["Destino","Monto","Plazo","Estado","Fecha"].map(h=>(
                <div key={h} className="mono" style={{fontSize:10,color:"#94A3B8",letterSpacing:".06em"}}>{h}</div>
              ))}
            </div>
            {solicitudes.map((s:any)=>{
              const pill = STATUS_META[s.status]??STATUS_META.borrador;
              return (
                <div key={s.id} className="tr" style={{gridTemplateColumns:"1fr 110px 80px 110px 110px"}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.destino||"—"}</div>
                  <div className="mono" style={{fontSize:12}}>{s.monto?fmt(s.monto):"—"}</div>
                  <div style={{fontSize:12,color:"#64748B"}}>{s.plazo_meses?`${s.plazo_meses}m`:"—"}</div>
                  <span style={{display:"inline-flex",alignItems:"center",borderRadius:999,padding:"3px 9px",fontSize:10,fontWeight:600,fontFamily:"'Geist Mono',monospace",background:pill.bg,color:pill.color,border:`1px solid ${pill.border}`}}>{pill.label}</span>
                  <div className="mono" style={{fontSize:11,color:"#94A3B8"}}>{fmtDate(s.created_at)}</div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );

  // ── WIZARD ────────────────────────────────────────────────────────────────
  const montoNum = parseMonto(form.monto);

  return (
    <div style={{fontFamily:"'Geist',sans-serif",color:"#0F172A"}}>
      <style>{CSS}</style>
      <div className="fade" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{fontSize:19,fontWeight:800,letterSpacing:"-0.04em",marginBottom:2}}>Nueva solicitud</div>
          <div style={{fontSize:12,color:"#94A3B8"}}>Subasta abierta · todos los otorgantes pueden ofertar</div>
        </div>
        <button className="btn-g" onClick={()=>{setView("list");setStep(1);}}>
          <Ic d="M9.5 1.5L5 6l4.5 4.5" s={12}/> Cancelar
        </button>
      </div>

      <div className="card fade" style={{padding:32,maxWidth:680}}>
        <Stepper step={step}/>

        {/* STEP 1 */}
        {step===1 && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Tipo de crédito y monto</div>
              <div style={{fontSize:13,color:"#64748B"}}>¿Qué tipo de financiamiento necesitas?</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {value:"simple",        label:"Crédito simple",   desc:"Préstamo a plazo fijo con pagos periódicos",       icon:"M4 2h8v12H4zM6 6h4M6 9h4"},
                {value:"revolvente",    label:"Línea revolvente", desc:"Crédito que se puede usar, pagar y volver a usar", icon:"M2 8a6 6 0 1012 0M8 5v3l2 2"},
                {value:"factoraje",     label:"Factoraje",        desc:"Adelanto de cuentas por cobrar / facturas",        icon:"M2 4h12v8H2zM5 8h6"},
                {value:"arrendamiento", label:"Arrendamiento",    desc:"Financiamiento para adquirir activos o equipo",    icon:"M3 3h10v10H3zM6 6h4M6 9h2"},
              ].map(opt=>(
                <OptionCard key={opt.value} {...opt} selected={form.tipo_credito===opt.value} onClick={()=>upd("tipo_credito",opt.value)}/>
              ))}
            </div>
            <Field label="Monto solicitado (MXN)" hint="Máximo $250,000,000 MXN">
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#94A3B8",fontWeight:600,pointerEvents:"none"}}>$</span>
                <input className="inp" style={{paddingLeft:28}} placeholder="1,000,000" value={form.monto} onChange={e=>handleMontoChange(e.target.value)} inputMode="numeric"/>
              </div>
              {montoNum>0 && (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#059669",fontFamily:"'Geist Mono',monospace"}}>{fmtMonto(montoNum)}</span>
                  {montoNum>=MAX_MONTO && <span style={{fontSize:11,color:"#F59E0B",fontWeight:600}}>Monto máximo alcanzado</span>}
                </div>
              )}
              {montoNum>0 && (
                <div style={{marginTop:8,height:4,background:"#F1F5F9",borderRadius:999,overflow:"hidden"}}>
                  <div style={{width:`${Math.min((montoNum/MAX_MONTO)*100,100)}%`,height:"100%",background:montoNum>=MAX_MONTO?"#F59E0B":"#059669",borderRadius:999,transition:"width .3s"}}/>
                </div>
              )}
            </Field>
          </div>
        )}

        {/* STEP 2 */}
        {step===2 && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Destino del crédito</div>
              <div style={{fontSize:13,color:"#64748B"}}>¿Para qué vas a usar el financiamiento?</div>
            </div>
            <Field label="Propósito principal">
              <select className="sel" value={form.destino} onChange={e=>upd("destino",e.target.value)}>
                <option value="">Selecciona...</option>
                <option value="Capital de trabajo">Capital de trabajo</option>
                <option value="Expansión">Expansión del negocio</option>
                <option value="Equipamiento">Compra de equipo o maquinaria</option>
                <option value="Inventario">Inventario o materias primas</option>
                <option value="Nómina">Cobertura de nómina</option>
                <option value="Refinanciamiento">Refinanciamiento de deuda</option>
                <option value="Construcción">Construcción o remodelación</option>
                <option value="Tecnología">Tecnología e infraestructura</option>
                <option value="Otro">Otro</option>
              </select>
            </Field>
            <Field label="Descripción del proyecto" hint="Cuéntanos sobre tu negocio y cómo usarás el crédito (mín. 50 caracteres)">
              <textarea className="inp" rows={5}
                placeholder="Describe brevemente tu empresa, en qué etapa se encuentra, cómo vas a usar el crédito y cuál es tu plan de pago..."
                value={form.descripcion} onChange={e=>upd("descripcion",e.target.value)}/>
              <div style={{textAlign:"right",fontSize:11,color:form.descripcion.length>=50?"#059669":"#94A3B8",marginTop:4}}>
                {form.descripcion.length} / 50 mín.
              </div>
            </Field>
          </div>
        )}

        {/* STEP 3 */}
        {step===3 && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Plazo y condiciones</div>
              <div style={{fontSize:13,color:"#64748B"}}>Define las condiciones deseadas del crédito</div>
            </div>
            <Field label="Plazo deseado">
              <select className="sel" value={form.plazo_meses} onChange={e=>upd("plazo_meses",e.target.value)}>
                <option value="">Selecciona...</option>
                {[3,6,9,12,18,24,36,48,60].map(m=>(
                  <option key={m} value={m}>{m} meses {m>=12?`(${m/12} ${m===12?"año":"años"})`:""}</option>
                ))}
              </select>
            </Field>
            <Field label="Tasa anual máxima (%)" hint="Opcional — la tasa máxima que estás dispuesto a pagar">
              <div style={{position:"relative"}}>
                <input className="inp" style={{paddingRight:32}} placeholder="ej. 18" value={form.tasa_solicitada} onChange={e=>upd("tasa_solicitada",e.target.value)} type="number" min="0" max="100" step="0.5"/>
                <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#94A3B8",fontWeight:600,pointerEvents:"none"}}>%</span>
              </div>
            </Field>
            <Field label="Tipo de amortización">
              <select className="sel" value={form.amortizacion} onChange={e=>upd("amortizacion",e.target.value)}>
                <option value="">Selecciona...</option>
                <option value="frances">Francés (cuota fija)</option>
                <option value="aleman">Alemán (capital fijo)</option>
                <option value="bullet">Bullet (pago al vencimiento)</option>
                <option value="flexible">Flexible</option>
              </select>
            </Field>
          </div>
        )}

        {/* STEP 4 */}
        {step===4 && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Garantía</div>
              <div style={{fontSize:13,color:"#64748B"}}>¿Qué garantías puedes ofrecer?</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {value:"hipotecaria",  label:"Hipotecaria",   desc:"Bien inmueble como garantía",               icon:"M2 7l6-5 6 5v7H2V7z"},
                {value:"prendaria",    label:"Prendaria",     desc:"Bienes muebles, equipo o inventario",       icon:"M3 3h10v10H3z"},
                {value:"aval",         label:"Aval personal", desc:"Persona física como garante",               icon:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5"},
                {value:"sin_garantia", label:"Sin garantía",  desc:"Crédito basado en flujo de caja y scoring", icon:"M8 2v12M2 8h12"},
              ].map(opt=>(
                <OptionCard key={opt.value} {...opt} selected={form.garantia_tipo===opt.value} onClick={()=>upd("garantia_tipo",opt.value)}/>
              ))}
            </div>
            {form.garantia_tipo && form.garantia_tipo!=="sin_garantia" && (
              <Field label="Detalle de la garantía" hint="Describe el bien o aval que ofreces">
                <textarea className="inp" rows={3} placeholder="Ej: Inmueble ubicado en CDMX con valor catastral de $3M MXN..."
                  value={form.garantia_detalle} onChange={e=>upd("garantia_detalle",e.target.value)}/>
              </Field>
            )}
          </div>
        )}

        {/* STEP 5 */}
        {step===5 && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Información de tu empresa</div>
              <div style={{fontSize:13,color:"#64748B"}}>Datos que ayudan a los otorgantes a evaluar tu solicitud</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Facturación anual (MXN)">
                <select className="sel" value={form.facturacion_anual} onChange={e=>upd("facturacion_anual",e.target.value)}>
                  <option value="">Selecciona rango...</option>
                  <option value="menos_1m">Menos de $1M</option>
                  <option value="1m_5m">$1M – $5M</option>
                  <option value="5m_20m">$5M – $20M</option>
                  <option value="20m_50m">$20M – $50M</option>
                  <option value="50m_100m">$50M – $100M</option>
                  <option value="mas_100m">Más de $100M</option>
                </select>
              </Field>
              <Field label="Antigüedad de la empresa">
                <select className="sel" value={form.antiguedad_anos} onChange={e=>upd("antiguedad_anos",e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="menos_1">Menos de 1 año</option>
                  <option value="1_2">1 – 2 años</option>
                  <option value="2_5">2 – 5 años</option>
                  <option value="5_10">5 – 10 años</option>
                  <option value="mas_10">Más de 10 años</option>
                </select>
              </Field>
              <Field label="Número de empleados">
                <select className="sel" value={form.num_empleados} onChange={e=>upd("num_empleados",e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="1_10">1 – 10</option>
                  <option value="11_50">11 – 50</option>
                  <option value="51_200">51 – 200</option>
                  <option value="201_500">201 – 500</option>
                  <option value="mas_500">Más de 500</option>
                </select>
              </Field>
              <Field label="Sector / Industria">
                <select className="sel" value={form.sector} onChange={e=>upd("sector",e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="comercio">Comercio</option>
                  <option value="manufactura">Manufactura</option>
                  <option value="servicios">Servicios</option>
                  <option value="construccion">Construcción</option>
                  <option value="tecnologia">Tecnología</option>
                  <option value="agro">Agro / Alimentos</option>
                  <option value="salud">Salud</option>
                  <option value="transporte">Transporte / Logística</option>
                  <option value="educacion">Educación</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
            </div>
            <div style={{padding:"14px 16px",background:"#F0FDF9",border:"1px solid #A7F3D0",borderRadius:12,fontSize:12,color:"#065F46",lineHeight:1.7}}>
              <strong>¿Por qué pedimos esto?</strong> Los otorgantes usan esta información para evaluar el riesgo y calcular la mejor tasa. A mayor información, mejores ofertas recibirás.
            </div>
          </div>
        )}

        {/* STEP 6 */}
        {step===6 && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Resumen de tu solicitud</div>
              <div style={{fontSize:13,color:"#64748B"}}>Revisa antes de enviar a subasta</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {label:"Tipo de crédito",   val:form.tipo_credito||"—"},
                {label:"Monto solicitado",  val:montoNum>0?fmtMonto(montoNum):"—"},
                {label:"Destino",           val:form.destino||"—"},
                {label:"Plazo",             val:form.plazo_meses?`${form.plazo_meses} meses`:"—"},
                {label:"Tasa máxima",       val:form.tasa_solicitada?`${form.tasa_solicitada}% anual`:"Sin preferencia"},
                {label:"Amortización",      val:form.amortizacion||"—"},
                {label:"Garantía",          val:form.garantia_tipo||"—"},
                {label:"Facturación anual", val:form.facturacion_anual||"—"},
                {label:"Antigüedad",        val:form.antiguedad_anos||"—"},
                {label:"Sector",            val:form.sector||"—"},
              ].map(row=>(
                <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#F8FAFC",borderRadius:9,border:"1px solid #E8EDF5"}}>
                  <span style={{fontSize:12,color:"#64748B",fontWeight:500}}>{row.label}</span>
                  <span style={{fontSize:13,fontWeight:600,color:"#0F172A",textTransform:"capitalize"}}>{row.val}</span>
                </div>
              ))}
            </div>
            <div style={{padding:"14px 16px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#065F46",marginBottom:4}}>🔔 Subasta abierta</div>
              <div style={{fontSize:12,color:"#065F46",lineHeight:1.7}}>
                Tu solicitud será visible para todos los otorgantes registrados en Plinius. Recibirás notificaciones cuando lleguen ofertas.
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:28,paddingTop:20,borderTop:"1px solid #E8EDF5"}}>
          <button className="btn-g" onClick={()=>step>1?setStep((step-1) as Step):setView("list")}>
            <Ic d="M9.5 1.5L5 6l4.5 4.5" s={12}/> {step===1?"Cancelar":"Atrás"}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {step<6 && (
              <button className="btn-g" disabled={saving} onClick={saveDraft}>
                {saving?"Guardando...":"Guardar borrador"}
              </button>
            )}
            {step<6 ? (
              <button className="btn-sol" onClick={()=>setStep((step+1) as Step)}>
                Continuar <Ic d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" s={13} c="#fff"/>
              </button>
            ) : (
              <button className="btn-sol" disabled={saving} onClick={handleSubmit}>
                {saving
                  ? <><svg className="spinner" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Enviando...</>
                  : <>Enviar a subasta <Ic d="M2 8h12M9 4l4 4-4 4" s={13} c="#fff"/></>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
