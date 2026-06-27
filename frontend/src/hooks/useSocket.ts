'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Message, ChatStatus, ChatType, SignalMessage } from '@/types'
import { nanoid } from '@/lib/nanoid'
import { wsUrl } from '@/lib/ws'

interface OutMsg {
  type: string
  text?: string
  from?: string
  roomId?: string
  status?: string
  chatType?: ChatType
  initiator?: boolean
  data?: any
}

type SignalHandler = (msg: SignalMessage) => void

export function useSocket(token: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const signalHandlerRef = useRef<SignalHandler | null>(null)
  const signalBufferRef = useRef<SignalMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [roomId, setRoomId] = useState<string | null>(null)
  const [initiator, setInitiator] = useState(false)
  const [activeChatType, setActiveChatType] = useState<ChatType>('text')

  useEffect(() => {
    if (!token) return

    const url = `${wsUrl('/ws')}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

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
          setActiveChatType(msg.chatType ?? 'text')
          setStatus('matched')
          setMessages([])
          break
        case 'message':
          setMessages(prev => [
            ...prev,
            { id: nanoid(), text: msg.text!, from: 'stranger', timestamp: new Date() },
          ])
          break
        case 'partner_left':
          setStatus('disconnected')
          setRoomId(null)
          break
        case 'queued':
          setStatus('searching')
          break
        case 'skipped':
          setStatus('idle')
          setRoomId(null)
          setMessages([])
          break
      }
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [token])

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  const joinQueue = useCallback((interests: string[], mode: 'random' | 'interests', chatType: ChatType) => {
    setMessages([])
    setStatus('searching')
    send({ type: 'join_queue', interests, mode, chatType })
  }, [send])

  const sendMessage = useCallback((text: string) => {
    if (status !== 'matched') return
    send({ type: 'message', text })
    setMessages(prev => [
      ...prev,
      { id: nanoid(), text, from: 'me', timestamp: new Date() },
    ])
  }, [send, status])

  const skip = useCallback(() => {
    send({ type: 'skip' })
    setStatus('idle')
    setRoomId(null)
    setMessages([])
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
    status, messages, roomId, initiator, activeChatType,
    joinQueue, sendMessage, skip, stop,
    sendSignal, setSignalHandler,
  }
}
