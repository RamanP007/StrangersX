import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Start an anonymous text or video chat with a stranger.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/chat' },
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
