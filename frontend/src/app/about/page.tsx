import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about StrangerX — an anonymous platform that connects you with friendly strangers for instant text and video chat, with privacy built in.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About · StrangerX',
    description: 'Anonymous text & video chat with friendly strangers around the world.',
    url: '/about',
  },
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-28">
        <div className="card space-y-6 p-8">
          <div>
            <div className="mb-4 inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">About</div>
            <h1 className="text-3xl font-semibold tracking-tight">StrangerX</h1>
            <p className="mt-2 text-muted-foreground">Anonymous 16+ chat — no strings attached.</p>
          </div>

          <div className="space-y-4 leading-relaxed text-foreground/90">
            <p><strong className="text-foreground">StrangerX</strong> is an anonymous chat platform that connects you with a random stranger anywhere in the world — instantly.</p>
            <p>We believe in the freedom of real conversation without social pretense. No followers, no profiles, no algorithm deciding what you see. Just two people talking.</p>
            <p>You can sign in with Google for a consistent experience, or jump in as a guest with zero commitment. Conversations are never stored on our servers.</p>
            <p>Interested in a specific topic? Use our interest tags to find someone who shares your passions.</p>
          </div>

          <div className="flex gap-6 border-t border-border pt-6 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy →</Link>
            <Link href="/terms" className="text-primary hover:underline">Terms of Service →</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
