import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

// Nota: esto usa supabaseClient del server? OJO.
// Si tu supabaseClient está pensado para browser, mejor hazlo con cookies.
// Para MVP: más simple -> consulta desde el cliente con RLS directo.
// Entonces este endpoint NO es obligatorio. Te dejo la versión “sin endpoint” abajo.