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
  const ML = 18
  const MR = 18
  const CW = W - ML - MR

  function drawChrome() {
    // Línea superior azul fina
    doc.setDrawColor(...AZUL_MED)
    doc.setLineWidth(0.8)
    doc.line(ML, 8, W - MR, 8)
    // PLINIUS texto
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...AZUL_OSC)
    doc.text('PLINIUS', ML, 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS_MED)
    doc.text('Infraestructura en Finanzas AI, SAPI de C.V.', ML + 22, 14)
    // Derecha
    doc.setFontSize(7)
    doc.setTextColor(...GRIS_MED)
    doc.text(data.lugar, W - MR, 10, { align: 'right' })
    doc.text(`Fecha: ${data.fecha}   Vence: ${data.vencimiento}`, W - MR, 15, { align: 'right' })
    // Footer
    doc.setDrawColor(...AZUL_TBL)
    doc.setLineWidth(0.3)
    doc.line(ML, H - 11, W - MR, H - 11)
    doc.setFontSize(6.5)
    doc.setTextColor(...GRIS_MED)
    doc.text(`Folio ${data.folio}  ·  ${data.lugar}  ·  plinius.mx`, W / 2, H - 7, { align: 'center' })
  }

  function hr(y: number) {
    doc.setDrawColor(...AZUL_TBL)
    doc.setLineWidth(0.3)
    doc.line(ML, y, W - MR, y)
  }

  function sectionTitle(text: string, y: number): number {
    hr(y); y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...AZUL_MED)
    doc.text(text, ML, y)
    return y + 5
  }

  // ════════════════════════════════════════════════
  // PÁGINA 1 — TÍTULO + MONTO + LEGAL + CONDICIONES
  // ════════════════════════════════════════════════
  drawChrome()
  let y = 22

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...AZUL_OSC)
  doc.text('P  A  G  A  R  É', W / 2, y + 9, { align: 'center' })
  y += 13
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS_MED)
  doc.text(`No. ${data.folio}`, W / 2, y, { align: 'center' })
  y += 3
  doc.setDrawColor(...AZUL_MED)
  doc.setLineWidth(1.2)
  doc.line(W/2 - 50, y, W/2 + 50, y)
  y += 7

  // Monto box
  doc.setFillColor(...AZUL_CLR)
  doc.setDrawColor(...AZUL_MED)
  doc.setLineWidth(0.6)
  doc.roundedRect(ML, y, CW, 16, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...AZUL_OSC)
  doc.text(`${fmt(data.monto)} M.N.`, W / 2, y + 7, { align: 'center' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS_MED)
  doc.text(`(${enLetras(data.monto)})`, W / 2, y + 13, { align: 'center' })
  y += 20

  // Texto legal
  const legal = `Yo, ${data.clienteNombre}, con Clave de Elector ${data.clienteClaveElector}, CURP ${data.clienteCurp}, con domicilio en ${data.clienteDomicilio}, en mi carácter de suscriptor, de manera incondicional e irrevocable me obligo a pagar a la orden de PLINIUS INFRAESTRUCTURA EN FINANZAS AI, SAPI DE C.V. ("el Tenedor"), la cantidad de ${fmt(data.monto)} M.N. (${enLetras(data.monto)}), que recibo como crédito simple personal en Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, Sky Lobby B, Lomas de Chapultepec I, C.P. 11000, CDMX.`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_OSC)
  const lLines = doc.splitTextToSize(legal, CW)
  doc.text(lLines, ML, y)
  y += lLines.length * 4.6 + 7

  // Condiciones
  y = sectionTitle('I.  CONDICIONES DEL CRÉDITO', y)
  autoTable(doc, {
    startY: y, margin: { left: ML, right: MR }, tableWidth: CW, head: [],
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
      0: { fontStyle:'bold', fillColor:AZUL_CLR, cellWidth:50, fontSize:8.5, textColor:AZUL_MED },
      1: { fillColor:[255,255,255], fontSize:8.5, textColor:GRIS_OSC },
    },
    alternateRowStyles: { fillColor: GRIS_CLR },
    styles: { lineColor:AZUL_TBL, lineWidth:0.3, cellPadding:{top:4,bottom:4,left:8,right:8} },
    theme: 'grid',
  })

  // ════════════════════════════════════════════════
  // PÁGINA 2 — TABLA DE AMORTIZACIÓN
  // ════════════════════════════════════════════════
  doc.addPage()
  drawChrome()
  y = 22

  y = sectionTitle(`II.  TABLA DE AMORTIZACIÓN  —  ${data.metodoInteres === 'flat' ? 'Método Flat' : 'Sobre saldo'}`, y)

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
      ['','TOTALES',
        data.monto.toLocaleString('es-MX',{minimumFractionDigits:2}),
        data.totalIntereses.toLocaleString('es-MX',{minimumFractionDigits:2}),
        data.totalPagar.toLocaleString('es-MX',{minimumFractionDigits:2}),
        '—'],
    ],
    headStyles: { fillColor:AZUL_OSC, textColor:BLANCO, fontSize:8.5, fontStyle:'bold', halign:'center' },
    bodyStyles: { fontSize:9, textColor:GRIS_OSC },
    alternateRowStyles: { fillColor:GRIS_CLR },
    columnStyles: {
      0: { halign:'center', cellWidth:12 },
      1: { cellWidth:52 },
      2: { halign:'right' },
      3: { halign:'right', textColor:NARANJA },
      4: { halign:'right', fontStyle:'bold', textColor:AZUL_MED },
      5: { halign:'right', textColor:GRIS_MED },
    },
    styles: { lineColor:AZUL_TBL, lineWidth:0.3, cellPadding:{top:5,bottom:5,left:6,right:6} },
    theme: 'grid',
    didParseCell(d) {
      const last = d.table.body.length - 1
      if (d.row.index === last) {
        d.cell.styles.fillColor = AZUL_CLR
        d.cell.styles.fontStyle = 'bold'
        d.cell.styles.textColor = AZUL_OSC
        if (d.column.index === 3) d.cell.styles.textColor = NARANJA
        if (d.column.index === 4) d.cell.styles.textColor = AZUL_MED
      }
    },
  })

  const noteY = (doc as any).lastAutoTable.finalY + 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS_MED)
  doc.text(
    `* Tasa: ${data.tasaMensual}% mensual neto fija  ·  Cuota mensual fija: ${fmt(data.cuotaMensual)}  ·  Total intereses: ${fmt(data.totalIntereses)}  ·  Total a pagar: ${fmt(data.totalPagar)}`,
    W / 2, noteY, { align: 'center' }
  )

  // ════════════════════════════════════════════════
  // PÁGINA 3 — CLÁUSULAS + FIRMAS
  // ════════════════════════════════════════════════
  doc.addPage()
  drawChrome()
  y = 22

  y = sectionTitle('III.  CLÁUSULAS', y)

  const clausulas = [
    ['INTERESES MORATORIOS', `En caso de incumplimiento, el suscriptor pagará intereses moratorios al doble de la tasa pactada (${data.tasaMensual * 2}% mensual) sobre el monto vencido, desde la fecha de incumplimiento hasta el pago efectivo.`],
    ['VENCIMIENTO ANTICIPADO', 'El Tenedor podrá declarar vencido anticipadamente este pagaré por: (i) incumplimiento de una o más cuotas; (ii) falsedad de la información proporcionada; o (iii) apertura de concurso mercantil del suscriptor.'],
    ['GASTOS Y COSTAS', 'Todos los gastos, costas y honorarios judiciales y extrajudiciales derivados del cobro del presente instrumento serán a cargo del suscriptor.'],
    ['JURISDICCIÓN', 'Para interpretación y cumplimiento del presente pagaré, el suscriptor se somete a los Tribunales competentes de la Ciudad de México, renunciando al fuero de su domicilio presente o futuro.'],
    ['LEY APLICABLE', 'El presente pagaré se rige por la Ley General de Títulos y Operaciones de Crédito (LGTOC) y demás disposiciones aplicables vigentes en los Estados Unidos Mexicanos.'],
  ]

  for (const [titulo, texto] of clausulas) {
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
    y += tLines.length * 4.6 + 5
  }

  // Firmas
  y += 14
  hr(y); y += 14

  const c1 = ML + 10
  const c2 = W / 2 + 14
  const lw = 68

  doc.setDrawColor(30, 30, 30)
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
  y += 7

  doc.setFontSize(8)
  doc.setTextColor(...GRIS_MED)
  doc.text(`Firmado en ${data.lugar}, el ${data.fecha}`, W / 2, y, { align: 'center' })

  // ════════════════════════════════════════════════
  // PÁGINA 4 — ANEXO A: INE
  // ════════════════════════════════════════════════
  if (data.ineFrente || data.ineReverso) {
    doc.addPage()
    drawChrome()
    y = 24

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...AZUL_OSC)
    doc.text('ANEXO A', W / 2, y + 5, { align: 'center' })
    y += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...AZUL_MED)
    doc.text('IDENTIFICACIÓN OFICIAL DEL SUSCRIPTOR', W / 2, y, { align: 'center' })
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS_MED)
    doc.text(`Credencial para Votar (INE)  ·  ${data.clienteNombre}`, W / 2, y, { align: 'center' })
    y += 6
    hr(y); y += 8

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

    hr(y); y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS_MED)
    doc.text(
      `Expediente de crédito ${data.folio}  ·  Plinius Infraestructura en Finanzas AI, SAPI de C.V.  ·  Torre Esmeralda III, CDMX`,
      W / 2, y, { align: 'center' }
    )
  }

  return doc.output('blob')
}
