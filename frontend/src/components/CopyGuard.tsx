'use client'

import { useEffect } from 'react'

/** Blocks copy/cut everywhere, backing up the CSS `user-select: none`. */
export function CopyGuard() {
  useEffect(() => {
    const block = (e: ClipboardEvent) => e.preventDefault()
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    return () => {
      document.removeEventListener('copy', block)
      document.removeEventListener('cut', block)
    }
  }, [])

  return null
}
