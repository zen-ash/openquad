import type { PlayerInfo } from '@quad/shared'
import { create } from 'zustand'
import type { Snapshot } from '../game/interpolation'

type Status = 'idle' | 'connecting' | 'connected' | 'disconnected'

type GameState = {
  status: Status
  me: PlayerInfo | null
  // just id -> name. positions change way too often to live in react state
  players: Record<string, string>
}

export const useGame = create<GameState>(() => ({
  status: 'idle',
  me: null,
  players: {},
}))

// position history for everyone else, read every frame by RemotePlayer
export const snapshots = new Map<string, Snapshot[]>()
