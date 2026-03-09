export default function Cookies() {
  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "80px 24px 120px", fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
      <div style={{ marginBottom: 48 }}>
        <a href="/" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>← Volver</a>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Política de Cookies</h1>
      <p style={{ color: "#64748B", fontSize: 14, marginBottom: 48 }}>Última actualización: 8 de marzo de 2026</p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0C1E4A" }}>¿Qué son las cookies?</h2>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "#374151" }}>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Nos permiten recordar sus preferencias y mejorar su experiencia de uso.</p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0C1E4A" }}>Cookies que utilizamos</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F1F5F9" }}>
                {["Nombre", "Tipo", "Duración", "Finalidad"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#0C1E4A", borderBottom: "2px solid #E2E8F0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["sb-auth-token", "Esencial", "Sesión", "Autenticación segura de usuario"],
                ["sb-refresh-token", "Esencial", "7 días", "Renovación automática de sesión"],
                ["_plinius_pref", "Funcional", "30 días", "Preferencias de idioma y tema"],
                ["_vercel_analytics", "Analítica", "90 días", "Métricas de rendimiento (anónimas)"],
              ].map(([name, type, dur, purpose], i) => (
                <tr key={name} style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 13, borderBottom: "1px solid #E2E8F0" }}>{name}</td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0" }}>
                    <span style={{ background: type === "Esencial" ? "#DBEAFE" : type === "Funcional" ? "#D1FAE5" : "#FEF3C7", color: type === "Esencial" ? "#1D4ED8" : type === "Funcional" ? "#065F46" : "#92400E", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{type}</span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#64748B", borderBottom: "1px solid #E2E8F0" }}>{dur}</td>
                  <td style={{ padding: "10px 14px", color: "#374151", borderBottom: "1px solid #E2E8F0" }}>{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0C1E4A" }}>Cookies esenciales</h2>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "#374151" }}>Las cookies esenciales son necesarias para el funcionamiento básico de la plataforma. Sin ellas, no es posible iniciar sesión ni navegar de forma segura. Estas cookies no pueden ser desactivadas.</p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0C1E4A" }}>Cookies analíticas</h2>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "#374151" }}>Utilizamos Vercel Analytics para recopilar datos anónimos sobre el uso de la plataforma (páginas visitadas, tiempo de carga, errores). Esta información nos ayuda a mejorar el servicio. No vinculamos estos datos con su identidad.</p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0C1E4A" }}>Gestión de cookies</h2>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "#374151" }}>Puede configurar su navegador para bloquear o eliminar cookies. Tenga en cuenta que bloquear cookies esenciales afectará el funcionamiento de la plataforma. Consulte la documentación de su navegador:</p>
        <ul style={{ marginTop: 12, paddingLeft: 20 }}>
          {[
            ["Chrome", "https://support.google.com/chrome/answer/95647"],
            ["Safari", "https://support.apple.com/es-mx/guide/safari/sfri11471/mac"],
            ["Firefox", "https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-"],
          ].map(([browser, url]) => (
            <li key={browser} style={{ marginBottom: 6 }}>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#1B3F8A", fontSize: 15 }}>{browser}</a>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0C1E4A" }}>Contacto</h2>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "#374151" }}>Para dudas sobre el uso de cookies en Plinius, escríbenos a <a href="mailto:privacidad@plinius.mx" style={{ color: "#1B3F8A" }}>privacidad@plinius.mx</a>.</p>
      </section>
    </main>
  );
}
