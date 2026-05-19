"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const LABEL: React.CSSProperties = {
  display: "block", color: "#8B9DC3", fontSize: 12, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6,
};

const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, color: "#fff", fontSize: 14,
  outline: "none", boxSizing: "border-box" as const,
  fontFamily: "'Geist', sans-serif",
};

export default function CrearWorkspaceModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) setSlug(slugify(value));
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("No autenticado"); setSaving(false); return; }

      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, slug, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear workspace");
        setSaving(false);
        return;
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
      setSaving(false);
    }
  }

  const canSubmit = name.length >= 2 && slug.length >= 3 && !saving;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#142339", borderRadius: 12, padding: 32,
        width: 480, maxWidth: "90vw", border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <h2 style={{ color: "#fff", fontSize: 22, margin: "0 0 24px 0", fontWeight: 700 }}>
          Nuevo workspace
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Nombre</label>
          <input value={name} onChange={e => handleNameChange(e.target.value)}
            placeholder="ej. Bancomer M&A Group" style={INPUT} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Slug (URL)</label>
          <input value={slug}
            onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
            placeholder="bancomer-ma-group"
            style={{ ...INPUT, color: "#00E5A0", fontFamily: "'Geist Mono', monospace" }} />
          <p style={{ color: "#5F7090", fontSize: 11, margin: "4px 0 0 0" }}>
            plinius.mx/dashboard/deals/<strong style={{ color: "#8B9DC3" }}>{slug || "..."}</strong>
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>Descripción (opcional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Para qué se usará este workspace..."
            rows={3}
            style={{ ...INPUT, resize: "vertical" as const, minHeight: 72 }} />
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#FCA5A5", padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} disabled={saving} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
            color: "#8B9DC3", padding: "10px 20px", borderRadius: 6,
            cursor: "pointer", fontSize: 14, fontFamily: "'Geist', sans-serif",
          }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            background: canSubmit ? "linear-gradient(135deg, #2563EB, #1E40AF)" : "rgba(255,255,255,0.05)",
            color: canSubmit ? "#fff" : "#5F7090",
            border: "none", padding: "10px 20px", borderRadius: 6,
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontSize: 14, fontWeight: 600, fontFamily: "'Geist', sans-serif",
          }}>{saving ? "Creando..." : "Crear workspace"}</button>
        </div>
      </div>
    </div>
  );
}
