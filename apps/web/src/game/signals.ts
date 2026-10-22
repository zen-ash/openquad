import campus from '../campus/campus.json'

// traffic lights. osm puts a node at a junction, or one at each stop line round it: nodes
// this close together are one junction
const SAME = 15
// a road counts as going through a junction this close to its middle
const NEAR = 10

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

export function signalPoles(): Pole[] {
  // nodes into junctions
  const junctions: { x: number; z: number; n: number }[] = []
  for (const [x, z] of campus.signals as [number, number][]) {
    const j = junctions.find((j) => Math.hypot(j.x / j.n - x, j.z / j.n - z) < SAME)
    if (j) {
      j.x += x
      j.z += z
      j.n++
    } else junctions.push({ x, z, n: 1 })
  }
  const roads = (campus.roads as Road[]).filter((r) => !r.bridge && r.width >= 7)
  const poles: Pole[] = []
  junctions.forEach((j, k) => {
    const [x, z] = [j.x / j.n, j.z / j.n]
    // the roads through it, one direction each (a road split into two ways at the junction
    // is still one road)
    const through: { dir: [number, number]; half: number }[] = []
    for (const r of roads) {
      const { d, dir } = nearest(x, z, r.points)
      if (d > NEAR) continue
      if (through.some((t) => Math.abs(t.dir[0] * dir[0] + t.dir[1] * dir[1]) > 0.8)) continue
      through.push({ dir, half: r.width / 2 })
    }
    through.slice(0, 2).forEach(({ dir, half }, road) => {
      const other = through[1 - road]?.half ?? half
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
          offset: (k * 7.3) % 60,
        })
      }
    })
  })
  return poles
}
