// Tab Errores — muestra créditos que fallaron en el motor de cálculo
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CreditoDetalle } from "@/lib/cartera/types";

type Props = { valuacionId: string; totalCreditos?: number };

const MONO = "'JetBrains Mono', monospace";

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TabErrores({ valuacionId, totalCreditos }: Props) {
  const [errCreditos, setErrCreditos] = useState<CreditoDetalle[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true); setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(true); return; }
      const res = await fetch(`/api/calculadora/cartera/${valuacionId}/creditos`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      const all = (json.creditos ?? []) as CreditoDetalle[];
      setAllCount(all.length);
      setErrCreditos(all.filter(c => c.calc_error !== null));
    } catch { setError(true); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [valuacionId]);

  if (loading) return (
    <div style={{ padding: 32 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {[1, 2, 3].map(i => <div key={i} style={{ height: 44, borderRadius: 6, marginBottom: 4, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />)}
    </div>
  );

  if (error) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>No pudimos cargar los errores. Refresca la página.</div>
      <button onClick={load} style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Reintentar</button>
    </div>
  );

  // No errors — success state
  if (errCreditos.length === 0) {
    const count = totalCreditos ?? allCount;
    return (
      <div style={{ padding: "64px 24px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #BBF7D0", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Sin errores de cálculo</div>
        <div style={{ fontSize: 13, color: "#64748B" }}>
          Los {count} créditos de esta valuación se procesaron correctamente.
        </div>
      </div>
    );
  }

  // Has errors
  const saldoNoCalc = errCreditos.reduce((s, c) => s + (c.saldo_insoluto_mxn ?? 0), 0);
  const totalSaldo = allCount > 0 ? errCreditos.reduce((s, c) => s + (c.saldo_insoluto_mxn ?? 0), 0) : 0;

  return (
    <div>
      {/* Warning header */}
      <div style={{ padding: "14px 24px", background: "#FFF7ED", borderBottom: "1px solid #FED7AA", fontSize: 13, color: "#9A3412" }}>
        ⚠️ {errCreditos.length} crédito{errCreditos.length !== 1 ? "s" : ""} no pudieron calcularse. Estos créditos fueron excluidos del análisis. Corrige los errores en el Excel y vuelve a subir.
      </div>

      {/* Error table */}
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px", padding: "8px 16px", borderBottom: "1px solid #E2E8F0" }}>
          {["FOLIO", "DEUDOR", "ERROR", "SALDO"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", fontFamily: MONO, textAlign: h === "SALDO" ? "right" : "left" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {errCreditos.map((c, i) => (
          <div key={c.id} style={{
            display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px", padding: "12px 16px",
            borderBottom: i < errCreditos.length - 1 ? "1px solid #F1F5F9" : "none",
            alignItems: "center", transition: "background .08s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A" }}>{c.folio_credito}</div>
            <div style={{ fontSize: 13, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{c.deudor}</div>
            <div title={c.calc_error ?? ""} style={{ fontSize: 12, color: "#DC2626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{c.calc_error}</div>
            <div style={{ fontSize: 13, fontFamily: MONO, color: "#64748B", textAlign: "right" }}>{fmtMoney(c.saldo_insoluto_mxn)}</div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#F8FAFC", borderRadius: 8, fontSize: 12, color: "#64748B" }}>
          Saldo no calculado: <strong style={{ fontFamily: MONO, color: "#DC2626" }}>{fmtMoney(saldoNoCalc)}</strong>
        </div>
      </div>
    </div>
  );
}
