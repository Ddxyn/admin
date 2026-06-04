import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteDataHarianByDateRange, logActivity } from '@/lib/db'

export const runtime = 'nodejs'

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const from = body.from
    const to = body.to

    if (!isDateString(from) || !isDateString(to)) {
      return NextResponse.json({ error: 'Tanggal awal dan akhir wajib diisi' }, { status: 400 })
    }
    if (from > to) {
      return NextResponse.json({ error: 'Tanggal awal tidak boleh melebihi tanggal akhir' }, { status: 400 })
    }

    const result = await deleteDataHarianByDateRange(from, to)

    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'DELETE_DATA_RANGE',
      entity: 'data_harian',
      detail: {
        from,
        to,
        deleted_count: result.deletedCount,
        first_date: result.firstDate,
        last_date: result.lastDate,
      },
    })

    return NextResponse.json({ data: result })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gagal menghapus data' },
      { status: 500 }
    )
  }
}
