'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { X } from './icons'

const REASONS = [
  'Harassment or bullying',
  'Explicit or inappropriate content',
  'Spam or advertising',
  'Hate speech',
  'Underage user',
  'Other',
]

interface Props {
  roomId: string | null
  partnerSocketId?: string
  onClose: () => void
  token: string | null
}

export function ReportModal({ roomId, partnerSocketId, onClose, token }: Props) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!reason) return
    setLoading(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token && token.length > 60) headers['Authorization'] = `Bearer ${token}`
      else if (token) headers['X-Guest-Token'] = token

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reportedSocketId: partnerSocketId ?? 'unknown',
          reason,
          note,
          roomId: roomId ?? '',
        }),
      })
      toast.success('Report submitted. Thank you.')
      onClose()
    } catch {
      toast.error('Failed to submit report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md space-y-4 p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Report stranger</h2>
          <button onClick={onClose} aria-label="Close"
            className="text-muted-foreground transition-colors hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)} className="input">
            <option value="" disabled>Select a reason…</option>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Additional note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Describe what happened…" className="input resize-none" />
        </div>

        <div className="flex gap-3">
          <button onClick={submit} disabled={!reason || loading} className="btn flex-1">
            {loading ? 'Submitting…' : 'Submit report'}
          </button>
          <button onClick={onClose} className="btn-outline px-4">Cancel</button>
        </div>
      </div>
    </div>
  )
}
