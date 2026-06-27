'use client'

import { useEffect, useRef } from 'react'

// Animated aurora background + a glow that follows the cursor. Sits behind all
// content; pointer-events disabled; honors prefers-reduced-motion (CSS).
export function BackgroundFX() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el!.style.setProperty('--bgfx-x', `${e.clientX}px`)
        el!.style.setProperty('--bgfx-y', `${e.clientY}px`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden className="bgfx">
      <span className="bgfx-blob bgfx-blob-1" />
      <span className="bgfx-blob bgfx-blob-2" />
      <span className="bgfx-blob bgfx-blob-3" />
      <span className="bgfx-grid" />
      <span className="bgfx-cursor" />
    </div>
  )
}
