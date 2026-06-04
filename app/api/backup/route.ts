import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/db'

export const runtime = 'nodejs'

const TABLES = [
  'data_harian',
  'supir_tonase',
  'pemanen_tandan',
  'pengeluaran',
  'kategori_pengeluaran',
] as const

type BackupTable = typeof TABLES[number]
type BackupPayload = {
  version?: number
  exported_at?: string
  data_harian?: Array<Record<string, unknown>>
  supir_tonase?: Array<Record<string, unknown>>
  pemanen_tandan?: Array<Record<string, unknown>>
  pengeluaran?: Array<Record<string, unknown>>
  kategori_pengeluaran?: Array<Record<string, unknown>>
}

function jsonAttachment(data: unknown) {
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-sawit-${date}.json"`,
    },
  })
}

function rowsFrom(payload: BackupPayload, table: BackupTable) {
  const rows = payload[table]
  return Array.isArray(rows) ? rows : []
}

async function insertRows(table: BackupTable, rows: Array<Record<string, unknown>>) {
  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const { error } = await supabaseAdmin.from(table).insert(row)
    if (!error) {
      inserted++
      continue
    }

    if (error.code === '23505') {
      skipped++
      continue
    }

    errors.push(`${table}: ${error.message}`)
  }

  return { inserted, skipped, errors }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }

  try {
    const result: BackupPayload = {
      version: 1,
      exported_at: new Date().toISOString(),
    }

    for (const table of TABLES) {
      const { data, error } = await supabaseAdmin.from(table).select('*')
      if (error) throw error
      result[table] = data ?? []
    }

    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'EXPORT_BACKUP',
      entity: 'backup',
      detail: Object.fromEntries(TABLES.map(table => [table, result[table]?.length ?? 0])),
    })

    return jsonAttachment(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal membuat backup' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }

  try {
    const payload = await req.json() as BackupPayload
    if (!payload || !Array.isArray(payload.data_harian)) {
      return NextResponse.json({ error: 'Format backup tidak valid' }, { status: 400 })
    }

    const summary: Record<string, { inserted: number; skipped: number }> = {}
    const errors: string[] = []

    for (const table of TABLES) {
      const result = await insertRows(table, rowsFrom(payload, table))
      summary[table] = { inserted: result.inserted, skipped: result.skipped }
      errors.push(...result.errors)
    }

    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'IMPORT_BACKUP',
      entity: 'backup',
      detail: { summary, error_count: errors.length },
    })

    return NextResponse.json({ summary, errors })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal import backup' }, { status: 500 })
  }
}
