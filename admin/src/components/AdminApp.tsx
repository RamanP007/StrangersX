'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

function authHeaders(): Record<string, string> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function adminGet(path: string) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() })
  if (res.status === 401) {
    localStorage.removeItem('adminToken')
    location.reload()
    throw new Error('unauthorized')
  }
  if (!res.ok) throw new Error('request failed')
  return res.json()
}

type Tab = 'dashboard' | 'players' | 'issues'

export function AdminApp() {
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setToken(localStorage.getItem('adminToken'))
    setReady(true)
  }, [])

  if (!ready) return null
  if (!token) return <Login onLogin={(t) => { localStorage.setItem('adminToken', t); setToken(t) }} />
  return <Dashboard onLogout={() => { localStorage.removeItem('adminToken'); setToken(null) }} />
}

function Login({ onLogin }: { onLogin: (t: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) throw new Error('Invalid credentials')
      const data = await res.json()
      onLogin(data.token)
    } catch (e: any) {
      setErr(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const input = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <h1 className="text-xl font-bold">StrangerX <span className="text-violet-400">Admin</span></h1>
          <p className="mt-1 text-sm text-zinc-400">Sign in to the dashboard.</p>
        </div>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className={input} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={input} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('dashboard')
  const tabs: Tab[] = ['dashboard', 'players', 'issues']

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-6 text-lg font-bold">StrangerX <span className="text-violet-400">Admin</span></div>
        <nav className="flex flex-col gap-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-left text-sm capitalize transition-colors ${tab === t ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>
              {t}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} className="mt-auto rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800">
          Log out
        </button>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        {tab === 'dashboard' && <StatsView />}
        {tab === 'players' && <PlayersView />}
        {tab === 'issues' && <IssuesView />}
      </main>
    </div>
  )
}

function StatsView() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { adminGet('/api/admin/stats').then(setStats).catch(() => {}) }, [])

  const cards = [
    { label: 'Total players', value: stats?.totalUsers },
    { label: 'Online now', value: stats?.online },
    { label: 'Banned', value: stats?.bannedUsers },
    { label: 'Issues', value: stats?.totalIssues },
    { label: 'Reports', value: stats?.totalReports },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-sm text-zinc-400">{c.label}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{c.value ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayersView() {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    adminGet('/api/admin/players').then(d => setPlayers(d.players || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function toggleBan(p: any) {
    const action = p.banned ? 'unban' : 'ban'
    await fetch(`${API}/api/admin/players/${p.id}/${action}`, { method: 'POST', headers: authHeaders() })
    load()
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Players <span className="text-zinc-500">({players.length})</span></h1>
      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="p-3 text-left font-medium">Username</th>
              <th className="p-3 text-left font-medium">Email</th>
              <th className="p-3 text-left font-medium">Joined</th>
              <th className="p-3 text-left font-medium">Reports</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="p-3 font-medium">{p.username || '—'}</td>
                <td className="p-3 text-zinc-400">{p.email}</td>
                <td className="p-3 text-zinc-400">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                <td className="p-3 text-zinc-400">{p.reportCount ?? 0}</td>
                <td className="p-3">
                  {p.banned
                    ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">Banned</span>
                    : <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">Active</span>}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => toggleBan(p)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium text-white transition-colors ${p.banned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {p.banned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && players.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No players yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IssuesView() {
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    adminGet('/api/admin/issues').then(d => setIssues(d.issues || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Issues <span className="text-zinc-500">({issues.length})</span></h1>
      <div className="space-y-3">
        {issues.map(i => (
          <div key={i.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="whitespace-pre-wrap text-sm">{i.message}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span>{i.createdAt ? new Date(i.createdAt).toLocaleString() : '—'}</span>
              <span>IP: {i.ip || '—'}</span>
              <span>{i.userId ? `User: ${i.userId}` : 'Guest'}</span>
            </div>
          </div>
        ))}
        {!loading && issues.length === 0 && <p className="text-zinc-500">No issues reported.</p>}
      </div>
    </div>
  )
}
