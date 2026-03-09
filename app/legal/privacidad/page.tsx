export default function Privacidad() {
  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "80px 24px 120px", fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
      <div style={{ marginBottom: 48 }}>
        <a href="/" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>← Volver</a>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Aviso de Privacidad</h1>
      <p style={{ color: "#64748B", fontSize: 14, marginBottom: 48 }}>Última actualización: 8 de marzo de 2026</p>

      {[
        ["1. Responsable del tratamiento", "Infraestructura en Finanzas AI S.A.P.I. de C.V. (\"Plinius\"), con domicilio en Ciudad de México, es responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)."],
        ["2. Datos que recopilamos", "Recopilamos los siguientes datos: (a) Datos de identificación: nombre, correo electrónico, RFC y denominación social. (b) Datos financieros: facturación anual declarada, número de empleados y sector económico. (c) Datos de uso: navegación dentro de la plataforma, solicitudes de crédito enviadas y ofertas recibidas. No recopilamos datos sensibles según la definición del artículo 3, fracción VI de la LFPDPPP."],
        ["3. Finalidades del tratamiento", "Sus datos son utilizados para: (a) Crear y administrar su cuenta en la plataforma. (b) Calcular y mostrar señales de riesgo crediticio. (c) Facilitar la conexión entre solicitantes y otorgantes de crédito. (d) Cumplir con obligaciones legales y regulatorias aplicables. (e) Enviar comunicaciones transaccionales relacionadas con su cuenta."],
        ["4. Transferencia de datos", "Plinius no vende ni renta sus datos personales. Podemos compartirlos con: (a) Proveedores de tecnología que procesan datos en nuestro nombre bajo acuerdos de confidencialidad. (b) Autoridades competentes cuando sea requerido por ley. (c) El Buró de Crédito u otras entidades de verificación, únicamente con su consentimiento expreso."],
        ["5. Derechos ARCO", "Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Para ejercer estos derechos envíe un correo a privacidad@plinius.mx con: (a) Nombre completo y correo registrado. (b) Descripción del derecho que desea ejercer. (c) Copia de identificación oficial. Atenderemos su solicitud en un plazo máximo de 20 días hábiles."],
        ["6. Cookies y tecnologías similares", "Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas para mejorar la experiencia. Puede gestionar sus preferencias de cookies en cualquier momento. Consulte nuestra Política de Cookies para más información."],
        ["7. Seguridad", "Implementamos medidas técnicas y organizativas para proteger sus datos, incluyendo cifrado en tránsito (TLS 1.3), cifrado en reposo y controles de acceso basados en roles. Sin embargo, ningún sistema es completamente invulnerable."],
        ["8. Cambios a este aviso", "Plinius se reserva el derecho de actualizar este aviso de privacidad. Notificaremos cambios materiales mediante correo electrónico o aviso destacado en la plataforma."],
        ["9. Contacto", "Para cualquier consulta relacionada con este aviso, contáctenos en privacidad@plinius.mx."],
      ].map(([title, body]) => (
        <section key={title} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0C1E4A" }}>{title}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#374151" }}>{body}</p>
        </section>
      ))}
    </main>
  );
}
