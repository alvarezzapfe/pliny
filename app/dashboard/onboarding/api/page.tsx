"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const MONO = "'Geist Mono', monospace";
const CARD: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 16 };
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 };
const CODE_BLOCK: React.CSSProperties = {
  background: "#0F172A", color: "#E2E8F0", borderRadius: 8, padding: "14px 16px",
  fontSize: 12, fontFamily: MONO, lineHeight: 1.7, overflowX: "auto" as const, whiteSpace: "pre" as const,
  position: "relative" as const, marginBottom: 16,
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ position: "absolute", top: 8, right: 8, padding: "4px 10px", borderRadius: 4, border: "1px solid #334155", background: "#1E293B", color: "#94A3B8", fontSize: 10, fontFamily: MONO, cursor: "pointer" }}>
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function ApiSettingsPage() {
  const [last4, setLast4] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Regenerate flow
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function fetchLender() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const res = await fetch("/api/onb-lenders/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    if (!res.ok) { setLoading(false); return; }
    const { lender } = await res.json();
    setLast4(lender.api_key_last4 ?? null);
    setLoading(false);
  }

  useEffect(() => { fetchLender(); }, []);

  async function handleRegenerate() {
    setRegenerating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setRegenerating(false); return; }
    const res = await fetch("/api/onb-lenders/me/regenerate-key", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setNewKey(data.apiKey);
      setLast4(data.last4);
      setShowConfirm(false);
      setConfirmText("");
    }
    setRegenerating(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <div style={{ height: 120, borderRadius: 12, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 8 }}>API Settings</h1>
        <div style={{ ...CARD, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#64748B" }}>No tienes un portal configurado</div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>Contacta a soporte para activar tu portal de onboarding.</div>
        </div>
      </div>
    );
  }

  const maskedKey = last4 ? `pk_live_${"•".repeat(28)}${last4}` : "API key configurada (oculta)";

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>API Settings</h1>
      <p style={{ fontSize: 12, color: "#64748B", marginBottom: 24 }}>Administra tu API key y consulta la documentación de endpoints.</p>

      {/* ── API KEY ── */}
      <div style={CARD}>
        <div style={LABEL}>Tu API Key</div>

        {newKey ? (
          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", marginBottom: 8 }}>
              Nueva API key generada — cópiala ahora, no podrás verla de nuevo.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code style={{ flex: 1, fontSize: 13, fontFamily: MONO, color: "#065F46", wordBreak: "break-all" as const }}>{newKey}</code>
              <button onClick={() => navigator.clipboard.writeText(newKey)} style={{
                padding: "6px 14px", borderRadius: 6, border: "1px solid #10B981", background: "#FFFFFF",
                color: "#065F46", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
              }}>Copiar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
            <code style={{ flex: 1, fontSize: 13, fontFamily: MONO, color: "#475569" }}>{maskedKey}</code>
          </div>
        )}

        <button onClick={() => { setShowConfirm(true); setNewKey(null); }} style={{
          padding: "8px 16px", borderRadius: 8, border: "1px solid #FECACA", background: "#FFFFFF",
          color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Regenerar API key</button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "grid", placeItems: "center" }}
          onClick={() => { setShowConfirm(false); setConfirmText(""); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 12, padding: 28, maxWidth: 440, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>¿Regenerar API key?</div>
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 16 }}>
              Esto <strong style={{ color: "#DC2626" }}>invalidará tu key actual</strong>. Cualquier integración que la use dejará de funcionar hasta que la actualices con la key nueva.
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>Escribe <strong style={{ color: "#0F172A" }}>REGENERAR</strong> para confirmar:</div>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                placeholder="REGENERAR" autoFocus
                style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 14, fontFamily: MONO, color: "#0F172A", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowConfirm(false); setConfirmText(""); }} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Cancelar</button>
              <button onClick={handleRegenerate} disabled={confirmText !== "REGENERAR" || regenerating} style={{
                padding: "9px 18px", borderRadius: 8, border: "none", background: confirmText === "REGENERAR" ? "#DC2626" : "#E2E8F0",
                color: confirmText === "REGENERAR" ? "#FFFFFF" : "#94A3B8", fontSize: 13, fontWeight: 600,
                cursor: confirmText === "REGENERAR" && !regenerating ? "pointer" : "not-allowed",
              }}>{regenerating ? "Regenerando..." : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENTACIÓN ── */}
      <div style={CARD}>
        <div style={LABEL}>Documentación del API</div>
        <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20, lineHeight: 1.6 }}>
          Usa estos endpoints para integrar el onboarding de Plinius en tu sistema. Todos requieren el header <code style={{ fontFamily: MONO, fontSize: 12, background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>x-api-key</code>.
        </p>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Base URL</div>
        <div style={{ ...CODE_BLOCK, marginBottom: 24 }}>
          <CopyBtn text="https://plinius.mx" />
          https://plinius.mx
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Autenticación</div>
        <div style={{ ...CODE_BLOCK, marginBottom: 24 }}>
          <CopyBtn text='x-api-key: pk_live_...' />
          {`Header: x-api-key: pk_live_...`}
        </div>

        {/* Endpoint 1 */}
        <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ padding: "2px 8px", borderRadius: 4, background: "#DCFCE7", color: "#166534", fontSize: 10, fontWeight: 700, fontFamily: MONO }}>POST</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>/api/onb-applicants</span>
          </div>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Crear un nuevo applicant (solicitud de crédito).</p>
          <div style={CODE_BLOCK}>
            <CopyBtn text={`curl -X POST https://plinius.mx/api/onb-applicants \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pk_live_TU_KEY" \\
  -d '{
    "full_name": "Juan Pérez",
    "email": "juan@empresa.com",
    "phone": "+5215512345678",
    "data": {
      "razon_social": "Empresa SA de CV",
      "rfc_empresa": "EMP123456ABC",
      "monto_solicitado_mxn": 1500000,
      "plazo_meses": 36
    }
  }'`} />
{`curl -X POST https://plinius.mx/api/onb-applicants \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pk_live_TU_KEY" \\
  -d '{
    "full_name": "Juan Pérez",
    "email": "juan@empresa.com",
    "phone": "+5215512345678",
    "data": {
      "razon_social": "Empresa SA de CV",
      "rfc_empresa": "EMP123456ABC",
      "monto_solicitado_mxn": 1500000,
      "plazo_meses": 36
    }
  }'`}
          </div>
        </div>

        {/* Endpoint 2 */}
        <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ padding: "2px 8px", borderRadius: 4, background: "#DBEAFE", color: "#1E40AF", fontSize: 10, fontWeight: 700, fontFamily: MONO }}>GET</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>/api/onb-applicants/&#123;id&#125;</span>
          </div>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Consultar un applicant por ID.</p>
          <div style={CODE_BLOCK}>
            <CopyBtn text={`curl https://plinius.mx/api/onb-applicants/UUID_DEL_APPLICANT \\
  -H "x-api-key: pk_live_TU_KEY"`} />
{`curl https://plinius.mx/api/onb-applicants/UUID_DEL_APPLICANT \\
  -H "x-api-key: pk_live_TU_KEY"`}
          </div>
        </div>

        {/* Endpoint 3 */}
        <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ padding: "2px 8px", borderRadius: 4, background: "#FEF3C7", color: "#92400E", fontSize: 10, fontWeight: 700, fontFamily: MONO }}>PATCH</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>/api/onb-applicants/&#123;id&#125;/status</span>
          </div>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Cambiar el status de un applicant.</p>
          <div style={CODE_BLOCK}>
            <CopyBtn text={`curl -X PATCH https://plinius.mx/api/onb-applicants/UUID/status \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pk_live_TU_KEY" \\
  -d '{ "status": "approved", "reason": "Aprobado por comité" }'`} />
{`curl -X PATCH https://plinius.mx/api/onb-applicants/UUID/status \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: pk_live_TU_KEY" \\
  -d '{ "status": "approved", "reason": "Aprobado por comité" }'`}
          </div>
        </div>

        {/* Webhooks */}
        <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Webhooks</div>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12, lineHeight: 1.6 }}>
            Si configuras un <code style={{ fontFamily: MONO, fontSize: 11, background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>webhook_url</code> en tu portal, Plinius enviará un POST cuando un applicant complete su solicitud.
          </p>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Evento: <code style={{ fontFamily: MONO }}>applicant.completed</code></div>
          <div style={CODE_BLOCK}>
            <CopyBtn text={`{
  "event": "applicant.completed",
  "applicant_id": "uuid",
  "lender_id": "uuid",
  "email": "juan@empresa.com",
  "full_name": "Juan Pérez",
  "timestamp": "2026-05-26T12:00:00.000Z"
}`} />
{`{
  "event": "applicant.completed",
  "applicant_id": "uuid",
  "lender_id": "uuid",
  "email": "juan@empresa.com",
  "full_name": "Juan Pérez",
  "timestamp": "2026-05-26T12:00:00.000Z"
}`}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", padding: "8px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6 }}>
            El payload se envía sin firma criptográfica por ahora. Valida por IP de origen o usa un endpoint secreto mientras tanto.
          </div>
        </div>
      </div>
    </div>
  );
}
