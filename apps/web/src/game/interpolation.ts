import { lerpAngle, TICK_RATE } from '@quad/shared'

export type Snapshot = { t: number; x: number; z: number; heading: number }

// draw other players this far in the past so there's always two snapshots
// to blend between. 2 server ticks
export const INTERP_DELAY = (2 * 1000) / TICK_RATE

const TICK_MS = 1000 / TICK_RATE
const MAX_SNAPSHOTS = 30
// nobody runs this far in one update, so it has to be a teleport
const TELEPORT_DISTANCE = 10

export function pushSnapshot(buffer: Snapshot[], snap: Snapshot) {
  const last = buffer[buffer.length - 1]

  // teleported, just show them at the new spot instead of blending across the map
  if (last && Math.hypot(snap.x - last.x, snap.z - last.z) > TELEPORT_DISTANCE) {
    buffer.length = 0
  }

  // server only sends people who moved. if someone stood still for a while and
  // starts walking again, the previous snapshot is really old and they'd slide
  // over from it in slow motion. pretend they were still standing there one tick ago
  if (last && snap.t - last.t > TICK_MS * 2) {
    buffer.push({ ...last, t: snap.t - TICK_MS })
  }

  buffer.push(snap)
  if (buffer.length > MAX_SNAPSHOTS) buffer.splice(0, buffer.length - MAX_SNAPSHOTS)
}

export function sample(buffer: Snapshot[], time: number) {
  const first = buffer[0]
  const last = buffer[buffer.length - 1]
  if (!first || !last) return null
  if (time <= first.t) return first
  if (time >= last.t) return last // no new data, just hold still

  for (let i = buffer.length - 1; i > 0; i--) {
    const a = buffer[i - 1]!
    const b = buffer[i]!
    if (a.t <= time && time <= b.t) {
      const k = (time - a.t) / (b.t - a.t || 1)
      return {
        t: time,
        x: a.x + (b.x - a.x) * k,
        z: a.z + (b.z - a.z) * k,
        heading: lerpAngle(a.heading, b.heading, k),
      }
    }
  }
  return last
}
