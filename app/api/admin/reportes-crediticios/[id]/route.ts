import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH — Actualizar estado/score/notas
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.PLINIUS_ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.estado) {
    updates.estado = body.estado;
    if (body.estado === "procesando") updates.procesado_at = new Date().toISOString();
    if (body.estado === "completado") updates.completado_at = new Date().toISOString();
  }
  if (body.score != null) updates.score = body.score;
  if (body.admin_notas != null) updates.admin_notas = body.admin_notas;
  if (body.reporte_pdf_url != null) updates.reporte_pdf_url = body.reporte_pdf_url;
  if (body.reporte_pdf_filename != null) updates.reporte_pdf_filename = body.reporte_pdf_filename;

  const { data, error } = await admin
    .from("reportes_crediticios")
    .update(updates)
    .eq("id", id)
    .select("id, estado, score, completado_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reporte: data });
}

// POST — Upload PDF
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.PLINIUS_ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Get reporte to know lender_user_id for path
  const { data: reporte } = await admin
    .from("reportes_crediticios")
    .select("lender_user_id")
    .eq("id", id)
    .single();

  if (!reporte) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 422 });

  const ext = file.name.split(".").pop() ?? "pdf";
  const storagePath = `${reporte.lender_user_id}/${id}/reporte.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from("reportes-crediticios")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/pdf",
      upsert: true,
    });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // Update reporte record
  await admin
    .from("reportes_crediticios")
    .update({
      reporte_pdf_url: storagePath,
      reporte_pdf_filename: file.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, path: storagePath, filename: file.name });
}
