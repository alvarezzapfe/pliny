import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const clientId = String(body?.clientId ?? "");

  if (!clientId) {
    return NextResponse.json({ status: "error", message: "clientId required" }, { status: 400 });
  }

  // Simula latencia
  await new Promise((r) => setTimeout(r, 900));

  const n = Array.from(clientId).reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const score = 520 + (n % 380);

  return NextResponse.json({
    status: "ok",
    clientId,
    score,
    lastChecked: new Date().toISOString(),
    flags: [
      { code: "UTIL", label: "Utilización", level: (n % 3) + 1 },
      { code: "MORA", label: "Mora", level: (n % 2) + 1 },
    ],
  });
}