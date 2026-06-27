'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { X } from './icons'

interface Props {
  token: string
  onAccepted: () => void
}

const TERMS = [
  { t: 'Age requirement', d: 'You confirm you are at least 16 years old. Accounts found to belong to under-16 users are permanently removed.' },
  { t: 'Acceptable use', d: 'No illegal content, CSAM, non-consensual material, harassment, or spam. Violations are reported to the relevant authorities.' },
  { t: 'Anonymity & conduct', d: 'Anonymity does not remove your legal responsibility. Treat other people with basic dignity.' },
  { t: 'Ephemeral chats', d: 'Conversations are never stored. We keep only your account profile and any moderation reports.' },
  { t: 'No warranty', d: 'The service is provided “as is”, without guarantees of uptime, match quality, or other users’ behaviour.' },
]

export function TermsModal({ token, onAccepted }: Props) {
  const [accepting, setAccepting] = useState(false)

  async function accept() {
    setAccepting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me/terms/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      onAccepted()
    } catch {
      setAccepting(false)
    }
  }

  function dismiss() {
    // Closing without accepting logs the user out.
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Blurred image / backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(40rem 40rem at 20% 30%, hsl(var(--primary)/0.25), transparent 60%),' +
            'radial-gradient(35rem 35rem at 80% 70%, hsl(var(--primary)/0.18), transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Modal */}
      <div className="card relative w-full max-w-lg p-6 sm:p-8 animate-fade-in">
        <button
          onClick={dismiss}
          aria-label="Close and sign out"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg
                     border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        <div className="mb-5 pr-10">
          <h2 className="text-2xl font-semibold tracking-tight">Terms &amp; Conditions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please review and accept to continue. Closing this window will sign you out.
          </p>
        </div>

        <div className="mb-6 max-h-64 space-y-4 overflow-y-auto rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
          {TERMS.map(s => (
            <div key={s.t}>
              <h3 className="font-medium text-foreground">{s.t}</h3>
              <p className="text-muted-foreground">{s.d}</p>
            </div>
          ))}
          <p className="text-muted-foreground">
            Read the full{' '}
            <a href="/terms" target="_blank" className="text-primary underline-offset-2 hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-primary underline-offset-2 hover:underline">Privacy Policy</a>.
          </p>
        </div>

        <button onClick={accept} disabled={accepting} className="btn w-full py-3">
          {accepting ? 'Saving…' : 'I accept the Terms & Conditions'}
        </button>
      </div>
    </div>
  )
}
