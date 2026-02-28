"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 14, c = "currentColor", sw = 1.4 }: { d: string; s?: number; c?: string; sw?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString("es-MX", { minimumFractionDigits: 0 }); }
function fmtM(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${fmt(n)}`;
}
function pct(a: number, b: number) { return b > 0 ? ((a / b) * 100).toFixed(1) : "0.0"; }

// ── Types ────────────────────────────────────────────────────────────────────
type Credit = {
  id: string; folio: string; deudor: string; rfc: string;
  tipo_credito: string; monto_original: number; saldo_actual: number;
  tasa_anual: number | null; plazo_meses: number | null; amortiza: string;
  fecha_inicio: string | null; fecha_vencimiento: string | null;
  ultimo_pago: string | null; dpd: number; estatus: string;
  garantia: string; notas: string; created_at: string;
};

type RiskLevel = "verde" | "amarillo" | "rojo";
function riskLevel(val: number, thresholds: [number, number]): RiskLevel {
  if (val <= thresholds[0]) return "verde";
  if (val <= thresholds[1]) return "amarillo";
  return "rojo";
}
const RISK_COLORS = {
  verde:    { bg: "#F0FDF9", border: "#D1FAE5", text: "#065F46", dot: "#00E5A0", label: "Bajo" },
  amarillo: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B", label: "Medio" },
  rojo:     { bg: "#FFF1F2", border: "#FECDD3", text: "#881337", dot: "#F43F5E", label: "Alto" },
};

export default function ReportesPage() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"riesgo" | "vencimiento" | "concentracion" | "ia">("riesgo");

  useEffect(() => {
    supabase.from("credits").select("*").order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCredits(data as Credit[]);
        setLoading(false);
      });
  }, []);

  // ── Métricas ─────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!credits.length) return null;
    const total = credits.length;
    const carteraViva = credits.reduce((a, c) => a + (c.saldo_actual || 0), 0);
    const montoOriginal = credits.reduce((a, c) => a + (c.monto_original || 0), 0);
    const activos = credits.filter(c => c.estatus === "activo");
    const mora = credits.filter(c => c.estatus === "mora" || (c.dpd || 0) > 30);
    const enMora30 = credits.filter(c => (c.dpd || 0) > 30);
    const enMora90 = credits.filter(c => (c.dpd || 0) > 90);
    const montoMora = mora.reduce((a, c) => a + (c.saldo_actual || 0), 0);
    const pctMora = carteraViva > 0 ? (montoMora / carteraViva) * 100 : 0;
    const dpdProm = credits.reduce((a, c) => a + (c.dpd || 0), 0) / total;
    const tasaProm = activos.filter(c => c.tasa_anual).reduce((a, c, _, arr) => a + (c.tasa_anual || 0) / arr.length, 0);
    const plazoProm = activos.filter(c => c.plazo_meses).reduce((a, c, _, arr) => a + (c.plazo_meses || 0) / arr.length, 0);
    const ticketProm = total > 0 ? montoOriginal / total : 0;
    // Concentración: top deudor
    const byDeudor: Record<string, number> = {};
    credits.forEach(c => { byDeudor[c.deudor] = (byDeudor[c.deudor] || 0) + c.saldo_actual; });
    const topDeudorMonto = Math.max(...Object.values(byDeudor));
    const pctConcentracion = carteraViva > 0 ? (topDeudorMonto / carteraViva) * 100 : 0;
    const topDeudorNombre = Object.entries(byDeudor).find(([, v]) => v === topDeudorMonto)?.[0] || "—";
    // Por tipo
    const byTipo: Record<string, { count: number; monto: number }> = {};
    credits.forEach(c => {
      if (!byTipo[c.tipo_credito]) byTipo[c.tipo_credito] = { count: 0, monto: 0 };
      byTipo[c.tipo_credito].count++;
      byTipo[c.tipo_credito].monto += c.saldo_actual;
    });
    // Vencimientos próximos
    const now = new Date();
    const en30 = credits.filter(c => {
      if (!c.fecha_vencimiento) return false;
      const d = (new Date(c.fecha_vencimiento).getTime() - now.getTime()) / 86400000;
      return d > 0 && d <= 30;
    });
    const en90 = credits.filter(c => {
      if (!c.fecha_vencimiento) return false;
      const d = (new Date(c.fecha_vencimiento).getTime() - now.getTime()) / 86400000;
      return d > 0 && d <= 90;
    });
    const vencidos = credits.filter(c => {
      if (!c.fecha_vencimiento) return false;
      return new Date(c.fecha_vencimiento) < now && c.estatus !== "liquidado";
    });
    // Amortización
    const bullet = credits.filter(c => c.amortiza === "BULLET");
    const pctBullet = total > 0 ? (bullet.length / total) * 100 : 0;
    // Yield estimado
    const yieldEstimado = tasaProm > 0 ? (carteraViva * (tasaProm / 100)) : 0;
    return {
      total, carteraViva, montoOriginal, activos: activos.length,
      mora: mora.length, enMora30: enMora30.length, enMora90: enMora90.length,
      montoMora, pctMora, dpdProm, tasaProm, plazoProm, ticketProm,
      pctConcentracion, topDeudorNombre, topDeudorMonto,
      byTipo, byDeudor, en30: en30.length, en90: en90.length,
      vencidos: vencidos.length, bullet: bullet.length, pctBullet,
      yieldEstimado, liquidados: credits.filter(c => c.estatus === "liquidado").length,
    };
  }, [credits]);

  // ── AI Analysis ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!metrics || loading) return;
    setAiLoading(true);
    const prompt = `Eres un analista de riesgo crediticio experto en mercados de deuda mexicanos (SOFOM, fondos privados, crédito PYME).

Analiza esta cartera de crédito y genera un reporte ejecutivo en español con los siguientes bloques:

**DATOS DE LA CARTERA:**
- Total créditos: ${metrics.total}
- Cartera viva: ${fmtM(metrics.carteraViva)} MXN
- Créditos activos: ${metrics.activos}
- Índice de mora (30+ DPD): ${metrics.pctMora.toFixed(1)}%
- Monto en mora: ${fmtM(metrics.montoMora)} MXN
- DPD promedio: ${metrics.dpdProm.toFixed(1)} días
- Tasa promedio: ${metrics.tasaProm.toFixed(1)}%
- Plazo promedio: ${metrics.plazoProm.toFixed(0)} meses
- Ticket promedio: ${fmtM(metrics.ticketProm)} MXN
- Concentración máxima (1 deudor): ${metrics.pctConcentracion.toFixed(1)}% (${metrics.topDeudorNombre})
- Créditos bullet: ${metrics.pctBullet.toFixed(0)}%
- Vencimientos próximos 30d: ${metrics.en30}
- Vencimientos próximos 90d: ${metrics.en90}
- Créditos vencidos: ${metrics.vencidos}
- Yield estimado anual: ${fmtM(metrics.yieldEstimado)} MXN
- Distribución por tipo: ${Object.entries(metrics.byTipo).map(([k,v]) => `${k}: ${v.count} créditos ($${(v.monto/1000000).toFixed(1)}M)`).join(", ")}

Genera exactamente estos 5 bloques usando markdown con headers ##:

## Resumen Ejecutivo
2-3 oraciones sobre el estado general de la cartera.

## Semáforo de Riesgo
Lista los 4 indicadores clave (mora, concentración, vencimientos, DPD) con su nivel de riesgo (🟢 Bajo / 🟡 Medio / 🔴 Alto) y una frase de contexto.

## Alertas Prioritarias
Máximo 3 alertas concretas y accionables que el lender debe atender HOY.

## Oportunidades
2 oportunidades de mejora de cartera basadas en los datos.

## Recomendaciones Estratégicas
3 recomendaciones específicas para reducir riesgo o mejorar rendimiento.

Sé directo, técnico y accionable. Sin fluff. Usa cifras reales de los datos.`;

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    })
      .then(r => r.json())
      .then(d => {
        const text = d.content?.map((b: any) => b.text || "").join("") || "";
        setAiAnalysis(text);
      })
      .catch(() => setAiAnalysis("Error al conectar con el análisis IA. Verifica tu conexión."))
      .finally(() => setAiLoading(false));
  }, [metrics, loading]);

  // ── Export helpers ────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = ["Folio","Deudor","RFC","Tipo","Monto Original","Saldo Actual","Tasa","Plazo","DPD","Estatus","Fecha Inicio","Fecha Vencimiento"];
    const rows = credits.map(c => [
      c.folio || c.id.slice(0,8), c.deudor, c.rfc, c.tipo_credito,
      c.monto_original, c.saldo_actual, c.tasa_anual || "",
      c.plazo_meses || "", c.dpd, c.estatus,
      c.fecha_inicio || "", c.fecha_vencimiento || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `cartera_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!metrics) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;color:#0F172A;padding:40px;max-width:900px;margin:0 auto;}
      h1{font-size:24px;font-weight:800;color:#0C1E4A;margin-bottom:4px;}
      .sub{color:#64748B;font-size:13px;margin-bottom:32px;}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;}
      .kpi{background:#F8FAFC;border:1px solid #E8EDF5;border-radius:12px;padding:16px;}
      .kpi-label{font-size:10px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
      .kpi-val{font-size:22px;font-weight:800;color:#0F172A;}
      .kpi-sub{font-size:11px;color:#94A3B8;margin-top:3px;}
      h2{font-size:14px;font-weight:700;color:#0C1E4A;border-bottom:2px solid #E8EDF5;padding-bottom:8px;margin:24px 0 12px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#0C1E4A;color:#fff;padding:8px 10px;text-align:left;font-size:10px;letter-spacing:.04em;}
      td{padding:8px 10px;border-bottom:1px solid #F1F5F9;}
      tr:nth-child(even) td{background:#FAFBFF;}
      .footer{margin-top:40px;font-size:10px;color:#94A3B8;border-top:1px solid #E8EDF5;padding-top:16px;}
      .risk-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;}
      .verde{background:#F0FDF9;color:#065F46;} .rojo{background:#FFF1F2;color:#881337;} .amarillo{background:#FFFBEB;color:#92400E;}
    </style></head><body>
    <h1>Reporte Ejecutivo de Cartera</h1>
    <div class="sub">Generado el ${new Date().toLocaleString("es-MX")} · Plinius Credit OS</div>
    <div class="grid">
      <div class="kpi"><div class="kpi-label">Cartera Viva</div><div class="kpi-val">${fmtM(metrics.carteraViva)}</div><div class="kpi-sub">MXN total</div></div>
      <div class="kpi"><div class="kpi-label">Créditos</div><div class="kpi-val">${metrics.total}</div><div class="kpi-sub">${metrics.activos} activos</div></div>
      <div class="kpi"><div class="kpi-label">Índice Mora</div><div class="kpi-val">${metrics.pctMora.toFixed(1)}%</div><div class="kpi-sub">${fmtM(metrics.montoMora)} en mora</div></div>
      <div class="kpi"><div class="kpi-label">Tasa Promedio</div><div class="kpi-val">${metrics.tasaProm.toFixed(1)}%</div><div class="kpi-sub">anual</div></div>
      <div class="kpi"><div class="kpi-label">DPD Promedio</div><div class="kpi-val">${metrics.dpdProm.toFixed(0)}</div><div class="kpi-sub">días de mora</div></div>
      <div class="kpi"><div class="kpi-label">Ticket Promedio</div><div class="kpi-val">${fmtM(metrics.ticketProm)}</div><div class="kpi-sub">por crédito</div></div>
      <div class="kpi"><div class="kpi-label">Yield Estimado</div><div class="kpi-val">${fmtM(metrics.yieldEstimado)}</div><div class="kpi-sub">anual MXN</div></div>
      <div class="kpi"><div class="kpi-label">Concentración</div><div class="kpi-val">${metrics.pctConcentracion.toFixed(0)}%</div><div class="kpi-sub">top deudor</div></div>
    </div>
    <h2>Detalle de Cartera</h2>
    <table><thead><tr><th>Folio</th><th>Deudor</th><th>Tipo</th><th>Saldo</th><th>Tasa</th><th>DPD</th><th>Estatus</th><th>Vencimiento</th></tr></thead>
    <tbody>${credits.map(c => `<tr>
      <td style="font-family:monospace">${c.folio || c.id.slice(0,8)}</td>
      <td><strong>${c.deudor}</strong><br><span style="color:#94A3B8;font-size:10px">${c.rfc}</span></td>
      <td>${c.tipo_credito}</td>
      <td style="font-family:monospace">$${fmt(c.saldo_actual)}</td>
      <td>${c.tasa_anual ? c.tasa_anual + "%" : "—"}</td>
      <td style="color:${(c.dpd||0)>30?"#F43F5E":(c.dpd||0)>0?"#F59E0B":"#94A3B8"};font-weight:${(c.dpd||0)>0?700:400}">${c.dpd || 0}</td>
      <td><span class="risk-badge ${c.estatus === "activo" ? "verde" : c.estatus === "mora" ? "rojo" : "amarillo"}">${c.estatus}</span></td>
      <td style="font-size:11px">${c.fecha_vencimiento || "—"}</td>
    </tr>`).join("")}</tbody></table>
    ${aiAnalysis ? `<h2>Análisis IA</h2><div style="background:#F8FAFC;border:1px solid #E8EDF5;border-radius:12px;padding:20px;font-size:12px;line-height:1.7;white-space:pre-wrap">${aiAnalysis}</div>` : ""}
    <div class="footer">Plinius Credit OS · Reporte generado automáticamente · ${new Date().toLocaleDateString("es-MX")}</div>
    </body></html>`;
    const w = window.open("", "_blank")!;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  }

  const TABS = [
    { id:"riesgo",        label:"Riesgo",        icon:"M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" },
    { id:"vencimiento",   label:"Vencimientos",  icon:"M2 5h12v8H2zM2 8h12M5 5V3M11 5V3" },
    { id:"concentracion", label:"Concentración", icon:"M2 3h12v2H2zM2 7h9v2H2zM2 11h6v2H2z" },
    { id:"ia",            label:"Análisis IA",   icon:"M8 2l1.5 3h3l-2.5 2 1 3L8 8.5 5 10l1-3L3.5 5h3z" },
  ] as const;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;}.d2{animation-delay:.12s;}.d3{animation-delay:.2s;}
        .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
        .mono{font-family:'Geist Mono',monospace;}
        .spinner{animation:spin .7s linear infinite;}
        .shimmer{background:linear-gradient(90deg,#F1F5F9 25%,#E8EDF5 50%,#F1F5F9 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;}
        .ai-pulse{animation:pulse 1.5s ease-in-out infinite;}
        .tab-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:9px;border:none;font-family:'Geist',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;}
        .tab-btn.active{background:#0C1E4A;color:#fff;font-weight:700;}
        .tab-btn:not(.active){background:transparent;color:#64748B;}
        .tab-btn:not(.active):hover{background:#F4F6FB;color:#0F172A;}
        .btn-export{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:10px;border:1px solid #E8EDF5;background:#fff;font-family:'Geist',sans-serif;font-size:12px;font-weight:600;color:#475569;cursor:pointer;transition:all .14s;}
        .btn-export:hover{background:#F4F6FB;border-color:#C7D4F0;color:#0F172A;}
        .semaforo{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:12px;border:1px solid;}
        .risk-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F1F5F9;}
        .risk-row:last-child{border-bottom:none;}
        .bar-track{height:8px;background:#F1F5F9;border-radius:999px;overflow:hidden;flex:1;margin:0 12px;}
        .bar-fill{height:100%;border-radius:999px;transition:width .8s cubic-bezier(.16,1,.3,1);}
        .markdown h2{font-size:14px;font-weight:700;color:#0C1E4A;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #E8EDF5;}
        .markdown p{font-size:13px;color:#475569;line-height:1.7;margin-bottom:10px;}
        .markdown ul{padding-left:18px;margin-bottom:10px;}
        .markdown li{font-size:13px;color:#475569;line-height:1.7;margin-bottom:4px;}
        .markdown strong{color:#0F172A;font-weight:600;}
      `}</style>

      {/* HEADER */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-.04em", lineHeight:1 }}>Reportes</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>Análisis de riesgo, vencimientos y exportación de cartera</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-export" onClick={exportCSV}>
            <Ic d="M8 2v8M4 7l4 4 4-4M2 13h12" s={13}/> Excel / CSV
          </button>
          <button className="btn-export" onClick={exportPDF} style={{ background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color:"#fff", border:"none" }}>
            <Ic d="M4 2h6l4 4v10H4V2zM10 2v4h4M6 9h4M6 12h4" s={13} c="#fff"/> PDF Ejecutivo
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      {loading ? (
        <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
          {Array.from({length:5}).map((_,i) => (
            <div key={i} className="card" style={{ padding:"16px 18px" }}>
              <div className="shimmer" style={{ height:10, width:60, borderRadius:6, marginBottom:10 }}/>
              <div className="shimmer" style={{ height:24, width:80, borderRadius:6 }}/>
            </div>
          ))}
        </div>
      ) : metrics ? (
        <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Cartera viva",     val:fmtM(metrics.carteraViva), sub:`${metrics.activos} activos`,      color:"#5B8DEF" },
            { label:"Índice de mora",   val:`${metrics.pctMora.toFixed(1)}%`, sub:fmtM(metrics.montoMora),   color: metrics.pctMora > 10 ? "#F43F5E" : metrics.pctMora > 5 ? "#F59E0B" : "#00E5A0" },
            { label:"Yield estimado",   val:fmtM(metrics.yieldEstimado), sub:"anual MXN",                    color:"#00E5A0" },
            { label:"Concentración",    val:`${metrics.pctConcentracion.toFixed(0)}%`, sub:"top deudor",     color: metrics.pctConcentracion > 30 ? "#F43F5E" : metrics.pctConcentracion > 20 ? "#F59E0B" : "#5B8DEF" },
            { label:"Vencen 30d",       val:String(metrics.en30), sub:`${metrics.en90} en 90 días`,          color: metrics.en30 > 0 ? "#F59E0B" : "#94A3B8" },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding:"16px 18px" }}>
              <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".09em", textTransform:"uppercase", marginBottom:8 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.05em", color:k.color, lineHeight:1 }}>{k.val}</div>
              <div style={{ fontSize:11, color:"#94A3B8", marginTop:5 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* TABS */}
      <div className="fade d2" style={{ display:"flex", gap:4, marginBottom:16, background:"#F8FAFC", borderRadius:12, padding:4, border:"1px solid #E8EDF5", width:"fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${activeTab===t.id?" active":""}`} onClick={() => setActiveTab(t.id)}>
            <Ic d={t.icon} s={13} c={activeTab===t.id?"#fff":"#64748B"}/> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RIESGO ── */}
      {activeTab === "riesgo" && metrics && (
        <div className="fade" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Semáforos */}
          <div className="card" style={{ padding:22 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
              <Ic d="M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" s={15} c="#0C1E4A"/> Semáforo de Riesgo
            </div>
            {[
              { label:"Mora (30+ DPD)",         val:`${metrics.pctMora.toFixed(1)}%`,          risk: riskLevel(metrics.pctMora, [5, 10]),          detail:`${metrics.mora} créditos` },
              { label:"Concentración",          val:`${metrics.pctConcentracion.toFixed(0)}%`, risk: riskLevel(metrics.pctConcentracion, [20, 30]), detail:metrics.topDeudorNombre },
              { label:"DPD Promedio",           val:`${metrics.dpdProm.toFixed(0)} días`,       risk: riskLevel(metrics.dpdProm, [15, 45]),          detail:"días promedio" },
              { label:"Créditos Bullet",        val:`${metrics.pctBullet.toFixed(0)}%`,         risk: riskLevel(metrics.pctBullet, [30, 50]),        detail:`${metrics.bullet} créditos` },
              { label:"Vencidos sin liquidar",  val:String(metrics.vencidos),                  risk: riskLevel(metrics.vencidos, [1, 3]),            detail:"créditos" },
              { label:"Créditos en mora 90+",   val:String(metrics.enMora90),                  risk: riskLevel(metrics.enMora90, [1, 3]),            detail:"créditos 90+ DPD" },
            ].map(r => {
              const rc = RISK_COLORS[r.risk];
              return (
                <div key={r.label} className="semaforo" style={{ background:rc.bg, borderColor:rc.border, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#0F172A" }}>{r.label}</div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{r.detail}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span className="mono" style={{ fontSize:14, fontWeight:800, color:rc.text }}>{r.val}</span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:999, background:`${rc.dot}20`, fontSize:10, fontWeight:700, color:rc.text }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:rc.dot, display:"inline-block" }}/>{rc.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Métricas financieras */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card" style={{ padding:22 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                <Ic d="M2 4h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1zM1 7h14" s={15} c="#0C1E4A"/> Métricas de Rentabilidad
              </div>
              {[
                { k:"Tasa promedio",  v:`${metrics.tasaProm.toFixed(2)}%`,    bar: metrics.tasaProm/30,    color:"#5B8DEF" },
                { k:"Plazo promedio", v:`${metrics.plazoProm.toFixed(0)} m`,  bar: metrics.plazoProm/60,   color:"#00E5A0" },
                { k:"Ticket promedio",v:fmtM(metrics.ticketProm),             bar: 0.6,                   color:"#0C1E4A" },
                { k:"Yield anual",    v:fmtM(metrics.yieldEstimado),          bar: 0.7,                   color:"#F59E0B" },
              ].map(r => (
                <div key={r.k} className="risk-row">
                  <span style={{ fontSize:12, color:"#64748B", width:120, flexShrink:0 }}>{r.k}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width:`${Math.min(r.bar*100,100)}%`, background:r.color }}/>
                  </div>
                  <span className="mono" style={{ fontSize:12, fontWeight:700, color:"#0F172A", width:80, textAlign:"right" }}>{r.v}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding:22 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                <Ic d="M2 3h12v2H2zM2 7h9v2H2zM2 11h6v2H2z" s={15} c="#0C1E4A"/> Por tipo de crédito
              </div>
              {Object.entries(metrics.byTipo).sort((a,b) => b[1].monto - a[1].monto).map(([tipo, data]) => (
                <div key={tipo} className="risk-row">
                  <span style={{ fontSize:12, color:"#475569", flex:1 }}>{tipo}</span>
                  <div className="bar-track" style={{ maxWidth:100 }}>
                    <div className="bar-fill" style={{ width:`${pct(data.monto, metrics.carteraViva)}%`, background:"#5B8DEF" }}/>
                  </div>
                  <span className="mono" style={{ fontSize:11, color:"#94A3B8", width:30, textAlign:"right" }}>{data.count}</span>
                  <span className="mono" style={{ fontSize:11, color:"#0F172A", fontWeight:600, width:70, textAlign:"right" }}>{pct(data.monto, metrics.carteraViva)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: VENCIMIENTOS ── */}
      {activeTab === "vencimiento" && (
        <div className="fade" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Timeline visual */}
          <div className="card" style={{ padding:22 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
              <Ic d="M2 5h12v8H2zM2 8h12M5 5V3M11 5V3" s={15} c="#0C1E4A"/> Perfil de Vencimiento
            </div>
            {metrics && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
                {[
                  { label:"Vencen hoy–30d", val:metrics.en30,    color:"#F43F5E", sub:"urgente" },
                  { label:"Vencen 31–90d",  val:metrics.en90 - metrics.en30, color:"#F59E0B", sub:"próximo" },
                  { label:"Vencidos",       val:metrics.vencidos, color:"#7C3AED", sub:"sin liquidar" },
                  { label:"Al corriente",   val:metrics.total - metrics.en90 - metrics.vencidos, color:"#00E5A0", sub:"sin vencer" },
                ].map(b => (
                  <div key={b.label} style={{ padding:"16px", background:`${b.color}10`, border:`1px solid ${b.color}30`, borderRadius:12, textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:800, color:b.color, letterSpacing:"-.04em" }}>{b.val}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#0F172A", marginTop:4 }}>{b.label}</div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{b.sub}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Tabla de próximos vencimientos */}
            <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", letterSpacing:".06em", textTransform:"uppercase", marginBottom:12, fontFamily:"'Geist Mono',monospace" }}>Próximos 90 días</div>
            {credits
              .filter(c => {
                if (!c.fecha_vencimiento) return false;
                const d = (new Date(c.fecha_vencimiento).getTime() - Date.now()) / 86400000;
                return d > 0 && d <= 90;
              })
              .sort((a,b) => new Date(a.fecha_vencimiento!).getTime() - new Date(b.fecha_vencimiento!).getTime())
              .slice(0, 10)
              .map(c => {
                const days = Math.ceil((new Date(c.fecha_vencimiento!).getTime() - Date.now()) / 86400000);
                const urgencia = days <= 7 ? "#F43F5E" : days <= 30 ? "#F59E0B" : "#5B8DEF";
                return (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #F1F5F9" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{c.deudor}</div>
                      <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{c.folio || c.id.slice(0,8)} · {c.tipo_credito}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div className="mono" style={{ fontSize:12, fontWeight:700, color:"#0F172A" }}>${fmt(c.saldo_actual)}</div>
                      <div style={{ fontSize:11, color:urgencia, fontWeight:600, marginTop:2 }}>en {days} días · {c.fecha_vencimiento}</div>
                    </div>
                  </div>
                );
              })}
            {credits.filter(c => { if (!c.fecha_vencimiento) return false; const d = (new Date(c.fecha_vencimiento).getTime() - Date.now()) / 86400000; return d > 0 && d <= 90; }).length === 0 && (
              <div style={{ textAlign:"center", padding:"24px 0", color:"#94A3B8", fontSize:13 }}>Sin vencimientos próximos en los próximos 90 días ✓</div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: CONCENTRACIÓN ── */}
      {activeTab === "concentracion" && metrics && (
        <div className="fade" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div className="card" style={{ padding:22 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
              <Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" s={15} c="#0C1E4A"/> Concentración por Deudor
            </div>
            {Object.entries(metrics.byDeudor)
              .sort((a,b) => b[1] - a[1])
              .slice(0, 8)
              .map(([deudor, monto], i) => {
                const p = metrics.carteraViva > 0 ? (monto / metrics.carteraViva) * 100 : 0;
                const c = p > 30 ? "#F43F5E" : p > 20 ? "#F59E0B" : "#5B8DEF";
                return (
                  <div key={deudor} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                    <div className="mono" style={{ fontSize:10, color:"#94A3B8", width:16 }}>{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:"#0F172A" }}>{deudor}</span>
                        <span className="mono" style={{ fontSize:11, fontWeight:700, color:c }}>{p.toFixed(1)}%</span>
                      </div>
                      <div className="bar-track" style={{ margin:0 }}>
                        <div className="bar-fill" style={{ width:`${p}%`, background:c }}/>
                      </div>
                      <div className="mono" style={{ fontSize:10, color:"#94A3B8", marginTop:3 }}>{fmtM(monto)}</div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card" style={{ padding:22 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Índice Herfindahl-Hirschman</div>
              {(() => {
                const hhi = Object.values(metrics.byDeudor).reduce((a, v) => {
                  const s = metrics.carteraViva > 0 ? (v / metrics.carteraViva) * 100 : 0;
                  return a + s * s;
                }, 0);
                const risk = hhi > 1800 ? "rojo" : hhi > 1000 ? "amarillo" : "verde";
                const rc = RISK_COLORS[risk];
                return (
                  <div>
                    <div style={{ fontSize:32, fontWeight:800, color:rc.text, letterSpacing:"-.05em" }}>{hhi.toFixed(0)}</div>
                    <div style={{ height:6, background:"#F1F5F9", borderRadius:999, margin:"12px 0", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.min(hhi/3000*100,100)}%`, background:rc.dot, borderRadius:999 }}/>
                    </div>
                    <div style={{ fontSize:12, color:rc.text, fontWeight:600 }}>{hhi > 1800 ? "Alta concentración" : hhi > 1000 ? "Concentración moderada" : "Diversificada"}</div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>HHI &lt; 1000 = diversificada · &gt; 1800 = concentrada</div>
                  </div>
                );
              })()}
            </div>
            <div className="card" style={{ padding:22 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Amortización</div>
              {[
                { label:"Amortiza",         val:credits.filter(c=>c.amortiza==="SI").length,     color:"#00E5A0" },
                { label:"Bullet",           val:metrics.bullet,                                   color:"#F59E0B" },
                { label:"Sin amortización", val:credits.filter(c=>c.amortiza==="NO").length,     color:"#F43F5E" },
              ].map(r => (
                <div key={r.label} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:r.color, flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:"#475569", flex:1 }}>{r.label}</span>
                  <div className="bar-track" style={{ maxWidth:80 }}>
                    <div className="bar-fill" style={{ width:`${metrics.total > 0 ? (r.val/metrics.total)*100 : 0}%`, background:r.color }}/>
                  </div>
                  <span className="mono" style={{ fontSize:12, fontWeight:700, color:"#0F172A" }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: IA ── */}
      {activeTab === "ia" && (
        <div className="fade">
          <div className="card" style={{ padding:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", display:"grid", placeItems:"center" }}>
                <Ic d="M8 2l1.5 3h3l-2.5 2 1 3L8 8.5 5 10l1-3L3.5 5h3z" s={16} c="#fff" sw={1.5}/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>Análisis IA de Cartera</div>
                <div style={{ fontSize:12, color:"#94A3B8" }}>Claude analiza tus métricas reales y genera insights accionables</div>
              </div>
              {aiLoading && (
                <div className="ai-pulse" style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:999, fontSize:12, color:"#1E40AF", fontWeight:600 }}>
                  <svg className="spinner" width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
                  Analizando cartera...
                </div>
              )}
            </div>
            {aiLoading && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[200,160,240,180,200].map((w,i) => (
                  <div key={i} className="shimmer" style={{ height:14, width:`${w}px`, maxWidth:"100%", borderRadius:6 }}/>
                ))}
              </div>
            )}
            {!aiLoading && aiAnalysis && (
              <div className="markdown" dangerouslySetInnerHTML={{ __html: aiAnalysis
                .replace(/## (.+)/g, '<h2>$1</h2>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/🟢/g, '<span style="color:#00E5A0">🟢</span>')
                .replace(/🟡/g, '<span style="color:#F59E0B">🟡</span>')
                .replace(/🔴/g, '<span style="color:#F43F5E">🔴</span>')
                .replace(/^- (.+)$/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^(?!<[hul])/gm, '<p>')
                .replace(/<p><\/p>/g, '')
              }}/>
            )}
            {!aiLoading && !aiAnalysis && (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#94A3B8", fontSize:13 }}>
                {credits.length === 0 ? "Agrega créditos a tu cartera para generar el análisis IA." : "Cargando análisis..."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
