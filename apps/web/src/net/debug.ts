import { input } from '../game/input'
import { interiors } from '../game/interiors'
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
      // jump straight to a spot, no random spread like the places menu
      teleport: (x: number, z: number) => void
      // turn the camera to face this way (0 = north), so W walks that way
      faceYaw: (yaw: number) => void
      // name of the building you're inside, or null
      inside: () => string | null
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
    teleport: (x, z) => {
      localPlayer.teleport = { x, z }
    },
    faceYaw: (yaw) => {
      input.turn += yaw - localPlayer.cameraYaw
    },
    inside: () => interiors.find((r) => r.index === localPlayer.inside)?.name ?? null,
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
