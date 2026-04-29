import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Still return 200 to not leak info
      return NextResponse.json({ ok: true });
    }

    const sb = createServiceClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.plinius.mx";

    await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${siteUrl}/admin/reset-password`,
    });

    // Always return success to prevent email enumeration
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
