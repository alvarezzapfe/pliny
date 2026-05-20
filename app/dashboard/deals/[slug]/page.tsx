"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Workspace, Deal } from "@/lib/deals/types";
import PipelineView from "./PipelineView";
import NuevoDealModal from "./NuevoDealModal";

export default function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  async function load() {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Fetch workspaces and find by slug (RLS filters to mine)
      const wsRes = await fetch("/api/workspaces", { headers });
      if (!wsRes.ok) { setError("Error al cargar workspaces"); return; }
      const wsData = await wsRes.json();
      const ws = (wsData.workspaces as Workspace[]).find(w => w.slug === slug);
      if (!ws) { setError("Workspace no encontrado"); return; }
      setWorkspace(ws);

      // Fetch deals for this workspace
      const dealsRes = await fetch(`/api/workspaces/${ws.id}/deals`, { headers });
      if (!dealsRes.ok) { setError("Error al cargar deals"); return; }
      const dealsData = await dealsRes.json();
      setDeals(dealsData.deals ?? []);
    } catch (e) {
      console.error("[WorkspacePage] load", e);
      setError("Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (slug) load(); }, [slug]);

  async function handleStageChange(dealId: string, newStage: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ stage: newStage }),
      });

      if (res.ok) {
        // Optimistic: update local state
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage as Deal["stage"] } : d));
      }
    } catch (e) {
      console.error("[WorkspacePage] stage change", e);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <div style={{ height: 40, width: 300, marginBottom: 24, borderRadius: 8, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ display: "flex", gap: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ width: 260, height: 400, borderRadius: 12, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div style={{ padding: 64, textAlign: "center" }}>
        <div style={{ fontSize: 16, color: "#0F172A", marginBottom: 16, fontWeight: 600 }}>
          {error || "Workspace no encontrado"}
        </div>
        <Link href="/dashboard/deals" style={{
          display: "inline-block", padding: "10px 20px",
          background: "#0C1E4A", color: "#FFF", borderRadius: 8,
          fontSize: 13, fontWeight: 600, textDecoration: "none",
        }}>Volver a Deal Rooms</Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Link href="/dashboard/deals" style={{ fontSize: 12, color: "#64748B", textDecoration: "none" }}>← Deal Rooms</Link>
            <span style={{ color: "#CBD5E1", fontSize: 12 }}>/</span>
            <span style={{ fontSize: 12, color: "#0F172A", fontWeight: 600 }}>{workspace.name}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, margin: 0 }}>
            {workspace.name}
          </h1>
          {workspace.description && (
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>{workspace.description}</p>
          )}
        </div>
        <button onClick={() => setShowNewDeal(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)",
          color: "#fff", border: "none", borderRadius: 10,
          fontSize: 13, fontWeight: 600, padding: "9px 18px",
          cursor: "pointer", boxShadow: "0 2px 12px rgba(12,30,74,.22)",
          fontFamily: "'Geist', sans-serif",
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
          Nuevo deal
        </button>
      </div>

      {/* Pipeline */}
      <PipelineView deals={deals} slug={slug ?? ""} onStageChange={handleStageChange} />

      {/* New Deal Modal */}
      {showNewDeal && workspace && (
        <NuevoDealModal
          workspaceId={workspace.id}
          onClose={() => setShowNewDeal(false)}
          onSuccess={() => { setShowNewDeal(false); load(); }}
        />
      )}
    </div>
  );
}
