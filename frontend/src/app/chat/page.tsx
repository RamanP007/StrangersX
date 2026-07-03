'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { ChatBox } from '@/components/ChatBox'
import { VideoChat } from '@/components/VideoChat'
import { MatchingScreen } from '@/components/MatchingScreen'
import { InterestTags } from '@/components/InterestTags'
import { ReportModal } from '@/components/ReportModal'
import { UsernamePopup } from '@/components/UsernamePopup'
import { useSocket } from '@/hooks/useSocket'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useBackendAuth } from '@/components/BackendAuthProvider'
import { MessageSquare, Video, Shuffle, Target, Lock } from '@/components/icons'
import type { MatchMode, ChatType } from '@/types'

export default function ChatPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { token: authToken, user: authUser, setUser } = useBackendAuth()

  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [showUsernamePopup, setShowUsernamePopup] = useState(false)

  const [interests, setInterests] = useState<string[]>([])
  const [mode, setMode] = useState<MatchMode>('random')
  const [chatType, setChatType] = useState<ChatType>('text')
  const [showReport, setShowReport] = useState(false)
  const [started, setStarted] = useState(false)

  // Registered users use the shared backend JWT; guests use their session token.
  const token = authToken ?? guestToken
  const profile = authUser

  // Video chat requires a signed-in (Google) account; guests get text only.
  const isSignedIn = !!session?.user

  // Resolve the guest token immediately so the chat socket can connect without
  // waiting on the next-auth session request.
  useEffect(() => {
    setGuestToken(sessionStorage.getItem('guestToken'))
  }, [])

  // Redirect anonymous visitors home (once the session state is known).
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session && !sessionStorage.getItem('guestToken')) router.push('/')
  }, [session, sessionStatus, router])

  // Show the username popup for new (unconfirmed) registered users.
  useEffect(() => {
    if (authUser && !authUser.usernameConfirmed) setShowUsernamePopup(true)
  }, [authUser])

  // Honor the "video" intent from the homepage CTA — but only for signed-in
  // users (video is sign-in only).
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStorage.getItem('chatIntent') === 'video') {
      sessionStorage.removeItem('chatIntent')
      if (session?.user) setChatType('video')
    }
  }, [sessionStatus, session])

  const {
    status, messages, roomId, initiator, activeChatType, partnerTyping,
    reconnecting, partnerReconnecting,
    joinQueue, sendMessage, sendTyping, skip, stop, sendSignal, setSignalHandler,
  } = useSocket(token)

  const isMatched = status === 'matched'
  const isVideo = chatType === 'video'
  const videoSession = isVideo && started

  const webrtc = useWebRTC({
    mediaActive: videoSession,
    peerActive: isMatched && activeChatType === 'video',
    initiator,
    sendSignal,
    setSignalHandler,
  })

  const videoJoinedRef = useRef(false)
  useEffect(() => {
    if (!videoSession) { videoJoinedRef.current = false; return }
    if (webrtc.mediaReady && status === 'idle' && !videoJoinedRef.current) {
      videoJoinedRef.current = true
      joinQueue(interests, mode, 'video')
    }
  }, [videoSession, webrtc.mediaReady, status, interests, mode, joinQueue])

  // Auto-find a new stranger shortly after the current one disconnects.
  useEffect(() => {
    if (status === 'disconnected' && started) {
      const t = setTimeout(() => joinQueue(interests, mode, chatType), 700)
      return () => clearTimeout(t)
    }
  }, [status, started, joinQueue, interests, mode, chatType])

  function handleStart() {
    setStarted(true)
    if (chatType === 'text') joinQueue(interests, mode, 'text')
  }
  function handleSkip() { skip(); joinQueue(interests, mode, chatType) }
  function handleStop() { stop(); setStarted(false) }

  const isSearching = status === 'searching'
  const isIdle = status === 'idle' || status === 'disconnected'

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col pt-16">
        {videoSession ? (
          /* ── Full-screen video layout (chat sidebar on desktop/tablet, stacked on mobile) ── */
          <div className="flex h-[calc(100dvh-4rem)] flex-col">
            {/* Control bar */}
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
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
                      <span className="font-medium text-foreground">Connected · Video</span>
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
              <div className="flex items-center gap-2">
                {status === 'disconnected' && (
                  <button onClick={handleSkip} className="btn px-4 py-1.5 text-sm">Find new</button>
                )}
                {isMatched && (
                  <button onClick={handleSkip} className="btn-outline px-3 py-1.5 text-sm">Skip</button>
                )}
                {isMatched && (
                  <button onClick={() => setShowReport(true)} className="btn-outline px-3 py-1.5 text-sm">Report</button>
                )}
                <button onClick={handleStop} className="btn-outline px-3 py-1.5 text-sm">Stop</button>
              </div>
            </div>

            {/* Video + chat */}
            <div className="min-h-0 flex-1">
              <VideoChat
                localVideoRef={webrtc.localVideoRef}
                remoteVideoRef={webrtc.remoteVideoRef}
                mediaReady={webrtc.mediaReady}
                mediaError={webrtc.mediaError}
                onRetryMedia={webrtc.retryMedia}
                connState={webrtc.connState}
                quality={webrtc.quality}
                latencyMs={webrtc.latencyMs}
                searching={status !== 'matched' && status !== 'disconnected'}
                partnerLeft={status === 'disconnected'}
                muted={webrtc.muted}
                cameraOff={webrtc.cameraOff}
                onToggleMute={webrtc.toggleMute}
                onToggleCamera={webrtc.toggleCamera}
                messages={messages}
                onSend={sendMessage}
                onTyping={sendTyping}
                partnerTyping={partnerTyping}
                chatDisabled={status !== 'matched'}
              />
            </div>
          </div>
        ) : (
          /* ── Constrained layout (pre-chat setup + text chat) ── */
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
            {/* Status bar (matched) */}
            {isMatched && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  {reconnecting ? (
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
                      <span className="font-medium text-foreground">Connected</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSkip} className="btn-outline px-3 py-1 text-sm">Skip</button>
                  <button onClick={handleStop} className="btn-outline px-3 py-1 text-sm">Stop</button>
                  <button onClick={() => setShowReport(true)} className="btn-outline px-3 py-1 text-sm">Report</button>
                </div>
              </div>
            )}

            {/* Status bar (disconnected) */}
            {status === 'disconnected' && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Stranger disconnected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleSkip} className="btn px-4 py-1.5 text-sm">Find new stranger</button>
                  <button onClick={handleStop} className="btn-outline px-4 py-1.5 text-sm">Stop</button>
                </div>
              </div>
            )}

            {/* Main card */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card"
              style={{ minHeight: '60vh' }}>

              {/* Pre-chat setup */}
              {!started && isIdle && (
                <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
                  <div className="w-full max-w-sm space-y-6">
                    <div className="text-center">
                      <h2 className="mb-1 text-2xl font-semibold tracking-tight">Start a conversation</h2>
                      <p className="text-sm text-muted-foreground">Choose how you want to connect</p>
                    </div>

                    {/* Chat type */}
                    <div className="grid grid-cols-2 gap-3">
                      {([['text', MessageSquare], ['video', Video]] as const).map(([t, Icon]) => {
                        const locked = t === 'video' && !isSignedIn
                        return (
                          <button key={t}
                            onClick={() => {
                              if (locked) {
                                sessionStorage.setItem('chatIntent', 'video')
                                signIn('google', { callbackUrl: '/chat' })
                                return
                              }
                              setChatType(t)
                            }}
                            className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 ease-out active:scale-[0.97]
                              ${chatType === t
                                ? 'border-primary bg-primary/5 text-foreground shadow-md shadow-primary/10'
                                : 'border-border text-muted-foreground hover:-translate-y-0.5 hover:bg-muted hover:text-foreground'}`}>
                            <Icon size={22} />
                            <span className="text-sm font-medium capitalize">{t} chat</span>
                            {locked && (
                              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <Lock size={10} /> Sign in
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Mode */}
                    <div className="grid grid-cols-2 gap-3">
                      {([['random', Shuffle], ['interests', Target]] as const).map(([m, Icon]) => (
                        <button key={m} onClick={() => setMode(m)}
                          className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium capitalize transition-all duration-200 ease-out active:scale-[0.97]
                            ${mode === m
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                          <Icon size={16} />
                          {m === 'random' ? 'Random' : 'Interests'}
                        </button>
                      ))}
                    </div>

                    {mode === 'interests' && (
                      <div>
                        <p className="mb-2 text-sm text-muted-foreground">Your interests:</p>
                        <InterestTags value={interests} onChange={setInterests} />
                      </div>
                    )}

                    <button onClick={handleStart} className="btn w-full py-3 text-base">
                      Start {chatType === 'video' ? 'video ' : ''}chat
                    </button>

                    {chatType === 'video' && (
                      <p className="text-center text-xs text-muted-foreground">
                        We&apos;ll turn on your camera first, then find you a match.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TEXT flow */}
              {started && isSearching && <MatchingScreen onCancel={handleStop} />}
              {started && (isMatched || status === 'disconnected') && (
                <ChatBox
                  messages={messages}
                  onSend={sendMessage}
                  onTyping={sendTyping}
                  partnerTyping={partnerTyping}
                  disabled={status !== 'matched'}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {showReport && <ReportModal roomId={roomId} onClose={() => setShowReport(false)} token={token} />}

      {showUsernamePopup && token && profile && (
        <UsernamePopup
          token={token}
          initialUsername={profile.username}
          onDone={(finalUsername) => {
            setUser({ ...profile, username: finalUsername, usernameConfirmed: true })
            setShowUsernamePopup(false)
          }}
        />
      )}
    </div>
  )
}
