"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 15, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function fmtDateShort(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const PLAN_CONFIG = {
  free:  { label: "Free",  bg: "#F8FAFC", color: "#475569", border: "#E2E8F0", dot: "#CBD5E1", glow: "" },
  basic: { label: "Basic", bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", dot: "#3B82F6", glow: "rgba(59,130,246,.15)" },
  pro:   { label: "Pro",   bg: "#F0FDF9", color: "#065F46", border: "#6EE7B7", dot: "#00E5A0", glow: "rgba(0,229,160,.2)" },
};
const ROLE_CONFIG = {
  otorgante:   { label: "Otorgante",   bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" },
  solicitante: { label: "Solicitante", bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
};
const SOL_STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  enviada:    { bg: "#EFF6FF", color: "#1E40AF" },
  en_revision:{ bg: "#FFF7ED", color: "#9A3412" },
  ofertada:   { bg: "#F0FDF9", color: "#065F46" },
  aceptada:   { bg: "#ECFDF5", color: "#065F46" },
  rechazada:  { bg: "#FFF1F2", color: "#9F1239" },
  pendiente:  { bg: "#FFF7ED", color: "#9A3412" },
};

type User = {
  id: string; email: string; created_at: string; last_sign_in: string | null;
  provider: string; role: string | null; plan: string;
  onboarding_completed: boolean; solicitudes_count: number; ofertas_count: number;
};
type Lead = { id: string; plan: string; company: string; name: string; email: string; phone: string; notes: string; created_at: string; };
type Solicitud = {
  id: string; borrower_id: string; destino: string | null; descripcion: string | null;
  monto: number; plazo_meses: number; status: string; created_at: string;
  owner_email?: string;
};
type View = "usuarios" | "solicitudes" | "leads" | "metricas";

function PlanBadge({ plan, large }: { plan: string; large?: boolean }) {
  const cfg = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG] ?? PLAN_CONFIG.free;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:large?12:11, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, borderRadius:999, padding:large?"4px 12px":"2px 8px", whiteSpace:"nowrap", boxShadow:cfg.glow?`0 0 12px ${cfg.glow}`:"none" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:cfg.dot, display:"inline-block", flexShrink:0 }}/>
      {cfg.label}
    </span>
  );
}
function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span style={{ fontSize:11, color:"#CBD5E1" }}>—</span>;
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
  if (!cfg) return <span style={{ fontSize:11, color:"#94A3B8" }}>{role}</span>;
  return <span style={{ fontSize:11, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, borderRadius:999, padding:"2px 8px", whiteSpace:"nowrap" }}>{cfg.label}</span>;
}
function StatusBadge({ status }: { status: string }) {
  const cfg = SOL_STATUS_CONFIG[status] ?? { bg:"#F8FAFC", color:"#475569" };
  return <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:cfg.bg, color:cfg.color, borderRadius:999, padding:"2px 8px", whiteSpace:"nowrap" }}>{status}</span>;
}

// ── Edit Solicitud Modal ────────────────────────────────────────────────────
function EditSolicitudModal({ sol, onClose, onSaved, onDeleted }: {
  sol: Solicitud; onClose: () => void; onSaved: (updated: Solicitud) => void; onDeleted: (id: string) => void;
}) {
  const [descripcion, setDescripcion] = useState(sol.descripcion ?? "");
  const [destino, setDestino] = useState(sol.destino ?? "");
  const [status, setStatus] = useState(sol.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("solicitudes")
      .update({ descripcion: descripcion.trim(), destino: destino.trim(), status })
      .eq("id", sol.id);
    if (error) { setSaving(false); alert("Error al guardar: " + error.message); return; }
    setSaving(false); setSaved(true);
    setTimeout(() => {
      onSaved({ ...sol, descripcion: descripcion.trim(), destino: destino.trim(), status });
      onClose();
    }, 700);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta solicitud? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("solicitudes").delete().eq("id", sol.id);
    if (error) { alert("Error al eliminar: " + error.message); return; }
    onDeleted(sol.id);
    onClose();
  }

  const STATUSES = ["enviada","en_revision","ofertada","aceptada","rechazada","pendiente"];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.65)", backdropFilter:"blur(8px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:520, boxShadow:"0 32px 80px rgba(15,23,42,.25)", overflow:"hidden", animation:"modalIn .25s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #E8EDF5", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.03em" }}>Editar solicitud</div>
            <div style={{ fontSize:10, color:"#94A3B8", marginTop:3, fontFamily:"'Geist Mono',monospace" }}>
              {sol.id.slice(0,8)}… · {sol.owner_email ?? sol.borrower_id.slice(0,8)+"…"}
            </div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", cursor:"pointer", display:"grid", placeItems:"center" }}>
            <Ic d="M3 3l10 10M13 3L3 13" s={11} c="#64748B"/>
          </button>
        </div>
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:16 }}>
          {saved ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)", border:"2px solid #34D399", display:"grid", placeItems:"center", margin:"0 auto 12px", boxShadow:"0 0 24px rgba(52,211,153,.3)" }}>
                <Ic d="M2 8l4 4 8-8" s={20} c="#059669"/>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:"#065F46" }}>Guardado</div>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[
                  { label:"MONTO", val: fmt(sol.monto) },
                  { label:"PLAZO", val: `${sol.plazo_meses} meses` },
                  { label:"FECHA", val: fmtDate(sol.created_at) },
                ].map(f => (
                  <div key={f.label} style={{ background:"#F8FAFC", border:"1px solid #E8EDF5", borderRadius:10, padding:"9px 12px" }}>
                    <div style={{ fontSize:9, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em", marginBottom:4 }}>{f.label}</div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{f.val}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", marginBottom:8, letterSpacing:".08em", fontFamily:"'Geist Mono',monospace" }}>DESTINO</div>
                <input value={destino} onChange={e => setDestino(e.target.value)} placeholder="Ej. Capital de trabajo..."
                  style={{ width:"100%", height:38, borderRadius:10, border:"1.5px solid #E2E8F0", background:"#FAFAFA", padding:"0 12px", fontSize:12, fontFamily:"'Geist',sans-serif", outline:"none", color:"#0F172A" }}
                  onFocus={e => e.currentTarget.style.borderColor="#3B82F6"}
                  onBlur={e => e.currentTarget.style.borderColor="#E2E8F0"}
                />
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", marginBottom:8, letterSpacing:".08em", fontFamily:"'Geist Mono',monospace" }}>
                  DESCRIPCIÓN
                  <span style={{ marginLeft:8, fontSize:9, color:"#F87171", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:4, padding:"1px 6px" }}>editable</span>
                </div>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={5}
                  placeholder="Descripción de la solicitud..."
                  style={{ width:"100%", borderRadius:10, border:"1.5px solid #E2E8F0", background:"#FAFAFA", padding:"10px 12px", fontSize:12, fontFamily:"'Geist',sans-serif", outline:"none", color:"#0F172A", resize:"vertical", lineHeight:1.6 }}
                  onFocus={e => e.currentTarget.style.borderColor="#3B82F6"}
                  onBlur={e => e.currentTarget.style.borderColor="#E2E8F0"}
                />
                <div style={{ fontSize:9, color:"#94A3B8", marginTop:4, fontFamily:"'Geist Mono',monospace" }}>
                  {descripcion.length} caracteres
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", marginBottom:8, letterSpacing:".08em", fontFamily:"'Geist Mono',monospace" }}>STATUS</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {STATUSES.map(s => {
                    const cfg = SOL_STATUS_CONFIG[s] ?? { bg:"#F8FAFC", color:"#475569" };
                    const active = status === s;
                    return (
                      <button key={s} onClick={() => setStatus(s)}
                        style={{ height:30, padding:"0 12px", borderRadius:8, border:`2px solid ${active ? cfg.color+"66" : "#E2E8F0"}`, background:active ? cfg.bg : "#FAFAFA", color:active ? cfg.color : "#CBD5E1", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Geist Mono',monospace", transition:"all .12s" }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, paddingTop:4 }}>
                <button onClick={handleDelete} style={{ flex:1, height:42, borderRadius:10, border:"1.5px solid #FECDD3", background:"#FFF1F2", color:"#9F1239", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>🗑 Eliminar</button>
                <button onClick={onClose} style={{ flex:1, height:42, borderRadius:10, border:"1.5px solid #E2E8F0", background:"#FAFAFA", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex:2, height:42, borderRadius:10, border:"none", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", opacity:saving ? .6 : 1 }}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan Modal ─────────────────────────────────────────────────────────────
function PlanModal({ user, onClose, onSaved }: { user:User; onClose:()=>void; onSaved:(uid:string,plan:string,role:string|null)=>void }) {
  const [plan, setPlan] = useState(user.plan);
  const [role, setRole] = useState(user.role ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/set-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, plan: role === "solicitante" ? "free" : plan, role: role || null }),
    });
    if (!res.ok) { setSaving(false); alert("Error al guardar"); return; }
    setSaving(false); setSaved(true);
    setTimeout(() => { onSaved(user.id, plan, role||null); onClose(); }, 800);
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.6)", backdropFilter:"blur(8px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:420, boxShadow:"0 32px 80px rgba(15,23,42,.22)", overflow:"hidden", animation:"modalIn .25s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #E8EDF5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.03em" }}>Editar usuario</div>
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:2, fontFamily:"'Geist Mono',monospace" }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", cursor:"pointer", display:"grid", placeItems:"center" }}>
            <Ic d="M3 3l10 10M13 3L3 13" s={11} c="#64748B"/>
          </button>
        </div>
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:16 }}>
          {saved ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)", border:"2px solid #34D399", display:"grid", placeItems:"center", margin:"0 auto 12px", boxShadow:"0 0 24px rgba(52,211,153,.3)" }}>
                <Ic d="M2 8l4 4 8-8" s={20} c="#059669"/>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:"#065F46" }}>Guardado</div>
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", marginBottom:10, letterSpacing:".08em", fontFamily:"'Geist Mono',monospace" }}>PLAN</div>
                {role === "solicitante" ? (
                  <div style={{ padding:"12px 16px", borderRadius:12, background:"#F8FAFC", border:"1.5px solid #E2E8F0", fontSize:12, color:"#94A3B8" }}>
                    Solicitantes siempre son <strong>Free</strong>.
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:8 }}>
                    {(["free","basic","pro"] as const).map(p => {
                      const cfg = PLAN_CONFIG[p]; const active = plan === p;
                      return (
                        <button key={p} onClick={() => setPlan(p)} style={{ flex:1, padding:"12px 8px", borderRadius:12, border:`2px solid ${active?cfg.border:"#E2E8F0"}`, background:active?cfg.bg:"#FAFAFA", cursor:"pointer", fontFamily:"'Geist',sans-serif", transition:"all .15s", boxShadow:active&&cfg.glow?`0 0 16px ${cfg.glow}`:"none" }}>
                          <div style={{ fontSize:13, fontWeight:800, color:active?cfg.color:"#CBD5E1" }}>{cfg.label}</div>
                          <div style={{ fontSize:10, color:active?cfg.color:"#E2E8F0", marginTop:3 }}>{p==="free"?"Sin acceso":p==="basic"?"$70/mes":"$500/mes"}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", marginBottom:10, letterSpacing:".08em", fontFamily:"'Geist Mono',monospace" }}>ROL</div>
                <div style={{ display:"flex", gap:8 }}>
                  {([["otorgante","Otorgante","#5B21B6"],["solicitante","Solicitante","#9A3412"]] as const).map(([r,label,col]) => (
                    <button key={r} onClick={() => setRole(r)} style={{ flex:1, padding:"12px 8px", borderRadius:12, border:`2px solid ${role===r?col+"44":"#E2E8F0"}`, background:role===r?col+"0A":"#FAFAFA", cursor:"pointer", fontFamily:"'Geist',sans-serif", transition:"all .15s" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:role===r?col:"#CBD5E1" }}>{label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, paddingTop:4 }}>
                <button onClick={onClose} style={{ flex:1, height:42, borderRadius:10, border:"1.5px solid #E2E8F0", background:"#FAFAFA", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ flex:2, height:42, borderRadius:10, border:"none", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", opacity:saving?.6:1 }}>
                  {saving?"Guardando...":"Guardar cambios"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Score helpers ───────────────────────────────────────────────────────────
type ScoreVar = {
  key: string; label: string; cat: string; w: number;
  value: number | null; raw: string; status: "ok"|"warn"|"risk"|"missing"|"pending";
  source: string; benchmark?: string;
};
const SCOLOR: Record<string,string> = { ok:"#00C48C", warn:"#FACC15", risk:"#FB923C", missing:"#F87171", pending:"#475569" };

function scoreGrade(s: number) {
  if (s>=85) return {l:"A",label:"Excelente", c:"#00C48C",g:"rgba(0,196,140,.35)"};
  if (s>=70) return {l:"B",label:"Bueno",     c:"#4ADE80",g:"rgba(74,222,128,.3)"};
  if (s>=55) return {l:"C",label:"Moderado",  c:"#FACC15",g:"rgba(250,204,21,.3)"};
  if (s>=40) return {l:"D",label:"Bajo",      c:"#FB923C",g:"rgba(251,146,60,.3)"};
  return            {l:"E",label:"Alto riesgo",c:"#F87171",g:"rgba(248,113,113,.35)"};
}

function calcScore(b: any): { score: number; vars: ScoreVar[] } {
  function norm(val: number, min: number, max: number) {
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  }
  const vars: ScoreVar[] = [
    { key:"rfc", label:"RFC validado", cat:"Fiscal", w:5, value: b?.rfc ? 100 : 0, raw: b?.rfc || "Sin RFC", status: b?.rfc ? "ok" : "missing", source:"declared", benchmark:"Requerido" },
    { key:"antiguedad", label:"Antigüedad empresa", cat:"Fiscal", w:8, value: b?.fin_antiguedad ? norm(Number(b.fin_antiguedad), 0, 10) : 0, raw: b?.fin_antiguedad ? `${b.fin_antiguedad} años` : "—", status: b?.fin_antiguedad ? (Number(b.fin_antiguedad)>=3?"ok":"warn") : "missing", source:"declared", benchmark:">3 años" },
    { key:"facturacion", label:"Facturación anual", cat:"Financiero", w:14, value: b?.fin_facturacion_anual ? norm(Number(b.fin_facturacion_anual), 0, 50_000_000) : 0, raw: b?.fin_facturacion_anual ? `$${(Number(b.fin_facturacion_anual)/1_000_000).toFixed(1)}M` : "—", status: b?.fin_facturacion_anual ? (Number(b.fin_facturacion_anual)>=5_000_000?"ok":"warn") : "missing", source:"declared", benchmark:">$5M MXN" },
    { key:"empleados", label:"Empleados", cat:"Operativo", w:6, value: b?.fin_num_empleados ? norm(Number(b.fin_num_empleados), 0, 200) : 0, raw: b?.fin_num_empleados ? `${b.fin_num_empleados}` : "—", status: b?.fin_num_empleados ? (Number(b.fin_num_empleados)>=20?"ok":"warn") : "missing", source:"declared", benchmark:">20" },
    { key:"sector", label:"Sector / giro", cat:"Mercado", w:6, value: b?.fin_sector ? 75 : 0, raw: b?.fin_sector || "—", status: b?.fin_sector ? "ok" : "missing", source:"declared", benchmark:"Bajo riesgo" },
    { key:"garantias", label:"Garantías ofrecidas", cat:"Crédito", w:12, value: b?.fin_garantias ? 65 : 20, raw: b?.fin_garantias || "Sin garantías", status: b?.fin_garantias ? "ok" : "warn", source:"declared", benchmark:"1.5x cobertura" },
    { key:"dscr", label:"DSCR (estimado)", cat:"Financiero", w:14, value: 45, raw:"Pendiente Ekatena", status:"pending", source:"pending", benchmark:"≥1.25x" },
    { key:"ebitda_vol", label:"Volatilidad EBITDA", cat:"Financiero", w:10, value: null, raw:"Requiere Ekatena", status:"pending", source:"pending", benchmark:"<15%" },
    { key:"dso", label:"DSO días cobranza", cat:"Operativo", w:8, value: null, raw:"Requiere Ekatena", status:"pending", source:"pending", benchmark:"<45 días" },
    { key:"historial", label:"Historial Plinius", cat:"Crédito", w:8, value: 0, raw:"Sin historial", status:"missing", source:"plinius", benchmark:"Requerido" },
    { key:"buro", label:"Buró de Crédito", cat:"Crédito", w:9, value: null, raw:"Consulta pendiente", status:"pending", source:"buro", benchmark:"Score >650" },
  ];
  const total_w = vars.reduce((s,v) => s + (v.value!==null && v.status!=="pending" ? v.w : 0), 0);
  const weighted = vars.reduce((s,v) => s + (v.value!==null && v.status!=="pending" ? v.value * v.w : 0), 0);
  const score = total_w > 0 ? Math.round(weighted / total_w) : 0;
  return { score, vars };
}

function MiniGauge({ score }: { score: number }) {
  const g = scoreGrade(score);
  const cx=70,cy=62, START=-210, RANGE=240;
  const ang = START + (score/100)*RANGE;
  function pt(deg:number,rad:number){const a=deg*Math.PI/180;return{x:cx+rad*Math.cos(a),y:cy+rad*Math.sin(a)};}
  function arc(s:number,e:number,ri:number,ro:number){
    const a=pt(s,ro),b=pt(e,ro),c=pt(e,ri),d=pt(s,ri);const l=e-s>180?1:0;
    return `M${a.x},${a.y} A${ro},${ro} 0 ${l} 1 ${b.x},${b.y} L${c.x},${c.y} A${ri},${ri} 0 ${l} 0 ${d.x},${d.y} Z`;
  }
  const SEGS=[{f:-210,t:-168,c:"#F87171"},{f:-168,t:-126,c:"#FB923C"},{f:-126,t:-84,c:"#FACC15"},{f:-84,t:-42,c:"#4ADE80"},{f:-42,t:30,c:"#00C48C"}];
  const needle=pt(ang,40);
  return (
    <svg viewBox="0 0 140 90" style={{width:140,overflow:"visible"}}>
      <defs><radialGradient id="mg"><stop offset="0%" stopColor={g.c} stopOpacity=".12"/><stop offset="100%" stopColor={g.c} stopOpacity="0"/></radialGradient></defs>
      <circle cx={cx} cy={cy} r={60} fill="url(#mg)"/>
      <path d={arc(-210,30,36,52)} fill="#F1F5F9"/>
      {SEGS.map((s,i)=><path key={i} d={arc(s.f,s.t,37,51)} fill={s.c} opacity={0.15}/>)}
      {score>0&&<path d={arc(-210,ang,37,51)} fill={g.c} opacity={0.9}/>}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={g.c} strokeWidth={2} strokeLinecap="round" style={{filter:`drop-shadow(0 0 3px ${g.g})`}}/>
      <circle cx={cx} cy={cy} r={4} fill={g.c}/>
      <circle cx={cx} cy={cy} r={2} fill="#fff"/>
      <text x={cx} y={cy+18} textAnchor="middle" fill={g.c} fontSize={18} fontWeight={900} fontFamily="'Geist Mono',monospace" style={{filter:`drop-shadow(0 0 6px ${g.g})`}}>{score}</text>
      <text x={cx} y={cy+28} textAnchor="middle" fill="#94A3B8" fontSize={7} fontFamily="'Geist Mono',monospace">/ 100</text>
    </svg>
  );
}

function downloadCSV(borrower: any, vars: ScoreVar[], score: number, empresa: string) {
  const rows = [
    ["Empresa", empresa], ["Score", score], ["Fecha", new Date().toLocaleDateString("es-MX")], [""],
    ["Variable","Categoría","Peso","Valor","Raw","Status","Fuente","Benchmark"],
    ...vars.map(v=>[v.label,v.cat,v.w,v.value??"-",v.raw,v.status,v.source,v.benchmark||""]),
  ];
  const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`score_${empresa.replace(/\s/g,"_")}_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(borrower: any, vars: ScoreVar[], score: number, empresa: string) {
  const g = scoreGrade(score);
  const now = new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"});
  const rows = vars.map(v=>`<tr><td>${v.label}</td><td>${v.cat}</td><td>${v.w}%</td><td style="color:${SCOLOR[v.status]};font-weight:700">${v.raw}</td><td>${v.benchmark||"—"}</td><td style="color:${SCOLOR[v.status]};font-weight:700;text-transform:uppercase">${v.status}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1E293B;background:#fff;padding:40px}h1{font-size:22px;font-weight:900;letter-spacing:-0.04em;color:#0C1E4A}.sub{font-size:11px;color:#94A3B8;margin-top:4px;font-family:monospace}.score-box{display:inline-flex;align-items:center;gap:20px;margin:24px 0;padding:20px 28px;border-radius:16px;background:#F8FAFC;border:2px solid ${g.c}40}.score-num{font-size:52px;font-weight:900;color:${g.c};font-family:monospace}.score-grade{width:52px;height:52px;border-radius:12px;background:${g.c}18;border:2px solid ${g.c}44;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:${g.c};font-family:monospace}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th{background:#0C1E4A;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em}td{padding:8px 10px;border-bottom:1px solid #F1F5F9}tr:nth-child(even) td{background:#F8FAFC}.warn{background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:10px 14px;font-size:11px;color:#9A3412;margin-top:16px}.footer{margin-top:32px;font-size:10px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:16px}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>Score Crediticio Plinius</h1><div class="sub">${empresa} · ${now} · Modelo v2.0-beta</div></div></div><div class="score-box"><div class="score-grade">${g.l}</div><div><div class="score-num">${score}</div><div style="font-size:13px;font-weight:700;color:${g.c}">${g.label} · Grado ${g.l}</div></div></div><table><thead><tr><th>Variable</th><th>Categoría</th><th>Peso</th><th>Valor</th><th>Benchmark</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="warn">⚠ Reporte preliminar. DSCR, EBITDA y DSO requieren Ekatena. Buró pendiente ($299 MXN).</div><div class="footer">Generado por Plinius · plinius.mx · No constituye dictamen crediticio definitivo.</div></body></html>`;
  const blob = new Blob([html],{type:"text/html"});
  const url = URL.createObjectURL(blob);
  const w = window.open(url,"_blank"); w?.print();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

// ── User Profile Slide Panel ────────────────────────────────────────────────
function UserProfile({ user, onClose, onEdit }: { user:User; onClose:()=>void; onEdit:()=>void }) {
  const router = useRouter();
  const [borrower, setBorrower] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"perfil"|"score"|"solicitudes"|"ofertas">("perfil");
  const [scanRequested, setScanRequested] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [editingSol, setEditingSol] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data:b }, { data:s }, { data:o }] = await Promise.all([
        supabase.from("borrowers_profile").select("*").eq("borrower_id", user.id).maybeSingle(),
        supabase.from("solicitudes").select("id,destino,descripcion,monto,status,created_at,plazo_meses").eq("borrower_id", user.id).order("created_at",{ascending:false}).limit(20),
        supabase.from("ofertas").select("id,monto_ofertado,tasa_anual,status,created_at").eq("otorgante_id", user.id).order("created_at",{ascending:false}).limit(10),
      ]);
      setBorrower(b); setSolicitudes(s??[]); setOfertas(o??[]);
      setLoading(false);
    })();
  }, [user.id]);

  const SC: Record<string,{bg:string;color:string}> = {
    enviada:{bg:"#EFF6FF",color:"#1E40AF"}, en_revision:{bg:"#FFF7ED",color:"#9A3412"},
    ofertada:{bg:"#F0FDF9",color:"#065F46"}, aceptada:{bg:"#ECFDF5",color:"#065F46"},
    rechazada:{bg:"#FFF1F2",color:"#9F1239"}, pendiente:{bg:"#FFF7ED",color:"#9A3412"},
  };

  const { score, vars } = calcScore(borrower);
  const grade = scoreGrade(score);
  const empresa = borrower?.razon_social || borrower?.nombre_completo || user.email.split("@")[0];
  const completeness = Math.round(vars.filter(v=>v.value!==null&&v.status!=="pending").length/vars.length*100);

  async function requestScan() {
    setScanLoading(true);
    await supabase.from("scan_requests").upsert({
      user_id: user.id, type:"buro_sat", status:"pending",
      amount: 299, requested_by:"admin", requested_at: new Date().toISOString()
    }).then(()=>{});
    await new Promise(r=>setTimeout(r,1800));
    setScanLoading(false);
    setScanRequested(true);
  }

  const TABS = [
    {id:"perfil",     label:"Perfil"},
    {id:"score",      label:"Score"},
    {id:"solicitudes",label:`Solicitudes (${user.solicitudes_count})`},
    {id:"ofertas",    label:`Ofertas (${user.ofertas_count})`},
  ] as const;

  return (
    <>
    <div style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"stretch", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.4)", backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative", width:"100%", maxWidth:560, background:"#F8FAFC", display:"flex", flexDirection:"column", animation:"slideRight .3s cubic-bezier(.16,1,.3,1)", overflowY:"auto" }}>
        <div style={{ padding:"20px 22px 0", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", position:"relative", overflow:"hidden", flexShrink:0 }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize:"28px 28px" }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.2)", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <Ic d="M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5" s={18} c="#93C5FD"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"#EEF2FF", letterSpacing:"-0.03em" }}>{empresa}</div>
                  <div style={{ fontSize:10, color:"rgba(238,242,255,.45)", fontFamily:"'Geist Mono',monospace", marginTop:1 }}>{user.email}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {!loading && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px 4px 6px", borderRadius:10, background:`${grade.c}18`, border:`1px solid ${grade.c}40` }}>
                    <div style={{ width:22, height:22, borderRadius:6, background:`${grade.c}20`, border:`1px solid ${grade.c}50`, display:"grid", placeItems:"center", fontSize:11, fontWeight:900, color:grade.c, fontFamily:"'Geist Mono',monospace" }}>{grade.l}</div>
                    <span style={{ fontSize:12, fontWeight:900, color:grade.c, fontFamily:"'Geist Mono',monospace" }}>{score}</span>
                  </div>
                )}
                <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.08)", cursor:"pointer", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <Ic d="M3 3l10 10M13 3L3 13" s={11} c="rgba(255,255,255,.6)"/>
                </button>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
              <PlanBadge plan={user.plan} large/>
              {user.role && <RoleBadge role={user.role}/>}
              <span style={{ fontSize:9, fontFamily:"'Geist Mono',monospace", color:"rgba(238,242,255,.25)" }}>ID: {user.id.slice(0,8)}…</span>
            </div>
            <div style={{ display:"flex", gap:0, borderBottom:"1px solid rgba(255,255,255,.08)" }}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{ padding:"8px 14px", border:"none", background:"transparent", cursor:"pointer", fontSize:11, fontWeight:tab===t.id?700:500, color:tab===t.id?"#fff":"rgba(255,255,255,.4)", fontFamily:"'Geist',sans-serif", borderBottom:tab===t.id?"2px solid #00E5A0":"2px solid transparent", transition:"all .15s", whiteSpace:"nowrap" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex:1, padding:"18px 22px", display:"flex", flexDirection:"column", gap:12 }}>
          {loading ? (
            <div style={{ padding:32, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <svg style={{ animation:"spin .7s linear infinite" }} width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
              <span style={{ fontSize:12, color:"#94A3B8" }}>Cargando...</span>
            </div>
          ) : (
            <>
              {tab==="perfil" && (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {[
                      {label:"Registro",      val:fmtDateShort(user.created_at)},
                      {label:"Último acceso", val:user.last_sign_in?fmtDateShort(user.last_sign_in):"—"},
                      {label:"Onboarding",    val:user.onboarding_completed?"✓ Completo":"Pendiente"},
                    ].map(s=>(
                      <div key={s.label} style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:11, padding:"11px 13px" }}>
                        <div style={{ fontSize:9, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", marginBottom:4, letterSpacing:".06em" }}>{s.label.toUpperCase()}</div>
                        <div style={{ fontSize:12, fontWeight:700 }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  {borrower ? (
                    <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, padding:"15px 17px" }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", marginBottom:13, letterSpacing:".06em" }}>DATOS DEL PERFIL</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
                        {([
                          ["RFC", borrower.rfc],
                          ["CURP", borrower.curp],
                          ["Empresa", borrower.razon_social],
                          ["Sector", borrower.fin_sector],
                          ["Facturación", borrower.fin_facturacion_anual ? `$${Number(borrower.fin_facturacion_anual).toLocaleString("es-MX")}` : null],
                          ["Antigüedad", borrower.fin_antiguedad ? `${borrower.fin_antiguedad} años` : null],
                          ["Empleados", borrower.fin_num_empleados],
                          ["CLABE", borrower.clabe ? `****${borrower.clabe.slice(-4)}` : null],
                        ] as [string,string|null][]).filter(([,v])=>v).map(([label,val])=>(
                          <div key={label}>
                            <div style={{ fontSize:9, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", marginBottom:3, letterSpacing:".06em" }}>{label.toUpperCase()}</div>
                            <div style={{ fontSize:12, fontWeight:600 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, padding:20, textAlign:"center" }}>
                      <div style={{ fontSize:12, color:"#94A3B8" }}>Sin perfil completado</div>
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <button onClick={() => { onClose(); router.push(`/admin/users/${user.id}/score`); }}
                      style={{ height:42, borderRadius:11, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#0C1E4A", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      📊 Ver Score completo
                    </button>
                    <button onClick={onEdit}
                      style={{ height:42, borderRadius:11, border:"none", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", boxShadow:"0 4px 14px rgba(12,30,74,.22)" }}>
                      Editar plan y rol →
                    </button>
                  </div>
                </>
              )}

              {tab==="score" && (
                <>
                  <div style={{ background:"linear-gradient(135deg,#0C1E4A,#0F2A5C)", border:`1px solid ${grade.c}30`, borderRadius:16, padding:"18px 20px", display:"flex", alignItems:"center", gap:16, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:`radial-gradient(circle,${grade.g} 0%,transparent 70%)`,pointerEvents:"none" }}/>
                    <MiniGauge score={score}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"rgba(238,242,255,.4)", letterSpacing:".1em", marginBottom:6 }}>SCORE CREDITICIO PLINIUS</div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <div style={{ width:42,height:42,borderRadius:11,background:`${grade.c}18`,border:`2px solid ${grade.c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:grade.c,fontFamily:"'Geist Mono',monospace" }}>{grade.l}</div>
                        <div>
                          <div style={{ fontSize:20,fontWeight:900,color:grade.c,fontFamily:"'Geist Mono',monospace",textShadow:`0 0 14px ${grade.g}` }}>{score} <span style={{ fontSize:11,color:"rgba(238,242,255,.4)" }}>/100</span></div>
                          <div style={{ fontSize:11,color:"rgba(238,242,255,.5)" }}>{grade.label}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                          <span style={{ fontSize:9,fontFamily:"'Geist Mono',monospace",color:"rgba(238,242,255,.35)" }}>COMPLETITUD DEL MODELO</span>
                          <span style={{ fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#00E5A0" }}>{completeness}%</span>
                        </div>
                        <div style={{ height:4,borderRadius:999,background:"rgba(255,255,255,.08)" }}>
                          <div style={{ height:"100%",borderRadius:999,width:`${completeness}%`,background:"linear-gradient(90deg,#3B82F6,#00E5A0)",transition:"width 1s" }}/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { onClose(); router.push(`/admin/users/${user.id}/score`); }}
                    style={{ height:40, borderRadius:11, border:"1px solid rgba(0,229,160,.3)", background:"rgba(0,229,160,.06)", color:"#00C48C", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    📊 Abrir score completo →
                  </button>
                  <div style={{ background:"rgba(251,146,60,.05)", border:"1px solid rgba(251,146,60,.18)", borderRadius:12, padding:"11px 14px", display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:26,height:26,borderRadius:7,background:"rgba(251,146,60,.1)",display:"grid",placeItems:"center",flexShrink:0,fontSize:13 }}>⚡</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11,fontWeight:700,color:"#FB923C" }}>Ekatena no conectado</div>
                      <div style={{ fontSize:9,color:"rgba(251,146,60,.55)",fontFamily:"'Geist Mono',monospace" }}>DSCR · EBITDA real · DSO · CFDIs SAT</div>
                    </div>
                    <span style={{ fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#FB923C",background:"rgba(251,146,60,.1)",border:"1px solid rgba(251,146,60,.2)",borderRadius:999,padding:"2px 8px",whiteSpace:"nowrap" }}>PENDIENTE</span>
                  </div>
                  <div style={{ background: scanRequested?"rgba(0,196,140,.06)":"rgba(139,92,246,.06)", border:`1px solid ${scanRequested?"rgba(0,196,140,.2)":"rgba(139,92,246,.2)"}`, borderRadius:12, padding:"13px 16px" }}>
                    {scanRequested ? (
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:28,height:28,borderRadius:8,background:"rgba(0,196,140,.12)",display:"grid",placeItems:"center",flexShrink:0 }}>
                          <Ic d="M2 8l4 4 8-8" s={14} c="#00C48C"/>
                        </div>
                        <div>
                          <div style={{ fontSize:11,fontWeight:700,color:"#00C48C" }}>Scan solicitado</div>
                          <div style={{ fontSize:9,color:"rgba(0,196,140,.6)",fontFamily:"'Geist Mono',monospace" }}>Buró + SAT · $299 MXN</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:28,height:28,borderRadius:8,background:"rgba(139,92,246,.1)",display:"grid",placeItems:"center",flexShrink:0,fontSize:13 }}>🏦</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:11,fontWeight:700,color:"#8B5CF6" }}>Consultar Buró de Crédito</div>
                          <div style={{ fontSize:9,color:"rgba(139,92,246,.6)",fontFamily:"'Geist Mono',monospace" }}>+9 pts al score · RFC requerido</div>
                        </div>
                        <button onClick={requestScan} disabled={scanLoading||!borrower?.rfc}
                          style={{ height:30,padding:"0 14px",borderRadius:8,border:"none",background:borrower?.rfc?"linear-gradient(135deg,#7C3AED,#6D28D9)":"#E2E8F0",color:borrower?.rfc?"#fff":"#94A3B8",fontSize:10,fontWeight:700,cursor:borrower?.rfc?"pointer":"not-allowed",fontFamily:"'Geist',sans-serif",flexShrink:0,opacity:scanLoading?.7:1,whiteSpace:"nowrap" }}>
                          {scanLoading?"Enviando…":"$299 →"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, overflow:"hidden" }}>
                    <div style={{ padding:"11px 16px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:10,fontWeight:700,color:"#94A3B8",fontFamily:"'Geist Mono',monospace",letterSpacing:".06em" }}>VARIABLES DEL MODELO</div>
                    </div>
                    {vars.map(v=>(
                      <div key={v.key} style={{ padding:"10px 16px", borderBottom:"1px solid #F8FAFC" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            <div style={{ width:7,height:7,borderRadius:"50%",background:SCOLOR[v.status],flexShrink:0 }}/>
                            <span style={{ fontSize:11,fontWeight:600,color:"#1E293B" }}>{v.label}</span>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            <span style={{ fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#64748B" }}>{v.raw}</span>
                            <span style={{ fontSize:9,fontFamily:"'Geist Mono',monospace",fontWeight:700,color:"#64748B",background:"#F1F5F9",borderRadius:999,padding:"1px 6px" }}>{v.w}%</span>
                          </div>
                        </div>
                        <div style={{ height:4,borderRadius:999,background:"#F1F5F9",overflow:"hidden" }}>
                          <div style={{ height:"100%",borderRadius:999,width:v.value!==null?`${v.value}%`:"0%",background:v.status==="pending"?"repeating-linear-gradient(90deg,#E2E8F0 0,#E2E8F0 4px,transparent 4px,transparent 8px)":SCOLOR[v.status] }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <button onClick={()=>downloadCSV(borrower,vars,score,empresa)}
                      style={{ height:40,borderRadius:11,border:"1.5px solid #E2E8F0",background:"#fff",color:"#0C1E4A",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                      ⬇ CSV
                    </button>
                    <button onClick={()=>downloadPDF(borrower,vars,score,empresa)}
                      style={{ height:40,borderRadius:11,border:"none",background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                      📄 PDF
                    </button>
                  </div>
                </>
              )}

              {tab==="solicitudes" && (
                solicitudes.length > 0 ? (
                  <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, overflow:"hidden" }}>
                    <div style={{ padding:"11px 16px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between" }}>
                      <div style={{ fontSize:10,fontWeight:700,color:"#94A3B8",fontFamily:"'Geist Mono',monospace",letterSpacing:".06em" }}>SOLICITUDES</div>
                      <span style={{ fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#94A3B8" }}>{user.solicitudes_count} total</span>
                    </div>
                    {solicitudes.map(s=>{
                      const sc=SC[s.status]??{bg:"#F8FAFC",color:"#475569"};
                      return (
                        <div key={s.id} style={{ borderBottom:"1px solid #F8FAFC" }}>
                          <div style={{ padding:"11px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <div>
                              <div style={{ fontSize:12,fontWeight:600 }}>{s.destino||"—"}</div>
                              <div style={{ fontSize:10,color:"#94A3B8",fontFamily:"'Geist Mono',monospace" }}>{fmtDateShort(s.created_at)} · {s.plazo_meses}m</div>
                            </div>
                            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <div style={{ fontSize:13,fontWeight:700,fontFamily:"'Geist Mono',monospace" }}>{fmt(s.monto)}</div>
                              <span style={{ fontSize:10,fontWeight:700,fontFamily:"'Geist Mono',monospace",background:sc.bg,color:sc.color,borderRadius:999,padding:"2px 8px" }}>{s.status}</span>
                              <button onClick={() => setEditingSol({ ...s, owner_email: user.email })}
                                style={{ height:24,padding:"0 8px",borderRadius:6,border:"1px solid #E2E8F0",background:"#F8FAFC",color:"#475569",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Geist',sans-serif" }}>
                                Editar
                              </button>
                            </div>
                          </div>
                          {s.descripcion && (
                            <div style={{ padding:"0 16px 10px" }}>
                              <div style={{ fontSize:11,color:"#64748B",background:"#F8FAFC",borderRadius:8,padding:"7px 10px",lineHeight:1.5 }}>{s.descripcion}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:32,textAlign:"center" }}><div style={{ fontSize:12,color:"#94A3B8" }}>Sin solicitudes</div></div>
                )
              )}

              {tab==="ofertas" && (
                ofertas.length > 0 ? (
                  <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, overflow:"hidden" }}>
                    <div style={{ padding:"11px 16px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between" }}>
                      <div style={{ fontSize:10,fontWeight:700,color:"#94A3B8",fontFamily:"'Geist Mono',monospace",letterSpacing:".06em" }}>OFERTAS</div>
                      <span style={{ fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#94A3B8" }}>{user.ofertas_count} total</span>
                    </div>
                    {ofertas.map(o=>{
                      const sc=SC[o.status]??{bg:"#F8FAFC",color:"#475569"};
                      return (
                        <div key={o.id} style={{ padding:"11px 16px",borderBottom:"1px solid #F8FAFC",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <div>
                            <div style={{ fontSize:13,fontWeight:700,fontFamily:"'Geist Mono',monospace" }}>{fmt(o.monto_ofertado)}</div>
                            <div style={{ fontSize:10,color:"#94A3B8",fontFamily:"'Geist Mono',monospace" }}>{fmtDateShort(o.created_at)} · {o.tasa_anual}% anual</div>
                          </div>
                          <span style={{ fontSize:10,fontWeight:700,fontFamily:"'Geist Mono',monospace",background:sc.bg,color:sc.color,borderRadius:999,padding:"2px 8px" }}>{o.status}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:32,textAlign:"center" }}><div style={{ fontSize:12,color:"#94A3B8" }}>Sin ofertas</div></div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
    {editingSol && (
      <EditSolicitudModal
        sol={editingSol}
        onClose={() => setEditingSol(null)}
        onSaved={(updated) => {
          setSolicitudes(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
          setEditingSol(null);
        }}
        onDeleted={(id) => {
          setSolicitudes(prev => prev.filter(s => s.id !== id));
          setEditingSol(null);
        }}
      />
    )}
    </>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
const SESSION_TIMEOUT = 10 * 60 * 1000;

export default function SuperAdminClient() {
  const router = useRouter();
  const [view, setView] = useState<View>("usuarios");
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSols, setLoadingSols] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [sortBy, setSortBy] = useState<"created_at"|"last_sign_in"|"plan">("created_at");
  const [editing, setEditing] = useState<User|null>(null);
  const [viewing, setViewing] = useState<User|null>(null);
  const [editingSol, setEditingSol] = useState<Solicitud|null>(null);
  const [solSearch, setSolSearch] = useState("");
  const [solFilterStatus, setSolFilterStatus] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [sessionWarning, setSessionWarning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    setSessionWarning(false);
    warningRef.current = setTimeout(() => setSessionWarning(true), SESSION_TIMEOUT - 60000);
    timeoutRef.current = setTimeout(async () => {
      await supabase.auth.signOut();
      router.push("/admin/login");
    }, SESSION_TIMEOUT);
  }, [router]);

  useEffect(() => {
    const events = ["mousedown","keydown","scroll","touchstart"];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer]);

  useEffect(() => {
    (async () => {
      const { data:auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/admin/login"); return; }
      const { data:sa } = await supabase.from("super_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
      if (!sa) { router.push("/dashboard"); return; }
      setAdminEmail(auth.user.email ?? "");
      await Promise.all([loadUsers(), loadLeads()]);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (view === "solicitudes" && solicitudes.length === 0) {
      loadSolicitudes();
    }
  }, [view]);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (json.users) setUsers(json.users);
  }
  async function loadLeads() {
    const { data } = await supabase.from("leads").select("*").order("created_at",{ascending:false});
    setLeads(data ?? []);
  }
  async function loadSolicitudes() {
    setLoadingSols(true);
    const { data } = await supabase
      .from("solicitudes")
      .select("id,borrower_id,destino,descripcion,monto,plazo_meses,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setSolicitudes(data as Solicitud[]);
    setLoadingSols(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }
  function handleSaved(uid:string, plan:string, role:string|null) {
    setUsers(prev => prev.map(u => u.id===uid ? {...u,plan,role} : u));
    if (viewing?.id===uid) setViewing(prev => prev ? {...prev,plan,role} : null);
  }
  function handleSolSaved(updated: Solicitud) {
    setSolicitudes(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    setEditingSol(null);
  }
  function handleSolDeleted(id: string) {
    setSolicitudes(prev => prev.filter(s => s.id !== id));
    setEditingSol(null);
  }

  const enrichedSols = useMemo(() => {
    const emailMap = new Map(users.map(u => [u.id, u.email]));
    return solicitudes.map(s => ({ ...s, owner_email: emailMap.get(s.borrower_id) ?? s.borrower_id.slice(0,8)+"…" }));
  }, [solicitudes, users]);

  const filteredSols = useMemo(() => {
    return enrichedSols.filter(s => {
      if (solFilterStatus && s.status !== solFilterStatus) return false;
      if (solSearch) {
        const q = solSearch.toLowerCase();
        return (s.destino ?? "").toLowerCase().includes(q)
          || (s.descripcion ?? "").toLowerCase().includes(q)
          || (s.owner_email ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [enrichedSols, solSearch, solFilterStatus]);

  const filtered = useMemo(() => {
    let arr = users.filter(u => {
      if (filterPlan && u.plan !== filterPlan) return false;
      if (filterRole && u.role !== filterRole) return false;
      if (search) { const q=search.toLowerCase(); return u.email.toLowerCase().includes(q)||u.id.toLowerCase().includes(q); }
      return true;
    });
    if (sortBy==="created_at")   arr=[...arr].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
    if (sortBy==="last_sign_in") arr=[...arr].sort((a,b)=>new Date(b.last_sign_in??0).getTime()-new Date(a.last_sign_in??0).getTime());
    if (sortBy==="plan")         arr=[...arr].sort((a,b)=>["pro","basic","free"].indexOf(a.plan)-["pro","basic","free"].indexOf(b.plan));
    return arr;
  }, [users, filterPlan, filterRole, search, sortBy]);

  const metrics = useMemo(() => ({
    total:        users.length,
    pro:          users.filter(u=>u.plan==="pro").length,
    basic:        users.filter(u=>u.plan==="basic").length,
    free:         users.filter(u=>u.plan==="free").length,
    otorgantes:   users.filter(u=>u.role==="otorgante").length,
    solicitantes: users.filter(u=>u.role==="solicitante").length,
    leads_total:  leads.length,
    active_7d:    users.filter(u=>u.last_sign_in && new Date(u.last_sign_in)>new Date(Date.now()-7*86400000)).length,
    conversion:   users.length>0 ? Math.round((users.filter(u=>u.plan!=="free").length/users.length)*100) : 0,
  }), [users, leads]);

  const NAV = [
    { key:"usuarios",    label:"Usuarios",    icon:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5",  count:users.length },
    { key:"solicitudes", label:"Solicitudes", icon:"M2 2h12v2H2zM2 6h9M2 10h7M10 9l2 2 4-4",        count:solicitudes.length || null },
    { key:"leads",       label:"Leads",       icon:"M4 2h8l2 2v10H2V4z",                            count:leads.length },
    { key:"metricas",    label:"Métricas",    icon:"M2 12L6 7l3 3 3-4 2 2",                         count:null },
  ];

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes modalIn{from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);}}
    @keyframes slideRight{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
    .fade{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
    .mono{font-family:'Geist Mono',monospace;}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
    .tr{display:grid;align-items:center;padding:10px 16px;border-bottom:1px solid #F1F5F9;transition:background .1s;}
    .tr:last-child{border-bottom:none;}
    .tr.clickable:hover{background:#F8FAFF;cursor:pointer;}
    .nav-btn{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;transition:all .15s;border:none;background:transparent;width:100%;font-family:'Geist',sans-serif;text-align:left;}
    .nav-btn:hover{background:rgba(255,255,255,.06);}
    .nav-btn.active{background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);}
    .fsel{height:32px;border-radius:8px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 10px;font-size:11px;color:#374151;font-family:'Geist',sans-serif;outline:none;cursor:pointer;}
    .fsel:focus{border-color:#3B82F6;}
    .finp{height:32px;border-radius:8px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 10px 0 28px;font-size:11px;color:#374151;font-family:'Geist',sans-serif;outline:none;width:100%;}
    .finp:focus{border-color:#3B82F6;background:#fff;}
    ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:999px;}
  `;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", minHeight:"100vh", background:"#F1F5F9", display:"flex" }}>
      <style>{CSS}</style>

      {/* SIDEBAR */}
      <aside style={{ width:220, background:"linear-gradient(180deg,#0C1E4A 0%,#091530 100%)", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:50, borderRight:"1px solid rgba(255,255,255,.05)" }}>
        <div style={{ padding:"20px 16px 16px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)", display:"grid", placeItems:"center", flexShrink:0 }}>
              <Ic d="M8 2a3 3 0 00-3 3v2H3v7h10V7h-2V5a3 3 0 00-3-3z" s={13} c="#93C5FD"/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#EEF2FF", letterSpacing:"-0.03em" }}>Plinius</div>
              <div style={{ fontSize:9, fontFamily:"'Geist Mono',monospace", color:"#00E5A0", letterSpacing:".12em" }}>SUPER ADMIN</div>
            </div>
          </div>
        </div>
        <nav style={{ padding:"12px 8px", flex:1 }}>
          <div style={{ fontSize:9, fontFamily:"'Geist Mono',monospace", color:"rgba(238,242,255,.2)", letterSpacing:".12em", padding:"0 8px", marginBottom:6 }}>NAVEGACIÓN</div>
          {NAV.map(n => (
            <button key={n.key} className={`nav-btn${view===n.key?" active":""}`} onClick={() => setView(n.key as View)}>
              <Ic d={n.icon} s={14} c={view===n.key?"#93C5FD":"rgba(238,242,255,.35)"}/>
              <span style={{ fontSize:13, fontWeight:600, color:view===n.key?"#EEF2FF":"rgba(238,242,255,.5)", flex:1 }}>{n.label}</span>
              {n.count!==null && (
                <span style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", background:view===n.key?"rgba(255,255,255,.15)":"rgba(255,255,255,.06)", color:"rgba(238,242,255,.45)", borderRadius:999, padding:"1px 7px", fontWeight:700 }}>
                  {loading?"—":n.count}
                </span>
              )}
            </button>
          ))}
        </nav>
        {sessionWarning && (
          <div style={{ margin:"0 8px 8px", padding:"10px 12px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#FCA5A5", marginBottom:2 }}>⚠ Sesión expira en 1 min</div>
            <div style={{ fontSize:10, color:"rgba(252,165,165,.6)" }}>Mueve el mouse para extender</div>
          </div>
        )}
        <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ padding:"9px 10px", borderRadius:10, background:"rgba(255,255,255,.04)", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#00E5A0", animation:"pulse 2s ease-in-out infinite", flexShrink:0 }}/>
              <div style={{ fontSize:11, fontWeight:600, color:"rgba(238,242,255,.65)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{adminEmail||"admin"}</div>
            </div>
            <div style={{ fontSize:9, fontFamily:"'Geist Mono',monospace", color:"rgba(238,242,255,.22)", letterSpacing:".06em" }}>SUPER ADMIN · MFA ACTIVO</div>
          </div>
          <button onClick={handleLogout}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:9, border:"1px solid rgba(239,68,68,.18)", background:"rgba(239,68,68,.05)", cursor:"pointer", fontFamily:"'Geist',sans-serif", transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.12)";e.currentTarget.style.borderColor="rgba(239,68,68,.3)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,.05)";e.currentTarget.style.borderColor="rgba(239,68,68,.18)";}}>
            <Ic d="M10 8H2M7 5l-3 3 3 3M12 2h2v12h-2" s={13} c="#FCA5A5"/>
            <span style={{ fontSize:12, fontWeight:600, color:"#FCA5A5" }}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft:220, flex:1, display:"flex", flexDirection:"column", minHeight:"100vh" }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #E8EDF5", padding:"0 28px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:40 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.03em" }}>
              {view==="usuarios"?"Usuarios":view==="solicitudes"?"Solicitudes":view==="leads"?"Leads":"Métricas"}
            </div>
            <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", marginTop:1 }}>
              {view==="usuarios"&&`${filtered.length} de ${users.length} usuarios`}
              {view==="solicitudes"&&`${filteredSols.length} de ${solicitudes.length} solicitudes`}
              {view==="leads"&&`${leads.length} leads`}
            </div>
          </div>
          <button onClick={()=>{ loadUsers(); loadLeads(); if(view==="solicitudes") loadSolicitudes(); }}
            style={{ display:"flex", alignItems:"center", gap:5, height:30, padding:"0 12px", borderRadius:7, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
            <Ic d="M2 8a6 6 0 0110.9-3M14 8a6 6 0 01-10.9 3M2 4v4h4M14 12v-4h-4" s={11} c="#475569"/> Refrescar
          </button>
        </div>

        <div style={{ padding:"20px 28px", flex:1 }}>
          {/* KPIs */}
          <div className="fade" style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8, marginBottom:20 }}>
            {[
              { label:"Total",      val:metrics.total,           color:"#0F172A", icon:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5" },
              { label:"Activos 7d", val:metrics.active_7d,       color:"#2563EB", icon:"M8 2v12M2 8h12" },
              { label:"Pro",        val:metrics.pro,             color:"#059669", icon:"M2 8l4 4 8-8" },
              { label:"Basic",      val:metrics.basic,           color:"#1E40AF", icon:"M8 2v5M4 5h8" },
              { label:"Free",       val:metrics.free,            color:"#94A3B8", icon:"M2 2h12v10H2z" },
              { label:"Conversión", val:`${metrics.conversion}%`,color:"#9A3412", icon:"M2 12L6 7l3 3 3-4 2 2" },
              { label:"Leads",      val:metrics.leads_total,     color:"#5B21B6", icon:"M4 2h8l2 2v10H2V4z" },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding:"11px 13px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div className="mono" style={{ fontSize:9, color:"#94A3B8", letterSpacing:".08em" }}>{k.label.toUpperCase()}</div>
                  <div style={{ width:22, height:22, borderRadius:6, background:`${k.color}14`, display:"grid", placeItems:"center" }}>
                    <Ic d={k.icon} s={10} c={k.color}/>
                  </div>
                </div>
                <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.04em", color:k.color }}>{loading?"—":k.val}</div>
              </div>
            ))}
          </div>

          {/* USUARIOS */}
          {view==="usuarios" && (
            <div className="card fade" style={{ overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid #E8EDF5", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ position:"relative", flex:"1 1 180px" }}>
                  <div style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <Ic d="M10 10l4 4M2 7a5 5 0 1010 0A5 5 0 002 7z" s={11} c="#94A3B8"/>
                  </div>
                  <input className="finp" placeholder="Buscar email o ID..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <select className="fsel" value={filterPlan} onChange={e=>setFilterPlan(e.target.value)}>
                  <option value="">Todos los planes</option>
                  <option value="pro">Pro</option><option value="basic">Basic</option><option value="free">Free</option>
                </select>
                <select className="fsel" value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
                  <option value="">Todos los roles</option>
                  <option value="otorgante">Otorgante</option><option value="solicitante">Solicitante</option>
                </select>
                <select className="fsel" value={sortBy} onChange={e=>setSortBy(e.target.value as any)}>
                  <option value="created_at">Más recientes</option>
                  <option value="last_sign_in">Último acceso</option>
                  <option value="plan">Por plan</option>
                </select>
                {(filterPlan||filterRole||search) && (
                  <button onClick={()=>{setFilterPlan("");setFilterRole("");setSearch("");}}
                    style={{ height:32, padding:"0 10px", borderRadius:8, border:"1px solid #FECDD3", background:"#FFF1F2", color:"#9F1239", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
                    Limpiar
                  </button>
                )}
              </div>
              <div className="tr" style={{ gridTemplateColumns:"2.5fr 100px 90px 80px 90px 60px 60px 90px", background:"#F8FAFC", cursor:"default" }}>
                {["Email","Rol","Plan","Registro","Último acceso","Sols.","Ofertas",""].map(h => (
                  <div key={h} className="mono" style={{ fontSize:9, color:"#94A3B8", letterSpacing:".06em" }}>{h.toUpperCase()}</div>
                ))}
              </div>
              {loading ? (
                <div style={{ padding:48, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                  <svg style={{ animation:"spin .7s linear infinite" }} width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
                  <span style={{ fontSize:12, color:"#94A3B8" }}>Cargando usuarios...</span>
                </div>
              ) : filtered.length===0 ? (
                <div style={{ padding:40, textAlign:"center", fontSize:13, color:"#94A3B8" }}>Sin resultados</div>
              ) : filtered.map(u => (
                <div key={u.id} className="tr clickable" style={{ gridTemplateColumns:"2.5fr 100px 90px 80px 90px 60px 60px 90px" }} onClick={()=>setViewing(u)}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                    <div className="mono" style={{ fontSize:9, color:"#CBD5E1", marginTop:1 }}>{u.id.slice(0,8)}…</div>
                  </div>
                  <RoleBadge role={u.role}/>
                  <PlanBadge plan={u.plan}/>
                  <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{fmtDateShort(u.created_at)}</div>
                  <div className="mono" style={{ fontSize:10, color:u.last_sign_in?"#475569":"#CBD5E1" }}>{u.last_sign_in?fmtDateShort(u.last_sign_in):"—"}</div>
                  <div className="mono" style={{ fontSize:12, fontWeight:u.solicitudes_count>0?700:400, color:u.solicitudes_count>0?"#0F172A":"#CBD5E1" }}>{u.solicitudes_count}</div>
                  <div className="mono" style={{ fontSize:12, fontWeight:u.ofertas_count>0?700:400, color:u.ofertas_count>0?"#0F172A":"#CBD5E1" }}>{u.ofertas_count}</div>
                  <div style={{ display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setViewing(u)} style={{ height:26, padding:"0 8px", borderRadius:6, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>Ver</button>
                    <button onClick={()=>setEditing(u)} style={{ height:26, padding:"0 8px", borderRadius:6, border:"none", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SOLICITUDES GLOBAL */}
          {view==="solicitudes" && (
            <div className="card fade" style={{ overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid #E8EDF5", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ position:"relative", flex:"1 1 200px" }}>
                  <div style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <Ic d="M10 10l4 4M2 7a5 5 0 1010 0A5 5 0 002 7z" s={11} c="#94A3B8"/>
                  </div>
                  <input className="finp" placeholder="Buscar destino, descripción o email..." value={solSearch} onChange={e=>setSolSearch(e.target.value)}/>
                </div>
                <select className="fsel" value={solFilterStatus} onChange={e=>setSolFilterStatus(e.target.value)}>
                  <option value="">Todos los status</option>
                  {["enviada","en_revision","ofertada","aceptada","rechazada","pendiente"].map(s=>(
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {(solSearch||solFilterStatus) && (
                  <button onClick={()=>{setSolSearch("");setSolFilterStatus("");}}
                    style={{ height:32, padding:"0 10px", borderRadius:8, border:"1px solid #FECDD3", background:"#FFF1F2", color:"#9F1239", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
                    Limpiar
                  </button>
                )}
              </div>
              <div className="tr" style={{ gridTemplateColumns:"2fr 1.2fr 90px 70px 90px 80px 70px", background:"#F8FAFC", cursor:"default" }}>
                {["Usuario","Destino","Monto","Plazo","Status","Fecha",""].map(h=>(
                  <div key={h} className="mono" style={{ fontSize:9, color:"#94A3B8", letterSpacing:".06em" }}>{h.toUpperCase()}</div>
                ))}
              </div>
              {loadingSols ? (
                <div style={{ padding:48, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                  <svg style={{ animation:"spin .7s linear infinite" }} width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
                  <span style={{ fontSize:12, color:"#94A3B8" }}>Cargando...</span>
                </div>
              ) : filteredSols.length === 0 ? (
                <div style={{ padding:40, textAlign:"center", fontSize:13, color:"#94A3B8" }}>Sin solicitudes</div>
              ) : filteredSols.map(s => (
                <div key={s.id} style={{ borderBottom:"1px solid #F1F5F9" }}>
                  <div className="tr" style={{ gridTemplateColumns:"2fr 1.2fr 90px 70px 90px 80px 70px", borderBottom:"none" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.owner_email}</div>
                      <div className="mono" style={{ fontSize:9, color:"#CBD5E1" }}>{s.id.slice(0,8)}…</div>
                    </div>
                    <div style={{ fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:600 }}>{s.destino||"—"}</div>
                    <div className="mono" style={{ fontSize:12, fontWeight:700 }}>{fmt(s.monto)}</div>
                    <div className="mono" style={{ fontSize:11, color:"#64748B" }}>{s.plazo_meses}m</div>
                    <StatusBadge status={s.status}/>
                    <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{fmtDateShort(s.created_at)}</div>
                    <button onClick={() => setEditingSol(s)}
                      style={{ height:26, padding:"0 10px", borderRadius:6, border:"none", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", whiteSpace:"nowrap" }}>
                      Editar
                    </button>
                  </div>
                  {s.descripcion && (
                    <div style={{ padding:"0 16px 10px" }}>
                      <div style={{ fontSize:11, color:"#64748B", background:"#F8FAFC", border:"1px solid #E8EDF5", borderRadius:8, padding:"7px 11px", lineHeight:1.55, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any }}>
                        {s.descripcion}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* LEADS */}
          {view==="leads" && (
            <div className="card fade" style={{ overflow:"hidden" }}>
              <div className="tr" style={{ gridTemplateColumns:"1.5fr 80px 1.5fr 110px 1fr 100px", background:"#F8FAFC", cursor:"default" }}>
                {["Empresa","Plan","Email","Teléfono","Notas","Fecha"].map(h=>(
                  <div key={h} className="mono" style={{ fontSize:9, color:"#94A3B8", letterSpacing:".06em" }}>{h.toUpperCase()}</div>
                ))}
              </div>
              {leads.length===0 ? (
                <div style={{ padding:40, textAlign:"center", fontSize:13, color:"#94A3B8" }}>Sin leads aún</div>
              ) : leads.map(l=>(
                <div key={l.id} className="tr" style={{ gridTemplateColumns:"1.5fr 80px 1.5fr 110px 1fr 100px" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{l.company}</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>{l.name}</div>
                  </div>
                  <PlanBadge plan={l.plan}/>
                  <div style={{ fontSize:12, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.email}</div>
                  <div className="mono" style={{ fontSize:11, color:"#64748B" }}>{l.phone||"—"}</div>
                  <div style={{ fontSize:11, color:"#94A3B8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.notes||"—"}</div>
                  <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{fmtDate(l.created_at)}</div>
                </div>
              ))}
            </div>
          )}

          {/* MÉTRICAS */}
          {view==="metricas" && (
            <div className="fade" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div className="card" style={{ padding:22 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:18 }}>Distribución de planes</div>
                {[
                  { label:"Pro",   val:metrics.pro,   color:"#00E5A0" },
                  { label:"Basic", val:metrics.basic, color:"#3B82F6" },
                  { label:"Free",  val:metrics.free,  color:"#E2E8F0" },
                ].map(p=>(
                  <div key={p.label} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{p.label}</span>
                      <span className="mono" style={{ fontSize:11, color:"#94A3B8" }}>{p.val} · {metrics.total?Math.round(p.val/metrics.total*100):0}%</span>
                    </div>
                    <div style={{ height:7, borderRadius:999, background:"#F1F5F9", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${metrics.total?(p.val/metrics.total)*100:0}%`, background:p.color, borderRadius:999, transition:"width .6s cubic-bezier(.16,1,.3,1)" }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:22 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:18 }}>Actividad y roles</div>
                {[
                  { label:"Activos 7 días", val:metrics.active_7d,    color:"#2563EB" },
                  { label:"Otorgantes",     val:metrics.otorgantes,   color:"#5B21B6" },
                  { label:"Solicitantes",   val:metrics.solicitantes, color:"#9A3412" },
                ].map(r=>(
                  <div key={r.label} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{r.label}</span>
                      <span className="mono" style={{ fontSize:11, color:"#94A3B8" }}>{r.val} · {metrics.total?Math.round(r.val/metrics.total*100):0}%</span>
                    </div>
                    <div style={{ height:7, borderRadius:999, background:"#F1F5F9", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${metrics.total?(r.val/metrics.total)*100:0}%`, background:r.color, borderRadius:999, transition:"width .6s cubic-bezier(.16,1,.3,1)" }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:22, gridColumn:"span 2" }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:18 }}>Resumen de conversión</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                  {[
                    { label:"Total usuarios", val:metrics.total,              color:"#0F172A" },
                    { label:"Usuarios pagos", val:metrics.pro+metrics.basic,  color:"#059669" },
                    { label:"Total leads",    val:metrics.leads_total,        color:"#5B21B6" },
                    { label:"Conversión",     val:`${metrics.conversion}%`,   color:"#9A3412" },
                  ].map(l=>(
                    <div key={l.label} style={{ padding:"16px 18px", background:"#F8FAFC", border:"1px solid #E8EDF5", borderRadius:12 }}>
                      <div className="mono" style={{ fontSize:9, color:"#94A3B8", marginBottom:8, letterSpacing:".06em" }}>{l.label.toUpperCase()}</div>
                      <div style={{ fontSize:28, fontWeight:900, letterSpacing:"-0.04em", color:l.color }}>{l.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {viewing    && <UserProfile user={viewing}   onClose={()=>setViewing(null)} onEdit={()=>{setEditing(viewing);setViewing(null);}}/>}
      {editing    && <PlanModal   user={editing}    onClose={()=>setEditing(null)} onSaved={handleSaved}/>}
      {editingSol && <EditSolicitudModal sol={editingSol} onClose={()=>setEditingSol(null)} onSaved={handleSolSaved}/>}
    </div>
  );
}
