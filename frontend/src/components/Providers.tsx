'use client'

import { useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { BackendAuthProvider } from './BackendAuthProvider'
import { TermsGate } from './TermsGate'
import { AppLoadingScreen } from './AppLoadingScreen'
import { SessionGuard } from './SessionGuard'
import { BannedSignInNotice } from './BannedSignInNotice'
import { CopyGuard } from './CopyGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  // Toasts sit bottom-center on mobile (top-right overlaps the header/controls
  // on small screens); desktop keeps the original top-right placement.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SessionProvider refetchOnWindowFocus={false}>
        <BackendAuthProvider>
          {children}
          <AppLoadingScreen />
          <SessionGuard />
          <TermsGate />
          <BannedSignInNotice />
          <CopyGuard />
          <Toaster
            position={isMobile ? 'bottom-center' : 'top-right'}
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </BackendAuthProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
