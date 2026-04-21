"use client";

import React, { useState } from "react";

type Props = {
  label: string;
  value: string | number | null | undefined;
  field: string;
  type?: "text" | "number" | "email" | "tel" | "textarea";
  mono?: boolean;
  onSave: (field: string, value: string) => Promise<void>;
};

export default function InlineField({ label, value, field, type = "text", mono, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(field, draft);
    setSaving(false);
    setEditing(false);
  }

  const display = value != null && String(value).trim() !== "" ? String(value) : "—";

  if (!editing) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
        <div
          onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
          style={{
            fontSize: 13, color: value ? "#0F172A" : "#CBD5E1", cursor: "pointer",
            padding: "6px 10px", borderRadius: 8, border: "1px solid transparent",
            transition: "border-color .15s", fontFamily: mono ? "'Geist Mono', monospace" : "inherit",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
        >
          {display}
        </div>
      </div>
    );
  }

  const shared = {
    fontSize: 13, fontFamily: mono ? "'Geist Mono', monospace" : "'Geist', sans-serif",
    color: "#0F172A", border: "1.5px solid #3B82F6", borderRadius: 8,
    padding: "6px 10px", outline: "none", width: "100%" as const, boxSizing: "border-box" as const,
    background: "#fff",
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
      {type === "textarea" ? (
        <textarea style={{ ...shared, minHeight: 64, resize: "vertical" }} value={draft} onChange={e => setDraft(e.target.value)} autoFocus />
      ) : (
        <input type={type} style={shared} value={draft} onChange={e => setDraft(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && save()} />
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={save} disabled={saving} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#0C1E4A", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>
          {saving ? "..." : "Guardar"}
        </button>
        <button onClick={() => setEditing(false)} style={{ fontSize: 11, fontWeight: 600, color: "#64748B", background: "none", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
