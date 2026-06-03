import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { setSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'

function authErrorMessage(err: unknown) {
  if (err instanceof Error && err.message.includes('JWT_SECRET')) {
    return 'Konfigurasi server belum lengkap: JWT_SECRET belum valid'
  }
  return 'Server error'
}

export async function POST(req: NextRequest) {
  try {
    const { nama } = await req.json()
    if (!nama?.trim()) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
    }

    // Set session visitor (tanpa id database)
    const sessionUser = {
      id: `visitor-${Date.now()}`,
      nama: nama.trim(),
      role: 'melihat' as const,
      isVisitor: true,
    }

    await setSessionCookie(sessionUser)

    // Catat kunjungan. Log tidak boleh menggagalkan akses pengunjung.
    const { error: logError } = await supabaseAdmin.from('visitor_log').insert({
      nama: nama.trim(),
      ip_address: req.headers.get('x-forwarded-for') ?? null,
    })
    if (logError) {
      console.warn('Gagal mencatat visitor_log:', logError.message)
    }

    return NextResponse.json({ user: sessionUser })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: authErrorMessage(err) }, { status: 500 })
  }
}
