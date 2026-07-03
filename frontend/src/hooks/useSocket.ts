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
          playMatchSound() // chime on match (text + video)
          break
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
          break
      }
      }
    }

    connect()

    return () => {
      closedByUs = true
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
  }, [send])

  const stop = useCallback(() => skip(), [skip])

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
    joinQueue, sendMessage, sendTyping, skip, stop,
    sendSignal, setSignalHandler,
  }
}
