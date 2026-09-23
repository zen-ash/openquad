import { peers } from '../voice/voice'
import { lastSound } from '../voice/VoiceUpdater'
import { snapshots, useGame } from './store'

// everything is drawn in a canvas so the e2e tests can't just look at the DOM.
// this lets them ask where everyone is. dev builds only
declare global {
  interface Window {
    quad?: {
      me: () => string | undefined
      positionOf: (id: string) => { x: number; z: number } | undefined
      // per person we're in a call with: connection state, and how many ms ago we
      // last heard anything from them (null = never)
      voice: () => Record<string, { state: string; heardAgo: number | null }>
    }
  }
}

if (import.meta.env.DEV) {
  window.quad = {
    me: () => useGame.getState().me?.id,
    positionOf: (id) => snapshots.get(id)?.at(-1),
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
