'use client'

import { signIn, useSession } from 'next-auth/react'
import { Google } from './icons'

export function HeaderSignInButton() {
  const { data: session } = useSession()

  // Render optimistically (signed-out) so the button shows instantly instead of
  // popping in after the session request resolves. Hides once a session loads.
  if (session?.user) return null

  return (
    <button onClick={() => signIn('google')} className="btn px-3 py-1.5 text-sm">
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-white">
        <Google size={13} />
      </span>
      <span className="hidden sm:inline">Sign in with Google</span>
      <span className="sm:hidden">Sign in</span>
    </button>
  )
}
