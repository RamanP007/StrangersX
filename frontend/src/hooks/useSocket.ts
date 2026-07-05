'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Message, ChatStatus, ChatType, SignalMessage, ReplyRef } from '@/types'
import { nanoid } from '@/lib/nanoid'
import { wsUrl } from '@/lib/ws'
import { playMatchSound, playMessageSound } from '@/lib/sounds'

interface OutMsg {
  type: string
  text?: string
  from?: string
  roomId?: string
  status?: string
  chatType?: ChatType
  initiator?: boolean
  replyText?: string
  replyMine?: boolean
  partnerId?: string
  partnerIsGuest?: boolean
  partnerUsername?: string
  matchId?: string
  muted?: boolean
  cameraOff?: boolean
  data?: any
}

type SignalHandler = (msg: SignalMessage) => void

export function useSocket(token: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const signalHandlerRef = useRef<SignalHandler | null>(null)
  const signalBufferRef = useRef<SignalMessage[]>([])
  // Outgoing messages queued while the socket is still connecting.
  const pendingSendsRef = useRef<object[]>([])
  const statusRef = useRef<ChatStatus>('idle')
  const activeChatTypeRef = useRef<ChatType>('text')
  const wantQueueRef = useRef<{ interests: string[]; mode: 'random' | 'interests'; chatType: ChatType } | null>(null)
  const attemptRef = useRef(0)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [roomId, setRoomId] = useState<string | null>(null)
  const [initiator, setInitiator] = useState(false)
  const [activeChatType, setActiveChatType] = useState<ChatType>('text')
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [partnerReconnecting, setPartnerReconnecting] = useState(false)
  const [partnerSocketId, setPartnerSocketId] = useState<string | null>(null)
  const [partnerIsGuest, setPartnerIsGuest] = useState(true)
  const [partnerUsername, setPartnerUsername] = useState<string | null>(null)
  const [chatTypeSwitch, setChatTypeSwitch] = useState<{ chatType: ChatType; initiator: boolean; seq: number } | null>(null)
  const switchSeqRef = useRef(0)
  const [matchedAt, setMatchedAt] = useState<number | null>(null)
  const [partnerMuted, setPartnerMuted] = useState(false)
  const [partnerCameraOff, setPartnerCameraOff] = useState(false)

  // Keep a ref in sync so socket callbacks can read the latest status.
  useEffect(() => { statusRef.current = status }, [status])

  useEffect(() => {
    if (!token) return
    const wsToken = token
    // Connection id scoped to this token: reused across reconnects (so the
    // server can resume an in-progress chat after a blip) but regenerated when
    // the token changes — the server binds cid→token, so reusing a cid with a
    // different token (e.g. guest → signed-in) would be rejected.
    const cid =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`

    let closedByUs = false
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let keepAlive: ReturnType<typeof setInterval> | undefined

    function connect() {
      const url = `${wsUrl('/ws')}?token=${encodeURIComponent(wsToken)}&cid=${encodeURIComponent(cid)}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        attemptRef.current = 0

        // Reconnected mid-chat: ask the server to resume the room (it survives
        // a grace window server-side). Response: `resumed` or `resume_failed`.
        if (statusRef.current === 'matched') {
          ws.send(JSON.stringify({ type: 'resume' }))
        }

        // Flush anything queued before the connection was ready (e.g. the video
        // flow auto-joins the queue as soon as the camera is up).
        const pending = pendingSendsRef.current
        pendingSendsRef.current = []
        pending.forEach(p => ws.send(JSON.stringify(p)))

        // If we reconnected while searching, the old server-side queue entry is
        // gone — re-join so we stay matchable.
        if (statusRef.current === 'searching' && wantQueueRef.current) {
          ws.send(JSON.stringify({ type: 'join_queue', ...wantQueueRef.current }))
        }

        // App-level keepalive: refreshes the server read deadline and keeps the
        // connection alive through idle proxy timeouts.
        clearInterval(keepAlive)
        keepAlive = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
        }, 25000)
      }

      ws.onclose = () => {
        wsRef.current = null
        clearInterval(keepAlive)
        if (closedByUs) return
        // Mid-chat blip: keep the match alive and try to resume — the server
        // holds the room for a grace window. UI shows "Reconnecting…".
        if (statusRef.current === 'matched') {
          setReconnecting(true)
        }
        // Exponential backoff + jitter (fast first retries for seamless resume).
        const delay = Math.min(15000, 500 * 2 ** attemptRef.current++) + Math.random() * 300
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onmessage = (event) => {
      let msg: OutMsg
      try { msg = JSON.parse(event.data) } catch { return }

      // Relay WebRTC signalling to the registered handler, buffering if the
      // peer connection hasn't registered its handler yet (avoids dropped offers).
      if (msg.type === 'webrtc_offer' || msg.type === 'webrtc_answer' || msg.type === 'webrtc_ice') {
        const sig: SignalMessage = { type: msg.type, data: msg.data }
        if (signalHandlerRef.current) signalHandlerRef.current(sig)
        else signalBufferRef.current.push(sig)
        return
      }

      switch (msg.type) {
        case 'matched':
          setRoomId(msg.roomId ?? null)
          setInitiator(Boolean(msg.initiator))
          activeChatTypeRef.current = msg.chatType ?? 'text'
          setActiveChatType(msg.chatType ?? 'text')
          setStatus('matched')
          setMessages([])
          setPartnerTyping(false)
          setReconnecting(false)
          setPartnerReconnecting(false)
          setPartnerSocketId(msg.partnerId ?? null)
          setPartnerIsGuest(msg.partnerIsGuest ?? true)
          setPartnerUsername(msg.partnerUsername || null)
          setChatTypeSwitch(null)
          setMatchedAt(Date.now())
          setPartnerMuted(false)
          setPartnerCameraOff(false)
          playMatchSound() // chime on match (text + video)
          break
        case 'match_ping':
          // Confirmation handshake — reply immediately so the server knows we're
          // alive; transparent to the UI (we stay in 'searching').
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'match_pong', matchId: msg.matchId }))
          }
          break
        case 'match_cancelled':
          // The proposed match fell through (partner didn't confirm) — re-queue
          // right away instead of waiting for the periodic retry.
          if (statusRef.current === 'searching' && wantQueueRef.current) {
            wsRef.current?.send(JSON.stringify({ type: 'join_queue', ...wantQueueRef.current }))
          }
          break
        case 'media_state':
          setPartnerMuted(Boolean(msg.muted))
          setPartnerCameraOff(Boolean(msg.cameraOff))
          break
        case 'chat_type_changed': {
          const chatType = msg.chatType ?? 'video'
          activeChatTypeRef.current = chatType
          setActiveChatType(chatType)
          setChatTypeSwitch({ chatType, initiator: Boolean(msg.initiator), seq: ++switchSeqRef.current })
          break
        }
        case 'resumed':
          // Back in the same room after a blip — conversation continues.
          setRoomId(msg.roomId ?? null)
          setStatus('matched')
          setReconnecting(false)
          break
        case 'resume_failed':
          // Room didn't survive the blip (partner skipped / grace expired).
          setReconnecting(false)
          setStatus('disconnected')
          setRoomId(null)
          setPartnerTyping(false)
          break
        case 'partner_reconnecting':
          setPartnerReconnecting(true)
          setPartnerTyping(false)
          break
        case 'partner_back':
          setPartnerReconnecting(false)
          break
        case 'message':
          setPartnerTyping(false)
          // Message blip only in text chat mode (not video).
          if (activeChatTypeRef.current !== 'video') playMessageSound()
          setMessages(prev => [
            ...prev,
            {
              id: nanoid(),
              text: msg.text!,
              from: 'stranger',
              timestamp: new Date(),
              // The sender's replyMine is from their POV; flip it for us.
              reply: msg.replyText ? { text: msg.replyText, mine: !msg.replyMine } : undefined,
            },
          ])
          break
        case 'typing':
          setPartnerTyping(true)
          break
        case 'stop_typing':
          setPartnerTyping(false)
          break
        case 'partner_left':
          setStatus('disconnected')
          setRoomId(null)
          setPartnerTyping(false)
          setPartnerReconnecting(false)
          setChatTypeSwitch(null)
          setMatchedAt(null)
          setPartnerMuted(false)
          setPartnerCameraOff(false)
          break
        case 'queued':
          setStatus('searching')
          break
        case 'skipped':
          setStatus('idle')
          setRoomId(null)
          setMessages([])
          setPartnerTyping(false)
          setPartnerReconnecting(false)
          setPartnerSocketId(null)
          setPartnerIsGuest(true)
          setPartnerUsername(null)
          setChatTypeSwitch(null)
          setMatchedAt(null)
          setPartnerMuted(false)
          setPartnerCameraOff(false)
          break
      }
      }
    }

    // Deliberately leaving (navigating to another route, closing the tab) is
    // not a network blip — tell the server immediately so it skips the
    // reconnect grace window and tells the partner right away instead of
    // showing "reconnecting" for up to 10s.
    function sendLeave() {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN && statusRef.current === 'matched') {
        try { ws.send(JSON.stringify({ type: 'leave' })) } catch { /* ignore */ }
      }
    }

    connect()
    window.addEventListener('pagehide', sendLeave)

    return () => {
      closedByUs = true
      window.removeEventListener('pagehide', sendLeave)
      sendLeave()
      clearTimeout(reconnectTimer)
      clearInterval(keepAlive)
      wsRef.current?.close()
      wsRef.current = null
      pendingSendsRef.current = []
    }
  }, [token])

  const send = useCallback((payload: object) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    } else {
      // Not open yet — queue it; ws.onopen will flush.
      pendingSendsRef.current.push(payload)
    }
  }, [])

  const joinQueue = useCallback((interests: string[], mode: 'random' | 'interests', chatType: ChatType) => {
    wantQueueRef.current = { interests, mode, chatType }
    setMessages([])
    setStatus('searching')
    setPartnerReconnecting(false)
    send({ type: 'join_queue', interests, mode, chatType })
  }, [send])

  // The backend only attempts a match inside the join_queue handler itself —
  // there's no server-side timer that retries for an already-waiting client.
  // A client stuck "searching" is otherwise matched only if some OTHER client
  // happens to call join_queue later and finds them in the Redis queue. This
  // periodically re-sends join_queue while searching so a stuck wait recovers
  // on its own — safe to repeat since the handler always leaves any current
  // queue entry (LeaveQueue) before re-matching/re-queueing, so it can't pile
  // up duplicate entries.
  useEffect(() => {
    if (status !== 'searching') return
    const retry = setInterval(() => {
      if (wantQueueRef.current) send({ type: 'join_queue', ...wantQueueRef.current })
    }, 6000)
    return () => clearInterval(retry)
  }, [status, send])

  const sendMessage = useCallback((text: string, reply?: ReplyRef) => {
    if (status !== 'matched') return
    send({ type: 'message', text, replyText: reply?.text, replyMine: reply?.mine })
    setMessages(prev => [
      ...prev,
      { id: nanoid(), text, from: 'me', timestamp: new Date(), reply },
    ])
  }, [send, status])

  const sendTyping = useCallback((isTyping: boolean) => {
    if (status !== 'matched') return
    send({ type: isTyping ? 'typing' : 'stop_typing' })
  }, [send, status])

  const skip = useCallback(() => {
    wantQueueRef.current = null
    send({ type: 'skip' })
    setStatus('idle')
    setRoomId(null)
    setMessages([])
    setReconnecting(false)
    setPartnerReconnecting(false)
    setPartnerSocketId(null)
    setPartnerIsGuest(true)
    setPartnerUsername(null)
    setChatTypeSwitch(null)
    setMatchedAt(null)
    setPartnerMuted(false)
    setPartnerCameraOff(false)
  }, [send])

  const stop = useCallback(() => skip(), [skip])

  const switchChatType = useCallback((target: ChatType) => {
    send({ type: 'switch_chat_type', chatType: target })
  }, [send])

  const sendMediaState = useCallback((muted: boolean, cameraOff: boolean) => {
    send({ type: 'media_state', muted, cameraOff })
  }, [send])

  // WebRTC helpers
  const sendSignal = useCallback((type: SignalMessage['type'], data: any) => {
    send({ type, data })
  }, [send])

  const setSignalHandler = useCallback((fn: SignalHandler | null) => {
    signalHandlerRef.current = fn
    if (fn && signalBufferRef.current.length > 0) {
      const buffered = signalBufferRef.current
      signalBufferRef.current = []
      buffered.forEach(fn)
    }
  }, [])

  return {
    status, messages, roomId, initiator, activeChatType, partnerTyping,
    reconnecting, partnerReconnecting,
    partnerSocketId, partnerIsGuest, partnerUsername, chatTypeSwitch,
    matchedAt, partnerMuted, partnerCameraOff,
    joinQueue, sendMessage, sendTyping, skip, stop,
    switchChatType, sendMediaState,
    sendSignal, setSignalHandler,
  }
}
