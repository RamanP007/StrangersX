'use client'

import { useEffect, useState } from 'react'
import { useBackendAuth } from './BackendAuthProvider'

/**
 * Full-screen loading overlay shown until the initial auth state is resolved
 * (session + backend exchange). This hides the brief flash of the sign-in button
 * and the blank online count while those requests settle. Content still renders
 * underneath (good for SEO); the overlay just fades out when ready.
 */
export function AppLoadingScreen() {
  const { loading } = useBackendAuth()
  const [minDone, setMinDone] = useState(false)
  const [fading, setFading] = useState(false)
  const [removed, setRemoved] = useState(false)

  // Minimum on-screen time so it isn't a jarring flash.
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 700)
    return () => clearTimeout(t)
  }, [])

  // Safety: never hang the loader.
  useEffect(() => {
    const t = setTimeout(() => setFading(true), 7000)
    return () => clearTimeout(t)
  }, [])

  // Fade out once everything is ready.
  useEffect(() => {
    if (!loading && minDone) setFading(true)
  }, [loading, minDone])

  // Remove from the DOM after the fade transition.
  useEffect(() => {
    if (!fading) return
    const t = setTimeout(() => setRemoved(true), 600)
    return () => clearTimeout(t)
  }, [fading])

  if (removed) return null

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-500
        ${fading ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <div className="relative flex flex-col items-center">
        {/* Soft glow */}
        <div className="absolute -top-4 h-48 w-48 animate-pulse rounded-full bg-primary/20 blur-3xl" />

        {/* Spinning rings + logo */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div
            className="loader-ring absolute inset-0"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, hsl(var(--primary)) 100%)',
              animation: 'loader-spin 1.4s linear infinite',
            }}
          />
          <div
            className="loader-ring absolute inset-3"
            style={{
              background: 'conic-gradient(from 180deg, transparent 0%, transparent 55%, hsl(280 85% 62%) 100%)',
              animation: 'loader-spin-rev 2s linear infinite',
            }}
          />
          {/* Orbiting dot */}
          <div className="absolute inset-0" style={{ animation: 'loader-spin 1.4s linear infinite' }}>
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
          </div>

          {/* Logo */}
          <div
            className="logo-mark relative flex h-16 w-16 items-center justify-center rounded-2xl text-white"
            style={{ animation: 'loader-pulse 2s ease-in-out infinite' }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <circle cx="9" cy="12" r="5.4" />
              <circle cx="15" cy="12" r="5.4" />
            </svg>
          </div>
        </div>

        {/* Wordmark + caption */}
        <div className="loader-shimmer mt-8 text-2xl font-bold tracking-tight">StrangerX</div>
        <p className="mt-2 text-sm text-muted-foreground">Setting things up…</p>
      </div>
    </div>
  )
}
