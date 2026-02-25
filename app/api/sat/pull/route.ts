import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseCfdiXml } from "@/lib/sat/cfdiParse";
import { computeMetricsFromCfdi } from "@/lib/sat/metrics";

export const runtime = "nodejs";

function safeName(name: string) {
  return (name || "sat.zip").replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const form = await req.formData();

    const clientId = String(form.get("clientId") || "");
    if (!clientId) return NextResponse.json({ error: "Falta clientId" }, { status: 400 });

    // ✅ compat: ZIP mode
    const zipFiles = form.getAll("zipFiles").filter(Boolean);

    // ✅ compat: WS mode (lo que ya tenías)
    const fromDate = String(form.get("fromDate") || "");
    const toDate = String(form.get("toDate") || "");
    const tipo = String(form.get("tipo") || "emitidos") as "emitidos" | "recibidos";

    const cer = form.get("cer");
    const key = form.get("key");
    const password = String(form.get("password") || "");

    const isZipMode = zipFiles.length > 0;
    const isWsMode = cer instanceof File && key instanceof File && Boolean(password) && Boolean(fromDate) && Boolean(toDate);

    if (!isZipMode && !isWsMode) {
      return NextResponse.json(
        { error: "Faltan datos. Sube ZIP(s) (zipFiles) o usa e.firma (.cer/.key + password + fechas)." },
        { status: 400 }
      );
    }

    // 1) crea job
    const { data: job, error: jobErr } = await supabase
      .from("client_sat_jobs")
      .insert({
        client_id: clientId,
        status: "running",
        from_date: isWsMode ? fromDate : null,
        to_date: isWsMode ? toDate : null,
        tipo: isWsMode ? tipo : "zip_upload",
      })
      .select("id")
      .single();

    if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });
    const jobId = job.id as string;

    // 2) RFC del cliente
    const { data: client, error: cErr } = await supabase.from("clients").select("rfc").eq("id", clientId).single();
    if (cErr) throw new Error(cErr.message);
    const clientRfc = String(client?.rfc || "").trim().toUpperCase();
    if (!clientRfc) throw new Error("El cliente no tiene RFC en tabla clients.");

    // 3) obtener ZIP buffers
    let zipBuffers: Buffer[] = [];
    const storedPaths: string[] = [];

    if (isZipMode) {
      // ✅ ZIP upload: sube a Storage y parsea buffers locales
      for (const f of zipFiles) {
        if (!(f instanceof File)) continue;
        const buf = Buffer.from(await f.arrayBuffer());
        const name = safeName(f.name);
        const path = `${clientId}/${jobId}/${Date.now()}_${name}`;

        const { error: upErr } = await supabase.storage.from("sat-packages").upload(path, buf, {
          contentType: "application/zip",
          upsert: false,
        });
        if (upErr) throw new Error(`Storage upload error: ${upErr.message}`);

        storedPaths.push(path);
        zipBuffers.push(buf);
      }
    } else {
      // ✅ WS mode: aquí conectas descarga masiva real (futuro)
      // Por ahora NO rompe el endpoint: te da error claro sin tumbar tu app
      zipBuffers = await downloadSatPackagesViaWS({
        cer: cer as File,
        key: key as File,
        password,
        fromDate,
        toDate,
        tipo,
        rfcSolicitante: clientRfc,
      });
    }

    // 4) extraer XMLs
    const parsedRows: Array<{
      uuid: string;
      fecha: string;
      rfcEmisor: string;
      rfcReceptor: string;
      total: number;
      moneda: string | null;
      direction: "income" | "expense" | null;
      sourcePath: string | null;
    }> = [];

    let xmlCount = 0;

    // si es ZIP mode con múltiples zips, asociamos el sourcePath por zip
    const zipIndexToPath = (idx: number) => (storedPaths[idx] ? storedPaths[idx] : null);

    for (let i = 0; i < zipBuffers.length; i++) {
      const buf = zipBuffers[i];
      const zip = new AdmZip(buf);
      const entries = zip.getEntries();
      const sourcePath = isZipMode ? zipIndexToPath(i) : null;

      for (const e of entries) {
        if (!e.entryName.toLowerCase().endsWith(".xml")) continue;
        const xml = e.getData().toString("utf8");
        xmlCount++;

        const p = parseCfdiXml(xml);
        if (!p) continue;

        const emisor = String(p.rfcEmisor || "").trim().toUpperCase();
        const receptor = String(p.rfcReceptor || "").trim().toUpperCase();

        let direction: "income" | "expense" | null = null;
        if (emisor === clientRfc) direction = "income";
        else if (receptor === clientRfc) direction = "expense";

        parsedRows.push({
          uuid: p.uuid,
          fecha: p.fecha,
          rfcEmisor: emisor,
          rfcReceptor: receptor,
          total: p.total,
          moneda: p.moneda,
          direction,
          sourcePath,
        });
      }
    }

    // 5) upsert CFDI
    if (parsedRows.length) {
      const payload = parsedRows.map((p) => ({
        client_id: clientId,
        uuid: p.uuid,
        fecha: p.fecha,
        rfc_emisor: p.rfcEmisor,
        rfc_receptor: p.rfcReceptor,
        total: p.total,
        moneda: p.moneda,
        direction: p.direction,
        source_job_id: jobId,
        source_file_path: p.sourcePath,
      }));

      const { error: upErr } = await supabase.from("client_sat_cfdi").upsert(payload, { onConflict: "client_id,uuid" });
      if (upErr) throw new Error(upErr.message);
    }

    // 6) métricas
    const metrics = computeMetricsFromCfdi({
      clientRfc,
      cfdi: parsedRows.map((p) => ({
        fecha: p.fecha,
        rfcEmisor: p.rfcEmisor,
        rfcReceptor: p.rfcReceptor,
        total: p.total,
      })),
    });

    // Si tu tabla no tiene job_id, quítalo
    const { error: mErr } = await supabase.from("client_sat_metrics").insert({
      client_id: clientId,
      job_id: jobId,
      ...metrics,
    });
    if (mErr) throw new Error(mErr.message);

    // 7) job done + connectors
    const iso = new Date().toISOString();
    await supabase.from("client_sat_jobs").update({ status: "done", message: `XML: ${xmlCount} · CFDI: ${parsedRows.length}` }).eq("id", jobId);
    await supabase.from("client_connectors").update({ sat_status: "connected", sat_last_checked: iso, updated_at: iso }).eq("client_id", clientId);

    return NextResponse.json(
      {
        ok: true,
        mode: isZipMode ? "zip" : "ws",
        jobId,
        xmlCount,
        inserted: parsedRows.length,
        metrics,
        storedPaths,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

/**
 * FUTURO: conexión a Descarga Masiva (WS) usando e.firma.
 * No se implementa en MVP ZIP, pero dejamos el contrato.
 */
async function downloadSatPackagesViaWS(_args: {
  cer: File;
  key: File;
  password: string;
  fromDate: string;
  toDate: string;
  tipo: "emitidos" | "recibidos";
  rfcSolicitante: string;
}): Promise<Buffer[]> {
  throw new Error("WS SAT no implementado aún. MVP usa ZIP upload.");
}