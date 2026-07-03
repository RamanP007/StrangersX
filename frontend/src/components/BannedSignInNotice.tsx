'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'

/**
 * Shows a ban notice when NextAuth's signIn callback refused a sign-in
 * attempt (redirects to `/?error=banned`). Reads location.search directly
 * (not useSearchParams) so it needs no Suspense boundary and doesn't opt
 * statically-rendered pages into dynamic rendering.
 */
export function BannedSignInNotice() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') !== 'banned') return

    toast.error('You have been logged out — your account was banned for suspicious activity.', { duration: 8000 })

    params.delete('error')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [])

  return null
}
