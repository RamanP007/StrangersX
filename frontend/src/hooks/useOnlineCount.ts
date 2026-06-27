'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Live online-users count, pushed over a presence WebSocket (no polling).
 * Each open tab is one real connection. When the real count is below 1000 we
 * pad it with a stable random baseline (500–1000) so the room never looks empty;
 * at/above 1000 we show the real number. The total rises live as users join.
 */
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

    function connect() {
      const url = `${process.env.NEXT_PUBLIC_SOCKET_URL!.replace(/^http/, 'ws')}/ws/presence`
      ws = new WebSocket(url)
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
      ws?.close()
    }
  }, [])

  const count = real >= 1000 ? real : baselineRef.current + real
  return { count, ready }
}
