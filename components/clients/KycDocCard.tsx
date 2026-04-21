"use client";

import React from "react";

type DocStatus = "pendiente" | "subido" | "verificado";

type Props = {
  label: string;
  doc: { url?: string; filename?: string; uploaded_at?: string } | null;
  onUpload?: () => void;
};

function status(doc: Props["doc"]): DocStatus {
  if (!doc || !doc.url) return "pendiente";
  return "subido";
}

const STATUS_STYLE: Record<DocStatus, { bg: string; color: string; border: string; label: string }> = {
  pendiente:  { bg: "#FFF7ED", color: "#92400E", border: "#FDE68A", label: "Pendiente" },
  subido:     { bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0", label: "Subido" },
  verificado: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", label: "Verificado" },
};

export default function KycDocCard({ label, doc, onUpload }: Props) {
  const s = status(doc);
  const st = STATUS_STYLE[s];

  return (
    <div style={{
      background: "#fff", border: "1px solid #E8EDF5", borderRadius: 12, padding: "16px 18px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "#F1F5F9",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2h5l3 3v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
            <path d="M9 2v3h3" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
          {doc?.filename && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{doc.filename}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono', monospace",
          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
          borderRadius: 999, padding: "3px 9px", letterSpacing: ".04em",
        }}>
          {st.label}
        </span>
        {s === "pendiente" && onUpload && (
          <button onClick={onUpload} style={{
            fontSize: 11, fontWeight: 600, color: "#0C1E4A", background: "#EEF2FF",
            border: "1px solid #C7D2FE", borderRadius: 7, padding: "5px 12px",
            cursor: "pointer", fontFamily: "'Geist', sans-serif",
          }}>
            Subir
          </button>
        )}
        {s !== "pendiente" && doc?.url && (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, fontWeight: 600, color: "#0C1E4A", textDecoration: "none",
          }}>
            Ver
          </a>
        )}
      </div>
    </div>
  );
}
