"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Workspace } from "@/lib/deals/types";
import CrearWorkspaceModal from "./CrearWorkspaceModal";

export default function DealsIndexPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function fetchWorkspaces() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const res = await fetch("/api/workspaces", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) setWorkspaces(data.workspaces || []);
    } catch (e) {
      console.error("[DealsIndex] fetch", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWorkspaces(); }, []);

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, margin: 0 }}>
            Deal Rooms
          </h1>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
            Workspaces de transacciones con tu equipo y contrapartes
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)",
          color: "#fff", border: "none", borderRadius: 10,
          fontSize: 13, fontWeight: 600, padding: "9px 18px",
          cursor: "pointer", boxShadow: "0 2px 12px rgba(12,30,74,.22)",
          transition: "opacity .15s, transform .15s",
          fontFamily: "'Geist', sans-serif",
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
          Nuevo workspace
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 140, borderRadius: 12,
              background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
            }} />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div style={{
          background: "#FFFFFF", border: "2px dashed #E2E8F0", borderRadius: 12,
          padding: "64px 32px", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(12,30,74,.06), rgba(27,63,138,.10))",
            border: "1px solid rgba(91,141,239,.15)",
            display: "grid", placeItems: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none"
              stroke="#5B8DEF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h12v2H2zM2 7h5v7H2zM9 7h5v7H9z" />
            </svg>
          </div>
          <p style={{ color: "#64748B", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            No tienes workspaces
          </p>
          <p style={{ color: "#94A3B8", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Crea tu primer workspace para organizar deals con tu equipo.
          </p>
          <button onClick={() => setShowModal(true)} style={{
            background: "transparent", border: "1px solid #0C1E4A",
            color: "#0C1E4A", padding: "10px 20px", borderRadius: 8,
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            fontFamily: "'Geist', sans-serif",
          }}>Crear primer workspace</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {workspaces.map(ws => (
            <div key={ws.id}
              onClick={() => router.push(`/dashboard/deals/${ws.slug}`)}
              style={{
                background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12,
                padding: 20, cursor: "pointer", transition: "all 0.15s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#93B4F8";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(91,141,239,.10)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#E2E8F0";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                    stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h12v2H2zM2 7h5v7H2zM9 7h5v7H9z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "-0.01em" }}>
                    {ws.name}
                  </h3>
                  <code style={{
                    color: "#5B8DEF", fontSize: 11,
                    fontFamily: "'Geist Mono', monospace",
                  }}>/{ws.slug}</code>
                </div>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                  stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </div>
              {ws.description && (
                <p style={{
                  color: "#64748B", fontSize: 13, margin: 0, lineHeight: 1.5,
                  overflow: "hidden", textOverflow: "ellipsis",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                }}>{ws.description}</p>
              )}
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono', monospace",
              }}>
                Creado {new Date(ws.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CrearWorkspaceModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchWorkspaces(); }}
        />
      )}
    </div>
  );
}
