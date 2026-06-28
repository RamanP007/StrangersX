'use client'

import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { ArrowRight } from './icons'

export function StartRandomChatButton({ label = 'Start random chat' }: { label?: string }) {
  const router = useRouter()
  const { data: session } = useSession()

  // Random video chat requires a signed-in account.
  function go() {
    sessionStorage.setItem('chatIntent', 'video')
    if (session?.user) {
      router.push('/chat')
    } else {
      signIn('google', { callbackUrl: '/chat' })
    }
  }

  return (
    <button onClick={go} className="btn px-8 py-3.5 text-base">
      {label}
      <ArrowRight size={18} />
    </button>
  )
}
