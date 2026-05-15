// ============================================================
// app/api/stats/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getRingkasan, getTrendData, getPengeluaranByKategori } from '@/lib/db'
import { todayStr, thisWeekRange, thisMonthRange } from '@/lib/format'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'month'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let dateFrom: string, dateTo: string

  if (from && to) {
    dateFrom = from; dateTo = to
  } else if (period === 'today') {
    dateFrom = dateTo = todayStr()
  } else if (period === 'week') {
    const r = thisWeekRange(); dateFrom = r.from; dateTo = r.to
  } else {
    const r = thisMonthRange(); dateFrom = r.from; dateTo = r.to
  }

  try {
    const [ringkasan, trend, pengeluaranKat] = await Promise.all([
      getRingkasan(dateFrom, dateTo),
      getTrendData(dateFrom, dateTo),
      getPengeluaranByKategori(dateFrom, dateTo),
    ])

    return NextResponse.json({ ringkasan, trend, pengeluaranKat, dateFrom, dateTo })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal mengambil statistik' }, { status: 500 })
  }
}
