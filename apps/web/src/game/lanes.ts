import { fenceDistance } from '@quad/shared'
import campus from '../campus/campus.json'
import { curbCars } from './parking'
import { signalJunctions } from './signals'
import { fromElevation, heightAt } from './terrain'

// the streets the traffic drives (traffic.ts): every lane as a line down its middle, joined at
// the junctions by curves from a lane to the lanes it can turn into. only sqrt and plain sums
// go into anything the cars' moves depend on (lengths, speeds, who crosses whom): Math.sin,
// hypot and friends can come out a hair different in another browser, and then the traffic
// would too

// it drives this far out past the fence, about as far as you see down the streets from campus
export const AREA = 120
// lanes are this wide at most and squeeze down to this before one is dropped
const LANE = 3.4
const NARROW = 2.4
// the white line is this far in from the edge of the asphalt (ground.ts), a parking lane takes
// this much more, and two way traffic keeps this far off the yellow line
const EDGE = 0.6
const PARKING = 2.3
const MIDDLE = 0.4
// sideways grip on a turn (m/s2): how fast a car takes a curve
const GRIP = 2.2
// a junction is anything three or more streets meet at. a lane stops this far back from the
// crossing street's curb (the crosswalk), and where a street just carries on into the next bit
// of osm way the lanes still bend over this much to line up
const CROSSWALK = 2.5
const CARRY_ON = 4
// a street that stops short of another one (osm drew a gap, or build-campus cut it) is joined
// on if it's this close and level with it. one that just stops is where the map's data ends
// if it's this far out of the fence (cars come and go there), else a dead end they keep out of
const JOIN = 12
// m: a car that's merged into a lane is this far on before the next can follow it in
const CLEAR = 2.5
// junctions with less than this between their stop lines are one junction
const ROOM = 8
const DATA_EDGE = 80

type Road = {
  width: number
  points: number[][]
  name?: string
  bridge?: boolean
  oneway?: boolean
  lanes?: number
  forward?: number
}

// a line with its heights, s = meters along it
export type Line = {
  x: Float64Array
  z: Float64Array
  y: Float64Array
  s: Float64Array
  length: number
}

export const len = (dx: number, dz: number) => Math.sqrt(dx * dx + dz * dz)
// to the mm, so lengths are the same everywhere
const mm = (v: number) => Math.round(v * 1000) / 1000

export function makeLine(points: number[][]): Line {
  const n = points.length
  const line = {
    x: new Float64Array(n),
    z: new Float64Array(n),
    y: new Float64Array(n),
    s: new Float64Array(n),
    length: 0,
  }
  points.forEach(([x, z, y], i) => {
    line.x[i] = mm(x!)
    line.z[i] = mm(z!)
    line.y[i] = y!
    if (i > 0) line.s[i] = mm(line.s[i - 1]! + len(x! - line.x[i - 1]!, z! - line.z[i - 1]!))
  })
  line.length = line.s[n - 1]!
  return line
}

/** where a line is s meters along (past its ends it carries straight on, level): x, y, z in
 * out */
export function pointAt(line: Line, s: number, out: number[]) {
  const { x, z, y } = line
  const ss = line.s
  const n = ss.length - 1
  if (s <= 0 || s >= line.length) {
    // which way it goes at that end, from a bit of it at least a meter long
    const end = s <= 0 ? 0 : n
    let other = end
    while (other >= 0 && other <= n && len(x[other]! - x[end]!, z[other]! - z[end]!) < 1)
      other += s <= 0 ? 1 : -1
    other = Math.min(Math.max(other, 0), n)
    const l = len(x[end]! - x[other]!, z[end]! - z[other]!) || 1
    const past = s <= 0 ? -s : s - line.length
    out[0] = x[end]! + ((x[end]! - x[other]!) / l) * past
    out[1] = y[end]!
    out[2] = z[end]! + ((z[end]! - z[other]!) / l) * past
    return out
  }
  let lo = 0
  let hi = n
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (ss[mid]! <= s) lo = mid
    else hi = mid
  }
  const t = (s - ss[lo]!) / (ss[hi]! - ss[lo]! || 1)
  out[0] = x[lo]! + (x[hi]! - x[lo]!) * t
  out[1] = y[lo]! + (y[hi]! - y[lo]!) * t
  out[2] = z[lo]! + (z[hi]! - z[lo]!) * t
  return out
}

export type Turn = 'straight' | 'right' | 'left'

export type Lane = {
  id: number
  line: Line
  // the junction at its end, which way it runs on its osm way, its place across the road (0
  // by the right hand curb), how wide the street is (bigger ones go first)
  node: number
  way: Way
  index: number
  width: number
  // m/s
  limit: number
  // the light at its end (the junction's offset and which of its two roads this is)
  light: { offset: number; road: number } | null
  // a stop sign: the smaller street at a junction with no lights
  stop: boolean
  // the curves out of it, made as the routes need them
  turns: Connector[]
}

export type Connector = {
  id: number
  line: Line
  from: Lane
  to: Lane
  turn: Turn
  node: number
  limit: number
  // the ones that cross it, pass too close or end in the same lane, and how far along them a
  // car has to be before it's out of the way: one that isn't yet keeps this one waiting
  conflicts: { with: Connector; at: number }[]
  // the others out of the same lane, and how far along this one they're still side by side
  // (cars on them are still in the same queue till there)
  siblings: { with: Connector; split: number }[]
}

// one direction of one stretch of street between two junctions, all its lanes
export type Way = {
  id: number
  from: number
  to: number
  lanes: Lane[]
  // comes in at the edge of the area, or leaves it there
  entry: boolean
  exit: boolean
  // which way it points at each end (unit)
  start: [number, number]
  end: [number, number]
}

export type Node = {
  x: number
  z: number
  ins: Way[]
  outs: Way[]
  junction: boolean
}

type Edge = {
  road: Road
  points: number[][]
  a: number
  b: number
}

// the area the traffic is in: inside the fence or not far out of it, and on the map
const inArea = (x: number, z: number) =>
  fenceDistance(x, z) >= -AREA &&
  Math.abs(x) < campus.halfSize - 2 &&
  Math.abs(z) < campus.halfSize - 2

// keeps the bits of a line in the area and a bit past its edge (the cut ends are where cars
// come and go: a bit out, so they're never right on top of a junction)
const PAST = 25
function clipToArea(points: number[][], edges: Set<string>) {
  // meters along the line at each point, and which are in
  const at = [0]
  for (let i = 1; i < points.length; i++)
    at.push(
      at[i - 1]! + len(points[i]![0]! - points[i - 1]![0]!, points[i]![1]! - points[i - 1]![1]!),
    )
  const pointAt = (d: number) => {
    let i = 1
    while (i < points.length - 1 && at[i]! < d) i++
    const t = Math.min(Math.max((d - at[i - 1]!) / (at[i]! - at[i - 1]! || 1), 0), 1)
    return points[i - 1]!.map((v, k) => Math.round((v + (points[i]![k]! - v) * t) * 100) / 100)
  }
  // where along it the edge is between two points, one in and one out
  const edge = (i: number, j: number) => {
    let [lo, hi] = [0, 1]
    for (let k = 0; k < 20; k++) {
      const mid = (lo + hi) / 2
      const p = pointAt(at[i]! + (at[j]! - at[i]!) * mid)
      if (inArea(p[0]!, p[1]!)) lo = mid
      else hi = mid
    }
    return at[i]! + (at[j]! - at[i]!) * lo
  }
  const runs: number[][][] = []
  const inside = points.map(([x, z]) => inArea(x!, z!))
  for (let i = 0; i < points.length; i++) {
    if (!inside[i] || (i > 0 && inside[i - 1])) continue
    let j = i
    while (j + 1 < points.length && inside[j + 1]) j++
    // from just before it comes in to just after it goes out
    const from = i > 0 ? Math.max(0, edge(i, i - 1) - PAST) : 0
    const to = j < points.length - 1 ? Math.min(at[at.length - 1]!, edge(j, j + 1) + PAST) : at[j]!
    const run = [pointAt(from)]
    for (let k = 0; k < points.length; k++) if (at[k]! > from && at[k]! < to) run.push(points[k]!)
    run.push(pointAt(to))
    if (i > 0) edges.add(`${run[0]![0]},${run[0]![1]}`)
    if (j < points.length - 1) edges.add(`${run[run.length - 1]![0]},${run[run.length - 1]![1]}`)
    if (to - from > 1) runs.push(run)
  }
  return runs
}

function lengthOf(points: number[][]) {
  let l = 0
  for (let i = 1; i < points.length; i++)
    l += len(points[i]![0]! - points[i - 1]![0]!, points[i]![1]! - points[i - 1]![1]!)
  return l
}

// a line cut to start a meters in and end b meters short of its end
function trim(points: number[][], a: number, b: number) {
  const s = [0]
  for (let i = 1; i < points.length; i++)
    s.push(
      s[i - 1]! + len(points[i]![0]! - points[i - 1]![0]!, points[i]![1]! - points[i - 1]![1]!),
    )
  const total = s[s.length - 1]!
  const at = (d: number) => {
    let i = 1
    while (i < s.length - 1 && s[i]! < d) i++
    const t = (d - s[i - 1]!) / (s[i]! - s[i - 1]! || 1)
    return points[i - 1]!.map((v, k) => v + (points[i]![k]! - v) * t)
  }
  const out = [at(a)]
  for (let i = 1; i < points.length - 1; i++)
    if (s[i]! > a && s[i]! < total - b) out.push(points[i]!)
  out.push(at(total - b))
  return out
}

// the line moved `by` meters to its right (mitred at the corners), with points every 2m or so
// so the heights follow the ground
function offset(points: number[][], by: number) {
  const n = points.length
  const seg = (i: number) => {
    const [a, b] = [points[i]!, points[i + 1]!]
    const l = len(b[0]! - a[0]!, b[1]! - a[1]!) || 1
    // to the right of the way it goes (x east, z south)
    return [-(b[1]! - a[1]!) / l, (b[0]! - a[0]!) / l]
  }
  const moved = points.map((p, i) => {
    const [n0, n1] = [seg(Math.max(0, i - 1)), seg(Math.min(n - 2, i))]
    let [nx, nz] = [n0[0]! + n1[0]!, n0[1]! + n1[1]!]
    const l = len(nx, nz) || 1
    ;[nx, nz] = [nx / l, nz / l]
    const k = 1 / Math.max(0.5, nx * n1[0]! + nz * n1[1]!)
    return [p[0]! + nx * by * k, p[1]! + nz * by * k, ...p.slice(2)]
  })
  const out = [moved[0]!]
  for (let i = 1; i < n; i++) {
    const [a, b] = [moved[i - 1]!, moved[i]!]
    const steps = Math.max(1, Math.ceil(len(b[0]! - a[0]!, b[1]! - a[1]!) / 2))
    for (let k = 1; k <= steps; k++) out.push(a.map((v, j) => v + ((b[j]! - v) * k) / steps))
  }
  return out
}

// heights: a bridge's deck (sea level meters as the third number), or the ground
const withHeights = (points: number[][], bridge: boolean) =>
  points.map(([x, z, deck]) => {
    const [mx, mz] = [mm(x!), mm(z!)]
    return [mx, mz, bridge && Number.isFinite(deck) ? fromElevation(deck!) : heightAt(mx, mz)]
  })

// which way a line goes over its first or last few meters
function heading(points: number[][], fromEnd: boolean) {
  const ps = fromEnd ? [...points].reverse() : points
  const a = ps[0]!
  let b = ps[1]!
  for (const p of ps.slice(1)) {
    b = p
    if (len(p[0]! - a[0]!, p[1]! - a[1]!) > 8) break
  }
  const l = len(b[0]! - a[0]!, b[1]! - a[1]!) || 1
  const d: [number, number] = [(b[0]! - a[0]!) / l, (b[1]! - a[1]!) / l]
  return fromEnd ? ([-d[0], -d[1]] as [number, number]) : d
}

// how many lanes each way: along the points and back
function laneCounts(r: Road): [number, number] {
  if (r.oneway) return [r.lanes ?? (r.width >= 9 ? 2 : 1), 0]
  if (r.forward && r.lanes && r.lanes > r.forward) return [r.forward, r.lanes - r.forward]
  // three lanes and no say which way: one each way and a turn lane between
  const each = r.lanes && r.lanes >= 4 ? Math.floor(r.lanes / 2) : 1
  return [each, each]
}

// downtown's limits: 35 mph on the big streets, 25 on the rest
const limitFor = (width: number) => (width >= 9 ? 14 : 11)

// the curve from the end of one lane to the start of another: a bezier, tangent to both
function curve(a: Lane, b: Lane) {
  const [la, lb] = [a.line, b.line]
  const n = la.x.length - 1
  const p0 = [la.x[n]!, la.z[n]!]
  const p3 = [lb.x[0]!, lb.z[0]!]
  const ground =
    Math.abs(la.y[n]! - heightAt(p0[0]!, p0[1]!)) < 0.05 &&
    Math.abs(lb.y[0]! - heightAt(p3[0]!, p3[1]!)) < 0.05
  const at = (x: number, z: number, t: number) => [
    x,
    z,
    ground ? heightAt(x, z) : la.y[n]! + (lb.y[0]! - la.y[n]!) * t,
  ]
  const d0 = a.way.end
  const d1 = b.way.start
  const k = len(p3[0]! - p0[0]!, p3[1]! - p0[1]!) * 0.4
  const p1 = [p0[0]! + d0[0] * k, p0[1]! + d0[1] * k]
  const p2 = [p3[0]! - d1[0] * k, p3[1]! - d1[1] * k]
  const steps = Math.max(3, Math.ceil((k / 0.4) * 0.8))
  const points: number[][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    const x =
      u * u * u * p0[0]! + 3 * u * u * t * p1[0]! + 3 * u * t * t * p2[0]! + t * t * t * p3[0]!
    const z =
      u * u * u * p0[1]! + 3 * u * u * t * p1[1]! + 3 * u * t * t * p2[1]! + t * t * t * p3[1]!
    points.push(at(x, z, t))
  }
  return makeLine(points)
}

// the tightest bend of a line (meters of radius), from three points at a time
function tightest(line: Line) {
  let r = Infinity
  for (let i = 1; i < line.x.length - 1; i++) {
    const [ax, az] = [line.x[i]! - line.x[i - 1]!, line.z[i]! - line.z[i - 1]!]
    const [bx, bz] = [line.x[i + 1]! - line.x[i]!, line.z[i + 1]! - line.z[i]!]
    const cross = Math.abs(ax * bz - az * bx)
    if (cross < 1e-9) continue
    const c = len(ax + bx, az + bz)
    r = Math.min(r, (len(ax, az) * len(bx, bz) * c) / (2 * cross))
  }
  return r
}

// how far along q a car on it has to get to be out of the way of one on p: past where the
// lines cross or come closer than two cars' width, plus the length of the bit where the cars
// would touch (longer the flatter they cross). -1 if they never get that close
const WIDE = 2.6
function crossing(p: Line, q: Line) {
  let at = -1
  for (let j = 0; j < q.x.length; j++) {
    for (let i = 1; i < p.x.length; i++) {
      // how far q's point j is from p's segment i
      const [ax, az, bx, bz] = [p.x[i - 1]!, p.z[i - 1]!, p.x[i]!, p.z[i]!]
      const [dx, dz] = [bx - ax, bz - az]
      const l2 = dx * dx + dz * dz || 1
      const t = Math.max(0, Math.min(1, ((q.x[j]! - ax) * dx + (q.z[j]! - az) * dz) / l2))
      const [ex, ez] = [ax + dx * t - q.x[j]!, az + dz * t - q.z[j]!]
      if (ex * ex + ez * ez < WIDE * WIDE) {
        at = q.s[j]!
        break
      }
    }
  }
  return at < 0 ? -1 : at + WIDE
}

// how far along p it runs close enough to q for two cars to touch (the last bit it's that
// close: they can be turned a bit across each other)
const BESIDE = 3.5
function sideBySide(p: Line, q: Line) {
  let split = 0
  for (let i = 0; i < p.x.length; i++) {
    let near = false
    for (let j = 1; j < q.x.length && !near; j++) {
      const [ax, az, bx, bz] = [q.x[j - 1]!, q.z[j - 1]!, q.x[j]!, q.z[j]!]
      const [dx, dz] = [bx - ax, bz - az]
      const l2 = dx * dx + dz * dz || 1
      const t = Math.max(0, Math.min(1, ((p.x[i]! - ax) * dx + (p.z[i]! - az) * dz) / l2))
      const [ex, ez] = [ax + dx * t - p.x[i]!, az + dz * t - p.z[i]!]
      near = ex * ex + ez * ez < BESIDE * BESIDE
    }
    if (near) split = p.s[i]!
  }
  return split
}

export type Network = {
  nodes: Node[]
  ways: Way[]
  lanes: Lane[]
  connectors: Connector[]
  // the curve from one lane into another, made the first time it's asked for
  connect: (a: Lane, b: Lane, turn: Turn) => Connector
  // after the routes are made: who has to wait for whom in each junction
  settle: () => void
}

let made: Network | null = null
export function laneNetwork(): Network {
  return (made ??= build())
}

function build(): Network {
  // the streets cars drive: not the alleys and drives (not collins st under the viaduct either:
  // the ground there drops 6.8m in 17m, terrain.json, cars on it nosedived)
  const roads = (campus.roads as Road[]).filter((r) => r.width >= 7)
  const ends = new Set<string>()
  const pieces = roads.flatMap((road) =>
    clipToArea(road.points, ends).map((points) => ({ road, points })),
  )

  // junctions: where ways share a point, and their ends
  const key = (p: number[]) => `${p[0]},${p[1]}`
  const count = () => {
    const seen = new Map<string, number>()
    for (const { points } of pieces)
      points.forEach((p, i) => {
        const k = key(p)
        seen.set(k, (seen.get(k) ?? 0) + (i === 0 || i === points.length - 1 ? 2 : 1))
      })
    return seen
  }
  const heightOf = (p: number[], bridge?: boolean) =>
    bridge && p[2] !== undefined ? fromElevation(p[2]) : heightAt(p[0]!, p[1]!)
  // loose ends: joined on to a street close by, or the edge of the data, or dead ends
  const loose = count()
  for (const piece of [...pieces])
    for (const first of [true, false]) {
      const p = first ? piece.points[0]! : piece.points[piece.points.length - 1]!
      if (loose.get(key(p)) !== 2 || ends.has(key(p))) continue
      let best: number[] | null = null
      let d = JOIN
      for (const other of pieces) {
        if (other === piece) continue
        for (const q of other.points) {
          const dq = len(q[0]! - p[0]!, q[1]! - p[1]!)
          const level =
            Math.abs(heightOf(q, other.road.bridge) - heightOf(p, piece.road.bridge)) < 2
          if (dq < d && level) [best, d] = [q, dq]
        }
      }
      if (best) pieces.push({ road: piece.road, points: first ? [best, p] : [p, best] })
      else if (fenceDistance(p[0]!, p[1]!) < -DATA_EDGE) ends.add(key(p))
    }
  const seen = count()
  const nodes: Node[] = []
  const nodeAt = new Map<string, number>()
  const node = (p: number[]) => {
    const k = key(p)
    let i = nodeAt.get(k)
    if (i === undefined) {
      i = nodes.push({ x: p[0]!, z: p[1]!, ins: [], outs: [], junction: false }) - 1
      nodeAt.set(k, i)
    }
    return i
  }
  const edges: Edge[] = []
  for (const { road, points } of pieces) {
    let from = 0
    for (let i = 1; i < points.length; i++) {
      if (i < points.length - 1 && seen.get(key(points[i]!))! < 2) continue
      edges.push({
        road,
        points: points.slice(from, i + 1),
        a: node(points[from]!),
        b: node(points[i]!),
      })
      from = i
    }
  }
  // where one bit of osm way just carries on into the next with the same lanes, one stretch
  // (fewer junctions, and no short bits of lane between them)
  const same = (a: Road, b: Road) =>
    a.width === b.width &&
    !!a.oneway === !!b.oneway &&
    a.lanes === b.lanes &&
    a.forward === b.forward &&
    !!a.bridge === !!b.bridge
  for (let merged = true; merged;) {
    merged = false
    const touching = new Map<number, Edge[]>()
    for (const e of edges)
      for (const n of [e.a, e.b]) touching.set(n, [...(touching.get(n) ?? []), e])
    for (const [n, es] of touching) {
      if (es.length !== 2 || ends.has(key([nodes[n]!.x, nodes[n]!.z]))) continue
      let [e1, e2] = es as [Edge, Edge]
      if (e1 === e2) continue
      // two way streets drawn head to head or tail to tail: turn one round
      if (e1.a === n) [e1, e2] = [e2, e1]
      if (e1.a === n || e2.b === n) {
        const flip = e1.a === n ? e1 : e2
        if (flip.road.oneway) continue
        flip.points = [...flip.points].reverse()
        ;[flip.a, flip.b] = [flip.b, flip.a]
        const { lanes, forward } = flip.road
        if (lanes && forward) flip.road = { ...flip.road, forward: lanes - forward }
      }
      if (e1.b !== n || e2.a !== n) continue
      // a short bit of a different street gets taken in by the longer one
      const [l1, l2] = [lengthOf(e1.points), lengthOf(e2.points)]
      if (!same(e1.road, e2.road) && Math.min(l1, l2) > 15) continue
      const road = l1 > l2 ? e1.road : e2.road
      edges.splice(edges.indexOf(e2), 1)
      e1.road = { ...road, bridge: e1.road.bridge || e2.road.bridge }
      e1.points = [...e1.points, ...e2.points.slice(1)]
      e1.b = e2.b
      merged = true
      break
    }
  }
  const at = new Map<number, Edge[]>()
  const meet = () => {
    at.clear()
    for (const e of edges) for (const n of [e.a, e.b]) at.set(n, [...(at.get(n) ?? []), e])
    nodes.forEach((n, i) => (n.junction = (at.get(i)?.length ?? 0) >= 3))
  }
  meet()

  // how far back from a junction each street's lanes stop
  const dirAt = (e: Edge, n: number) => {
    const d = heading(e.points, n === e.b)
    return n === e.b ? ([-d[0], -d[1]] as [number, number]) : d
  }
  const clearance = (e: Edge, n: number) => {
    const others = at.get(n)!.filter((f) => f !== e)
    if (others.length === 0) return 0
    if (others.length === 1) return CARRY_ON
    const d = dirAt(e, n)
    let c = 0
    for (const f of others) {
      const g = dirAt(f, n)
      const sin = Math.abs(d[0] * g[1] - d[1] * g[0])
      c = Math.max(c, f.road.width / 2 / Math.max(0.4, sin))
    }
    return Math.min(c + CROSSWALK, 18)
  }

  // junctions so close together there's no room for a car between them are one junction:
  // cars go across in one go, nobody stops halfway with their back end in the first one
  const parent = nodes.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)))
  for (const e of edges) {
    const [a, b] = [nodes[e.a]!, nodes[e.b]!]
    if (
      a.junction &&
      b.junction &&
      lengthOf(e.points) < clearance(e, e.a) + clearance(e, e.b) + ROOM
    )
      parent[find(e.a)] = find(e.b)
  }
  // where each was before they're put together (for finding the lights)
  const spots = nodes.map((n) => [n.x, n.z])
  const groups = new Map<number, number[]>()
  nodes.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]))
  for (const [root, ms] of groups) {
    if (ms.length < 2) continue
    nodes[root]!.x = ms.reduce((sum, i) => sum + nodes[i]!.x, 0) / ms.length
    nodes[root]!.z = ms.reduce((sum, i) => sum + nodes[i]!.z, 0) / ms.length
  }
  const kept = edges.filter((e) => find(e.a) !== find(e.b))
  edges.length = 0
  for (const e of kept) edges.push({ ...e, a: find(e.a), b: find(e.b) })
  meet()

  // where cars are parked along the curb, so the lanes keep clear of them
  const curb = curbCars()
  const parkedBeside = (points: number[][], side: number, half: number) =>
    curb.some((c) => {
      for (let i = 1; i < points.length; i++) {
        const [a, b] = [points[i - 1]!, points[i]!]
        const [dx, dz] = [b[0]! - a[0]!, b[1]! - a[1]!]
        const l2 = dx * dx + dz * dz || 1
        const t = ((c.x - a[0]!) * dx + (c.z - a[1]!) * dz) / l2
        if (t < 0 || t > 1) continue
        // across: + is right of the way
        const across = (-(c.x - a[0]!) * dz + (c.z - a[1]!) * dx) / Math.sqrt(l2)
        if (across * side > half - PARKING - 1 && across * side < half + 1) return true
      }
      return false
    })

  // the junctions with lights: the nearest node to each, and which road each street is
  const signals = signalJunctions()
  // each set of lights goes with the one junction nearest it
  const lit = new Map<number, (typeof signals)[number]>()
  for (const j of signals) {
    let best = -1
    let d = 14
    spots.forEach(([x, z], i) => {
      const dn = len(j.x - x!, j.z - z!)
      if (nodes[find(i)]!.junction && dn < d) [best, d] = [find(i), dn]
    })
    if (best >= 0 && j.roads.length) lit.set(best, j)
  }
  const lightOf = (n: number, dir: [number, number]) => {
    const j = lit.get(n)
    if (!j) return null
    let road = 0
    let best = -1
    j.roads.slice(0, 2).forEach((r, i) => {
      const dot = Math.abs(r.dir[0] * dir[0] + r.dir[1] * dir[1])
      if (dot > best) [best, road] = [dot, i]
    })
    // a third street at the junction goes with the cross street
    return { offset: j.offset, road }
  }

  const ways: Way[] = []
  const lanes: Lane[] = []
  for (const e of edges) {
    const { road } = e
    let [ca, cb] = [clearance(e, e.a), clearance(e, e.b)]
    const length = lengthOf(e.points)
    if (length < ca + cb + 2) {
      const k = Math.max(0, length - 2) / (ca + cb || 1)
      ;[ca, cb] = [ca * k, cb * k]
    }
    const [fwd, back] = laneCounts(road)
    const half = road.width / 2 - EDGE
    for (const forward of [true, false]) {
      const count = forward ? fwd : back
      if (count === 0) continue
      let points = trim(e.points, ca, cb)
      if (!forward) points = [...points].reverse()
      const right = parkedBeside(points, 1, road.width / 2)
      const left = road.oneway && parkedBeside(points, -1, road.width / 2)
      const outer = half - (right ? PARKING : 0)
      const inner = road.oneway ? -(half - (left ? PARKING : 0)) : MIDDLE
      const n = Math.min(count, Math.max(1, Math.floor((outer - inner) / NARROW)))
      const w = Math.min(LANE, (outer - inner) / n)
      const mid = (outer + inner) / 2
      const [from, to] = forward ? [e.a, e.b] : [e.b, e.a]
      const way: Way = {
        id: ways.length,
        from,
        to,
        lanes: [],
        entry: ends.has(key([nodes[from]!.x, nodes[from]!.z])),
        exit: ends.has(key([nodes[to]!.x, nodes[to]!.z])),
        start: heading(points, false),
        end: heading(points, true),
      }
      const end = nodes[to]!
      const light = end.junction ? lightOf(to, way.end) : null
      for (let i = 0; i < n; i++) {
        const lane: Lane = {
          id: lanes.length,
          line: makeLine(withHeights(offset(points, mid + (n / 2 - i - 0.5) * w), !!road.bridge)),
          node: to,
          way,
          index: i,
          width: road.width,
          limit: limitFor(road.width),
          light,
          stop: false,
          turns: [],
        }
        way.lanes.push(lane)
        lanes.push(lane)
      }
      ways.push(way)
      nodes[from]!.outs.push(way)
      end.ins.push(way)
    }
  }

  // stop signs: at a junction with no lights, every street smaller than the biggest there
  for (const n of nodes) {
    if (!n.junction) continue
    const biggest = Math.max(
      ...n.ins.map((w) => w.lanes[0]!.width),
      ...n.outs.map((w) => w.lanes[0]!.width),
    )
    for (const w of n.ins) for (const l of w.lanes) l.stop = !l.light && l.width < biggest
  }

  const connectors: Connector[] = []
  const connect = (a: Lane, b: Lane, turn: Turn) => {
    let c = a.turns.find((t) => t.to === b)
    if (!c) {
      const line = curve(a, b)
      c = {
        id: connectors.length,
        line,
        from: a,
        to: b,
        turn,
        node: a.node,
        limit: Math.min(a.limit, b.limit, Math.sqrt(GRIP * tightest(line))),
        conflicts: [],
        siblings: [],
      }
      a.turns.push(c)
      connectors.push(c)
    }
    return c
  }
  const settle = () => {
    const byNode = new Map<number, Connector[]>()
    for (const c of connectors) byNode.set(c.node, [...(byNode.get(c.node) ?? []), c])
    for (const cs of byNode.values())
      cs.forEach((c) => {
        c.conflicts = []
        c.siblings = []
        for (const d of cs) {
          if (d === c) continue
          if (c.from === d.from) c.siblings.push({ with: d, split: sideBySide(c.line, d.line) })
          else {
            const at = c.to === d.to ? d.line.length + CLEAR : crossing(c.line, d.line)
            if (at >= 0) c.conflicts.push({ with: d, at })
          }
        }
      })
  }
  return { nodes, ways, lanes, connectors, connect, settle }
}

/** the way the next way turns from this one at their junction */
export function turnOf(a: Way, b: Way): Turn {
  const [d0, d1] = [a.end, b.start]
  const cross = d0[0] * d1[1] - d0[1] * d1[0]
  const dot = d0[0] * d1[0] + d0[1] * d1[1]
  // x east, z south: turning right is clockwise seen from above, cross > 0
  if (dot > 0.6) return 'straight'
  return cross > 0 ? 'right' : 'left'
}
