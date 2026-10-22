import * as THREE from 'three'
import type { Circle, Point, Segment } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  flat,
  glassQuad,
  insideWalls,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// the university lofts (135 edgewood ave, 2002): gsu's loft apartments. stamped metal shingles
// with white 4 light windows round a courtyard: a bar along edgewood ave stepping up from 6 to
// 10 to 14 floors, a block on auditorium pl's grid doing the same (a 6 floor wing, one column
// of 10, the 14 floor tower), the 14 floor arm and east wing between them and a 2 storey wing
// curving into the courtyard. a blank cream wall faces the parking deck. from usgs's lidar
// (2018), the commons photos from auditorium pl (2019), mapillary (2018-2019) and gsu's
// photos (2016-2026). sources: docs/reference/university-lofts.md
//
// two grids: "n" is meters along edgewood ave from the west corner and v meters in from it,
// "s" is meters along auditorium pl toward piedmont ave and b in from it. the same numbers as
// build-campus.mjs. y is meters over the edgewood ave sidewalk at the doors (304.3m)

export type LoftsData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][]; origin: number[]; along: number[] }
}

// shingle is the stamped metal (its ribs turned into the courses), cream the blank wall on
// the deck, the cornice, the white panels and the name's band, base the split face block and
// the roofs, blue the painted steel (canopies, doors), dark the garage's grille and louvres
export type Part = 'shingle' | 'cream' | 'base' | 'glass' | 'blue' | 'dark'

type Range = readonly [number, number]

// the outline, the same list as build-campus.mjs: [grid, along, in] or a point in the game.
// 'corner' is where the arm's courtyard wall meets the north bar's
export const OUTLINE: (['n' | 's', number, number] | [number, number] | 'corner')[] = [
  ['n', 0, 0],
  ['n', 27.1, 0],
  ['n', 27.1, 1.5],
  ['n', 32.1, 1.5],
  ['n', 32.1, 0],
  ['n', 50.88, 0],
  [182.76, 9.3],
  [181.5, 11.7],
  [174.6, 11.58],
  [174.6, 8.6],
  [168.8, 8.6],
  ['s', 34.3, 42.55],
  ['s', 34.3, 0],
  ['s', -1.4, 0],
  ['s', -1.4, 21.95],
  ['s', 7.4, 21.95],
  [133.5, 11.5],
  ['s', 7.24, 17],
  ['s', 13.9, 17],
  ['s', 13.9, 17.5],
  ['s', 23.2, 17.5],
  'corner',
  ['n', 18.9, 17.5],
  ['n', 18.9, 17.3],
  ['n', 10.9, 17.3],
  [142.3, -1],
  [141.4, 2],
  [140.5, 4.5],
  [139.5, 6.5],
  [137.5, 8],
  [135.5, 9.5],
  ['s', 7.41, 22.05],
  ['s', -1.4, 22.05],
  ['s', -1.4, 27.8],
]
// the courtyard's walls are edges 15 to 30 of it, 14 and 31 the slot's sides
export const COURT = [15, 31]

// floors: a 4.75m ground floor, the rest 3.09m (fitted on the 2019 photo, and it hits all
// three roofs the lidar has)
export const GROUND = 4.75
export const STOREY = 3.09
export const floorY = (n: number) => (n === 1 ? 0 : GROUND + STOREY * (n - 2))
// the tops over the sidewalk (lidar): the 6 and 10 floor parts' parapets, the low wing's,
// the 14 floor parts' cornice (its underside and top) and how far it sticks out
export const SIX = 20.8
export const TEN = 33
export const LOW = 8.6
export const SOFFIT = 43.8
export const TOP = 44.93
const CORNICE = 0.9
// the windows: 1.8m square, white frames, nearly flush. round arched on the 13th floor of the
// 14 floor parts, short ones between white panels on the 14th
export const WIN = { w: 1.8, sill: 0.65, h: 1.85, deep: 0.1 }
const ARCH_SPRING = 1.4
const TOP_ROW = { sill: 0.32, h: 1.4 }
// the window columns on auditorium pl (fitted on the two 2019 photos), the 3.17m module the
// tower has everywhere else
export const SW_COLUMNS = {
  wing: [1.6, 4.4, 7.3],
  step: [11.1],
  tower: [15.7, 18.9, 22, 25.2, 28.4, 31.6],
}
const MODULE = 3.17
// the split face block base on auditorium pl (proud of the shingles), on edgewood ave the
// storefronts' piers and the band over them up to the second floor
export const SW_BASE = { top: 3, out: 0.15 }
export const NORTH_BASE = { out: 0.3, store: 3.6 }
// the steel canopy along edgewood ave (lidar 308.7m, 2.7m out) and round the north east
// corner onto the drive
export const CANOPY = { y: [4.15, 4.4] as Range, out: 2.7, wrap: 6 }
// the entrance: the recess with the doors (same as build-campus), two round granite columns
// in front and the curved white band with the name between them (gsu 2026)
export const ENTRANCE = {
  a: [27.1, 32.1] as Range,
  deep: 1.5,
  door: 29.6,
  columns: [27.45, 31.75] as Range,
}
export const COLUMN_R = 0.3
const BAND = { y: [3.25, 3.8] as Range, bulge: 0.55 }
// auditorium pl climbs to the west: the sidewalk's height along the wall (the game's terrain
// and the lidar, 2.13m at the west corner, 1.28m at the south one)
export const sidewalk = (a: number) => 2.13 - (a + 1.4) * 0.0238
// edgewood ave falls to the east, 0.39m at the west corner to -0.29m at the east one
const edgewood = (a: number) => 0.39 - a * 0.0134
// on auditorium pl: tall ground floor windows (they go up into the shingles), the blue "135"
// doors under a steel canopy hung on two rods with the number on its front, and the garage's
// roll up grille, 2 storeys high next to a jamb pier
export const GROUND_WINDOWS: Range[] = [
  [0.85, 2.35],
  [3.65, 5.15],
  [6.55, 8.05],
  [9.55, 11.05],
  [16.9, 18.6],
  [19.9, 21.8],
]
const GROUND_HEAD = 3.6
export const SIDE_DOOR = {
  a: [13.5, 15.6] as Range,
  top: 3.95,
  canopy: [11.3, 16.4] as Range,
  y: [4, 4.54] as Range,
}
export const GRILLE = { a: [22.9, 31] as Range, top: 6.05, pier: 22.1 }
// the penthouse on the north bar and the boxes on the tower (lidar)
export const PENTHOUSE = { x: [163.5, 171] as Range, z: [-10.7, -2] as Range, top: 50.06 }
const UNITS = [
  { s: [22, 30.5], b: [6, 13.5], top: 49.2 },
  { s: [14.5, 18], b: [5, 10], top: 48.2 },
]

export function loftsFrames(b: LoftsData) {
  const [p, q] = b.landmark!.front.map(pt) as [Point, Point]
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  // along edgewood ave (east) and in from it (south)
  const na = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  const ni = { x: -na.z, z: na.x }
  const N = (a: number, v: number): Point => ({
    x: p.x + na.x * a + ni.x * v,
    z: p.z + na.z * a + ni.z * v,
  })
  const [ox, oz] = b.landmark!.origin as [number, number]
  const [ux, uz] = b.landmark!.along as [number, number]
  // along auditorium pl (south east) and in from it (north east)
  const sa = { x: ux, z: uz }
  const si = { x: uz, z: -ux }
  const S = (a: number, c: number): Point => ({
    x: ox + ux * a + uz * c,
    z: oz + uz * a - ux * c,
  })
  // where the arm's courtyard wall meets the north bar's
  const [a0, a1] = [S(23.2, 17.5), S(23.2, 60)]
  const side = (r: Point) => ni.x * (r.x - p.x) + ni.z * (r.z - p.z) - 17.5
  const t = side(a0) / (side(a0) - side(a1))
  const corner = { x: a0.x + (a1.x - a0.x) * t, z: a0.z + (a1.z - a0.z) * t }
  const outline = OUTLINE.map((e) =>
    e === 'corner'
      ? corner
      : e[0] === 'n'
        ? N(e[1], e[2])
        : e[0] === 's'
          ? S(e[1], e[2])
          : { x: e[0], z: e[1] },
  )
  return { N, S, na, ni, sa, si, corner, outline }
}

// what stands outside the walls, for walking into (game/world.ts): the base on edgewood ave
// (0.3m out of the outline) and the entrance's columns
export function loftsObstacles(b: LoftsData) {
  const { N } = loftsFrames(b)
  const out = -NORTH_BASE.out
  const line = (p: Point, q: Point): Segment => ({ ax: p.x, az: p.z, bx: q.x, bz: q.z })
  const walls = [
    line(N(0, out), N(ENTRANCE.a[0], out)),
    line(N(ENTRANCE.a[1], out), N(50.88 - out, out)),
    line(N(50.88 - out, out), N(50.88 - out, CANOPY.wrap)),
  ]
  const circles: Circle[] = ENTRANCE.columns.map((a) => ({ ...N(a, out), radius: COLUMN_R }))
  return { walls, circles }
}

const neg = (d: Point) => ({ x: -d.x, z: -d.z })
const V3 = (p: Point, y: number) => new THREE.Vector3(p.x, y, p.z)
const dirOf = (p: Point, q: Point) => {
  const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
  return { x: (q.x - p.x) / l, z: (q.z - p.z) / l }
}
// the normal of p -> q on the ground that points away from `from` (or toward it)
const away = (p: Point, q: Point, from: Point) => {
  const d = dirOf(p, q)
  const o = { x: d.z, z: -d.x }
  return o.x * (from.x - p.x) + o.z * (from.z - p.z) > 0 ? neg(o) : o
}
const toward = (p: Point, q: Point, to: Point) => neg(away(p, q, to))

// triangles facing n, uvs from uvOf (meters)
function triangles(
  tris: THREE.Vector3[][],
  n: THREE.Vector3,
  uvOf: (p: THREE.Vector3) => number[],
) {
  const pos: number[] = []
  const tex: number[] = []
  for (const tri of tris) {
    const [a, b, c] = tri as [THREE.Vector3, THREE.Vector3, THREE.Vector3]
    const cross = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a))
    // wound so it faces n
    for (const v of cross.dot(n) < 0 ? [a, c, b] : [a, b, c]) {
      pos.push(v.x, v.y, v.z)
      tex.push(...uvOf(v))
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => [n.x, n.y, n.z][i % 3]!),
      3,
    ),
  )
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2))
  return geo
}

// a square bar from a to b, w wide and h tall (brackets, struts, rods)
export function bar(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number) {
  const dir = new THREE.Vector3().subVectors(b, a).normalize()
  const ref = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3().crossVectors(dir, ref).normalize()
  const up = new THREE.Vector3().crossVectors(side, dir).normalize()
  const c = (p: THREE.Vector3, s: number, u: number) =>
    p
      .clone()
      .addScaledVector(side, (s * w) / 2)
      .addScaledVector(up, (u * h) / 2)
  const uvOf = (v: THREE.Vector3) => [v.clone().sub(a).dot(dir), v.y]
  const faces: [number, number, number, number, THREE.Vector3][] = [
    [1, -1, 1, 1, side],
    [-1, 1, -1, -1, side.clone().negate()],
    [-1, 1, 1, 1, up],
    [1, -1, -1, -1, up.clone().negate()],
  ]
  const sides = faces.map(([s0, u0, s1, u1, n]) =>
    triangles(
      [
        [c(a, s0, u0), c(b, s0, u0), c(b, s1, u1)],
        [c(a, s0, u0), c(b, s1, u1), c(a, s1, u1)],
      ],
      n,
      uvOf,
    ),
  )
  const ends = [a, b].map((p, i) =>
    triangles(
      [
        [c(p, -1, -1), c(p, 1, -1), c(p, 1, 1)],
        [c(p, -1, -1), c(p, 1, 1), c(p, -1, 1)],
      ],
      i ? dir : dir.clone().negate(),
      (v) => [v.clone().sub(p).dot(side), v.y],
    ),
  )
  return [...sides, ...ends]
}

type Win = { hole: Hole; deep: number; arch?: boolean; glass?: boolean }

export function universityLoftsGeometry(b: LoftsData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { N, S, na, ni, sa, si, corner, outline } = loftsFrames(b)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : N(ENTRANCE.door, ENTRANCE.deep)
  const north = neg(ni)
  const west = neg(na)
  const sw = neg(si)
  const nw = neg(sa)

  // the metal's ribs run up its uvs: turned, they're slats across
  const slats = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
    return geo
  }
  // something flat, its uv v moved far from 0: the families read uv y as the height for the
  // dirt near the ground
  const lid = (part: Part, pts: Point[], y: number, up = true) => {
    const geo = flat(pts, y, up)
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + 1000)
    add(part, geo)
  }

  // a wall from p to q facing o, y0 to y1, with windows (holes set `deep` back, their glass
  // at the back). arched ones get their round top and the wall's corners round it
  const face = (
    part: Part,
    p: Point,
    q: Point,
    o: Point,
    y0: number,
    y1: number,
    wins: Win[] = [],
  ) => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    if (len < 0.01 || y1 - y0 < 0.01) return
    const dir = dirOf(p, q)
    const at = (u: number, d = 0) => ({
      x: p.x + dir.x * u - o.x * d,
      z: p.z + dir.z * u - o.z * d,
    })
    const n = new THREE.Vector3(o.x, 0, o.z)
    const wallUv = (v: THREE.Vector3) => [(v.x - p.x) * dir.x + (v.z - p.z) * dir.z, v.y]
    const holes = wins.map((w) => w.hole)
    for (const [u0, u1, v0, v1] of solidPieces(len, y0, y1, holes))
      add(part, wallQuad(at(u0), at(u1), v0, v1, o, u0))
    for (const w of wins) {
      const [u0, u1, h0, h1] = w.hole
      const [v0, v1] = [Math.max(h0, y0), Math.min(h1, y1)]
      if (v1 - v0 < 0.01) continue
      const d = w.deep
      if (d > 0.001) {
        add(part, wallQuad(at(u0), at(u0, d), v0, v1, dir, u0))
        add(part, wallQuad(at(u1), at(u1, d), v0, v1, neg(dir), u1))
        const rim = [at(u0), at(u1), at(u1, d), at(u0, d)]
        if (h0 >= y0) add(part, flat(rim, v0))
        if (h1 <= y1 && !w.arch) add(part, flat(rim, v1, false))
      }
      if (w.glass === false) continue
      if (!w.arch) {
        add('glass', glassQuad(at(u0, d), at(u1, d), h0, h1, o))
        continue
      }
      // round top: the glass up to the spring and a fan over it, the wall's corners round it
      const r = (u1 - u0) / 2
      const [c, spring] = [(u0 + u1) / 2, h1 - r]
      const arc = Array.from({ length: 9 }, (_, i) => {
        const t = Math.PI - (i / 8) * Math.PI
        return [c + Math.cos(t) * r, spring + Math.sin(t) * r] as const
      })
      const P = (u: number, y: number, dd = d) => V3(at(u, dd), y)
      const pane: THREE.Vector3[][] = [
        [P(u0, h0), P(u1, h0), P(u1, spring)],
        [P(u0, h0), P(u1, spring), P(u0, spring)],
      ]
      for (let i = 0; i < 8; i++) pane.push([P(c, spring), P(...arc[i]!), P(...arc[i + 1]!)])
      const glass = triangles(pane, n, (v) => [wallUv(v)[0]! - u0, v.y - h0])
      // like glassQuad's: its size and a random number for it
      const rnd =
        Math.sin((at(u0).x + at(u1).x) * 12.9898 + (at(u0).z + at(u1).z) * 78.233 + h0 * 37.719) *
        43758.5453
      const size = [u1 - u0, h1 - h0, rnd - Math.floor(rnd)]
      const count = glass.getAttribute('position').count
      glass.setAttribute(
        'aPane',
        new THREE.Float32BufferAttribute(Array.from({ length: count }, () => size).flat(), 3),
      )
      add('glass', glass)
      const corners: THREE.Vector3[][] = []
      for (let i = 0; i < 8; i++)
        corners.push([P(i < 4 ? u0 : u1, h1, 0), P(...arc[i]!, 0), P(...arc[i + 1]!, 0)])
      add(part, triangles(corners, n, wallUv))
    }
  }

  // window holes: centers along the face on the floors given. on a 14 floor face the 13th
  // floor's are arched and the 14th's short
  const rows = (cols: number[], floors: number[], tall = false): Win[] =>
    floors.flatMap((f) =>
      cols.map((c): Win => {
        const y = floorY(f)
        const [u0, u1] = [c - WIN.w / 2, c + WIN.w / 2]
        if (tall && f === 14)
          return { hole: [u0, u1, y + TOP_ROW.sill, y + TOP_ROW.sill + TOP_ROW.h], deep: WIN.deep }
        if (tall && f === 13) {
          const top = y + WIN.sill + ARCH_SPRING + WIN.w / 2
          return { hole: [u0, u1, y + WIN.sill, top], deep: WIN.deep, arch: true }
        }
        return { hole: [u0, u1, y + WIN.sill, y + WIN.sill + WIN.h], deep: WIN.deep }
      }),
    )
  const range = (a: number, z: number) => Array.from({ length: z - a + 1 }, (_, i) => a + i)
  // columns on the module across a face len long, none on one too short for a window
  const spread = (len: number) => {
    if (len < WIN.w + 0.8) return []
    const n = Math.max(1, Math.floor((len - 1) / MODULE))
    const first = (len - (n - 1) * MODULE) / 2
    return Array.from({ length: n }, (_, i) => first + i * MODULE)
  }
  // the white panels between the 14th floor's windows, just out of the wall
  const panels = (p: Point, q: Point, o: Point, cols: number[]) => {
    const d = dirOf(p, q)
    const at = (u: number) => ({ x: p.x + d.x * u + o.x * 0.02, z: p.z + d.z * u + o.z * 0.02 })
    const y = floorY(14) + TOP_ROW.sill
    for (let i = 1; i < cols.length; i++) {
      const m = (cols[i - 1]! + cols[i]!) / 2
      const w = Math.min(1, cols[i]! - cols[i - 1]! - WIN.w - 0.3)
      if (w > 0.3) add('cream', wallQuad(at(m - w / 2), at(m + w / 2), y, y + TOP_ROW.h, o, m))
    }
  }
  // a shingled face of a block: windows on the floors given (their columns spread on the
  // module unless given), the 14th floor's panels, and any other holes
  const shingled = (
    p: Point,
    q: Point,
    o: Point,
    y0: number,
    y1: number,
    floors: number[],
    cols = spread(Math.hypot(q.x - p.x, q.z - p.z)),
    extra: Win[] = [],
    keep = (w: Win) => !!w,
  ) => {
    const tall = y1 > TEN + 1
    face('shingle', p, q, o, y0, y1, [...rows(cols, floors, tall).filter(keep), ...extra])
    if (tall && floors.includes(14)) panels(p, q, o, cols)
  }

  // the cornice round the 14 floor parts' outside, CORNICE out from the wall line along a run
  // of corners, outs the outward normal of each step
  const cornice = (run: Point[], outs: Point[]) => {
    const off = run.map((p, i) => {
      const a = outs[Math.max(0, i - 1)]!
      const c = outs[Math.min(outs.length - 1, i)]!
      // at the ends straight out, between two walls along the bisector, far enough to be
      // CORNICE off both
      const m = { x: a.x + c.x, z: a.z + c.z }
      const k = CORNICE / (m.x * c.x + m.z * c.z || 1)
      return { x: p.x + m.x * k, z: p.z + m.z * k }
    })
    for (let i = 0; i < run.length - 1; i++) {
      add('cream', wallQuad(off[i]!, off[i + 1]!, SOFFIT, TOP, outs[i]!))
      const strip = [run[i]!, run[i + 1]!, off[i + 1]!, off[i]!]
      lid('cream', strip, SOFFIT, false)
      lid('cream', strip, TOP)
    }
    const last = run.length - 1
    add('cream', wallQuad(run[0]!, off[0]!, SOFFIT, TOP, neg(dirOf(run[0]!, run[1]!))))
    add('cream', wallQuad(run[last]!, off[last]!, SOFFIT, TOP, dirOf(run[last - 1]!, run[last]!)))
  }

  // the corners going round from edgewood ave to auditorium pl
  const at = (i: number) => outline[i]!
  const [ne, east, cham, w4, w5, w6, se, south] = [
    at(5),
    at(6),
    at(7),
    at(8),
    at(9),
    at(10),
    at(11),
    at(12),
  ]
  const tall = range(2, 14)
  // a point inside the 14 floor parts, and one in the courtyard
  const inner = N(40, 10)
  const court = S(15, 30)

  // edgewood ave: the 6 floor end, the 10 floor step and the 14 floor part over storefronts
  // and the entrance under the canopy
  {
    const at = (a: number) => N(a, 0)
    shingled(at(0), at(9.7), north, GROUND, SIX, range(2, 6), [1.6, 4.6, 7.6])
    shingled(at(9.7), at(18.9), north, GROUND, TEN, range(2, 10), [1.5, 4.6, 7.7])
    shingled(at(18.9), at(50.88), north, GROUND, TOP, tall)
    // the base: piers of split face block with the storefronts between them (their glass on
    // the outline, the inside's walls are there) and a band over them to the second floor
    const o = NORTH_BASE.out
    const front = (a: number) => N(a, -o)
    const piers: number[] = []
    for (let a = 0.4; a < 50.5; a += MODULE) piers.push(a)
    const stores: Win[] = []
    piers.forEach((a, i) => {
      const [u0, u1] = [a + 0.4, (piers[i + 1] ?? 50.88) - 0.4]
      // the entrance's recess takes these
      if (u1 - u0 < 0.8 || (u1 > ENTRANCE.a[0] - 0.4 && u0 < ENTRANCE.a[1] + 0.4)) return
      const sill = Math.max(0.3, edgewood((u0 + u1) / 2) + 0.2)
      stores.push({ hole: [u0, u1, sill, NORTH_BASE.store], deep: o })
    })
    const recess: Win = {
      hole: [ENTRANCE.a[0], ENTRANCE.a[1], -1, NORTH_BASE.store],
      deep: o,
      glass: false,
    }
    face('base', front(0), front(50.88 + o), north, -0.6, GROUND, [...stores, recess])
    lid('base', [N(0, 0), N(50.88, 0), N(50.88 + o, -o), N(0, -o)], GROUND)
    add('base', wallQuad(N(0, -o), N(0, 0), -0.6, GROUND, west))
    // round the corner onto the drive under the canopy, two more storefronts
    const side = (v: number) => N(50.88 + o, v)
    face('base', side(-o), side(CANOPY.wrap), na, -0.6, GROUND, [
      { hole: [0.9, 3.1, 0.3, NORTH_BASE.store], deep: o },
      { hole: [3.7, 5.9, 0.3, NORTH_BASE.store], deep: o },
    ])
    lid('base', [N(50.88, 0), N(50.88, CANOPY.wrap), side(CANOPY.wrap), side(-o)], GROUND)
    add('base', wallQuad(side(CANOPY.wrap), N(50.88, CANOPY.wrap), -0.6, GROUND, ni))

    // the recess: glass both sides, the doors at the back, a ceiling over it
    const [r0, r1] = ENTRANCE.a
    const back = (a: number) => N(a, ENTRANCE.deep)
    const doorway: Hole = [
      ENTRANCE.door - DOOR_WIDTH / 2 - r0,
      ENTRANCE.door + DOOR_WIDTH / 2 - r0,
      0,
      DOOR_HEIGHT,
    ]
    // sidelights and a transom round the doorway
    for (const [u0, u1, v0, v1] of solidPieces(r1 - r0, 0, NORTH_BASE.store, [doorway]))
      add('glass', glassQuad(back(r0 + u0), back(r0 + u1), v0, v1, north))
    add('glass', glassQuad(N(r0, 0), back(r0), 0, NORTH_BASE.store, na))
    add('glass', glassQuad(back(r1), N(r1, 0), 0, NORTH_BASE.store, west))
    lid('cream', [N(r0, 0), N(r1, 0), back(r1), back(r0)], NORTH_BASE.store, false)
    // the columns, granite block, up to the canopy
    for (const a of ENTRANCE.columns) {
      const c = N(a, -o)
      const ring = circle(c, COLUMN_R, 16)
      ring.forEach((p, i) => {
        const q = ring[(i + 1) % ring.length]!
        add('base', wallQuad(p, q, 0, CANOPY.y[0], away(p, q, c), i * 0.12))
      })
    }
    // the curved band with the name, from column to column, bowing out toward the street
    const [c0, c1] = ENTRANCE.columns
    const line = (t: number) => N(c0 + (c1 - c0) * t, -o + 0.05)
    const arc = (t: number) => N(c0 + (c1 - c0) * t, -o - Math.sin(t * Math.PI) * BAND.bulge)
    const steps = 10
    for (let i = 0; i < steps; i++) {
      const [t0, t1] = [i / steps, (i + 1) / steps]
      const [p, q] = [arc(t0), arc(t1)]
      add('cream', wallQuad(p, q, BAND.y[0], BAND.y[1], away(p, q, back(ENTRANCE.door))))
      lid('cream', [p, q, line(t1), line(t0)], BAND.y[0], false)
      lid('cream', [p, q, line(t1), line(t0)], BAND.y[1])
    }
    add('cream', wallQuad(line(0), line(1), BAND.y[0], BAND.y[1], ni))
    const mid = arc(0.5)
    signs.push({
      x: mid.x + north.x * 0.03,
      y: (BAND.y[0] + BAND.y[1]) / 2,
      z: mid.z + north.z * 0.03,
      rot: Math.atan2(north.x, north.z),
      text: 'UNIVERSITY LOFTS',
      letters: true,
      size: 0.34,
      color: '#3e6e6c',
      weight: 500,
    })

    // the canopy: a thin steel deck on brackets with struts down to the piers
    const [cy0, cy1] = CANOPY.y
    const out = CANOPY.out
    const deck = [
      N(0, -o),
      N(50.88 + o, -o),
      N(50.88 + o, CANOPY.wrap),
      N(50.88 + out, CANOPY.wrap),
      N(50.88 + out, -out),
      N(0, -out),
    ]
    const middle = N(40, -1)
    deck.forEach((p, i) => {
      if (i > 1)
        add('blue', wallQuad(p, deck[(i + 1) % 6]!, cy0, cy1, away(p, deck[(i + 1) % 6]!, middle)))
    })
    lid('blue', deck, cy1)
    lid('blue', deck, cy0, false)
    const bracket = (from: Point, to: Point) => {
      for (const g of bar(V3(from, cy0 - 0.12), V3(to, cy0 - 0.12), 0.12, 0.24)) add('blue', g)
      const half = { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 }
      for (const g of bar(V3(from, cy0 - 1.2), V3(half, cy0 - 0.2), 0.08, 0.08)) add('blue', g)
    }
    for (const a of piers)
      if (a < ENTRANCE.a[0] || a > ENTRANCE.a[1]) bracket(N(a, -o), N(a, -out + 0.1))
    bracket(N(50.88 + o, 3), N(50.88 + out - 0.1, 3))
  }

  // the east side on the drive, the chamfer and the east wing over the deck (no windows where
  // the deck stands against them), the walls round the deck's elevator tower
  {
    const cols = spread(Math.hypot(east.x - ne.x, east.z - ne.z))
    const from = N(50.88, CANOPY.wrap)
    const u = (c: number) => c - CANOPY.wrap
    const service = u(cols[7]!)
    face('base', from, east, na, -0.6, GROUND, [
      { hole: [u(cols[3]!) - 0.9, u(cols[3]!) + 0.9, 0.9, 3], deep: 0 },
      { hole: [u(cols[5]!) - 0.9, u(cols[5]!) + 0.9, 0.9, 3], deep: 0 },
      { hole: [service - 0.6, service + 0.6, -1, 2.4], deep: 0, glass: false },
    ])
    const d = dirOf(from, east)
    const along = (k: number) => ({ x: from.x + d.x * k, z: from.z + d.z * k })
    add('blue', wallQuad(along(service - 0.6), along(service + 0.6), -0.6, 2.4, na))
    shingled(ne, east, na, GROUND, TOP, tall, cols)
    const high = range(4, 14)
    shingled(east, cham, away(east, cham, inner), 0, TOP, high)
    shingled(cham, w4, away(cham, w4, inner), 0, TOP, high, [1.75, 5.15])
    // round the notch: the east wing's side, the back, the arm's side
    const notch = { x: 171.7, z: 10 }
    face('cream', w4, w5, toward(w4, w5, notch), 0, TOP)
    face('cream', w5, w6, toward(w5, w6, notch), 0, TOP)
    face('cream', w6, se, toward(w6, se, notch), 0, TOP)
  }

  // the blank wall on the deck: a column of windows by the south corner and one of louvres on
  // every other floor (2019 photo from piedmont ave)
  {
    const o = away(se, south, S(28, 10))
    const len = Math.hypot(south.x - se.x, south.z - se.z)
    const wins: Win[] = range(4, 14).map((f) => ({
      hole: [len - 2.6, len - 1.4, floorY(f) + 0.8, floorY(f) + 2.3],
      deep: WIN.deep,
    }))
    const louvres: Win[] = [5, 7, 9, 11, 13].map((f) => ({
      hole: [len - 8.5, len - 7.7, floorY(f) + 1.6, floorY(f) + 2.1],
      deep: 0.05,
      glass: false,
    }))
    face('cream', se, south, o, 0, TOP, [...wins, ...louvres])
    const d = dirOf(se, south)
    for (const { hole } of louvres) {
      const at = (k: number) => ({ x: se.x + d.x * k - o.x * 0.05, z: se.z + d.z * k - o.z * 0.05 })
      add('dark', slats(wallQuad(at(hole[0]), at(hole[1]), hole[2], hole[3], o)))
    }
  }

  // auditorium pl: the 6 floor wing, the one column 10 floor step, the tower. the base of
  // split face block from the street to 3m, proud of the shingles, with the "135" doors, the
  // garage's grille and the tall ground floor windows going up into the shingles
  {
    const at = (a: number, d = 0) => S(a, -d)
    const C = SW_COLUMNS
    const openings: [number, number, number][] = [
      ...GROUND_WINDOWS.map(([a0, a1]): [number, number, number] => [a0, a1, GROUND_HEAD]),
      [SIDE_DOOR.a[0], SIDE_DOOR.a[1], SIDE_DOOR.top],
      [GRILLE.a[0], GRILLE.a[1], GRILLE.top],
    ]
    // the bits of them in the shingles from a0 to a1
    const upper = (a0: number, a1: number): Win[] =>
      openings
        .filter(([u0, u1]) => u1 > a0 && u0 < a1)
        .map(([u0, u1, top]) => ({
          hole: [Math.max(u0, a0) - a0, Math.min(u1, a1) - a0, 0, top],
          deep: 0,
          glass: false,
        }))
    const shift = (cs: number[], a0: number) => cs.map((c) => c - a0)
    shingled(
      at(-1.4),
      at(8.4),
      sw,
      SW_BASE.top,
      SIX,
      range(2, 6),
      shift(C.wing, -1.4),
      upper(-1.4, 8.4),
    )
    shingled(
      at(8.4),
      at(13.9),
      sw,
      SW_BASE.top,
      TEN,
      range(2, 10),
      shift(C.step, 8.4),
      upper(8.4, 13.9),
    )
    // no second floor windows over the grille
    const [g0, g1] = [GRILLE.a[0] - 13.9, GRILLE.a[1] - 13.9]
    const clear = (w: Win) => w.hole[2] > GRILLE.top || w.hole[1] < g0 || w.hole[0] > g1
    shingled(
      at(13.9),
      at(34.3),
      sw,
      SW_BASE.top,
      TOP,
      tall,
      shift(C.tower, 13.9),
      upper(13.9, 34.3),
      clear,
    )
    // the base
    const o = SW_BASE.out
    const base: Win[] = openings.map(([u0, u1, top]) => ({
      hole: [
        u0 + 1.4,
        u1 + 1.4,
        top === GROUND_HEAD ? sidewalk((u0 + u1) / 2) + 0.25 : -1,
        SW_BASE.top,
      ],
      deep: o,
      glass: false,
    }))
    face('base', at(-1.4, o), at(34.3, o), sw, -0.6, SW_BASE.top, base)
    lid('base', [at(-1.4), at(34.3), at(34.3, o), at(-1.4, o)], SW_BASE.top)
    add('base', wallQuad(at(-1.4, o), at(-1.4), -0.6, SW_BASE.top, nw))
    add('base', wallQuad(at(34.3), at(34.3, o), -0.6, SW_BASE.top, sa))
    // the ground floor's windows on the outline
    for (const [u0, u1] of GROUND_WINDOWS)
      add('glass', glassQuad(at(u0), at(u1), sidewalk((u0 + u1) / 2) + 0.25, GROUND_HEAD, sw))
    // the blue doors and their canopy hung on two rods, the number on its front
    const [s0, s1] = SIDE_DOOR.a
    add('blue', wallQuad(at(s0), at(s1), -0.5, SIDE_DOOR.top, sw))
    const [k0, k1] = SIDE_DOOR.canopy
    const [cy0, cy1] = SIDE_DOOR.y
    const reach = 1.3
    const can = [at(k0), at(k1), at(k1, reach), at(k0, reach)]
    const mid = at((k0 + k1) / 2, 0.5)
    can.forEach((p, i) => {
      if (i) add('blue', wallQuad(p, can[(i + 1) % 4]!, cy0, cy1, away(p, can[(i + 1) % 4]!, mid)))
    })
    lid('blue', can, cy1)
    lid('blue', can, cy0, false)
    for (const [a0, a1] of [
      [k0 + 0.3, 13.1],
      [k0 + 3.3, 16.4],
    ] as const)
      for (const g of bar(V3(at(a0, reach - 0.1), cy1), V3(at(a1, 0.03), 7.7), 0.05, 0.05))
        add('blue', g)
    // the rods' diamond shaped plates on the wall
    const d = dirOf(at(0), at(1))
    for (const a of [13.1, 16.4]) {
      const c = at(a, 0.02)
      const side = (k: number) => ({ x: c.x + d.x * k, z: c.z + d.z * k })
      const pts = [V3(side(-0.25), 7.7), V3(c, 7.45), V3(side(0.25), 7.7), V3(c, 7.95)]
      add(
        'blue',
        triangles(
          [
            [pts[0]!, pts[1]!, pts[2]!],
            [pts[0]!, pts[2]!, pts[3]!],
          ],
          V3(sw, 0),
          (v) => [v.x, v.y],
        ),
      )
    }
    // the number, gold on a blue plate (the real one has gsu's flame at each end)
    const plate = at((k0 + k1) / 2, reach + 0.03)
    signs.push({
      x: plate.x,
      y: cy1 + 0.31,
      z: plate.z,
      rot: Math.atan2(sw.x, sw.z),
      text: '1 3 5',
      plate: '#1d3566',
      color: '#c9a646',
      height: 0.5,
      scale: 1.25,
    })
    // the garage's roll up grille: dark slats on the outline, and its jamb pier
    add('dark', slats(wallQuad(at(GRILLE.a[0]), at(GRILLE.a[1]), -0.5, GRILLE.top, sw)))
    const [j0, j1] = [at(GRILLE.pier, o + 0.05), at(GRILLE.a[0], o + 0.05)]
    add('base', wallQuad(j0, j1, SW_BASE.top, GRILLE.top, sw))
    add('base', wallQuad(at(GRILLE.pier), j0, SW_BASE.top, GRILLE.top, nw))
    add('base', wallQuad(j1, at(GRILLE.a[0]), SW_BASE.top, GRILLE.top, sa))
    lid('base', [at(GRILLE.pier), at(GRILLE.a[0]), j1, j0], GRILLE.top)
  }

  // the north west end: the 6 floor wing's end (windows), the low wing's wall on the yard by
  // the baptist student center, the north bar's blank west end
  {
    const at = (c: number) => S(-1.4, c)
    face('base', at(0), at(27.8), nw, -0.6, SW_BASE.top)
    shingled(at(0), at(17), nw, SW_BASE.top, SIX, range(2, 6))
    face('shingle', at(17), at(27.8), nw, SW_BASE.top, LOW, rows(spread(10.8), [2]))
    const w = (v: number) => N(0, v)
    face('base', w(19.5), w(0), west, -0.6, GROUND)
    face('shingle', w(19.5), w(17.3), west, GROUND, LOW)
    face('shingle', w(17.3), w(0), west, GROUND, SIX)
  }

  // the steps up: the 10 floor parts' sides over the 6 floor roofs, the 14 floor parts' over
  // the 10 floor roofs
  shingled(N(9.7, 17.3), N(9.7, 0), west, SIX, TEN, range(7, 10))
  shingled(N(18.9, 17.5), N(18.9, 0), west, TEN, TOP, range(11, 14))
  shingled(S(8.4, 17), S(8.4, 0), nw, SIX, TEN, range(7, 10))
  shingled(S(13.9, 17.5), S(13.9, 0), nw, TEN, TOP, range(11, 14))

  // the courtyard: shingles to the ground and windows on every floor (the ground floor's on
  // the outline). the low wing's curve has one window to a facet on each of its two floors
  {
    const wall = (p: Point, q: Point, top: number, floors: number) => {
      const cols = spread(Math.hypot(q.x - p.x, q.z - p.z))
      const o = toward(p, q, court)
      const wins = rows(cols, range(2, floors), top > TEN + 1)
      for (const c of cols) wins.push({ hole: [c - 0.9, c + 0.9, 0.9, 3.2], deep: 0 })
      face('shingle', p, q, o, 0, top, wins)
      if (top > TEN + 1) panels(p, q, o, cols)
    }
    // the wing's and the step's side, the tower, the arm, the north bar. the little steps
    // between them go up to the lower one's roof, the walls over that are drawn above
    wall(at(17), S(8.4, 17), SIX, 6)
    wall(S(8.4, 17), at(18), TEN, 10)
    face('shingle', at(18), at(19), nw, 0, TEN)
    wall(at(19), at(20), TOP, 14)
    wall(at(20), corner, TOP, 14)
    wall(corner, at(22), TOP, 14)
    face('shingle', at(22), at(23), west, 0, TEN)
    wall(at(23), at(24), TEN, 10)
    // the low wing's curve, the slot's mouth into the courtyard across it
    for (const run of [
      [17, 16, 15],
      [24, 25, 26, 27, 28, 29, 30, 31],
    ])
      for (let i = 0; i < run.length - 1; i++) {
        const [p, q] = [outline[run[i]!]!, outline[run[i + 1]!]!]
        const len = Math.hypot(q.x - p.x, q.z - p.z)
        const y = floorY(2) + WIN.sill
        const wins: Win[] =
          len > 2.2
            ? [
                { hole: [len / 2 - 0.6, len / 2 + 0.6, 1, 3], deep: 0 },
                { hole: [len / 2 - 0.6, len / 2 + 0.6, y, y + WIN.h], deep: WIN.deep },
              ]
            : []
        face('shingle', p, q, toward(p, q, court), 0, LOW, wins)
      }
    face('shingle', outline[15]!, outline[31]!, toward(outline[15]!, outline[31]!, court), 0, LOW)
    // over the low wing: the 6 floor wing's side, the north bar's back
    const wingIn = S(3, 8)
    shingled(
      S(-1.4, 17),
      outline[17]!,
      away(S(-1.4, 17), outline[17]!, wingIn),
      LOW,
      SIX,
      range(4, 6),
    )
    const barIn = N(5, 8)
    shingled(N(0, 17.3), N(9.7, 17.3), away(N(0, 17.3), N(9.7, 17.3), barIn), LOW, SIX, range(4, 6))
    face('shingle', N(9.7, 17.3), N(10.9, 17.3), away(N(9.7, 17.3), N(10.9, 17.3), barIn), LOW, TEN)
  }

  // the tops: the roofs, the cornice, the penthouse and the boxes on the tower
  {
    lid('base', [N(0, 0), N(9.7, 0), N(9.7, 17.3), N(0, 17.3)], SIX)
    lid('base', [N(9.7, 0), N(18.9, 0), N(18.9, 17.3), N(9.7, 17.3)], TEN)
    lid('base', [S(-1.4, 0), S(8.4, 0), S(8.4, 17), S(-1.4, 17)], SIX)
    lid('base', [S(8.4, 0), S(13.9, 0), S(13.9, 17), S(8.4, 17)], TEN)
    const curve = [30, 29, 28, 27, 26, 25].map((i) => outline[i]!)
    lid(
      'base',
      [S(-1.4, 17), outline[17]!, outline[16]!, ...curve, N(10.9, 17.3), N(0, 17.3), S(-1.4, 27.8)],
      LOW,
    )
    lid(
      'base',
      [
        N(18.9, 0),
        ne,
        east,
        cham,
        w4,
        w5,
        w6,
        se,
        south,
        S(13.9, 0),
        S(13.9, 17.5),
        S(23.2, 17.5),
        corner,
        N(18.9, 17.5),
      ],
      TOP,
    )
    // the cornice: from the step over the 10 floor roof round edgewood ave and the drive to
    // the deck, and from the corner bay on the deck round auditorium pl to the other step
    const runA = [N(18.9, 17.5), N(18.9, 0), ne, east, cham, w4]
    cornice(
      runA,
      runA.slice(0, -1).map((p, i) => away(p, runA[i + 1]!, inner)),
    )
    const runB = [S(34.3, 6), south, S(13.9, 0), S(13.9, 17.5)]
    cornice(
      runB,
      runB.slice(0, -1).map((p, i) => away(p, runB[i + 1]!, S(20, 8))),
    )
    const [x0, x1] = PENTHOUSE.x
    const [z0, z1] = PENTHOUSE.z
    const boxes = [
      {
        c: [
          { x: x0, z: z0 },
          { x: x1, z: z0 },
          { x: x1, z: z1 },
          { x: x0, z: z1 },
        ],
        top: PENTHOUSE.top,
      },
      ...UNITS.map((k) => ({
        c: [S(k.s[0]!, k.b[0]!), S(k.s[1]!, k.b[0]!), S(k.s[1]!, k.b[1]!), S(k.s[0]!, k.b[1]!)],
        top: k.top,
      })),
    ]
    for (const { c, top } of boxes) {
      const mid = { x: (c[0]!.x + c[2]!.x) / 2, z: (c[0]!.z + c[2]!.z) / 2 }
      c.forEach((p, i) =>
        add('cream', wallQuad(p, c[(i + 1) % 4]!, TOP, top, away(p, c[(i + 1) % 4]!, mid))),
      )
      lid('base', c, top)
    }
  }

  // inside: walls on the outline, glass where the storefronts and the courtyard are. the
  // slot's two sides are walls too, a partition 10cm thick
  const glassy = new Set([0, 1, 2, 3, 4])
  for (let i = COURT[0]!; i < COURT[1]!; i++) glassy.add(i)
  insideWalls(inside, outline, door, (p) => glassy.has(outline.indexOf(p)))

  // the shingles' courses are the metal's ribs turned
  const all = merged()
  slats(all.shingle)

  return { parts: all, inside, signs, first: ['shingle'] }
}
