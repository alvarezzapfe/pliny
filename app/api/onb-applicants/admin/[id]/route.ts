// GET detail, PATCH status/note for a single applicant (lender PRO admin)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSb(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  return createClient(sbUrl, sbAnon, { global: { headers: { Authorization: h } } });
}

async function auth(req: NextRequest) {
  const sb = getSb(req);
  const { data: u } = await sb.auth.getUser();
  return u.user ? { sb, uid: u.user.id } : null;
}

// GET — Full detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const { data: lender } = await a.sb.from("onb_lenders").select("id").eq("user_id", a.uid).eq("active", true).maybeSingle();
  if (!lender) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const lid = (lender as Record<string, unknown>).id as string;
  const { data: applicant } = await a.sb.from("onb_applicants").select("*").eq("id", id).eq("lender_id", lid).single();
  if (!applicant) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ applicant });
}

const VALID_STATUSES = ["submitted", "pre_approved", "pending_review", "in_review", "docs_requested", "approved", "rejected", "abandoned"];

// PATCH — Change status or add note
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth(req);
  if (!a) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const { data: lender } = await a.sb.from("onb_lenders").select("id").eq("user_id", a.uid).eq("active", true).maybeSingle();
  if (!lender) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const lid = (lender as Record<string, unknown>).id as string;
  const { data: applicant } = await a.sb.from("onb_applicants").select("*").eq("id", id).eq("lender_id", lid).single();
  if (!applicant) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const app = applicant as Record<string, unknown>;
  const body = await req.json();
  const action = body.action as string;

  if (action === "status") {
    const newStatus = body.status as string;
    if (!VALID_STATUSES.includes(newStatus)) return NextResponse.json({ error: "Status inválido" }, { status: 422 });

    const oldStatus = app.status as string;
    const history = Array.isArray(app.status_history) ? [...(app.status_history as unknown[])] : [];
    history.push({ from: oldStatus, to: newStatus, by: a.uid, at: new Date().toISOString(), reason: body.reason || null });

    const updates: Record<string, unknown> = { status: newStatus, status_history: history, updated_at: new Date().toISOString() };
    if (newStatus === "approved") updates.completed_at = new Date().toISOString();

    const { error } = await a.sb.from("onb_applicants").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    sendStatusEmail(newStatus, app, body.reason).catch(e => console.error("[applicant-admin] email:", e));
    return NextResponse.json({ ok: true, status: newStatus });
  }

  if (action === "note") {
    const note = body.note as string;
    if (!note?.trim()) return NextResponse.json({ error: "Nota vacía" }, { status: 422 });

    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    const existing = (app.internal_notes as string) ?? "";
    const updated = existing ? `${existing}\n[${ts}] ${note.trim()}` : `[${ts}] ${note.trim()}`;

    const { error } = await a.sb.from("onb_applicants").update({ internal_notes: updated, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, internal_notes: updated });
  }

  return NextResponse.json({ error: "action requerido (status|note)" }, { status: 422 });
}

async function sendStatusEmail(status: string, app: Record<string, unknown>, reason?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const email = app.email as string;
  const data = app.data as Record<string, unknown> | null;
  const empresa = (data?.razon_social ?? app.full_name ?? "Empresa") as string;

  const templates: Record<string, { subject: string; html: string } | null> = {
    in_review: { subject: "Estamos revisando tu solicitud", html: `<p>Tu solicitud de <strong>${empresa}</strong> está siendo revisada. Recibirás respuesta en 24-48 horas.</p>` },
    approved: { subject: "¡Solicitud aprobada!", html: `<p>¡Felicidades! Tu solicitud de <strong>${empresa}</strong> fue aprobada. Te contactaremos para los siguientes pasos.</p>` },
    rejected: { subject: "Actualización sobre tu solicitud", html: `<p>Tu solicitud de <strong>${empresa}</strong> no procedió.${reason ? ` Razón: ${reason}` : ""}</p>` },
    docs_requested: { subject: "Documentos necesarios", html: `<p>Para continuar con tu solicitud de <strong>${empresa}</strong>, necesitamos documentos adicionales. Te contactaremos con el detalle.</p>` },
  };

  const tpl = templates[status];
  if (!tpl || !email) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Plinius <noreply@plinius.mx>", to: [email], subject: tpl.subject, html: `<div style="font-family:Arial;max-width:520px;margin:0 auto;color:#1E2A3A;">${tpl.html}<p style="color:#94A3B8;font-size:12px;margin-top:24px;">— Equipo Plinius</p></div>` }),
  });
}
