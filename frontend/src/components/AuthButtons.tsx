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

export function AuthButtons({ intent, stacked = false }: { intent?: Intent; stacked?: boolean } = {}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null)

  // In narrow containers (e.g. the promo card) stack full-width; otherwise sit side-by-side.
  const containerClass = stacked
    ? 'flex w-full flex-col gap-3'
    : 'flex flex-col justify-center gap-3 sm:flex-row'
  const sizeClass = stacked ? 'w-full py-3 text-base' : 'min-w-[220px] py-3 text-base'

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
      <div className={stacked ? 'flex w-full' : 'flex justify-center'}>
        <button
          onClick={() => { rememberIntent(intent); router.push('/chat') }}
          className={`btn text-base ${stacked ? 'w-full py-3' : 'px-8 py-3'}`}
        >
          {intent === 'video' ? 'Start video chat' : 'Start chatting'}
        </button>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <button onClick={handleGoogleSignIn} disabled={loading !== null}
        className={`btn ${sizeClass}`}>
        {loading === 'google' ? (
          <Spinner size={18} />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-white">
            <Google size={16} />
          </span>
        )}
        Sign in with Google
      </button>

      <button onClick={handleGuest} disabled={loading !== null}
        className={`btn-outline ${sizeClass}`}>
        {loading === 'guest' ? <Spinner size={18} /> : null}
        Chat as guest
      </button>
    </div>
  )
}
