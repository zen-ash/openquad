import campus from '../campus/campus.json'
import { closestOnSegment, pointInPolygon, type Point } from './collision'

// benches, bins and lamp posts along the paths in the parks, and street lights along the
// roads. osm doesn't map them, so they go where they usually are: every so often along
// the path, off to the side, facing it

export type Spot = { x: number; z: number; rot: number }
type Line = { width: number; points: Point[] }

type Box = { minX: number; maxX: number; minZ: number; maxZ: number }

const pts = (points: number[][]) => points.map(([x, z]) => ({ x: x!, z: z! }))
// with a bounding box, so most of them can be skipped without looking at every point
function boxed<T extends { points: Point[] }>(item: T): T & Box {
  const xs = item.points.map((p) => p.x)
  const zs = item.points.map((p) => p.z)
  return {
    ...item,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  }
}
const near = (p: Point, b: Box, margin: number) =>
  p.x > b.minX - margin && p.x < b.maxX + margin && p.z > b.minZ - margin && p.z < b.maxZ + margin

const parks = campus.parks.map((p) => boxed({ points: pts(p) }))
const buildings = campus.buildings.map((b) => boxed({ points: pts(b.points) }))
const roads = campus.roads.map((r) => boxed({ width: r.width, points: pts(r.points) }))
const paths = campus.paths.map((r) => boxed({ width: r.width, points: pts(r.points) }))
const trees = campus.trees.map(([x, z]) => ({ x: x!, z: z! }))
const fountain = { x: campus.fountain[0]!, z: campus.fountain[1]! }

function distToLine(p: Point, line: Point[]) {
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const c = closestOnSegment(p, line[i - 1]!, line[i]!)
    best = Math.min(best, Math.hypot(p.x - c.x, p.z - c.z))
  }
  return best
}

const inBuilding = (p: Point) => buildings.some((b) => near(p, b, 0) && pointInPolygon(p, b.points))
const inPark = (p: Point) =>
  parks.some((park) => near(p, park, 0) && pointInPolygon(p, park.points))
// on a road or a path, plus a margin
const onLine = (p: Point, lines: (Line & Box)[], margin: number) =>
  lines.some(
    (l) => near(p, l, l.width / 2 + margin) && distToLine(p, l.points) < l.width / 2 + margin,
  )

/**
 * Spots every `every` meters along a line, `offset` out to the side and turned to face
 * the line. alternate puts every other one on the other side
 */
export function alongLine(
  line: Point[],
  every: number,
  offset: number,
  start = 0,
  alternate = true,
) {
  const out: Spot[] = []
  let next = start
  let walked = 0
  let side = 1
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!
    const b = line[i]!
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    if (len < 0.01) continue
    const dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len }
    while (next <= walked + len) {
      const t = next - walked
      const n = { x: -dir.z * side, z: dir.x * side }
      const back = Math.sign(offset)
      out.push({
        x: a.x + dir.x * t + n.x * offset,
        z: a.z + dir.z * t + n.z * offset,
        rot: Math.atan2(-n.x * back, -n.z * back),
      })
      if (alternate) side = -side
      next += every
    }
    walked += len
  }
  return out
}

// the paths through parks: hurt park, the quad, woodruff park and so on
const parkPaths = paths.filter(
  (l) => inPark(l.points[Math.floor(l.points.length / 2)]!) || inPark(l.points[0]!),
)

// not in anything, off the paths and roads, not in a tree, not in the fountain
const clear = (p: Point, room: number) =>
  !inBuilding(p) &&
  !onLine(p, roads, 0.8) &&
  !onLine(p, paths, 0.2) &&
  trees.every((t) => Math.hypot(t.x - p.x, t.z - p.z) > room) &&
  Math.hypot(p.x - fountain.x, p.z - fountain.z) > 9

export const benches = parkPaths.flatMap((l) =>
  alongLine(l.points, 16, l.width / 2 + 0.7, 6).filter((s) => clear(s, 1.6)),
)

// a bin at the end of every other bench
export const bins = benches
  .filter((_, i) => i % 2 === 0)
  .map((b) => ({ x: b.x + Math.cos(b.rot) * 1.3, z: b.z - Math.sin(b.rot) * 1.3, rot: b.rot }))
  .filter((s) => clear(s, 1))

export const parkLamps = parkPaths
  .flatMap((l) => alongLine(l.points, 24, l.width / 2 + 0.5, 14))
  .filter((s) => clear(s, 1.2) && benches.every((b) => Math.hypot(b.x - s.x, b.z - s.z) > 2.5))

// both sides of the bigger roads, out at the curb, the arm reaching over the road
export const streetLights = roads
  .filter((r) => r.width >= 8)
  .flatMap((r) =>
    [1, -1].flatMap((side) => alongLine(r.points, 32, (r.width / 2 + 0.7) * side, 10, false)),
  )
  .filter((s) => !inBuilding(s) && !onLine(s, roads, 0.3) && !inPark(s))
