import { localPlayer } from '../game/localPlayer'
import { peers } from '../voice/voice'
import { lastSound } from '../voice/VoiceUpdater'
import { dropConnection } from './connection'
import { useEmotes } from './emotes'
import { snapshots, useGame, type Person } from './store'

// everything is drawn in a canvas so the e2e tests can't just look at the DOM.
// this lets them ask where everyone is. dev builds only
declare global {
  interface Window {
    quad?: {
      me: () => string | undefined
      myAvatar: () => string | undefined
      positionOf: (id: string) => { x: number; z: number } | undefined
      myPosition: () => { x: number; z: number }
      person: (id: string) => Person | undefined
      dropConnection: () => void
      emoteOf: (id: string) => string | undefined
      // per person we're in a call with: connection state, and how many ms ago we
      // last heard anything from them (null = never)
      voice: () => Record<string, { state: string; heardAgo: number | null }>
    }
  }
}

if (import.meta.env.DEV) {
  window.quad = {
    me: () => useGame.getState().me?.id,
    myAvatar: () => useGame.getState().me?.avatar,
    positionOf: (id) => snapshots.get(id)?.at(-1),
    myPosition: () => ({ x: localPlayer.x, z: localPlayer.z }),
    person: (id) => useGame.getState().players[id],
    dropConnection,
    emoteOf: (id) => useEmotes.getState().playing[id]?.name,
    voice: () => {
      const out: Record<string, { state: string; heardAgo: number | null }> = {}
      for (const [id, peer] of peers) {
        const heard = lastSound.get(id)
        out[id] = {
          state: peer.pc.connectionState,
          heardAgo: heard === undefined ? null : performance.now() - heard,
        }
      }
      return out
    },
  }
}
