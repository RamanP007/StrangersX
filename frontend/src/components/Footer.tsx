import Link from 'next/link'
import { Logo } from './Logo'
import { ReportIssue } from './ReportIssue'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo size={24} textClassName="text-sm" />

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/about" className="transition-colors hover:text-foreground">About</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <ReportIssue />
        </nav>

        <p className="text-xs text-muted-foreground">
          16+ only · {new Date().getFullYear()} StrangerX
        </p>
      </div>
    </footer>
  )
}
