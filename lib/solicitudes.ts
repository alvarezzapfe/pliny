// lib/solicitudes.ts
// Llama esto desde el wizard al hacer submit en el paso 3

import { supabase } from "@/lib/supabaseClient"; // ajusta el path si es distinto

export interface SolicitudPayload {
  client_id: string;           // uuid del cliente seleccionado o recién creado
  empresa_nombre?: string;     // solo si fue "nuevo cliente"
  empresa_rfc?: string;
  empresa_sector?: string;
  tipo: string;
  monto: number;               // numérico limpio (sin comas)
  plazo_valor: number;
  plazo_unidad: "meses" | "años";
  tasa_referencia?: string;
  garantia?: string;
  destino: string;
}

/**
 * Si el usuario eligió "nuevo cliente", primero lo inserta en `clients`
 * y devuelve el uuid generado.
 */
export async function crearClienteSiNuevo(params: {
  empresa: string;
  rfc: string;
  sector: string;
  ownerUserId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      company_name:  params.empresa,
      rfc:           params.rfc.toUpperCase(),
      status: "active",
      owner_user_id: params.ownerUserId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Inserta la solicitud en Supabase.
 * La tabla usa user_id + payload JSONB + status.
 * Todo el detalle del crédito va dentro de payload.
 */
export async function crearSolicitud(payload: SolicitudPayload, userId: string) {
  const { data, error } = await supabase
    .from("solicitudes")
    .insert({
      user_id: userId,
      status:  "pendiente",
      payload: {
        client_id:       payload.client_id,
        empresa_nombre:  payload.empresa_nombre,
        empresa_rfc:     payload.empresa_rfc,
        empresa_sector:  payload.empresa_sector,
        tipo:            payload.tipo,
        monto:           payload.monto,
        plazo_valor:     payload.plazo_valor,
        plazo_unidad:    payload.plazo_unidad,
        tasa_referencia: payload.tasa_referencia,
        garantia:        payload.garantia,
        destino:         payload.destino,
      },
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
