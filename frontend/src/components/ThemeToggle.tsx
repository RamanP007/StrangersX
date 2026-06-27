'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from './icons'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border
                 text-muted-foreground transition-all duration-200 ease-out
                 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground active:scale-95"
    >
      <span className="relative h-[18px] w-[18px]">
        {/* Sun (shown in dark mode → click to go light) */}
        <Sun
          size={18}
          className={`absolute inset-0 transition-all duration-500 ${
            mounted && isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
          }`}
        />
        {/* Moon (shown in light mode → click to go dark) */}
        <Moon
          size={18}
          className={`absolute inset-0 transition-all duration-500 ${
            mounted && !isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </span>
    </button>
  )
}
