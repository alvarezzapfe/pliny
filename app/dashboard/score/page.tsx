"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { calcularScore } from "@/lib/scoreEngine";
import { checkEFOS } from "@/lib/efosCheck";
import type { EfosResult } from "@/lib/efosCheck";

// ─── Helpers visuales (sin cambios) ──────────────────────────────────────────

type VarStatus = "ok" | "warn" | "risk" | "missing" | "pending" | "fail";
const SCOLOR: Record<string, string> = { ok: "#00C48C", warn: "#F59E0B", risk: "#F97316", fail: "#F97316", missing: "#EF4444", pending: "#475569" };
const SBG:    Record<string, string> = { ok: "rgba(0,196,140,.08)", warn: "rgba(245,158,11,.08)", risk: "rgba(249,115,22,.08)", fail: "rgba(249,115,22,.08)", missing: "rgba(239,68,68,.08)", pending: "rgba(71,85,105,.08)" };
const SLABEL: Record<string, string> = { ok: "OK", warn: "MEJORAR", risk: "RIESGO", fail: "RIESGO", missing: "FALTA", pending: "PENDIENTE" };
const SICON:  Record<string, string> = { ok: "✓", warn: "⚠", risk: "↓", fail: "↓", missing: "✗", pending: "⏳" };

function scoreGrade(s: number) {
  if (s >= 85) return { l: "A", label: "Excelente",   c: "#00C48C", g: "rgba(0,196,140,.3)"  };
  if (s >= 70) return { l: "B", label: "Bueno",       c: "#4ADE80", g: "rgba(74,222,128,.25)"};
  if (s >= 55) return { l: "C", label: "Moderado",    c: "#F59E0B", g: "rgba(245,158,11,.25)"};
  if (s >= 40) return { l: "D", label: "Bajo",        c: "#F97316", g: "rgba(249,115,22,.25)"};
  return               { l: "E", label: "Alto riesgo",c: "#EF4444", g: "rgba(239,68,68,.3)"  };
}

function useAnimated(target: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / ms, 1);
      setV(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, ms]);
  return v;
}

function GaugeSm({ score }: { score: number }) {
  const disp = useAnimated(score, 1400);
  const g = scoreGrade(score);
  const cx = 140, cy = 120, START = -215, RANGE = 250;
  const ang = START + (disp / 100) * RANGE;
  function pt(deg: number, r: number) { const a = deg * Math.PI / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }
  function arc(s: number, e: number, ri: number, ro: number) { const a = pt(s, ro), b = pt(e, ro), c = pt(e, ri), d = pt(s, ri); const l = e - s > 180 ? 1 : 0; return `M${a.x},${a.y} A${ro},${ro} 0 ${l} 1 ${b.x},${b.y} L${c.x},${c.y} A${ri},${ri} 0 ${l} 0 ${d.x},${d.y} Z`; }
  const SEGS = [{ f: -215, t: -173, c: "#EF4444" }, { f: -173, t: -131, c: "#F97316" }, { f: -131, t: -89, c: "#F59E0B" }, { f: -89, t: -47, c: "#4ADE80" }, { f: -47, t: 35, c: "#00C48C" }];
  const needle = pt(ang, 80);
  return (
    <svg viewBox="0 0 280 165" style={{ width: "100%", maxWidth: 320, overflow: "visible" }}>
      <defs>
        <radialGradient id="sg"><stop offset="0%" stopColor={g.c} stopOpacity=".1" /><stop offset="100%" stopColor={g.c} stopOpacity="0" /></radialGradient>
        <filter id="sglow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={cx} cy={cy} r={115} fill="url(#sg)" />
      <path d={arc(-215, 35, 76, 100)} fill="#0A1628" />
      {SEGS.map((s, i) => <path key={i} d={arc(s.f, s.t, 77, 99)} fill={s.c} opacity={0.1} />)}
      {disp > 0 && <path d={arc(-215, ang, 77, 99)} fill={g.c} opacity={0.85} filter="url(#sglow)" />}
      {Array.from({ length: 51 }).map((_, i) => { const deg = -215 + i * 5, maj = i % 5 === 0; const p1 = pt(deg, 101), p2 = pt(deg, maj ? 111 : 106); return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={maj ? "#1E293B" : "#0F1E2E"} strokeWidth={maj ? 1.5 : 0.8} />; })}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={g.c} strokeWidth={2.5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${g.g})` }} />
      <circle cx={cx} cy={cy} r={7} fill={g.c} />
      <circle cx={cx} cy={cy} r={3} fill="#040C18" />
      <text x={cx} y={cy + 30} textAnchor="middle" fill={g.c} fontSize={32} fontWeight={900} fontFamily="'Geist Mono',monospace" style={{ filter: `drop-shadow(0 0 12px ${g.g})` }}>{disp}</text>
      <text x={cx} y={cy + 46} textAnchor="middle" fill="#475569" fontSize={9} fontFamily="'Geist Mono',monospace" letterSpacing="2">DE 100</text>
      <text x={26} y={152} fill="#EF4444" fontSize={8} fontFamily="'Geist Mono',monospace" fontWeight={700}>RIESGO</text>
      <text x={210} y={152} fill="#00C48C" fontSize={8} fontFamily="'Geist Mono',monospace" fontWeight={700}>ÓPTIMO</text>
    </svg>
  );
}

const CAT_COLOR: Record<string, string> = { fiscal: "#818CF8", financiero: "#34D399", operativo: "#60A5FA", mercado: "#F472B6", credito: "#FB923C" };

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ScorePage() {
  const router = useRouter();
  const [borrower, setBorrower]     = useState<any>(null);
  const [user, setUser]             = useState<any>(null);
  const [efosResult, setEfosResult] = useState<EfosResult | null>(null);
  const [loading, setLoading]       = useState(true);
  const [scanState, setScanState]   = useState<"idle" | "loading" | "done">("idle");
  const [tab, setTab]               = useState<"score" | "mejoras">("score");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUser(auth.user);

      const [{ data: b }, { data: r }] = await Promise.all([
        supabase.from("borrowers_profile").select("*").eq("owner_id", auth.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle(),
      ]);

      if (r?.role === "otorgante") { router.push("/dashboard"); return; }
      setBorrower(b);

      // Consultar EFOS si tiene RFC
      if (b?.company_rfc) {
        const efos = await checkEFOS(
          b.company_rfc,
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        setEfosResult(efos);
      }

      setLoading(false);
    })();
  }, [router]);

  // Calcular score con el engine real
  const scoreResult = calcularScore({
    company_rfc:           borrower?.company_rfc ?? null,
    fin_facturacion_anual: borrower?.fin_facturacion_anual ?? null,
    fin_antiguedad:        borrower?.fin_antiguedad ?? null,
    fin_num_empleados:     borrower?.fin_num_empleados ?? null,
    fin_sector:            borrower?.fin_sector ?? null,
    efosResult,
  });

  const score     = scoreResult.total;
  const vars      = scoreResult.variables;
  const grade     = scoreGrade(score);
  const okVars    = vars.filter(v => v.status === "ok");
  const missing   = vars.filter(v => (v.status as string) === "missing" || (v.status as string) === "fail");
  const pending   = vars.filter(v => v.status === "pending");
  const completeness = Math.round((okVars.length + missing.length) / vars.length * 100);

  const improvements = [
    { id: "sat",  icon: "⚡", label: "Conectar SAT / Ekatena",     desc: "Desbloquea DSCR, EBITDA, DSO, Concentración de clientes", pts: "+35 pts", cost: "Incluido en scan $299", action: "scan" },
    { id: "buro", icon: "🏦", label: "Consultar Buró de Crédito",  desc: "Historial crediticio empresarial y score Buró oficial",     pts: "+15 pts", cost: "Incluido en scan $299", action: "scan" },
    { id: "kyc",  icon: "📋", label: "Completar perfil y KYC",     desc: "RFC, CURP, documentos, garantías",                          pts: "+20 pts", cost: "Gratis",                action: "kyc"  },
    { id: "hist", icon: "🔄", label: "Generar historial Plinius",   desc: "Completa y paga tu primera solicitud de crédito",           pts: "+8 pts",  cost: "Al pagar primer crédito", action: "sol" },
  ];

  async function requestScan() {
    setScanState("loading");
    await supabase.from("scan_requests").upsert({
      user_id: user?.id,
      type: "buro_sat",
      status: "pending",
      amount: 299,
      requested_at: new Date().toISOString(),
    });
    await new Promise(r => setTimeout(r, 1400));
    setScanState("done");
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
    .tbtn{border:none;cursor:pointer;transition:all .15s;font-family:'Geist',sans-serif;}
    .varrow:hover{background:#0D1E35!important;transform:translateY(-1px);}
    .varrow{transition:all .15s;}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1E293B;border-radius:999px}
  `;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#040C18", display: "grid", placeItems: "center" }}>
      <style>{CSS}</style>
      <svg style={{ animation: "spin .8s linear infinite" }} width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#334155" strokeWidth="2"><path d="M10 2a8 8 0 018 8" /></svg>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#040C18", fontFamily: "'Geist',sans-serif", color: "#F8FAFC" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px 80px" }}>

        {/* Header */}
        <div className="fade" style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#475569", letterSpacing: ".12em", marginBottom: 8, fontWeight: 500 }}>MI PERFIL CREDITICIO</div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Score Crediticio</div>
          <div style={{ fontSize: 13, color: "#475569" }}>Así te ven los inversionistas en el marketplace</div>
        </div>

        {/* Alerta EFOS si aplica */}
        {efosResult && efosResult.status !== "limpio" && efosResult.status !== "error" && (
          <div className="fade" style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 14, background: "rgba(239,68,68,.06)", border: "1.5px solid rgba(239,68,68,.25)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 2 }}>Alerta SAT — Lista 69-B</div>
              <div style={{ fontSize: 11, color: "rgba(239,68,68,.7)" }}>{efosResult.message}</div>
            </div>
          </div>
        )}

        {/* Score card */}
        <div className="fade" style={{ borderRadius: 24, background: "linear-gradient(160deg,#0B1A2E,#060F1C)", border: `1.5px solid ${grade.c}20`, padding: "28px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle,${grade.g} 0%,transparent 65%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", minWidth: 200 }}>
              <GaugeSm score={score} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: `${grade.c}12`, border: `2px solid ${grade.c}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, color: grade.c, fontFamily: "'Geist Mono',monospace", boxShadow: `0 0 32px ${grade.g},inset 0 1px 0 ${grade.c}20` }}>
                  {grade.l}
                </div>
                <div>
                  <div style={{ fontSize: 42, fontWeight: 900, fontFamily: "'Geist Mono',monospace", color: grade.c, letterSpacing: "-0.05em", lineHeight: 1, textShadow: `0 0 30px ${grade.g}` }}>{score}</div>
                  <div style={{ fontSize: 12, color: grade.c, fontWeight: 600, opacity: .75, marginTop: 2 }}>{grade.label}</div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>Completitud del perfil</span>
                  <span style={{ fontSize: 11, color: "#00E5A0", fontWeight: 700 }}>{completeness}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: "#0F1E2E", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, width: `${completeness}%`, background: "linear-gradient(90deg,#3B82F6,#00E5A0)", transition: "width 1.4s cubic-bezier(.16,1,.3,1) 500ms", boxShadow: "0 0 12px rgba(0,229,160,.3)" }} />
                </div>
              </div>

              {/* Pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ padding: "7px 14px", borderRadius: 99, background: "rgba(0,196,140,.08)", border: "1.5px solid rgba(0,196,140,.18)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, color: "#00C48C" }}>✓</span>
                  <span style={{ fontSize: 11, color: "#00C48C", fontWeight: 600 }}>{okVars.length} ok</span>
                </div>
                <div style={{ padding: "7px 14px", borderRadius: 99, background: "rgba(239,68,68,.08)", border: "1.5px solid rgba(239,68,68,.18)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, color: "#EF4444" }}>✗</span>
                  <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>{missing.length} faltantes</span>
                </div>
                <div style={{ padding: "7px 14px", borderRadius: 99, background: "rgba(71,85,105,.15)", border: "1.5px solid rgba(71,85,105,.3)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>⏳</span>
                  <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{pending.length} pendientes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scan CTA */}
        <div className="fade" style={{ marginBottom: 24 }}>
          {scanState === "done" ? (
            <div style={{ padding: "18px 22px", background: "rgba(0,196,140,.06)", border: "1.5px solid rgba(0,196,140,.2)", borderRadius: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,196,140,.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke="#00C48C" strokeWidth="2.5"><path d="M2 9l5 5 9-9" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#00C48C", marginBottom: 2 }}>¡Solicitud enviada! Procesando scan Buró + SAT</div>
                <div style={{ fontSize: 11, color: "rgba(0,196,140,.5)" }}>Te notificaremos cuando tu score se actualice · $299 MXN</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "22px 24px", background: "linear-gradient(135deg,#0F1829,#111827)", border: "1.5px solid rgba(99,102,241,.25)", borderRadius: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.25)", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>🔍</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#A5B4FC", letterSpacing: "-0.02em" }}>Scan Completo · Buró + SAT</div>
                      <div style={{ fontSize: 11, color: "rgba(165,180,252,.45)", marginTop: 1 }}>Desbloquea DSCR · EBITDA · DSO · Score Buró oficial</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#818CF8", background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>+50 PTS</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {["Buró Empresarial", "CFDIs SAT", "Análisis 12 meses", "PDF descargable"].map(f => (
                      <span key={f} style={{ fontSize: 10, color: "rgba(129,140,248,.6)", background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.12)", borderRadius: 999, padding: "3px 10px" }}>✓ {f}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Geist Mono',monospace", color: "#A5B4FC", lineHeight: 1, letterSpacing: "-0.04em" }}>$299</div>
                    <div style={{ fontSize: 10, color: "rgba(165,180,252,.4)" }}>MXN · pago único</div>
                  </div>
                  <button onClick={requestScan} disabled={scanState === "loading" || !borrower?.company_rfc}
                    style={{ height: 44, padding: "0 26px", borderRadius: 12, border: "none", background: borrower?.company_rfc ? "linear-gradient(135deg,#4F46E5,#7C3AED)" : "rgba(30,41,59,.6)", color: borrower?.company_rfc ? "#fff" : "#475569", fontSize: 13, fontWeight: 700, cursor: borrower?.company_rfc ? "pointer" : "not-allowed", fontFamily: "'Geist',sans-serif", boxShadow: borrower?.company_rfc ? "0 4px 24px rgba(79,70,229,.4)" : "none", opacity: scanState === "loading" ? .7 : 1, whiteSpace: "nowrap", transition: "all .15s" }}>
                    {scanState === "loading" ? "Enviando…" : "Solicitar scan →"}
                  </button>
                  {!borrower?.company_rfc && <div style={{ fontSize: 10, color: "#EF4444", fontWeight: 500 }}>Completa tu RFC primero</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #0F1E2E" }}>
          {([["score", "Variables del score"], ["mejoras", "Cómo mejorar"]] as const).map(([id, label]) => (
            <button key={id} className="tbtn" onClick={() => setTab(id)}
              style={{ padding: "10px 18px", background: "transparent", color: tab === id ? "#F8FAFC" : "#475569", fontSize: 13, fontWeight: tab === id ? 700 : 500, borderBottom: tab === id ? "2px solid #00E5A0" : "2px solid transparent", marginBottom: -1, transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: Variables */}
        {tab === "score" && (
          <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {vars.map((v, i) => {
              const status = v.status as string;
              const sc = SCOLOR[status] ?? "#475569";
              const bg = SBG[status]   ?? "rgba(71,85,105,.08)";
              const catColor = CAT_COLOR[v.categoria] ?? "#64748B";
              const pct = v.puntos && v.peso ? Math.round((v.puntos / v.peso) * 100) : 0;
              return (
                <div key={v.id} className="varrow"
                  style={{ padding: "14px 18px", borderRadius: 14, background: "#080F1C", border: "1px solid #0F1E2E", animation: `fadeUp .3s cubic-bezier(.16,1,.3,1) ${i * 40}ms both`, cursor: "default" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1.5px solid ${sc}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, color: sc }}>
                        {SICON[status] ?? "?"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", marginBottom: 3 }}>{v.nombre}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: catColor, background: `${catColor}12`, border: `1px solid ${catColor}20`, borderRadius: 999, padding: "1px 8px", textTransform: "capitalize" }}>{v.categoria}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 1 }}>{v.valor ?? "—"}</div>
                        <div style={{ fontSize: 10, color: "#1E293B" }}>{v.fuente}</div>
                      </div>
                      <div style={{ padding: "5px 12px", borderRadius: 99, background: bg, border: `1.5px solid ${sc}25`, display: "flex", alignItems: "center", gap: 5, minWidth: 80, justifyContent: "center" }}>
                        <span style={{ fontSize: 11, color: sc }}>{SICON[status] ?? "?"}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sc }}>{SLABEL[status] ?? status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  {v.status !== "pending" && (
                    <div style={{ marginTop: 12, height: 4, borderRadius: 999, background: "#0A1628", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: sc, width: `${pct}%`, transition: "width 1s cubic-bezier(.16,1,.3,1) 200ms", boxShadow: v.status === "ok" ? `0 0 8px ${sc}60` : "none" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Mejoras */}
        {tab === "mejoras" && (
          <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 500, letterSpacing: ".1em", marginBottom: 4 }}>ACCIONES PARA MEJORAR TU SCORE</div>
            {improvements.map((imp, i) => (
              <div key={imp.id}
                style={{ padding: "18px 20px", borderRadius: 16, background: "#080F1C", border: "1px solid #0F1E2E", display: "flex", alignItems: "center", gap: 16, animation: `fadeUp .3s cubic-bezier(.16,1,.3,1) ${i * 60}ms both`, flexWrap: "wrap" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid #1E293B", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>{imp.icon}</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", marginBottom: 4 }}>{imp.label}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>{imp.desc}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#00E5A0", background: "rgba(0,229,160,.08)", border: "1px solid rgba(0,229,160,.2)", borderRadius: 999, padding: "3px 10px" }}>{imp.pts} potenciales</span>
                    <span style={{ fontSize: 10, color: "#64748B", background: "#0A1628", border: "1px solid #1E293B", borderRadius: 999, padding: "3px 10px" }}>{imp.cost}</span>
                  </div>
                </div>
                <button onClick={() => {
                  if (imp.action === "scan") requestScan();
                  if (imp.action === "kyc")  router.push("/solicitante/datos");
                  if (imp.action === "sol")  router.push("/solicitante/solicitudes");
                }}
                  style={{ height: 38, padding: "0 18px", borderRadius: 10, border: "none", background: imp.action === "scan" ? "linear-gradient(135deg,#4F46E5,#7C3AED)" : "rgba(30,41,59,.6)", color: imp.action === "scan" ? "#fff" : "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif", flexShrink: 0, whiteSpace: "nowrap", boxShadow: imp.action === "scan" ? "0 2px 16px rgba(99,102,241,.3)" : "none", transition: "all .15s" }}>
                  {imp.action === "scan" ? (scanState === "done" ? "Enviado ✓" : scanState === "loading" ? "Enviando…" : "Solicitar $299 →") : imp.action === "kyc" ? "Completar →" : "Ver solicitudes →"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
