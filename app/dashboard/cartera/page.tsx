"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import KpisHero from "@/components/cartera-gestion/KpisHero";
import CreditosTable from "@/components/cartera-gestion/CreditosTable";
import ValuarCarteraButton from "@/components/cartera-gestion/ValuarCarteraButton";

function Ic({ d, s = 14, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function CarteraPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [showConvert, setShowConvert] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadSolicitudes() {
    const { data } = await supabase
      .from("solicitudes")
      .select("id, payload, created_at")
      .eq("status", "pendiente")
      .order("created_at", { ascending: false });
    if (data) setSolicitudes(data);
  }

  useEffect(() => { loadSolicitudes(); }, []);

  // ── Excel Upload via /api/cartera/bulk-upload ─────────────
  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/cartera/bulk-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadMsg(`Error: ${json.error}`);
        return;
      }

      const errCount = json.errors_count ?? 0;
      setUploadMsg(
        `${json.inserted} créditos cargados de ${json.total_rows} filas` +
        (errCount > 0 ? ` · ${errCount} con error` : ""),
      );

      if (json.inserted > 0) {
        setRefreshKey(k => k + 1);
      }
    } catch (err: any) {
      setUploadMsg(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Download plantilla via /api/cartera/plantilla ─────────
  async function handleDownloadPlantilla() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/cartera/plantilla", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_cartera_plinius.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Cartera] plantilla download error", err);
    }
  }

  // ── Convert solicitud → crédito ──────────────────────────
  async function convertirSolicitud(sol: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const p = sol.payload;

    const res = await fetch("/api/cartera", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        solicitud_id: sol.id,
        client_id: p.client_id || undefined,
        deudor: p.deudor || p.empresa || "Sin nombre",
        tipo_credito: p.tipo || "Crédito simple",
        amortiza: "SI",
        monto_original: Number(p.monto) || 0,
        saldo_actual: Number(p.monto) || 0,
        tasa_anual: parseFloat(p.tasa_referencia) || undefined,
        plazo_meses: Number(p.plazo_valor) || undefined,
        garantia: p.garantia || undefined,
        fecha_inicio: new Date().toISOString().split("T")[0],
        estatus: "vigente",
      }),
    });

    if (res.ok) {
      await supabase.from("solicitudes").update({ status: "aprobada" }).eq("id", sol.id);
      setShowConvert(false);
      setRefreshKey(k => k + 1);
      loadSolicitudes();
    }
  }

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .btn-primary{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;cursor:pointer;text-decoration:none;box-shadow:0 2px 12px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;letter-spacing:-.01em;}
        .btn-primary:hover{opacity:.9;transform:translateY(-1px);}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#475569;border:1px solid #E8EDF5;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;padding:8px 16px;cursor:pointer;transition:all .14s;text-decoration:none;}
        .btn-ghost:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}
        .btn-green{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#059669,#10B981);color:#fff;border:none;border-radius:10px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;cursor:pointer;transition:opacity .15s;letter-spacing:-.01em;}
        .btn-green:hover{opacity:.88;}
        .mono{font-family:'Geist Mono',monospace;}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;display:grid;place-items:center;backdrop-filter:blur(2px);}
        .modal{background:#fff;border-radius:20px;padding:28px;width:min(560px,94vw);max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.18);animation:scaleIn .3s cubic-bezier(.16,1,.3,1);}
        .sol-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid #E8EDF5;border-radius:12px;cursor:pointer;transition:all .14s;background:#fff;margin-bottom:8px;}
        .sol-row:hover{border-color:#93B4F8;background:#F8FBFF;}
      `}</style>

      {/* TOPBAR */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em", lineHeight:1 }}>Cartera</div>
          <div style={{ fontSize:12, color:"#64748B", marginTop:4 }}>Gestión de tu cartera de crédito activa</div>
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
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display:"none" }} onChange={handleExcelUpload} aria-label="Subir archivo Excel"/>
          <button className="btn-ghost" onClick={handleDownloadPlantilla}>
            <Ic d="M8 2v8M4 10l4 4 4-4M2 14h12" s={13}/> Plantilla
          </button>
          <ValuarCarteraButton onValuationComplete={() => setRefreshKey(k => k + 1)} />
          <Link href="/dashboard/cartera/nuevo" className="btn-primary">
            <Ic d="M8 2v12M2 8h12" c="#fff" s={13}/> Nuevo crédito
          </Link>
        </div>
      </div>

      {/* Upload message */}
      {uploadMsg && (
        <div style={{
          marginBottom: 16, padding: "10px 16px", borderRadius: 10, fontSize: 13,
          background: uploadMsg.startsWith("Error") ? "#FFF1F2" : "#F0FDF9",
          border: `1px solid ${uploadMsg.startsWith("Error") ? "#FECDD3" : "#D1FAE5"}`,
          color: uploadMsg.startsWith("Error") ? "#881337" : "#065F46",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{uploadMsg}</span>
          <button onClick={() => setUploadMsg("")} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", fontSize:16 }}>×</button>
        </div>
      )}

      {/* KPIs — powered by /api/cartera/kpis */}
      <KpisHero key={refreshKey} />

      {/* TABLE — powered by /api/cartera */}
      <CreditosTable refreshKey={refreshKey} onCreditoUpdated={() => setRefreshKey(k => k + 1)} />

      {/* CONVERT MODAL */}
      {showConvert && (
        <div className="modal-bg" onClick={() => setShowConvert(false)} onKeyDown={e => { if (e.key === "Escape") setShowConvert(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Convertir solicitud" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-.03em" }}>Convertir solicitud</div>
                <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>Selecciona una solicitud pendiente para aprobar y crear el crédito</div>
              </div>
              <button onClick={() => setShowConvert(false)} aria-label="Cerrar" style={{ background:"none", border:"none", cursor:"pointer", color:"#64748B", padding:8 }}>
                <Ic d="M3 3l10 10M13 3L3 13" s={16}/>
              </button>
            </div>
            {solicitudes.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px 0", color:"#64748B", fontSize:13 }}>No hay solicitudes pendientes.</div>
            ) : (
              solicitudes.map(sol => (
                <button key={sol.id} className="sol-row" style={{ width:"100%", textAlign:"left", font:"inherit" }} onClick={() => convertirSolicitud(sol)} aria-label={`Aprobar solicitud ${sol.payload?.tipo || ""} por $${Number(sol.payload?.monto||0).toLocaleString("es-MX")}`}>
                  <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", display:"grid", placeItems:"center", flexShrink:0 }} aria-hidden="true">
                    <Ic d="M2 4h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1zM1 7h14" s={16} c="#fff"/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{sol.payload?.tipo || "—"}</div>
                    <div className="mono" style={{ fontSize:11, color:"#64748B" }}>
                      ${Number(sol.payload?.monto||0).toLocaleString("es-MX")} · {sol.payload?.plazo_valor} {sol.payload?.plazo_unidad}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#1B3F8A", fontWeight:600 }}>
                    Aprobar <Ic d="M6 3l6 5-6 5" s={12} c="#1B3F8A"/>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
