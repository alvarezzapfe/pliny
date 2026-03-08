/**
 * lib/efosCheck.ts
 * Consulta lista negra 69-B (EFOS) del SAT
 * La lista se descarga del SAT y se carga en la tabla `efos_list` de Supabase
 */

import { createClient } from '@supabase/supabase-js'

export type EfosStatus =
  | 'limpio'        // No aparece en la lista
  | 'presunto'      // SAT lo notificó, aún puede desvirtuar
  | 'definitivo'    // EFOS confirmado, máximo riesgo
  | 'desvirtuado'   // Logró probar que no era EFOS
  | 'sentencia_favorable' // Ganó en tribunales
  | 'error'         // No se pudo consultar

export interface EfosResult {
  status: EfosStatus
  rfc: string
  nombre?: string
  fechaPublicacion?: string
  message: string
  score_impact: number  // Puntos que afectan al score (-15 a 0)
}

/**
 * Verifica si un RFC aparece en la lista 69-B del SAT
 * Requiere tabla `efos_list` en Supabase (ver migración SQL)
 */
export async function checkEFOS(
  rfc: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<EfosResult> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('efos_list')
      .select('rfc, nombre, situacion, fecha_publicacion_sat_presuntos, fecha_publicacion_sat_definitivos')
      .eq('rfc', rfc.toUpperCase())
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return {
        status: 'limpio',
        rfc,
        message: 'No aparece en lista 69-B del SAT',
        score_impact: 0,
      }
    }

    const situacion = data.situacion?.toLowerCase() ?? ''

    if (situacion.includes('definitiv')) {
      return {
        status: 'definitivo',
        rfc,
        nombre: data.nombre,
        fechaPublicacion: data.fecha_publicacion_sat_definitivos,
        message: 'EFOS DEFINITIVO — Empresa confirmada como facturera de operaciones simuladas',
        score_impact: -15,
      }
    }

    if (situacion.includes('presunto')) {
      return {
        status: 'presunto',
        rfc,
        nombre: data.nombre,
        fechaPublicacion: data.fecha_publicacion_sat_presuntos,
        message: 'EFOS PRESUNTO — SAT detectó posibles operaciones simuladas (en proceso)',
        score_impact: -8,
      }
    }

    if (situacion.includes('desvirtuado')) {
      return {
        status: 'desvirtuado',
        rfc,
        nombre: data.nombre,
        message: 'Apareció en lista 69-B pero logró desvirtuar ante el SAT',
        score_impact: -2,
      }
    }

    if (situacion.includes('sentencia') || situacion.includes('favorable')) {
      return {
        status: 'sentencia_favorable',
        rfc,
        nombre: data.nombre,
        message: 'Apareció en lista 69-B pero obtuvo sentencia favorable',
        score_impact: 0,
      }
    }

    return {
      status: 'limpio',
      rfc,
      message: 'Sin alertas en lista 69-B',
      score_impact: 0,
    }
  } catch (err) {
    console.error('Error consultando EFOS:', err)
    return {
      status: 'error',
      rfc,
      message: 'No se pudo consultar la lista 69-B',
      score_impact: 0,
    }
  }
}
