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

export interface ReplyRef {
  text: string
  mine: boolean // is the quoted message the local user's own?
}

export interface Message {
  id: string
  text: string
  from: 'me' | 'stranger'
  timestamp: Date
  reply?: ReplyRef
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
