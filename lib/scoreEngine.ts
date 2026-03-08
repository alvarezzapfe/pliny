/**
 * lib/scoreEngine.ts
 * Motor de cálculo de score de crédito con variables reales
 * Versión 1.0 — Fuentes: datos declarados + RFC checksum + lista 69-B SAT
 */

import { validarRFC, antiguedadToEnum } from './rfcUtils'
import type { EfosResult } from './efosCheck'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type VariableStatus = 'ok' | 'warn' | 'fail' | 'pending'

export interface ScoreVariable {
  id: string
  nombre: string
  categoria: 'fiscal' | 'financiero' | 'operativo' | 'mercado' | 'credito'
  peso: number          // % del score total (suma = 100)
  valor: string | null  // Valor legible
  puntos: number        // Puntos obtenidos (0 a peso)
  status: VariableStatus
  fuente: string
  mensaje: string       // Explicación breve
}

export interface ScoreResult {
  total: number         // 0-100
  nivel: 'A' | 'B' | 'C' | 'D' | 'E'
  nivelLabel: string
  variables: ScoreVariable[]
  resumen: {
    fortalezas: string[]
    alertas: string[]
    faltantes: string[]
  }
  requiereScan: boolean  // Si necesita scan para desbloquear más variables
  calculadoEn: Date
}

// ─── Mappers (igual que score page) ──────────────────────────────────────────

const mapFacturacion = (v: string | null): number => ({
  menos_1m: 15, '1m_5m': 30, '5m_20m': 60, '20m_50m': 80, '50m_100m': 95, mas_100m: 100
}[v ?? ''] ?? 0)

const mapAntiguedad = (v: string | null): number => ({
  '0_1': 10, '1_2': 25, '2_5': 50, '5_10': 80, mas_10: 100
}[v ?? ''] ?? 0)

const mapEmpleados = (v: string | null): number => ({
  '1_10': 20, '11_50': 45, '51_200': 70, '201_500': 90, mas_500: 100
}[v ?? ''] ?? 0)

const mapFacturacionLabel = (v: string | null): string => ({
  menos_1m: 'Menos de $1M', '1m_5m': '$1M - $5M', '5m_20m': '$5M - $20M',
  '20m_50m': '$20M - $50M', '50m_100m': '$50M - $100M', mas_100m: 'Más de $100M'
}[v ?? ''] ?? 'No especificado')

const mapAntiguedadLabel = (v: string | null): string => ({
  '0_1': '0-1 años', '1_2': '1-2 años', '2_5': '2-5 años', '5_10': '5-10 años', mas_10: 'Más de 10 años'
}[v ?? ''] ?? 'No especificado')

const mapEmpleadosLabel = (v: string | null): string => ({
  '1_10': '1-10', '11_50': '11-50', '51_200': '51-200', '201_500': '201-500', mas_500: '+500'
}[v ?? ''] ?? 'No especificado')

// ─── Motor principal ──────────────────────────────────────────────────────────

export interface ScoreInputData {
  // De borrowers_profile
  company_rfc:            string | null
  fin_facturacion_anual:  string | null
  fin_antiguedad:         string | null
  fin_num_empleados:      string | null
  fin_sector:             string | null
  // Resultado de EFOS check (puede ser null si aún no se consultó)
  efosResult?:            EfosResult | null
  // Datos de scan (Ekatena/sat.ws — futuro)
  scanData?:              Record<string, unknown> | null
}

export function calcularScore(input: ScoreInputData): ScoreResult {
  const variables: ScoreVariable[] = []

  // ──────────────────────────────────────────────────────────────────
  // CATEGORÍA: FISCAL (33 pts total)
  // ──────────────────────────────────────────────────────────────────

  // 1. RFC válido (formato + checksum) — 8 pts
  const rfcValidation = validarRFC(input.company_rfc ?? '')
  variables.push({
    id: 'rfc_formato',
    nombre: 'RFC válido',
    categoria: 'fiscal',
    peso: 8,
    valor: input.company_rfc ?? null,
    puntos: rfcValidation.valid ? 8 : (input.company_rfc ? 2 : 0),
    status: rfcValidation.valid ? 'ok' : (input.company_rfc ? 'fail' : 'pending'),
    fuente: 'Algoritmo SAT (local)',
    mensaje: rfcValidation.valid
      ? `RFC válido — ${rfcValidation.type === 'moral' ? 'Persona moral' : 'Persona física'}`
      : rfcValidation.errors[0] ?? 'RFC no registrado',
  })

  // 2. Antigüedad desde RFC (fecha de constitución real) — 10 pts
  const antiguedadDesdeRFC = rfcValidation.valid && rfcValidation.antiguedadAnios !== undefined
  const aniosRFC = rfcValidation.antiguedadAnios ?? 0
  const antiguedadPuntos = antiguedadDesdeRFC
    ? Math.round(mapAntiguedad(antiguedadToEnum(aniosRFC)) * 10 / 100)
    : (input.fin_antiguedad ? Math.round(mapAntiguedad(input.fin_antiguedad) * 10 / 100) : 0)

  variables.push({
    id: 'antiguedad',
    nombre: 'Antigüedad empresa',
    categoria: 'fiscal',
    peso: 10,
    valor: antiguedadDesdeRFC
      ? `${rfcValidation.antiguedadLabel} (desde RFC)`
      : mapAntiguedadLabel(input.fin_antiguedad),
    puntos: antiguedadPuntos,
    status: antiguedadPuntos >= 7 ? 'ok' : antiguedadPuntos >= 3 ? 'warn' : 'fail',
    fuente: antiguedadDesdeRFC ? 'RFC fecha constitución' : 'Declarado por empresa',
    mensaje: antiguedadDesdeRFC
      ? `Constituida hace ${aniosRFC} años (verificado con RFC)`
      : 'Antigüedad declarada — pendiente verificación con RFC',
  })

  // 3. No en lista 69-B SAT (EFOS) — 15 pts
  const efos = input.efosResult
  let efosPuntos = 0
  let efosStatus: VariableStatus = 'pending'
  let efosMensaje = 'Pendiente consulta lista 69-B'

  if (efos) {
    efosPuntos = efos.score_impact < 0
      ? Math.max(0, 15 + efos.score_impact)
      : 15
    efosStatus = efos.status === 'limpio' || efos.status === 'sentencia_favorable' ? 'ok'
      : efos.status === 'presunto' || efos.status === 'desvirtuado' ? 'warn'
      : efos.status === 'definitivo' ? 'fail'
      : 'pending'
    efosMensaje = efos.message
  }

  variables.push({
    id: 'efos_69b',
    nombre: 'Lista negra SAT (69-B)',
    categoria: 'fiscal',
    peso: 15,
    valor: efos ? efos.status : null,
    puntos: efosPuntos,
    status: efosStatus,
    fuente: 'SAT lista 69-B (EFOS)',
    mensaje: efosMensaje,
  })

  // ──────────────────────────────────────────────────────────────────
  // CATEGORÍA: FINANCIERO (30 pts total)
  // ──────────────────────────────────────────────────────────────────

  // 4. Facturación anual declarada — 15 pts
  const factPct = mapFacturacion(input.fin_facturacion_anual)
  const factPuntos = Math.round(factPct * 15 / 100)
  variables.push({
    id: 'facturacion',
    nombre: 'Facturación anual',
    categoria: 'financiero',
    peso: 15,
    valor: mapFacturacionLabel(input.fin_facturacion_anual),
    puntos: factPuntos,
    status: factPuntos >= 10 ? 'ok' : factPuntos >= 4 ? 'warn' : (input.fin_facturacion_anual ? 'fail' : 'pending'),
    fuente: 'Declarado por empresa',
    mensaje: input.fin_facturacion_anual
      ? `Facturación: ${mapFacturacionLabel(input.fin_facturacion_anual)}`
      : 'Facturación no registrada',
  })

  // 5. DSCR — pendiente Ekatena (15 pts)
  variables.push({
    id: 'dscr',
    nombre: 'Cobertura de deuda (DSCR)',
    categoria: 'financiero',
    peso: 15,
    valor: null,
    puntos: 0,
    status: 'pending',
    fuente: 'Scan fiscal (Ekatena)',
    mensaje: 'Requiere análisis de CFDIs — activa el Scan',
  })

  // ──────────────────────────────────────────────────────────────────
  // CATEGORÍA: OPERATIVO (22 pts total)
  // ──────────────────────────────────────────────────────────────────

  // 6. Número de empleados — 8 pts
  const empPct = mapEmpleados(input.fin_num_empleados)
  const empPuntos = Math.round(empPct * 8 / 100)
  variables.push({
    id: 'empleados',
    nombre: 'Empleados registrados',
    categoria: 'operativo',
    peso: 8,
    valor: mapEmpleadosLabel(input.fin_num_empleados),
    puntos: empPuntos,
    status: empPuntos >= 5 ? 'ok' : empPuntos >= 2 ? 'warn' : (input.fin_num_empleados ? 'fail' : 'pending'),
    fuente: 'Declarado por empresa',
    mensaje: input.fin_num_empleados
      ? `${mapEmpleadosLabel(input.fin_num_empleados)} empleados`
      : 'No registrado',
  })

  // 7. Sector/giro — 6 pts
  const sectorOk = !!input.fin_sector
  variables.push({
    id: 'sector',
    nombre: 'Sector económico',
    categoria: 'operativo',
    peso: 6,
    valor: input.fin_sector ?? null,
    puntos: sectorOk ? 6 : 0,
    status: sectorOk ? 'ok' : 'pending',
    fuente: 'Declarado por empresa',
    mensaje: sectorOk ? `Sector: ${input.fin_sector}` : 'Sector no registrado',
  })

  // 8. DSO — pendiente Ekatena (8 pts)
  variables.push({
    id: 'dso',
    nombre: 'Días de cobro (DSO)',
    categoria: 'operativo',
    peso: 8,
    valor: null,
    puntos: 0,
    status: 'pending',
    fuente: 'Scan fiscal (Ekatena)',
    mensaje: 'Requiere análisis de CFDIs — activa el Scan',
  })

  // ──────────────────────────────────────────────────────────────────
  // CATEGORÍA: CRÉDITO (15 pts total)
  // ──────────────────────────────────────────────────────────────────

  // 9. Buró de crédito — pendiente API (15 pts)
  variables.push({
    id: 'buro',
    nombre: 'Historial Buró de Crédito',
    categoria: 'credito',
    peso: 15,
    valor: null,
    puntos: 0,
    status: 'pending',
    fuente: 'Buró de Crédito (API)',
    mensaje: 'Requiere Scan — Buró Empresarial próximamente',
  })

  // ──────────────────────────────────────────────────────────────────
  // CALCULAR TOTAL
  // ──────────────────────────────────────────────────────────────────

  const totalPuntos = variables.reduce((sum, v) => sum + v.puntos, 0)
  const pesoPosible = variables.reduce((sum, v) => sum + v.peso, 0) // = 100

  // Normalizar: si hay variables pending, el score base no puede ser mayor al peso disponible
  const pesoDisponible = variables
    .filter(v => v.status !== 'pending')
    .reduce((sum, v) => sum + v.peso, 0)

  // Score ajustado: sobre los puntos posibles reales (no penalizar por pending)
  const scoreAjustado = pesoDisponible > 0
    ? Math.round((totalPuntos / pesoDisponible) * Math.min(pesoDisponible, 100))
    : 0

  const total = Math.min(100, Math.max(0, scoreAjustado))

  // Nivel crediticio
  const nivel = total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : total >= 35 ? 'D' : 'E'
  const nivelLabel = {
    A: 'Excelente', B: 'Bueno', C: 'Regular', D: 'Bajo', E: 'Muy bajo'
  }[nivel]

  // Resumen
  const fortalezas = variables
    .filter(v => v.status === 'ok')
    .map(v => v.nombre)

  const alertas = variables
    .filter(v => v.status === 'warn' || v.status === 'fail')
    .map(v => `${v.nombre}: ${v.mensaje}`)

  const faltantes = variables
    .filter(v => v.status === 'pending')
    .map(v => v.nombre)

  const requiereScan = variables.some(v => v.status === 'pending' && v.fuente.includes('Scan'))

  return {
    total,
    nivel,
    nivelLabel,
    variables,
    resumen: { fortalezas, alertas, faltantes },
    requiereScan,
    calculadoEn: new Date(),
  }
}
