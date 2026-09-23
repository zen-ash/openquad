import { VOICE_MAX_DISTANCE } from '@quad/shared'

// connect a little before people are audible so the call is ready when you get there
export const CONNECT_RADIUS = VOICE_MAX_DISTANCE + 3
// and hang up further out, so walking along the edge doesn't reconnect over and over
export const HANGUP_RADIUS = VOICE_MAX_DISTANCE + 10
// each call is a separate audio stream, laptops start struggling past this
export const MAX_PEERS = 8

export type Nearby = { id: string; dist: number }

// both sides would try to call each other at the same time otherwise
export const shouldCall = (myId: string, otherId: string) => myId < otherId

/**
 * Given everyone I'm responsible for calling and who I'm already connected to,
 * work out who to call and who to hang up on.
 */
export function planCalls(others: Nearby[], connected: Set<string>) {
  const keep = others.filter((o) => connected.has(o.id) && o.dist <= HANGUP_RADIUS)
  const keepIds = new Set(keep.map((o) => o.id))

  const call = others
    .filter((o) => !connected.has(o.id) && o.dist <= CONNECT_RADIUS)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, Math.max(0, MAX_PEERS - keep.length))
    .map((o) => o.id)

  // anyone not in `others` anymore (left, or walked off) gets dropped too
  const hangUp = [...connected].filter((id) => !keepIds.has(id))

  return { call, hangUp }
}
