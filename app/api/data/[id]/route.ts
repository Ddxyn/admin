import { NextRequest, NextResponse } from 'next/server'
import { getSession, canEdit, canDelete } from '@/lib/auth'
import { getDataHarianById, updateDataHarian, deleteDataHarian, logActivity } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getDataHarianById(params.id)
    if (!data) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canEdit(session.role)) {
    return NextResponse.json({ error: 'Hanya admin yang bisa mengedit' }, { status: 403 })
  }

  try {
    const form = await req.json()
    await updateDataHarian(params.id, form, session.id!, session.nama)
    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'UPDATE_DATA_HARIAN',
      entity: 'data_harian',
      entityId: params.id,
      detail: { tanggal: form.tanggal },
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal update'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDelete(session.role)) {
    return NextResponse.json({ error: 'Hanya admin yang bisa menghapus' }, { status: 403 })
  }

  try {
    await deleteDataHarian(params.id)
    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'DELETE_DATA_HARIAN',
      entity: 'data_harian',
      entityId: params.id,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus' }, { status: 500 })
  }
}
