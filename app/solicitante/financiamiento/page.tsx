"use client";

import React, { useEffect, useState } from "react";

type Lender = {
  id: string; slug: string; name: string;
  logo_url: string | null; primary_color: string; secondary_color: string;
  descripcion: string | null; tasa_min: number | null; tasa_max: number | null;
  monto_min: number | null; monto_max: number | null;
  sectores: string[] | null; tipo_credito: string | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.plinius.mx";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

function LenderCard({ lender }: { lender: Lender }) {
  const primary   = lender.primary_color   ?? "#1A3A6B";
  const secondary = lender.secondary_color ?? "#00C896";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 20,
        overflow: "hidden", display: "flex", flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header — color sólido con logo centrado */}
      <div style={{
        background: primary, padding: "28px 24px 24px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>

        {/* Fila superior: logo + badge verificado */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>

          {/* Logo o avatar */}
          {lender.logo_url ? (
            <div style={{
              height: 44, maxWidth: 140,
              display: "flex", alignItems: "center",
            }}>
              <img
                src={lender.logo_url}
                alt={lender.name}
                style={{
                  height: "100%", maxWidth: "100%",
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)",
                }}
              />
            </div>
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800, color: "#fff",
            }}>
              {lender.name[0]}
            </div>
          )}

          {/* Verified badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 20, padding: "4px 10px",
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>VERIFICADO</span>
          </div>
        </div>

        {/* Nombre y tipo */}
        <div>
          <p style={{ margin: "0 0 3px", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {lender.name}
          </p>
          {lender.tipo_credito && (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
              {lender.tipo_credito}
            </p>
          )}
        </div>

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "TASA ANUAL", value: lender.tasa_min && lender.tasa_max ? `${lender.tasa_min}–${lender.tasa_max}%` : "—" },
            { label: "HASTA",     value: lender.monto_max ? fmt(lender.monto_max) : "—" },
            { label: "DESDE",     value: lender.monto_min ? fmt(lender.monto_min) : "—" },
          ].map(m => (
            <div key={m.label} style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10, padding: "10px 12px",
            }}>
              <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em" }}>
                {m.label}
              </p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

        {lender.descripcion && (
          <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            {lender.descripcion}
          </p>
        )}

        {lender.sectores && lender.sectores.length > 0 && (
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Sectores
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {lender.sectores.map(s => (
                <span key={s} style={{
                  fontSize: 11, fontWeight: 600,
                  color: primary, background: `${primary}0F`,
                  border: `1px solid ${primary}25`,
                  padding: "3px 10px", borderRadius: 20,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trust row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 10,
          background: `${secondary}08`,
          border: `1px solid ${secondary}20`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `${secondary}18`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.5 3h3l-2.5 2 1 3L6 7.5 3 9l1-3L1.5 4h3z" stroke={secondary} strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#0F172A" }}>Proceso 100% digital</p>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: "#94A3B8" }}>Respuesta en 24–48 horas hábiles</p>
          </div>
        </div>

        {/* CTA */}
        <a
          href={`${APP_URL}/onboarding/${lender.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            height: 46, borderRadius: 12, border: "none",
            background: primary, color: "#fff",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
            letterSpacing: "-0.01em", marginTop: "auto",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Solicitar con {lender.name}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function FinanciamientoPage() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onb-lenders/public")
      .then(r => r.json())
      .then(d => { setLenders(d.lenders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 10 }}>
          Opciones de financiamiento
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#0F172A", margin: 0 }}>
              Encuentra tu otorgante
            </h1>
            <p style={{ fontSize: 14, color: "#64748B", margin: "8px 0 0", lineHeight: 1.5 }}>
              Aplica con otorgantes verificados. Proceso 100% digital.
            </p>
          </div>
          {!loading && lenders.length > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", background: "#F1F5F9", padding: "6px 14px", borderRadius: 20, border: "1px solid #E2E8F0" }}>
              {lenders.length} otorgante{lenders.length !== 1 ? "s" : ""} disponible{lenders.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, #E2E8F0 0%, transparent 100%)", marginTop: 24 }}/>
      </div>

      {loading && (
        <div style={{ padding: "80px 0", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Cargando...</div>
      )}

      {!loading && lenders.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🏦</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#475569" }}>No hay otorgantes disponibles aún</p>
        </div>
      )}

      {!loading && lenders.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {lenders.map(lender => <LenderCard key={lender.id} lender={lender} />)}
        </div>
      )}
    </div>
  );
}
