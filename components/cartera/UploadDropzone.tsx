// components/cartera/UploadDropzone.tsx — Drag & drop upload for cartera Excel
"use client";

import React, { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type ValidationError = { row: number; field: string; message: string };
type UploadState = "idle" | "uploading" | "error";

type Props = {
  discountRate: number;
  onSuccess: (valuacion: { id: string; n_creditos: number }) => void;
  onValidationErrors: (errors: ValidationError[], validCount: number, errorCount: number) => void;
};

export default function UploadDropzone({ discountRate, onSuccess, onValidationErrors }: Props) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Client-side validation
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx") {
      setErrorMsg("Solo se aceptan archivos .xlsx");
      setState("error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("El archivo excede 8 MB");
      setState("error");
      return;
    }

    setState("uploading");
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg("Sesión expirada. Recarga la página.");
        setState("error");
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("discount_rate", String(discountRate));

      const res = await fetch("/api/calculadora/cartera/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });

      const json = await res.json();

      if (res.status === 422 && json.errors) {
        setState("idle");
        onValidationErrors(json.errors, json.valid_count ?? 0, json.error_count ?? 0);
        return;
      }

      if (!res.ok) {
        setErrorMsg(json.error ?? json.message ?? "Error subiendo archivo");
        setState("error");
        return;
      }

      setState("idle");
      onSuccess({ id: json.valuacion_id, n_creditos: json.n_creditos });
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.");
      setState("error");
    }
  }, [discountRate, onSuccess, onValidationErrors]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  const isUploading = state === "uploading";

  return (
    <div>
      {/* Error banner */}
      {state === "error" && errorMsg && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
          padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#DC2626",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>{errorMsg}</span>
          <button
            onClick={() => { setState("idle"); setErrorMsg(null); }}
            style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#0C1E4A" : "#E2E8F0"}`,
          borderRadius: 12,
          background: dragOver ? "#F1F5F9" : "#FFFFFF",
          padding: "48px 24px",
          textAlign: "center",
          cursor: isUploading ? "not-allowed" : "pointer",
          transition: "all .15s",
          opacity: isUploading ? 0.6 : 1,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          onChange={onFileChange}
          style={{ display: "none" }}
          disabled={isUploading}
        />

        {isUploading ? (
          <div>
            <div style={{
              width: 36, height: 36, border: "3px solid #E2E8F0",
              borderTopColor: "#0C1E4A", borderRadius: "50%",
              animation: "spin .7s linear infinite",
              margin: "0 auto 16px",
            }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Subiendo cartera...</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>Validando estructura y datos</div>
          </div>
        ) : (
          <div>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
              Arrastra tu Excel aquí o haz click
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>
              Solo .xlsx, máximo 8 MB
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
