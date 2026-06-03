// ============================================================
// app/api/auth/admin-exists/route.ts
// ============================================================
import { NextResponse } from 'next/server'
import { adminExists } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const exists = await adminExists()
    return NextResponse.json({ exists })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
