'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { useBackendAuth } from '@/components/BackendAuthProvider'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { token, user, loading, setUser } = useBackendAuth()

  const [username, setUsername] = useState('')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Settings is for registered users only.
  useEffect(() => {
    if (sessionStatus !== 'loading' && !session) router.push('/')
  }, [session, sessionStatus, router])

  // Seed the username field once the profile loads.
  useEffect(() => {
    if (user) setUsername(user.username)
  }, [user])

  useEffect(() => {
    if (!token || !user) return
    if (username === user.username) { setAvailable(true); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setAvailable(null); return }
    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/username/check?username=${encodeURIComponent(username)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        const data = await res.json()
        setAvailable(Boolean(data.available))
      } catch { setAvailable(null) } finally { setChecking(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [username, token, user])

  async function saveUsername() {
    if (!token) return
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { toast.error('3–20 chars: letters, numbers, underscore.'); return }
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me/username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      })
      if (res.status === 409) { toast.error('That username is already taken.'); setAvailable(false); return }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUser(data.user)
      toast.success('Username updated!')
    } catch { toast.error('Could not update username.') } finally { setSaving(false) }
  }

  async function deleteAccount() {
    if (!token) return
    setDeleting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast.success('Account deleted.')
      await signOut({ callbackUrl: '/' })
    } catch { toast.error('Could not delete account.'); setDeleting(false) }
  }

  const dirty = user && username !== user.username

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-28">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">Settings</h1>

        {loading ? (
          <div className="card p-8 text-center text-muted-foreground">Loading…</div>
        ) : !user ? (
          <div className="card p-8 text-center text-muted-foreground">Could not load profile.</div>
        ) : (
          <div className="space-y-6">
            <div className="card flex items-center gap-4 p-6">
              {user.avatar && (
                <Image src={user.avatar} alt="avatar" width={56} height={56}
                  className="rounded-full border border-border" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="card space-y-3 p-6">
              <label className="text-sm font-medium">Username</label>
              <div className="relative">
                <input value={username} onChange={e => setUsername(e.target.value)} maxLength={20} className="input pr-24" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs">
                  {checking && <span className="text-muted-foreground">checking…</span>}
                  {!checking && dirty && available === true && <span className="text-primary">available</span>}
                  {!checking && dirty && available === false && <span className="text-destructive">taken</span>}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">3–20 characters · letters, numbers, underscore</p>
              <button onClick={saveUsername} disabled={!dirty || saving || available === false || checking}
                className="btn px-6 py-2.5 text-sm">
                {saving ? 'Saving…' : 'Save username'}
              </button>
            </div>

            <div className="card space-y-4 p-6">
              <div>
                <h2 className="font-medium text-destructive">Danger zone</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deleting your account is permanent and cannot be undone.
                </p>
              </div>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="rounded-lg border border-destructive/50 px-6 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                  Delete my account
                </button>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={deleteAccount} disabled={deleting} className="btn-destructive px-6 py-2.5">
                    {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="btn-outline px-6 py-2.5">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
