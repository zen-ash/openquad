import type { PlayerInfo, Vec3 } from './types'

// WebRTC offer/answer/ice candidate - the server just passes these along
// without looking inside
export type SignalData =
  | { kind: 'description'; description: { type: string; sdp?: string } }
  | { kind: 'candidate'; candidate: unknown }
  | { kind: 'bye' }

export type ClientMessage =
  // position is only sent when reconnecting, so you come back where you were
  | { type: 'join'; name: string; avatar: string; position?: Vec3 }
  | { type: 'move'; position: Vec3; heading: number }
  | { type: 'signal'; to: string; data: SignalData }
  | { type: 'chat'; text: string }
  // does nothing, just keeps the connection busy so the host doesn't think we're idle
  | { type: 'ping' }

export type PlayerUpdate = Pick<PlayerInfo, 'id' | 'position' | 'heading'>

export type ServerMessage =
  | { type: 'welcome'; you: PlayerInfo; players: PlayerInfo[] }
  | { type: 'player-joined'; player: PlayerInfo }
  | { type: 'player-left'; id: string }
  | { type: 'state'; players: PlayerUpdate[] }
  | { type: 'signal'; from: string; data: SignalData }
  | { type: 'chat'; from: string; name: string; text: string }
