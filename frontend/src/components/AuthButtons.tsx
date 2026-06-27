'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Google, Spinner } from './icons'

type Intent = 'text' | 'video'

function rememberIntent(intent?: Intent) {
  if (intent) sessionStorage.setItem('chatIntent', intent)
}

export function AuthButtons({ intent }: { intent?: Intent } = {}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null)

  async function handleGoogleSignIn() {
    rememberIntent(intent)
    setLoading('google')
    const result = await signIn('google', { redirect: false })
    if (result?.error) {
      toast.error('Sign in failed. Please try again.')
      setLoading(null)
    }
  }

  async function handleGuest() {
    rememberIntent(intent)
    setLoading('guest')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/guest/session`, { method: 'POST' })
      if (!res.ok) throw new Error('session failed')
      const { guestToken } = await res.json()
      sessionStorage.setItem('guestToken', guestToken)
      router.push('/chat')
    } catch {
      toast.error('Could not create guest session. Is the server running?')
      setLoading(null)
    }
  }

  if (session?.user) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => { rememberIntent(intent); router.push('/chat') }}
          className="btn px-8 py-3 text-base"
        >
          {intent === 'video' ? 'Start video chat' : 'Start chatting'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center gap-3 sm:flex-row">
      <button onClick={handleGoogleSignIn} disabled={loading !== null}
        className="btn min-w-[220px] py-3 text-base">
        {loading === 'google' ? <Spinner size={18} /> : <Google size={18} />}
        Sign in with Google
      </button>

      <button onClick={handleGuest} disabled={loading !== null}
        className="btn-outline min-w-[220px] py-3 text-base">
        {loading === 'guest' ? <Spinner size={18} /> : null}
        Chat as guest
      </button>
    </div>
  )
}
