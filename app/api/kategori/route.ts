import { NextRequest, NextResponse } from 'next/server'
import { getSession, canInput } from '@/lib/auth'
import { getKategori, addKategori, deleteKategori } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getKategori()
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canInput(session.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }
  const { nama } = await req.json()
  if (!nama?.trim()) return NextResponse.json({ error: 'Nama wajib' }, { status: 400 })
  const data = await addKategori(nama)
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canInput(session.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

  try {
    await deleteKategori(id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Gagal hapus kategori' }, { status: 500 })
  }
}
