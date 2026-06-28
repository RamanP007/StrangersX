'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useBackendAuth } from './BackendAuthProvider'
import { wsUrl } from '@/lib/ws'
import { LogOut } from './icons'

/**
 * Enforces one active session per account. Opens an "account" websocket; if the
 * same account signs in elsewhere, the backend pushes `force_logout` and this
 * session is signed out with a notice. Multiple tabs of the same browser share a
 * session and are unaffected.
 */
export function SessionGuard() {
  const { token } = useBackendAuth()
  const [kicked, setKicked] = useState(false)
  const kickedRef = useRef(false)

  useEffect(() => {
    if (!token) return
    let closedByUs = false
    let retry: ReturnType<typeof setTimeout>
    let ws: WebSocket | null = null

    function connect() {
      ws = new WebSocket(`${wsUrl('/ws/account')}?token=${encodeURIComponent(token!)}`)
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'force_logout') {
            kickedRef.current = true
            try { sessionStorage.removeItem('backendAuth') } catch { /* ignore */ }
            setKicked(true)
            ws?.close()
          }
        } catch { /* ignore */ }
      }
      ws.onclose = () => {
        if (!closedByUs && !kickedRef.current) retry = setTimeout(connect, 3000)
      }
    }
    connect()

    return () => {
      closedByUs = true
      clearTimeout(retry)
      ws?.close()
    }
  }, [token])

  // Safety: complete the logout even if the user ignores the dialog.
  useEffect(() => {
    if (!kicked) return
    const t = setTimeout(() => signOut({ callbackUrl: '/' }), 8000)
    return () => clearTimeout(t)
  }, [kicked])

  if (!kicked) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-8 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/40 text-destructive">
          <LogOut size={24} />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">You&apos;ve been signed out</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account was just signed in on another device. For your security, this session has been logged out.
        </p>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="btn mt-6 w-full py-3">
          OK
        </button>
      </div>
    </div>
  )
}
