import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseCfdiXml } from "@/lib/sat/cfdiParse";
import { computeMetricsFromCfdi } from "@/lib/sat/metrics";

// ✅ SAT WS
import { Fiel } from "@nodecfdi/credentials";
import {
  HttpsWebClient,
  FielRequestBuilder,
  Service,
  QueryParameters,
  DateTimePeriod,
  DownloadType,
  RequestType,
} from "@nodecfdi/sat-ws-descarga-masiva";

export const runtime = "nodejs";

type PullArgs = {
  cer: File;
  key: File;
  password: string;
  fromDate: string;
  toDate: string;
  tipo: "emitidos" | "recibidos";
  rfcSolicitante: string;
};

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  let jobId: string | null = null;

  try {
    const form = await req.formData();
    const clientId = String(form.get("clientId") || "");
    const fromDate = String(form.get("fromDate") || "");
    const toDate = String(form.get("toDate") || "");
    const tipo = String(form.get("tipo") || "emitidos") as "emitidos" | "recibidos";

    const cer = form.get("cer");
    const key = form.get("key");
    const password = String(form.get("password") || "");

    if (!clientId || !fromDate || !toDate || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }
    if (!(cer instanceof File) || !(key instanceof File)) {
      return NextResponse.json({ error: "Faltan archivos .cer/.key" }, { status: 400 });
    }

    // 1) crear job
    const { data: job, error: jobErr } = await supabase
      .from("client_sat_jobs")
      .insert({
        client_id: clientId,
        status: "running",
        from_date: fromDate,
        to_date: toDate,
        tipo,
        message: "Iniciando descarga SAT…",
      })
      .select("id")
      .single();

    if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 400 });
    jobId = job.id as string;

    // 2) RFC del cliente (para saber emitidos/recibidos correctamente y para auditoría)
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("rfc")
      .eq("id", clientId)
      .single();

    if (cErr) throw new Error(cErr.message);
    const clientRfc = String(client?.rfc || "");
    if (!clientRfc) throw new Error("El cliente no tiene RFC en la tabla clients.");

    await supabase.from("client_sat_jobs").update({ message: "Solicitando paquetes al SAT…" }).eq("id", jobId);

    // 3) Descargar paquetes ZIP via WS
    const zipBuffers = await downloadSatPackagesViaWS({
      cer,
      key,
      password,
      fromDate,
      toDate,
      tipo,
      rfcSolicitante: clientRfc,
    });

    await supabase.from("client_sat_jobs").update({ message: `Paquetes descargados: ${zipBuffers.length}. Extrayendo XML…` }).eq("id", jobId);

    // 4) extraer XMLs + parsear
    const parsedRows: Array<{
      uuid: string;
      fecha: string;
      rfcEmisor: string;
      rfcReceptor: string;
      total: number;
      moneda: string | null;
    }> = [];

    for (const buf of zipBuffers) {
      const zip = new AdmZip(buf);
      const entries = zip.getEntries();

      for (const e of entries) {
        if (!e.entryName.toLowerCase().endsWith(".xml")) continue;
        const xml = e.getData().toString("utf8");
        const p = parseCfdiXml(xml);
        if (!p) continue;

        parsedRows.push({
          uuid: p.uuid,
          fecha: p.fecha,
          rfcEmisor: p.rfcEmisor,
          rfcReceptor: p.rfcReceptor,
          total: p.total,
          moneda: p.moneda,
        });
      }
    }

    await supabase.from("client_sat_jobs").update({ message: `XML extraídos: ${parsedRows.length}. Guardando…` }).eq("id", jobId);

    // 5) upsert CFDI (evita duplicados)
    if (parsedRows.length) {
      const payload = parsedRows.map((p) => ({
        client_id: clientId,
        uuid: p.uuid,
        fecha: p.fecha,
        rfc_emisor: p.rfcEmisor,
        rfc_receptor: p.rfcReceptor,
        total: p.total,
        moneda: p.moneda,
      }));

      const { error: upErr } = await supabase
        .from("client_sat_cfdi")
        .upsert(payload, { onConflict: "client_id,uuid" });

      if (upErr) throw new Error(upErr.message);
    }

    // 6) métricas + score
    const metrics = computeMetricsFromCfdi({
      clientRfc,
      cfdi: parsedRows.map((p) => ({
        fecha: p.fecha,
        rfcEmisor: p.rfcEmisor,
        rfcReceptor: p.rfcReceptor,
        total: p.total,
      })),
    });

    const { error: mErr } = await supabase.from("client_sat_metrics").insert({
      client_id: clientId,
      ...metrics,
    });

    if (mErr) throw new Error(mErr.message);

    // 7) job done
    await supabase
      .from("client_sat_jobs")
      .update({ status: "done", message: `OK · CFDI parseados: ${parsedRows.length}` })
      .eq("id", jobId);

    return NextResponse.json(
      { ok: true, jobId, inserted: parsedRows.length, metrics },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = String(e?.message ?? "Error");
    if (jobId) {
      await getSupabaseAdmin()
        .from("client_sat_jobs")
        .update({ status: "error", message: msg })
        .eq("id", jobId);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// -------------------------
// SAT WS implementation
// -------------------------

function toDerBinaryString(file: File): Promise<string> {
  // NodeCfdi examples usan 'binary' string
  return file.arrayBuffer().then((ab) => Buffer.from(ab).toString("binary"));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function dtStart(date: string) {
  return `${date} 00:00:00`;
}
function dtEnd(date: string) {
  return `${date} 23:59:59`;
}

async function downloadSatPackagesViaWS(args: PullArgs): Promise<Buffer[]> {
  const cerDer = await toDerBinaryString(args.cer);
  const keyDer = await toDerBinaryString(args.key);

  const fiel = Fiel.create(cerDer, keyDer, args.password);
  if (!fiel.isValid()) {
    throw new Error("e.firma inválida/vencida o contraseña incorrecta.");
  }

  const webClient = new HttpsWebClient();
  const requestBuilder = new FielRequestBuilder(fiel);
  const service = new Service(requestBuilder, webClient);

  const period = DateTimePeriod.createFromValues(dtStart(args.fromDate), dtEnd(args.toDate));
  const downloadType = args.tipo === "emitidos" ? DownloadType.issued() : DownloadType.received();

  const queryParams = QueryParameters.create(period)
    .withDownloadType(downloadType)
    .withRequestType(RequestType.xml());

  const query = await service.query(queryParams);

  if (!query.getStatus().isAccepted()) {
    throw new Error(`SAT query rechazado: ${query.getStatus().getMessage()}`);
  }

  const requestId = query.getRequestId();

  // Poll razonable para serverless (MVP: rangos pequeños)
  let packageIds: string[] = [];
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const verify = await service.verify(requestId);

    if (!verify.getStatus().isAccepted()) {
      throw new Error(`SAT verify falló: ${verify.getStatus().getMessage()}`);
    }

    const sr = verify.getStatusRequest();

    if (sr.isTypeOf("Expired") || sr.isTypeOf("Failure") || sr.isTypeOf("Rejected")) {
      throw new Error(`SAT solicitud no completable (${sr.value()}): ${sr.message()}`);
    }

    if (sr.isTypeOf("Finished")) {
      packageIds = Array.from(verify.getPackageIds());
      break;
    }

    await sleep(2000);
  }

  if (!packageIds.length) {
    throw new Error("SAT aún procesando. Usa un rango menor (30–90 días) o reintenta.");
  }

  const zipBuffers: Buffer[] = [];

  for (const packageId of packageIds) {
    const download = await service.download(packageId);
    if (!download.getStatus().isAccepted()) continue;

    zipBuffers.push(Buffer.from(download.getPackageContent(), "base64"));
  }

  if (!zipBuffers.length) {
    throw new Error("No se pudo descargar ningún paquete del SAT.");
  }

  return zipBuffers;
}