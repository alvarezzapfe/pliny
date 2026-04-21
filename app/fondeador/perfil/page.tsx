"use client";

export default function PerfilFondeadorPage() {
  return (
    <div style={{ fontFamily: "'Geist', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Mi Perfil</h1>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28 }}>Información de tu institución fondeadora</p>
      <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#F1F5F9", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Disponible próximamente</div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>Aquí podrás gestionar la información de tu institución.</div>
      </div>
    </div>
  );
}
