'use client'

import { useOnlineCount } from '@/hooks/useOnlineCount'

export function OnlinePill() {
  const { count, ready } = useOnlineCount()

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-2.5 py-1 text-xs backdrop-blur"
      title="Users online right now"
    >
      {/* Blinking green dot */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>

      <span className="font-semibold tabular-nums text-foreground">
        {ready ? count.toLocaleString() : '—'}
      </span>
      <span className="text-muted-foreground">Live</span>
    </div>
  )
}
