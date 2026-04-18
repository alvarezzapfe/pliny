import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { buildContrato, type ContratoData } from "@/lib/contracts/contrato-template";

export async function POST(req: NextRequest) {
  // Auth guard — same pattern as other admin endpoints
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.PLINIUS_ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validate required fields
    const required: (keyof ContratoData)[] = [
      "razon_social",
      "rfc_cliente",
      "domicilio_cliente",
      "nombre_representante",
      "cargo_representante",
      "plan",
      "precio_mxn",
      "fecha_inicio",
      "plazo_meses",
      "banco",
      "clabe",
      "referencia",
    ];
    const missing = required.filter((k) => !body[k] && body[k] !== 0);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Campos requeridos faltantes: ${missing.join(", ")}` },
        { status: 422 },
      );
    }

    if (typeof body.clabe === "string" && body.clabe.replace(/\s/g, "").length !== 18) {
      return NextResponse.json(
        { error: "La CLABE debe tener exactamente 18 dígitos" },
        { status: 422 },
      );
    }

    const data: ContratoData = {
      razon_social: body.razon_social,
      rfc_cliente: body.rfc_cliente.toUpperCase(),
      domicilio_cliente: body.domicilio_cliente,
      nombre_representante: body.nombre_representante,
      cargo_representante: body.cargo_representante,
      plan: body.plan,
      precio_mxn: Number(body.precio_mxn),
      fecha_inicio: body.fecha_inicio,
      plazo_meses: Number(body.plazo_meses),
      banco: body.banco,
      clabe: body.clabe.replace(/\s/g, ""),
      referencia: body.referencia,
    };

    const doc = buildContrato(data);
    const buffer = await Packer.toBuffer(doc);
    const bytes = new Uint8Array(buffer);

    const slug = body.slug || data.razon_social.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    const date = data.fecha_inicio;
    const filename = `contrato_plinius_${slug}_${date}.docx`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[POST /api/admin/contracts/generate]", err);
    return NextResponse.json(
      { error: err.message ?? "Error generando contrato" },
      { status: 500 },
    );
  }
}
