import campus from '../campus/campus.json'

// traffic lights. osm puts a node at a junction, or one at each stop line round it: nodes
// this close together are one junction
const SAME = 15
// a road counts as going through a junction this close to its middle
const NEAR = 10

// the lights' round: the junction's two roads take turns, a minute round. green, yellow, then
// red while the other road goes (two seconds of red both ways in between)
export const CYCLE = 60
const GREEN = 25
const YELLOW = 3
export type Light = 'green' | 'yellow' | 'red'
// when in the round (seconds) each color is on, for road 0. road 1 is half a round later
export const LAMP_ON: Record<Light, [number, number]> = {
  green: [0, GREEN],
  yellow: [GREEN, GREEN + YELLOW],
  red: [GREEN + YELLOW, CYCLE],
}

// where a road's round starts at a junction: its offset (so they don't all change at once)
// and half a round for the second road
export const roundStart = (offset: number, road: number) => offset + road * (CYCLE / 2)

/** the light a road (0 or 1) gets at a junction at a time on the clock (seconds) */
export function lightAt(offset: number, road: number, seconds: number): Light {
  const t = (((seconds + roundStart(offset, road)) % CYCLE) + CYCLE) % CYCLE
  return t < LAMP_ON.green[1] ? 'green' : t < LAMP_ON.yellow[1] ? 'yellow' : 'red'
}

// the game's clock for everything that runs by itself (lights, traffic, the crowd): the real
// time, so everyone playing sees the same, or 0 with ?still for screenshots
export const clock = (still: boolean) => (still ? 0 : Date.now() / 1000)

export type Pole = {
  // the pole's foot, which way the arm reaches (over the road) and how far, and which of the
  // junction's two roads it's for (they take turns)
  x: number
  z: number
  arm: [number, number]
  reach: number
  // which way its lights face: back at the traffic coming
  face: [number, number]
  road: number
  // so junctions don't all change at once
  offset: number
}

type Road = { width: number; points: number[][]; bridge?: boolean }

function nearest(x: number, z: number, points: number[][]) {
  let best = { d: Infinity, dir: [0, 0] as [number, number] }
  points.slice(1).forEach((b, i) => {
    const a = points[i]!
    const [dx, dz] = [b[0]! - a[0]!, b[1]! - a[1]!]
    const len = Math.hypot(dx, dz) || 1
    const t = Math.max(0, Math.min(1, ((x - a[0]!) * dx + (z - a[1]!) * dz) / (len * len)))
    const d = Math.hypot(a[0]! + dx * t - x, a[1]! + dz * t - z)
    if (d < best.d) best = { d, dir: [dx / len, dz / len] }
  })
  return best
}

export type Junction = {
  x: number
  z: number
  // so junctions don't all change at once
  offset: number
  // the roads through it, one direction each, and half their width. the first two take turns
  roads: { dir: [number, number]; half: number }[]
}

let junctions: Junction[] | null = null
export function signalJunctions(): Junction[] {
  if (junctions) return junctions
  // nodes into junctions
  const groups: { x: number; z: number; n: number }[] = []
  for (const [x, z] of campus.signals as [number, number][]) {
    const j = groups.find((j) => Math.hypot(j.x / j.n - x, j.z / j.n - z) < SAME)
    if (j) {
      j.x += x
      j.z += z
      j.n++
    } else groups.push({ x, z, n: 1 })
  }
  const roads = (campus.roads as Road[]).filter((r) => !r.bridge && r.width >= 7)
  junctions = groups.map((j, k) => {
    const [x, z] = [j.x / j.n, j.z / j.n]
    // the roads through it, one direction each (a road split into two ways at the junction
    // is still one road), the big ones first: a side street at the corner goes with the
    // cross street
    const near = roads
      .map((r) => ({ ...nearest(x, z, r.points), half: r.width / 2 }))
      .filter((r) => r.d <= NEAR)
      .sort((a, b) => b.half - a.half || a.d - b.d)
    const through: Junction['roads'] = []
    for (const { dir, half } of near) {
      if (through.some((t) => Math.abs(t.dir[0] * dir[0] + t.dir[1] * dir[1]) > 0.8)) continue
      through.push({ dir, half })
    }
    return { x, z, offset: (k * 7.3) % 60, roads: through }
  })
  return junctions
}

export function signalPoles(): Pole[] {
  const poles: Pole[] = []
  for (const { x, z, offset, roads } of signalJunctions()) {
    roads.slice(0, 2).forEach(({ dir, half }, road) => {
      const other = roads[1 - road]?.half ?? half
      // traffic coming both ways along it: a pole on the far corner of the junction to the
      // right of each, its arm reaching back across the lanes coming at it
      for (const s of [1, -1]) {
        const [fx, fz] = [dir[0] * s, dir[1] * s]
        const [rx, rz] = [-fz, fx]
        poles.push({
          x: x + fx * (other + 2) + rx * (half + 1.2),
          z: z + fz * (other + 2) + rz * (half + 1.2),
          arm: [-rx, -rz],
          reach: half + 0.5,
          face: [-fx, -fz],
          road,
          offset,
        })
      }
    })
  }
  return poles
}
