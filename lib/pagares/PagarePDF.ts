import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Paleta ────────────────────────────────────────────────────────────────────
const AZUL_OSC  = [15,  42,  94]  as [number,number,number]  // #0F2A5E
const AZUL_MED  = [27,  58,  107] as [number,number,number]  // #1B3A6B
const AZUL_CLR  = [232, 239, 249] as [number,number,number]  // #E8EFF9
const AZUL_TBL  = [208, 221, 239] as [number,number,number]  // #D0DDEF
const BLANCO    = [255, 255, 255] as [number,number,number]
const GRIS_OSC  = [30,  42,  58]  as [number,number,number]  // #1E2A3A
const GRIS_MED  = [74,  85,  104] as [number,number,number]  // #4A5568
const GRIS_CLR  = [247, 249, 252] as [number,number,number]  // #F7F9FC
const NARANJA   = [192, 86,  33]  as [number,number,number]  // #C05621

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
    1000:'MIL PESOS 00/100 M.N.', 2000:'DOS MIL PESOS 00/100 M.N.',
    3000:'TRES MIL PESOS 00/100 M.N.', 4000:'CUATRO MIL PESOS 00/100 M.N.',
    5000:'CINCO MIL PESOS 00/100 M.N.', 6000:'SEIS MIL PESOS 00/100 M.N.',
    7000:'SIETE MIL PESOS 00/100 M.N.', 8000:'OCHO MIL PESOS 00/100 M.N.',
    9000:'NUEVE MIL PESOS 00/100 M.N.', 10000:'DIEZ MIL PESOS 00/100 M.N.',
    15000:'QUINCE MIL PESOS 00/100 M.N.', 20000:'VEINTE MIL PESOS 00/100 M.N.',
    25000:'VEINTICINCO MIL PESOS 00/100 M.N.', 30000:'TREINTA MIL PESOS 00/100 M.N.',
    50000:'CINCUENTA MIL PESOS 00/100 M.N.', 100000:'CIEN MIL PESOS 00/100 M.N.',
  }
  return map[n] ?? `${n.toLocaleString('es-MX')} PESOS 00/100 M.N.`
}

function hr(doc: jsPDF, y: number, margin: number, W: number) {
  doc.setDrawColor(...AZUL_TBL)
  doc.setLineWidth(0.4)
  doc.line(margin, y, W - margin, y)
}

export async function generarPagarePDF(data: PagareData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W = 215.9
  const H = 279.4
  const margin = 14
  const cw = W - margin * 2

  function drawHeader() {
    // Banda azul oscura
    doc.setFillColor(...AZUL_OSC)
    doc.rect(0, 0, W, 22, 'F')
    // Logo
    doc.setTextColor(...BLANCO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('PLINIUS', margin, 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Infraestructura en Finanzas AI, SAPI de C.V.', margin, 16)
    // Fecha/lugar derecha
    doc.setFontSize(7.5)
    doc.text(data.lugar, W - margin, 9, { align: 'right' })
    doc.text(`Fecha: ${data.fecha}`, W - margin, 14, { align: 'right' })
    doc.text(`Vence: ${data.vencimiento}`, W - margin, 19, { align: 'right' })
    // Footer banda
    doc.setFillColor(...AZUL_OSC)
    doc.rect(0, H - 10, W, 10, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFontSize(7)
    doc.text(`Folio ${data.folio}  ·  ${data.lugar}  ·  plinius.mx`, W / 2, H - 4, { align: 'center' })
  }

  drawHeader()
  let y = 28

  // ── TÍTULO ──────────────────────────────────────────────────────────────────
  doc.setTextColor(...AZUL_OSC)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('P A G A R É', W / 2, y + 8, { align: 'center' })
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_MED)
  doc.text(`No. ${data.folio}`, W / 2, y, { align: 'center' })
  y += 4
  doc.setDrawColor(...AZUL_MED)
  doc.setLineWidth(1)
  doc.line(margin + 30, y, W - margin - 30, y)
  y += 8

  // ── MONTO ───────────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL_CLR)
  doc.setDrawColor(...AZUL_MED)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, y, cw, 18, 3, 3, 'FD')
  doc.setTextColor(...AZUL_OSC)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text(`${fmt(data.monto)} M.N.`, W / 2, y + 8, { align: 'center' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_MED)
  doc.text(`(${enLetras(data.monto)})`, W / 2, y + 14, { align: 'center' })
  y += 24

  // ── TEXTO LEGAL ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...GRIS_OSC)

  // Construir texto con nombre en negrita
  const partes = [
    { text: 'Yo, ', bold: false },
    { text: data.clienteNombre, bold: true },
    { text: ', con Clave de Elector ', bold: false },
    { text: data.clienteClaveElector, bold: true },
    { text: ', CURP ', bold: false },
    { text: data.clienteCurp, bold: true },
    { text: ', con domicilio en ', bold: false },
    { text: data.clienteDomicilio, bold: true },
    { text: ', en mi carácter de suscriptor, de manera incondicional e irrevocable me obligo a pagar a la orden de ', bold: false },
    { text: 'PLINIUS INFRAESTRUCTURA EN FINANZAS AI, SAPI DE C.V.', bold: true },
    { text: ' ("el Tenedor"), la cantidad de ', bold: false },
    { text: `${fmt(data.monto)} M.N. (${enLetras(data.monto)})`, bold: true },
    { text: ', que recibo como crédito simple personal en Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, Sky Lobby B, Lomas de Chapultepec I, C.P. 11000, CDMX.', bold: false },
  ]

  // Renderizar párrafo mixto manualmente
  const lineH = 5.2
  const words: { word: string; bold: boolean }[] = []
  for (const p of partes) {
    p.text.split(' ').forEach((w, i) => {
      if (w) words.push({ word: (i === 0 ? '' : '') + w, bold: p.bold })
    })
  }

  let lineX = margin
  let lineWords: typeof words = []

  function flushLine(ws: {word:string;bold:boolean}[], x: number, lineY: number, justify: boolean, lastLine: boolean) {
    if (!words.length) return
    const totalTextW = words.reduce((s, w) => {
      doc.setFont('helvetica', w.bold ? 'bold' : 'normal')
      doc.setFontSize(9.5)
      return s + doc.getTextWidth(w.word + ' ')
    }, 0)
    let spaceExtra = 0
    if (justify && !lastLine && words.length > 1) {
      spaceExtra = (cw - totalTextW) / (words.length - 1)
    }
    let cx = x
    for (const w of words) {
      doc.setFont('helvetica', w.bold ? 'bold' : 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...GRIS_OSC)
      doc.text(w.word, cx, lineY)
      cx += doc.getTextWidth(w.word) + doc.getTextWidth(' ') + spaceExtra
    }
  }

  let currentLine: typeof words = []
  let currentW = 0
  for (const w of words) {
    doc.setFont('helvetica', w.bold ? 'bold' : 'normal')
    doc.setFontSize(9.5)
    const ww = doc.getTextWidth(w.word + ' ')
    if (currentW + ww > cw && currentLine.length > 0) {
      flushLine(currentLine, margin, y, true, false)
      y += lineH
      currentLine = [w]
      currentW = ww
    } else {
      currentLine.push(w)
      currentW += ww
    }
  }
  if (currentLine.length) {
    flushLine(currentLine, margin, y, true, true)
    y += lineH
  }
  y += 8

  // ── CONDICIONES ─────────────────────────────────────────────────────────────
  hr(doc, y, margin, W); y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...AZUL_OSC)
  doc.text('I. CONDICIONES DEL CRÉDITO', margin, y)
  y += 6

  const condRows = [
    ['Tipo de crédito',       'Crédito Simple Personal'],
    ['Monto del crédito',     `${fmt(data.monto)} M.N.`],
    ['Tasa de interés',       `${data.tasaMensual}% neto mensual · ${data.metodoInteres === 'flat' ? 'Flat (interés fijo sobre capital original)' : 'Sobre saldo insoluto'}`],
    ['Plazo',                 `${data.plazoMeses} meses`],
    ['Cuota mensual',         `${fmt(data.cuotaMensual)} M.N. (fija)`],
    ['Total intereses',       `${fmt(data.totalIntereses)} M.N.`],
    ['Total a pagar',         `${fmt(data.totalPagar)} M.N.`],
    ['Fecha de disposición',  data.fecha],
    ['Fecha de vencimiento',  data.vencimiento],
    ['Lugar de pago',         'Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, CDMX'],
  ]

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin }, tableWidth: cw,
    head: [],
    body: condRows,
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: AZUL_CLR, cellWidth: 52, fontSize: 9, textColor: AZUL_MED },
      1: { fillColor: [255,255,255], fontSize: 9, textColor: GRIS_OSC },
    },
    styles: { lineColor: AZUL_TBL, lineWidth: 0.3, cellPadding: { top:4, bottom:4, left:8, right:8 } },
    theme: 'grid',
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── AMORTIZACIÓN ────────────────────────────────────────────────────────────
  hr(doc, y, margin, W); y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...AZUL_OSC)
  doc.text('II. TABLA DE AMORTIZACIÓN', margin, y)
  y += 6

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin }, tableWidth: cw,
    head: [['No.', 'Vencimiento', 'Capital ($)', 'Interés ($)', 'Cuota Total ($)', 'Saldo ($)']],
    body: [
      ...data.tabla.map(r => [
        r.n, r.fecha,
        r.capital.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
        r.interes.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
        r.cuota.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
        Math.max(0, r.saldo).toLocaleString('es-MX', { minimumFractionDigits: 2 }),
      ]),
      // Totales
      ['', 'TOTALES',
        data.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
        data.totalIntereses.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
        data.totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
        '—'],
    ],
    headStyles: { fillColor: AZUL_OSC, textColor: BLANCO, fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: GRIS_OSC },
    alternateRowStyles: { fillColor: GRIS_CLR },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 48 },
      2: { halign: 'right', textColor: GRIS_OSC },
      3: { halign: 'right', textColor: NARANJA },
      4: { halign: 'right', fontStyle: 'bold', textColor: AZUL_MED },
      5: { halign: 'right', textColor: GRIS_MED },
    },
    styles: { lineColor: AZUL_TBL, lineWidth: 0.3, cellPadding: { top:4, bottom:4, left:6, right:6 } },
    theme: 'grid',
    didParseCell(data) {
      const last = data.table.body.length - 1
      if (data.row.index === last) {
        data.cell.styles.fillColor = AZUL_CLR
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = AZUL_OSC
        if (data.column.index === 3) data.cell.styles.textColor = NARANJA
      }
    },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // ── CLÁUSULAS ───────────────────────────────────────────────────────────────
  hr(doc, y, margin, W); y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...AZUL_OSC)
  doc.text('III. CLÁUSULAS', margin, y)
  y += 6

  const clausulas = [
    ['INTERESES MORATORIOS', `En caso de incumplimiento, el suscriptor pagará intereses moratorios al doble de la tasa pactada (${data.tasaMensual * 2}% mensual) sobre el monto vencido, desde la fecha de incumplimiento hasta el pago efectivo.`],
    ['VENCIMIENTO ANTICIPADO', 'El Tenedor podrá declarar vencido anticipadamente este pagaré por: (i) incumplimiento de una o más cuotas; (ii) falsedad de la información; o (iii) apertura de concurso mercantil del suscriptor.'],
    ['GASTOS Y COSTAS', 'Todos los gastos, costas y honorarios derivados del cobro serán a cargo del suscriptor.'],
    ['JURISDICCIÓN', 'Para interpretación y cumplimiento, el suscriptor se somete a los Tribunales competentes de la Ciudad de México, renunciando al fuero de su domicilio.'],
    ['LEY APLICABLE', 'Este pagaré se rige por la Ley General de Títulos y Operaciones de Crédito (LGTOC) y demás disposiciones aplicables vigentes en los Estados Unidos Mexicanos.'],
  ]

  for (const [titulo, texto] of clausulas) {
    if (y > 230) {
      doc.addPage()
      drawHeader()
      y = 28
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...AZUL_MED)
    doc.text(titulo, margin, y)
    y += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...GRIS_OSC)
    const lines = doc.splitTextToSize(texto, cw)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 4
  }

  // ── FIRMAS ──────────────────────────────────────────────────────────────────
  if (y > 220) { doc.addPage(); drawHeader(); y = 28 }
  y += 8
  hr(doc, y, margin, W); y += 14

  const col1 = margin + 5
  const col2 = W / 2 + 10
  const lineW = 72

  doc.setDrawColor(...GRIS_OSC)
  doc.setLineWidth(0.5)
  doc.line(col1, y, col1 + lineW, y)
  doc.line(col2, y, col2 + lineW, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_OSC)
  doc.text(data.clienteNombre, col1 + lineW / 2, y, { align: 'center' })
  doc.text('PLINIUS INFRAESTRUCTURA EN FINANZAS AI', col2 + lineW / 2, y, { align: 'center' })
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS_MED)
  doc.text('SUSCRIPTOR', col1 + lineW / 2, y, { align: 'center' })
  doc.text('REPRESENTANTE LEGAL / TENEDOR', col2 + lineW / 2, y, { align: 'center' })
  y += 4

  doc.setFontSize(7.5)
  doc.text(`CURP: ${data.clienteCurp}`, col1 + lineW / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(8)
  doc.setTextColor(...GRIS_MED)
  doc.text(`Firmado en ${data.lugar}, el ${data.fecha}`, W / 2, y, { align: 'center' })

  // ── ANEXO A — INE ───────────────────────────────────────────────────────────
  if (data.ineFrente || data.ineReverso) {
    doc.addPage()
    drawHeader()
    y = 30

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...AZUL_OSC)
    doc.text('ANEXO A', W / 2, y, { align: 'center' })
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('IDENTIFICACIÓN OFICIAL DEL SUSCRIPTOR', W / 2, y, { align: 'center' })
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS_MED)
    doc.text(`Credencial para Votar (INE) — ${data.clienteNombre}`, W / 2, y, { align: 'center' })
    y += 10

    const imgW = 162
    const imgH = 102
    const imgX = (W - imgW) / 2

    if (data.ineFrente) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...AZUL_MED)
      doc.text('FRENTE', W / 2, y, { align: 'center' })
      y += 4
      doc.addImage(data.ineFrente, 'JPEG', imgX, y, imgW, imgH)
      y += imgH + 12
    }

    if (data.ineReverso) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...AZUL_MED)
      doc.text('REVERSO', W / 2, y, { align: 'center' })
      y += 4
      doc.addImage(data.ineReverso, 'JPEG', imgX, y, imgW, imgH)
    }
  }

  return doc.output('blob')
}
