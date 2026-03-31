import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const AZUL_OSC  = [11,  31,  75]  as [number,number,number]
const AZUL_MED  = [27,  58,  107] as [number,number,number]
const AZUL_CLR  = [232, 239, 249] as [number,number,number]
const AZUL_TBL  = [197, 213, 236] as [number,number,number]
const GRIS_OSC  = [30,  42,  58]  as [number,number,number]
const GRIS_MED  = [74,  85,  104] as [number,number,number]
const GRIS_CLR  = [245, 247, 250] as [number,number,number]
const NARANJA   = [185, 74,  11]  as [number,number,number]
const BLANCO    = [255, 255, 255] as [number,number,number]

export interface CuotaAmortizacion {
  n: number; fecha: string; capital: number
  interes: number; cuota: number; saldo: number
}

export interface PagareData {
  folio: string; fecha: string; vencimiento: string; lugar: string
  clienteNombre: string; clienteCurp: string
  clienteClaveElector: string; clienteDomicilio: string
  monto: number; tasaMensual: number; plazoMeses: number
  metodoInteres: 'flat' | 'saldo'; cuotaMensual: number
  totalIntereses: number; totalPagar: number
  tabla: CuotaAmortizacion[]
  ineFrente?: string; ineReverso?: string
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function enLetras(n: number): string {
  const map: Record<number,string> = {
    1000:'MIL PESOS 00/100 M.N.',2000:'DOS MIL PESOS 00/100 M.N.',
    3000:'TRES MIL PESOS 00/100 M.N.',4000:'CUATRO MIL PESOS 00/100 M.N.',
    5000:'CINCO MIL PESOS 00/100 M.N.',6000:'SEIS MIL PESOS 00/100 M.N.',
    7000:'SIETE MIL PESOS 00/100 M.N.',8000:'OCHO MIL PESOS 00/100 M.N.',
    9000:'NUEVE MIL PESOS 00/100 M.N.',10000:'DIEZ MIL PESOS 00/100 M.N.',
    15000:'QUINCE MIL PESOS 00/100 M.N.',20000:'VEINTE MIL PESOS 00/100 M.N.',
    25000:'VEINTICINCO MIL PESOS 00/100 M.N.',30000:'TREINTA MIL PESOS 00/100 M.N.',
    40000:'CUARENTA MIL PESOS 00/100 M.N.',50000:'CINCUENTA MIL PESOS 00/100 M.N.',
    75000:'SETENTA Y CINCO MIL PESOS 00/100 M.N.',100000:'CIEN MIL PESOS 00/100 M.N.',
  }
  return map[n] ?? `${n.toLocaleString('es-MX')} PESOS 00/100 M.N.`
}

export async function generarPagarePDF(data: PagareData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W  = 215.9
  const H  = 279.4
  const ML = 15
  const MR = 15
  const CW = W - ML - MR

  function drawChrome() {
    // Header
    doc.setFillColor(...AZUL_OSC)
    doc.rect(0, 0, W, 20, 'F')
    doc.setFillColor(42, 82, 152)
    doc.rect(0, 20, W, 0.7, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.text('PLINIUS', ML, 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text('Infraestructura en Finanzas AI, SAPI de C.V.', ML, 15)
    doc.setFontSize(7.5)
    doc.text(data.lugar, W - MR, 8, { align: 'right' })
    doc.text(`Fecha: ${data.fecha}`, W - MR, 13, { align: 'right' })
    doc.text(`Vence: ${data.vencimiento}`, W - MR, 18, { align: 'right' })
    // Footer
    doc.setFillColor(...AZUL_OSC)
    doc.rect(0, H - 9, W, 9, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFontSize(6.5)
    doc.text(`Folio ${data.folio}  ·  ${data.lugar}  ·  plinius.mx`, W / 2, H - 3.5, { align: 'center' })
  }

  drawChrome()
  let y = 24

  // ── TÍTULO ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...AZUL_OSC)
  doc.text('P  A  G  A  R  É', W / 2, y + 8, { align: 'center' })
  y += 11
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS_MED)
  doc.text(`No. ${data.folio}`, W / 2, y, { align: 'center' })
  y += 3
  doc.setDrawColor(...AZUL_MED)
  doc.setLineWidth(1.2)
  doc.line(W/2 - 52, y, W/2 + 52, y)
  y += 7

  // ── MONTO ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL_CLR)
  doc.setDrawColor(...AZUL_MED)
  doc.setLineWidth(0.7)
  doc.roundedRect(ML, y, CW, 16, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...AZUL_OSC)
  doc.text(`${fmt(data.monto)} M.N.`, W / 2, y + 7, { align: 'center' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS_MED)
  doc.text(`(${enLetras(data.monto)})`, W / 2, y + 13, { align: 'center' })
  y += 21

  // ── TEXTO LEGAL ───────────────────────────────────────────────────────────
  const legal = `Yo, ${data.clienteNombre}, con Clave de Elector ${data.clienteClaveElector}, CURP ${data.clienteCurp}, con domicilio en ${data.clienteDomicilio}, en mi carácter de suscriptor, de manera incondicional e irrevocable me obligo a pagar a la orden de PLINIUS INFRAESTRUCTURA EN FINANZAS AI, SAPI DE C.V. ("el Tenedor"), la cantidad de ${fmt(data.monto)} M.N. (${enLetras(data.monto)}), que recibo como crédito simple personal en Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, Sky Lobby B, Lomas de Chapultepec I, C.P. 11000, CDMX.`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_OSC)
  const legalLines = doc.splitTextToSize(legal, CW)
  doc.text(legalLines, ML, y)
  y += legalLines.length * 4.8 + 7

  // ── HR helper ─────────────────────────────────────────────────────────────
  function hr() {
    doc.setDrawColor(...AZUL_TBL)
    doc.setLineWidth(0.4)
    doc.line(ML, y, W - MR, y)
    y += 5
  }

  function sectionTitle(text: string) {
    hr()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...AZUL_MED)
    doc.text(text, ML, y)
    y += 5
  }

  // ── CONDICIONES ───────────────────────────────────────────────────────────
  sectionTitle('I.  CONDICIONES DEL CRÉDITO')
  autoTable(doc, {
    startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
    head: [],
    body: [
      ['Tipo de crédito',      'Crédito Simple Personal'],
      ['Monto del crédito',    `${fmt(data.monto)} M.N.`],
      ['Tasa de interés',      `${data.tasaMensual}% neto mensual  ·  ${data.metodoInteres === 'flat' ? 'Flat (interés fijo sobre capital original)' : 'Sobre saldo insoluto'}`],
      ['Plazo',                `${data.plazoMeses} meses`],
      ['Cuota mensual',        `${fmt(data.cuotaMensual)} M.N. (fija)`],
      ['Total intereses',      `${fmt(data.totalIntereses)} M.N.`],
      ['Total a pagar',        `${fmt(data.totalPagar)} M.N.`],
      ['Fecha de disposición', data.fecha],
      ['Fecha de vencimiento', data.vencimiento],
      ['Lugar de pago',        'Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, CDMX'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: AZUL_CLR, cellWidth: 52, fontSize: 8.5, textColor: AZUL_MED },
      1: { fillColor: [255,255,255], fontSize: 8.5, textColor: GRIS_OSC },
    },
    alternateRowStyles: { fillColor: GRIS_CLR },
    styles: { lineColor: AZUL_TBL, lineWidth: 0.3, cellPadding: { top:4, bottom:4, left:8, right:8 } },
    theme: 'grid',
  })
  y = (doc as any).lastAutoTable.finalY + 7

  // ── AMORTIZACIÓN ──────────────────────────────────────────────────────────
  sectionTitle('II.  TABLA DE AMORTIZACIÓN')
  autoTable(doc, {
    startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
    head: [['No.', 'Vencimiento', 'Capital ($)', 'Interés ($)', 'Cuota Total ($)', 'Saldo ($)']],
    body: [
      ...data.tabla.map(r => [
        r.n, r.fecha,
        r.capital.toLocaleString('es-MX',{minimumFractionDigits:2}),
        r.interes.toLocaleString('es-MX',{minimumFractionDigits:2}),
        r.cuota.toLocaleString('es-MX',{minimumFractionDigits:2}),
        Math.max(0,r.saldo).toLocaleString('es-MX',{minimumFractionDigits:2}),
      ]),
      ['', 'TOTALES',
        data.monto.toLocaleString('es-MX',{minimumFractionDigits:2}),
        data.totalIntereses.toLocaleString('es-MX',{minimumFractionDigits:2}),
        data.totalPagar.toLocaleString('es-MX',{minimumFractionDigits:2}),
        '—'],
    ],
    headStyles: { fillColor: AZUL_OSC, textColor: BLANCO, fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8.5, textColor: GRIS_OSC },
    alternateRowStyles: { fillColor: GRIS_CLR },
    columnStyles: {
      0: { halign: 'center', cellWidth: 11 },
      1: { cellWidth: 46 },
      2: { halign: 'right' },
      3: { halign: 'right', textColor: NARANJA },
      4: { halign: 'right', fontStyle: 'bold', textColor: AZUL_MED },
      5: { halign: 'right', textColor: GRIS_MED },
    },
    styles: { lineColor: AZUL_TBL, lineWidth: 0.3, cellPadding: { top:4, bottom:4, left:5, right:5 } },
    theme: 'grid',
    didParseCell(hookData) {
      const last = hookData.table.body.length - 1
      if (hookData.row.index === last) {
        hookData.cell.styles.fillColor = AZUL_CLR
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.textColor = AZUL_OSC
        if (hookData.column.index === 3) hookData.cell.styles.textColor = NARANJA
        if (hookData.column.index === 4) hookData.cell.styles.textColor = AZUL_MED
      }
    },
  })
  y = (doc as any).lastAutoTable.finalY + 7

  // ── CLÁUSULAS ─────────────────────────────────────────────────────────────
  sectionTitle('III.  CLÁUSULAS')
  const clausulas = [
    ['INTERESES MORATORIOS', `En caso de incumplimiento, el suscriptor pagará intereses moratorios al doble de la tasa pactada (${data.tasaMensual * 2}% mensual) sobre el monto vencido, desde la fecha de incumplimiento hasta el pago efectivo.`],
    ['VENCIMIENTO ANTICIPADO', 'El Tenedor podrá declarar vencido anticipadamente este pagaré por: (i) incumplimiento de una o más cuotas; (ii) falsedad de la información proporcionada; o (iii) apertura de concurso mercantil del suscriptor.'],
    ['GASTOS Y COSTAS', 'Todos los gastos, costas y honorarios judiciales y extrajudiciales derivados del cobro serán a cargo del suscriptor.'],
    ['JURISDICCIÓN', 'Para interpretación y cumplimiento, el suscriptor se somete a los Tribunales competentes de la Ciudad de México, renunciando al fuero de su domicilio presente o futuro.'],
    ['LEY APLICABLE', 'El presente pagaré se rige por la Ley General de Títulos y Operaciones de Crédito (LGTOC) y demás disposiciones aplicables vigentes en los Estados Unidos Mexicanos.'],
  ]
  for (const [titulo, texto] of clausulas) {
    if (y > 228) { doc.addPage(); drawChrome(); y = 26 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...AZUL_MED)
    doc.text(titulo, ML, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS_OSC)
    const tLines = doc.splitTextToSize(texto, CW)
    doc.text(tLines, ML, y)
    y += tLines.length * 4.6 + 3
  }

  // ── FIRMAS ────────────────────────────────────────────────────────────────
  if (y > 218) { doc.addPage(); drawChrome(); y = 26 }
  y += 8
  doc.setDrawColor(...AZUL_TBL)
  doc.setLineWidth(0.4)
  doc.line(ML, y, W - MR, y)
  y += 14

  const c1 = ML + 8
  const c2 = W / 2 + 12
  const lw = 70
  doc.setDrawColor(...GRIS_OSC)
  doc.setLineWidth(0.6)
  doc.line(c1, y, c1 + lw, y)
  doc.line(c2, y, c2 + lw, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS_OSC)
  doc.text(data.clienteNombre, c1 + lw/2, y, { align: 'center' })
  doc.text('PLINIUS INFRAESTRUCTURA EN FINANZAS AI', c2 + lw/2, y, { align: 'center' })
  y += 4.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS_MED)
  doc.text('SUSCRIPTOR', c1 + lw/2, y, { align: 'center' })
  doc.text('REPRESENTANTE LEGAL / TENEDOR', c2 + lw/2, y, { align: 'center' })
  y += 4
  doc.setFontSize(7)
  doc.text(`CURP: ${data.clienteCurp}`, c1 + lw/2, y, { align: 'center' })
  y += 6
  doc.setFontSize(8)
  doc.setTextColor(...GRIS_MED)
  doc.text(`Firmado en ${data.lugar}, el ${data.fecha}`, W / 2, y, { align: 'center' })

  // ── ANEXO A — INE ─────────────────────────────────────────────────────────
  if (data.ineFrente || data.ineReverso) {
    doc.addPage()
    drawChrome()
    y = 26

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...AZUL_OSC)
    doc.text('ANEXO A', W / 2, y + 6, { align: 'center' })
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...AZUL_MED)
    doc.text('IDENTIFICACIÓN OFICIAL DEL SUSCRIPTOR', W / 2, y, { align: 'center' })
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS_MED)
    doc.text(`Credencial para Votar (INE) — ${data.clienteNombre}`, W / 2, y, { align: 'center' })
    y += 6
    doc.setDrawColor(...AZUL_TBL)
    doc.setLineWidth(0.4)
    doc.line(ML, y, W - MR, y)
    y += 8

    const imgW = 166
    const imgH = 104
    const imgX = (W - imgW) / 2

    if (data.ineFrente) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...AZUL_MED)
      doc.text('FRENTE', W / 2, y, { align: 'center' })
      y += 3
      doc.setDrawColor(...AZUL_TBL)
      doc.setLineWidth(0.4)
      doc.roundedRect(imgX, y, imgW, imgH, 2, 2, 'S')
      doc.addImage(data.ineFrente, 'JPEG', imgX, y, imgW, imgH)
      y += imgH + 10
    }

    if (data.ineReverso) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...AZUL_MED)
      doc.text('REVERSO', W / 2, y, { align: 'center' })
      y += 3
      doc.setDrawColor(...AZUL_TBL)
      doc.setLineWidth(0.4)
      doc.roundedRect(imgX, y, imgW, imgH, 2, 2, 'S')
      doc.addImage(data.ineReverso, 'JPEG', imgX, y, imgW, imgH)
      y += imgH + 10
    }

    doc.setDrawColor(...AZUL_TBL)
    doc.setLineWidth(0.4)
    doc.line(ML, y, W - MR, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS_MED)
    doc.text(`Documento recopilado como parte del expediente de crédito ${data.folio}  ·  Plinius Infraestructura en Finanzas AI, SAPI de C.V.`, W / 2, y, { align: 'center' })
  }

  return doc.output('blob')
}
