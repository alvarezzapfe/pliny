// GET /api/cartera/plantilla — Descarga plantilla Excel para carga masiva
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const HEADERS = [
  "deudor",
  "rfc",
  "sector",
  "tipo_credito",
  "amortiza",
  "monto_original",
  "saldo_actual",
  "tasa_anual",
  "plazo_meses",
  "garantia",
  "fecha_inicio",
  "fecha_vencimiento",
  "dpd",
  "estatus",
  "notas",
];

const SAMPLE_ROWS = [
  [
    "Empresa Demo SA de CV", "EMP123456ABC", "Comercio",
    "Crédito simple", "SI", 1500000, 1500000, 25, 36,
    "Hipotecaria", "2026-01-15", "2029-01-15", 0, "vigente", "",
  ],
  [
    "Constructora Norte SA", "CNO987654XYZ", "Construcción",
    "Arrendamiento financiero", "BULLET", 3000000, 2800000, 18.5, 48,
    "Prendaria", "2025-06-01", "2029-06-01", 15, "mora_30", "Cliente referido",
  ],
];

export async function GET(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  // Build workbook
  const wb = XLSX.utils.book_new();
  const data = [HEADERS, ...SAMPLE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = HEADERS.map(h => ({
    wch: Math.max(h.length + 4, 16),
  }));

  XLSX.utils.book_append_sheet(wb, ws, "Cartera");

  // Instructions sheet
  const instrData = [
    ["Plantilla de Carga Masiva — Plinius Cartera"],
    [""],
    ["Columnas requeridas:"],
    ["  deudor — Razón social del deudor (obligatorio)"],
    ["  monto_original — Monto desembolsado en MXN (obligatorio)"],
    [""],
    ["Columnas opcionales:"],
    ["  rfc — RFC del deudor (13 caracteres)"],
    ["  sector — Sector económico"],
    ["  tipo_credito — Crédito simple | Crédito revolvente | Arrendamiento puro | Arrendamiento financiero"],
    ["  amortiza — SI | BULLET | NO (default: SI)"],
    ["  saldo_actual — Saldo vigente en MXN (default: monto_original)"],
    ["  tasa_anual — Tasa nominal anual en porcentaje (ej: 25)"],
    ["  plazo_meses — Plazo total en meses"],
    ["  garantia — Descripción de la garantía"],
    ["  fecha_inicio — Fecha de originación (YYYY-MM-DD)"],
    ["  fecha_vencimiento — Fecha de vencimiento (YYYY-MM-DD)"],
    ["  dpd — Días de mora (default: 0)"],
    ["  estatus — vigente | mora_30 | mora_60 | mora_90 | liquidado | castigado (default: vigente)"],
    ["  notas — Notas internas"],
    [""],
    ["Límites:"],
    ["  Máximo 5,000 filas por archivo"],
    ["  Máximo 8 MB por archivo"],
    ["  Solo formato .xlsx (sin macros)"],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instrucciones");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=plantilla_cartera_plinius.xlsx",
      "Cache-Control": "private, no-store",
    },
  });
}
