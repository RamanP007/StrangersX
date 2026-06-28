'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SignalMessage } from '@/types'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export type RTCConnState = 'idle' | 'connecting' | 'connected' | 'failed'

interface Options {
  mediaActive: boolean // acquire & keep the local camera (video mode active)
  peerActive: boolean  // matched: establish the peer connection
  initiator: boolean
  sendSignal: (type: SignalMessage['type'], data: any) => void
  setSignalHandler: (fn: ((msg: SignalMessage) => void) | null) => void
}

export function useWebRTC({ mediaActive, peerActive, initiator, sendSignal, setSignalHandler }: Options) {
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
  const [retryTick, setRetryTick] = useState(0)
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor' | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const prevLossRef = useRef<{ lost: number; recv: number }>({ lost: 0, recv: 0 })

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

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc
    setConnState('connecting')

    localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal('webrtc_ice', e.candidate.toJSON())
    }
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0]
      }
    }
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      if (s === 'connected') setConnState('connected')
      else if (s === 'failed' || s === 'closed') setConnState('failed')
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
      ;(async () => {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          sendSignal('webrtc_offer', offer)
        } catch (err) {
          console.error('createOffer error:', err)
          setConnState('failed')
        }
      })()
    }

    // Poll connection stats → RTT (latency) + packet loss → quality level.
    prevLossRef.current = { lost: 0, recv: 0 }
    const statsTimer = setInterval(async () => {
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

    return () => {
      clearInterval(statsTimer)
      setSignalHandler(null)
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onconnectionstatechange = null
      pc.close()
      pcRef.current = null
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

  return {
    localVideoRef, remoteVideoRef,
    mediaReady, mediaError, retryMedia,
    connState, quality, latencyMs,
    muted, cameraOff, toggleMute, toggleCamera,
  }
}
