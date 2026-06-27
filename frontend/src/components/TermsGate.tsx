'use client'

import { useBackendAuth } from './BackendAuthProvider'
import { TermsModal } from './TermsModal'

/**
 * Global gate: shows a blocking Terms & Conditions modal on every page until a
 * signed-in user accepts. Reads the shared backend auth (no extra API call).
 * Guests are unaffected (they have no backend user).
 */
export function TermsGate() {
  const { token, user, setUser } = useBackendAuth()

  if (!token || !user || user.termsAndConditionAccepted) return null

  return (
    <TermsModal
      token={token}
      onAccepted={() => setUser({ ...user, termsAndConditionAccepted: true })}
    />
  )
}
