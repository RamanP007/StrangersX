'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Header } from '@/components/Header'
import { ChatBox } from '@/components/ChatBox'
import { VideoChat } from '@/components/VideoChat'
import { MatchingScreen } from '@/components/MatchingScreen'
import { InterestTags } from '@/components/InterestTags'
import { ReportModal } from '@/components/ReportModal'
import { UsernamePopup } from '@/components/UsernamePopup'
import { ChatControlBar } from '@/components/ChatControlBar'
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
  const [videoStartCameraOff, setVideoStartCameraOff] = useState(false)
  const [videoStartMuted, setVideoStartMuted] = useState(false)
  const [videoLayout, setVideoLayout] = useState<'split' | 'fullscreen'>('split')

  const profile = authUser

  // Video chat requires a signed-in (Google) account; guests get text only.
  const isSignedIn = !!session?.user

  // Registered users use the shared backend JWT; guests use their session
  // token. Never mix them: connecting first as guest and then flipping to the
  // JWT would reuse a connection identity across different tokens, which the
  // server rejects (chat socket would die in a reconnect loop).
  const token = sessionStatus === 'loading' ? null : isSignedIn ? authToken : guestToken

  // Resolve the guest token immediately so the chat socket can connect without
  // waiting on the next-auth session request.
  useEffect(() => {
    setGuestToken(sessionStorage.getItem('guestToken'))
  }, [])

  // Once signed in, drop any stale guest session left over in this tab.
  useEffect(() => {
    if (isSignedIn && authToken) {
      sessionStorage.removeItem('guestToken')
      setGuestToken(null)
    }
  }, [isSignedIn, authToken])

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
    partnerSocketId, partnerIsGuest, partnerUsername, chatTypeSwitch,
    matchedAt, partnerMuted, partnerCameraOff,
    joinQueue, sendMessage, sendTyping, skip, stop,
    switchChatType, sendMediaState,
    sendSignal, setSignalHandler,
  } = useSocket(token)

  const isMatched = status === 'matched'
  const isVideo = chatType === 'video'
  const videoSession = isVideo && started
  const partnerLabel = partnerUsername || 'Stranger'

  const webrtc = useWebRTC({
    mediaActive: videoSession,
    peerActive: isMatched && activeChatType === 'video',
    initiator,
    startCameraOff: videoStartCameraOff,
    startMuted: videoStartMuted,
    sendSignal,
    setSignalHandler,
  })

  // The server confirms every chat-type switch (whichever side clicked) with
  // this event, so both sides react identically off the same trigger — and a
  // switch the server rejected (e.g. the partner is a guest) never changes
  // anything locally since no event arrives. Switching text→video starts both
  // camera and mic off for both participants, initiator included — nobody
  // lands on camera/hot-mic without choosing to enable it.
  useEffect(() => {
    if (!chatTypeSwitch) return
    setChatType(chatTypeSwitch.chatType)
    const enteringVideo = chatTypeSwitch.chatType === 'video'
    setVideoStartCameraOff(enteringVideo)
    setVideoStartMuted(enteringVideo)
    toast(chatTypeSwitch.chatType === 'video' ? 'Switched to Video Chat' : 'Switched to Text Chat', { duration: 1500 })
  }, [chatTypeSwitch])

  function handleSwitchToVideo() { switchChatType('video') }
  function handleSwitchToText() { switchChatType('text') }

  // Call timer (video only, counting from match). Ticks every second.
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!matchedAt) { setElapsed(0); return }
    setElapsed(Math.floor((Date.now() - matchedAt) / 1000))
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - matchedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [matchedAt])
  const timerLabel = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  // Broadcast my mic/camera state to the partner so they see an indicator.
  useEffect(() => {
    if (isMatched && activeChatType === 'video') {
      sendMediaState(webrtc.muted, webrtc.cameraOff)
    }
  }, [isMatched, activeChatType, webrtc.muted, webrtc.cameraOff, sendMediaState])

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
    setVideoStartCameraOff(false)
    setVideoStartMuted(false)
    if (chatType === 'text') joinQueue(interests, mode, 'text')
  }
  function handleSkip() { skip(); setVideoStartCameraOff(false); setVideoStartMuted(false); joinQueue(interests, mode, chatType) }
  function handleStop() { stop(); setStarted(false); setVideoStartCameraOff(false); setVideoStartMuted(false) }

  const isSearching = status === 'searching'
  const isIdle = status === 'idle' || status === 'disconnected'

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col pt-16">
        {videoSession ? (
          /* ── Full-screen video layout (chat sidebar on desktop/tablet, stacked on mobile) ── */
          <div className="flex h-[calc(100dvh-4rem)] flex-col">
            <ChatControlBar
              variant="video"
              status={status}
              reconnecting={reconnecting}
              partnerReconnecting={partnerReconnecting}
              partnerLabel={partnerLabel}
              timerLabel={timerLabel}
              showSwitch={isSignedIn && !partnerIsGuest && activeChatType === 'video'}
              onSwitch={handleSwitchToText}
              onSkip={handleSkip}
              onStop={handleStop}
              onReport={() => setShowReport(true)}
              onChangeLayout={() => setVideoLayout(l => (l === 'split' ? 'fullscreen' : 'split'))}
            />

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
                searching={status !== 'matched' && status !== 'disconnected'}
                partnerLeft={status === 'disconnected'}
                muted={webrtc.muted}
                cameraOff={webrtc.cameraOff}
                onToggleMute={webrtc.toggleMute}
                onToggleCamera={webrtc.toggleCamera}
                onSwitchCamera={webrtc.switchCamera}
                facingMode={webrtc.facingMode}
                messages={messages}
                onSend={sendMessage}
                onTyping={sendTyping}
                partnerTyping={partnerTyping}
                chatDisabled={status !== 'matched'}
                partnerLabel={partnerLabel}
                partnerMuted={partnerMuted}
                partnerCameraOff={partnerCameraOff}
                layout={videoLayout}
              />
            </div>
          </div>
        ) : (
          /* ── Constrained layout (pre-chat setup + text chat) ── */
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
            {/* Header — same control bar as video chat (status + three-dots) */}
            {started && (isMatched || status === 'disconnected') && (
              <ChatControlBar
                variant="text"
                status={status}
                reconnecting={reconnecting}
                partnerReconnecting={partnerReconnecting}
                partnerLabel={partnerLabel}
                timerLabel={timerLabel}
                showSwitch={isSignedIn && !partnerIsGuest && activeChatType === 'text'}
                onSwitch={handleSwitchToVideo}
                onSkip={handleSkip}
                onStop={handleStop}
                onReport={() => setShowReport(true)}
              />
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
                  partnerLabel={partnerLabel}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {showReport && (
        <ReportModal
          roomId={roomId}
          partnerSocketId={partnerSocketId ?? undefined}
          onClose={() => setShowReport(false)}
          onReported={() => { setShowReport(false); handleSkip() }}
          token={token}
        />
      )}

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
