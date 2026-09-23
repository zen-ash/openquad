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
  | { type: 'emote'; name: string }
  // does nothing, just keeps the connection busy so the host doesn't think we're idle
  | { type: 'ping' }

// [id, x, z, heading], rounded to centimeters. sent 20 times a second to everyone, so
// it's worth keeping small (a full object with long decimals was ~5x bigger)
export type PlayerUpdate = [id: string, x: number, z: number, heading: number]

export type ServerMessage =
  | { type: 'welcome'; you: PlayerInfo; players: PlayerInfo[] }
  | { type: 'player-joined'; player: PlayerInfo }
  | { type: 'player-left'; id: string }
  | { type: 'state'; players: PlayerUpdate[] }
  | { type: 'signal'; from: string; data: SignalData }
  | { type: 'chat'; from: string; name: string; text: string }
  | { type: 'emote'; from: string; name: string }
  // these people went further than VIEW_DISTANCE, stop drawing them until they're back
  | { type: 'out-of-view'; ids: string[] }
