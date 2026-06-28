'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { OnlinePill } from './OnlinePill'
import { ProfileMenu } from './ProfileMenu'
import { HeaderSignInButton } from './HeaderSignInButton'
import { Menu, X, User, LogOut, Google } from './icons'

export function Header() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      {/* ── Desktop ── */}
      <div className="mx-auto hidden h-16 max-w-6xl items-center justify-between px-4 lg:flex">
        <Link href="/">
          <Logo size={32} textClassName="text-lg" />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/about" className="px-2 text-sm text-muted-foreground transition-colors hover:text-foreground">About</Link>
          <Link href="/privacy" className="px-2 text-sm text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="px-2 text-sm text-muted-foreground transition-colors hover:text-foreground">Terms &amp; Conditions</Link>
          <HeaderSignInButton />
          <OnlinePill />
          <ProfileMenu />
          <ThemeToggle />
        </nav>
      </div>

      {/* ── Mobile: hamburger · logo · online ── */}
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-4 lg:hidden">
        <div className="flex justify-start">
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="flex justify-center">
          <Link href="/" onClick={close}>
            <Logo size={30} textClassName="text-base" />
          </Link>
        </div>

        <div className="flex justify-end">
          <OnlinePill compact />
        </div>
      </div>

      {/* ── Mobile menu drawer ── */}
      {open && (
        <>
          <div className="fixed inset-x-0 bottom-0 top-16 z-40 lg:hidden" onClick={close} />
          <nav className="relative z-50 flex flex-col border-t border-border bg-background p-2 animate-fade-in lg:hidden">
            <Link href="/about" onClick={close} className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted">About</Link>
            <Link href="/privacy" onClick={close} className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted">Privacy Policy</Link>
            <Link href="/terms" onClick={close} className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted">Terms &amp; Conditions</Link>

            <div className="my-1 border-t border-border" />

            {session?.user ? (
              <>
                <Link href="/settings" onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted">
                  <User size={16} className="text-muted-foreground" /> Profile
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10">
                  <LogOut size={16} /> Log out
                </button>
              </>
            ) : (
              <button onClick={() => signIn('google')} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-white">
                  <Google size={13} />
                </span>
                Sign in with Google
              </button>
            )}

            <div className="my-1 border-t border-border" />

            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
