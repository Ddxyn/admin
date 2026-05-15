import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { setSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { nama } = await req.json()
    if (!nama?.trim()) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
    }

    // Catat kunjungan
    await supabaseAdmin.from('visitor_log').insert({
      nama: nama.trim(),
      ip_address: req.headers.get('x-forwarded-for') ?? null,
    })

    // Set session visitor (tanpa id database)
    const sessionUser = {
      id: `visitor-${Date.now()}`,
      nama: nama.trim(),
      role: 'melihat' as const,
      isVisitor: true,
    }

    await setSessionCookie(sessionUser)
    return NextResponse.json({ user: sessionUser })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
