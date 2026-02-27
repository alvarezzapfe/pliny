"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
  "Crédito simple":          { bg: "#EFF6FF", color: "#1E40AF" },
  "Crédito revolvente":      { bg: "#F0FDF9", color: "#065F46" },
  "Arrendamiento puro":      { bg: "#FFF7ED", color: "#92400E" },
  "Arrendamiento financiero":{ bg: "#FFFBEB", color: "#854D0E" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  "pendiente":  { bg:"#FFFBEB", color:"#92400E", border:"#FDE68A", dot:"#F59E0B", label:"Pendiente" },
  "aprobada":   { bg:"#F0FDF9", color:"#065F46", border:"#D1FAE5", dot:"#00E5A0", label:"Aprobada"  },
  "rechazada":  { bg:"#FFF1F2", color:"#881337", border:"#FECDD3", dot:"#F43F5E", label:"Rechazada" },
};

const FILTERS = ["Todas", "pendiente", "aprobada", "rechazada"];
const FILTER_LABELS: Record<string, string> = {
  "Todas": "Todas", "pendiente": "Pendiente", "aprobada": "Aprobada", "rechazada": "Rechazada"
};

export default function SolicitudesPage() {
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("solicitudes")
        .select("*, clients(company_name, rfc)")
        .order("created_at", { ascending: false });

      if (data) setSolicitudes(data);
      setLoading(false);
    }
    load();
  }, []);

  // Normaliza cada row para tener campos planos
  const rows = solicitudes.map(s => ({
    id:     s.id,
    shortId: s.id?.slice(0,8).toUpperCase(),
    empresa: s.clients?.company_name || s.payload?.empresa_nombre || "—",
    rfc:     s.clients?.rfc          || s.payload?.empresa_rfc    || "—",
    tipo:    s.payload?.tipo         || "—",
    monto:   s.payload?.monto        ? `$${Number(s.payload.monto).toLocaleString("es-MX")}` : "—",
    plazo:   s.payload?.plazo_valor  ? `${s.payload.plazo_valor} ${s.payload.plazo_unidad}` : "—",
    status:  s.status,
    created_at: s.created_at,
  }));

  const filtered = rows.filter(s =>
    (filter === "Todas" || s.status === filter) &&
    (search === "" || s.empresa.toLowerCase().includes(search.toLowerCase()) || s.rfc.toLowerCase().includes(search.toLowerCase()))
  );

  // KPIs
  const total     = rows.length;
  const pendientes = rows.filter(s => s.status === "pendiente").length;
  const aprobadas  = rows.filter(s => s.status === "aprobada").length;
  const montoTotal = solicitudes.reduce((acc, s) => acc + (s.payload?.monto || 0), 0);

  return (
    <div style={{ fontFamily: "'Geist',sans-serif", color: "#0F172A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;} .d2{animation-delay:.12s;} .d3{animation-delay:.20s;}
        .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;transition:box-shadow .18s,border-color .18s;}
        .filter-btn{padding:6px 14px;border-radius:8px;border:1px solid #E8EDF5;background:#fff;font-family:'Geist',sans-serif;font-size:12px;font-weight:500;color:#475569;cursor:pointer;transition:all .14s;white-space:nowrap;}
        .filter-btn:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}
        .filter-btn.active{background:#0C1E4A;color:#fff;border-color:#0C1E4A;font-weight:600;}
        .search-inp{height:36px;background:#F8FAFC;border:1px solid #E8EDF5;border-radius:9px;padding:0 12px 0 36px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;width:220px;transition:border-color .15s,background .15s,box-shadow .15s;}
        .search-inp::placeholder{color:#94A3B8;}
        .search-inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
        .btn-new{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;cursor:pointer;text-decoration:none;box-shadow:0 2px 12px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;letter-spacing:-.01em;}
        .btn-new:hover{opacity:.9;transform:translateY(-1px);}
        .mono{font-family:'Geist Mono',monospace;}
        .tbl-head{display:grid;grid-template-columns:80px 1fr 160px 110px 110px 100px 44px;padding:8px 16px;background:#FAFBFF;border-bottom:1px solid #E8EDF5;}
        .tbl-head span{font-family:'Geist Mono',monospace;font-size:10px;color:#94A3B8;letter-spacing:.07em;text-transform:uppercase;}
        .tbl-row{display:grid;grid-template-columns:80px 1fr 160px 110px 110px 100px 44px;padding:11px 16px;align-items:center;border-bottom:1px solid #F1F5F9;transition:background .12s;}
        .tbl-row:last-child{border-bottom:none;}
        .tbl-row:hover{background:#FAFBFF;}
        .tipo-pill{display:inline-flex;align-items:center;border-radius:6px;padding:3px 8px;font-family:'Geist Mono',monospace;font-size:10px;font-weight:500;letter-spacing:.03em;}
        .status-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 9px;font-family:'Geist Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.04em;border:1px solid;}
        .row-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;background:#F8FAFC;border:1px solid #E8EDF5;cursor:pointer;transition:all .13s;color:#94A3B8;text-decoration:none;}
        .row-btn:hover{background:#EEF2FF;border-color:#C7D4F0;color:#5B8DEF;}
        .empty-float{animation:float 3s ease-in-out infinite;}
        .spinner{animation:spin .7s linear infinite;}
      `}</style>

      {/* TOPBAR */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em", lineHeight:1 }}>Solicitudes</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>Gestiona y da seguimiento a tus solicitudes de financiamiento</div>
        </div>
        <Link href="/dashboard/solicitudes/nueva" className="btn-new">
          <Ic d="M8 2v12M2 8h12" c="#fff" s={13}/>
          Nueva solicitud
        </Link>
      </div>

      {/* KPIs */}
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total",        val: String(total),     sub:"solicitudes",         color:"#5B8DEF", pct: total > 0 ? 100 : 0 },
          { label:"Pendientes",   val: String(pendientes), sub:"en revisión",         color:"#F5A623", pct: total > 0 ? (pendientes/total)*100 : 0 },
          { label:"Aprobadas",    val: String(aprobadas),  sub:"este mes",            color:"#00E5A0", pct: total > 0 ? (aprobadas/total)*100 : 0 },
          { label:"Monto total",  val: `$${(montoTotal/1000000).toFixed(1)}M`, sub:"en evaluación", color:"#0C1E4A", pct: montoTotal > 0 ? 60 : 0 },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:"16px 18px" }}>
            <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, letterSpacing:"-.05em", color:"#0F172A", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:5 }}>{k.sub}</div>
            <div style={{ height:3, background:"#F1F5F9", borderRadius:999, marginTop:12, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${k.pct}%`, background:k.color, borderRadius:999, transition:"width .6s" }}/>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="card fade d2" style={{ overflow:"hidden" }}>
        {/* Toolbar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #E8EDF5", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {FILTERS.map(f => (
              <button key={f} className={`filter-btn${filter===f?" active":""}`} onClick={() => setFilter(f)}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94A3B8", pointerEvents:"none" }}>
              <Ic d="M11 11l3 3M7 2a5 5 0 100 10A5 5 0 007 2z" s={13}/>
            </div>
            <input className="search-inp" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        {/* Header */}
        <div className="tbl-head">
          <span>ID</span><span>Empresa</span><span>Tipo</span>
          <span>Monto</span><span>Plazo</span><span>Estado</span><span></span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding:"48px 24px", display:"flex", justifyContent:"center", alignItems:"center", gap:10, color:"#94A3B8", fontSize:13 }}>
            <svg className="spinner" width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2">
              <path d="M8 2a6 6 0 016 6"/>
            </svg>
            Cargando solicitudes...
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:"72px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <div className="empty-float" style={{ width:72, height:72, borderRadius:18, background:"linear-gradient(135deg,rgba(12,30,74,.06),rgba(27,63,138,.10))", border:"1px solid rgba(91,141,239,.15)", display:"grid", placeItems:"center" }}>
              <Ic d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zM6 6h4M6 9h4M6 12h2" s={28} c="#5B8DEF"/>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:700, letterSpacing:"-.02em", color:"#0F172A", marginBottom:6 }}>
                {filter === "Todas" ? "Sin solicitudes todavía" : `Sin solicitudes ${FILTER_LABELS[filter].toLowerCase()}s`}
              </div>
              <div style={{ fontSize:13, color:"#94A3B8", maxWidth:"38ch", lineHeight:1.6 }}>
                Crea tu primera solicitud de financiamiento. El sistema guiará el proceso en 3 pasos.
              </div>
            </div>
            <Link href="/dashboard/solicitudes/nueva" className="btn-new" style={{ marginTop:4 }}>
              <Ic d="M8 2v12M2 8h12" c="#fff" s={12}/>
              Crear primera solicitud
            </Link>
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.map((s) => {
          const tipo = TIPO_COLORS[s.tipo] || { bg:"#F8FAFC", color:"#475569" };
          const st   = STATUS_STYLES[s.status] || STATUS_STYLES["pendiente"];
          return (
            <div key={s.id} className="tbl-row">
              <div className="mono" style={{ fontSize:11, color:"#94A3B8" }}>{s.shortId}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{s.empresa}</div>
                <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{s.rfc}</div>
              </div>
              <div>
                <span className="tipo-pill" style={{ background:tipo.bg, color:tipo.color }}>{s.tipo}</span>
              </div>
              <div className="mono" style={{ fontSize:12, color:"#0F172A", fontWeight:600 }}>{s.monto}</div>
              <div style={{ fontSize:12, color:"#475569" }}>{s.plazo}</div>
              <div>
                <span className="status-pill" style={{ background:st.bg, color:st.color, borderColor:st.border }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:st.dot, display:"inline-block" }}/>
                  {st.label}
                </span>
              </div>
              <div>
                <Link href={`/dashboard/solicitudes/${s.id}`} className="row-btn">
                  <Ic d="M3 8h10M8 4l4 4-4 4" s={12}/>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
