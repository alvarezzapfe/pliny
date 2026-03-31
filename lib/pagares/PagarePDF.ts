import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const AZUL = [27, 58, 107] as [number, number, number]
const AZUL_CLARO = [235, 240, 250] as [number, number, number]
const GRIS = [100, 100, 100] as [number, number, number]

export interface CuotaAmortizacion {
  n: number
  fecha: string
  capital: number
  interes: number
  cuota: number
  saldo: number
}

export interface PagareData {
  folio: string
  fecha: string
  vencimiento: string
  lugar: string
  clienteNombre: string
  clienteCurp: string
  clienteClaveElector: string
  clienteDomicilio: string
  monto: number
  tasaMensual: number
  plazoMeses: number
  metodoInteres: 'flat' | 'saldo'
  cuotaMensual: number
  totalIntereses: number
  totalPagar: number
  tabla: CuotaAmortizacion[]
  ineFrente?: string
  ineReverso?: string
}

function fmt(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function enLetras(n: number): string {
  if (n === 10000) return 'DIEZ MIL PESOS 00/100 MONEDA NACIONAL'
  return `${n.toLocaleString('es-MX')} PESOS 00/100 MONEDA NACIONAL`
}

export async function generarPagarePDF(data: PagareData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W = 215.9
  const margin = 18
  const contentW = W - margin * 2
  let y = 16

  // Header
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, W, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('PLINIUS', margin, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Infraestructura en Finanzas AI, SAPI de C.V.', margin, 15)
  doc.text(`${data.lugar}`, W - margin, 10, { align: 'right' })
  doc.text(`Fecha: ${data.fecha}`, W - margin, 15, { align: 'right' })
  doc.text(`Vence: ${data.vencimiento}`, W - margin, 19, { align: 'right' })
  y = 28

  // Título
  doc.setTextColor(...AZUL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('PAGARÉ', W / 2, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text(`Folio: ${data.folio}`, W / 2, y, { align: 'center' })
  y += 8

  // Monto
  doc.setFillColor(...AZUL_CLARO)
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, y, contentW, 18, 3, 3, 'FD')
  doc.setTextColor(...AZUL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(`$${fmt(data.monto)} M.N.`, W / 2, y + 8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`(${enLetras(data.monto)})`, W / 2, y + 14, { align: 'center' })
  y += 24

  // Texto legal
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const textoLegal = `Yo, ${data.clienteNombre}, con Clave de Elector ${data.clienteClaveElector}, CURP ${data.clienteCurp}, con domicilio en ${data.clienteDomicilio}, en mi carácter de suscriptor, de manera incondicional e irrevocable me obligo a pagar a la orden de PLINIUS INFRAESTRUCTURA EN FINANZAS AI, SAPI DE C.V., o a quien sus derechos represente ("el Tenedor"), la cantidad de $${fmt(data.monto)} M.N. (${enLetras(data.monto)}), que recibo como crédito simple personal en Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, Sky Lobby B, Lomas de Chapultepec I, C.P. 11000, CDMX.`
  const lines = doc.splitTextToSize(textoLegal, contentW)
  doc.text(lines, margin, y)
  y += lines.length * 4.5 + 6

  // Condiciones
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...AZUL)
  doc.text('I. CONDICIONES DEL CRÉDITO', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    head: [],
    body: [
      ['Tipo de crédito', 'Crédito Simple Personal'],
      ['Monto', `$${fmt(data.monto)} M.N.`],
      ['Tasa de interés', `${data.tasaMensual}% mensual neto (${data.metodoInteres === 'flat' ? 'flat sobre capital original' : 'sobre saldo insoluto'})`],
      ['Plazo', `${data.plazoMeses} meses`],
      ['Cuota mensual', `$${fmt(data.cuotaMensual)} M.N. (fija)`],
      ['Total intereses', `$${fmt(data.totalIntereses)} M.N.`],
      ['Total a pagar', `$${fmt(data.totalPagar)} M.N.`],
      ['Fecha de disposición', data.fecha],
      ['Fecha de vencimiento', data.vencimiento],
      ['Lugar de pago', 'Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, CDMX'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: AZUL_CLARO, cellWidth: 55, fontSize: 8 },
      1: { fillColor: [255, 255, 255], fontSize: 8 },
    },
    styles: { lineColor: [204, 204, 204], lineWidth: 0.3, cellPadding: 2 },
    theme: 'grid',
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Amortización
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...AZUL)
  doc.text('II. TABLA DE AMORTIZACIÓN', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    head: [['No.', 'Vencimiento', 'Capital ($)', 'Interés ($)', 'Cuota Total ($)', 'Saldo ($)']],
    body: data.tabla.map(r => [r.n, r.fecha, fmt(r.capital), fmt(r.interes), fmt(r.cuota), fmt(Math.max(0, r.saldo))]),
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 40 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right' },
    },
    styles: { lineColor: [204, 204, 204], lineWidth: 0.3, cellPadding: 2 },
    theme: 'grid',
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // Cláusulas
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...AZUL)
  doc.text('III. CLÁUSULAS', margin, y)
  y += 4

  const clausulas = [
    ['INTERESES MORATORIOS', `En caso de incumplimiento, el suscriptor pagará intereses moratorios al doble de la tasa pactada (${data.tasaMensual * 2}% mensual) sobre el monto vencido, desde la fecha de incumplimiento hasta el pago efectivo.`],
    ['VENCIMIENTO ANTICIPADO', 'El Tenedor podrá declarar vencido anticipadamente este pagaré por: (i) incumplimiento de una o más cuotas; (ii) falsedad de la información; o (iii) apertura de concurso mercantil del suscriptor.'],
    ['GASTOS Y COSTAS', 'Todos los gastos, costas y honorarios derivados del cobro serán a cargo del suscriptor.'],
    ['JURISDICCIÓN', 'Para interpretación y cumplimiento, el suscriptor se somete a los Tribunales competentes de la Ciudad de México, renunciando al fuero de su domicilio.'],
    ['LEY APLICABLE', 'Este pagaré se rige por la Ley General de Títulos y Operaciones de Crédito (LGTOC) y demás disposiciones aplicables en los Estados Unidos Mexicanos.'],
  ]

  for (const [titulo, texto] of clausulas) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(30, 30, 30)
    doc.text(titulo, margin, y)
    y += 3.5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const tLines = doc.splitTextToSize(texto, contentW)
    doc.text(tLines, margin, y)
    y += tLines.length * 3.8 + 2
  }

  // Firmas
  if (y > 230) { doc.addPage(); y = 20 }
  y += 6
  const col1x = margin
  const col2x = W / 2 + 10
  const firmaY = y + 18

  doc.setDrawColor(50, 50, 50)
  doc.setLineWidth(0.4)
  doc.line(col1x, firmaY, col1x + 75, firmaY)
  doc.line(col2x, firmaY, col2x + 75, firmaY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)
  doc.text(data.clienteNombre, col1x + 37.5, firmaY + 4, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text('SUSCRIPTOR', col1x + 37.5, firmaY + 8, { align: 'center' })
  doc.text(`CURP: ${data.clienteCurp}`, col1x + 37.5, firmaY + 12, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)
  doc.text('PLINIUS INFRAESTRUCTURA EN FINANZAS AI', col2x + 37.5, firmaY + 4, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text('REPRESENTANTE LEGAL / TENEDOR', col2x + 37.5, firmaY + 8, { align: 'center' })

  doc.setFillColor(...AZUL)
  doc.rect(0, 272, W, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.text(`Folio ${data.folio} | Firmado en ${data.lugar}, el ${data.fecha}`, W / 2, 277, { align: 'center' })

  // ANEXO A — INE
  doc.addPage()
  y = 16
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, W, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('PLINIUS', margin, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Infraestructura en Finanzas AI, SAPI de C.V.', margin, 15)
  y = 30

  doc.setTextColor(...AZUL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('ANEXO A', W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(11)
  doc.text('IDENTIFICACIÓN OFICIAL DEL SUSCRIPTOR', W / 2, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text(`Credencial para Votar (INE) — ${data.clienteNombre}`, W / 2, y, { align: 'center' })
  y += 12

  const imgW = 160
  const imgH = 100
  const imgX = (W - imgW) / 2

  if (data.ineFrente) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...AZUL)
    doc.text('FRENTE', W / 2, y, { align: 'center' })
    y += 4
    doc.addImage(data.ineFrente, 'JPEG', imgX, y, imgW, imgH)
    y += imgH + 12
  }

  if (data.ineReverso) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...AZUL)
    doc.text('REVERSO', W / 2, y, { align: 'center' })
    y += 4
    doc.addImage(data.ineReverso, 'JPEG', imgX, y, imgW, imgH)
  }

  doc.setFillColor(...AZUL)
  doc.rect(0, 272, W, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.text(`Folio ${data.folio} | Anexo A — Identificación Oficial`, W / 2, 277, { align: 'center' })

  return doc.output('blob')
}
