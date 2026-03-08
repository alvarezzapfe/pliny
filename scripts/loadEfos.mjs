import { createClient } from '@supabase/supabase-js'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { homedir } from 'os'
import { join } from 'path'

const SUPABASE_URL = 'https://gwkupxksietqzwgxvvhu.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CSV_PATH = join(homedir(), 'Downloads', 'Listado_Completo_69-B.csv')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

async function main() {
  console.log('Leyendo CSV...')
  const rl = createInterface({ input: createReadStream(CSV_PATH, { encoding: 'latin1' }), crlfDelay: Infinity })
  let lineNum = 0
  const seen = new Set()
  let rows = []
  let inserted = 0

  for await (const line of rl) {
    lineNum++
    if (lineNum <= 3 || !line.trim()) continue
    const cols = parseCSVLine(line)
    if (cols.length < 4) continue
    const rfc = cols[1]?.toUpperCase().trim()
    if (!rfc || seen.has(rfc)) continue
    seen.add(rfc)
    rows.push({
      rfc,
      nombre: cols[2]?.trim() || null,
      situacion: cols[3]?.trim() || null,
      fecha_publicacion_sat_presuntos: cols[5]?.trim() || null,
      fecha_publicacion_sat_definitivos: cols[13]?.trim() || null,
    })
    if (rows.length >= 500) {
      const { error } = await supabase.from('efos_list').insert(rows)
      if (error) console.error('Error:', error.message)
      else { inserted += rows.length; process.stdout.write(`\r✅ ${inserted}`) }
      rows = []
    }
  }
  if (rows.length > 0) {
    const { error } = await supabase.from('efos_list').insert(rows)
    if (!error) inserted += rows.length
  }
  console.log(`\n🎉 Total: ${inserted} registros únicos`)
}

main().catch(console.error)
