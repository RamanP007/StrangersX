import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your StrangerX profile, username, and account.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/settings' },
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
