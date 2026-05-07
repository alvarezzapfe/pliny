// lib/cartera/plantilla-generator.ts — Genera plantilla Excel con exceljs
import ExcelJS from "exceljs";

const COLUMNS = [
  { key: "folio_credito",       header: "folio_credito",       width: 18 },
  { key: "deudor",              header: "deudor",              width: 25 },
  { key: "sector",              header: "sector",              width: 14 },
  { key: "tipo_credito",        header: "tipo_credito",        width: 16 },
  { key: "monto_original_mxn",  header: "monto_original_mxn",  width: 20 },
  { key: "saldo_insoluto_mxn",  header: "saldo_insoluto_mxn",  width: 20 },
  { key: "tasa_nominal_anual",  header: "tasa_nominal_anual",  width: 18 },
  { key: "fecha_originacion",   header: "fecha_originacion",   width: 16 },
  { key: "fecha_vencimiento",   header: "fecha_vencimiento",   width: 16 },
  { key: "plazo_meses_original",header: "plazo_meses_original",width: 20 },
  { key: "periodicidad_pago",   header: "periodicidad_pago",   width: 16 },
  { key: "dpd",                 header: "dpd",                 width: 8 },
  { key: "pd",                  header: "pd",                  width: 8 },
  { key: "lgd",                 header: "lgd",                 width: 8 },
  { key: "garantia_tipo",       header: "garantia_tipo",       width: 16 },
  { key: "garantia_valor_mxn",  header: "garantia_valor_mxn",  width: 18 },
];

const SECTORES = ["Agro", "Comercio", "Industria", "Servicios", "Inmobiliario", "Transporte", "Otro"];
const TIPOS = ["Term Loan", "Revolvente", "Arrend. Puro", "Arrend. Fin."];
const PERIODICIDADES = ["Mensual", "Bimestral", "Trimestral", "Semestral", "Anual", "Bullet"];

const SAMPLE_DATA = [
  { folio_credito: "CR-001", deudor: "Agrícola del Norte SA", sector: "Agro", tipo_credito: "Term Loan", monto_original_mxn: 5000000, saldo_insoluto_mxn: 3200000, tasa_nominal_anual: 0.15, fecha_originacion: "2024-03-15", fecha_vencimiento: "2027-03-15", plazo_meses_original: 36, periodicidad_pago: "Mensual", dpd: 0, pd: 0.04, lgd: 0.45, garantia_tipo: "Hipotecaria", garantia_valor_mxn: 8000000 },
  { folio_credito: "CR-002", deudor: "Comercializadora Express", sector: "Comercio", tipo_credito: "Revolvente", monto_original_mxn: 2000000, saldo_insoluto_mxn: 1500000, tasa_nominal_anual: 0.22, fecha_originacion: "2025-01-10", fecha_vencimiento: "2027-01-10", plazo_meses_original: 24, periodicidad_pago: "Mensual", dpd: 15, pd: 0.08, lgd: 0.55, garantia_tipo: "Prendaria", garantia_valor_mxn: 1000000 },
  { folio_credito: "CR-003", deudor: "Industrias del Pacífico", sector: "Industria", tipo_credito: "Arrend. Fin.", monto_original_mxn: 12000000, saldo_insoluto_mxn: 9800000, tasa_nominal_anual: 0.13, fecha_originacion: "2024-06-01", fecha_vencimiento: "2028-06-01", plazo_meses_original: 48, periodicidad_pago: "Trimestral", dpd: 0, pd: 0.03, lgd: 0.35, garantia_tipo: "Maquinaria", garantia_valor_mxn: 15000000 },
];

const INSTRUCTIONS = [
  ["Campo", "Tipo", "Descripción / Rango válido"],
  ["folio_credito", "Texto", "Identificador único del crédito. Obligatorio."],
  ["deudor", "Texto", "Nombre del acreditado. Obligatorio."],
  ["sector", "Enum", "Agro, Comercio, Industria, Servicios, Inmobiliario, Transporte, Otro"],
  ["tipo_credito", "Enum", "Term Loan, Revolvente, Arrend. Puro, Arrend. Fin."],
  ["monto_original_mxn", "Número", "Monto original del crédito en MXN. > 0."],
  ["saldo_insoluto_mxn", "Número", "Saldo vigente en MXN. >= 0."],
  ["tasa_nominal_anual", "Decimal", "Tasa anual como decimal. Ej: 0.18 = 18%."],
  ["fecha_originacion", "Fecha", "YYYY-MM-DD. Opcional si plazo_meses_original está presente."],
  ["fecha_vencimiento", "Fecha", "YYYY-MM-DD. Obligatorio. Debe ser >= hoy."],
  ["plazo_meses_original", "Entero", "Plazo original en meses. > 0."],
  ["periodicidad_pago", "Enum", "Mensual, Bimestral, Trimestral, Semestral, Anual, Bullet"],
  ["dpd", "Entero", "Días past due (mora). >= 0."],
  ["pd", "Decimal", "Probabilidad de default. 0–1. Si vacío se estima por sector."],
  ["lgd", "Decimal", "Loss given default. 0–1. Si vacío se estima por sector."],
  ["garantia_tipo", "Texto", "Tipo de garantía. Opcional."],
  ["garantia_valor_mxn", "Número", "Valor de la garantía en MXN. Opcional. >= 0."],
];

export async function generatePlantilla(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Plinius";
  workbook.created = new Date();

  // Sheet 1: Cartera
  const ws = workbook.addWorksheet("Cartera");
  ws.columns = COLUMNS.map(c => ({ key: c.key, header: c.header, width: c.width }));

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  headerRow.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
  headerRow.commit();

  // Protect header row (soft lock, no password)
  ws.protect("", { formatCells: true, formatColumns: true, insertRows: true, deleteRows: true, sort: true, autoFilter: true });
  // Unprotect data rows by making them editable
  for (let r = 2; r <= 50001; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 16; c++) {
      row.getCell(c).protection = { locked: false };
    }
    if (r <= 4) row.commit(); // Only commit sample rows, rest are lazy
  }

  // Sample data (rows 2-4)
  for (const sample of SAMPLE_DATA) {
    ws.addRow(sample);
  }

  // Data validations for enum columns
  // Sector (column C, rows 2-50001)
  for (let r = 2; r <= 50001; r++) {
    ws.getCell(`C${r}`).dataValidation = { type: "list", formulae: [`"${SECTORES.join(",")}"`], showErrorMessage: true, errorTitle: "Sector inválido", error: "Selecciona un sector válido" };
    ws.getCell(`D${r}`).dataValidation = { type: "list", formulae: [`"${TIPOS.join(",")}"`], showErrorMessage: true, errorTitle: "Tipo inválido", error: "Selecciona un tipo válido" };
    ws.getCell(`K${r}`).dataValidation = { type: "list", formulae: [`"${PERIODICIDADES.join(",")}"`], showErrorMessage: true, errorTitle: "Periodicidad inválida", error: "Selecciona periodicidad válida" };
    if (r > 100) break; // Limit validations to avoid huge file (Excel inherits for the rest)
  }

  // Sheet 2: Instrucciones
  const instrWs = workbook.addWorksheet("Instrucciones");
  for (const [i, row] of INSTRUCTIONS.entries()) {
    const r = instrWs.addRow(row);
    if (i === 0) {
      r.font = { bold: true };
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }
  }
  instrWs.getColumn(1).width = 22;
  instrWs.getColumn(2).width = 10;
  instrWs.getColumn(3).width = 60;
  instrWs.addRow([]);
  instrWs.addRow(["IMPORTANTE: No modificar la fila 1 de headers en la hoja 'Cartera'."]);

  // Sheet 3: Validaciones (hidden)
  const valWs = workbook.addWorksheet("Validaciones");
  valWs.state = "veryHidden";
  valWs.getColumn(1).values = ["Sectores", ...SECTORES];
  valWs.getColumn(2).values = ["Tipos", ...TIPOS];
  valWs.getColumn(3).values = ["Periodicidades", ...PERIODICIDADES];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
