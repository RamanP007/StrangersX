'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
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

const CACHE_KEY = 'backendAuth'

interface Cache { idToken: string; token: string; user: User }

function readCache(idToken: string): Cache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Cache
    return c.idToken === idToken ? c : null
  } catch {
    return null
  }
}

function writeCache(c: Cache) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch { /* ignore */ }
}

/**
 * Exchanges the Google ID token for a backend JWT + user **once** and shares it
 * app-wide via context. The result is cached in sessionStorage (keyed by the
 * Google token), so subsequent loads are instant instead of waiting on the
 * backend's Google verification round-trip.
 */
export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const processedRef = useRef<string | null>(null) // idToken we've started handling
  const activeIdToken = useRef<string | null>(null) // the currently-valid idToken
  const tokenRef = useRef<string | null>(null)

  // setUser also refreshes the cache so profile/terms changes survive a reload.
  const setUser = useCallback((u: User) => {
    setUserState(u)
    if (activeIdToken.current && tokenRef.current) {
      writeCache({ idToken: activeIdToken.current, token: tokenRef.current, user: u })
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    const idToken = (session as any)?.idToken ?? null
    activeIdToken.current = idToken

    if (!idToken) {
      processedRef.current = null
      tokenRef.current = null
      setToken(null)
      setUserState(null)
      setLoading(false)
      return
    }

    // Same token, already handled (e.g. session object re-created) — do nothing,
    // so we never cancel an in-flight exchange and leave loading stuck.
    if (processedRef.current === idToken) return
    processedRef.current = idToken

    // Cached exchange → instant.
    const cached = readCache(idToken)
    if (cached) {
      tokenRef.current = cached.token
      setToken(cached.token)
      setUserState(cached.user)
      setLoading(false)
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, termsAccepted: true }),
        })
        if (res.status === 403) {
          // Banned (should be rare — the NextAuth signIn callback already
          // blocks this — but close the gap for races/backend-unreachable
          // fallthrough): fully sign out, don't leave a half-authenticated
          // NextAuth session with no backend token.
          toast.error('You have been logged out — your account was banned for suspicious activity.', { duration: 8000 })
          try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
          await signOut({ callbackUrl: '/' })
          return
        }
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (activeIdToken.current !== idToken) return // token changed meanwhile
        tokenRef.current = data.token
        setToken(data.token)
        setUserState(data.user)
        writeCache({ idToken, token: data.token, user: data.user })
      } catch {
        if (activeIdToken.current !== idToken) return
        tokenRef.current = null
        setToken(null)
        setUserState(null)
      } finally {
        if (activeIdToken.current === idToken) setLoading(false)
      }
    })()
  }, [session, status])

  return (
    <BackendAuthContext.Provider value={{ token, user, loading, setUser }}>
      {children}
    </BackendAuthContext.Provider>
  )
}
