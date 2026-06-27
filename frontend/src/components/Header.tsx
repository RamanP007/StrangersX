'use client'

import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { OnlinePill } from './OnlinePill'
import { ProfileMenu } from './ProfileMenu'

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/">
          <Logo size={32} textClassName="text-lg" />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/about"
            className="hidden px-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:block">
            About
          </Link>
          <Link href="/privacy"
            className="hidden px-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:block">
            Privacy Policy
          </Link>
          <Link href="/terms"
            className="hidden px-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:block">
            Terms &amp; Conditions
          </Link>

          <ThemeToggle />
          <OnlinePill />
          <ProfileMenu />
        </nav>
      </div>
    </header>
  )
}
