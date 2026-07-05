'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SignalMessage } from '@/types'

// STUN only discovers your public address; it CANNOT relay media through
// restrictive NATs (mobile carriers, CGNAT, corporate firewalls). Those peers
// need a TURN relay or the connection stalls forever at "Connecting…" even
// though signalling (offer/answer/ICE) flows fine over the WebSocket.
//
// TURN credentials are fetched from our backend (GET /api/turn), which issues
// short-lived Metered credentials with the server-side secret key. If TURN isn't
// configured the backend returns [] and we fall back to STUN (direct-only).
const BASE_STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

let iceServersPromise: Promise<RTCIceServer[]> | null = null

async function fetchIceServers(): Promise<RTCIceServer[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/turn`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`turn fetch ${res.status}`)
  const servers = await res.json()
  if (!Array.isArray(servers)) throw new Error('bad turn response')
  // servers may legitimately be empty (TURN not configured) — still a valid,
  // cacheable result (STUN-only).
  return [...BASE_STUN, ...(servers as RTCIceServer[])]
}

// Memoized so we hit the backend once per page load; a transient failure clears
// the memo so the next call retries instead of being stuck on STUN-only.
function getIceServers(): Promise<RTCIceServer[]> {
  if (!iceServersPromise) {
    iceServersPromise = fetchIceServers().catch(() => {
      iceServersPromise = null
      return BASE_STUN
    })
  }
  return iceServersPromise
}

export type RTCConnState = 'idle' | 'connecting' | 'connected' | 'failed'

interface Options {
  mediaActive: boolean // acquire & keep the local camera (video mode active)
  peerActive: boolean  // matched: establish the peer connection
  initiator: boolean
  startCameraOff?: boolean // when acquiring media, immediately disable the video track (mid-chat switch)
  startMuted?: boolean // when acquiring media, immediately disable the audio track (mid-chat switch)
  sendSignal: (type: SignalMessage['type'], data: any) => void
  setSignalHandler: (fn: ((msg: SignalMessage) => void) | null) => void
}

export function useWebRTC({ mediaActive, peerActive, initiator, startCameraOff = false, startMuted = false, sendSignal, setSignalHandler }: Options) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])

  const [mediaReady, setMediaReady] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [connState, setConnState] = useState<RTCConnState>('idle')
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const facingRef = useRef<'user' | 'environment'>('user')
  const [retryTick, setRetryTick] = useState(0)
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor' | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const prevLossRef = useRef<{ lost: number; recv: number }>({ lost: 0, recv: 0 })
  const startCameraOffRef = useRef(startCameraOff)
  useEffect(() => { startCameraOffRef.current = startCameraOff }, [startCameraOff])
  const startMutedRef = useRef(startMuted)
  useEffect(() => { startMutedRef.current = startMuted }, [startMuted])

  // Hard-stops the camera/mic and releases the device (turns off the camera light).
  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
  }, [])

  // ── Phase 1: local media (camera/mic) ──────────────────────────────────────
  useEffect(() => {
    if (!mediaActive) {
      stopLocalMedia()
      setMediaReady(false)
      setMediaError(null)
      setMuted(false)
      setCameraOff(false)
      facingRef.current = 'user'
      setFacingMode('user')
      return
    }

    let cancelled = false
    setMediaError(null)
    setMediaReady(false)

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        localStreamRef.current = stream
        if (startCameraOffRef.current) {
          stream.getVideoTracks().forEach(t => { t.enabled = false })
          setCameraOff(true)
        }
        if (startMutedRef.current) {
          stream.getAudioTracks().forEach(t => { t.enabled = false })
          setMuted(true)
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        setMediaReady(true)
      } catch {
        if (!cancelled) {
          setMediaError('Camera & microphone access is required for video chat. Please allow access and try again.')
          setMediaReady(false)
        }
      }
    })()

    // Runs on unmount (e.g. navigating to the homepage / leaving the chat page)
    // and whenever mediaActive flips off — always releases the camera.
    return () => {
      cancelled = true
      stopLocalMedia()
    }
  }, [mediaActive, retryTick, stopLocalMedia])

  // Keep the <video> element bound to the stream if it (re)mounts.
  useEffect(() => {
    if (mediaReady && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [mediaReady])

  // ── Phase 2: peer connection (per match) ───────────────────────────────────
  useEffect(() => {
    if (!peerActive || !mediaReady || !localStreamRef.current) {
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
      pendingCandidates.current = []
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      setConnState('idle')
      setQuality(null)
      setLatencyMs(null)
      setSignalHandler(null)
      return
    }

    let cancelled = false
    let statsTimer: ReturnType<typeof setInterval> | undefined
    setConnState('connecting')

    // ICE servers (incl. TURN) are fetched async from the backend, so build the
    // peer connection only once they're ready — otherwise relay candidates are
    // missing and restrictive-NAT peers never connect.
    ;(async () => {
      const iceServers = await getIceServers()
      const stream = localStreamRef.current
      if (cancelled || !stream) return

      const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 })
      pcRef.current = pc

      stream.getTracks().forEach((t: MediaStreamTrack) => pc.addTrack(t, stream))

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal('webrtc_ice', e.candidate.toJSON())
      }
      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0]
          // Nudge playback — the Start-video user gesture already satisfies autoplay.
          remoteVideoRef.current.play?.().catch(() => {})
        }
      }
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState
        console.log('[webrtc] connectionState:', s)
        if (s === 'connected') setConnState('connected')
        else if (s === 'failed' || s === 'closed') setConnState('failed')
      }
      // Diagnostics + self-healing: if ICE can't find a working path it ends in
      // 'failed'; the initiator retries with fresh candidates (iceRestart).
      pc.oniceconnectionstatechange = async () => {
        const s = pc.iceConnectionState
        console.log('[webrtc] iceConnectionState:', s)
        if (s === 'connected' || s === 'completed') {
          setConnState('connected')
        } else if (s === 'failed') {
          if (initiator && pcRef.current === pc) {
            try {
              const offer = await pc.createOffer({ iceRestart: true })
              await pc.setLocalDescription(offer)
              sendSignal('webrtc_offer', offer)
            } catch (err) { console.error('[webrtc] ICE restart failed:', err) }
          }
        }
      }
      pc.onicegatheringstatechange = () => {
        console.log('[webrtc] iceGatheringState:', pc.iceGatheringState)
      }
      pc.onicecandidateerror = (e: any) => {
        // 701 = TURN/STUN server unreachable; 300-family = auth/allocation issues.
        console.warn('[webrtc] ICE candidate error', e?.errorCode, e?.errorText, e?.url)
      }

      async function flushCandidates(peer: RTCPeerConnection) {
        const pending = pendingCandidates.current
        pendingCandidates.current = []
        for (const c of pending) {
          try { await peer.addIceCandidate(c) } catch { /* ignore */ }
        }
      }

      setSignalHandler(async (msg: SignalMessage) => {
        const peer = pcRef.current
        if (!peer) return
        try {
          if (msg.type === 'webrtc_offer') {
            await peer.setRemoteDescription(new RTCSessionDescription(msg.data))
            await flushCandidates(peer)
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            sendSignal('webrtc_answer', answer)
          } else if (msg.type === 'webrtc_answer') {
            await peer.setRemoteDescription(new RTCSessionDescription(msg.data))
            await flushCandidates(peer)
          } else if (msg.type === 'webrtc_ice') {
            if (peer.remoteDescription && peer.remoteDescription.type) {
              await peer.addIceCandidate(msg.data)
            } else {
              pendingCandidates.current.push(msg.data)
            }
          }
        } catch (err) {
          console.error('WebRTC signal error:', err)
        }
      })

      if (initiator) {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          sendSignal('webrtc_offer', offer)
        } catch (err) {
          console.error('createOffer error:', err)
          setConnState('failed')
        }
      }

      // Poll connection stats → RTT (latency) + packet loss → quality level.
      prevLossRef.current = { lost: 0, recv: 0 }
      statsTimer = setInterval(async () => {
        const peer = pcRef.current
        if (!peer || peer.connectionState !== 'connected') return
        let rtt: number | null = null
        let lost = 0
        let recv = 0
        try {
          const stats = await peer.getStats()
          stats.forEach((r: any) => {
            if (r.type === 'candidate-pair' && r.nominated && r.currentRoundTripTime != null) {
              rtt = r.currentRoundTripTime * 1000
            } else if (r.type === 'remote-inbound-rtp' && r.roundTripTime != null) {
              rtt = r.roundTripTime * 1000
            }
            if (r.type === 'inbound-rtp' && r.kind === 'video') {
              lost += r.packetsLost || 0
              recv += r.packetsReceived || 0
            }
          })
        } catch {
          return
        }

        const prev = prevLossRef.current
        const dLost = Math.max(0, lost - prev.lost)
        const dRecv = Math.max(0, recv - prev.recv)
        prevLossRef.current = { lost, recv }
        const lossPct = dLost + dRecv > 0 ? (dLost / (dLost + dRecv)) * 100 : 0

        let q: 'good' | 'fair' | 'poor' = 'good'
        if ((rtt != null && rtt > 300) || lossPct > 5) q = 'poor'
        else if ((rtt != null && rtt > 150) || lossPct > 2) q = 'fair'

        setLatencyMs(rtt != null ? Math.round(rtt) : null)
        setQuality(q)
      }, 2000)
    })()

    return () => {
      cancelled = true
      clearInterval(statsTimer)
      setSignalHandler(null)
      const pc = pcRef.current
      if (pc) {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.oniceconnectionstatechange = null
        pc.onicegatheringstatechange = null
        pc.onicecandidateerror = null
        pc.close()
        pcRef.current = null
      }
      pendingCandidates.current = []
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      setConnState('idle')
      setQuality(null)
      setLatencyMs(null)
    }
  }, [peerActive, mediaReady, initiator, sendSignal, setSignalHandler])

  const retryMedia = useCallback(() => setRetryTick(t => t + 1), [])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled) }
  }, [])

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setCameraOff(!track.enabled) }
  }, [])

  // Flip between front ('user') and back ('environment') cameras: acquire a new
  // video track with the opposite facing mode, hot-swap it into the peer
  // connection (replaceTrack — no renegotiation), and into the local preview.
  const switchCamera = useCallback(async () => {
    const stream = localStreamRef.current
    if (!stream) return
    const next = facingRef.current === 'user' ? 'environment' : 'user'
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false })
      const newTrack = ns.getVideoTracks()[0]
      if (!newTrack) return
      const oldTrack = stream.getVideoTracks()[0]
      // Preserve the current on/off state across the swap.
      newTrack.enabled = oldTrack ? oldTrack.enabled : true

      const pc = pcRef.current
      if (pc) {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender) await sender.replaceTrack(newTrack)
      }

      if (oldTrack) { stream.removeTrack(oldTrack); oldTrack.stop() }
      stream.addTrack(newTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      facingRef.current = next
      setFacingMode(next)
    } catch (err) {
      console.error('[webrtc] switchCamera failed:', err)
    }
  }, [])

  return {
    localVideoRef, remoteVideoRef,
    mediaReady, mediaError, retryMedia,
    connState, quality, latencyMs,
    muted, cameraOff, toggleMute, toggleCamera,
    facingMode, switchCamera,
  }
}
