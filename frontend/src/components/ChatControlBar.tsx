'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatStatus } from '@/types'
import { MessageSquare, Video, MoreVertical, Clock, Layout, Flag, LogOut } from './icons'

interface Props {
  variant: 'text' | 'video'
  status: ChatStatus
  reconnecting: boolean
  partnerReconnecting: boolean
  partnerLabel: string
  timerLabel: string
  showSwitch: boolean
  onSwitch: () => void
  onSkip: () => void
  onStop: () => void
  onReport: () => void
  onChangeLayout?: () => void
}

const rowClass =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted'

// Shared header for both text and video chats: connection status on the left,
// actions on the right — a full button row on desktop, Skip + a three-dots
// menu on mobile.
export function ChatControlBar({
  variant, status, reconnecting, partnerReconnecting, partnerLabel, timerLabel,
  showSwitch, onSwitch, onSkip, onStop, onReport, onChangeLayout,
}: Props) {
  const isMatched = status === 'matched'
  const isVideo = variant === 'video'
  const SwitchIcon = isVideo ? MessageSquare : Video
  const switchLabel = isVideo ? 'Switch to text' : 'Switch to video'

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  // relative + z-30 keeps the whole bar (and its dropdown) painting above the
  // video/chat area below it; no overflow clipping so the menu isn't cut off.
  return (
    <div className="relative z-30 flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-2">
      {/* Status */}
      <div className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap text-sm">
        {isMatched ? (
          reconnecting ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Reconnecting…</span>
            </>
          ) : partnerReconnecting ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Stranger reconnecting…</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">
                <span className="hidden sm:inline">Connected · {partnerLabel}</span>
                <span className="sm:hidden">{partnerLabel}</span>
              </span>
              {isVideo && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock size={13} /> <span className="tabular-nums">{timerLabel}</span>
                </span>
              )}
            </>
          )
        ) : status === 'disconnected' ? (
          <>
            <span className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Stranger disconnected</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Looking for someone…</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap">
        {status === 'disconnected' ? (
          <>
            <button onClick={onSkip} className="btn px-4 py-1.5 text-sm">Find new</button>
            <button onClick={onStop} className="btn-outline px-3 py-1.5 text-sm">Stop</button>
          </>
        ) : (
          <>
            {/* Desktop: full button row */}
            <div className="hidden items-center gap-2 lg:flex">
              {isMatched && showSwitch && (
                <button onClick={onSwitch}
                  className="btn-outline flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-sm">
                  <SwitchIcon size={14} /> {switchLabel}
                </button>
              )}
              {isMatched && (
                <button onClick={onSkip} className="btn-outline px-3 py-1.5 text-sm">Skip</button>
              )}
              {isMatched && (
                <button onClick={onReport} className="btn-outline px-3 py-1.5 text-sm">Report</button>
              )}
              <button onClick={onStop} className="btn-outline px-3 py-1.5 text-sm">Stop</button>
            </div>

            {/* Mobile: Skip + three-dots menu */}
            <div className="flex items-center gap-2 lg:hidden">
              {isMatched && (
                <button onClick={onSkip} className="btn-outline px-3 py-1.5 text-sm">Skip</button>
              )}
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenuOpen(o => !o)} aria-label="More options" aria-haspopup="menu" aria-expanded={menuOpen}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted">
                  <MoreVertical size={18} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl animate-fade-in">
                    {isMatched && (
                      <button role="menuitem" onClick={() => { setMenuOpen(false); onReport() }} className={rowClass}>
                        <Flag size={16} className="text-muted-foreground" /> Report
                      </button>
                    )}
                    {isMatched && showSwitch && (
                      <button role="menuitem" onClick={() => { setMenuOpen(false); onSwitch() }} className={rowClass}>
                        <SwitchIcon size={16} className="text-muted-foreground" /> {switchLabel}
                      </button>
                    )}
                    {isVideo && onChangeLayout && (
                      <button role="menuitem" onClick={() => { setMenuOpen(false); onChangeLayout() }} className={rowClass}>
                        <Layout size={16} className="text-muted-foreground" /> Change layout
                      </button>
                    )}
                    <button role="menuitem" onClick={() => { setMenuOpen(false); onStop() }}
                      className={`${rowClass} text-destructive hover:bg-destructive/10`}>
                      <LogOut size={16} /> Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
