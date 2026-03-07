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

const PLAN_CONFIG = {
  free:  { label: "Free",  bg: "#F8FAFC", color: "#475569", border: "#E2E8F0", dot: "#CBD5E1", glow: "" },
  basic: { label: "Basic", bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", dot: "#3B82F6", glow: "rgba(59,130,246,.15)" },
  pro:   { label: "Pro",   bg: "#F0FDF9", color: "#065F46", border: "#6EE7B7", dot: "#00E5A0", glow: "rgba(0,229,160,.2)" },
};
const ROLE_CONFIG = {
  otorgante:   { label: "Otorgante",   bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" },
  solicitante: { label: "Solicitante", bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
};

type User = {
  id: string; email: string; created_at: string; last_sign_in: string | null;
  provider: string; role: string | null; plan: string;
  onboarding_completed: boolean; solicitudes_count: number; ofertas_count: number;
};
type Lead = { id: string; plan: string; company: string; name: string; email: string; phone: string; notes: string; created_at: string; };
type View = "usuarios" | "leads" | "metricas";

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

// ── Plan Modal ─────────────────────────────────────────────────────────────
function PlanModal({ user, onClose, onSaved }: { user:User; onClose:()=>void; onSaved:(uid:string,plan:string,role:string|null)=>void }) {
  const [plan, setPlan] = useState(user.plan);
  const [role, setRole] = useState(user.role ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase.from("plinius_profiles").upsert({ user_id:user.id, plan, plan_updated_at:new Date().toISOString() }, { onConflict:"user_id" });
    if (role) await supabase.from("user_roles").upsert({ user_id:user.id, role }, { onConflict:"user_id" });
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
              <div style={{ fontSize:14, fontWeight:700, color:"#065F46" }}>¡Guardado!</div>
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", marginBottom:10, letterSpacing:".08em", fontFamily:"'Geist Mono',monospace" }}>PLAN</div>
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

// ── User Profile Slide Panel ────────────────────────────────────────────────
function UserProfile({ user, onClose, onEdit }: { user:User; onClose:()=>void; onEdit:()=>void }) {
  const [borrower, setBorrower] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data:b }, { data:s }, { data:o }] = await Promise.all([
        supabase.from("borrowers_profile").select("*").eq("owner_id", user.id).maybeSingle(),
        supabase.from("solicitudes").select("id,destino,monto,status,created_at,plazo_meses").eq("owner_id", user.id).order("created_at",{ascending:false}).limit(5),
        supabase.from("ofertas").select("id,monto_ofertado,tasa_anual,status,created_at").eq("otorgante_id", user.id).order("created_at",{ascending:false}).limit(5),
      ]);
      setBorrower(b); setSolicitudes(s??[]); setOfertas(o??[]);
      setLoading(false);
    })();
  }, [user.id]);

  function fmt(n:number) {
    if (!n) return "—";
    if (n>=1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
    if (n>=1_000) return `$${(n/1_000).toFixed(0)}K`;
    return `$${n}`;
  }

  const STATUS_COLOR: Record<string,{bg:string;color:string}> = {
    enviada:{bg:"#EFF6FF",color:"#1E40AF"}, en_revision:{bg:"#FFF7ED",color:"#9A3412"},
    ofertada:{bg:"#F0FDF9",color:"#065F46"}, aceptada:{bg:"#ECFDF5",color:"#065F46"},
    rechazada:{bg:"#FFF1F2",color:"#9F1239"}, pendiente:{bg:"#FFF7ED",color:"#9A3412"},
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"stretch", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.4)", backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative", width:"100%", maxWidth:520, background:"#F8FAFC", display:"flex", flexDirection:"column", animation:"slideRight .3s cubic-bezier(.16,1,.3,1)", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ padding:"22px 24px", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", position:"relative", overflow:"hidden", flexShrink:0 }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize:"32px 32px" }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.2)", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <Ic d="M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5" s={20} c="#93C5FD"/>
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:"#EEF2FF", letterSpacing:"-0.03em" }}>
                    {borrower?.razon_social || borrower?.nombre_completo || user.email.split("@")[0]}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(238,242,255,.5)", fontFamily:"'Geist Mono',monospace", marginTop:2 }}>{user.email}</div>
                </div>
              </div>
              <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.08)", cursor:"pointer", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Ic d="M3 3l10 10M13 3L3 13" s={12} c="rgba(255,255,255,.6)"/>
              </button>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <PlanBadge plan={user.plan} large/>
              {user.role && <RoleBadge role={user.role}/>}
              <span style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"rgba(238,242,255,.3)" }}>ID: {user.id.slice(0,8)}…</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Quick stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              { label:"Registro",     val:fmtDateShort(user.created_at) },
              { label:"Último acceso",val:user.last_sign_in?fmtDateShort(user.last_sign_in):"—" },
              { label:"Onboarding",   val:user.onboarding_completed?"✓ Completo":"Pendiente" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:9, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", marginBottom:5, letterSpacing:".06em" }}>{s.label.toUpperCase()}</div>
                <div style={{ fontSize:12, fontWeight:700 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Profile data */}
          {loading ? (
            <div style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <svg style={{ animation:"spin .7s linear infinite" }} width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
              <span style={{ fontSize:12, color:"#94A3B8" }}>Cargando...</span>
            </div>
          ) : borrower ? (
            <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, padding:"16px 18px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", marginBottom:14, letterSpacing:".06em" }}>DATOS DEL PERFIL</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {([
                  ["RFC", borrower.rfc],
                  ["CURP", borrower.curp],
                  ["Empresa", borrower.razon_social],
                  ["Sector", borrower.fin_sector],
                  ["Facturación", borrower.fin_facturacion_anual],
                  ["Antigüedad", borrower.fin_antiguedad],
                  ["Empleados", borrower.fin_num_empleados],
                  ["CLABE", borrower.clabe ? `****${borrower.clabe.slice(-4)}` : null],
                ] as [string, string|null][]).filter(([,v]) => v).map(([label, val]) => (
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

          {/* Solicitudes */}
          {solicitudes.length > 0 && (
            <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"11px 16px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em" }}>SOLICITUDES</div>
                <span style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#94A3B8" }}>{user.solicitudes_count} total</span>
              </div>
              {solicitudes.map(s => {
                const sc = STATUS_COLOR[s.status]??{bg:"#F8FAFC",color:"#475569"};
                return (
                  <div key={s.id} style={{ padding:"10px 16px", borderBottom:"1px solid #F8FAFC", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600 }}>{s.destino||"—"}</div>
                      <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace" }}>{fmtDateShort(s.created_at)} · {s.plazo_meses}m</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Geist Mono',monospace" }}>{fmt(s.monto)}</div>
                      <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:sc.bg, color:sc.color, borderRadius:999, padding:"2px 7px" }}>{s.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ofertas */}
          {ofertas.length > 0 && (
            <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"11px 16px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em" }}>OFERTAS</div>
                <span style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#94A3B8" }}>{user.ofertas_count} total</span>
              </div>
              {ofertas.map(o => {
                const sc = STATUS_COLOR[o.status]??{bg:"#F8FAFC",color:"#475569"};
                return (
                  <div key={o.id} style={{ padding:"10px 16px", borderBottom:"1px solid #F8FAFC", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Geist Mono',monospace" }}>{fmt(o.monto_ofertado)}</div>
                      <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace" }}>{fmtDateShort(o.created_at)} · {o.tasa_anual}% anual</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:sc.bg, color:sc.color, borderRadius:999, padding:"2px 7px" }}>{o.status}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={onEdit} style={{ height:44, borderRadius:12, border:"none", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", boxShadow:"0 4px 16px rgba(12,30,74,.25)", marginTop:4 }}>
            Editar plan y rol →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
const SESSION_TIMEOUT = 10 * 60 * 1000;

export default function SuperAdminClient() {
  const router = useRouter();
  const [view, setView] = useState<View>("usuarios");
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [sortBy, setSortBy] = useState<"created_at"|"last_sign_in"|"plan">("created_at");
  const [editing, setEditing] = useState<User|null>(null);
  const [viewing, setViewing] = useState<User|null>(null);
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

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (json.users) setUsers(json.users);
  }
  async function loadLeads() {
    const { data } = await supabase.from("leads").select("*").order("created_at",{ascending:false});
    setLeads(data ?? []);
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }
  function handleSaved(uid:string, plan:string, role:string|null) {
    setUsers(prev => prev.map(u => u.id===uid ? {...u,plan,role} : u));
    if (viewing?.id===uid) setViewing(prev => prev ? {...prev,plan,role} : null);
  }

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
    leads_pro:    leads.filter(l=>l.plan==="pro").length,
    leads_basic:  leads.filter(l=>l.plan==="basic").length,
    active_7d:    users.filter(u=>u.last_sign_in && new Date(u.last_sign_in)>new Date(Date.now()-7*86400000)).length,
    conversion:   users.length>0 ? Math.round((users.filter(u=>u.plan!=="free").length/users.length)*100) : 0,
  }), [users, leads]);

  const NAV = [
    { key:"usuarios", label:"Usuarios", icon:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5", count:users.length },
    { key:"leads",    label:"Leads",    icon:"M4 2h8l2 2v10H2V4z",                           count:leads.length },
    { key:"metricas", label:"Métricas", icon:"M2 12L6 7l3 3 3-4 2 2",                        count:null },
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

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside style={{ width:220, background:"linear-gradient(180deg,#0C1E4A 0%,#091530 100%)", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:50, borderRight:"1px solid rgba(255,255,255,.05)" }}>
        {/* Logo */}
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

        {/* Nav */}
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

        {/* Session warning */}
        {sessionWarning && (
          <div style={{ margin:"0 8px 8px", padding:"10px 12px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#FCA5A5", marginBottom:2 }}>⚠ Sesión expira en 1 min</div>
            <div style={{ fontSize:10, color:"rgba(252,165,165,.6)" }}>Mueve el mouse para extender</div>
          </div>
        )}

        {/* User + logout */}
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

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main style={{ marginLeft:220, flex:1, display:"flex", flexDirection:"column", minHeight:"100vh" }}>

        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #E8EDF5", padding:"0 28px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:40 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.03em" }}>
              {view==="usuarios"?"Usuarios":view==="leads"?"Leads":"Métricas"}
            </div>
            <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", marginTop:1 }}>
              {view==="usuarios"?`${filtered.length} de ${users.length} usuarios`:view==="leads"?`${leads.length} leads`:null}
            </div>
          </div>
          <button onClick={()=>{loadUsers();loadLeads();}} style={{ display:"flex", alignItems:"center", gap:5, height:30, padding:"0 12px", borderRadius:7, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
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

          {/* ── USUARIOS ──── */}
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

          {/* ── LEADS ──── */}
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

          {/* ── MÉTRICAS ──── */}
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
                    { label:"Total usuarios",   val:metrics.total,                     color:"#0F172A" },
                    { label:"Usuarios pagos",   val:metrics.pro+metrics.basic,          color:"#059669" },
                    { label:"Total leads",      val:metrics.leads_total,               color:"#5B21B6" },
                    { label:"Conversión",       val:`${metrics.conversion}%`,           color:"#9A3412" },
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

      {viewing && <UserProfile user={viewing} onClose={()=>setViewing(null)} onEdit={()=>{setEditing(viewing);setViewing(null);}}/>}
      {editing  && <PlanModal  user={editing}  onClose={()=>setEditing(null)} onSaved={handleSaved}/>}
    </div>
  );
}
