import { fenceDistance } from '@quad/shared'
import type { Point } from './collision'
import { interiors } from './interiors'
import { campusGraph } from './nav'
import { route } from './navgraph'

// people walking about campus: students going between buildings. each one loops its own walk
// from door to door to door and back, at its own pace, and where they are comes from the
// clock, so everyone playing sees the same people in the same places without the server
export const WALKERS = 24

export type Walker = {
  path: Point[]
  // meters along the path at each point, and the whole loop
  at: number[]
  length: number
  speed: number
  // where in the loop it is at time 0
  start: number
  avatar: number
}

// the same "random" numbers on every computer
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// just outside every door you can walk into, on campus (inside the fence)
const doors = interiors
  .map(({ door }) => ({ x: door.x + door.nx * 2, z: door.z + door.nz * 2 }))
  .filter((p) => fenceDistance(p.x, p.z) > 2)

let made: Walker[] | null = null
export function walkers() {
  if (made) return made
  const graph = campusGraph()
  const rand = seeded(4370)
  made = []
  for (let i = 0; made.length < WALKERS && i < WALKERS * 4; i++) {
    const stops = [0, 1, 2].map(() => doors[Math.floor(rand() * doors.length)]!)
    const legs = stops.map((a, k) => route(graph, a, stops[(k + 1) % stops.length]!))
    if (legs.some((l) => !l || l.length < 2)) continue
    const path = legs.flatMap((l) => l!.slice(0, -1))
    path.push(path[0]!)
    const at = [0]
    for (let k = 1; k < path.length; k++)
      at.push(at[k - 1]! + Math.hypot(path[k]!.x - path[k - 1]!.x, path[k]!.z - path[k - 1]!.z))
    const length = at[at.length - 1]!
    if (length < 50) continue
    made.push({ path, at, length, speed: 1.15 + rand() * 0.4, start: rand() * length, avatar: i })
  }
  return made
}

// where a walker is at a time (seconds), and which way it's facing
export function walkerAt(w: Walker, seconds: number) {
  const d = (w.start + seconds * w.speed) % w.length
  // the segment it's on
  let lo = 0
  let hi = w.at.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (w.at[mid]! <= d) lo = mid
    else hi = mid
  }
  const [a, b] = [w.path[lo]!, w.path[hi]!]
  const t = (d - w.at[lo]!) / (w.at[hi]! - w.at[lo]! || 1)
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    heading: Math.atan2(b.x - a.x, b.z - a.z),
  }
}
