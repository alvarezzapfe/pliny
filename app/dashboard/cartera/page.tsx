"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

function Ic({ d, s = 14, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ESTATUS_STYLES: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  vigente:   { bg:"#F0FDF9", color:"#065F46", border:"#D1FAE5", dot:"#00E5A0", label:"Vigente"   },
  mora_30:   { bg:"#FFFBEB", color:"#92400E", border:"#FDE68A", dot:"#F59E0B", label:"Mora 30+"  },
  mora_60:   { bg:"#FFF7ED", color:"#9A3412", border:"#FED7AA", dot:"#F97316", label:"Mora 60+"  },
  mora_90:   { bg:"#FFF1F2", color:"#881337", border:"#FECDD3", dot:"#F43F5E", label:"Mora 90+"  },
  liquidado: { bg:"#F0F9FF", color:"#0C4A6E", border:"#BAE6FD", dot:"#38BDF8", label:"Liquidado" },
  castigado: { bg:"#F8FAFC", color:"#475569", border:"#E2E8F0", dot:"#94A3B8", label:"Castigado" },
};

const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
  "Crédito simple":          { bg:"#EFF6FF", color:"#1E40AF" },
  "Crédito revolvente":      { bg:"#F0FDF9", color:"#065F46" },
  "Arrendamiento puro":      { bg:"#FFF7ED", color:"#92400E" },
  "Arrendamiento financiero":{ bg:"#FFFBEB", color:"#854D0E" },
};

const FILTERS = ["Todos","vigente","mora_30","mora_60","mora_90","liquidado","castigado"];
const FILTER_LABELS: Record<string,string> = {
  "Todos":"Todos","vigente":"Vigente","mora_30":"Mora 30+","mora_60":"Mora 60+",
  "mora_90":"Mora 90+","liquidado":"Liquidado","castigado":"Castigado"
};

export default function CarteraPage() {
  const [filter, setFilter]   = useState("Todos");
  const [search, setSearch]   = useState("");
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [showConvert, setShowConvert] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data: creds } = await supabase
      .from("credits")
      .select("*, clients(company_name, rfc)")
      .order("created_at", { ascending: false });

    if (creds) setRows(creds);
    setLoading(false);
  }

  async function loadSolicitudes() {
    const { data } = await supabase
      .from("solicitudes")
      .select("id, payload, created_at")
      .eq("status", "pendiente")
      .order("created_at", { ascending: false });
    if (data) setSolicitudes(data);
  }

  useEffect(() => { load(); loadSolicitudes(); }, []);

  // KPIs
  const vigentes    = rows.filter(r => r.estatus === "vigente");
  const carteraViva = vigentes.reduce((a,r) => a + (r.saldo_actual || r.monto_original || 0), 0);
  const mora30      = rows.filter(r => ["mora_30","mora_60","mora_90"].includes(r.estatus));
  const moraMonto   = mora30.reduce((a,r) => a + (r.saldo_actual || 0), 0);
  const ticketProm  = vigentes.length ? carteraViva / vigentes.length : 0;
  const tasaProm    = vigentes.length ? vigentes.reduce((a,r) => a + r.tasa_anual, 0) / vigentes.length : 0;

  const filtered = rows.filter(r =>
    (filter === "Todos" || r.estatus === filter) &&
    (search === "" ||
      r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.folio?.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Excel Upload ──────────────────────────────────────────
  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");

    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf);
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { range: 4 }) as any[]; // skip title/subtitle/headers/fieldnames

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión");

      // Map RFC → client_id
      const rfcs = [...new Set(raw.map((r:any) => r.rfc).filter(Boolean))];
      const { data: clients } = await supabase.from("clients").select("id,rfc").in("rfc", rfcs);
      const rfcMap: Record<string,string> = {};
      clients?.forEach((c:any) => { rfcMap[c.rfc] = c.id; });

      let inserted = 0, errors = 0;
      for (const r of raw) {
        if (!r.deudor || !r.monto_original || !r.fecha_inicio) { errors++; continue; }
        const clientId = rfcMap[r.rfc] || null;
        if (!clientId) { errors++; continue; }

        const { error } = await supabase.from("credits").insert({
          client_id:        clientId,
          created_by:       user.id,
          tipo:             r.tipo_credito || "Crédito simple",
          amortiza:         r.amortiza || "SI",
          monto_original:   Number(r.monto_original),
          saldo_actual:     Number(r.saldo_actual || r.monto_original),
          tasa_anual:       Number(r.tasa_anual),
          plazo_meses:      Number(r.plazo_meses),
          garantia:         r.garantia || null,
          fecha_inicio:     r.fecha_inicio,
          fecha_vencimiento:r.fecha_vencimiento || null,
          dpd:              Number(r.dpd || 0),
          ultimo_pago:      r.ultimo_pago || null,
          estatus:          r.estatus || "vigente",
          notas:            r.notas || null,
          fuente:           "excel",
        });
        if (error) errors++; else inserted++;
      }

      setUploadMsg(`✅ ${inserted} créditos cargados${errors > 0 ? ` · ${errors} con error` : ""}`);
      load();
    } catch (err: any) {
      setUploadMsg(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Convert solicitud → crédito ──────────────────────────
  async function convertirSolicitud(sol: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const p = sol.payload;

    const { error: e1 } = await supabase.from("credits").insert({
      solicitud_id:     sol.id,
      client_id:        p.client_id,
      created_by:       user.id,
      tipo:             p.tipo || "Crédito simple",
      amortiza:         "SI",
      monto_original:   p.monto,
      saldo_actual:     p.monto,
      tasa_anual:       parseFloat(p.tasa_referencia) || 0,
      plazo_meses:      p.plazo_valor,
      garantia:         p.garantia || null,
      fecha_inicio:     new Date().toISOString().split("T")[0],
      estatus:          "vigente",
      fuente:           "solicitud",
    });

    if (!e1) {
      await supabase.from("solicitudes").update({ status: "aprobada" }).eq("id", sol.id);
      setShowConvert(false);
      load();
      loadSolicitudes();
    }
  }

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;}.d2{animation-delay:.12s;}.d3{animation-delay:.20s;}
        .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
        .filter-btn{padding:5px 12px;border-radius:8px;border:1px solid #E8EDF5;background:#fff;font-family:'Geist',sans-serif;font-size:11px;font-weight:500;color:#475569;cursor:pointer;transition:all .14s;white-space:nowrap;}
        .filter-btn:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}
        .filter-btn.active{background:#0C1E4A;color:#fff;border-color:#0C1E4A;font-weight:600;}
        .search-inp{height:36px;background:#F8FAFC;border:1px solid #E8EDF5;border-radius:9px;padding:0 12px 0 36px;font-family:'Geist',sans-serif;font-size:13px;color:#0F172A;outline:none;width:200px;transition:border-color .15s,background .15s,box-shadow .15s;}
        .search-inp::placeholder{color:#94A3B8;}
        .search-inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;cursor:pointer;text-decoration:none;box-shadow:0 2px 12px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;letter-spacing:-.01em;}
        .btn-primary:hover{opacity:.9;transform:translateY(-1px);}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1px solid #E8EDF5;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;padding:8px 16px;cursor:pointer;transition:all .14s;text-decoration:none;}
        .btn-ghost:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}
        .btn-green{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#059669,#10B981);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;cursor:pointer;transition:opacity .15s;letter-spacing:-.01em;}
        .btn-green:hover{opacity:.88;}
        .mono{font-family:'Geist Mono',monospace;}
        .tbl-head{display:grid;grid-template-columns:90px 1fr 160px 120px 100px 80px 70px 90px 44px;padding:8px 16px;background:#FAFBFF;border-bottom:1px solid #E8EDF5;}
        .tbl-head span{font-family:'Geist Mono',monospace;font-size:10px;color:#94A3B8;letter-spacing:.07em;text-transform:uppercase;}
        .tbl-row{display:grid;grid-template-columns:90px 1fr 160px 120px 100px 80px 70px 90px 44px;padding:11px 16px;align-items:center;border-bottom:1px solid #F1F5F9;transition:background .12s;}
        .tbl-row:last-child{border-bottom:none;}
        .tbl-row:hover{background:#FAFBFF;}
        .tipo-pill{display:inline-flex;align-items:center;border-radius:6px;padding:3px 7px;font-family:'Geist Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.03em;}
        .status-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 8px;font-family:'Geist Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.04em;border:1px solid;}
        .row-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;background:#F8FAFC;border:1px solid #E8EDF5;cursor:pointer;transition:all .13s;color:#94A3B8;text-decoration:none;}
        .row-btn:hover{background:#EEF2FF;border-color:#C7D4F0;color:#5B8DEF;}
        .empty-float{animation:float 3s ease-in-out infinite;}
        .spinner{animation:spin .7s linear infinite;}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;display:grid;place-items:center;backdrop-filter:blur(2px);}
        .modal{background:#fff;border-radius:20px;padding:28px;width:min(560px,94vw);max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.18);animation:scaleIn .3s cubic-bezier(.16,1,.3,1);}
        .sol-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid #E8EDF5;border-radius:12px;cursor:pointer;transition:all .14s;background:#fff;margin-bottom:8px;}
        .sol-row:hover{border-color:#93B4F8;background:#F8FBFF;}
        .upload-zone{border:2px dashed #C7D4F0;border-radius:12px;padding:28px;text-align:center;cursor:pointer;transition:all .15s;background:#FAFBFF;}
        .upload-zone:hover{border-color:#5B8DEF;background:#EFF6FF;}
      `}</style>

      {/* TOPBAR */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em", lineHeight:1 }}>Cartera</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>Gestión de tu cartera de crédito activa</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {solicitudes.length > 0 && (
            <button className="btn-green" onClick={() => setShowConvert(true)}>
              <Ic d="M3 8l3.5 3.5L13 4" s={13} c="#fff" sw={2}/> Convertir solicitud
            </button>
          )}
          <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Ic d="M8 2v8M4 6l4-4 4 4M2 13h12" s={13}/> Subir Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={handleExcelUpload}/>
          <a href="/plantilla_cartera.xlsx" download className="btn-ghost">
            <Ic d="M8 2v8M4 10l4 4 4-4M2 14h12" s={13}/> Plantilla
          </a>
          <Link href="/dashboard/cartera/nuevo" className="btn-primary">
            <Ic d="M8 2v12M2 8h12" c="#fff" s={13}/> Nuevo crédito
          </Link>
        </div>
      </div>

      {/* Upload message */}
      {uploadMsg && (
        <div style={{ marginBottom:16, padding:"10px 16px", background: uploadMsg.startsWith("✅") ? "#F0FDF9" : "#FFF1F2", border:`1px solid ${uploadMsg.startsWith("✅") ? "#D1FAE5" : "#FECDD3"}`, borderRadius:10, fontSize:13, color: uploadMsg.startsWith("✅") ? "#065F46" : "#881337" }}>
          {uploadMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
        {[
          { label:"Cartera viva",     val:`$${(carteraViva/1e6).toFixed(1)}M`,   sub:"saldo vigente MXN",   color:"#0C1E4A", pct: carteraViva > 0 ? 70 : 0 },
          { label:"Créditos activos", val:String(vigentes.length),                sub:"créditos vigentes",   color:"#5B8DEF", pct: rows.length > 0 ? (vigentes.length/rows.length)*100 : 0 },
          { label:"Mora 30+",         val:`$${(moraMonto/1e6).toFixed(1)}M`,      sub:`${mora30.length} créditos`,  color:"#F59E0B", pct: rows.length > 0 ? (mora30.length/rows.length)*100 : 0 },
          { label:"Yield prom.",      val:`${tasaProm.toFixed(1)}%`,              sub:"tasa anual promedio", color:"#00E5A0", pct: tasaProm > 0 ? Math.min(tasaProm*4,100) : 0 },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:"16px 18px" }}>
            <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-.05em", color:"#0F172A", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:5 }}>{k.sub}</div>
            <div style={{ height:3, background:"#F1F5F9", borderRadius:999, marginTop:12, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${k.pct}%`, background:k.color, borderRadius:999, transition:"width .6s" }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Ticket promedio", val:`$${(ticketProm/1e6).toFixed(2)}M`, sub:"promedio por crédito" },
          { label:"Plazo prom.",     val: vigentes.length ? `${Math.round(vigentes.reduce((a,r)=>a+r.plazo_meses,0)/vigentes.length)} meses` : "—", sub:"plazo promedio" },
          { label:"Total créditos",  val: String(rows.length), sub:"en cartera" },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".09em", textTransform:"uppercase", marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em", color:"#0F172A" }}>{k.val}</div>
            </div>
            <div style={{ fontSize:11, color:"#94A3B8" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="card fade d2" style={{ overflow:"hidden" }}>
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
            <input className="search-inp" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="tbl-head">
          <span>Folio</span><span>Deudor</span><span>Tipo</span>
          <span>Saldo</span><span>Tasa</span><span>Plazo</span>
          <span>DPD</span><span>Estatus</span><span></span>
        </div>

        {loading && (
          <div style={{ padding:"48px 24px", display:"flex", justifyContent:"center", alignItems:"center", gap:10, color:"#94A3B8", fontSize:13 }}>
            <svg className="spinner" width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
            Cargando cartera...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding:"64px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <div className="empty-float" style={{ width:72, height:72, borderRadius:18, background:"linear-gradient(135deg,rgba(12,30,74,.06),rgba(27,63,138,.10))", border:"1px solid rgba(91,141,239,.15)", display:"grid", placeItems:"center" }}>
              <Ic d="M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1zM1 6h14" s={28} c="#5B8DEF"/>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:700, letterSpacing:"-.02em", marginBottom:6 }}>Sin créditos en cartera</div>
              <div style={{ fontSize:13, color:"#94A3B8", maxWidth:"38ch", lineHeight:1.6 }}>
                Agrega un crédito manualmente, sube un Excel o convierte una solicitud aprobada.
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
                <Ic d="M8 2v8M4 6l4-4 4 4M2 13h12" s={13}/> Subir Excel
              </button>
              <Link href="/dashboard/cartera/nuevo" className="btn-primary">
                <Ic d="M8 2v12M2 8h12" c="#fff" s={12}/> Nuevo crédito
              </Link>
            </div>
          </div>
        )}

        {!loading && filtered.map(r => {
          const tipo = TIPO_COLORS[r.tipo] || { bg:"#F8FAFC", color:"#475569" };
          const est  = ESTATUS_STYLES[r.estatus] || ESTATUS_STYLES["vigente"];
          const saldo = r.saldo_actual ?? r.monto_original;
          return (
            <div key={r.id} className="tbl-row">
              <div className="mono" style={{ fontSize:11, color:"#94A3B8" }}>{r.folio}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>{r.clients?.company_name || "—"}</div>
                <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{r.clients?.rfc || "—"}</div>
              </div>
              <div><span className="tipo-pill" style={{ background:tipo.bg, color:tipo.color }}>{r.tipo}</span></div>
              <div className="mono" style={{ fontSize:12, fontWeight:600, color:"#0F172A" }}>
                ${Number(saldo).toLocaleString("es-MX")}
              </div>
              <div className="mono" style={{ fontSize:12, color:"#475569" }}>{r.tasa_anual}%</div>
              <div style={{ fontSize:12, color:"#475569" }}>{r.plazo_meses}m</div>
              <div>
                <span className="mono" style={{ fontSize:12, fontWeight:700, color: r.dpd > 0 ? "#F43F5E" : "#94A3B8" }}>
                  {r.dpd ?? 0}
                </span>
              </div>
              <div>
                <span className="status-pill" style={{ background:est.bg, color:est.color, borderColor:est.border }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:est.dot, display:"inline-block" }}/>
                  {est.label}
                </span>
              </div>
              <div>
                <Link href={`/dashboard/cartera/${r.id}`} className="row-btn">
                  <Ic d="M3 8h10M8 4l4 4-4 4" s={12}/>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* CONVERT MODAL */}
      {showConvert && (
        <div className="modal-bg" onClick={() => setShowConvert(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-.03em" }}>Convertir solicitud</div>
                <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>Selecciona una solicitud pendiente para aprobar y crear el crédito</div>
              </div>
              <button onClick={() => setShowConvert(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8" }}>
                <Ic d="M3 3l10 10M13 3L3 13" s={16}/>
              </button>
            </div>
            {solicitudes.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px 0", color:"#94A3B8", fontSize:13 }}>No hay solicitudes pendientes.</div>
            ) : (
              solicitudes.map(sol => (
                <div key={sol.id} className="sol-row" onClick={() => convertirSolicitud(sol)}>
                  <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", display:"grid", placeItems:"center", flexShrink:0 }}>
                    <Ic d="M2 4h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1zM1 7h14" s={16} c="#fff"/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{sol.payload?.tipo || "—"}</div>
                    <div className="mono" style={{ fontSize:11, color:"#94A3B8" }}>
                      ${Number(sol.payload?.monto||0).toLocaleString("es-MX")} · {sol.payload?.plazo_valor} {sol.payload?.plazo_unidad}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#5B8DEF", fontWeight:600 }}>
                    Aprobar <Ic d="M6 3l6 5-6 5" s={12} c="#5B8DEF"/>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
