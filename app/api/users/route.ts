import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession, canInput, canManageUsers } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getNamaHistory, getUsers, logActivity } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  if (searchParams.get('type') === 'history') {
    if (!canInput(session.role)) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }
    const data = await getNamaHistory()
    return NextResponse.json(data)
  }

  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }

  try {
    const data = await getUsers()
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil pengguna' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const nama = typeof body.nama === 'string' ? body.nama.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const keterangan = typeof body.keterangan === 'string' ? body.keterangan.trim() : null

    if (!nama || !password) {
      return NextResponse.json({ error: 'Nama dan password wajib diisi' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ nama, password_hash, role: 'petugas', keterangan })
      .select('id, nama, role, keterangan, aktif, created_at')
      .single()

    if (error) throw error

    await logActivity({
      userId: session.id,
      userName: session.nama,
      action: 'CREATE_USER',
      entity: 'users',
      entityId: data.id,
      detail: { role: 'petugas' },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal membuat petugas'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
