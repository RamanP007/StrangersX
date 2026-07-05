'use client'

import { useEffect, useRef, useState } from 'react'
import { wsUrl } from '@/lib/ws'

/**
 * Live online-users count, pushed over a presence WebSocket (no polling).
 * Each open tab is one real connection. When the real count is below 1000 we
 * pad it with a stable random baseline (500–1000) so the room never looks empty;
 * at/above 1000 we show the real number. The total rises live as users join.
 */
// A tab with no click/scroll/keypress for this long stops counting as online;
// the next interaction marks it active again.
const IDLE_MS = 10 * 60 * 1000

export function useOnlineCount() {
  const [real, setReal] = useState(0)
  const [ready, setReady] = useState(false)
  const baselineRef = useRef(700)

  useEffect(() => {
    // Pick the random baseline on the client only (avoids hydration mismatch).
    baselineRef.current = Math.floor(500 + Math.random() * 501) // 500..1000
    setReady(true)

    let ws: WebSocket | null = null
    let closed = false
    let retry: ReturnType<typeof setTimeout>

    // Activity tracking: an idle tab tells the server to stop counting it, and
    // any interaction marks it active again.
    let lastActivity = Date.now()
    let isActive = true

    function sendState(type: 'idle' | 'active') {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type }))
    }
    function goActive() {
      lastActivity = Date.now()
      if (!isActive) {
        isActive = true
        sendState('active')
      }
    }
    function checkIdle() {
      if (isActive && Date.now() - lastActivity >= IDLE_MS) {
        isActive = false
        sendState('idle')
      }
    }

    // Throttle: interactions fire constantly; we only need the latest timestamp.
    let throttled = false
    function onActivity() {
      lastActivity = Date.now()
      if (throttled) return
      throttled = true
      setTimeout(() => { throttled = false }, 1000)
      goActive()
    }

    const activityEvents = ['click', 'scroll', 'keydown', 'touchstart', 'mousemove'] as const
    activityEvents.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))
    const idleTimer = setInterval(checkIdle, 30000)

    function connect() {
      ws = new WebSocket(wsUrl('/ws/presence'))
      ws.onopen = () => {
        // Reflect current activity state on (re)connect — the server counts new
        // connections as active, so only correct it if we're currently idle.
        if (!isActive) sendState('idle')
      }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'online_count') setReal(Number(msg.count) || 0)
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 3000)
      }
    }
    connect()

    return () => {
      closed = true
      clearTimeout(retry)
      clearInterval(idleTimer)
      activityEvents.forEach(ev => window.removeEventListener(ev, onActivity))
      ws?.close()
    }
  }, [])

  const count = real >= 1000 ? real : baselineRef.current + real
  return { count, ready }
}
