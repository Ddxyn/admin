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

type ImportSummary = Record<BackupTable, { inserted: number; skipped: number }>

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

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function nullableText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseFloat(value) || 0
  return 0
}

function intValue(value: unknown) {
  if (typeof value === 'number') return Math.trunc(value)
  if (typeof value === 'string') return Number.parseInt(value, 10) || 0
  return 0
}

function boolValue(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return true
}

function dateText(value: unknown) {
  const raw = text(value)
  return raw.includes('T') ? raw.split('T')[0] : raw
}

function createdAt(value: unknown) {
  const raw = text(value)
  return raw || new Date().toISOString()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function increment(summary: ImportSummary, table: BackupTable, key: 'inserted' | 'skipped') {
  summary[table][key]++
}

function emptySummary(): ImportSummary {
  return Object.fromEntries(TABLES.map(table => [table, { inserted: 0, skipped: 0 }])) as ImportSummary
}

async function restoreOfflineBackup(payload: BackupPayload, session: { id?: string; nama: string }) {
  const summary = emptySummary()
  const errors: string[] = []
  const idMap = new Map<string, string>()
  const restorableDataIds = new Set<string>()

  for (const row of rowsFrom(payload, 'kategori_pengeluaran')) {
    const nama = text(row.nama)
    if (!nama) {
      increment(summary, 'kategori_pengeluaran', 'skipped')
      continue
    }

    const { error } = await supabaseAdmin
      .from('kategori_pengeluaran')
      .upsert({
        nama,
        icon: text(row.icon, 'other'),
        aktif: boolValue(row.aktif),
      }, { onConflict: 'nama' })

    if (error) {
      errors.push(`kategori_pengeluaran "${nama}": ${error.message}`)
      increment(summary, 'kategori_pengeluaran', 'skipped')
    } else {
      increment(summary, 'kategori_pengeluaran', 'inserted')
    }
  }

  for (const row of rowsFrom(payload, 'data_harian')) {
    const sourceId = text(row.id)
    const tanggal = dateText(row.tanggal)
    if (!sourceId || !tanggal) {
      increment(summary, 'data_harian', 'skipped')
      continue
    }

    if (isUuid(sourceId)) {
      const { data: existingById } = await supabaseAdmin
        .from('data_harian')
        .select('id')
        .eq('id', sourceId)
        .maybeSingle()

      if (existingById?.id) {
        idMap.set(sourceId, existingById.id)
        restorableDataIds.add(sourceId)
        increment(summary, 'data_harian', 'skipped')
        continue
      }
    }

    const rowCreatedAt = createdAt(row.created_at)
    let duplicateQuery = supabaseAdmin
      .from('data_harian')
      .select('id')
      .eq('tanggal', tanggal)
      .eq('harga_per_kg', numberValue(row.harga_per_kg))
      .eq('created_at', rowCreatedAt)

    const catatan = nullableText(row.catatan)
    duplicateQuery = catatan === null
      ? duplicateQuery.is('catatan', null)
      : duplicateQuery.eq('catatan', catatan)

    const { data: existingByContent } = await duplicateQuery.maybeSingle()
    if (existingByContent?.id) {
      idMap.set(sourceId, existingByContent.id)
      restorableDataIds.add(sourceId)
      increment(summary, 'data_harian', 'skipped')
      continue
    }

    const newId = isUuid(sourceId) ? sourceId : crypto.randomUUID()
    const { error } = await supabaseAdmin.from('data_harian').insert({
      id: newId,
      tanggal,
      harga_per_kg: numberValue(row.harga_per_kg),
      catatan,
      created_at: rowCreatedAt,
      created_by: session.id,
      created_by_nama: session.nama,
    })

    if (error) {
      errors.push(`data_harian ${tanggal}: ${error.message}`)
      increment(summary, 'data_harian', 'skipped')
      continue
    }

    idMap.set(sourceId, newId)
    restorableDataIds.add(sourceId)
    increment(summary, 'data_harian', 'inserted')
  }

  for (const row of rowsFrom(payload, 'supir_tonase')) {
    const parentSourceId = text(row.data_harian_id)
    const dataHarianId = idMap.get(parentSourceId)
    if (!dataHarianId || !restorableDataIds.has(parentSourceId)) {
      increment(summary, 'supir_tonase', 'skipped')
      continue
    }

    const namaSupir = text(row.nama_supir)
    const tonase = numberValue(row.tonase)
    const tanggal = dateText(row.tanggal)
    const { data: duplicate } = await supabaseAdmin
      .from('supir_tonase')
      .select('id')
      .eq('data_harian_id', dataHarianId)
      .eq('nama_supir', namaSupir)
      .eq('tonase', tonase)
      .eq('tanggal', tanggal)
      .maybeSingle()
    if (duplicate?.id) {
      increment(summary, 'supir_tonase', 'skipped')
      continue
    }

    const { error } = await supabaseAdmin.from('supir_tonase').insert({
      id: crypto.randomUUID(),
      data_harian_id: dataHarianId,
      nama_supir: namaSupir,
      tonase,
      tanggal,
    })

    if (error) {
      errors.push(`supir_tonase ${text(row.id)}: ${error.message}`)
      increment(summary, 'supir_tonase', 'skipped')
    } else {
      increment(summary, 'supir_tonase', 'inserted')
    }
  }

  for (const row of rowsFrom(payload, 'pemanen_tandan')) {
    const parentSourceId = text(row.data_harian_id)
    const dataHarianId = idMap.get(parentSourceId)
    if (!dataHarianId || !restorableDataIds.has(parentSourceId)) {
      increment(summary, 'pemanen_tandan', 'skipped')
      continue
    }

    const namaPemanen = text(row.nama_pemanen)
    const jumlahTandan = intValue(row.jumlah_tandan)
    const tanggal = dateText(row.tanggal)
    const { data: duplicate } = await supabaseAdmin
      .from('pemanen_tandan')
      .select('id')
      .eq('data_harian_id', dataHarianId)
      .eq('nama_pemanen', namaPemanen)
      .eq('jumlah_tandan', jumlahTandan)
      .eq('tanggal', tanggal)
      .maybeSingle()
    if (duplicate?.id) {
      increment(summary, 'pemanen_tandan', 'skipped')
      continue
    }

    const { error } = await supabaseAdmin.from('pemanen_tandan').insert({
      id: crypto.randomUUID(),
      data_harian_id: dataHarianId,
      nama_pemanen: namaPemanen,
      jumlah_tandan: jumlahTandan,
      tanggal,
    })

    if (error) {
      errors.push(`pemanen_tandan ${text(row.id)}: ${error.message}`)
      increment(summary, 'pemanen_tandan', 'skipped')
    } else {
      increment(summary, 'pemanen_tandan', 'inserted')
    }
  }

  for (const row of rowsFrom(payload, 'pengeluaran')) {
    const parentSourceId = text(row.data_harian_id)
    const dataHarianId = idMap.get(parentSourceId)
    if (!dataHarianId || !restorableDataIds.has(parentSourceId)) {
      increment(summary, 'pengeluaran', 'skipped')
      continue
    }

    const tanggal = dateText(row.tanggal)
    const kategori = text(row.kategori)
    const deskripsi = nullableText(row.deskripsi)
    const jumlah = numberValue(row.jumlah)
    let duplicateQuery = supabaseAdmin
      .from('pengeluaran')
      .select('id')
      .eq('data_harian_id', dataHarianId)
      .eq('tanggal', tanggal)
      .eq('kategori', kategori)
      .eq('jumlah', jumlah)

    duplicateQuery = deskripsi === null
      ? duplicateQuery.is('deskripsi', null)
      : duplicateQuery.eq('deskripsi', deskripsi)

    const { data: duplicate } = await duplicateQuery.maybeSingle()
    if (duplicate?.id) {
      increment(summary, 'pengeluaran', 'skipped')
      continue
    }

    const { error } = await supabaseAdmin.from('pengeluaran').insert({
      id: crypto.randomUUID(),
      data_harian_id: dataHarianId,
      tanggal,
      kategori,
      deskripsi,
      jumlah,
      created_at: createdAt(row.created_at),
      created_by: session.id,
      created_by_nama: session.nama,
    })

    if (error) {
      errors.push(`pengeluaran ${text(row.id)}: ${error.message}`)
      increment(summary, 'pengeluaran', 'skipped')
    } else {
      increment(summary, 'pengeluaran', 'inserted')
    }
  }

  return { summary, errors }
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

    const { summary, errors } = await restoreOfflineBackup(payload, session)

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
