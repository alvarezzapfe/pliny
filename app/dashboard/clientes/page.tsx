"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CreateClientModal from "@/components/clients/CreateClientModal";
import EditClientModal from "@/components/clients/EditClientModal";

function Ic({ d, s = 14, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

type ClientStatus = "Active" | "Onboarding" | "Paused" | "Risk Hold";
type BuroStatus = "not_connected" | "processing" | "ok" | "error";

type ClientRow = {
  id: string;
  company_name: string;
  rfc: string;
  status: ClientStatus;
  created_at: string;
  client_connectors?: any;
  client_profiles?: any;
};

function normalizeJoin(cc: any) {
  if (!cc) return null;
  if (Array.isArray(cc)) return cc[0] ?? null;
  return cc;
}

function completitud(c: ClientRow): number {
  const cc = normalizeJoin(c.client_connectors);
  const cp = normalizeJoin(c.client_profiles);
  let score = 0;
  if (c.company_name) score += 20;
  if (c.rfc)          score += 20;
  if (cp?.contact_email || cp?.billing_email) score += 20;
  if (cp?.contact_phone) score += 10;
  if (cc?.buro_status === "ok")  score += 20;
  if (cc?.sat_status === "connected" || cc?.sat_status === "uploaded") score += 10;
  return Math.min(score, 100);
}

function scoreColor(pct: number) {
  if (pct >= 80) return { bar: "#00E5A0", text: "#065F46", bg: "#F0FDF9" };
  if (pct >= 50) return { bar: "#F59E0B", text: "#92400E", bg: "#FFFBEB" };
  return { bar: "#F43F5E", text: "#881337", bg: "#FFF1F2" };
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  "Active":    { bg:"#F0FDF9", color:"#065F46", border:"#D1FAE5", dot:"#00E5A0" },
  "Onboarding":{ bg:"#EFF6FF", color:"#1E40AF", border:"#BFDBFE", dot:"#3B82F6" },
  "Paused":    { bg:"#F8FAFC", color:"#475569", border:"#E2E8F0", dot:"#94A3B8" },
  "Risk Hold": { bg:"#FFFBEB", color:"#92400E", border:"#FDE68A", dot:"#F59E0B" },
};

const BURO_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  "ok":            { bg:"#F0FDF9", color:"#065F46", label:"Verificado" },
  "processing":    { bg:"#EFF6FF", color:"#1E40AF", label:"Procesando" },
  "error":         { bg:"#FFF1F2", color:"#881337", label:"Error" },
  "not_connected": { bg:"#F8FAFC", color:"#94A3B8", label:"Sin consulta" },
};

export default function ClientesPage() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const [rows, setRows]       = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState("");
  const [filter, setFilter]   = useState<ClientStatus | "All">("All");
  const [buroCalling, setBuroCalling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }

    const { data } = await supabase
      .from("clients")
      .select(`id, company_name, rfc, status, created_at,
        client_connectors(buro_status, buro_score, sat_status),
        client_profiles(contact_email, contact_phone, billing_email)`)
      .order("created_at", { ascending: false })
      .limit(500);

    setRows((data ?? []) as ClientRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total:      rows.length,
    active:     rows.filter(r => r.status === "Active").length,
    sinBuro:    rows.filter(r => normalizeJoin(r.client_connectors)?.buro_status !== "ok").length,
    avgScore:   rows.length ? Math.round(rows.reduce((a,r) => a + completitud(r), 0) / rows.length) : 0,
  }), [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(r =>
      (filter === "All" || r.status === filter) &&
      (!qq || r.company_name.toLowerCase().includes(qq) || r.rfc.toLowerCase().includes(qq))
    );
  }, [rows, q, filter]);

  async function consultarBuro(clientId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setBuroCalling(clientId);
    try {
      await fetch(`/api/buro/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      await load();
    } finally {
      setBuroCalling(null);
    }
  }

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;}.d2{animation-delay:.12s;}.d3{animation-delay:.20s;}
        .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
        .mono{font-family:'Geist Mono',monospace;}
        .spinner{animation:spin .7s linear infinite;}
        .shimmer{background:linear-gradient(90deg,#F1F5F9 25%,#E8EDF5 50%,#F1F5F9 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;}

        .search-inp{height:38px;background:#F8FAFC;border:1px solid #E8EDF5;border-radius:10px;padding:0 12px 0 36px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;width:260px;transition:border-color .15s,box-shadow .15s;}
        .search-inp::placeholder{color:#94A3B8;}
        .search-inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}

        .filter-btn{padding:6px 13px;border-radius:8px;border:1px solid #E8EDF5;background:#fff;font-family:'Geist',sans-serif;font-size:12px;font-weight:500;color:#475569;cursor:pointer;transition:all .14s;white-space:nowrap;}
        .filter-btn:hover{background:#F4F6FB;border-color:#C7D4F0;}
        .filter-btn.active{background:#0C1E4A;color:#fff;border-color:#0C1E4A;font-weight:600;}

        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;cursor:pointer;box-shadow:0 2px 12px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;}
        .btn-primary:hover{opacity:.88;transform:translateY(-1px);}

        .tbl-head{display:grid;grid-template-columns:1fr 130px 110px 100px 90px 130px 110px;padding:8px 16px;background:#FAFBFF;border-bottom:1px solid #E8EDF5;}
        .tbl-head span{font-family:'Geist Mono',monospace;font-size:10px;color:#94A3B8;letter-spacing:.07em;text-transform:uppercase;}
        .tbl-row{display:grid;grid-template-columns:1fr 130px 110px 100px 90px 130px 110px;padding:12px 16px;align-items:center;border-bottom:1px solid #F1F5F9;transition:background .12s;cursor:pointer;}
        .tbl-row:last-child{border-bottom:none;}
        .tbl-row:hover{background:#FAFBFF;}

        .status-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 9px;font-family:'Geist Mono',monospace;font-size:10px;font-weight:600;border:1px solid;}
        .buro-pill{display:inline-flex;align-items:center;gap:5px;border-radius:8px;padding:3px 9px;font-family:'Geist Mono',monospace;font-size:10px;font-weight:500;}

        .action-btn{display:inline-flex;align-items:center;gap:5px;border-radius:8px;padding:5px 10px;font-family:'Geist',sans-serif;font-size:11px;font-weight:600;border:1px solid #E8EDF5;background:#F8FAFC;color:#475569;cursor:pointer;transition:all .13s;}
        .action-btn:hover{background:#EEF2FF;border-color:#C7D4F0;color:#1B3F8A;}
        .action-btn.danger:hover{background:#FFF1F2;border-color:#FECDD3;color:#881337;}
      `}</style>

      <CreateClientModal open={open} onClose={() => setOpen(false)} onCreated={load} />
      <EditClientModal
        open={editOpen}
        onOpenChange={setEditOpen}
        client={selected ? { id: selected.id, name: selected.company_name, email: null, phone: null } : null}
        onUpdated={load}
      />

      {/* HEADER */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em", lineHeight:1 }}>Empresas</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>Clientes registrados y su estado de completitud</div>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Ic d="M8 2v12M2 8h12" c="#fff" s={13}/> Nuevo cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total clientes", val:String(stats.total),   sub:"registrados",          color:"#5B8DEF", icon:"M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" },
          { label:"Activos",        val:String(stats.active),  sub:"en operación",         color:"#00E5A0", icon:"M3 8l3.5 3.5L13 4" },
          { label:"Sin Buró",       val:String(stats.sinBuro), sub:"requieren consulta",   color:"#F59E0B", icon:"M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" },
          { label:"Score promedio", val:`${stats.avgScore}%`,  sub:"completitud perfil",   color: scoreColor(stats.avgScore).bar, icon:"M2 8h12M8 2l4 6-4 6" },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".09em", textTransform:"uppercase" }}>{k.label}</div>
              <div style={{ width:28, height:28, borderRadius:8, background:`${k.color}18`, display:"grid", placeItems:"center" }}>
                <Ic d={k.icon} s={14} c={k.color}/>
              </div>
            </div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-.05em", color:"#0F172A", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:5 }}>{k.sub}</div>
            <div style={{ height:3, background:"#F1F5F9", borderRadius:999, marginTop:12, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${stats.total > 0 ? (Number(k.val.replace("%",""))/100)*100 : 0}%`, background:k.color, borderRadius:999 }}/>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="card fade d2" style={{ overflow:"hidden" }}>
        {/* Toolbar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #E8EDF5", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {(["All","Active","Onboarding","Paused","Risk Hold"] as const).map(f => (
              <button key={f} className={`filter-btn${filter===f?" active":""}`} onClick={() => setFilter(f)}>
                {f === "All" ? "Todos" : f}
              </button>
            ))}
          </div>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94A3B8", pointerEvents:"none" }}>
              <Ic d="M11 11l3 3M7 2a5 5 0 100 10A5 5 0 007 2z" s={13}/>
            </div>
            <input className="search-inp" placeholder="Buscar empresa o RFC..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
        </div>

        {/* Header */}
        <div className="tbl-head">
          <span>Empresa</span>
          <span>Estatus</span>
          <span>Score</span>
          <span>Buró</span>
          <span>SAT</span>
          <span>Alta</span>
          <span>Acciones</span>
        </div>

        {/* Loading skeleton */}
        {loading && Array.from({ length: 6 }).map((_,i) => (
          <div key={i} className="tbl-row" style={{ cursor:"default" }}>
            {[200,80,60,80,60,70,90].map((w,j) => (
              <div key={j}><div className="shimmer" style={{ height:14, width:w, borderRadius:6 }}/></div>
            ))}
          </div>
        ))}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:"56px 24px", textAlign:"center", color:"#94A3B8", fontSize:13 }}>
            No hay clientes. <button onClick={() => setOpen(true)} style={{ color:"#5B8DEF", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Crear el primero →</button>
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.map(c => {
          const cc    = normalizeJoin(c.client_connectors);
          const buro  = cc?.buro_status ?? "not_connected";
          const sat   = cc?.sat_status  ?? "not_connected";
          const score = completitud(c);
          const sc    = scoreColor(score);
          const st    = STATUS_STYLES[c.status] || STATUS_STYLES["Paused"];
          const bs    = BURO_STYLES[buro]       || BURO_STYLES["not_connected"];
          const satLabel = sat === "connected" ? "Conectado" : sat === "uploaded" ? "Subido" : sat === "processing" ? "Procesando" : "Sin conectar";

          return (
            <div key={c.id} className="tbl-row" onClick={() => router.push(`/dashboard/clientes/${c.id}`)}>
              {/* Empresa */}
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#0F172A", marginBottom:2 }}>{c.company_name}</div>
                <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{c.rfc}</div>
              </div>

              {/* Estatus */}
              <div>
                <span className="status-pill" style={{ background:st.bg, color:st.color, borderColor:st.border }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:st.dot, display:"inline-block" }}/>
                  {c.status}
                </span>
              </div>

              {/* Score completitud */}
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ flex:1, height:5, background:"#F1F5F9", borderRadius:999, overflow:"hidden", maxWidth:52 }}>
                    <div style={{ height:"100%", width:`${score}%`, background:sc.bar, borderRadius:999 }}/>
                  </div>
                  <span className="mono" style={{ fontSize:10, fontWeight:700, color:sc.text }}>{score}%</span>
                </div>
              </div>

              {/* Buró */}
              <div>
                <span className="buro-pill" style={{ background:bs.bg, color:bs.color }}>
                  {buro === "ok" && cc?.buro_score ? `${cc.buro_score} pts` : bs.label}
                </span>
              </div>

              {/* SAT */}
              <div>
                <span className="mono" style={{ fontSize:10, color: sat === "connected" ? "#065F46" : "#94A3B8", fontWeight: sat === "connected" ? 600 : 400 }}>
                  {satLabel}
                </span>
              </div>

              {/* Alta */}
              <div className="mono" style={{ fontSize:11, color:"#94A3B8" }}>
                {c.created_at?.slice(0,10)}
              </div>

              {/* Acciones */}
              <div style={{ display:"flex", gap:5 }} onClick={e => e.stopPropagation()}>
                <button className="action-btn" onClick={e => { e.stopPropagation(); setSelected(c); setEditOpen(true); }}>
                  <Ic d="M11 2l3 3-9 9H2v-3L11 2z" s={11}/> Editar
                </button>
                <button
                  className="action-btn"
                  disabled={buroCalling === c.id}
                  onClick={e => consultarBuro(c.id, e)}
                  title="Consultar Buró"
                  style={{ padding:"5px 8px" }}>
                  {buroCalling === c.id
                    ? <svg className="spinner" width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
                    : <Ic d="M13 8A5 5 0 103 8M13 8l-2-2M13 8l-2 2" s={11}/>
                  }
                </button>
                <Link href={`/dashboard/clientes/${c.id}`} className="action-btn" style={{ textDecoration:"none" }} onClick={e => e.stopPropagation()}>
                  <Ic d="M3 8h10M8 4l4 4-4 4" s={11}/>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="fade d3" style={{ marginTop:12, display:"flex", gap:16, flexWrap:"wrap", padding:"0 2px" }}>
        {[
          { color:"#00E5A0", label:"Score ≥ 80% — Perfil completo" },
          { color:"#F59E0B", label:"Score 50–79% — Datos parciales" },
          { color:"#F43F5E", label:"Score < 50% — Requiere atención" },
        ].map(l => (
          <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748B" }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:l.color, display:"inline-block" }}/>
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}