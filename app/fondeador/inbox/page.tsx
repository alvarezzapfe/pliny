"use client";

export default function InboxFondeadorPage() {
  return (
    <div style={{ fontFamily: "'Geist', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Inbox</h1>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28 }}>Postulaciones y mensajes de otorgantes</p>
      <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#F1F5F9", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Disponible próximamente</div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>Aquí verás las postulaciones de otorgantes que buscan fondeo.</div>
      </div>
    </div>
  );
}
