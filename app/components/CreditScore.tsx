"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type ScoreVariable = {
  key: string;
  label: string;
  weight: number;       // peso relativo %
  value: number | null; // 0-100, null = no disponible
  raw?: string;         // valor legible
  status: "ok" | "warn" | "missing" | "pending";
};

type CreditScoreProps = {
  userId?: string;
  // En producción estos vendrán de la DB / API
  mockData?: Partial<ScoreData>;
  compact?: boolean; // versión pequeña para marketplace
};

type ScoreData = {
  score: number;          // 0-100
  buro_score: number | null;
  variables: ScoreVariable[];
  calculado_at: string;
  version: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getGrade(score: number): { letter: string; label: string; color: string; glow: string } {
  if (score >= 85) return { letter: "A", label: "Excelente",  color: "#00C48C", glow: "rgba(0,196,140,.35)" };
  if (score >= 70) return { letter: "B", label: "Bueno",      color: "#4ADE80", glow: "rgba(74,222,128,.3)" };
  if (score >= 55) return { letter: "C", label: "Moderado",   color: "#FACC15", glow: "rgba(250,204,21,.3)" };
  if (score >= 40) return { letter: "D", label: "Bajo",       color: "#FB923C", glow: "rgba(251,146,60,.3)" };
  return             { letter: "E", label: "Muy bajo",     color: "#F87171", glow: "rgba(248,113,113,.3)" };
}

function getVarColor(status: ScoreVariable["status"]) {
  return { ok: "#00C48C", warn: "#FACC15", missing: "#F87171", pending: "#94A3B8" }[status];
}

function useAnimatedNumber(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// ── Default mock data ─────────────────────────────────────────────────────────
const DEFAULT_MOCK: ScoreData = {
  score: 67,
  buro_score: null,
  calculado_at: new Date().toISOString(),
  version: "1.0-beta",
  variables: [
    { key: "rfc_validado",     label: "RFC / CURP validado",          weight: 12, value: 100, raw: "Validado",        status: "ok" },
    { key: "antiguedad",       label: "Antigüedad de la empresa",     weight: 15, value: 70,  raw: "4 años",          status: "ok" },
    { key: "facturacion",      label: "Facturación anual declarada",  weight: 20, value: 65,  raw: "$8.5M MXN",       status: "ok" },
    { key: "garantias",        label: "Garantías ofrecidas",          weight: 18, value: 55,  raw: "Inmueble parcial", status: "warn" },
    { key: "sector",           label: "Sector / giro",                weight: 8,  value: 80,  raw: "Manufactura",     status: "ok" },
    { key: "empleados",        label: "Número de empleados",          weight: 7,  value: 60,  raw: "45 empleados",    status: "ok" },
    { key: "capacidad",        label: "Monto solicitado vs capacidad",weight: 12, value: 50,  raw: "72% de capacidad", status: "warn" },
    { key: "historial",        label: "Historial de pagos en Plinius",weight: 8,  value: 0,   raw: "Sin historial",   status: "missing" },
    { key: "buro",             label: "Buró de Crédito",              weight: 0,  value: null, raw: "Consulta manual", status: "pending" },
  ],
};

// ── Gauge SVG ─────────────────────────────────────────────────────────────────
function Gauge({ score, animate }: { score: number; animated?: boolean; animate: boolean }) {
  const animScore = useAnimatedNumber(animate ? score : 0, 1400);
  const displayScore = animate ? animScore : score;

  const grade = getGrade(score);
  const cx = 120, cy = 110, r = 90;
  const startAngle = -210;
  const totalAngle = 240;
  const angle = startAngle + (displayScore / 100) * totalAngle;

  function polar(deg: number, radius: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arc(startDeg: number, endDeg: number, innerR: number, outerR: number) {
    const s1 = polar(startDeg, outerR), e1 = polar(endDeg, outerR);
    const s2 = polar(endDeg, innerR),   e2 = polar(startDeg, innerR);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M${s1.x},${s1.y} A${outerR},${outerR} 0 ${large} 1 ${e1.x},${e1.y} L${s2.x},${s2.y} A${innerR},${innerR} 0 ${large} 0 ${e2.x},${e2.y} Z`;
  }

  // Color stops
  const stops = [
    { from: -210, to: -162, color: "#F87171" },
    { from: -162, to: -114, color: "#FB923C" },
    { from: -114, to:  -66, color: "#FACC15" },
    { from:  -66, to:  -18, color: "#4ADE80" },
    { from:  -18, to:   30, color: "#00C48C" },
  ];

  const needle = polar(angle, 72);

  return (
    <svg viewBox="0 0 240 150" style={{ width: "100%", maxWidth: 280, overflow: "visible" }}>
      {/* Track bg */}
      <path d={arc(-210, 30, 74, 96)} fill="#1E293B" />

      {/* Color segments */}
      {stops.map((s, i) => (
        <path key={i} d={arc(s.from, s.to, 75, 95)} fill={s.color} opacity={0.18} />
      ))}

      {/* Active fill */}
      {displayScore > 0 && (
        <path d={arc(-210, startAngle + (displayScore / 100) * totalAngle, 75, 95)} fill={grade.color} opacity={0.9} />
      )}

      {/* Tick marks */}
      {Array.from({ length: 41 }).map((_, i) => {
        const deg = -210 + i * 6;
        const inner = polar(deg, 98), outer = polar(deg, i % 5 === 0 ? 107 : 103);
        return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#334155" strokeWidth={i % 5 === 0 ? 1.5 : 0.8} />;
      })}

      {/* Needle */}
      <line
        x1={cx} y1={cy}
        x2={needle.x} y2={needle.y}
        stroke={grade.color}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${grade.glow})` }}
      />
      <circle cx={cx} cy={cy} r={6} fill={grade.color} style={{ filter: `drop-shadow(0 0 6px ${grade.glow})` }} />
      <circle cx={cx} cy={cy} r={3} fill="#0F172A" />

      {/* Score number */}
      <text x={cx} y={cy + 30} textAnchor="middle" fill={grade.color} fontSize={28} fontWeight={900} fontFamily="'Geist Mono',monospace"
        style={{ filter: `drop-shadow(0 0 8px ${grade.glow})` }}>
        {displayScore}
      </text>
      <text x={cx} y={cy + 44} textAnchor="middle" fill="#64748B" fontSize={9} fontFamily="'Geist Mono',monospace" letterSpacing="2">
        DE 100
      </text>

      {/* Labels */}
      <text x={22} y={132} fill="#F87171" fontSize={8} fontFamily="'Geist Mono',monospace" fontWeight={700}>BAJO</text>
      <text x={186} y={132} fill="#00C48C" fontSize={8} fontFamily="'Geist Mono',monospace" fontWeight={700}>ALTO</text>
    </svg>
  );
}

// ── Variable Bar ──────────────────────────────────────────────────────────────
function VarRow({ v, delay }: { v: ScoreVariable; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

  const color = getVarColor(v.status);
  const pct = v.value ?? 0;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0,
            boxShadow: v.status !== "missing" && v.status !== "pending" ? `0 0 6px ${color}` : "none" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#CBD5E1" }}>{v.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#475569" }}>{v.raw || "—"}</span>
          <span style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", fontWeight: 700,
            color: v.status === "pending" ? "#475569" : color }}>
            {v.status === "pending" ? "Pendiente" : v.value !== null ? `${v.value}` : "—"}
          </span>
          <span style={{ fontSize: 9, color: "#334155", fontFamily: "'Geist Mono',monospace" }}>{v.weight}%</span>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: "#1E293B", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 999,
          width: visible && v.value !== null ? `${pct}%` : "0%",
          background: v.status === "pending"
            ? "repeating-linear-gradient(90deg,#334155 0,#334155 4px,#1E293B 4px,#1E293B 8px)"
            : color,
          transition: `width 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
          boxShadow: v.status === "ok" ? `0 0 8px ${color}55` : "none",
        }} />
      </div>
    </div>
  );
}

// ── Grade Badge ───────────────────────────────────────────────────────────────
function GradeBadge({ score, large }: { score: number; large?: boolean }) {
  const g = getGrade(score);
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      width: large ? 72 : 48, height: large ? 72 : 48,
      borderRadius: large ? 18 : 12,
      background: `${g.color}18`,
      border: `2px solid ${g.color}55`,
      boxShadow: `0 0 20px ${g.glow}, inset 0 0 12px ${g.color}10`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: large ? 28 : 18, fontWeight: 900, color: g.color, fontFamily: "'Geist Mono',monospace",
        lineHeight: 1, textShadow: `0 0 12px ${g.glow}` }}>{g.letter}</span>
      {large && <span style={{ fontSize: 9, color: g.color, fontFamily: "'Geist Mono',monospace", marginTop: 2, letterSpacing: ".05em" }}>{g.label.toUpperCase()}</span>}
    </div>
  );
}

// ── Compact version (for marketplace card) ────────────────────────────────────
export function CreditScoreCompact({ data = DEFAULT_MOCK }: { data?: ScoreData }) {
  const grade = getGrade(data.score);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: "8px 14px", borderRadius: 14,
      background: "#0F172A",
      border: `1px solid ${grade.color}30`,
      boxShadow: `0 0 16px ${grade.glow}`,
    }}>
      <GradeBadge score={data.score} />
      <div>
        <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'Geist Mono',monospace", marginBottom: 2 }}>SCORE PLINIUS</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: grade.color, fontFamily: "'Geist Mono',monospace",
          textShadow: `0 0 10px ${grade.glow}` }}>{data.score}<span style={{ fontSize: 10, color: "#475569" }}>/100</span></div>
      </div>
    </div>
  );
}

// ── Full Score Card ───────────────────────────────────────────────────────────
export function CreditScoreCard({ data = DEFAULT_MOCK, compact = false }: { data?: ScoreData; compact?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  const grade = getGrade(data.score);
  const varsDone = data.variables.filter(v => v.status !== "pending").length;
  const varsTotal = data.variables.length;
  const completeness = Math.round((varsDone / varsTotal) * 100);

  return (
    <div style={{
      background: "linear-gradient(160deg, #0F172A 0%, #0A1628 100%)",
      border: `1px solid #1E293B`,
      borderRadius: 24,
      padding: compact ? "20px" : "28px",
      fontFamily: "'Geist', sans-serif",
      color: "#F8FAFC",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* BG grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
      {/* Glow orb */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${grade.glow} 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#334155", letterSpacing: ".15em", marginBottom: 4 }}>
              SCORE CREDITICIO PLINIUS
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em" }}>Perfil de riesgo</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GradeBadge score={data.score} large />
          </div>
        </div>

        {/* Gauge + stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", minWidth: 180 }}>
            <Gauge score={data.score} animate={mounted} />
          </div>
          <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Número grande */}
            <div style={{ padding: "14px 16px", borderRadius: 14, background: "#0A1628", border: `1px solid ${grade.color}25` }}>
              <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#334155", letterSpacing: ".1em", marginBottom: 6 }}>PUNTUACIÓN</div>
              <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Geist Mono',monospace", color: grade.color,
                textShadow: `0 0 20px ${grade.glow}` }}>{data.score}</div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "'Geist Mono',monospace" }}>de 100 puntos</div>
            </div>
            {/* Completeness */}
            <div style={{ padding: "12px 16px", borderRadius: 14, background: "#0A1628", border: "1px solid #1E293B" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#334155", letterSpacing: ".1em" }}>COMPLETITUD</div>
                <div style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#64748B" }}>{varsDone}/{varsTotal}</div>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "#1E293B" }}>
                <div style={{ height: "100%", borderRadius: 999, width: `${completeness}%`, background: "linear-gradient(90deg,#3B82F6,#00C48C)", transition: "width 1s cubic-bezier(.16,1,.3,1) 200ms" }} />
              </div>
              <div style={{ fontSize: 9, color: "#475569", marginTop: 5, fontFamily: "'Geist Mono',monospace" }}>
                {completeness < 100 ? `${100 - completeness}% pendiente` : "Perfil completo"}
              </div>
            </div>
            {/* Buró */}
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(251,146,60,.06)", border: "1px solid rgba(251,146,60,.18)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(251,146,60,.1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="#FB923C" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2v4M8 10v4M2 8h4M10 8h4"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#FB923C" }}>Buró de Crédito</div>
                <div style={{ fontSize: 9, color: "#78350F", fontFamily: "'Geist Mono',monospace" }}>API en construcción · Consulta manual</div>
              </div>
            </div>
          </div>
        </div>

        {/* Variables */}
        <div style={{ borderTop: "1px solid #1E293B", paddingTop: 20 }}>
          <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#334155", letterSpacing: ".12em", marginBottom: 14 }}>
            VARIABLES DEL MODELO
          </div>
          {data.variables.map((v, i) => (
            <VarRow key={v.key} v={v} delay={i * 80} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid #1E293B" }}>
          <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#334155" }}>
            Calculado {new Date(data.calculado_at).toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" })}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["ok","warn","missing","pending"] as const).map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: getVarColor(s) }} />
                <span style={{ fontSize: 8, fontFamily: "'Geist Mono',monospace", color: "#334155", textTransform: "uppercase" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin version (in user profile) ──────────────────────────────────────────
export function CreditScoreAdmin({ userId }: { userId: string }) {
  // En producción: fetch score por userId desde /api/score/:userId
  const data = { ...DEFAULT_MOCK, score: 67 };

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", marginBottom: 12, letterSpacing: ".06em" }}>
        SCORE CREDITICIO
      </div>
      <CreditScoreCard data={data} />
    </div>
  );
}

// ── Preview / Demo ────────────────────────────────────────────────────────────
export default function CreditScoreDemo() {
  const [score, setScore] = useState(67);
  const data: ScoreData = {
    ...DEFAULT_MOCK,
    score,
    variables: DEFAULT_MOCK.variables.map(v => ({
      ...v,
      value: v.value !== null ? Math.min(100, Math.max(0, v.value + (score - 67))) : null,
    })),
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060D1A", padding: "32px 24px", fontFamily: "'Geist', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#334155", letterSpacing: ".15em", marginBottom: 6 }}>PLINIUS · SISTEMA DE SCORING</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#F8FAFC", letterSpacing: "-0.04em" }}>Score Crediticio</div>
        </div>

        {/* Score slider (demo) */}
        <div style={{ marginBottom: 24, padding: "14px 18px", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#475569", whiteSpace: "nowrap" }}>DEMO SCORE</div>
          <input type="range" min={0} max={100} value={score} onChange={e => setScore(Number(e.target.value))}
            style={{ flex: 1, accentColor: getGrade(score).color }} />
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Geist Mono',monospace", color: getGrade(score).color, minWidth: 32 }}>{score}</div>
        </div>

        {/* Compact badge preview */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#334155", letterSpacing: ".12em", marginBottom: 10 }}>VERSIÓN COMPACTA (marketplace)</div>
          <CreditScoreCompact data={data} />
        </div>

        {/* Full card */}
        <CreditScoreCard data={data} />
      </div>
    </div>
  );
}
