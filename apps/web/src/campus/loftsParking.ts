import * as THREE from 'three'
import type { Circle, Point, Segment } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  flat,
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'
import { sidewalk } from './universityLofts'

// the university lofts' parking deck (34 piedmont ave): a cast in place concrete deck, the
// ground floor and two levels open behind cable rails between galvanised posts, parking on
// the roof. a glass lobby with an open stair behind green wire mesh on the auditorium pl /
// piedmont ave corner, a storefront and the car doors on piedmont ave, chain link on
// auditorium pl. its north west side is the lofts' wall (the lofts draw it), the elevator
// tower stands in the notch by the lofts' east wing. from usgs's lidar (2018), mapillary
// (2019) and gsu's photo of the dock gate (2024). sources: docs/reference/lofts-parking.md
//
// on the lofts' auditorium pl grid: a meters along auditorium pl toward piedmont ave, b in
// from it. y is meters over the lofts' ground (304.3m, piedmont ave is about the same)

export type ParkingData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { origin: number[]; along: number[] }
}

// concrete is the decks, columns, walls and towers, soffit the decks' undersides (darker: the
// sky's light from under the horizon lit them like the street). steel the galvanised posts
// and the car doors, cables the rails (only their lines show), mesh the green chain link and
// the stair's screens, green the awnings
export type Part = 'concrete' | 'soffit' | 'steel' | 'cables' | 'mesh' | 'glass' | 'green'

type Range = readonly [number, number]

// the outline, the same list as build-campus.mjs
export const OUTLINE: (['s', number, number] | [number, number])[] = [
  ['s', 38.3, -0.8],
  ['s', 88.7, -0.8],
  ['s', 88.7, 56.3],
  [190, 11.8],
  [183.3, 11.8],
  [182.76, 9.3],
  [181.5, 11.7],
  [174.6, 11.58],
  [174.6, 8.6],
  [168.8, 8.6],
  ['s', 34.3, 42.55],
  ['s', 34.3, 10],
  ['s', 38.3, 10],
]
// the edges along the lofts (its chamfer, east wing, the notch, the long wall)
export const SHARED = [5, 6, 7, 8, 9, 10]

// the decks' tops: the second and third levels and the roof (lidar has the roof 9.1-9.7m up,
// higher in a strip of parked cars), the slab edge, the cable rail
export const LEVELS = [3.35, 6.38, 9.4] as const
export const EDGE = 0.45
export const RAIL = 1.1
// posts about every 4.5m (2019 photos)
const POST = 4.5
// the faces
export const SW = -0.8
export const SE = 88.7
export const NE = 56.3
// the loading dock's drive between the lofts and the deck, a gate across it
export const DOCK = { a: [34.3, 38.3] as Range, b: 10, gate: -0.4, top: 2.6 }
// the stair at the south corner: a glass lobby, then green mesh to its roof (lidar 12.9m)
export const STAIR = { a: [81.9, SE] as Range, b: [SW, 5.8] as Range, top: 12.9 }
// the elevator tower in the notch by the lofts' east wing (lidar 15.85m)
export const ELEVATOR = { x: [168.8, 174.6] as Range, z: [8.6, 14.7] as Range, top: 15.85 }
// piedmont ave: the storefront with green awnings, the two car doors, an open bay with a gate
const STORE = { b: [5.8, 37] as Range, top: 2.7 }
const DOORS: Range[] = [
  [37.6, 41.4],
  [42.2, 46.4],
]
const GATE = { b: [47.4, 55.6] as Range, top: 2.4 }
// columns 1.5m in from the faces, on a 8.7m grid
export const COLUMNS = {
  a: [39.8, 48.5, 57.2, 65.9, 74.6, 83.3],
  b: [0.7, 18.9, 37, 54.8],
  half: 0.3,
}
// the low wall along the streets and how far over the street the chain link goes
const CURB = 0.8

export function parkingFrame(b: ParkingData) {
  const [ox, oz] = b.landmark!.origin as [number, number]
  const [ux, uz] = b.landmark!.along as [number, number]
  const sa = { x: ux, z: uz }
  const si = { x: uz, z: -ux }
  const S = (a: number, c: number): Point => ({ x: ox + ux * a + uz * c, z: oz + uz * a - ux * c })
  const ab = (p: Point): [number, number] => [
    (p.x - ox) * ux + (p.z - oz) * uz,
    (p.x - ox) * uz - (p.z - oz) * ux,
  ]
  const outline = OUTLINE.map((e) => (e[0] === 's' ? S(e[1], e[2]) : { x: e[0], z: e[1] }))
  return { S, ab, sa, si, outline }
}

const neg = (d: Point) => ({ x: -d.x, z: -d.z })
const dirOf = (p: Point, q: Point) => {
  const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
  return { x: (q.x - p.x) / l, z: (q.z - p.z) / l }
}
const away = (p: Point, q: Point, from: Point) => {
  const d = dirOf(p, q)
  const o = { x: d.z, z: -d.x }
  return o.x * (from.x - p.x) + o.z * (from.z - p.z) > 0 ? neg(o) : o
}

// the columns that are on the deck (not in the towers or past the notch)
export function parkingColumns(b: ParkingData) {
  const { S, ab } = parkingFrame(b)
  const out: Point[] = []
  const inside = (p: Point) => {
    const pts = b.points.map(([x, z]) => ({ x: x!, z: z! }))
    let ins = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [c, d] = [pts[i]!, pts[j]!]
      if (c.z > p.z !== d.z > p.z && p.x < ((d.x - c.x) * (p.z - c.z)) / (d.z - c.z) + c.x)
        ins = !ins
    }
    return ins
  }
  for (const a of COLUMNS.a)
    for (const c of COLUMNS.b) {
      const p = S(a, c)
      const [pa, pb] = ab(p)
      const inStair = pa > STAIR.a[0] - 0.5 && pb < STAIR.b[1] + 0.5
      const nearElevator =
        p.x > ELEVATOR.x[0] - 1 &&
        p.x < ELEVATOR.x[1] + 1 &&
        p.z > ELEVATOR.z[0] - 1 &&
        p.z < ELEVATOR.z[1] + 1
      // a meter clear of the outline all round
      const clear = [-1, 1].every((k) => inside(S(pa + k, pb)) && inside(S(pa, pb + k)))
      if (!inStair && !nearElevator && clear) out.push(p)
    }
  return out
}

// what you walk into (game/world.ts): the gate across the dock's drive, the columns, the stair
// and elevator towers' walls inside the deck
export function parkingObstacles(b: ParkingData) {
  const { S } = parkingFrame(b)
  const line = (p: Point, q: Point): Segment => ({ ax: p.x, az: p.z, bx: q.x, bz: q.z })
  const box = (c: Point[]) => c.map((p, i) => line(p, c[(i + 1) % c.length]!))
  const [a0, a1] = STAIR.a
  const [x0, x1] = ELEVATOR.x
  const [z0, z1] = ELEVATOR.z
  const walls = [
    line(S(DOCK.a[0], DOCK.gate), S(DOCK.a[1], DOCK.gate)),
    // the stair's inner sides, the lobby is open to the deck through a door on the deck side
    line(S(a0, STAIR.b[1]), S(a1, STAIR.b[1])),
    line(S(a0, SW), S(a0, STAIR.b[1] - 1.6)),
    ...box([
      { x: x0, z: z0 },
      { x: x1, z: z0 },
      { x: x1, z: z1 },
      { x: x0, z: z1 },
    ]),
  ]
  const circles: Circle[] = parkingColumns(b).map((p) => ({ ...p, radius: COLUMNS.half + 0.1 }))
  return { walls, circles }
}

export function loftsParkingGeometry(b: ParkingData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { S, ab, sa, si, outline } = parkingFrame(b)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : S(SE, 3.3)
  const mid = S(62, 28)

  const lid = (part: Part, pts: Point[], y: number, up = true) => {
    const geo = flat(pts, y, up)
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + 1000)
    add(part, geo)
  }
  // the metal's ribs run up its uvs: turned, they're slats across (the car doors)
  const slats = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
    return geo
  }
  // a box of 4 corners from y0 to y1, its lid and (off the ground) its underside
  const box = (part: Part, c: Point[], y0: number, y1: number) => {
    const m = { x: (c[0]!.x + c[2]!.x) / 2, z: (c[0]!.z + c[2]!.z) / 2 }
    c.forEach((p, i) =>
      add(part, wallQuad(p, c[(i + 1) % 4]!, y0, y1, away(p, c[(i + 1) % 4]!, m))),
    )
    lid(part, c, y1)
    if (y0 > 0.01) lid(part, c, y0, false)
  }
  const rect = (a0: number, a1: number, b0: number, b1: number) => [
    S(a0, b0),
    S(a1, b0),
    S(a1, b1),
    S(a0, b1),
  ]
  // a band from y0 to y1 along an edge, uvs from y0 up (the cables' lines start at the slab)
  const band = (part: Part, p: Point, q: Point, o: Point, y0: number, y1: number, d = 0) => {
    const geo = wallQuad(
      { x: p.x + o.x * d, z: p.z + o.z * d },
      { x: q.x + o.x * d, z: q.z + o.z * d },
      y0,
      y1,
      o,
    )
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) - y0)
    add(part, geo)
  }

  // the decks. each level's slab is the outline less the two towers. the second level stops
  // at the dock's drive, the third and the roof go over it
  const [x0, x1] = ELEVATOR.x
  const [z0, z1] = ELEVATOR.z
  const towerless = (dock: boolean): [Point, boolean][] => [
    [S(dock ? DOCK.a[1] : DOCK.a[0], SW), true],
    [S(STAIR.a[0], SW), false],
    [S(STAIR.a[0], STAIR.b[1]), false],
    [S(SE, STAIR.b[1]), true],
    [outline[2]!, true],
    [outline[3]!, true],
    [outline[4]!, true],
    [outline[5]!, false],
    [outline[6]!, false],
    [outline[7]!, false],
    [{ x: x1, z: z1 }, false],
    [{ x: x0, z: z1 }, false],
    [outline[10]!, false],
    ...(dock
      ? ([
          [S(DOCK.a[0], DOCK.b), true],
          [S(DOCK.a[1], DOCK.b), true],
        ] as [Point, boolean][])
      : ([[S(DOCK.a[0], 0), true]] as [Point, boolean][])),
  ]
  LEVELS.forEach((top, k) => {
    const ring = towerless(k === 0)
    const pts = ring.map(([p]) => p)
    lid('concrete', pts, top)
    lid('soffit', pts, top - EDGE, false)
    ring.forEach(([p, open], i) => {
      const q = pts[(i + 1) % pts.length]!
      const o = away(p, q, mid)
      // against a tower or the lofts the slab just stops at their wall
      if (!open) return
      add('concrete', wallQuad(p, q, top - EDGE, top, o))
      band('cables', p, q, o, top, top + RAIL, -0.04)
      // posts along it
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      const d = dirOf(p, q)
      const n = Math.max(1, Math.round(len / POST))
      for (let j = 0; j <= n; j++) {
        // the end ones a bit in, clear of a wall they run into
        const t = Math.min(Math.max((len * j) / n, 0.3), len - 0.3)
        const c = { x: p.x + d.x * t - o.x * 0.1, z: p.z + d.z * t - o.z * 0.1 }
        const h = 0.04
        box(
          'steel',
          [
            { x: c.x - d.x * h - o.x * h, z: c.z - d.z * h - o.z * h },
            { x: c.x + d.x * h - o.x * h, z: c.z + d.z * h - o.z * h },
            { x: c.x + d.x * h + o.x * h, z: c.z + d.z * h + o.z * h },
            { x: c.x - d.x * h + o.x * h, z: c.z - d.z * h + o.z * h },
          ],
          top,
          top + RAIL,
        )
      }
      // the top rail
      const r = (s: number, w: number) => ({
        x: p.x + d.x * s - o.x * w,
        z: p.z + d.z * s - o.z * w,
      })
      box(
        'steel',
        [r(0.05, 0.06), r(len - 0.05, 0.06), r(len - 0.05, 0.14), r(0.05, 0.14)],
        top + RAIL - 0.05,
        top + RAIL,
      )
    })
  })
  // the floor of the ground level, a bit over the inside's floor
  lid('concrete', outline, 0.12)
  // the columns, through all the levels
  for (const c of parkingColumns(b)) {
    const h = COLUMNS.half
    const cs = [
      { x: c.x - sa.x * h - si.x * h, z: c.z - sa.z * h - si.z * h },
      { x: c.x + sa.x * h - si.x * h, z: c.z + sa.z * h - si.z * h },
      { x: c.x + sa.x * h + si.x * h, z: c.z + sa.z * h + si.z * h },
      { x: c.x - sa.x * h + si.x * h, z: c.z - sa.z * h + si.z * h },
    ]
    cs.forEach((p, i) =>
      add('concrete', wallQuad(p, cs[(i + 1) % 4]!, 0, LEVELS[2]!, away(p, cs[(i + 1) % 4]!, c))),
    )
  }

  // the ground floor round the edges: a low concrete wall and chain link up to the second
  // level on auditorium pl and the sides, on piedmont ave the storefront, the car doors and
  // the gate
  const under = LEVELS[0]! - EDGE
  const fence = (p: Point, q: Point, ground: (t: number) => number) => {
    const o = away(p, q, mid)
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const d = dirOf(p, q)
    // in steps, the street climbs along auditorium pl
    const n = Math.max(1, Math.ceil(len / 4))
    for (let j = 0; j < n; j++) {
      const [t0, t1] = [(len * j) / n, (len * (j + 1)) / n]
      const [s, e] = [
        { x: p.x + d.x * t0, z: p.z + d.z * t0 },
        { x: p.x + d.x * t1, z: p.z + d.z * t1 },
      ]
      const wall = Math.min(under - 0.3, ground((t0 + t1) / 2 / len) + CURB)
      add('concrete', wallQuad(s, e, -0.6, wall, o, t0))
      add('mesh', wallQuad(s, e, wall, under, o, t0))
      lid(
        'concrete',
        [
          s,
          e,
          { x: e.x - o.x * 0.2, z: e.z - o.z * 0.2 },
          { x: s.x - o.x * 0.2, z: s.z - o.z * 0.2 },
        ],
        wall,
      )
    }
  }
  const street = (a0: number, a1: number) => (t: number) => sidewalk(a0 + (a1 - a0) * t)
  const flatGround = () => 0.05
  fence(S(DOCK.a[1], SW), S(STAIR.a[0], SW), street(DOCK.a[1], STAIR.a[0]))
  fence(S(DOCK.a[1], DOCK.b), S(DOCK.a[1], SW), street(DOCK.a[1], DOCK.a[1]))
  fence(S(DOCK.a[0], DOCK.b), S(DOCK.a[1], DOCK.b), street(DOCK.a[0], DOCK.a[1]))
  fence(outline[2]!, outline[3]!, flatGround)
  fence(outline[3]!, outline[4]!, flatGround)
  fence(outline[4]!, outline[5]!, flatGround)
  // the gate across the dock's drive, green chain link in a frame
  const g = [S(DOCK.a[0], DOCK.gate), S(DOCK.a[1], DOCK.gate)] as const
  const gy = sidewalk(36.3)
  add('mesh', wallQuad(g[0], g[1], gy, gy + DOCK.top, neg(si)))
  add('mesh', wallQuad(g[1], g[0], gy, gy + DOCK.top, si))
  for (const a of [DOCK.a[0] + 0.1, (DOCK.a[0] + DOCK.a[1]) / 2, DOCK.a[1] - 0.1])
    box(
      'green',
      rect(a - 0.04, a + 0.04, DOCK.gate - 0.04, DOCK.gate + 0.04),
      gy - 0.3,
      gy + DOCK.top + 0.05,
    )

  // piedmont ave, from the stair to the east corner
  {
    const at = (c: number, d = 0) => S(SE + d, c)
    const o = sa
    // along it from the stair
    const from = STAIR.b[1]
    const holes: Hole[] = [
      [STORE.b[0] + 0.2 - from, STORE.b[1] - 0.2 - from, 0.35, STORE.top],
      ...DOORS.map(([b0, b1]): Hole => [b0 - from, b1 - from, -1, 2.9]),
      [GATE.b[0] - from, GATE.b[1] - from, -1, under],
    ]
    for (const [u0, u1, v0, v1] of solidPieces(NE - from, -0.6, under, holes))
      add('concrete', wallQuad(at(from + u0), at(from + u1), v0, v1, o, from + u0))
    // the storefront: white mullions, in bays between concrete piers
    const piers = [5.8, 12.1, 18.4, 24.7, 31, 37]
    for (let i = 0; i < piers.length - 1; i++) {
      const [c0, c1] = [piers[i]! + 0.2, piers[i + 1]! - 0.2]
      add('glass', glassQuad(at(c0), at(c1), 0.35, STORE.top, o))
      if (i)
        box(
          'concrete',
          [
            at(piers[i]! - 0.2),
            at(piers[i]! + 0.2),
            at(piers[i]! + 0.2, -0.25),
            at(piers[i]! - 0.2, -0.25),
          ],
          -0.6,
          under,
        )
      // the awning over it, sloping out
      const [y0, y1] = [2.55, 2.95]
      const pts = [at(c0, 0.02), at(c1, 0.02), at(c1, 0.85), at(c0, 0.85)]
      const top = [
        new THREE.Vector3(pts[0]!.x, y1, pts[0]!.z),
        new THREE.Vector3(pts[1]!.x, y1, pts[1]!.z),
        new THREE.Vector3(pts[2]!.x, y0, pts[2]!.z),
        new THREE.Vector3(pts[3]!.x, y0, pts[3]!.z),
      ]
      const slope = new THREE.Vector3(o.x * 0.4, 0.83, o.z * 0.4).normalize()
      add('green', quad(top, slope))
      add('green', quad(top.slice().reverse(), slope.clone().negate()))
      add('green', wallQuad(pts[3]!, pts[2]!, y0 - 0.25, y0, o))
    }
    // the car doors: slatted, the red and white bar over them is left out
    for (const [b0, b1] of DOORS)
      add('steel', slats(wallQuad(at(b0, -0.3), at(b1, -0.3), -0.5, 2.9, o)))
    // the open bay's gate
    add('mesh', wallQuad(at(GATE.b[0]), at(GATE.b[1]), 0, GATE.top, o))
    add('mesh', wallQuad(at(GATE.b[1]), at(GATE.b[0]), 0, GATE.top, neg(o)))
  }

  // the stair at the south corner: corner columns, a slab at each level, the glass lobby on
  // the ground floor, green mesh screens over it on the two street sides, flights inside
  {
    const [a0, a1] = STAIR.a
    const [b0, b1] = STAIR.b
    const c = 0.25
    for (const [a, bb] of [
      [a0, b0],
      [a1, b0],
      [a1, b1],
      [a0, b1],
    ] as const)
      box('concrete', rect(a - c, a + c, bb - c, bb + c), -0.6, STAIR.top)
    for (const y of [...LEVELS, STAIR.top]) {
      const t = y === STAIR.top ? 0.4 : EDGE
      box('concrete', rect(a0 - c, a1 + c, b0 - c, b1 + c), y - t, y)
    }
    const sw = neg(si)
    // the lobby's glass, the doors on piedmont ave
    const lobby: [Point, Point, Point][] = [
      [S(a0 + c, b0), S(a1 - c, b0), sw],
      [S(a1, b0 + c), S(a1, b1 - c), sa],
    ]
    const doorAt = ab(door)[1]
    for (const [p, q, o] of lobby) {
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      const hole: Hole[] =
        o === sa
          ? [
              [
                doorAt - (b0 + c) - DOOR_WIDTH / 2,
                doorAt - (b0 + c) + DOOR_WIDTH / 2,
                0,
                DOOR_HEIGHT,
              ],
            ]
          : []
      const dd = dirOf(p, q)
      const P = (u: number) => ({ x: p.x + dd.x * u, z: p.z + dd.z * u })
      add('concrete', wallQuad(p, q, -0.6, 0.35, o))
      for (const [u0, u1, v0, v1] of solidPieces(len, 0.35, LEVELS[0]! - EDGE, hole))
        add('glass', glassQuad(P(u0), P(u1), v0, v1, o))
      // the screens over it, to the roof slab
      for (let k = 0; k < LEVELS.length; k++) {
        const y0 = LEVELS[k]!
        const y1 = (LEVELS[k + 1] ?? STAIR.top) - (k === LEVELS.length - 1 ? 0.4 : EDGE)
        add('mesh', wallQuad(p, q, y0, y1, o))
        add('mesh', wallQuad(q, p, y0, y1, neg(o)))
      }
    }
    // the flights: up along a from the deck side, a landing, back
    const fl = (y0: number, y1: number, from: number, to: number, bb: number) => {
      const w = 1.2
      const pts = [
        new THREE.Vector3(S(from, bb).x, y0, S(from, bb).z),
        new THREE.Vector3(S(to, bb).x, y1, S(to, bb).z),
        new THREE.Vector3(S(to, bb + w).x, y1, S(to, bb + w).z),
        new THREE.Vector3(S(from, bb + w).x, y0, S(from, bb + w).z),
      ]
      const rise = (y1 - y0) / Math.abs(to - from)
      const n = new THREE.Vector3(
        -sa.x * rise * Math.sign(to - from),
        1,
        -sa.z * rise * Math.sign(to - from),
      ).normalize()
      add('concrete', quad(pts, n))
      add('concrete', quad(pts.slice().reverse(), n.clone().negate()))
    }
    const steps = [0, ...LEVELS]
    for (let k = 0; k < steps.length - 1; k++) {
      const [y0, y1] = [steps[k]!, steps[k + 1]!]
      const half = (y0 + y1) / 2
      fl(y0, half, a0 + 1.4, a1 - 1.4, b0 + 0.6)
      fl(half, y1, a1 - 1.4, a0 + 1.4, b0 + 2)
      box('concrete', rect(a1 - 1.4, a1 - 0.3, b0 + 0.3, b0 + 3.3), half - 0.2, half)
    }
  }

  // the elevator tower in the notch, from over the deck's roof to its top (lower down it's
  // inside the deck)
  {
    const c = [
      { x: x1, z: outline[7]!.z },
      { x: x1, z: z1 },
      { x: x0, z: z1 },
      { x: x0, z: outline[10]!.z },
    ]
    const m = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 }
    for (let i = 0; i < 3; i++)
      add('concrete', wallQuad(c[i]!, c[i + 1]!, 0, ELEVATOR.top, away(c[i]!, c[i + 1]!, m)))
    lid(
      'concrete',
      [
        { x: x0, z: z0 },
        { x: x1, z: z0 },
        { x: x1, z: z1 },
        { x: x0, z: z1 },
      ],
      ELEVATOR.top,
    )
  }

  // inside the ground floor: see through all round (it's open), along the lofts 5cm in off
  // their wall so the two don't fight
  insideWalls(inside, outline, door, () => true)
  for (const geo of inside.glass) {
    const pos = geo.getAttribute('position')
    const [p, q] = [
      { x: pos.getX(0), z: pos.getZ(0) },
      { x: pos.getX(1), z: pos.getZ(1) },
    ]
    const along = SHARED.some((i) => {
      const [e0, e1] = [outline[i]!, outline[(i + 1) % outline.length]!]
      const d = dirOf(e0, e1)
      const off = (r: Point) => Math.abs((r.x - e0.x) * d.z - (r.z - e0.z) * d.x)
      return off(p) < 0.01 && off(q) < 0.01
    })
    if (!along) continue
    const n = geo.getAttribute('normal')
    geo.translate(n.getX(0) * 0.05, 0, n.getZ(0) * 0.05)
  }

  return {
    parts: merged(),
    inside,
    signs,
    noShadow: ['steel', 'glass'],
  }
}

// a flat quad of 4 corners facing n, uvs in meters across it
function quad(pts: THREE.Vector3[], n: THREE.Vector3) {
  const side = new THREE.Vector3(0, 1, 0).cross(n)
  if (side.lengthSq() < 0.01) side.set(1, 0, 0)
  side.normalize()
  const up = new THREE.Vector3().crossVectors(n, side)
  let tri = [0, 1, 2, 0, 2, 3]
  const c = new THREE.Vector3()
    .subVectors(pts[1]!, pts[0]!)
    .cross(new THREE.Vector3().subVectors(pts[2]!, pts[0]!))
  if (c.dot(n) < 0) tri = [0, 2, 1, 0, 3, 2]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      tri.flatMap((i) => pts[i]!.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      tri.flatMap(() => n.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      tri.flatMap((i) => [pts[i]!.dot(side), pts[i]!.dot(up) + 1000]),
      2,
    ),
  )
  return geo
}
