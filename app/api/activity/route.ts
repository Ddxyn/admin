import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getActivityLog } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '30')
  const data = await getActivityLog(limit)
  return NextResponse.json({ data })
}
