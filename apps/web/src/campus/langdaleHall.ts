import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  edges,
  flat,
  frame,
  glassQuad,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// langdale hall, the old general classroom building (1971) on peachtree center ave. 11
// floors: tall panels of dark brick between light precast piers, a slot of small windows
// in each pier, and the top three floors in a band that sticks out all round, deep set
// windows between wedge shaped fins. where kell hall was built against it (torn down in
// 2019) it got a new front of precast and grey brick. from gsu's photos (2018-2026),
// mapillary (2019) and commons (2019). sources: docs/reference/langdale-hall.md
//
// "u" is meters along a wall from its left end as you look at it from outside, "d" meters
// out from it (the building is at d < 0)

export type LangdaleData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][] }
}

export type Part = 'precast' | 'brick' | 'grey' | 'glass' | 'spandrel' | 'frame' | 'roof'

// the ground floor is taller than the rest. floor n (1 is the ground floor) starts at level(n)
export const GROUND = 4.25
export const FLOOR = 3.75
export const level = (n: number) => (n <= 1 ? 0 : GROUND + (n - 2) * FLOOR)
// the band round floors 9-11: a deep beam from BAND, then the three rows of windows with
// thin ledges between them, and the fascia up to the top. from gsu's 2022 photo, the
// bottom from the 2019 mapillary photo
export const BAND = 29.8
export const WINDOWS: [number, number][] = [
  [31.5, 34.85],
  [35.35, 38.7],
  [39.2, 42.6],
]
export const ROOF = level(12)
// the band's piers stick out OUT past the walls under it, the ledges and the fascia LEDGE,
// far enough to throw a shadow line across the windows (2018 photo)
export const OUT = 0.8
export const LEDGE = OUT + 0.4
// how far the windows in the band sit back from its piers. not much: the 2022 photo sees
// the glass between the fins from far along the wall
const DEEP = 0.3
// how far the brick panels sit back from the piers. the brick is on osm's outline and the
// piers stand out in front of it: anything set back behind the outline would be behind the
// interior's walls (interiorGeometry.ts), which cast shadows on it and hide it
export const RECESS = 0.3
// the new front where kell hall was goes a bit higher than the band
export const BAY_UP = 1.4

// each old side: the piers with a slot of windows in them, [u0, u1] (and how wide their two
// piers are if it's not `pier`), the solid corners at each end and how high the base under
// the brick is. measured on gsu's 2018 photo from the south, and on the 2019 mapillary photo
// from the decatur street corner (docs/reference/langdale-hall.md)
export type Side = {
  groups: number[][]
  // how many columns of windows in each slot
  columns: number
  pier: number
  left: number
  right: number
  from: number
  // the piers go up through the band to the roof (decatur street)
  pylons?: boolean
}

export const SIDES = {
  // peachtree center ave, from the north corner: six piers 8.2m apart, both photos agree
  // within a meter
  nw: {
    groups: [5.3, 13.45, 21.6, 29.8, 37.95, 46.1].map((u) => [u, u + 3.4]),
    pier: 1,
    columns: 2,
    left: 0.5,
    right: 1.6,
    from: 1.3,
  },
  // decatur street, from the west corner: two wide piers that go up to the roof
  sw: {
    groups: [
      [8.1, 13.3],
      [23, 27.9],
    ],
    pier: 1.25,
    columns: 3,
    left: 1.3,
    right: 2.5,
    from: 1.3,
    pylons: true,
  },
  // toward the plaza, from the south corner: seven panels, narrow piers
  se: {
    groups: [10.1, 18.4, 26.6, 34.3, 42.5, 49.8].map((c) => [c - 1.45, c + 1.45]),
    pier: 0.8,
    columns: 2,
    left: 2.6,
    right: 0.8,
    from: 1.3,
  },
} satisfies Record<string, Side>

// the main doors on peachtree center ave: glass in two panels under a long canopy from the
// second pier to the fourth (gsu's 2022 photo has its north end, the 2019 mapillary photo
// its south end). the game's door is in the second one (build-campus.mjs puts it there)
export const ENTRANCE = {
  glass: [
    [16.85, 21.6],
    [25, 29.8],
  ],
  canopy: [13.45, 30.3],
}
// the doors from the plaza on the south east side, under the fifth panel (2018 photo, and
// gsu's 2026 photo of them close up)
const PLAZA = { glass: [[35.75, 41.05]], canopy: [33.4, 43.8] }
// the canopies: bottom, top and how far out
const CANOPY = [3.9, 5.3, 2.6] as const
// the doors at the foot of the pylons on decatur street, under a small canopy (2019 photo)
const SIDE_DOOR = 2.6

type Wall = {
  p: Point
  len: number
  dir: Point
  o: Point
  at: (u: number, d?: number) => Point
}

function wallOf(p: Point, q: Point, o: Point): Wall {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  return {
    p,
    len,
    dir,
    o,
    at: (u, d = 0) => ({ x: p.x + dir.x * u + o.x * d, z: p.z + dir.z * u + o.z * d }),
  }
}
const flip = (o: Point) => ({ x: -o.x, z: -o.z })

export type Kind = 'nw' | 'sw' | 'se' | 'notchN' | 'bayNW' | 'bay' | 'baySE' | 'notchE'

// the walls of the outline, left to right seen from outside, and which side each one is.
// osm's outline is the box, plus a bay 5m out on the north east side. "a" and "d" are
// along and out from the peachtree center ave front
export function langdaleWalls(b: LangdaleData) {
  const outline = b.points.map(pt)
  const [west, north] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(west, north)
  const walls: Wall[] = []
  const kinds = new Map<Wall, Kind>()
  for (const { p, q, len, out } of edges(outline)) {
    if (len < 0.05) continue
    const right = { x: out.z, z: -out.x }
    const forward = (q.x - p.x) * right.x + (q.z - p.z) * right.z > 0
    const w = wallOf(forward ? p : q, forward ? q : p, out)
    const mid = w.at(len / 2)
    const [a, d] = [f.aOf(mid), f.dOf(mid)]
    const facing = out.x * f.out.x + out.z * f.out.z
    const sideways = out.x * f.along.x + out.z * f.along.z
    let kind: Kind
    if (facing > 0.9) kind = d > -2 ? 'nw' : 'bayNW'
    else if (facing < -0.9) kind = d < -32 ? 'se' : 'baySE'
    else if (sideways < -0.9) kind = 'sw'
    else kind = a > 59 ? 'bay' : d > -15 ? 'notchN' : 'notchE'
    walls.push(w)
    kinds.set(w, kind)
  }
  // osm has the south east side as two edges in a line, one wall here
  const inLine = walls.filter((w) => kinds.get(w) === 'se')
  if (inLine.length > 1) {
    const first = inLine[0]!
    const u = (p: Point) => (p.x - first.p.x) * first.dir.x + (p.z - first.p.z) * first.dir.z
    const ends = inLine.flatMap((w) => [w.p, w.at(w.len)]).sort((m, n) => u(m) - u(n))
    const joined = wallOf(ends[0]!, ends.at(-1)!, first.o)
    for (const w of inLine) walls.splice(walls.indexOf(w), 1)
    walls.push(joined)
    kinds.set(joined, 'se')
  }
  const of = (kind: Kind) => walls.find((w) => kinds.get(w) === kind)!
  return { f, walls, kinds, of }
}

export function langdaleHallGeometry(b: LangdaleData) {
  const { add, prism, inside, merged } = collect<Part>()
  const H = b.height
  const outline = b.points.map(pt)
  const signs: Sign[] = []
  const { f, walls, of } = langdaleWalls(b)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : of('nw').at(27.4)
  const doorU = (door.x - of('nw').p.x) * of('nw').dir.x + (door.z - of('nw').p.z) * of('nw').dir.z

  // the old sides, with their brick panels on the outline, are drawn RECESS out from it
  const offsetOf = new Map<Wall, number>()
  const moved = new Map<Wall, Wall>()
  for (const kind of ['nw', 'sw', 'se', 'notchN', 'notchE'] as const) {
    const w = of(kind)
    moved.set(w, wallOf(w.at(0, RECESS), w.at(w.len, RECESS), w.o))
    offsetOf.set(w, RECESS)
  }
  const drawn = (w: Wall) => moved.get(w) ?? w
  const original = (w: Wall) => [...moved].find(([, v]) => v === w)?.[0] ?? w
  const nw = drawn(of('nw'))
  const sw = drawn(of('sw'))
  const se = drawn(of('se'))

  // how the band ends at a corner with the band of the next wall: round an outside corner,
  // or at an inside corner the right hand one runs up to the other wall and the left hand
  // one starts in front of it. free ends get a cap
  // every wall has the band but the new front, which goes up past it
  const banded = new Set(walls.filter((w) => w !== of('bay')))
  // the wall next to this one at an end, and how far out in front of the outline it's drawn
  const next = (w: Wall, end: 0 | 1) => {
    const o = original(w)
    const at = end ? o.at(o.len) : o.p
    const other = walls.find(
      (v) => v !== o && [v.p, v.at(v.len)].some((p) => Math.hypot(p.x - at.x, p.z - at.z) < 0.3),
    )
    return { other, offset: other ? (offsetOf.get(other) ?? 0) : 0 }
  }
  const corner = (w: Wall, end: 0 | 1) => {
    const { other } = next(w, end)
    if (!other || !banded.has(other)) return 'free'
    const toward = other.o.x * w.dir.x + other.o.z * w.dir.z
    return (end ? toward > 0 : toward < 0) ? 'out' : 'in'
  }

  // where the brick panels are glass down to the ground instead (the doors), [u0, u1, 0, top]
  const openings = new Map<Wall, Hole[]>([
    [nw, ENTRANCE.glass.map(([u0, u1]): Hole => [u0!, u1!, 0, CANOPY[0]])],
    [se, PLAZA.glass.map(([u0, u1]): Hole => [u0!, u1!, 0, CANOPY[0]])],
    [sw, SIDES.sw.groups.map(([u0, u1]): Hole => [u0! + 0.4, u1! - 0.4, 0, SIDE_DOOR])],
  ])

  // a flat piece of wall facing out, d out from the wall line, less any doorway
  const face = (part: Part, w: Wall, u0: number, u1: number, y0: number, y1: number, d = 0) => {
    if (u1 - u0 < 0.001 || y1 - y0 < 0.001) return
    const holes = d > -0.5 && d < 0.05 ? (openings.get(w) ?? []) : []
    const cut = holes.map(([a, z, b0, b1]): Hole => [a - u0, z - u0, b0, b1])
    for (const [a, z, b0, b1] of solidPieces(u1 - u0, y0, y1, cut))
      add(part, wallQuad(w.at(u0 + a, d), w.at(u0 + z, d), b0, b1, w.o, u0 + a))
  }
  // a piece square to the wall at u, from d0 to d1 out, facing `into`
  const side = (
    part: Part,
    w: Wall,
    u: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
    into: Point,
  ) => {
    if (y1 > y0) add(part, wallQuad(w.at(u, d0), w.at(u, d1), y0, y1, into))
  }
  // a box sticking out of a wall, u0-u1 along it, y0-y1 up, d0 to d1 out. no back
  const lump = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d1: number,
    d0 = 0,
  ) => {
    add(part, wallQuad(w.at(u0, d1), w.at(u1, d1), y0, y1, w.o, u0))
    add(part, wallQuad(w.at(u0, d0), w.at(u0, d1), y0, y1, flip(w.dir)))
    add(part, wallQuad(w.at(u1, d0), w.at(u1, d1), y0, y1, w.dir))
    const rim = [w.at(u0, d0), w.at(u1, d0), w.at(u1, d1), w.at(u0, d1)]
    add(part, flat(rim, y1))
    if (y0 > 0.01) add(part, flat(rim, y0, false))
  }
  // the sides, top and bottom of a hole from d0 back to d1
  const reveal = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d0: number,
    d1: number,
  ) => {
    side(part, w, u0, d0, d1, y0, y1, w.dir)
    side(part, w, u1, d0, d1, y0, y1, flip(w.dir))
    const rim = [w.at(u0, d0), w.at(u1, d0), w.at(u1, d1), w.at(u0, d1)]
    if (y0 > 0.01) add(part, flat(rim, y0))
    add(part, flat(rim, y1, false))
  }
  // a strip along the floor of a recess (up) or its ceiling
  const shelf = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y: number,
    d0: number,
    d1: number,
    up: boolean,
  ) => {
    if (u1 - u0 > 0.001)
      add(part, flat([w.at(u0, d0), w.at(u1, d0), w.at(u1, d1), w.at(u0, d1)], y, up))
  }
  const glass = (w: Wall, u0: number, u1: number, y0: number, y1: number, d: number) => {
    if (u1 - u0 > 0.01 && y1 - y0 > 0.01)
      add('glass', glassQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o))
  }

  mainSide(nw, SIDES.nw)
  mainSide(sw, SIDES.sw)
  mainSide(se, SIDES.se)

  /**
   * One of the three old sides: solid corners, brick panels between piers with slots of
   * windows, and stepped brackets under the band on the piers and the corners
   */
  function mainSide(w: Wall, s: Side) {
    const cuts = [s.left, ...s.groups.flatMap(([u0, u1]) => [u0!, u1!]), w.len - s.right]
    // round the corners to meet the next side, out in front of the outline too
    const [e0, e1] = [0, 1].map((end) => (corner(w, end as 0 | 1) === 'out' ? RECESS : 0))
    face('precast', w, -e0!, s.left, 0, BAND)
    face('precast', w, w.len - s.right, w.len + e1!, 0, BAND)
    for (let i = 0; i < cuts.length - 1; i += 2) {
      const [u0, u1] = [cuts[i]!, cuts[i + 1]!]
      if (u1 - u0 < 0.1) continue
      face('brick', w, u0, u1, s.from, BAND - 0.5, -RECESS)
      face('precast', w, u0, u1, BAND - 0.5, BAND, -RECESS)
      face('precast', w, u0, u1, 0, s.from, -RECESS)
      shelf('precast', w, u0, u1, BAND, -RECESS, 0, false)
      side('precast', w, u0, 0, -RECESS, 0, BAND, w.dir)
      side('precast', w, u1, 0, -RECESS, 0, BAND, flip(w.dir))
    }
    for (const [u0, u1, pier = s.pier] of s.groups) {
      group(w, u0!, u1!, pier, s.columns, s.pylons ? H + 0.3 : BAND)
      if (s.pylons) continue
      if (u0! > 0.1) corbel(w, u0! + pier / 2)
      corbel(w, u1! - pier / 2)
    }
    if (s.left > 0.6) corbel(w, s.left / 2)
    if (s.right > 0.6) corbel(w, w.len - s.right / 2)
  }

  /**
   * A pier with a slot of windows: narrow columns of windows, each with a white marble
   * panel under every window, a bit higher in each column (stairs behind them). pylons go
   * on up through the band to the roof, out as far as its ledges
   */
  function group(w: Wall, u0: number, u1: number, pier: number, n: number, top: number) {
    const [s0, s1] = [u0 + pier, u1 - pier]
    const back = 0.45
    const low = Math.min(top, BAND)
    face('precast', w, u0, s0, 0, low)
    face('precast', w, s1, u1, 0, low)
    face('precast', w, s0, s1, 0, GROUND)
    reveal('precast', w, s0, s1, GROUND, low, 0, -back)
    const pylon = top > BAND
    if (pylon) {
      lump('precast', w, u0, s0, BAND, top, LEDGE)
      lump('precast', w, s1, u1, BAND, top, LEDGE)
      reveal('precast', w, s0, s1, BAND, top - 0.6, LEDGE, -back)
      face('precast', w, s0, s1, top - 0.6, top, LEDGE)
      shelf('precast', w, s0, s1, top, 0, LEDGE, true)
    }
    const slot = s1 - s0
    const col = 0.3
    const fin = (slot - n * col) / (n - 1)
    const end = pylon ? top - 0.6 : top
    for (let k = 0; k < n; k++) {
      const x0 = s0 + k * (col + fin)
      const shift = k * (1.6 / n)
      for (let n = 2; level(n) + shift < end; n++) {
        const base = level(n) + shift
        const sill = Math.min(base + 1.1, end)
        const head = Math.min(level(n + 1) + shift, end)
        face('spandrel', w, x0, x0 + col, base, sill, -back)
        glass(w, x0, x0 + col, sill, head, -back)
      }
      if (k === n - 1) break
      lump('precast', w, x0 + col, x0 + col + fin, GROUND, low, -0.08, -back)
      if (pylon) lump('precast', w, x0 + col, x0 + col + fin, BAND, end, LEDGE - 0.08, -back)
    }
  }

  // a stepped bracket under the band
  function corbel(w: Wall, u: number) {
    lump('precast', w, u - 0.35, u + 0.35, BAND - 0.6, BAND, OUT)
    lump('precast', w, u - 0.35, u + 0.35, BAND - 1.3, BAND - 0.6, OUT * 0.5)
  }

  // the solid rows of the band: the beam, the ledges between the windows, the fascia
  const rows: [number, number][] = [
    [BAND, WINDOWS[0]![0]],
    [WINDOWS[0]![1], WINDOWS[1]![0]],
    [WINDOWS[1]![1], WINDOWS[2]![0]],
    [WINDOWS[2]![1], H],
  ]

  /**
   * The band round floors 9-11: a deep beam at the bottom, a ledge at each floor and the
   * fascia on top, all the way along, solid piers (`solid`, over the piers below) and deep
   * set windows between wedge shaped fins. `stops` is where something else cuts through it
   * (the pylons)
   */
  function band(w: Wall, solid: number[][] = [], stops: number[][] = []) {
    const [cl, cr] = [corner(w, 0), corner(w, 1)]
    const [o0, o1] = [next(w, 0).offset, next(w, 1).offset]
    const start = cl === 'out' ? -LEDGE - o0 : cl === 'in' ? LEDGE + o0 : 0
    const end = cr === 'out' ? w.len + LEDGE + o1 : w.len
    const runs: [number, number][] = []
    let from = start
    for (const [s0, s1] of [...stops].sort((m, n) => m[0]! - n[0]!)) {
      runs.push([from, s0!])
      from = s1!
    }
    runs.push([from, end])
    for (const [r0, r1] of runs) {
      // flat bits only go round an outside corner at the left end, so none overlap
      const f0 = r0 === start && cl === 'out' ? start : Math.max(r0, 0)
      const f1 = r1 === end && cr === 'out' ? w.len : r1
      rows.forEach(([y0, y1], i) => {
        face('precast', w, r0, r1, y0, y1, LEDGE)
        shelf('precast', w, f0, f1, y0, i ? OUT - DEEP : 0, LEDGE, false)
        shelf('precast', w, f0, f1, y1, i < 3 ? OUT - DEEP : OUT - 0.3, LEDGE, true)
        // ends that don't run into anything
        if (r0 === start && cl === 'free') side('precast', w, r0, 0, LEDGE, y0, y1, flip(w.dir))
        if (r1 === end && cr === 'free') side('precast', w, r1, 0, LEDGE, y0, y1, w.dir)
      })
      // the window floors only reach round a corner as far as the piers stick out
      const w0 = r0 === start && cl === 'out' ? -OUT - o0 : r0
      const w1 = r1 === end && cr === 'out' ? w.len + OUT + o1 : r1
      for (const [y0, y1] of WINDOWS) windows(w, y0, y1, w0, w1, solid)
    }
    // the inside of the fascia, over the roof
    face('precast', w, Math.max(start, 0), Math.min(end, w.len), ROOF, H, OUT - 0.3)
  }

  // one floor of the band from r0 to r1: solid piers and ends, windows between fins
  function windows(w: Wall, y0: number, y1: number, r0: number, r1: number, solid: number[][]) {
    const blocks = [...solid, [r0 - 1, Math.max(r0, 0) + 0.6], [Math.min(r1, w.len) - 0.6, r1 + 1]]
      .map(([a, z]): [number, number] => [Math.max(a!, r0), Math.min(z!, r1)])
      .filter(([a, z]) => z > a)
      .sort((m, k) => m[0] - k[0])
    let x = r0
    const gaps: [number, number][] = []
    for (const [a, z] of blocks) {
      if (a > x + 0.3) gaps.push([x, a])
      face('precast', w, Math.max(a, x), z, y0, y1, OUT)
      x = Math.max(x, z)
    }
    if (r1 > x + 0.3) gaps.push([x, r1])
    for (const [g0, g1] of gaps) {
      side('precast', w, g0, OUT, OUT - DEEP, y0, y1, w.dir)
      side('precast', w, g1, OUT, OUT - DEEP, y0, y1, flip(w.dir))
      const count = Math.max(1, Math.round((g1 - g0) / 1.3))
      const fin = 0.5
      const pane = (g1 - g0 - (count - 1) * fin) / count
      for (let k = 0; k < count; k++) {
        const a = g0 + k * (pane + fin)
        glass(w, a, a + pane, y0, y1, OUT - DEEP)
        if (k < count - 1) wedge(w, a + pane, a + pane + fin, y0, y1)
      }
    }
  }

  // a fin between two windows in the band: wide at the glass, narrow at the front
  function wedge(w: Wall, a: number, z: number, y0: number, y1: number) {
    const back = OUT - DEEP
    const front = OUT - 0.1
    const mid = (a + z) / 2
    const [f0, f1] = [mid - 0.05, mid + 0.05]
    face('precast', w, f0, f1, y0, y1, front)
    const normal = (du: number, dd: number) => {
      const l = Math.hypot(du, dd)
      return { x: (w.dir.x * du + w.o.x * dd) / l, z: (w.dir.z * du + w.o.z * dd) / l }
    }
    const depth = front - back
    add('precast', wallQuad(w.at(a, back), w.at(f0, front), y0, y1, normal(-depth, f0 - a)))
    add('precast', wallQuad(w.at(f1, front), w.at(z, back), y0, y1, normal(depth, z - f1)))
  }

  const pierSpans = (s: Side) => s.groups.map(([u0, u1]) => [u0!, u1!])
  band(nw, pierSpans(SIDES.nw))
  // over the first pier from the south corner the band is solid a lot wider (2018 photo),
  // and so are its last 5m, since the new fronts (2023 photo)
  const [first, ...rest] = pierSpans(SIDES.se)
  band(se, [[first![0]! - 2.5, first![1]! + 2], ...rest, [se.len - 5.3, se.len + 1]])
  // on decatur street the two piers go up through the band
  band(sw, [], pierSpans(SIDES.sw))

  // the north east side of the box either side of the bay: a brick panel between piers, the
  // band over it with three windows and a solid bit at the corner. the one past the bay
  // (toward the plaza) is only seen edge on in the photos, made the same (unverified)
  boxEnd(drawn(of('notchN')), false)
  boxEnd(drawn(of('notchE')), true)
  function boxEnd(w: Wall, cornerLeft: boolean) {
    const [l, r] = cornerLeft ? [1.6, 1] : [1, 1.6]
    const [e0, e1] = [0, 1].map((end) => (corner(w, end as 0 | 1) === 'out' ? RECESS : 0))
    face('precast', w, -e0!, l, 0, BAND)
    face('precast', w, w.len - r, w.len + e1!, 0, BAND)
    face('brick', w, l, w.len - r, 1.3, BAND - 0.5, -RECESS)
    face('precast', w, l, w.len - r, BAND - 0.5, BAND, -RECESS)
    face('precast', w, l, w.len - r, 0, 1.3, -RECESS)
    shelf('precast', w, l, w.len - r, BAND, -RECESS, 0, false)
    side('precast', w, l, 0, -RECESS, 0, BAND, w.dir)
    side('precast', w, w.len - r, 0, -RECESS, 0, BAND, flip(w.dir))
    corbel(w, l / 2)
    corbel(w, w.len - r / 2)
    band(w, [cornerLeft ? [-1, 2.6] : [w.len - 2.6, w.len + 1]])
  }

  // glass up both short sides of the bay, over a solid ground floor, with the band over
  // them: dark frames, and a dark panel across the bottom of each floor (2022 and 2023 photos)
  function curtain(w: Wall, piers: number) {
    face('precast', w, 0, piers, 0, BAND)
    face('precast', w, w.len - piers, w.len, 0, BAND)
    const [g0, g1] = [piers, w.len - piers]
    face('precast', w, g0, g1, 0, GROUND)
    reveal('precast', w, g0, g1, GROUND, BAND - 0.3, 0, -0.2)
    face('precast', w, g0, g1, BAND - 0.3, BAND, -0.2)
    for (let n = 2; n <= 8; n++) {
      const top = n === 8 ? BAND - 0.3 : level(n + 1)
      face('frame', w, g0, g1, level(n), level(n) + 1.1, -0.2)
      glass(w, g0, g1, level(n) + 1.1, top, -0.2)
    }
    const panes = Math.max(2, Math.round((g1 - g0) / 1.8))
    for (let k = 1; k < panes; k++) {
      const u = g0 + ((g1 - g0) * k) / panes
      lump('frame', w, u - 0.04, u + 0.04, GROUND, BAND - 0.3, -0.12, -0.2)
    }
    for (let n = 2; n <= 8; n++)
      lump('frame', w, g0, g1, level(n) - 0.04, level(n) + 0.04, -0.12, -0.2)
  }
  for (const w of [of('bayNW'), of('baySE')]) {
    curtain(w, 0.5)
    band(w)
  }

  // the new front where kell hall was built against it (2020), rectified from gsu's 2022
  // photo: glass behind a green screen on the ground floor, a part that sticks out a little
  // with four rows of grey brick panels in precast, two rows of the old dark brick over it,
  // then three rows of six windows in the middle and blank panels either side, up past the
  // band. columns are [u0, u1] from the south east end
  newFront(of('bay'), {
    grey: [
      [1.6, 4.9],
      [5.5, 14.4],
      [15, 18.1],
    ],
    lowEnd: 20,
    dark: [
      [2, 5.1],
      [5.9, 14.6],
      [15.3, 18.4],
    ],
  })

  function newFront(w: Wall, c: { grey: number[][]; lowEnd: number; dark: number[][] }) {
    const top = H + BAY_UP
    const lowTop = 23.3
    // ground floor glass behind a screen of thin posts
    face('precast', w, 0, 0.5, 0, GROUND)
    face('precast', w, w.len - 0.5, w.len, 0, GROUND)
    glass(w, 0.5, w.len - 0.5, 0, GROUND, -0.02)
    for (let u = 1.1; u < w.len - 0.6; u += 0.6)
      lump('frame', w, u - 0.03, u + 0.03, 0, GROUND - 0.3, 0.1, 0.02)
    // the part that sticks out
    const greyRows = [
      [5, 9],
      [9.6, 13.6],
      [14.2, 18.1],
      [18.9, 22.8],
    ]
    grid(w, GROUND, lowTop, 0, c.lowEnd, 0.12, c.grey, greyRows, 'grey')
    face('precast', w, c.lowEnd, w.len, GROUND, lowTop)
    shelf('precast', w, 0, c.lowEnd, lowTop, 0, 0.12, true)
    shelf('precast', w, 0, c.lowEnd, GROUND, 0, 0.12, false)
    const darkRows = [
      [23.9, 26.8],
      [28, 31.1],
    ]
    grid(w, lowTop, 31.8, 0, w.len, 0, c.dark, darkRows, 'brick')
    // a small window in the first dark panel
    if (c.grey.length > 1) {
      reveal('precast', w, 3.3, 3.9, 25.1, 26.2, -0.05, -0.2)
      glass(w, 3.3, 3.9, 25.1, 26.2, -0.2)
    }
    // the windows, and blank panels either side
    const rows: [number, number][] = [
      [32.35, 35.65],
      [36.2, 39.6],
      [40.6, 44],
    ]
    const middle = c.dark.length > 1 ? [6, 14.8] : c.dark[0]!
    const [m0, m1] = [middle[0]!, middle[1]!]
    const blanks = c.dark.length > 1 ? [c.dark[0]!, c.dark[2]!] : []
    const cut: Hole[] = [
      ...rows.map(([y0, y1]): Hole => [m0, m1, y0, y1]),
      ...blanks.flatMap(([a, z]) => rows.map(([y0, y1]): Hole => [a!, z!, y0, y1])),
    ]
    for (const [a, z, y0, y1] of solidPieces(w.len, 31.8, top, cut))
      face('precast', w, a, z, y0, y1)
    for (const [y0, y1] of rows) {
      for (const [a, z] of blanks) {
        reveal('precast', w, a!, z!, y0, y1, 0, -0.05)
        face('precast', w, a!, z!, y0, y1, -0.05)
      }
      reveal('precast', w, m0, m1, y0, y1, 0, -0.35)
      const count = c.dark.length > 1 ? 6 : 2
      const post = 0.2
      const pane = (m1 - m0 - (count - 1) * post) / count
      for (let k = 0; k < count; k++) {
        const a = m0 + k * (pane + post)
        glass(w, a, a + pane, y0, y1, -0.35)
        if (k) face('precast', w, a - post, a, y0, y1, -0.35)
      }
    }
    shelf('precast', w, 0, w.len, top, -0.3, 0, true)
    face('precast', w, 0, w.len, ROOF, top, -0.3)
  }

  // precast with panels of brick set in a little, u0 to u1 and `d` out from the wall
  function grid(
    w: Wall,
    y0: number,
    y1: number,
    u0: number,
    u1: number,
    d: number,
    cols: number[][],
    rows: number[][],
    part: Part,
  ) {
    const holes: Hole[] = cols.flatMap(([a, z]) =>
      rows.map(([b0, b1]): Hole => [a! - u0, z! - u0, b0!, b1!]),
    )
    for (const [a, z, b0, b1] of solidPieces(u1 - u0, y0, y1, holes))
      face('precast', w, u0 + a, u0 + z, b0, b1, d)
    for (const [a, z, b0, b1] of holes) {
      face(part, w, u0 + a, u0 + z, b0, b1, d - 0.05)
      reveal('precast', w, u0 + a, u0 + z, b0, b1, d, d - 0.05)
    }
    if (d > 0) {
      side('precast', w, u0, 0, d, y0, y1, flip(w.dir))
      side('precast', w, u1, 0, d, y0, y1, w.dir)
    }
  }

  // an entrance: a precast canopy with the name on it, glass under it in black frames
  function entrance(
    w: Wall,
    e: { glass: number[][]; canopy: number[] },
    door: number | null,
    scale = 1,
  ) {
    const [bottom, top, depth] = CANOPY
    lump('precast', w, e.canopy[0]!, e.canopy[1]!, bottom, top, depth)
    // on the outline: glass set back behind it would be behind the interior's walls
    const d = -RECESS + 0.02
    for (const [g0, g1] of e.glass as [number, number][]) {
      const here = door !== null && door > g0 && door < g1
      const [d0, d1] = here ? [door - DOOR_WIDTH / 2, door + DOOR_WIDTH / 2] : [g1, g1]
      glass(w, g0, d0, 0, DOOR_HEIGHT, d)
      glass(w, d1, g1, 0, DOOR_HEIGHT, d)
      glass(w, g0, g1, DOOR_HEIGHT + 0.1, bottom, d)
      lump('frame', w, g0, g1, DOOR_HEIGHT, DOOR_HEIGHT + 0.1, d + 0.06, d)
      const n = Math.round((g1 - g0) / 1.3)
      for (let k = 0; k <= n; k++) {
        const u = g0 + ((g1 - g0) * k) / n
        if (here && u > d0 - 0.05 && u < d1 + 0.05) continue
        lump('frame', w, Math.max(g0, u - 0.04), Math.min(g1, u + 0.04), 0, bottom, d + 0.06, d)
      }
    }
    const s = w.at((e.canopy[0]! + e.canopy[1]!) / 2, depth + 0.02)
    signs.push({
      x: s.x,
      y: (bottom + top) / 2,
      z: s.z,
      rot: Math.atan2(w.o.x, w.o.z),
      text: 'LANGDALE HALL',
      plate: '#c9cdd1',
      color: '#3a3f46',
      scale,
    })
  }
  entrance(nw, ENTRANCE, doorU)
  entrance(se, PLAZA, null, 0.8)

  // decatur street: a door set back under a small box of a canopy at the foot of each pylon
  for (const [u0, u1] of SIDES.sw.groups) {
    const [a, z] = [u0! + 0.4, u1! - 0.4]
    lump('precast', sw, u0! - 0.3, u1! + 0.3, SIDE_DOOR, SIDE_DOOR + 1.1, 1.4)
    const back = -RECESS + 0.02
    reveal('precast', sw, a, z, 0, SIDE_DOOR, 0, back)
    glass(sw, a, z, 0, SIDE_DOOR, back)
    lump('frame', sw, a, z, DOOR_HEIGHT - 0.3, DOOR_HEIGHT - 0.22, back + 0.06, back)
  }

  // the roof, out under the fascia where there's a band, the penthouse and the machinery
  // where the satellite has them
  {
    const out = (w: Wall) => (banded.has(w) ? OUT - 0.3 : 0) + (offsetOf.get(w) ?? 0)
    const roof = outline.map((p) => {
      // the two walls meeting here, pushed out, where they cross
      const [l1, l2] = walls.filter((w) => {
        const t = (p.x - w.p.x) * w.dir.x + (p.z - w.p.z) * w.dir.z
        const d = (p.x - w.p.x) * w.o.x + (p.z - w.p.z) * w.o.z
        return Math.abs(d) < 0.2 && t > -0.2 && t < w.len + 0.2
      })
      if (!l1) return p
      const c1 = { x: l1.p.x + l1.o.x * out(l1), z: l1.p.z + l1.o.z * out(l1) }
      const det = l2 ? -l1.dir.x * l2.dir.z + l1.dir.z * l2.dir.x : 0
      if (!l2 || Math.abs(det) < 1e-6)
        return { x: p.x + l1.o.x * out(l1), z: p.z + l1.o.z * out(l1) }
      const c2 = { x: l2.p.x + l2.o.x * out(l2), z: l2.p.z + l2.o.z * out(l2) }
      const s = (-(c2.x - c1.x) * l2.dir.z + (c2.z - c1.z) * l2.dir.x) / det
      return { x: c1.x + l1.dir.x * s, z: c1.z + l1.dir.z * s }
    })
    add('roof', flat(roof, ROOF))
    // a long penthouse in the same dark brick, a metal duct and a small box beside it (2018
    // photo from the south, the satellite)
    const box = (a0: number, a1: number, d0: number, d1: number) => [
      f.at(a0, d0),
      f.at(a1, d0),
      f.at(a1, d1),
      f.at(a0, d1),
    ]
    const house = box(5, 50, -14, -21)
    prism('brick', house, ROOF, ROOF + 5.3, false)
    prism('precast', house, ROOF + 5.3, ROOF + 5.8, false)
    add('roof', flat(house, ROOF + 5.8))
    prism('precast', box(2, 14, -12.5, -16.5), ROOF, ROOF + 3.2)
    prism('frame', box(0.5, 5, -18, -23), ROOF, ROOF + 3.4)
    for (const [a, d, wa, wd, h] of [
      [42, -9, 4, 3, 1.8],
      [47, -9, 4, 3, 1.8],
      [44, -15, 6, 3, 1.4],
    ] as const)
      prism('frame', box(a, a + wa, d, d - wd), ROOF, ROOF + h)
  }

  // the inside of the ground floor walls: the storefronts are glass, the rest solid
  for (const { p, len, dir, out } of edges(outline)) {
    if (len < 0.05) continue
    const into = flip(out)
    const at = (u: number) => ({ x: p.x + dir.x * u, z: p.z + dir.z * u })
    // which wall this edge is part of, and where along this edge a point u along it is
    const w = walls.find(
      (v) =>
        v.o.x * out.x + v.o.z * out.z > 0.999 &&
        Math.abs((p.x - v.p.x) * v.o.x + (p.z - v.p.z) * v.o.z) < 0.1,
    )
    const t = (u: number) => {
      const x = w!.at(u)
      return (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
    }
    const holes: Hole[] = []
    const glassy: Hole[] = []
    const span = (u0: number, u1: number) => {
      const [a, z] = [t(u0), t(u1)].sort((m, n) => m - n) as [number, number]
      if (Math.min(z, len) - Math.max(a, 0) > 0.01)
        glassy.push([Math.max(a, 0), Math.min(z, len), 0, CEILING])
    }
    if (w === of('nw')) {
      holes.push([t(doorU) - DOOR_WIDTH / 2, t(doorU) + DOOR_WIDTH / 2, 0, DOOR_HEIGHT])
      for (const [g0, g1] of ENTRANCE.glass as [number, number][]) {
        if (doorU > g0 && doorU < g1) {
          span(g0, doorU - DOOR_WIDTH / 2)
          span(doorU + DOOR_WIDTH / 2, g1)
        } else span(g0, g1)
      }
    }
    if (w === of('se')) for (const [g0, g1] of PLAZA.glass) span(g0!, g1!)
    for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, [...holes, ...glassy]))
      inside.solid.push(wallQuad(at(u0), at(u1), v0, v1, into))
    for (const [u0, u1, v0, v1] of glassy) inside.glass.push(wallQuad(at(u0), at(u1), v0, v1, into))
  }

  return { parts: merged(), inside, signs }
}
