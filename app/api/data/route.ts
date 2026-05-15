// ============================================================
// app/api/data/route.ts — GET list + POST create
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSession, canInput } from '@/lib/auth'
import { getDataHarianList, createDataHarian, logActivity } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const data = await getDataHarianList({ from, to, limit, offset })
    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canInput(session.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  try {
    const form = await req.json()
    if (!form.tanggal || !form.harga_per_kg) {
      return NextResponse.json({ error: 'Tanggal dan harga wajib diisi' }, { status: 400 })
    }

    const data = await createDataHarian(form, session.id!, session.nama)

    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'CREATE_DATA_HARIAN',
      entity: 'data_harian',
      entityId: data.id,
      detail: { tanggal: form.tanggal },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan data'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
