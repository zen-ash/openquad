import { snapshots, useGame } from './store'

// everything is drawn in a canvas so the e2e tests can't just look at the DOM.
// this lets them ask where everyone is. dev builds only
declare global {
  interface Window {
    quad?: {
      me: () => string | undefined
      positionOf: (id: string) => { x: number; z: number } | undefined
    }
  }
}

if (import.meta.env.DEV) {
  window.quad = {
    me: () => useGame.getState().me?.id,
    positionOf: (id) => snapshots.get(id)?.at(-1),
  }
}
