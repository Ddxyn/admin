'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionUser } from '@/types'

const REFRESH_INTERVAL = 10 * 60 * 1000 // refresh token setiap 10 menit
const ACTIVITY_DEBOUNCE = 60 * 1000     // min 1 menit antar refresh karena activity

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const lastRefresh = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'GET' })
      if (!res.ok) {
        setUser(null)
        return false
      }
      const data = await res.json()
      if (data.valid && data.user) {
        setUser(data.user)
        return true
      }
      setUser(null)
      return false
    } catch {
      return false
    }
  }, [])

  const refreshSession = useCallback(async () => {
    const now = Date.now()
    if (now - lastRefresh.current < ACTIVITY_DEBOUNCE) return
    lastRefresh.current = now
    try {
      await fetch('/api/auth/refresh', { method: 'POST' })
    } catch {
      // silent fail — tidak logout paksa saat offline/error jaringan
    }
  }, [])

  // Cek session saat mount
  useEffect(() => {
    checkSession().finally(() => setLoading(false))
  }, [checkSession])

  // Auto-refresh setiap 10 menit supaya tidak logout sendiri
  useEffect(() => {
    intervalRef.current = setInterval(refreshSession, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refreshSession])

  // Refresh saat user aktif (klik / ketik / scroll)
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handler = () => refreshSession()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [refreshSession])

  // Refresh saat tab aktif kembali (visibility change)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') refreshSession()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refreshSession])

  return { user, loading, refreshSession, checkSession }
}
