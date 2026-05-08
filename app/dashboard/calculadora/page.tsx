// Valuador de Cartera — step 4.3: auto-trigger /calcular + polling
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import UploadDropzone from "@/components/cartera/UploadDropzone";

type ValidationError = { row: number; field: string; message: string };
type PageStatus = "idle" | "processing" | "completed" | "completed_with_errors" | "error";
type ValuacionData = {
  id: string;
  n_creditos: number;
  n_creditos_calculados?: number;
  npv_total_mxn?: number;
  saldo_total_mxn?: number;
  el_total_mxn?: number;
  status?: string;
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CalculadoraPage() {
  const [discountRate, setDiscountRate] = useState(12);
  const [pageStatus, setPageStatus] = useState<PageStatus>("idle");
  const [valuacion, setValuacion] = useState<ValuacionData | null>(null);
  const [errors, setErrors] = useState<{ list: ValidationError[]; validCount: number; errorCount: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Start polling when status is "processing"
  useEffect(() => {
    if (pageStatus !== "processing" || !valuacion) return;

    pollCount.current = 0;

    async function poll() {
      pollCount.current++;
      if (pollCount.current > 60) {
        // 2 minutes timeout
        if (pollRef.current) clearInterval(pollRef.current);
        setPageStatus("error");
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch("/api/calculadora/cartera/list?limit=5", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;

        const json = await res.json();
        const found = (json.valuaciones ?? []).find((v: { id: string }) => v.id === valuacion?.id);

        if (found && found.status !== "processing") {
          if (pollRef.current) clearInterval(pollRef.current);
          setValuacion(prev => prev ? {
            ...prev,
            n_creditos_calculados: found.n_creditos_calculados,
            npv_total_mxn: found.npv_total_mxn,
            saldo_total_mxn: found.saldo_total_mxn,
            el_total_mxn: found.el_total_mxn,
            status: found.status,
          } : prev);
          setPageStatus(found.status as PageStatus);
        }
      } catch {
        // Silently retry on network errors
      }
    }

    pollRef.current = setInterval(poll, 2000);
    // Also poll immediately
    poll();

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pageStatus, valuacion]);

  const handleSuccess = useCallback(async (v: { id: string; n_creditos: number }) => {
    setValuacion(v);
    setErrors(null);
    setPageStatus("processing");

    // Fire-and-forget: trigger calculation
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      fetch(`/api/calculadora/cartera/${v.id}/calcular`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch {
      // Polling will detect the result regardless
    }
  }, []);

  const handleValidationErrors = useCallback((list: ValidationError[], validCount: number, errorCount: number) => {
    setErrors({ list, validCount, errorCount });
  }, []);

  function resetAll() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPageStatus("idle");
    setValuacion(null);
    setErrors(null);
  }

  async function downloadPlantilla() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/calculadora/cartera/plantilla", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_cartera_plinius.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const rateDecimal = Math.max(0, Math.min(100, discountRate)) / 100;
  const isTerminal = pageStatus === "completed" || pageStatus === "completed_with_errors" || pageStatus === "error";

  return (
    <div style={{ padding: "32px 40px", fontFamily: "'Geist', system-ui, sans-serif", maxWidth: 720, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header — always visible */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", marginBottom: 4 }}>
            Valuación de Cartera
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
            Sube tu cartera de crédito en Excel para calcular NPV, Duration, WAL, Stress Testing y Concentración.
          </p>
        </div>
        {pageStatus === "idle" && (
          <button onClick={downloadPlantilla} style={{
            height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0",
            background: "#FFFFFF", color: "#0F172A", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Geist', sans-serif", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar plantilla
          </button>
        )}
      </div>

      {/* ── STATE: idle (upload) ── */}
      {pageStatus === "idle" && (
        <>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Tasa de descuento anual</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} min={0} max={100} step={0.5}
                style={{ width: 100, height: 38, borderRadius: 8, border: "1px solid #E2E8F0", padding: "0 12px", fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: "#0F172A", outline: "none", textAlign: "right" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>Default 12%. Rango: 0% – 100%.</div>
          </div>
          <UploadDropzone discountRate={rateDecimal} onSuccess={handleSuccess} onValidationErrors={handleValidationErrors} />
        </>
      )}

      {/* ── STATE: processing ── */}
      {pageStatus === "processing" && valuacion && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "48px 28px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid #E2E8F0", borderTopColor: "#0C1E4A", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Calculando métricas...</div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
            Valuación ID: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{valuacion.id.slice(0, 8)}...{valuacion.id.slice(-4)}</span>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 20 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{valuacion.n_creditos}</span> créditos
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 24 }}>Esto puede tomar 10–60 segundos dependiendo del tamaño.</div>
          <button onClick={resetAll} style={{
            height: 36, padding: "0 20px", borderRadius: 8, border: "1px solid #E2E8F0",
            background: "#FFFFFF", color: "#64748B", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Geist', sans-serif",
          }}>
            Cancelar
          </button>
        </div>
      )}

      {/* ── STATE: completed / completed_with_errors ── */}
      {(pageStatus === "completed" || pageStatus === "completed_with_errors") && valuacion && (
        <div>
          {pageStatus === "completed_with_errors" && (
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#9A3412", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              {(valuacion.n_creditos ?? 0) - (valuacion.n_creditos_calculados ?? 0)} crédito(s) no pudieron calcularse. Revisa el detalle más adelante.
            </div>
          )}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "32px 28px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #BBF7D0", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Valuación completada</div>

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "NPV TOTAL", value: fmtMoney(valuacion.npv_total_mxn) },
                { label: "SALDO TOTAL", value: fmtMoney(valuacion.saldo_total_mxn) },
                { label: "EL TOTAL", value: fmtMoney(valuacion.el_total_mxn) },
              ].map(k => (
                <div key={k.label} style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{k.value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
              Valuación ID: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{valuacion.id.slice(0, 8)}...{valuacion.id.slice(-4)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 20 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{valuacion.n_creditos_calculados ?? valuacion.n_creditos}</span> / {valuacion.n_creditos} créditos calculados
            </div>

            <button onClick={resetAll} style={{
              height: 40, padding: "0 20px", borderRadius: 8, border: "1px solid #E2E8F0",
              background: "#FFFFFF", color: "#0F172A", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Geist', sans-serif",
            }}>
              Subir otra cartera
            </button>
          </div>
        </div>
      )}

      {/* ── STATE: error ── */}
      {pageStatus === "error" && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "32px 28px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FEF2F2", border: "2px solid #FECACA", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#991B1B", marginBottom: 8 }}>Error al calcular</div>
          <div style={{ fontSize: 13, color: "#991B1B", marginBottom: 20 }}>El cálculo no se completó. Por favor intenta de nuevo.</div>
          <button onClick={resetAll} style={{
            height: 40, padding: "0 20px", borderRadius: 8, border: "1px solid #E2E8F0",
            background: "#FFFFFF", color: "#0F172A", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Geist', sans-serif",
          }}>
            Subir otra cartera
          </button>
        </div>
      )}

      {/* ── Validation errors modal ── */}
      {errors && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "grid", placeItems: "center", padding: 20 }} onClick={() => setErrors(null)}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 80px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#DC2626" }}>Errores de validación</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{errors.errorCount} error{errors.errorCount !== 1 ? "es" : ""} en {errors.errorCount} fila{errors.errorCount !== 1 ? "s" : ""}. Corrige y vuelve a subir.</div>
              </div>
              <button onClick={() => setErrors(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 18 }}>&times;</button>
            </div>
            <div style={{ overflowY: "auto", padding: "0 24px 24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                    {["Fila", "Campo", "Error"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {errors.list.map((err, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F8FAFC" }}>
                      <td style={{ padding: "8px 10px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "#DC2626", fontWeight: 600 }}>{err.row}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>{err.field}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: "#64748B" }}>{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
