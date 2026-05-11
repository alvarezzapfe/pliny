// POST /api/calculadora/cartera/upload — Upload, validate, persist cartera Excel
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServiceClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/cartera/rate-limit";
import { validateMagicBytes, containsMacros, hashBuffer } from "@/lib/cartera/sanitize";
import { parseRawRow, validateRows, applyDefaults } from "@/lib/cartera/zod-schema";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_ROWS = 50_000;

export async function POST(req: NextRequest) {
  try {
    // 1. Auth — verify Supabase session
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const sbUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await sbUser.auth.getUser(token);
    if (!userData?.user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }
    const userId = userData.user.id;

    // 2. Rate limiting
    const rl = checkRateLimit(userId);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Límite de uploads excedido. Máximo 10 por hora." }, { status: 429 });
    }

    // 3. Extract file from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const discountRateRaw = formData.get("discount_rate");

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const discountRate = Number(discountRateRaw);
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 1) {
      return NextResponse.json({ error: "discount_rate requerido (0–1)" }, { status: 400 });
    }

    // 4. Size validation BEFORE reading into memory
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Archivo excede 8 MB" }, { status: 400 });
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx") {
      return NextResponse.json({ error: "Formato inválido. Solo se aceptan archivos .xlsx" }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // 5. Magic bytes validation
    if (!validateMagicBytes(buffer)) {
      return NextResponse.json({ error: "Formato inválido. Solo se aceptan archivos .xlsx" }, { status: 400 });
    }

    // 6. Macro check
    if (containsMacros(buffer)) {
      return NextResponse.json({ error: "Archivos con macros no son permitidos" }, { status: 400 });
    }

    // 7. Parse with SheetJS (strict flags — all disabled for security)
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      bookVBA: false,
      bookFiles: false,
      dense: true,
    });

    // Find "Cartera" sheet
    const sheetName = workbook.SheetNames.find(n => n.toLowerCase() === "cartera");
    if (!sheetName) {
      return NextResponse.json({ error: "El archivo debe contener una hoja llamada 'Cartera'" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // 8. Row limit
    const dataRows = rawData.slice(1).filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== ""));
    if (dataRows.length > MAX_ROWS) {
      return NextResponse.json({ error: `Máximo ${MAX_ROWS.toLocaleString()} filas permitidas` }, { status: 400 });
    }

    if (dataRows.length === 0) {
      return NextResponse.json({ error: "El archivo no contiene datos (solo headers)" }, { status: 400 });
    }

    // 9. Parse and validate with Zod
    const parsedRows = dataRows.map(row => parseRawRow(row as unknown[]));
    const { valid, errors } = validateRows(parsedRows);

    if (errors.length > 0 && valid.length === 0) {
      return NextResponse.json({
        error: "Errores de validación",
        errors: errors.slice(0, 100),
        valid_count: 0,
        error_count: errors.length,
      }, { status: 422 });
    }

    // If partial errors, still reject (strict mode)
    if (errors.length > 0) {
      return NextResponse.json({
        error: "Errores de validación",
        errors: errors.slice(0, 100),
        valid_count: valid.length,
        error_count: errors.length,
        message: `${errors.length} fila(s) con errores. Corrige y vuelve a subir.`,
      }, { status: 422 });
    }

    // 10. Apply defaults (PD/LGD by sector, infer fecha_originacion)
    const enriched = valid.map(applyDefaults);

    // 11. Persist — service role client
    const sb = createServiceClient();

    // Insert parent valuación
    const { data: valuacion, error: valErr } = await sb
      .from("cartera_valuaciones")
      .insert({
        user_id: userId,
        nombre: file.name.slice(0, 200),
        discount_rate: discountRate,
        n_creditos: enriched.length,
        saldo_total_mxn: enriched.reduce((s, r) => s + (r.saldo_insoluto_mxn ?? 0), 0),
        status: "processing", // Will be updated to 'completed' after calculation engine runs
      })
      .select("id")
      .single();

    if (valErr || !valuacion) {
      console.error("[upload] valuacion insert error:", valErr?.message);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }

    // Insert credit rows
    const creditRows = enriched.map(r => ({
      valuacion_id: valuacion.id,
      folio_credito: r.folio_credito,
      deudor: r.deudor,
      sector: r.sector,
      tipo_credito: r.tipo_credito,
      monto_original_mxn: r.monto_original_mxn,
      saldo_insoluto_mxn: r.saldo_insoluto_mxn,
      tasa_nominal_anual: r.tasa_nominal_anual,
      fecha_originacion: r.fecha_originacion,
      fecha_vencimiento: r.fecha_vencimiento,
      plazo_meses_original: r.plazo_meses_original,
      periodicidad_pago: r.periodicidad_pago,
      dpd: r.dpd,
      pd: r.pd,
      lgd: r.lgd,
      garantia_tipo: r.garantia_tipo,
      garantia_valor_mxn: r.garantia_valor_mxn,
      pd_lgd_source: r.pd_lgd_source,
      originacion_inferred: r.originacion_inferred,
      // Calculated fields left NULL for now (entregable 3)
      npv: null,
      ytm: null,
      duration_macaulay: null,
      duration_modified: null,
      wal: null,
      expected_loss: null,
      risk_adjusted_npv: null,
      schedule: null,
    }));

    const { error: credErr } = await sb
      .from("cartera_valuaciones_creditos")
      .insert(creditRows);

    if (credErr) {
      // Rollback: delete parent valuación to avoid orphan
      // (Supabase JS client doesn't support multi-statement transactions natively)
      console.error("[upload] creditos insert error, rolling back:", credErr.message);
      await sb.from("cartera_valuaciones").delete().eq("id", valuacion.id);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }

    // 12. Audit log — service role write
    const sha256 = hashBuffer(buffer);
    await sb.from("audit_log").insert({
      user_id: userId,
      event_type: "cartera_upload",
      metadata: {
        filename: file.name.slice(0, 200),
        sha256,
        n_rows: enriched.length,
        n_errors: 0,
        valuacion_id: valuacion.id,
        file_size_bytes: buffer.length,
      },
    });

    return NextResponse.json({
      ok: true,
      valuacion_id: valuacion.id,
      n_creditos: enriched.length,
      status: "processing",
      message: "Cartera subida exitosamente. Los cálculos se procesarán en el siguiente paso.",
    }, { status: 201 });

  } catch (err) {
    console.error("[upload] Unhandled error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
