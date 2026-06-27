'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { User } from '@/types'

interface BackendAuthValue {
  token: string | null
  user: User | null
  loading: boolean
  setUser: (u: User) => void
}

const BackendAuthContext = createContext<BackendAuthValue>({
  token: null,
  user: null,
  loading: true,
  setUser: () => {},
})

export function useBackendAuth() {
  return useContext(BackendAuthContext)
}

/**
 * Exchanges the Google ID token for a backend JWT + user **once** and shares it
 * app-wide via context. Previously chat, settings and the TermsGate each made
 * their own POST /api/auth/google call — this dedupes them to a single request
 * (and re-runs only when the underlying Google token actually changes).
 */
export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const lastIdToken = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    const idToken = (session as any)?.idToken ?? null
    if (!idToken) {
      lastIdToken.current = null
      setToken(null)
      setUser(null)
      setLoading(false)
      return
    }
    if (idToken === lastIdToken.current) return
    lastIdToken.current = idToken

    setLoading(true)
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, termsAccepted: true }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) {
          setToken(data.token)
          setUser(data.user)
        }
      } catch {
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [session, status])

  return (
    <BackendAuthContext.Provider value={{ token, user, loading, setUser }}>
      {children}
    </BackendAuthContext.Provider>
  )
}
