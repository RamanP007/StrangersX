'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Spinner, ArrowRight } from './icons'

export function StartRandomChatButton({ label = 'Start random chat' }: { label?: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  async function go() {
    sessionStorage.setItem('chatIntent', 'video')
    if (session?.user) {
      router.push('/chat')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/guest/session`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { guestToken } = await res.json()
      sessionStorage.setItem('guestToken', guestToken)
      router.push('/chat')
    } catch {
      toast.error('Could not start. Is the server running?')
      setLoading(false)
    }
  }

  return (
    <button onClick={go} disabled={loading} className="btn px-8 py-3.5 text-base">
      {loading ? <Spinner size={18} /> : null}
      {label}
      {!loading && <ArrowRight size={18} />}
    </button>
  )
}
