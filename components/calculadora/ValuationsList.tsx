// components/calculadora/ValuationsList.tsx — Lista de valuaciones recientes del usuario
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type ValuacionSummary = {
  id: string;
  nombre: string | null;
  created_at: string;
  n_creditos: number;
  n_creditos_calculados: number | null;
  npv_total_mxn: number | null;
  saldo_total_mxn: number | null;
  el_total_mxn: number | null;
  status: string;
};

type ListState = "loading" | "loaded" | "empty" | "error";

type Props = {
  onSelect: (v: ValuacionSummary) => void;
  refreshKey: number;
};

function fmtMoneyShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const mon = months[d.getMonth()];
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${mon} ${h}:${m}`;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  completed:              { bg: "#F0FDF4", color: "#059669", label: "Completada" },
  completed_with_errors:  { bg: "#FFF7ED", color: "#D97706", label: "Con errores" },
  error:                  { bg: "#FEF2F2", color: "#DC2626", label: "Error" },
  processing:             { bg: "#F8FAFC", color: "#64748B", label: "Procesando" },
};

export default function ValuationsList({ onSelect, refreshKey }: Props) {
  const [state, setState] = useState<ListState>("loading");
  const [valuaciones, setValuaciones] = useState<ValuacionSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState("loading");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setState("error"); return; }
        const res = await fetch("/api/calculadora/cartera/list?limit=5", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) { setState("error"); return; }
        const json = await res.json();
        if (cancelled) return;
        const list = json.valuaciones ?? [];
        setValuaciones(list);
        setState(list.length === 0 ? "empty" : "loaded");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  function handleClick(v: ValuacionSummary) {
    if (v.status === "processing") {
      alert("Esta valuación todavía está calculando. Espera unos segundos y refresca.");
      return;
    }
    onSelect(v);
  }

  if (state === "loading") {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#94A3B8" }}>Cargando valuaciones...</div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#94A3B8" }}>No pudimos cargar tus valuaciones. Refresca la página.</div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#94A3B8" }}>Aún no has subido carteras. Sube tu primera arriba.</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Valuaciones recientes</div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{valuaciones.length} más recientes</div>
      </div>

      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "110px 80px 90px 90px 100px 50px", padding: "8px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        {["FECHA", "CRÉDITOS", "SALDO", "NPV", "STATUS", ""].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", fontFamily: "'JetBrains Mono', monospace" }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      {valuaciones.map((v, i) => {
        const badge = STATUS_BADGE[v.status] ?? STATUS_BADGE.processing;
        const isLast = i === valuaciones.length - 1;
        return (
          <div
            key={v.id}
            onClick={() => handleClick(v)}
            style={{
              display: "grid", gridTemplateColumns: "110px 80px 90px 90px 100px 50px",
              padding: "12px 24px", alignItems: "center",
              borderBottom: isLast ? "none" : "1px solid #F1F5F9",
              cursor: "pointer", transition: "background .1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ fontSize: 12, color: "#64748B" }}>{fmtDate(v.created_at)}</div>
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>
              {v.n_creditos_calculados ?? v.n_creditos} / {v.n_creditos}
            </div>
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>{fmtMoneyShort(v.saldo_total_mxn)}</div>
            <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>{fmtMoneyShort(v.npv_total_mxn)}</div>
            <div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                background: badge.bg, color: badge.color,
              }}>
                {badge.label}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#0C1E4A", fontWeight: 600, textAlign: "right" }}>Ver →</div>
          </div>
        );
      })}
    </div>
  );
}
