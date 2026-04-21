"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function FondeadorDashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, []);

  const name = email?.split("@")[0] ?? "";

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;} .d2{animation-delay:.10s;} .d3{animation-delay:.15s;}
      `}</style>

      {/* Header */}
      <div className="fade" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>
            {loading ? "Cargando..." : `Bienvenido, ${name}`}
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono', monospace",
            background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE",
            borderRadius: 999, padding: "3px 10px", letterSpacing: ".06em",
          }}>
            FONDEADOR
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#64748B" }}>Panel de fondeador institucional</p>
      </div>

      {/* Status Card */}
      <div className="fade d1" style={{
        background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)", borderRadius: 16,
        padding: "24px 28px", marginBottom: 20, color: "#EEF2FF",
        boxShadow: "0 4px 24px rgba(12,30,74,.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.10)",
            display: "grid", placeItems: "center",
          }}>
            <Ic d="M8 2a6 6 0 100 12 6 6 0 000-12zM8 5v3l2 1" s={18} c="rgba(238,242,255,.8)" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Tu perfil está en revisión</div>
            <div style={{ fontSize: 12, color: "rgba(238,242,255,.55)" }}>Nuestro equipo validará tu información en las próximas 24-48 horas</div>
          </div>
        </div>
        <div style={{
          height: 4, background: "rgba(255,255,255,.10)", borderRadius: 999, overflow: "hidden",
        }}>
          <div style={{ width: "35%", height: "100%", background: "#3B82F6", borderRadius: 999, transition: "width .8s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, fontFamily: "'Geist Mono', monospace", color: "rgba(238,242,255,.35)", letterSpacing: ".06em" }}>VERIFICACIÓN EN PROGRESO</span>
          <span style={{ fontSize: 10, fontFamily: "'Geist Mono', monospace", color: "rgba(238,242,255,.35)" }}>35%</span>
        </div>
      </div>

      {/* Cards grid */}
      <div className="fade d2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {/* Inbox */}
        <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "24px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE", display: "grid", placeItems: "center" }}>
              <Ic d="M2 4h12v8H2zM2 4l6 4.5L14 4" s={16} c="#3B82F6" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Inbox</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Postulaciones recibidas</div>
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#E2E8F0", letterSpacing: "-0.04em" }}>0</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Sin postulaciones aún</div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: "#94A3B8", textAlign: "center",
            padding: "8px 12px", background: "#F8FAFC", borderRadius: 8, cursor: "default",
          }}>
            Disponible próximamente
          </div>
        </div>

        {/* Estadísticas */}
        <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "24px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F0FDF9", border: "1px solid #A7F3D0", display: "grid", placeItems: "center" }}>
              <Ic d="M2 12L6 7l3 3 3-4 2 2" s={16} c="#059669" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Estadísticas</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Métricas de tu portafolio</div>
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#E2E8F0", letterSpacing: "-0.04em" }}>—</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Sin datos todavía</div>
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: "#94A3B8", textAlign: "center",
            padding: "8px 12px", background: "#F8FAFC", borderRadius: 8, cursor: "default",
          }}>
            Disponible próximamente
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="fade d3" style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "18px 22px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Necesitas ayuda?</div>
        <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.7 }}>
          Escríbenos a{" "}
          <a href="mailto:contacto@plinius.mx" style={{ color: "#1E40AF", fontWeight: 600, textDecoration: "none" }}>contacto@plinius.mx</a>
          {" "}y te respondemos en menos de 24 horas.
        </div>
      </div>
    </div>
  );
}
