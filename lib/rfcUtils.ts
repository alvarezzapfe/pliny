/**
 * lib/rfcUtils.ts
 * Validación de RFC mexicano — 100% local, sin API externa
 * Basado en el algoritmo oficial del SAT (Anexo III, DOF)
 */

export interface RFCValidationResult {
  valid: boolean
  type: 'moral' | 'fisica' | null
  errors: string[]
  // Datos extraídos si es válido
  fechaConstitucion?: Date
  antiguedadAnios?: number
  antiguedadLabel?: string
  rfc?: string
}

// Tabla de valores para el dígito verificador (algoritmo SAT oficial)
const CHECKSUM_TABLE: Record<string, number> = {
  '0': 0,  '1': 1,  '2': 2,  '3': 3,  '4': 4,
  '5': 5,  '6': 6,  '7': 7,  '8': 8,  '9': 9,
  'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14,
  'F': 15, 'G': 16, 'H': 17, 'I': 18, 'J': 19,
  'K': 20, 'L': 21, 'M': 22, 'N': 23, 'O': 24,
  'P': 25, 'Q': 26, 'R': 27, 'S': 28, 'T': 29,
  'U': 30, 'V': 31, 'W': 32, 'X': 33, 'Y': 34,
  'Z': 35, ' ': 36, '&': 37, '-': 38, '.': 39
}

/**
 * Calcula el dígito verificador de un RFC
 * Algoritmo oficial SAT: suma ponderada mod 11
 */
function calcularDigitoVerificador(rfc: string): string {
  // Para persona moral (12 chars): usamos los primeros 11 para calcular el 12vo
  // Para persona física (13 chars): usamos los primeros 12 para calcular el 13vo
  const base = rfc.slice(0, -1)
  const len = base.length // 11 para moral, 12 para física

  let suma = 0
  for (let i = 0; i < len; i++) {
    const char = base[i].toUpperCase()
    const valor = CHECKSUM_TABLE[char] ?? 0
    suma += valor * (len + 1 - i)
  }

  const residuo = suma % 11
  if (residuo === 0) return '0'
  if (residuo === 10) return 'A'
  return String(11 - residuo)
}

/**
 * Extrae y valida la fecha del RFC (posiciones 3-8 para moral, 4-9 para física)
 * Formato: AAMMDD
 */
function extraerFecha(rfc: string, tipo: 'moral' | 'fisica'): Date | null {
  const offset = tipo === 'moral' ? 3 : 4
  const fechaStr = rfc.substring(offset, offset + 6)

  const aa = parseInt(fechaStr.substring(0, 2))
  const mm = parseInt(fechaStr.substring(2, 4))
  const dd = parseInt(fechaStr.substring(4, 6))

  if (isNaN(aa) || isNaN(mm) || isNaN(dd)) return null
  if (mm < 1 || mm > 12) return null
  if (dd < 1 || dd > 31) return null

  // Interpretar año de 2 dígitos
  // Para personas morales: típicamente ≥ 1900, raramente futuro
  const anioCompleto = aa <= 30 ? 2000 + aa : 1900 + aa

  const fecha = new Date(anioCompleto, mm - 1, dd)
  // Verificar que la fecha sea válida (ej: no 30 de febrero)
  if (
    fecha.getFullYear() !== anioCompleto ||
    fecha.getMonth() !== mm - 1 ||
    fecha.getDate() !== dd
  ) {
    return null
  }

  return fecha
}

/**
 * Calcula antigüedad en años desde la fecha de constitución
 */
function calcularAntiguedad(fecha: Date): { anios: number; label: string } {
  const hoy = new Date()
  const diffMs = hoy.getTime() - fecha.getTime()
  const diffAnios = diffMs / (1000 * 60 * 60 * 24 * 365.25)
  const anios = Math.floor(diffAnios)

  let label: string
  if (anios < 1) label = 'Menos de 1 año'
  else if (anios < 2) label = '1-2 años'
  else if (anios < 5) label = '2-5 años'
  else if (anios < 10) label = '5-10 años'
  else label = 'Más de 10 años'

  return { anios, label }
}

/**
 * RFC genéricos del SAT que no deben aceptarse como válidos
 */
const RFC_GENERICOS = new Set([
  'XAXX010101000', // Público en general (PF)
  'XEXX010101000', // Extranjero (PF)
  'XAXX010101',    // Variante sin dígito
])

/**
 * Valida un RFC mexicano completo
 * Verifica: formato, longitud, fecha válida, dígito verificador
 */
export function validarRFC(rfcRaw: string): RFCValidationResult {
  const errors: string[] = []
  const rfc = rfcRaw.trim().toUpperCase()

  // Longitud
  if (rfc.length !== 12 && rfc.length !== 13) {
    return {
      valid: false,
      type: null,
      errors: ['El RFC debe tener 12 caracteres (persona moral) o 13 (persona física)'],
    }
  }

  // RFC genérico
  if (RFC_GENERICOS.has(rfc)) {
    return {
      valid: false,
      type: null,
      errors: ['RFC genérico del SAT — no válido para personas reales'],
    }
  }

  const tipo: 'moral' | 'fisica' = rfc.length === 12 ? 'moral' : 'fisica'

  // Regex por tipo
  const regexMoral   = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/
  const regexFisica  = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}[0-9A]$/

  const regex = tipo === 'moral' ? regexMoral : regexFisica
  if (!regex.test(rfc)) {
    errors.push(`Formato incorrecto para ${tipo === 'moral' ? 'persona moral' : 'persona física'}`)
  }

  // Fecha válida
  const fecha = extraerFecha(rfc, tipo)
  if (!fecha) {
    errors.push('La fecha de constitución/nacimiento en el RFC no es válida')
  }

  // Fecha no futura
  if (fecha && fecha > new Date()) {
    errors.push('La fecha del RFC no puede ser futura')
  }

  // Dígito verificador
  const dvCalculado = calcularDigitoVerificador(rfc)
  const dvIngresado = rfc.slice(-1)
  if (dvCalculado !== dvIngresado) {
    errors.push(`Dígito verificador incorrecto (esperado: ${dvCalculado}, recibido: ${dvIngresado})`)
  }

  if (errors.length > 0) {
    return { valid: false, type: tipo, errors }
  }

  // Todo bien — extraer datos útiles
  const antiguedad = fecha ? calcularAntiguedad(fecha) : undefined

  return {
    valid: true,
    type: tipo,
    errors: [],
    rfc,
    fechaConstitucion: fecha ?? undefined,
    antiguedadAnios: antiguedad?.anios,
    antiguedadLabel: antiguedad?.label,
  }
}

/**
 * Mapea años de antigüedad al enum de la BD (fin_antiguedad)
 * Para usar si queremos sobreescribir el campo declarado con el RFC
 */
export function antiguedadToEnum(anios: number): string {
  if (anios < 1) return '0_1'
  if (anios < 2) return '1_2'
  if (anios < 5) return '2_5'
  if (anios < 10) return '5_10'
  return 'mas_10'
}
