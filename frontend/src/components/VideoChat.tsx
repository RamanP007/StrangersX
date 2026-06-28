'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { RTCConnState } from '@/hooks/useWebRTC'
import type { Message, ReplyRef } from '@/types'
import { ChatBox } from './ChatBox'
import { Sonar } from './Sonar'
import { Mic, MicOff, Video, VideoOff, MessageSquare, X } from './icons'

type Quality = 'good' | 'fair' | 'poor' | null

interface Props {
  localVideoRef: RefObject<HTMLVideoElement>
  remoteVideoRef: RefObject<HTMLVideoElement>
  mediaReady: boolean
  mediaError: string | null
  onRetryMedia: () => void
  connState: RTCConnState
  quality: Quality
  latencyMs: number | null
  searching: boolean
  partnerLeft: boolean
  muted: boolean
  cameraOff: boolean
  onToggleMute: () => void
  onToggleCamera: () => void
  messages: Message[]
  onSend: (text: string, reply?: ReplyRef) => void
  onTyping?: (isTyping: boolean) => void
  partnerTyping?: boolean
  chatDisabled: boolean
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 px-6 text-center backdrop-blur-sm">
      {children}
    </div>
  )
}

function NetworkBars({ quality, latencyMs }: { quality: Quality; latencyMs: number | null }) {
  if (!quality) return null
  const active = quality === 'good' ? 4 : quality === 'fair' ? 3 : 1
  const color = quality === 'good' ? 'bg-emerald-500' : quality === 'fair' ? 'bg-amber-500' : 'bg-red-500'
  const heights = ['h-1.5', 'h-2', 'h-3', 'h-4']
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2 py-1 backdrop-blur">
      <div className="flex items-end gap-[2px]">
        {heights.map((h, i) => (
          <span key={i} className={`w-1 rounded-sm ${h} ${i < active ? color : 'bg-foreground/20'}`} />
        ))}
      </div>
      {latencyMs != null && (
        <span className="text-[10px] font-medium tabular-nums text-foreground">{latencyMs}ms</span>
      )}
      {quality === 'poor' && <span className="text-[10px] font-medium text-red-500">Poor</span>}
    </div>
  )
}

export function VideoChat({
  localVideoRef, remoteVideoRef,
  mediaReady, mediaError, onRetryMedia,
  connState, quality, latencyMs, searching, partnerLeft,
  muted, cameraOff, onToggleMute, onToggleCamera,
  messages, onSend, onTyping, partnerTyping, chatDisabled,
}: Props) {
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const prevCount = useRef(messages.length)

  // Track unread messages while the mobile chat popup is closed.
  useEffect(() => {
    if (messages.length > prevCount.current && !chatOpen) {
      setUnread(u => u + (messages.length - prevCount.current))
    }
    prevCount.current = messages.length
  }, [messages, chatOpen])

  useEffect(() => { if (chatOpen) setUnread(0) }, [chatOpen])

  const chat = (
    <ChatBox
      messages={messages}
      onSend={onSend}
      onTyping={onTyping}
      partnerTyping={partnerTyping}
      disabled={chatDisabled}
    />
  )

  return (
    <div className="relative flex h-full flex-col lg:flex-row">
      {/* Video area — 50/50 stacked on mobile, side-by-side on desktop */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row">

        {/* LEFT — self */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          <span className="absolute left-3 top-3 z-10 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
            You
          </span>

          {mediaError ? (
            <Overlay>
              <p className="max-w-xs text-sm text-muted-foreground">{mediaError}</p>
              <button onClick={onRetryMedia} className="btn px-6 py-2">Allow &amp; retry</button>
            </Overlay>
          ) : !mediaReady ? (
            <Overlay>
              <Sonar size={56} />
              <p className="text-sm text-muted-foreground">Starting your camera…</p>
            </Overlay>
          ) : null}

          {mediaReady && cameraOff && (
            <Overlay><p className="text-sm text-muted-foreground">Your camera is off</p></Overlay>
          )}

          {mediaReady && (
            <div className="absolute bottom-3 left-3 z-10 flex gap-2">
              <button onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}
                className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition-colors
                  ${muted ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border bg-background/70 hover:bg-muted'}`}>
                {muted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={onToggleCamera} aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition-colors
                  ${cameraOff ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border bg-background/70 hover:bg-muted'}`}>
                {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — stranger */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 z-10 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
            Stranger
          </span>

          {/* Connection quality */}
          {connState === 'connected' && (
            <div className="absolute right-3 top-3 z-10">
              <NetworkBars quality={quality} latencyMs={latencyMs} />
            </div>
          )}

          {partnerLeft ? (
            <Overlay><p className="text-sm text-muted-foreground">Stranger disconnected</p></Overlay>
          ) : searching ? (
            <Overlay>
              <Sonar size={72} />
              <p className="text-sm font-medium text-foreground">Looking for someone…</p>
              <p className="text-xs text-muted-foreground">Scanning for a stranger near you</p>
            </Overlay>
          ) : connState !== 'connected' ? (
            <Overlay>
              <Sonar size={72} />
              <p className="text-sm font-medium text-foreground">
                {connState === 'failed' ? 'Connection issue — try Skip' : 'Connecting…'}
              </p>
              {connState !== 'failed' && (
                <p className="text-xs text-muted-foreground">Setting up your video link</p>
              )}
            </Overlay>
          ) : null}
        </div>
      </div>

      {/* Desktop/tablet: chat as a right sidebar */}
      <div className="hidden lg:flex lg:w-[360px] lg:flex-shrink-0 lg:flex-col lg:border-l lg:border-border">
        {chat}
      </div>

      {/* Mobile: floating chat button */}
      <button
        onClick={() => setChatOpen(true)}
        aria-label="Open chat"
        className="absolute bottom-4 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 lg:hidden"
      >
        <MessageSquare size={22} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Mobile: chat popup (bottom sheet) */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex h-[78vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-medium">Chat</span>
              <button onClick={() => setChatOpen(false)} aria-label="Close chat"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1">{chat}</div>
          </div>
        </div>
      )}
    </div>
  )
}
