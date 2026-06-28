'use client'

import type { RefObject } from 'react'
import type { RTCConnState } from '@/hooks/useWebRTC'
import type { Message, ReplyRef } from '@/types'
import { ChatBox } from './ChatBox'
import { Sonar } from './Sonar'
import { Mic, MicOff, Video, VideoOff } from './icons'

interface Props {
  localVideoRef: RefObject<HTMLVideoElement>
  remoteVideoRef: RefObject<HTMLVideoElement>
  mediaReady: boolean
  mediaError: string | null
  onRetryMedia: () => void
  connState: RTCConnState
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

export function VideoChat({
  localVideoRef, remoteVideoRef,
  mediaReady, mediaError, onRetryMedia,
  connState, searching, partnerLeft,
  muted, cameraOff, onToggleMute, onToggleCamera,
  messages, onSend, onTyping, partnerTyping, chatDisabled,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-2 lg:grid-cols-2">

        {/* LEFT — self */}
        <div className="relative min-h-[30vh] overflow-hidden rounded-xl border border-border bg-muted lg:min-h-0">
          {/* Mirrored like a phone's front camera */}
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
        <div className="relative min-h-[30vh] overflow-hidden rounded-xl border border-border bg-muted lg:min-h-0">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 z-10 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-medium backdrop-blur">
            Stranger
          </span>

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

      {/* Bottom text chat */}
      <div className="flex h-44 flex-col border-t border-border">
        <ChatBox
          messages={messages}
          onSend={onSend}
          onTyping={onTyping}
          partnerTyping={partnerTyping}
          disabled={chatDisabled}
        />
      </div>
    </div>
  )
}
