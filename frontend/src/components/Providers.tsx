'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { BackendAuthProvider } from './BackendAuthProvider'
import { TermsGate } from './TermsGate'
import { AppLoadingScreen } from './AppLoadingScreen'
import { SessionGuard } from './SessionGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SessionProvider refetchOnWindowFocus={false}>
        <BackendAuthProvider>
          {children}
          <AppLoadingScreen />
          <SessionGuard />
          <TermsGate />
          <Toaster
            position="top-right"
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
