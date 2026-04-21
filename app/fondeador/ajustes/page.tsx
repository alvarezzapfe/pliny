"use client";

export default function AjustesFondeadorPage() {
  return (
    <div style={{ fontFamily: "'Geist', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Configuración</h1>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28 }}>Preferencias y ajustes de tu cuenta</p>
      <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#F1F5F9", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Disponible próximamente</div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>Aquí podrás ajustar preferencias de notificación y seguridad.</div>
      </div>
    </div>
  );
}
