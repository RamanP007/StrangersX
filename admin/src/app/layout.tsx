import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StrangerX Admin',
  description: 'Admin dashboard',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-200 antialiased">{children}</body>
    </html>
  )
}
