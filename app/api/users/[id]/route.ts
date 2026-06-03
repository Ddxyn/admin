import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession, canManageUsers, invalidateDbSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/db'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const update: Record<string, unknown> = {}

    if (body.nama) update.nama = body.nama.trim()
    if (body.keterangan !== undefined) update.keterangan = body.keterangan
    if (typeof body.aktif === 'boolean') {
      update.aktif = body.aktif
      // Jika nonaktif, hapus sesi
      if (!body.aktif) await invalidateDbSession(id)
    }
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
      }
      update.password_hash = await bcrypt.hash(body.password, 12)
    }

    update.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(update)
      .eq('id', id)
      .select('id, nama, role, keterangan, aktif')
      .single()

    if (error) throw error

    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'UPDATE_USER',
      entity: 'users',
      entityId: id,
      detail: { changes: Object.keys(update) },
    })

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal update'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }
  const { id } = await params
  // Tidak bisa hapus diri sendiri
  if (id === session.id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }

  try {
    await invalidateDbSession(id)
    await supabaseAdmin.from('users').delete().eq('id', id)
    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'DELETE_USER',
      entity: 'users',
      entityId: id,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus' }, { status: 500 })
  }
}
