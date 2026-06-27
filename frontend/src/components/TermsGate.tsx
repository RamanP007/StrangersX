'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { TermsModal } from './TermsModal'

/**
 * Global gate: for Google-signed-in users, checks whether Terms & Conditions
 * have been accepted in the database. If not, shows a blocking modal on every
 * page (and after refresh / re-login) until the user accepts. Guests are
 * unaffected (they have no next-auth session).
 */
export function TermsGate() {
  const { data: session, status } = useSession()
  const [token, setToken] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<boolean | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    const idToken = (session as any)?.idToken
    if (!idToken) return

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
        if (cancelled) return
        setToken(data.token)
        setAccepted(Boolean(data.user?.termsAndConditionAccepted))
      } catch {
        /* ignore — gate simply won't show */
      }
    })()

    return () => { cancelled = true }
  }, [session, status])

  if (!token || accepted !== false) return null

  return <TermsModal token={token} onAccepted={() => setAccepted(true)} />
}
