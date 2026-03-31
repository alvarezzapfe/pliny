// app/api/pagares/docx/route.ts
// Genera el pagaré en Word (.docx) server-side
// Requiere: npm install docx (ya instalado)

import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageBreak, ImageRun, UnderlineType,
} from 'docx'

const AZUL = "1B3A6B"
const AZUL_CLR = "EBF0FA"

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const borderNone = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
const borderThin = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" }
const borderMed  = { style: BorderStyle.SINGLE, size: 8, color: "333333" }
const noBorders  = { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone }
const allBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin }

function bold(text: string, size = 18, color = "1E2A3A") {
  return new TextRun({ text, bold: true, size, font: "Arial", color })
}
function normal(text: string, size = 18, color = "1E2A3A") {
  return new TextRun({ text, size, font: "Arial", color })
}
function small(text: string, size = 16, color = "888888") {
  return new TextRun({ text, size, font: "Arial", color })
}

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: allBorders,
    shading: { fill: AZUL, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 16, color: "FFFFFF", font: "Arial" })]
    })]
  })
}

function dataCell(text: string, width: number, align: AlignmentType = AlignmentType.CENTER, shade = "F5F7FA") {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: allBorders,
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text), size: 16, font: "Arial", color: "1E2A3A" })]
    })]
  })
}

function labelCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: allBorders,
    shading: { fill: AZUL_CLR, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ children: [bold(text, 17, AZUL)] })]
  })
}

function valueCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: allBorders,
    shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ children: [normal(text, 17)] })]
  })
}

function hrLine() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 1 } },
    children: [new TextRun("")],
    spacing: { before: 60, after: 60 }
  })
}

function spacer(pts = 120) {
  return new Paragraph({ children: [new TextRun("")], spacing: { before: pts } })
}

function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 180, after: 60 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: AZUL, font: "Arial" })]
  })
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fechaVencCuota(fechaBase: string, n: number): string {
  const [y, m, d] = fechaBase.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  base.setMonth(base.getMonth() + n)
  return `${base.getDate()} de ${MESES[base.getMonth()]} de ${base.getFullYear()}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      folio, fecha, vencimiento, lugar,
      clienteNombre, clienteCurp, clienteClaveElector, clienteDomicilio,
      monto, tasaMensual, plazoMeses, metodoInteres,
      cuotaMensual, totalIntereses, totalPagar,
      tabla,
      ineFrente,   // base64 string opcional
      ineReverso,  // base64 string opcional
      fechaIso,    // YYYY-MM-DD para calcular fechas
    } = body

    const children: any[] = []

    // ── ENCABEZADO ────────────────────────────────────────────────────────────
    children.push(
      new Table({
        width: { size: 10240, type: WidthType.DXA },
        columnWidths: [7000, 3240],
        rows: [new TableRow({
          children: [
            new TableCell({
              borders: noBorders, width: { size: 7000, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: "PLINIUS", bold: true, size: 48, color: AZUL, font: "Arial" })] }),
                new Paragraph({ children: [small("Infraestructura en Finanzas AI, SAPI de C.V.", 18, "555555")] }),
              ]
            }),
            new TableCell({
              borders: noBorders, width: { size: 3240, type: WidthType.DXA },
              verticalAlign: VerticalAlign.BOTTOM,
              children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [small(`${lugar}`, 16)] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [small(`Fecha: ${fecha}`, 16)] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [small(`Vence: ${vencimiento}`, 16)] }),
              ]
            })
          ]
        })]
      }),
      hrLine(),
      spacer(80),
    )

    // ── TÍTULO ────────────────────────────────────────────────────────────────
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text: "P A G A R É", bold: true, size: 40, color: AZUL, font: "Arial",
          underline: { type: UnderlineType.SINGLE, color: AZUL } })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [small(`No. ${folio}`, 18)]
      }),
    )

    // ── MONTO DESTACADO ───────────────────────────────────────────────────────
    children.push(
      new Table({
        width: { size: 10240, type: WidthType.DXA },
        columnWidths: [10240],
        rows: [new TableRow({
          children: [new TableCell({
            width: { size: 10240, type: WidthType.DXA },
            borders: { top: borderMed, bottom: borderMed, left: borderMed, right: borderMed },
            shading: { fill: AZUL_CLR, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `$${fmt(monto)} M.N.`, bold: true, size: 48, color: AZUL, font: "Arial" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [normal(`(${numberToWords(monto)})`, 18)] }),
            ]
          })]
        })]
      }),
      spacer(120),
    )

    // ── TEXTO LEGAL ───────────────────────────────────────────────────────────
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 60, after: 120 },
        children: [
          normal("Yo, "), bold(clienteNombre),
          normal(", con Clave de Elector "), bold(clienteClaveElector),
          normal(", CURP "), bold(clienteCurp),
          normal(", con domicilio en "), bold(clienteDomicilio),
          normal(", en mi carácter de suscriptor, de manera incondicional e irrevocable me obligo a pagar a la orden de "),
          bold("PLINIUS INFRAESTRUCTURA EN FINANZAS AI, SAPI DE C.V."),
          normal(", o a quien sus derechos represente (\"el Tenedor\"), la cantidad de "),
          bold(`$${fmt(monto)} M.N. (${numberToWords(monto)})`),
          normal(", que recibo como crédito simple personal en "),
          bold("Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, Sky Lobby B, Lomas de Chapultepec I, C.P. 11000, CDMX"),
          normal("."),
        ]
      }),
    )

    // ── CONDICIONES ───────────────────────────────────────────────────────────
    children.push(sectionTitle("I. Condiciones del Crédito"))
    children.push(
      new Table({
        width: { size: 10240, type: WidthType.DXA },
        columnWidths: [3500, 6740],
        rows: [
          ["Tipo de crédito",      "Crédito Simple Personal"],
          ["Monto del crédito",    `$${fmt(monto)} M.N.`],
          ["Tasa de interés",      `${tasaMensual}% neto mensual (${metodoInteres === 'flat' ? 'Flat — interés fijo sobre capital original' : 'sobre saldo insoluto'})`],
          ["Plazo",                `${plazoMeses} meses`],
          ["Cuota mensual",        `$${fmt(cuotaMensual)} M.N. (fija)`],
          ["Total intereses",      `$${fmt(totalIntereses)} M.N.`],
          ["Total a pagar",        `$${fmt(totalPagar)} M.N.`],
          ["Fecha de disposición", fecha],
          ["Fecha de vencimiento", vencimiento],
          ["Lugar de pago",        "Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, CDMX"],
        ].map(([label, val]) => new TableRow({
          children: [labelCell(label, 3500), valueCell(val, 6740)]
        }))
      }),
      spacer(120),
    )

    // ── AMORTIZACIÓN ──────────────────────────────────────────────────────────
    children.push(sectionTitle("II. Tabla de Amortización"))
    children.push(
      new Table({
        width: { size: 10240, type: WidthType.DXA },
        columnWidths: [1040, 1800, 2100, 2100, 2100, 2100],
        rows: [
          new TableRow({
            children: [
              headerCell("No.", 1040),
              headerCell("Vencimiento", 1800),
              headerCell("Capital ($)", 2100),
              headerCell("Interés ($)", 2100),
              headerCell("Cuota Total ($)", 2100),
              headerCell("Saldo ($)", 2100),
            ]
          }),
          ...tabla.map((r: any, idx: number) => new TableRow({
            children: [
              dataCell(String(r.n), 1040, AlignmentType.CENTER, idx % 2 === 0 ? "FFFFFF" : "F5F7FA"),
              dataCell(r.fecha, 1800, AlignmentType.CENTER, idx % 2 === 0 ? "FFFFFF" : "F5F7FA"),
              dataCell(`$${fmt(r.capital)}`, 2100, AlignmentType.RIGHT, idx % 2 === 0 ? "FFFFFF" : "F5F7FA"),
              dataCell(`$${fmt(r.interes)}`, 2100, AlignmentType.RIGHT, idx % 2 === 0 ? "FFFFFF" : "F5F7FA"),
              dataCell(`$${fmt(r.cuota)}`, 2100, AlignmentType.RIGHT, idx % 2 === 0 ? "FFFFFF" : "F5F7FA"),
              dataCell(`$${fmt(Math.max(0, r.saldo))}`, 2100, AlignmentType.RIGHT, idx % 2 === 0 ? "FFFFFF" : "F5F7FA"),
            ]
          })),
          // Totales
          new TableRow({
            children: [
              new TableCell({ width: { size: 1040, type: WidthType.DXA }, borders: allBorders, shading: { fill: AZUL_CLR, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold("", 16, AZUL)] })] }),
              new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: allBorders, shading: { fill: AZUL_CLR, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold("TOTALES", 16, AZUL)] })] }),
              dataCell(`$${fmt(monto)}`, 2100, AlignmentType.RIGHT, AZUL_CLR),
              dataCell(`$${fmt(totalIntereses)}`, 2100, AlignmentType.RIGHT, AZUL_CLR),
              dataCell(`$${fmt(totalPagar)}`, 2100, AlignmentType.RIGHT, AZUL_CLR),
              dataCell("—", 2100, AlignmentType.CENTER, AZUL_CLR),
            ]
          })
        ]
      }),
      spacer(120),
    )

    // ── CLÁUSULAS ─────────────────────────────────────────────────────────────
    children.push(sectionTitle("III. Cláusulas"))
    const clausulas = [
      ["INTERESES MORATORIOS", `En caso de incumplimiento, el suscriptor pagará intereses moratorios al doble de la tasa pactada (${tasaMensual * 2}% mensual) sobre el monto vencido, desde la fecha de incumplimiento hasta el pago efectivo.`],
      ["VENCIMIENTO ANTICIPADO", "El Tenedor podrá declarar vencido anticipadamente este pagaré por: (i) incumplimiento de una o más cuotas; (ii) falsedad de la información; o (iii) apertura de concurso mercantil del suscriptor."],
      ["GASTOS Y COSTAS", "Todos los gastos, costas y honorarios derivados del cobro serán a cargo del suscriptor."],
      ["JURISDICCIÓN", "Para interpretación y cumplimiento, el suscriptor se somete a los Tribunales competentes de la Ciudad de México, renunciando al fuero de su domicilio."],
      ["LEY APLICABLE", "Este pagaré se rige por la Ley General de Títulos y Operaciones de Crédito (LGTOC) y demás disposiciones aplicables en los Estados Unidos Mexicanos."],
    ]
    for (const [titulo, texto] of clausulas) {
      children.push(
        new Paragraph({ spacing: { before: 80, after: 20 }, children: [bold(titulo, 17)] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 60 }, children: [normal(texto, 17)] }),
      )
    }

    // ── FIRMAS ────────────────────────────────────────────────────────────────
    children.push(spacer(160))
    children.push(hrLine())
    children.push(spacer(60))
    children.push(
      new Table({
        width: { size: 10240, type: WidthType.DXA },
        columnWidths: [4500, 1240, 4500],
        rows: [new TableRow({
          children: [
            new TableCell({
              borders: noBorders, width: { size: 4500, type: WidthType.DXA },
              children: [
                new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: "333333" } }, children: [new TextRun("")] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [bold(clienteNombre, 17)] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [small("SUSCRIPTOR", 16)] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [small(`CURP: ${clienteCurp}`, 15)] }),
              ]
            }),
            new TableCell({ borders: noBorders, width: { size: 1240, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("")] })] }),
            new TableCell({
              borders: noBorders, width: { size: 4500, type: WidthType.DXA },
              children: [
                new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: "333333" } }, children: [new TextRun("")] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [bold("PLINIUS INFRAESTRUCTURA EN FINANZAS AI", 17)] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [small("REPRESENTANTE LEGAL / TENEDOR", 16)] }),
              ]
            }),
          ]
        })]
      }),
      spacer(80),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [small(`Firmado en ${lugar}, el ${fecha}`, 16)] }),
    )

    // ── ANEXO A — INE ─────────────────────────────────────────────────────────
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "PLINIUS", bold: true, size: 36, color: AZUL, font: "Arial" })] }),
    )
    children.push(hrLine())
    children.push(spacer(80))
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 40 }, children: [new TextRun({ text: "ANEXO A", bold: true, size: 30, color: AZUL, font: "Arial", underline: { type: UnderlineType.SINGLE } })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 }, children: [bold("IDENTIFICACIÓN OFICIAL DEL SUSCRIPTOR", 22)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 }, children: [normal(`Credencial para Votar (INE) — ${clienteNombre}`, 18)] }),
    )

    // INE Frente
    if (ineFrente) {
      const imgBuffer = Buffer.from(ineFrente, 'base64')
      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 20 }, children: [bold("FRENTE", 17)] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [new ImageRun({ data: imgBuffer, transformation: { width: 480, height: 300 }, type: "jpg" })]
        }),
      )
    }

    // INE Reverso
    if (ineReverso) {
      const imgBuffer = Buffer.from(ineReverso, 'base64')
      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 20 }, children: [bold("REVERSO", 17)] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [new ImageRun({ data: imgBuffer, transformation: { width: 480, height: 300 }, type: "jpg" })]
        }),
      )
    }

    children.push(
      hrLine(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 0 }, children: [small(`Documento recopilado como parte del expediente de crédito ${folio}`, 15)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 20, after: 0 }, children: [small("Plinius Infraestructura en Finanzas AI, SAPI de C.V. | Torre Esmeralda III, Blvd. Manuel Ávila Camacho 32, CDMX", 15)] }),
    )

    // ── BUILD DOCX ────────────────────────────────────────────────────────────
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
          }
        },
        children,
      }]
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="pagare_${folio}.docx"`,
      }
    })

  } catch (err: any) {
    console.error('DOCX generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Convierte número a palabras (básico para montos comunes en MXN)
function numberToWords(n: number): string {
  const map: Record<number, string> = {
    1000: "MIL PESOS 00/100 MONEDA NACIONAL",
    2000: "DOS MIL PESOS 00/100 MONEDA NACIONAL",
    3000: "TRES MIL PESOS 00/100 MONEDA NACIONAL",
    4000: "CUATRO MIL PESOS 00/100 MONEDA NACIONAL",
    5000: "CINCO MIL PESOS 00/100 MONEDA NACIONAL",
    6000: "SEIS MIL PESOS 00/100 MONEDA NACIONAL",
    7000: "SIETE MIL PESOS 00/100 MONEDA NACIONAL",
    8000: "OCHO MIL PESOS 00/100 MONEDA NACIONAL",
    9000: "NUEVE MIL PESOS 00/100 MONEDA NACIONAL",
    10000: "DIEZ MIL PESOS 00/100 MONEDA NACIONAL",
    15000: "QUINCE MIL PESOS 00/100 MONEDA NACIONAL",
    20000: "VEINTE MIL PESOS 00/100 MONEDA NACIONAL",
    25000: "VEINTICINCO MIL PESOS 00/100 MONEDA NACIONAL",
    30000: "TREINTA MIL PESOS 00/100 MONEDA NACIONAL",
    50000: "CINCUENTA MIL PESOS 00/100 MONEDA NACIONAL",
  }
  return map[n] ?? `${n.toLocaleString('es-MX')} PESOS 00/100 MONEDA NACIONAL`
}
