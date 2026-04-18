import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  PageBreak,
  HeadingLevel,
  ShadingType,
  convertInchesToTwip,
  LevelFormat,
  TabStopPosition,
  TabStopType,
} from "docx";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type ContratoData = {
  razon_social: string;
  rfc_cliente: string;
  domicilio_cliente: string;
  nombre_representante: string;
  cargo_representante: string;
  plan: "Basic" | "Pro" | "Enterprise";
  precio_mxn: number;
  fecha_inicio: string; // ISO date
  plazo_meses: number;
  banco: string;
  clabe: string;
  referencia: string;
};

// ─── Constantes Plinius ─────────────────────────────────────────────────────

const PLINIUS_RFC = process.env.PLINIUS_RFC ?? "IFA250101XXX";
const PLINIUS_DOMICILIO =
  process.env.PLINIUS_DOMICILIO ??
  "Av. Paseo de la Reforma 296, Piso 38, Col. Juárez, Alcaldía Cuauhtémoc, C.P. 06600, Ciudad de México";

// ─── Colores y estilos ─────────────────────────────────────────────────────

const HEADING_COLOR = "1E3A5F";
const GRAY = "6B7280";
const TABLE_BORDER_COLOR = "9CA3AF";
const TABLE_HEADER_SHADING = "E5E7EB";

const FONT = "Arial";
const BODY_SIZE = 22; // 11pt
const LINE_SPACING = 300;

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: TABLE_BORDER_COLOR,
};
const ALL_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function p(
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    color?: string;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
    allCaps?: boolean;
    spacing?: { after?: number; before?: number };
    indent?: { left?: number };
  },
): Paragraph {
  return new Paragraph({
    heading: opts?.heading,
    alignment: opts?.alignment ?? AlignmentType.JUSTIFIED,
    spacing: {
      line: LINE_SPACING,
      after: opts?.spacing?.after ?? 120,
      before: opts?.spacing?.before ?? 0,
    },
    indent: opts?.indent,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts?.size ?? BODY_SIZE,
        bold: opts?.bold ?? false,
        color: opts?.color ?? "000000",
        allCaps: opts?.allCaps ?? false,
      }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_SPACING, after: 60 },
    indent: { left: 720 },
    children: [
      new TextRun({ text: "•  ", font: FONT, size: BODY_SIZE }),
      new TextRun({ text, font: FONT, size: BODY_SIZE }),
    ],
  });
}

function subItem(label: string, text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_SPACING, after: 80 },
    indent: { left: 720 },
    children: [
      new TextRun({ text: `${label} `, font: FONT, size: BODY_SIZE, bold: true }),
      new TextRun({ text, font: FONT, size: BODY_SIZE }),
    ],
  });
}

function clauseHeading(title: string): Paragraph {
  return p(title, {
    bold: true,
    size: 24,
    color: HEADING_COLOR,
    alignment: AlignmentType.LEFT,
    spacing: { before: 300, after: 120 },
  });
}

function tableRow2Col(
  left: string,
  right: string,
  header?: boolean,
): TableRow {
  const shading = header
    ? { type: ShadingType.SOLID, color: TABLE_HEADER_SHADING, fill: TABLE_HEADER_SHADING }
    : undefined;
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 4000, type: WidthType.DXA },
        borders: ALL_BORDERS,
        shading,
        children: [
          new Paragraph({
            spacing: { line: 276, after: 0 },
            children: [
              new TextRun({
                text: left,
                font: FONT,
                size: 20,
                bold: header ?? false,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 5500, type: WidthType.DXA },
        borders: ALL_BORDERS,
        shading,
        children: [
          new Paragraph({
            spacing: { line: 276, after: 0 },
            children: [
              new TextRun({
                text: right,
                font: FONT,
                size: 20,
                bold: header ?? false,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 0 }, children: [] });
}

// ─── Formateo de fechas ─────────────────────────────────────────────────────

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatFechaLarga(iso: string): { dia: string; mes: string; anio: string } {
  const d = new Date(iso + "T12:00:00");
  return {
    dia: String(d.getDate()),
    mes: MESES[d.getMonth()],
    anio: String(d.getFullYear()),
  };
}

function formatFechaCorta(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function formatPrecio(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Builder principal ──────────────────────────────────────────────────────

export function buildContrato(data: ContratoData): Document {
  const hoy = formatFechaLarga(new Date().toISOString().slice(0, 10));
  const fechaInicioCorta = formatFechaCorta(data.fecha_inicio);

  return new Document({
    numbering: {
      config: [
        {
          reference: "roman-upper",
          levels: [
            {
              level: 0,
              format: LevelFormat.UPPER_ROMAN,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
          paragraph: {
            spacing: { line: LINE_SPACING, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Plinius — Contrato de Prestación de Servicios",
                    font: FONT,
                    size: 16,
                    italics: true,
                    color: GRAY,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Página ", font: FONT, size: 16, color: GRAY }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GRAY }),
                  new TextRun({ text: " de ", font: FONT, size: 16, color: GRAY }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GRAY }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ═══ TÍTULO ═══
          p("CONTRATO DE PRESTACIÓN DE SERVICIOS DE PLATAFORMA TECNOLÓGICA", {
            bold: true,
            size: 32,
            color: HEADING_COLOR,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),

          // ═══ PREÁMBULO ═══
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: LINE_SPACING, after: 200 },
            children: [
              new TextRun({ text: "Contrato de Prestación de Servicios de Plataforma Tecnológica (en adelante, el ", font: FONT, size: BODY_SIZE }),
              new TextRun({ text: '"Contrato"', font: FONT, size: BODY_SIZE, bold: true }),
              new TextRun({ text: ") que celebran, por una parte, ", font: FONT, size: BODY_SIZE }),
              new TextRun({ text: "INFRAESTRUCTURA EN FINANZAS AI, S.A.P.I. DE C.V.", font: FONT, size: BODY_SIZE, bold: true }),
              new TextRun({ text: ", representada en este acto por su Director General, el señor Luis Álvarez Zapfe (en adelante, ", font: FONT, size: BODY_SIZE }),
              new TextRun({ text: '"Plinius"', font: FONT, size: BODY_SIZE, bold: true }),
              new TextRun({ text: "); y por la otra parte, ", font: FONT, size: BODY_SIZE }),
              new TextRun({ text: data.razon_social, font: FONT, size: BODY_SIZE, bold: true }),
              new TextRun({ text: `, representada en este acto por su ${data.cargo_representante}, el/la señor(a) ${data.nombre_representante} (en adelante, el `, font: FONT, size: BODY_SIZE }),
              new TextRun({ text: '"Cliente"', font: FONT, size: BODY_SIZE, bold: true }),
              new TextRun({ text: ', y conjuntamente con Plinius, las ', font: FONT, size: BODY_SIZE }),
              new TextRun({ text: '"Partes"', font: FONT, size: BODY_SIZE, bold: true }),
              new TextRun({ text: "), al tenor de las siguientes Declaraciones y Cláusulas.", font: FONT, size: BODY_SIZE }),
            ],
          }),

          // ═══ DECLARACIONES ═══
          p("DECLARACIONES", {
            bold: true,
            size: 28,
            color: HEADING_COLOR,
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 200 },
          }),

          // ── I. Declara Plinius ──
          p("I. Declara Plinius, por conducto de su representante legal:", {
            bold: true,
            spacing: { before: 200, after: 100 },
          }),
          subItem("a)", `Que es una sociedad anónima promotora de inversión de capital variable, constituida conforme a las leyes de los Estados Unidos Mexicanos, con Registro Federal de Contribuyentes ${PLINIUS_RFC}, con domicilio en ${PLINIUS_DOMICILIO}, Ciudad de México.`),
          subItem("b)", "Que su objeto social le permite celebrar el presente Contrato y que su representante cuenta con las facultades suficientes para obligar a su representada en los términos aquí establecidos, las cuales no le han sido revocadas ni modificadas a la fecha de firma."),
          subItem("c)", 'Que es titular, desarrollador y operador de una plataforma tecnológica denominada "Plinius", que opera como infraestructura de software como servicio (SaaS / Lending-as-a-Service), la cual ofrece funcionalidades de onboarding digital, administración de cartera, gestión de solicitudes de crédito, configuración de flujos, verificación de identidad y reportería, entre otras herramientas tecnológicas (en adelante, la "Plataforma").'),
          subItem("d)", "Que Plinius NO es una entidad financiera, no otorga, intermedia, gestiona, custodia ni recomienda crédito alguno, no realiza operaciones de financiamiento colectivo, ni es responsable por las decisiones crediticias, financieras, regulatorias o comerciales del Cliente. Plinius es exclusivamente un proveedor de tecnología."),
          subItem("e)", "Que es su voluntad celebrar el presente Contrato en los términos y condiciones que más adelante se establecen."),

          // ── II. Declara el Cliente ──
          p("II. Declara el Cliente, por conducto de su representante legal:", {
            bold: true,
            spacing: { before: 200, after: 100 },
          }),
          subItem("a)", `Que es una persona moral legalmente constituida conforme a las leyes de los Estados Unidos Mexicanos, con Registro Federal de Contribuyentes ${data.rfc_cliente}, con domicilio fiscal en ${data.domicilio_cliente}.`),
          subItem("b)", "Que su objeto social le permite celebrar el presente Contrato y que su representante cuenta con las facultades suficientes para obligar a su representada, mismas que no le han sido revocadas ni modificadas a la fecha de firma."),
          subItem("c)", "Que cuenta con las autorizaciones, licencias, registros y permisos regulatorios necesarios para operar su negocio, incluyendo, en su caso, los requeridos ante la Comisión Nacional Bancaria y de Valores (CNBV), la Secretaría de Hacienda y Crédito Público (SHCP), la Condusef y/o cualquier otra autoridad competente."),
          subItem("d)", "Que cumple y se obliga a cumplir con la normatividad aplicable en materia de prevención de lavado de dinero y financiamiento al terrorismo (PLD/FT), protección de datos personales, protección al consumidor de servicios financieros, y demás legislación aplicable a sus operaciones."),
          subItem("e)", "Que tiene conocimiento del alcance, las funcionalidades y las limitaciones de la Plataforma, y manifiesta su voluntad de contratar los servicios objeto del presente Contrato."),
          subItem("f)", "Que declara que los datos y documentos proporcionados a Plinius son verídicos y correctos, y se obliga a mantenerlos actualizados durante la vigencia del Contrato."),

          // ── III. Declaran ambas Partes ──
          p("III. Declaran ambas Partes:", {
            bold: true,
            spacing: { before: 200, after: 100 },
          }),
          p("Que se reconocen mutuamente la personalidad con la que comparecen, que no existe dolo, error, mala fe, violencia ni ningún otro vicio del consentimiento, y que es su libre voluntad obligarse en los términos de las siguientes:"),

          // ═══ CLÁUSULAS ═══
          p("CLÁUSULAS", {
            bold: true,
            size: 28,
            color: HEADING_COLOR,
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 200 },
          }),

          // ── PRIMERA ──
          clauseHeading("PRIMERA. OBJETO."),
          p('Plinius concede al Cliente, durante la vigencia del presente Contrato, el derecho no exclusivo, no transferible y revocable de acceder y utilizar la Plataforma en la modalidad de software como servicio, únicamente para los fines internos de su propia operación crediticia, conforme al nivel de servicio ("Plan") contratado y descrito en el Anexo A del presente Contrato.'),
          p('La Plataforma se proporciona "as is" (tal y como es) y "as available" (según disponibilidad), sin garantía de que cumplirá con fines o resultados específicos del Cliente más allá de las funcionalidades expresamente documentadas.'),

          // ── SEGUNDA ──
          clauseHeading("SEGUNDA. NATURALEZA DEL SERVICIO."),
          p("Las Partes reconocen y aceptan expresamente que Plinius es exclusivamente un proveedor de tecnología. En consecuencia:"),
          bullet("Plinius no otorga crédito, no evalúa solicitudes, no toma decisiones crediticias, ni garantiza resultados operativos, financieros o comerciales al Cliente."),
          bullet("Plinius no es agente, mandatario, comisionista, intermediario financiero, ni representante del Cliente o de sus acreditados, solicitantes o terceros."),
          bullet('La relación con los solicitantes, acreditados y demás terceros del Cliente (en adelante, los "Usuarios Finales") es de la exclusiva responsabilidad del Cliente.'),
          bullet("El Cliente es responsable de la legalidad, idoneidad, documentación y cumplimiento regulatorio de cada una de las operaciones de crédito que instrumente utilizando la Plataforma."),

          // ── TERCERA ──
          clauseHeading("TERCERA. CONTRAPRESTACIÓN."),
          p("El Cliente pagará a Plinius una contraprestación mensual conforme al Plan contratado, según lo establecido en el Anexo A. La contraprestación es pagadera por adelantado, dentro de los primeros cinco (5) días naturales de cada mes, mediante depósito o transferencia electrónica a la cuenta bancaria que Plinius designe por escrito."),
          p("Los precios están expresados en pesos mexicanos y no incluyen el Impuesto al Valor Agregado (IVA), el cual se adicionará y facturará conforme a las disposiciones fiscales aplicables."),
          p("Plinius podrá ajustar los precios con un aviso previo no menor a treinta (30) días naturales. En caso de desacuerdo, el Cliente podrá dar por terminado el Contrato sin penalización, previo pago de la contraprestación correspondiente al periodo efectivamente utilizado."),
          p("El incumplimiento en el pago por un periodo mayor a quince (15) días naturales facultará a Plinius a suspender el acceso a la Plataforma sin responsabilidad, y a dar por terminado el Contrato sin necesidad de declaración judicial previa, conservando el derecho de cobrar las cantidades adeudadas e intereses moratorios a razón del dos por ciento (2%) mensual sobre saldos insolutos."),

          // ── CUARTA ──
          clauseHeading("CUARTA. USO PERMITIDO Y RESTRICCIONES."),
          p("El Cliente se obliga a utilizar la Plataforma de forma lícita, conforme a su finalidad, y se abstendrá expresamente de:"),
          bullet("Reproducir, copiar, modificar, adaptar, traducir, decompilar, aplicar ingeniería inversa, descompilar o intentar derivar el código fuente de la Plataforma o de cualquiera de sus componentes."),
          bullet("Sublicenciar, vender, arrendar, ceder, transmitir o poner a disposición de terceros el acceso a la Plataforma, total o parcialmente."),
          bullet("Utilizar la Plataforma para desarrollar, comercializar o distribuir productos o servicios competidores de Plinius."),
          bullet("Eludir, deshabilitar o interferir con las medidas de seguridad, autenticación, monitoreo o control de uso de la Plataforma."),
          bullet("Utilizar la Plataforma para fines ilícitos, fraudulentos, o que contravengan la legislación aplicable en materia de protección de datos personales, PLD/FT, protección al consumidor o cualquier otra."),
          bullet("Introducir código malicioso, realizar ataques de denegación de servicio, o cualquier conducta que pueda comprometer la integridad, disponibilidad o confidencialidad de la Plataforma."),
          p("El incumplimiento de cualquiera de las obligaciones de esta cláusula se considerará causal de terminación inmediata del Contrato por causas imputables al Cliente, sin perjuicio del derecho de Plinius a reclamar los daños y perjuicios correspondientes."),

          // ── QUINTA ──
          clauseHeading("QUINTA. PROPIEDAD INTELECTUAL."),
          p("Plinius es y seguirá siendo el titular exclusivo de todos los derechos de propiedad intelectual e industrial sobre la Plataforma, incluyendo sin limitación: código fuente, código objeto, algoritmos, modelos de datos, estructura de bases de datos, interfaces de usuario, interfaces de programación de aplicaciones (APIs), documentación técnica, manuales, nombres comerciales, marcas, logotipos, y cualquier mejora, corrección, actualización, adaptación o trabajo derivado, independientemente de quién los haya sugerido, solicitado o inspirado."),
          p("Ninguna disposición del presente Contrato podrá interpretarse como una cesión, transmisión o licencia de derechos de propiedad intelectual a favor del Cliente, salvo por el derecho limitado de uso expresamente concedido en la Cláusula Primera."),
          p('En caso de que el Cliente proporcione a Plinius comentarios, sugerencias, retroalimentación, ideas de mejora o solicitudes de nueva funcionalidad (en adelante, "Retroalimentación"), el Cliente cede a Plinius, en este acto, de manera gratuita, perpetua, irrevocable, exclusiva y a nivel mundial, todos los derechos patrimoniales sobre dicha Retroalimentación, pudiendo Plinius incorporarla libremente a la Plataforma sin obligación alguna de atribución o compensación.'),
          p('Los datos de los Usuarios Finales, solicitantes y acreditados que el Cliente cargue, genere o procese a través de la Plataforma (en adelante, "Datos del Cliente") son y seguirán siendo propiedad del Cliente, conforme a la Cláusula Octava del presente Contrato.'),

          // ── SEXTA ──
          clauseHeading("SEXTA. NIVELES DE SERVICIO (SLA)."),
          p('Plinius procurará mantener la Plataforma disponible durante el noventa y nueve por ciento (99.0%) del tiempo en cómputo mensual, medido sobre el total de minutos del mes calendario (la "Disponibilidad Mensual").'),
          p("Quedan expresamente excluidos del cómputo de la Disponibilidad Mensual los siguientes supuestos:"),
          bullet("Ventanas de mantenimiento programado, avisadas con al menos veinticuatro (24) horas de anticipación."),
          bullet("Ventanas de mantenimiento de emergencia, cuando sean necesarias para proteger la seguridad o integridad de la Plataforma."),
          bullet("Fallas, interrupciones o degradación atribuibles a proveedores de servicios externos (hosting, telecomunicaciones, servicios de terceros integrados)."),
          bullet("Fallas atribuibles al Cliente, sus usuarios, su infraestructura o su conectividad a Internet."),
          bullet("Casos fortuitos o de fuerza mayor, conforme a la Cláusula Décima Sexta."),
          p("En caso de incumplimiento del SLA por causas imputables directamente a Plinius, el único y exclusivo remedio disponible para el Cliente consistirá en un crédito en la siguiente facturación, equivalente al diez por ciento (10%) de la contraprestación mensual del mes afectado, siempre que la solicitud se realice por escrito dentro de los diez (10) días naturales siguientes al fin del mes correspondiente. Dicho crédito no podrá exceder en ningún caso del treinta por ciento (30%) de la contraprestación mensual, y constituye el único remedio disponible para el Cliente por fallas de disponibilidad."),

          // ── SÉPTIMA ──
          clauseHeading("SÉPTIMA. SOPORTE TÉCNICO."),
          p("Plinius proporcionará soporte técnico al Cliente conforme al nivel de servicio asociado al Plan contratado (Anexo A). El soporte técnico se limita a la Plataforma y no incluye: asesoría legal, regulatoria, fiscal, crediticia o comercial; capacitación del personal del Cliente más allá de la documentación estándar; desarrollos a la medida; integraciones con sistemas del Cliente no incluidas en el alcance del Plan."),

          // ── OCTAVA ──
          clauseHeading("OCTAVA. PROTECCIÓN DE DATOS PERSONALES."),
          p("Las Partes reconocen que, para efectos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, el Cliente actúa como Responsable del tratamiento de los datos personales de los Usuarios Finales, y Plinius actúa exclusivamente como Encargado de los mismos, procesando los datos personales únicamente conforme a las instrucciones del Cliente y para los fines del presente Contrato."),
          p("En su carácter de Responsable, el Cliente se obliga a: (i) obtener y mantener vigentes todos los avisos de privacidad y consentimientos necesarios de los Usuarios Finales; (ii) cumplir con todos los derechos ARCO y demás obligaciones de la LFPDPPP; (iii) indemnizar y sacar en paz y a salvo a Plinius de cualquier reclamación, multa, sanción o daño derivado del incumplimiento de sus obligaciones como Responsable."),
          p("Plinius se obliga a: (i) tratar los datos personales únicamente conforme a las instrucciones del Cliente; (ii) implementar medidas de seguridad técnicas, administrativas y físicas razonables para proteger los datos personales; (iii) no transferir los datos personales a terceros, salvo a sus proveedores de infraestructura tecnológica necesarios para la prestación del servicio, quienes estarán sujetos a obligaciones equivalentes de confidencialidad; (iv) al término del Contrato, devolver o destruir los datos personales conforme se indica en la Cláusula Décima Cuarta."),
          p("El Cliente autoriza expresamente a Plinius a utilizar datos agregados, anonimizados y estadísticos (que no permitan identificar a personas ni al Cliente) con fines de mejora del servicio, análisis de producto, benchmarking y comunicación comercial."),

          // ── NOVENA ──
          clauseHeading("NOVENA. CONFIDENCIALIDAD."),
          p('Cada Parte se obliga a mantener estricta confidencialidad respecto de toda información no pública que reciba de la otra Parte, incluyendo sin limitación: información técnica, comercial, financiera, operativa, de clientes, estrategias de negocio, código fuente, configuraciones, precios no públicos, Retroalimentación y Datos del Cliente (en adelante, la "Información Confidencial").'),
          p("La obligación de confidencialidad subsistirá durante la vigencia del Contrato y por un plazo de cinco (5) años posteriores a su terminación, por cualquier causa."),
          p("No se considerará Información Confidencial aquella que: (i) sea del dominio público al momento de ser revelada, o que llegue a serlo sin culpa de la Parte receptora; (ii) ya obrara en poder de la Parte receptora con anterioridad a su revelación, sin obligación de confidencialidad; (iii) deba ser revelada por mandato legal, regulatorio o judicial, en cuyo caso la Parte receptora notificará a la otra Parte con la debida anticipación, en la medida de lo legalmente permitido."),

          // ── DÉCIMA ──
          clauseHeading("DÉCIMA. LIMITACIÓN DE RESPONSABILIDAD."),
          p("EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEGISLACIÓN APLICABLE, LA RESPONSABILIDAD TOTAL Y AGREGADA DE PLINIUS FRENTE AL CLIENTE, POR CUALQUIER CAUSA Y BAJO CUALQUIER TEORÍA DE RESPONSABILIDAD (CONTRACTUAL, EXTRACONTRACTUAL, OBJETIVA O DE CUALQUIER OTRA NATURALEZA), DERIVADA O RELACIONADA CON EL PRESENTE CONTRATO, NO EXCEDERÁ EL EQUIVALENTE A TRES (3) MESES DE LA CONTRAPRESTACIÓN EFECTIVAMENTE PAGADA POR EL CLIENTE A PLINIUS DURANTE LOS DOCE (12) MESES INMEDIATOS ANTERIORES A LA FECHA DEL EVENTO QUE DIO ORIGEN A LA RECLAMACIÓN.", { allCaps: false }),
          p("EN NINGÚN CASO PLINIUS SERÁ RESPONSABLE POR DAÑOS INDIRECTOS, INCIDENTALES, CONSECUENCIALES, PUNITIVOS O EJEMPLARES, INCLUYENDO SIN LIMITACIÓN: LUCRO CESANTE, PÉRDIDA DE INGRESOS, PÉRDIDA DE CLIENTES, PÉRDIDA DE DATOS, PÉRDIDA DE OPORTUNIDAD COMERCIAL, DAÑO A LA REPUTACIÓN, O CUALQUIER OTRO DAÑO SIMILAR, AUN CUANDO PLINIUS HUBIERA SIDO ADVERTIDO DE LA POSIBILIDAD DE DICHOS DAÑOS.", { allCaps: false }),
          p("Las limitaciones anteriores no aplicarán en casos de dolo, mala fe o fraude probado judicialmente por parte de Plinius, en los supuestos expresamente prohibidos por la legislación mexicana."),

          // ── DÉCIMA PRIMERA ──
          clauseHeading("DÉCIMA PRIMERA. INDEMNIZACIÓN POR EL CLIENTE."),
          p("El Cliente se obliga a indemnizar, defender y sacar en paz y a salvo a Plinius, a sus accionistas, consejeros, funcionarios, empleados, agentes y representantes, de toda reclamación, demanda, acción, juicio, procedimiento administrativo, multa, sanción, daño, perjuicio, responsabilidad, costo o gasto (incluyendo honorarios razonables de abogados) derivados o relacionados con:"),
          bullet("Las decisiones crediticias, operativas o comerciales del Cliente tomadas con base en información procesada a través de la Plataforma."),
          bullet("El incumplimiento por parte del Cliente de la legislación aplicable, incluyendo sin limitación la normatividad en materia financiera, crediticia, PLD/FT, protección al consumidor y protección de datos personales."),
          bullet("Reclamaciones presentadas por Usuarios Finales, acreditados, autoridades o terceros en relación con las operaciones del Cliente."),
          bullet("El uso indebido de la Plataforma por parte del Cliente o sus usuarios autorizados."),
          bullet("La exactitud, legalidad o idoneidad de los Datos del Cliente cargados a la Plataforma."),

          // ── DÉCIMA SEGUNDA ──
          clauseHeading("DÉCIMA SEGUNDA. VIGENCIA Y RENOVACIÓN."),
          p(`El presente Contrato entrará en vigor en la fecha de su firma y tendrá una vigencia inicial de ${data.plazo_meses} meses (el "Plazo Inicial"). Al vencimiento del Plazo Inicial, el Contrato se renovará automáticamente por periodos sucesivos de doce (12) meses, salvo que cualquiera de las Partes notifique a la otra, por escrito, con al menos treinta (30) días naturales de anticipación al vencimiento del periodo en curso, su voluntad de no renovar.`),

          // ── DÉCIMA TERCERA ──
          clauseHeading("DÉCIMA TERCERA. TERMINACIÓN ANTICIPADA."),
          p("Cualquiera de las Partes podrá dar por terminado anticipadamente el presente Contrato, sin responsabilidad, en caso de incumplimiento grave o reiterado de la otra Parte, previa notificación por escrito otorgando un plazo de quince (15) días naturales para subsanar dicho incumplimiento, si es subsanable."),
          p("Plinius podrá dar por terminado el Contrato de forma inmediata, sin necesidad de declaración judicial ni plazo de gracia, en los siguientes casos: (i) falta de pago por más de treinta (30) días naturales; (ii) uso indebido de la Plataforma conforme a la Cláusula Cuarta; (iii) infracción a los derechos de propiedad intelectual de Plinius; (iv) insolvencia, concurso mercantil o quiebra del Cliente; (v) pérdida o revocación de las autorizaciones regulatorias del Cliente."),
          p("En caso de terminación anticipada por parte del Cliente sin causa imputable a Plinius dentro del Plazo Inicial, el Cliente pagará a Plinius, a título de pena convencional, el equivalente al cincuenta por ciento (50%) de las mensualidades faltantes para completar el Plazo Inicial, cantidad que se liquidará dentro de los cinco (5) días naturales siguientes a la terminación."),

          // ── DÉCIMA CUARTA ──
          clauseHeading("DÉCIMA CUARTA. EFECTOS DE LA TERMINACIÓN."),
          p("A la terminación del Contrato, por cualquier causa: (i) cesará inmediatamente el derecho del Cliente a acceder y utilizar la Plataforma; (ii) el Cliente pagará todas las cantidades pendientes; (iii) Plinius pondrá a disposición del Cliente, por un plazo de treinta (30) días naturales, la posibilidad de exportar los Datos del Cliente en un formato estándar (CSV o JSON); (iv) transcurrido dicho plazo, Plinius procederá a eliminar los Datos del Cliente de sus sistemas productivos, conservando únicamente aquellos que deban mantenerse por obligación legal o fiscal; (v) las cláusulas que por su naturaleza deban subsistir (incluyendo sin limitación las de Propiedad Intelectual, Confidencialidad, Limitación de Responsabilidad, Indemnización y Jurisdicción) seguirán plenamente vigentes."),

          // ── DÉCIMA QUINTA ──
          clauseHeading("DÉCIMA QUINTA. NO SOLICITACIÓN DE PERSONAL."),
          p("Durante la vigencia del Contrato y por un periodo de doce (12) meses posteriores a su terminación, el Cliente se obliga a no contratar, directa o indirectamente, ni solicitar los servicios profesionales, ni inducir a dejar su empleo, a cualquier empleado, consultor o colaborador clave de Plinius con el que haya tenido contacto con motivo del presente Contrato, salvo autorización expresa y por escrito de Plinius."),
          p("El incumplimiento de esta cláusula obligará al Cliente a pagar a Plinius, como pena convencional, el equivalente a doce (12) meses del salario o contraprestación bruta del empleado o colaborador contratado, sin perjuicio de los daños y perjuicios adicionales."),

          // ── DÉCIMA SEXTA ──
          clauseHeading("DÉCIMA SEXTA. CASO FORTUITO Y FUERZA MAYOR."),
          p("Ninguna de las Partes será responsable por el incumplimiento o retraso en el cumplimiento de sus obligaciones cuando dicho incumplimiento o retraso sea consecuencia de caso fortuito o fuerza mayor, incluyendo sin limitación: desastres naturales, pandemias, epidemias, actos de autoridad, guerras, disturbios, fallas generalizadas en infraestructura pública de telecomunicaciones o energía, ataques cibernéticos masivos no imputables a la Parte afectada, u otros eventos similares ajenos al control razonable de la Parte afectada. La Parte afectada notificará a la otra dentro de los cinco (5) días naturales siguientes al evento."),

          // ── DÉCIMA SÉPTIMA ──
          clauseHeading("DÉCIMA SÉPTIMA. CESIÓN."),
          p("El Cliente no podrá ceder, transmitir o transferir, total o parcialmente, sus derechos u obligaciones derivadas del presente Contrato, sin el consentimiento previo y por escrito de Plinius. Plinius podrá ceder libremente sus derechos y obligaciones a cualquier afiliada, subsidiaria o sucesora, incluyendo en el contexto de una fusión, adquisición o reestructuración corporativa, bastando notificación al Cliente."),

          // ── DÉCIMA OCTAVA ──
          clauseHeading("DÉCIMA OCTAVA. NOTIFICACIONES."),
          p("Todas las notificaciones, avisos y comunicaciones relacionadas con el presente Contrato se realizarán por escrito, a las direcciones de correo electrónico y domicilios señalados en las Declaraciones, o a cualquier otra que las Partes notifiquen por escrito en el futuro. Las notificaciones por correo electrónico surtirán efectos al momento de su recepción confirmada por el sistema."),

          // ── DÉCIMA NOVENA ──
          clauseHeading("DÉCIMA NOVENA. RELACIÓN ENTRE LAS PARTES."),
          p("Las Partes son y permanecerán como contratistas independientes. Nada en el presente Contrato creará una relación laboral, de mandato, comisión, agencia, sociedad, asociación en participación o joint venture entre las Partes. Ninguna Parte tendrá autoridad para obligar a la otra frente a terceros."),

          // ── VIGÉSIMA ──
          clauseHeading("VIGÉSIMA. ACUERDO COMPLETO Y MODIFICACIONES."),
          p("El presente Contrato, junto con sus anexos, constituye el acuerdo íntegro y total entre las Partes respecto de su objeto, y deja sin efectos cualquier comunicación, oferta, negociación, propuesta o acuerdo previo, verbal o escrito, entre las Partes sobre el mismo objeto."),
          p("Toda modificación al Contrato deberá constar por escrito y estar firmada por ambas Partes para tener validez. No obstante, Plinius podrá actualizar unilateralmente los términos de uso, políticas de privacidad y documentación técnica de la Plataforma, notificando al Cliente con al menos treinta (30) días naturales de anticipación."),

          // ── VIGÉSIMA PRIMERA ──
          clauseHeading("VIGÉSIMA PRIMERA. DIVISIBILIDAD."),
          p("En caso de que cualquier disposición del presente Contrato sea declarada nula, ilegal o inejecutable por autoridad competente, dicha declaración no afectará la validez de las demás disposiciones, las cuales continuarán plenamente vigentes. Las Partes sustituirán la disposición afectada por otra que, siendo válida, refleje lo más fielmente posible la intención original."),

          // ── VIGÉSIMA SEGUNDA ──
          clauseHeading("VIGÉSIMA SEGUNDA. LEY APLICABLE Y JURISDICCIÓN."),
          p("El presente Contrato se regirá e interpretará conforme a las leyes federales de los Estados Unidos Mexicanos. Las Partes se someten expresamente a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que por razón de sus domicilios presentes o futuros, o por cualquier otra causa, pudiera corresponderles."),
          p("No obstante lo anterior, cualquier controversia derivada o relacionada con el presente Contrato podrá, a opción de Plinius, someterse a arbitraje administrado por el Centro de Arbitraje de México (CAM), conforme a su reglamento vigente, a ser conducido en idioma español, en la Ciudad de México, ante un árbitro único designado conforme a dicho reglamento. El laudo arbitral será definitivo, inapelable y obligatorio para las Partes."),

          // ═══ FIRMAS ═══
          emptyLine(),
          p(`Leído que fue el presente Contrato por las Partes y enteradas de su contenido y alcance legal, lo firman por duplicado en la Ciudad de México, el día ${hoy.dia} de ${hoy.mes} de ${hoy.anio}.`, {
            spacing: { before: 400, after: 400 },
          }),

          new Table({
            width: { size: 9500, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 4750, type: WidthType.DXA },
                    borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                    children: [
                      emptyLine(), emptyLine(), emptyLine(),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: "________________________________", font: FONT, size: 20, color: GRAY })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "PLINIUS", font: FONT, size: 20, bold: true })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Luis Álvarez Zapfe", font: FONT, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Director General", font: FONT, size: 18, color: GRAY })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: "Infraestructura en Finanzas AI,", font: FONT, size: 18, color: GRAY })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: "S.A.P.I. de C.V.", font: FONT, size: 18, color: GRAY })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 4750, type: WidthType.DXA },
                    borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                    children: [
                      emptyLine(), emptyLine(), emptyLine(),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: "________________________________", font: FONT, size: 20, color: GRAY })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "EL CLIENTE", font: FONT, size: 20, bold: true })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: data.nombre_representante, font: FONT, size: 20 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: data.cargo_representante, font: FONT, size: 18, color: GRAY })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: data.razon_social, font: FONT, size: 18, color: GRAY })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // ═══ ANEXO A ═══
          new Paragraph({
            children: [new PageBreak()],
          }),

          p("ANEXO A", {
            bold: true,
            size: 28,
            color: HEADING_COLOR,
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
          }),
          p("DESCRIPCIÓN DEL SERVICIO Y CONTRAPRESTACIÓN", {
            bold: true,
            size: 24,
            color: HEADING_COLOR,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),

          // ── 1. Plan Contratado ──
          p("1. Plan Contratado", { bold: true, size: 24, color: HEADING_COLOR, alignment: AlignmentType.LEFT, spacing: { after: 120 } }),
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            rows: [
              tableRow2Col("Concepto", "Detalle", true),
              tableRow2Col("Plan", data.plan),
              tableRow2Col("Contraprestación mensual", `$${formatPrecio(data.precio_mxn)} MXN + IVA`),
              tableRow2Col("Fecha de inicio", fechaInicioCorta),
              tableRow2Col("Plazo inicial", `${data.plazo_meses} meses`),
            ],
          }),

          emptyLine(),

          // ── 2. Límites y Funcionalidades ──
          p("2. Límites y Funcionalidades", { bold: true, size: 24, color: HEADING_COLOR, alignment: AlignmentType.LEFT, spacing: { before: 200, after: 120 } }),
          p("Las funcionalidades, límites de uso (incluyendo sin limitación: solicitantes por mes, flujos activos, almacenamiento de documentos, verificaciones de identidad, tasa de llamadas a API, número de usuarios, retención de datos) y niveles de soporte asociados al Plan contratado corresponden a los publicados por Plinius en su sitio oficial (plinius.mx) y en la sección de administración de la Plataforma en la fecha de firma del presente Contrato."),
          p("Plinius podrá actualizar las funcionalidades y límites incluidos en cada Plan, notificando al Cliente con al menos treinta (30) días naturales de anticipación a través de los canales oficiales de comunicación."),

          emptyLine(),

          // ── 3. Cuenta Bancaria ──
          p("3. Cuenta Bancaria para Pago", { bold: true, size: 24, color: HEADING_COLOR, alignment: AlignmentType.LEFT, spacing: { before: 200, after: 120 } }),
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            rows: [
              tableRow2Col("Concepto", "Detalle", true),
              tableRow2Col("Titular", "Infraestructura en Finanzas AI, S.A.P.I. de C.V."),
              tableRow2Col("Banco", data.banco),
              tableRow2Col("CLABE", data.clabe),
              tableRow2Col("Referencia", data.referencia),
            ],
          }),
        ],
      },
    ],
  });
}
