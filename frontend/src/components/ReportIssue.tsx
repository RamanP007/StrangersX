'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useBackendAuth } from './BackendAuthProvider'
import { X } from './icons'

export function ReportIssue() {
  const { token } = useBackendAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    const msg = message.trim()
    if (!msg) return
    setSending(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: msg }),
      })
      if (!res.ok) throw new Error()
      toast.success('Thanks! Your report has been recorded.')
      setMessage('')
      setOpen(false)
    } catch {
      toast.error('Could not submit. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="transition-colors hover:text-foreground">
        Report an issue
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md space-y-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Report an issue</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"
                className="text-muted-foreground transition-colors hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Tell us what went wrong or what could be better. {token ? '' : 'You can report anonymously.'}
            </p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Describe the issue…"
              className="input resize-none"
            />
            <div className="flex gap-3">
              <button onClick={submit} disabled={!message.trim() || sending} className="btn flex-1">
                {sending ? 'Sending…' : 'Submit'}
              </button>
              <button onClick={() => setOpen(false)} className="btn-outline px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
