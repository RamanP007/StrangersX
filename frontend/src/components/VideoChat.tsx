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
  partnerLabel?: string
  partnerMuted?: boolean
  partnerCameraOff?: boolean
  layout?: 'split' | 'fullscreen'
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 px-6 text-center backdrop-blur-sm">
      {children}
    </div>
  )
}

// Signal-strength style bars only — no latency numbers or text labels. The
// P2P link quality is a single connection metric, so the same reading is shown
// on both the local and stranger tiles.
function NetworkBars({ quality }: { quality: Quality }) {
  if (!quality) return null
  const active = quality === 'good' ? 4 : quality === 'fair' ? 3 : 1
  const color = quality === 'good' ? 'bg-emerald-500' : quality === 'fair' ? 'bg-amber-500' : 'bg-red-500'
  const heights = ['h-1.5', 'h-2', 'h-3', 'h-4']
  return (
    <div className="flex items-center rounded-full border border-border bg-background/70 px-2 py-1 backdrop-blur">
      <div className="flex items-end gap-[2px]">
        {heights.map((h, i) => (
          <span key={i} className={`w-1 rounded-sm ${h} ${i < active ? color : 'bg-foreground/20'}`} />
        ))}
      </div>
    </div>
  )
}

export function VideoChat({
  localVideoRef, remoteVideoRef,
  mediaReady, mediaError, onRetryMedia,
  connState, quality, searching, partnerLeft,
  muted, cameraOff, onToggleMute, onToggleCamera,
  messages, onSend, onTyping, partnerTyping, chatDisabled, partnerLabel = 'Stranger',
  partnerMuted = false, partnerCameraOff = false, layout = 'split',
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
      partnerLabel={partnerLabel}
    />
  )

  // 'fullscreen' (mobile WhatsApp-style): stranger fills the screen, self is a
  // corner PIP. On lg the video is always the side-by-side split with a chat
  // sidebar, so the fullscreen tweaks are scoped to below lg.
  const isFullscreen = layout === 'fullscreen'
  const videoAreaClass = isFullscreen
    ? 'relative min-h-0 flex-1 p-2 lg:flex lg:flex-row lg:gap-2'
    : 'flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row'
  const selfTileClass = isFullscreen
    ? 'absolute bottom-4 left-4 z-20 h-40 w-28 overflow-hidden rounded-xl border border-border bg-muted shadow-xl lg:static lg:z-auto lg:h-auto lg:w-auto lg:flex-1 lg:shadow-none'
    : 'relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted'
  const strangerTileClass = isFullscreen
    ? 'relative h-full w-full overflow-hidden rounded-xl border border-border bg-muted lg:h-auto lg:min-h-0 lg:flex-1'
    : 'relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted'

  const controlButtons = (
    <>
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
    </>
  )

  return (
    <div className="relative flex h-full flex-col lg:flex-row">
      {/* Video area — split (50/50) or fullscreen (stranger fills, self PIP) */}
      <div className={videoAreaClass}>

        {/* SELF */}
        <div className={selfTileClass}>
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

          {/* Network bars — same P2P quality shown on both tiles */}
          {connState === 'connected' && (
            <div className="absolute right-3 top-3 z-10">
              <NetworkBars quality={quality} />
            </div>
          )}

          {/* In-tile controls: shown in split, and on lg even in fullscreen.
              Hidden on the tiny mobile PIP (fullscreen uses the floating bar). */}
          {mediaReady && (
            <div className={`absolute bottom-3 left-3 z-10 gap-2 ${isFullscreen ? 'hidden lg:flex' : 'flex'}`}>
              {controlButtons}
            </div>
          )}
        </div>

        {/* STRANGER */}
        <div className={strangerTileClass}>
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 z-10 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
            {partnerLabel}
          </span>

          {/* Network bars — same P2P quality shown on both tiles */}
          {connState === 'connected' && (
            <div className="absolute right-3 top-3 z-10">
              <NetworkBars quality={quality} />
            </div>
          )}

          {/* Partner mic/camera indicators */}
          {connState === 'connected' && (partnerMuted || partnerCameraOff) && (
            <div className="absolute bottom-3 left-3 z-10 flex gap-2">
              {partnerMuted && (
                <span title="Muted"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive bg-destructive/90 text-destructive-foreground">
                  <MicOff size={15} />
                </span>
              )}
              {partnerCameraOff && (
                <span title="Camera off"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur">
                  <VideoOff size={15} />
                </span>
              )}
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

        {/* Fullscreen floating controls (mobile only) */}
        {isFullscreen && mediaReady && (
          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-3 lg:hidden">
            {controlButtons}
          </div>
        )}
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
