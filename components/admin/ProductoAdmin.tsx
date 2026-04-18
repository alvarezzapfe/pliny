"use client";
import React, { useEffect, useState } from "react";

type Plan = {
  id: string; label: string; price_usd: number; price_mxn: number | null;
  description: string | null; features: string[]; limits: Record<string,number>; active: boolean;
};
type Discount = {
  id: string; code: string; type: string; value: number; plan_id: string | null;
  max_uses: number; uses: number; valid_until: string | null; active: boolean; created_at: string;
};
type ClientFeature = {
  id: string; user_id: string; feature: string; enabled: boolean; value: any; note: string | null; created_at: string;
};
type User = { id: string; email: string; plan: string };

const S = {
  card: { background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, overflow:"hidden", marginBottom:16 } as React.CSSProperties,
  cardHeader: { padding:"14px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#FAFAFA" } as React.CSSProperties,
  cardTitle: { fontSize:13, fontWeight:700, color:"#0F172A" } as React.CSSProperties,
  cardBody: { padding:"20px" } as React.CSSProperties,
  inp: { width:"100%", height:36, padding:"0 12px", borderRadius:9, border:"1px solid #E2E8F0", fontSize:13, outline:"none", fontFamily:"inherit", background:"#F8FAFC", color:"#0F172A", boxSizing:"border-box" } as React.CSSProperties,
  btn: (color="#071A3A") => ({ height:34, padding:"0 14px", borderRadius:9, border:"none", background:color, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }) as React.CSSProperties,
  btnOut: { height:34, padding:"0 14px", borderRadius:9, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" } as React.CSSProperties,
  label: { fontSize:11, fontWeight:600, color:"#64748B", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".04em" } as React.CSSProperties,
  tab: (a:boolean) => ({ padding:"8px 14px", borderRadius:9, border:"none", background:a?"#071A3A":"transparent", color:a?"#fff":"#64748B", fontSize:12, fontWeight:a?700:500, cursor:"pointer", fontFamily:"inherit" }) as React.CSSProperties,
};

async function apiCall(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Tab Planes ───────────────────────────────────────────────────────────────
function TabPlanes() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const data = await apiCall("/api/admin/producto");
    setPlans(data?.plans ?? []);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiCall("/api/admin/producto", {
        method: "PATCH",
        body: JSON.stringify({
          id: editing.id,
          label: editing.label,
          price_usd: editing.price_usd,
          price_mxn: editing.price_mxn,
          description: editing.description,
          features: editing.features,
          limits: editing.limits,
          active: editing.active,
          updated_at: new Date().toISOString(),
        }),
      });
      await load();
      setEditing(null);
      setToast("✓ Plan actualizado");
      setTimeout(() => setToast(null), 3000);
    } catch(e: any) { setToast("Error: " + e.message); }
    setSaving(false);
  }

  const PLAN_COLORS: Record<string,string> = { free:"#94A3B8", basic:"#38BDF8", pro:"#00E5A0" };

  return (
    <div>
      {toast && <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, padding:"11px 16px", background:"#fff", border:"1px solid #D1FAE5", borderRadius:12, fontSize:13, fontWeight:600, color:"#065F46", boxShadow:"0 8px 32px rgba(0,0,0,.1)" }}>{toast}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {plans.map(p => (
          <div key={p.id} style={{ ...S.card, marginBottom:0, border:`1.5px solid ${editing?.id===p.id?"#1B3A6B":"#E2E8F0"}` }}>
            <div style={{ ...S.cardHeader, background: editing?.id===p.id?"#EEF2FF":"#FAFAFA" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:PLAN_COLORS[p.id]??"#94A3B8", display:"inline-block", boxShadow:`0 0 6px ${PLAN_COLORS[p.id]??"#94A3B8"}` }}/>
                <span style={S.cardTitle}>{p.label}</span>
                {!p.active && <span style={{ fontSize:9, fontWeight:700, background:"#FEF2F2", color:"#EF4444", border:"1px solid #FECACA", borderRadius:20, padding:"2px 7px" }}>INACTIVO</span>}
              </div>
              <button style={S.btnOut} onClick={() => setEditing(editing?.id===p.id ? null : {...p})}>
                {editing?.id===p.id ? "Cancelar" : "Editar"}
              </button>
            </div>
            <div style={S.cardBody}>
              {editing?.id === p.id ? (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div>
                      <label style={S.label}>Precio USD/mes</label>
                      <input type="number" style={S.inp} value={editing.price_usd} onChange={e => setEditing({...editing, price_usd: parseFloat(e.target.value) || 0})}/>
                    </div>
                    <div>
                      <label style={S.label}>Precio MXN/mes</label>
                      <input type="number" style={S.inp} value={editing.price_mxn ?? ""} onChange={e => setEditing({...editing, price_mxn: parseFloat(e.target.value) || 0})}/>
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>Descripción</label>
                    <input style={S.inp} value={editing.description ?? ""} onChange={e => setEditing({...editing, description: e.target.value})}/>
                  </div>
                  <div>
                    <label style={S.label}>Features (una por línea)</label>
                    <textarea rows={5} style={{ ...S.inp, height:"auto", padding:"9px 12px", resize:"vertical" }}
                      value={editing.features.join("\n")}
                      onChange={e => setEditing({...editing, features: e.target.value.split("\n").filter(Boolean)})}/>
                  </div>
                  <div>
                    <label style={S.label}>Límites (JSON)</label>
                    <textarea rows={3} style={{ ...S.inp, height:"auto", padding:"9px 12px", resize:"vertical", fontFamily:"monospace", fontSize:11 }}
                      value={JSON.stringify(editing.limits, null, 2)}
                      onChange={e => { try { setEditing({...editing, limits: JSON.parse(e.target.value)}); } catch {} }}/>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="checkbox" checked={editing.active} onChange={e => setEditing({...editing, active: e.target.checked})} id={`active-${p.id}`}/>
                    <label htmlFor={`active-${p.id}`} style={{ fontSize:12, color:"#475569", cursor:"pointer" }}>Plan activo</label>
                  </div>
                  <button style={S.btn()} onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:20, fontWeight:900, color:"#0F172A", letterSpacing:"-0.03em", marginBottom:4 }}>
                    {p.price_usd === 0 ? "Gratis" : `$${p.price_usd} USD/mes`}
                    {p.price_mxn ? <span style={{ fontSize:12, color:"#94A3B8", fontWeight:500, marginLeft:6 }}>(${p.price_mxn.toLocaleString("es-MX")} MXN)</span> : null}
                  </div>
                  <div style={{ fontSize:11, color:"#64748B", marginBottom:12 }}>{p.description}</div>
                  {p.features.map((f,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                      <span style={{ color:"#10B981", fontSize:11 }}>✓</span>
                      <span style={{ fontSize:12, color:"#374151" }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab Descuentos ───────────────────────────────────────────────────────────
function TabDescuentos() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [form, setForm] = useState({ code:"", type:"percent", value:"", plan_id:"", max_uses:"1", valid_until:"" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const data = await apiCall("/api/admin/descuentos");
    setDiscounts(data?.discounts ?? []);
  }

  async function create() {
    setSaving(true);
    try {
      await apiCall("/api/admin/descuentos", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.toUpperCase().trim(),
          type: form.type,
          value: parseFloat(form.value),
          plan_id: form.plan_id || null,
          max_uses: parseInt(form.max_uses),
          valid_until: form.valid_until || null,
        }),
      });
      setForm({ code:"", type:"percent", value:"", plan_id:"", max_uses:"1", valid_until:"" });
      await load();
      setToast("✓ Descuento creado");
      setTimeout(() => setToast(null), 3000);
    } catch(e: any) { setToast("Error: " + e.message); }
    setSaving(false);
  }

  async function toggleActive(d: Discount) {
    await apiCall("/api/admin/descuentos", { method:"PATCH", body: JSON.stringify({ id: d.id, active: !d.active }) });
    await load();
  }

  const TYPE_LABELS: Record<string,string> = { percent:"% descuento", fixed_usd:"USD fijo", fixed_mxn:"MXN fijo" };

  return (
    <div>
      {toast && <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, padding:"11px 16px", background:"#fff", border:"1px solid #D1FAE5", borderRadius:12, fontSize:13, fontWeight:600, color:"#065F46", boxShadow:"0 8px 32px rgba(0,0,0,.1)" }}>{toast}</div>}
      <div style={S.card}>
        <div style={S.cardHeader}><span style={S.cardTitle}>Crear descuento</span></div>
        <div style={S.cardBody}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
            <div><label style={S.label}>Código</label><input style={S.inp} placeholder="PROMO20" value={form.code} onChange={e => setForm({...form, code:e.target.value.toUpperCase()})}/></div>
            <div><label style={S.label}>Tipo</label>
              <select style={S.inp} value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                <option value="percent">% descuento</option>
                <option value="fixed_usd">USD fijo</option>
                <option value="fixed_mxn">MXN fijo</option>
              </select>
            </div>
            <div><label style={S.label}>Valor</label><input type="number" style={S.inp} placeholder="20" value={form.value} onChange={e => setForm({...form, value:e.target.value})}/></div>
            <div><label style={S.label}>Plan (opcional)</label>
              <select style={S.inp} value={form.plan_id} onChange={e => setForm({...form, plan_id:e.target.value})}>
                <option value="">Todos los planes</option>
                <option value="basic">BASIC</option>
                <option value="pro">PRO</option>
              </select>
            </div>
            <div><label style={S.label}>Usos máx.</label><input type="number" style={S.inp} value={form.max_uses} onChange={e => setForm({...form, max_uses:e.target.value})}/></div>
            <div><label style={S.label}>Válido hasta</label><input type="date" style={S.inp} value={form.valid_until} onChange={e => setForm({...form, valid_until:e.target.value})}/></div>
          </div>
          <div style={{ marginTop:14, display:"flex", justifyContent:"flex-end" }}>
            <button style={S.btn()} onClick={create} disabled={saving||!form.code||!form.value}>{saving?"Creando...":"Crear descuento"}</button>
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardHeader}><span style={S.cardTitle}>Descuentos activos</span><span style={{ fontSize:12, color:"#94A3B8" }}>{discounts.length} total</span></div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:"1px solid #F1F5F9" }}>
              {["Código","Tipo","Valor","Plan","Usos","Vigencia","Estado",""].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:".06em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d.id} style={{ borderBottom:"1px solid #F8FAFC" }}>
                  <td style={{ padding:"11px 16px", fontSize:13, fontWeight:700, fontFamily:"monospace", color:"#0F172A" }}>{d.code}</td>
                  <td style={{ padding:"11px 16px", fontSize:12, color:"#64748B" }}>{TYPE_LABELS[d.type]}</td>
                  <td style={{ padding:"11px 16px", fontSize:13, fontWeight:700, color:"#0F172A" }}>{d.type==="percent"?`${d.value}%`:d.type==="fixed_usd"?`$${d.value} USD`:`$${d.value} MXN`}</td>
                  <td style={{ padding:"11px 16px", fontSize:12, color:"#64748B" }}>{d.plan_id ?? "Todos"}</td>
                  <td style={{ padding:"11px 16px", fontSize:12, fontFamily:"monospace" }}>{d.uses}/{d.max_uses}</td>
                  <td style={{ padding:"11px 16px", fontSize:11, color:"#94A3B8" }}>{d.valid_until ? new Date(d.valid_until).toLocaleDateString("es-MX") : "Sin límite"}</td>
                  <td style={{ padding:"11px 16px" }}>
                    <span style={{ fontSize:10, fontWeight:700, background:d.active?"#ECFDF5":"#F1F5F9", color:d.active?"#059669":"#94A3B8", border:`1px solid ${d.active?"#A7F3D0":"#E2E8F0"}`, borderRadius:20, padding:"3px 9px" }}>
                      {d.active?"ACTIVO":"INACTIVO"}
                    </span>
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <button style={S.btnOut} onClick={() => toggleActive(d)}>{d.active?"Desactivar":"Activar"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Features ─────────────────────────────────────────────────────────────
const FEATURE_CATALOG = [
  { key:"api_access",           label:"Acceso API originación",        desc:"Permite usar la API de originación" },
  { key:"marketplace_unlimited",label:"Marketplace ilimitado",         desc:"Sin límite de ofertas/chats" },
  { key:"rfc_visible",          label:"RFC visible en marketplace",     desc:"Ve el RFC de solicitantes" },
  { key:"onboarding_custom",    label:"Onboarding wizard full custom",  desc:"Lógica condicional + branding" },
  { key:"multi_user",           label:"Multi-usuario ilimitado",        desc:"Sin límite de usuarios/roles" },
  { key:"reports_export",       label:"Reportes exportación",          desc:"Exportar reportes PDF/Excel" },
  { key:"custom_domain",        label:"Dominio custom portal",          desc:"portal.tuempresa.com" },
  { key:"priority_support",     label:"Soporte prioritario",           desc:"SLA 4 horas" },
  { key:"white_label",          label:"White label",                   desc:"Sin branding de Plinius" },
];

function TabFeatures() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [features, setFeatures] = useState<ClientFeature[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);
  async function loadUsers() {
    const data = await apiCall("plinius_profiles?select=user_id,plan&order=plan_updated_at.desc&limit=100");
    // Necesitamos emails — los obtenemos del admin endpoint
    const res = await fetch("/api/admin/users-list");
    if (res.ok) { const json = await res.json(); setUsers(json.users ?? []); }
    else setUsers((data ?? []).map((d: any) => ({ id: d.user_id, email: d.user_id, plan: d.plan })));
  }
  async function loadFeatures(userId: string) {
    const data = await apiCall(`/api/admin/features?user_id=${userId}`);
    setFeatures(data?.features ?? []);
  }
  async function selectUser(u: User) {
    setSelectedUser(u);
    await loadFeatures(u.id);
  }
  async function toggleFeature(featureKey: string, currentEnabled: boolean) {
    if (!selectedUser) return;
    setSaving(featureKey);
    try {
      const existing = features.find(f => f.feature === featureKey);
      if (existing) {
        await apiCall("/api/admin/features", { method:"POST", body: JSON.stringify({ user_id: selectedUser.id, feature: featureKey, enabled: !currentEnabled }) });
      } else {
        await apiCall("/api/admin/features", { method:"POST", body: JSON.stringify({ user_id: selectedUser.id, feature: featureKey, enabled: true }) });
      }
      await loadFeatures(selectedUser.id);
      setToast(`✓ Feature actualizada`);
      setTimeout(() => setToast(null), 2000);
    } catch(e: any) { setToast("Error: " + e.message); }
    setSaving(null);
  }

  const filtered = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", gap:16 }}>
      {toast && <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, padding:"11px 16px", background:"#fff", border:"1px solid #D1FAE5", borderRadius:12, fontSize:13, fontWeight:600, color:"#065F46", boxShadow:"0 8px 32px rgba(0,0,0,.1)" }}>{toast}</div>}
      <div style={{ width:260, flexShrink:0 }}>
        <div style={S.card}>
          <div style={S.cardHeader}><span style={S.cardTitle}>Clientes</span></div>
          <div style={{ padding:"10px 12px", borderBottom:"1px solid #F1F5F9" }}>
            <input style={S.inp} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div style={{ maxHeight:400, overflowY:"auto" }}>
            {filtered.map(u => (
              <div key={u.id} onClick={() => selectUser(u)}
                style={{ padding:"10px 14px", cursor:"pointer", background:selectedUser?.id===u.id?"#EEF2FF":"transparent", borderBottom:"1px solid #F8FAFC", transition:"background .1s" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#0F172A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                <div style={{ fontSize:10, fontFamily:"monospace", color:"#94A3B8", marginTop:2 }}>{u.plan?.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex:1 }}>
        {!selectedUser ? (
          <div style={{ ...S.card, display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 20px", color:"#94A3B8", fontSize:13 }}>
            Selecciona un cliente para ver sus features
          </div>
        ) : (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>{selectedUser.email}</div>
                <div style={{ fontSize:11, fontFamily:"monospace", color:"#94A3B8", marginTop:2 }}>Plan base: {selectedUser.plan?.toUpperCase()} · Features taylor made</div>
              </div>
            </div>
            <div style={S.cardBody}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:10 }}>
                {FEATURE_CATALOG.map(fc => {
                  const f = features.find(x => x.feature === fc.key);
                  const enabled = f?.enabled ?? false;
                  return (
                    <div key={fc.key} style={{ padding:"14px 16px", borderRadius:12, border:`1px solid ${enabled?"#A7F3D0":"#E2E8F0"}`, background:enabled?"#F0FDF9":"#FAFAFA", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#0F172A", marginBottom:3 }}>{fc.label}</div>
                        <div style={{ fontSize:11, color:"#64748B" }}>{fc.desc}</div>
                      </div>
                      <button onClick={() => toggleFeature(fc.key, enabled)} disabled={saving===fc.key}
                        style={{ flexShrink:0, width:42, height:24, borderRadius:12, border:"none", background:enabled?"#00E5A0":"#E2E8F0", cursor:"pointer", position:"relative", transition:"background .2s" }}>
                        <span style={{ position:"absolute", top:3, left:enabled?21:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.2)" }}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type SubTab = "planes" | "descuentos" | "features";

export function ProductoAdmin() {
  const [tab, setTab] = useState<SubTab>("planes");

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.03em", marginBottom:4 }}>Producto & Billing</h2>
        <p style={{ fontSize:13, color:"#64748B" }}>Planes, precios, descuentos y features por cliente.</p>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {(["planes","descuentos","features"] as SubTab[]).map(t => (
          <button key={t} style={S.tab(tab===t)} onClick={() => setTab(t)}>
            {t === "planes" ? "📦 Planes & Precios" : t === "descuentos" ? "🏷️ Descuentos" : "⚡ Features por cliente"}
          </button>
        ))}
      </div>
      {tab === "planes"     && <TabPlanes />}
      {tab === "descuentos" && <TabDescuentos />}
      {tab === "features"   && <TabFeatures />}
    </div>
  );
}
