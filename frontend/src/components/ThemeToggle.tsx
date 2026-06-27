'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from './icons'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  function applyTheme(next: 'light' | 'dark') {
    const root = document.documentElement
    root.classList.toggle('dark', next === 'dark')
    root.style.colorScheme = next
  }

  function handleToggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next: 'light' | 'dark' = isDark ? 'light' : 'dark'
    const root = document.documentElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supportsVT = typeof (document as any).startViewTransition === 'function'

    // Fallback: smooth color cross-fade of the whole UI.
    if (reduce || !supportsVT) {
      root.classList.add('theme-transition')
      setTheme(next)
      window.setTimeout(() => root.classList.remove('theme-transition'), 600)
      return
    }

    // Mesmerizing: reveal the new theme with a circle expanding from the toggle.
    const x = e.clientX
    const y = e.clientY
    const transition = (document as any).startViewTransition(() => applyTheme(next))
    transition.ready.then(() => {
      const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
      root.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: 600,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    // Persist to next-themes (keeps its state + localStorage in sync).
    setTheme(next)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={handleToggle}
      className="relative inline-flex h-7 w-[54px] flex-shrink-0 items-center rounded-full border border-border
                 bg-muted transition-colors hover:border-foreground/25"
    >
      {/* faded track icons */}
      <Sun size={13} className="absolute left-[7px] text-amber-500/70" />
      <Moon size={13} className="absolute right-[7px] text-slate-400" />

      {/* sliding thumb showing the active icon */}
      <span
        className={`relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-card
                    shadow-sm ring-1 ring-border transition-transform duration-500
                    [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
                    ${mounted && isDark ? 'translate-x-[29px]' : 'translate-x-[3px]'}`}
      >
        {mounted ? (
          isDark ? <Moon size={13} className="text-foreground" /> : <Sun size={13} className="text-amber-500" />
        ) : null}
      </span>
    </button>
  )
}
