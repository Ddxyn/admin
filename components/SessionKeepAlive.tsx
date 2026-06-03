'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const PING_INTERVAL = 8 * 60 * 1000
const MIN_INTERACTION = 5 * 60 * 1000
const MAX_FAILS = 3

export default function SessionKeepAlive() {
  const router = useRouter()
  const lastPing = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const failCount = useRef(0)

  const ping = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'X-Refresh-Type': 'keepalive' },
      })

      if (res.status === 401) {
        failCount.current++
        if (failCount.current >= MAX_FAILS) {
          router.push('/login?reason=session_expired')
        }
        return
      }

      failCount.current = 0
      lastPing.current = Date.now()
    } catch {
      // Keep the current session state when the network is briefly unavailable.
    }
  }, [router])

  useEffect(() => {
    lastPing.current = Date.now()
    timerRef.current = setInterval(ping, PING_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [ping])

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return

      const elapsed = Date.now() - lastPing.current
      if (elapsed > MIN_INTERACTION) {
        void ping()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [ping])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    function handleInteraction() {
      const elapsed = Date.now() - lastPing.current
      if (elapsed > MIN_INTERACTION) void ping()
    }

    events.forEach(eventName => window.addEventListener(eventName, handleInteraction, { passive: true }))
    return () => events.forEach(eventName => window.removeEventListener(eventName, handleInteraction))
  }, [ping])

  return null
}
