'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Sparkles } from './icons'

interface Props {
  token: string
  initialUsername: string
  onDone: (finalUsername: string) => void
}

export function UsernamePopup({ token, initialUsername, onDone }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialUsername)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) return
    if (value === initialUsername) { setAvailable(true); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) { setAvailable(null); return }

    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/username/check?username=${encodeURIComponent(value)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        const data = await res.json()
        setAvailable(Boolean(data.available))
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [value, editing, initialUsername, token])

  async function keep() {
    setSaving(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me/username/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      onDone(initialUsername)
    } catch {
      toast.error('Something went wrong.')
      setSaving(false)
    }
  }

  async function save() {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
      toast.error('3–20 characters: letters, numbers, underscore.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me/username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: value }),
      })
      if (res.status === 409) { toast.error('That username is already taken.'); setAvailable(false); setSaving(false); return }
      if (!res.ok) throw new Error()
      toast.success('Username set!')
      onDone(value)
    } catch {
      toast.error('Could not save username.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-8 animate-fade-in">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border text-primary">
            <Sparkles size={24} />
          </div>
          <h2 className="mb-1 text-2xl font-semibold tracking-tight">
            {editing ? 'Pick your username' : 'Your username is ready'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {editing ? 'Make it yours — it must be unique.' : 'We generated one for you. Keep it or change it.'}
          </p>
        </div>

        {!editing ? (
          <>
            <div className="mb-6 rounded-xl border border-border bg-muted px-4 py-5 text-center">
              <span className="text-2xl font-semibold tracking-tight">{initialUsername}</span>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={keep} disabled={saving} className="btn w-full py-3">
                {saving ? 'Saving…' : 'Keep this name'}
              </button>
              <button onClick={() => { setEditing(true); setValue(initialUsername) }} disabled={saving}
                className="btn-outline w-full py-3">
                Choose my own
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative mb-2">
              <input autoFocus value={value} onChange={e => setValue(e.target.value)} maxLength={20}
                placeholder="username" className="input pr-24" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs">
                {checking && <span className="text-muted-foreground">checking…</span>}
                {!checking && available === true && <span className="text-primary">available</span>}
                {!checking && available === false && <span className="text-destructive">taken</span>}
              </span>
            </div>
            <p className="mb-6 text-xs text-muted-foreground">3–20 characters · letters, numbers, underscore</p>

            <div className="flex flex-col gap-3">
              <button onClick={save} disabled={saving || available === false || checking} className="btn w-full py-3">
                {saving ? 'Saving…' : 'Save username'}
              </button>
              <button onClick={() => setEditing(false)} disabled={saving} className="btn-outline w-full py-3">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
