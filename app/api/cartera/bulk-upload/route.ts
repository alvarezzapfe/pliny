// POST /api/cartera/bulk-upload — Upload masivo de créditos via Excel
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { validateMagicBytes, containsMacros, sanitizeCell, validateNumber, parseDate } from "@/lib/cartera/sanitize";
import { CreditoInputSchema } from "@/lib/cartera-gestion/zod-schema";
import { ESTATUS_VALUES, TIPO_CREDITO_VALUES, AMORTIZA_VALUES } from "@/lib/cartera-gestion/types";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_ROWS = 5000;

// Expected column headers (case-insensitive match)
const COLUMN_MAP: Record<string, string> = {
  deudor: "deudor",
  "razón social": "deudor",
  "razon social": "deudor",
  rfc: "rfc",
  sector: "sector",
  tipo: "tipo_credito",
  tipo_credito: "tipo_credito",
  "tipo de crédito": "tipo_credito",
  "tipo de credito": "tipo_credito",
  amortiza: "amortiza",
  monto_original: "monto_original",
  monto: "monto_original",
  "monto original": "monto_original",
  saldo_actual: "saldo_actual",
  saldo: "saldo_actual",
  "saldo actual": "saldo_actual",
  tasa_anual: "tasa_anual",
  tasa: "tasa_anual",
  "tasa anual": "tasa_anual",
  plazo_meses: "plazo_meses",
  plazo: "plazo_meses",
  garantia: "garantia",
  "garantía": "garantia",
  fecha_inicio: "fecha_inicio",
  "fecha inicio": "fecha_inicio",
  fecha_vencimiento: "fecha_vencimiento",
  vencimiento: "fecha_vencimiento",
  "fecha vencimiento": "fecha_vencimiento",
  dpd: "dpd",
  estatus: "estatus",
  notas: "notas",
};

function mapHeaders(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((h, i) => {
    const key = h.toLowerCase().trim().replace(/[_\s]+/g, " ").replace(/[_\s]+/g, "_");
    const normalizedKey = h.toLowerCase().trim();
    const mapped = COLUMN_MAP[normalizedKey] || COLUMN_MAP[key];
    if (mapped) mapping[i] = mapped;
  });
  return mapping;
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────
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

    // ── File validation ──────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Archivo excede ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx") {
      return NextResponse.json({ error: "Solo se aceptan archivos .xlsx" }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (!validateMagicBytes(buffer)) {
      return NextResponse.json({ error: "Archivo no es un XLSX válido" }, { status: 400 });
    }

    if (containsMacros(buffer)) {
      return NextResponse.json({ error: "Archivo contiene macros. Sube un archivo sin macros." }, { status: 400 });
    }

    // ── Parse Excel ──────────────────────────────────────
    const wb = XLSX.read(buffer, {
      cellFormula: false, cellHTML: false, cellStyles: false,
      bookVBA: false, bookFiles: false,
    });

    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) {
      return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
    }

    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    if (rawData.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    if (rawData.length > MAX_ROWS) {
      return NextResponse.json({ error: `Máximo ${MAX_ROWS} filas permitidas` }, { status: 400 });
    }

    // ── Map headers ──────────────────────────────────────
    const headers = Object.keys(rawData[0]);
    const headerMap = mapHeaders(headers);

    const mappedFields = Object.values(headerMap);
    if (!mappedFields.includes("deudor") || !mappedFields.includes("monto_original")) {
      return NextResponse.json({
        error: "Columnas requeridas no encontradas. Se necesita al menos: deudor, monto_original",
        headers_encontrados: headers,
      }, { status: 400 });
    }

    // ── Process rows ─────────────────────────────────────
    const results: { inserted: number; errors: { row: number; message: string }[] } = {
      inserted: 0,
      errors: [],
    };

    const inserts: Record<string, unknown>[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const raw = rawData[i];
      const excelRow = i + 2; // +1 for 0-index, +1 for header row

      try {
        // Map columns
        const mapped: Record<string, unknown> = {};
        for (const [origHeader, value] of Object.entries(raw)) {
          const colIdx = headers.indexOf(origHeader);
          const field = headerMap[colIdx];
          if (field) mapped[field] = value;
        }

        // Sanitize text fields
        const deudor = sanitizeCell(mapped.deudor);
        if (!deudor) {
          results.errors.push({ row: excelRow, message: "Deudor vacío" });
          continue;
        }

        const rfc = mapped.rfc ? sanitizeCell(mapped.rfc).toUpperCase() : null;
        const sector = mapped.sector ? sanitizeCell(mapped.sector) : null;
        const garantia = mapped.garantia ? sanitizeCell(mapped.garantia) : null;
        const notas = mapped.notas ? sanitizeCell(mapped.notas) : null;

        // Validate numbers
        const montoOriginal = validateNumber(mapped.monto_original, 0.01, 1e12);
        if (montoOriginal == null) {
          results.errors.push({ row: excelRow, message: "Monto original inválido o vacío" });
          continue;
        }

        const saldoActual = validateNumber(mapped.saldo_actual, 0, 1e12) ?? montoOriginal;
        const tasaAnual = validateNumber(mapped.tasa_anual, 0, 200);
        const plazoMeses = validateNumber(mapped.plazo_meses, 1, 600);
        const dpd = validateNumber(mapped.dpd, 0, 99999) ?? 0;

        // Dates
        const fechaInicio = parseDate(mapped.fecha_inicio);
        const fechaVencimiento = parseDate(mapped.fecha_vencimiento);

        // Tipo credito
        let tipoCredito = "Crédito simple";
        if (mapped.tipo_credito) {
          const raw = sanitizeCell(mapped.tipo_credito);
          if (TIPO_CREDITO_VALUES.includes(raw as any)) {
            tipoCredito = raw;
          }
        }

        // Amortiza
        let amortiza = "SI";
        if (mapped.amortiza) {
          const raw = sanitizeCell(mapped.amortiza).toUpperCase();
          if (AMORTIZA_VALUES.includes(raw as any)) {
            amortiza = raw;
          }
        }

        // Estatus
        let estatus = "vigente";
        if (mapped.estatus) {
          const raw = sanitizeCell(mapped.estatus).toLowerCase();
          if (ESTATUS_VALUES.includes(raw as any)) {
            estatus = raw;
          }
        }

        // Build payload and validate with zod
        const payload = {
          deudor,
          rfc: rfc || undefined,
          sector: sector || undefined,
          tipo_credito: tipoCredito,
          amortiza,
          monto_original: montoOriginal,
          saldo_actual: saldoActual,
          tasa_anual: tasaAnual,
          plazo_meses: plazoMeses != null ? Math.round(plazoMeses) : undefined,
          garantia: garantia || undefined,
          fecha_inicio: fechaInicio,
          fecha_vencimiento: fechaVencimiento,
          dpd: Math.round(dpd),
          estatus,
          notas: notas || undefined,
        };

        const parsed = CreditoInputSchema.safeParse(payload);
        if (!parsed.success) {
          const firstErr = parsed.error.errors[0];
          results.errors.push({
            row: excelRow,
            message: `${firstErr.path.join(".")}: ${firstErr.message}`,
          });
          continue;
        }

        inserts.push({
          ...parsed.data,
          created_by: userData.user.id,
          fuente: "excel",
        });
      } catch (err) {
        results.errors.push({ row: excelRow, message: "Error procesando fila" });
      }
    }

    // ── Bulk insert ──────────────────────────────────────
    if (inserts.length > 0) {
      const { error: dbError } = await sb
        .from("credits")
        .insert(inserts);

      if (dbError) {
        console.error("[bulk-upload] DB error:", dbError);
        return NextResponse.json({
          error: `Error al insertar: ${dbError.message}`,
          parsed_ok: inserts.length,
          errors: results.errors.slice(0, 20),
        }, { status: 500 });
      }

      results.inserted = inserts.length;
    }

    return NextResponse.json({
      inserted: results.inserted,
      total_rows: rawData.length,
      errors: results.errors.slice(0, 50),
      errors_count: results.errors.length,
    }, { status: results.inserted > 0 ? 201 : 400 });
  } catch (err) {
    console.error("[bulk-upload] Unhandled:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
