"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 15, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

const PLAN_CONFIG = {
  free:  { label: "Free",  bg: "#F8FAFC", color: "#475569", border: "#E2E8F0", dot: "#94A3B8" },
  basic: { label: "Basic", bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", dot: "#3B82F6" },
  pro:   { label: "Pro",   bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0", dot: "#00E5A0" },
};

const ROLE_CONFIG = {
  otorgante:  { label: "Otorgante",  bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" },
  solicitante:{ label: "Solicitante",bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
};

type User = {
  id: string;
  email: string;
  created_at: string;
  role: string | null;
  plan: string;
  onboarding_completed: boolean;
  solicitudes_count?: number;
  ofertas_count?: number;
};

type Lead = {
  id: string;
  plan: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
};

type Tab = "usuarios" | "leads" | "metricas";

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG] ?? PLAN_CONFIG.free;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 999, padding: "2px 8px" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span style={{ fontSize: 11, color: "#94A3B8" }}>—</span>;
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
  if (!cfg) return <span style={{ fontSize: 11, color: "#94A3B8" }}>{role}</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 999, padding: "2px 8px" }}>
      {cfg.label}
    </span>
  );
}

// ── Plan Selector Modal ────────────────────────────────────────────────────
function PlanModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (userId: string, plan: string, role: string | null) => void }) {
  const [plan, setPlan] = useState(user.plan);
  const [role, setRole] = useState(user.role ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    // Upsert plinius_profiles plan
    await supabase.from("plinius_profiles").upsert({
      user_id: user.id,
      plan,
      plan_updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Update user_roles
    if (role) {
      await supabase.from("user_roles").upsert({
        user_id: user.id,
        role,
      }, { onConflict: "user_id" });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => { onSaved(user.id, plan, role || null); onClose(); }, 900);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(15,23,42,.18)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E8EDF5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em" }}>Editar usuario</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Ic d="M3 3l10 10M13 3L3 13" s={12} c="#64748B" />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {saved ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#ECFDF5", border: "2px solid #34D399", display: "grid", placeItems: "center", margin: "0 auto 12px", boxShadow: "0 0 20px rgba(52,211,153,.25)" }}>
                <Ic d="M2 8l4 4 8-8" s={20} c="#059669" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#065F46" }}>¡Guardado!</div>
            </div>
          ) : (
            <>
              {/* Plan */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 10 }}>PLAN</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["free", "basic", "pro"] as const).map(p => {
                    const cfg = PLAN_CONFIG[p];
                    const active = plan === p;
                    return (
                      <button key={p} onClick={() => setPlan(p)} style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: `2px solid ${active ? cfg.border : "#E2E8F0"}`, background: active ? cfg.bg : "#F8FAFC", cursor: "pointer", fontFamily: "'Geist',sans-serif", transition: "all .15s" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: active ? cfg.color : "#94A3B8", letterSpacing: "-0.02em" }}>{cfg.label}</div>
                        <div style={{ fontSize: 10, color: active ? cfg.color : "#CBD5E1", marginTop: 3, opacity: .8 }}>
                          {p === "free" ? "Sin acceso" : p === "basic" ? "$70/mes" : "$500/mes"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 10 }}>ROL</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([["otorgante", "Otorgante"], ["solicitante", "Solicitante"]] as const).map(([r, label]) => {
                    const active = role === r;
                    return (
                      <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: `2px solid ${active ? "#BFDBFE" : "#E2E8F0"}`, background: active ? "#EFF6FF" : "#F8FAFC", cursor: "pointer", fontFamily: "'Geist',sans-serif", transition: "all .15s" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#1E40AF" : "#94A3B8" }}>{label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, height: 44, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif", opacity: saving ? .6 : 1 }}>
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

// ── Main ──────────────────────────────────────────────────────────────────
export default function SuperAdminClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [editing, setEditing] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      // Check super admin
      const { data: sa } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!sa) { router.push("/dashboard"); return; }
      // Require MFA verified (aal2)
const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
if (aal?.currentLevel !== "aal2") {
  router.push("/admin/login");
  return;
}

      await Promise.all([loadUsers(), loadLeads()]);
      setLoading(false);
    })();
  }, [router]);

  async function loadUsers() {
    // Get all data in parallel
    const [{ data: roles }, { data: profiles }, { data: solCounts }, { data: ofertaCounts }] = await Promise.all([
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("plinius_profiles").select("user_id,plan,onboarding_completed"),
      supabase.from("solicitudes").select("owner_id"),
      supabase.from("ofertas").select("otorgante_id"),
    ]);

    // Count solicitudes per user
    const solMap: Record<string, number> = {};
    (solCounts ?? []).forEach((s: any) => { solMap[s.owner_id] = (solMap[s.owner_id] || 0) + 1; });

    const ofertaMap: Record<string, number> = {};
    (ofertaCounts ?? []).forEach((o: any) => { ofertaMap[o.otorgante_id] = (ofertaMap[o.otorgante_id] || 0) + 1; });

    const roleMap: Record<string, string> = {};
    (roles ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    const planMap: Record<string, { plan: string; onboarding_completed: boolean }> = {};
    (profiles ?? []).forEach((p: any) => { planMap[p.user_id] = { plan: p.plan ?? "free", onboarding_completed: p.onboarding_completed }; });

    // Fetch users via RPC or admin — use auth.users via service role
    // Since we can't call auth.users directly from client, we join from user_roles + profiles
    const allUserIds = Array.from(new Set([
      ...Object.keys(roleMap),
      ...Object.keys(planMap),
    ]));

    // Build user list from what we have
    const userList: User[] = allUserIds.map(id => ({
      id,
      email: "—",
      created_at: new Date().toISOString(),
      role: roleMap[id] ?? null,
      plan: planMap[id]?.plan ?? "free",
      onboarding_completed: planMap[id]?.onboarding_completed ?? false,
      solicitudes_count: solMap[id] ?? 0,
      ofertas_count: ofertaMap[id] ?? 0,
    }));

    setUsers(userList);
  }

  async function loadLeads() {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
  }

  function handleSaved(userId: string, plan: string, role: string | null) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan, role } : u));
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (filterPlan && u.plan !== filterPlan) return false;
      if (filterRole && u.role !== filterRole) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.email.toLowerCase().includes(q) || u.id.includes(q);
      }
      return true;
    });
  }, [users, filterPlan, filterRole, search]);

  // Metrics
  const metrics = useMemo(() => ({
    total: users.length,
    pro: users.filter(u => u.plan === "pro").length,
    basic: users.filter(u => u.plan === "basic").length,
    free: users.filter(u => u.plan === "free").length,
    otorgantes: users.filter(u => u.role === "otorgante").length,
    solicitantes: users.filter(u => u.role === "solicitante").length,
    leads_total: leads.length,
    leads_pro: leads.filter(l => l.plan === "pro").length,
    leads_basic: leads.filter(l => l.plan === "basic").length,
  }), [users, leads]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both;}
    .mono{font-family:'Geist Mono',monospace;}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
    .tr{display:grid;align-items:center;padding:11px 16px;border-bottom:1px solid #F1F5F9;transition:background .12s;}
    .tr:last-child{border-bottom:none;}
    .tr:hover{background:#F8FAFF;}
    .tab{padding:8px 16px;border-radius:8px;border:none;background:transparent;font-size:13px;font-weight:600;font-family:'Geist',sans-serif;cursor:pointer;color:#64748B;transition:all .15s;}
    .tab.active{background:#EFF6FF;color:#1E40AF;}
    .fsel{height:36px;border-radius:8px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 10px;font-size:12px;color:#374151;font-family:'Geist',sans-serif;outline:none;cursor:pointer;}
    .fsel:focus{border-color:#3B82F6;}
    .finp{height:36px;border-radius:8px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 10px 0 32px;font-size:12px;color:#374151;font-family:'Geist',sans-serif;outline:none;width:100%;}
    .finp:focus{border-color:#3B82F6;background:#fff;}
    .edit-btn{height:28px;padding:0 10px;border-radius:7px;border:1px solid #E2E8F0;background:#F8FAFC;color:#475569;font-size:11px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;transition:all .15s;}
    .edit-btn:hover{background:#EFF6FF;border-color:#BFDBFE;color:#1E40AF;}
    .spinner{animation:spin .7s linear infinite;}
  `;

  return (
    <div style={{ fontFamily: "'Geist',sans-serif", color: "#0F172A", minHeight: "100vh", background: "#F8FAFC" }}>
      <style>{CSS}</style>

      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8EDF5", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", display: "grid", placeItems: "center" }}>
            <Ic d="M8 2a3 3 0 00-3 3v2H3v7h10V7h-2V5a3 3 0 00-3-3z" s={13} c="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.04em" }}>Plinius</span>
            <span style={{ fontSize: 11, fontFamily: "'Geist Mono',monospace", color: "#94A3B8", marginLeft: 8 }}>SUPER ADMIN</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E5A0" }} />
          <span style={{ fontSize: 11, fontFamily: "'Geist Mono',monospace", color: "#059669", fontWeight: 700 }}>luis@plinius.mx</span>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* KPIs */}
        <div className="fade" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Usuarios", val: loading ? "—" : metrics.total, color: "#0F172A", icon: "M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5" },
            { label: "Pro",      val: loading ? "—" : metrics.pro,   color: "#059669", icon: "M2 8l4 4 8-8" },
            { label: "Basic",    val: loading ? "—" : metrics.basic, color: "#1E40AF", icon: "M8 2v12M2 8h12" },
            { label: "Free",     val: loading ? "—" : metrics.free,  color: "#94A3B8", icon: "M2 2h12v10H2z" },
            { label: "Otorgantes",   val: loading ? "—" : metrics.otorgantes,   color: "#5B21B6", icon: "M2 12L6 7l3 3 3-4 2 2" },
            { label: "Leads",    val: loading ? "—" : metrics.leads_total, color: "#9A3412", icon: "M4 2h8a1 1 0 011 1v10H3V3a1 1 0 011-1z" },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div className="mono" style={{ fontSize: 9, color: "#94A3B8", letterSpacing: ".08em" }}>{k.label.toUpperCase()}</div>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${k.color}14`, display: "grid", placeItems: "center" }}>
                  <Ic d={k.icon} s={11} c={k.color} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", border: "1px solid #E8EDF5", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {(["usuarios", "leads", "metricas"] as Tab[]).map(t => (
            <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>
              {t === "usuarios" ? `Usuarios (${users.length})` : t === "leads" ? `Leads (${leads.length})` : "Métricas"}
            </button>
          ))}
        </div>

        {/* ── USUARIOS TAB ─────────────────────────────────────────────── */}
        {tab === "usuarios" && (
          <div className="card fade" style={{ overflow: "hidden" }}>
            {/* Filters */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E8EDF5", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 200px" }}>
                <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <Ic d="M10 10l4 4M2 7a5 5 0 1010 0A5 5 0 002 7z" s={12} c="#94A3B8" />
                </div>
                <input className="finp" placeholder="Buscar por email o ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="fsel" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
                <option value="">Todos los planes</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
              <select className="fsel" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">Todos los roles</option>
                <option value="otorgante">Otorgante</option>
                <option value="solicitante">Solicitante</option>
              </select>
              {(filterPlan || filterRole || search) && (
                <button onClick={() => { setFilterPlan(""); setFilterRole(""); setSearch(""); }}
                  style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #FECDD3", background: "#FFF1F2", color: "#9F1239", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif", whiteSpace: "nowrap" }}>
                  Limpiar
                </button>
              )}
            </div>

            {/* Header */}
            <div className="tr" style={{ gridTemplateColumns: "2fr 80px 100px 80px 80px 90px", background: "#F8FAFC", cursor: "default" }}>
              {["User ID", "Rol", "Plan", "Solicitudes", "Ofertas", ""].map(h => (
                <div key={h} className="mono" style={{ fontSize: 10, color: "#94A3B8", letterSpacing: ".06em" }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <svg className="spinner" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6" /></svg>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>Cargando usuarios...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Sin resultados</div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="tr" style={{ gridTemplateColumns: "2fr 80px 100px 80px 80px 90px" }}>
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: "#0F172A", fontWeight: 600 }}>{u.id.slice(0, 8)}…</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{u.email}</div>
                  </div>
                  <RoleBadge role={u.role} />
                  <PlanBadge plan={u.plan} />
                  <div className="mono" style={{ fontSize: 12, color: "#475569" }}>{u.solicitudes_count ?? 0}</div>
                  <div className="mono" style={{ fontSize: 12, color: "#475569" }}>{u.ofertas_count ?? 0}</div>
                  <button className="edit-btn" onClick={() => setEditing(u)}>
                    Editar →
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── LEADS TAB ────────────────────────────────────────────────── */}
        {tab === "leads" && (
          <div className="card fade" style={{ overflow: "hidden" }}>
            <div className="tr" style={{ gridTemplateColumns: "1fr 80px 1fr 120px 120px", background: "#F8FAFC", cursor: "default" }}>
              {["Empresa / Nombre", "Plan", "Email", "Teléfono", "Fecha"].map(h => (
                <div key={h} className="mono" style={{ fontSize: 10, color: "#94A3B8", letterSpacing: ".06em" }}>{h}</div>
              ))}
            </div>
            {leads.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#94A3B8" }}>Sin leads aún</div>
            ) : (
              leads.map(l => (
                <div key={l.id} className="tr" style={{ gridTemplateColumns: "1fr 80px 1fr 120px 120px" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{l.company}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{l.name}</div>
                  </div>
                  <PlanBadge plan={l.plan} />
                  <div style={{ fontSize: 12, color: "#475569" }}>{l.email}</div>
                  <div className="mono" style={{ fontSize: 11, color: "#64748B" }}>{l.phone || "—"}</div>
                  <div className="mono" style={{ fontSize: 11, color: "#94A3B8" }}>{fmtDate(l.created_at)}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── MÉTRICAS TAB ─────────────────────────────────────────────── */}
        {tab === "metricas" && (
          <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Plan distribution */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Distribución de planes</div>
              {[
                { plan: "pro",   label: "Pro",   val: metrics.pro,   total: metrics.total, color: "#00E5A0" },
                { plan: "basic", label: "Basic", val: metrics.basic, total: metrics.total, color: "#3B82F6" },
                { plan: "free",  label: "Free",  val: metrics.free,  total: metrics.total, color: "#CBD5E1" },
              ].map(p => (
                <div key={p.plan} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{p.label}</span>
                    <span className="mono" style={{ fontSize: 11, color: "#94A3B8" }}>{p.val} / {p.total}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${p.total ? (p.val / p.total) * 100 : 0}%`, background: p.color, borderRadius: 999, transition: "width .5s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Role distribution */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Distribución de roles</div>
              {[
                { label: "Otorgantes",   val: metrics.otorgantes,  color: "#5B21B6" },
                { label: "Solicitantes", val: metrics.solicitantes, color: "#9A3412" },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{r.label}</span>
                    <span className="mono" style={{ fontSize: 11, color: "#94A3B8" }}>{r.val} / {metrics.total}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${metrics.total ? (r.val / metrics.total) * 100 : 0}%`, background: r.color, borderRadius: 999, transition: "width .5s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Leads breakdown */}
            <div className="card" style={{ padding: 20, gridColumn: "span 2" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Leads por plan</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { label: "Total leads", val: metrics.leads_total, color: "#0F172A" },
                  { label: "Leads Pro",   val: metrics.leads_pro,   color: "#059669" },
                  { label: "Leads Basic", val: metrics.leads_basic,  color: "#1E40AF" },
                ].map(l => (
                  <div key={l.label} style={{ padding: "14px 16px", background: "#F8FAFC", border: "1px solid #E8EDF5", borderRadius: 10 }}>
                    <div className="mono" style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>{l.label.toUpperCase()}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: l.color }}>{l.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <PlanModal user={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
