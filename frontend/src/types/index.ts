export interface User {
  id: string
  googleId: string
  email: string
  name: string
  avatar: string
  username: string
  usernameConfirmed: boolean
  termsAccepted: boolean
  termsAndConditionAccepted: boolean
}

export interface Message {
  id: string
  text: string
  from: 'me' | 'stranger'
  timestamp: Date
}

export type ChatStatus =
  | 'idle'
  | 'searching'
  | 'matched'
  | 'disconnected'

export type MatchMode = 'random' | 'interests'

export type ChatType = 'text' | 'video'

export interface MatchedPayload {
  roomId: string
  chatType: ChatType
  initiator: boolean
}

export interface MessagePayload {
  text: string
  from: 'stranger'
}

// Incoming WebRTC signalling message relayed by the backend.
export interface SignalMessage {
  type: 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice'
  data: any
}
