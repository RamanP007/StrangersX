'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'
import { User, LogOut, ChevronDown } from './icons'

export function ProfileMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  if (!session?.user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full border border-border p-0.5 pr-1.5
                   transition-colors hover:bg-muted"
      >
        {session.user.image ? (
          <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
            <User size={16} />
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-xl
                     animate-fade-in"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{session.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>

          <div className="p-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <User size={16} className="text-muted-foreground" />
              Profile
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
