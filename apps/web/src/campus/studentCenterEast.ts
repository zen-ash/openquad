import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  clip,
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

// student center east (1998), from gsu's own photos of the plaza and the lobby (2023-2026),
// mapillary on gilmer st and piedmont ave (2019) and gsu's floor plans. split face block in
// tan and white bands about a meter tall, three floors, a low curved wing on unity plaza
// with an arcade under it, and the glass lobby next to that. the side toward urban life,
// most of piedmont ave and the roof are only seen from the satellite, they're made to
// match the rest. sources: docs/reference/student-center-east.md

export type StudentCenterData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { corners: number[][]; lobby: number[][] }
}

export type Part =
  | 'white'
  | 'tan'
  | 'deepWhite'
  | 'deepTan'
  | 'curtain'
  | 'storefront'
  | 'frame'
  | 'coping'
  | 'soffit'
  | 'roof'
  | 'metal'
  | 'paving'
  | 'blue'

// the block is laid in bands of 5 courses of 8 inch block, white ones on even numbers
// counting up from the plaza. the three floors are 14 of them, the wing on the plaza 7.
// counted in the photos: the east corner shows 15 (the street's lower there, the bottom
// one is cut off), the wing 7 with a white one at the bottom and the top
export const BAND = 1.02
export const BANDS = 14
export const WING = 7 * BAND
// the lobby: doors and glass over them up to a white beam, dark glass above that. its roof
// is 5 bands up (gsu's 2024 photo of the plaza)
export const LOBBY = 5 * BAND
const BEAM = 3.6
// the row of windows along the top floor is in the 4th band from the top
const TOP_ROW = 10
// the ballroom in the middle of the piedmont ave side is lower, the three floors go round
// it in a u (satellite, and the 3rd floor plan). meters along piedmont from the east
// corner, and how far in it goes
export const BALLROOM: [number, number, number] = [18, 41.5, 38]
const BALLROOM_TOP = 10 * BAND
// the curved glass wall on gilmer st, meters from the north corner. two floors, set back
// under the wall above at its ends
export const CURTAIN: [number, number] = [16.4, 44.5]
const CURTAIN_TOP = 8 * BAND
// the glass entrance tucked in under the corner on piedmont ave, meters from the corner
const ENTRY: [number, number] = [3.5, 12]
// the arcade under the wing, meters along the curve from the lobby to the tip (it's 31.7m).
// measured in gsu's 2024 photo of the plaza, the second one is behind a tree there
const ARCADE: [number, number][] = [
  [2.2, 8.1],
  [12.5, 20.5],
  [22.6, 27.5],
  [29.5, 31.3],
]
const ARCADE_TOP = 3 * BAND
const ARCADE_DEPTH = 3
// in the back walls, [kind, meters along the curve, width]. the first bay is from gsu's
// photos (glass doors by the lobby, brown doors at the other end), the rest are unverified
const ARCADE_DOORS: ['glass' | 'steel' | 'window', number, number][] = [
  ['glass', 3.7, 2],
  ['steel', 6.9, 1.8],
  ['steel', 14.3, 1.8],
  ['window', 16.9, 2.4],
  ['glass', 19.1, 2],
  ['glass', 24.3, 2],
  ['window', 26.4, 1.6],
  ['steel', 30.4, 1],
]
// the sign along the top toward courtland st, from 22m to a bit past the tip, the welcome
// banner over the first bay and the blue banners on the piers
const FASCIA: [number, number] = [21.9, 32.4]
const WELCOME: [number, number] = [2.6, 8]
const BANNERS = [0.3, 9.9, 21.5, 31]

type Opening = {
  hole: Hole
  glass?: Part
  depth?: number
  // a wall at the back of the hole instead of glass
  back?: boolean
  // the underside of the top of the hole
  top?: Part
  // just a hole, what's in it is drawn separately
  open?: boolean
}

const band = (y: number): Part => (Math.floor(y / BAND + 1e-4) % 2 ? 'tan' : 'white')
// the same block inside the arcade and deep recesses. the renderer's ambient occlusion only
// reaches a meter or so, in photos those are much darker than the wall outside
const deep = (part: Part): Part => (part === 'white' ? 'deepWhite' : 'deepTan')

// y0-y1 cut up into bands
function bandsIn(y0: number, y1: number) {
  const out: [number, number, Part][] = []
  for (let k = Math.floor(y0 / BAND + 1e-4); k * BAND < y1 - 1e-4; k++)
    out.push([Math.max(y0, k * BAND), Math.min(y1, (k + 1) * BAND), band(k * BAND)])
  return out
}

// n evenly spaced points between u0 and u1, about `spacing` apart
function row(u0: number, u1: number, spacing: number) {
  const n = Math.max(1, Math.floor((u1 - u0) / spacing))
  return Array.from({ length: n }, (_, i) => u0 + (u1 - u0) * ((i + 0.5) / n))
}

const lerp = (p: Point, q: Point, t: number) => ({
  x: p.x + (q.x - p.x) * t,
  z: p.z + (q.z - p.z) * t,
})
const same = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.z - q.z) < 0.05
const flip = (o: Point) => ({ x: -o.x, z: -o.z })

function inPolygon(p: Point, poly: Point[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const c = poly[j]!
    if (a.z > p.z !== c.z > p.z && p.x < ((c.x - a.x) * (p.z - a.z)) / (c.z - a.z) + a.x)
      inside = !inside
  }
  return inside
}

/**
 * The building's outline without the lobby: the lobby's own walls swapped for the ones it
 * shares with the rest of the building (osm had it as its own way)
 */
export function withoutLobby(outline: Point[], lobby: Point[]) {
  const onOutline = (p: Point) => outline.some((q) => same(p, q))
  const own = outline.map((p) => lobby.some((q) => same(p, q)))
  const k = outline.length
  const first = own.findIndex((o, i) => o && !own[(i + k - 1) % k])
  const last = own.findIndex((o, i) => o && !own[(i + 1) % k])
  // from the first of them, walk round the lobby the way that isn't the outside
  const n = lobby.length
  const start = lobby.findIndex((p) => same(p, outline[first]!))
  const step = onOutline(lobby[(start + 1) % n]!) ? -1 : 1
  const shared: Point[] = []
  for (let j = (start + step + n) % n; !onOutline(lobby[j]!); j = (j + step + n) % n)
    shared.push(lobby[j]!)
  const after = last > first ? outline.slice(last) : []
  return [...outline.slice(0, first + 1), ...shared, ...after]
}

export function studentCenterEastGeometry(b: StudentCenterData) {
  const { add, prism, inside, merged } = collect<Part>()
  const H = b.height
  const outline = b.points.map(pt)
  const [N, E, S, W] = b.landmark!.corners.map(pt) as [Point, Point, Point, Point]
  const lobby = b.landmark!.lobby.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const signs: Sign[] = []

  // the four walls of the three floor block. "a" is meters along each, "d" meters out
  const gilmer = frame(N, E)
  const piedmont = frame(E, S)
  const back = frame(S, W)
  const plaza = frame(W, N)

  // a flat box from a quad
  const box = (part: Part, c: Point[], y0: number, y1: number) => prism(part, c, y0, y1)
  // a thin cap along the top of a wall, sticking out a little
  const cap = (part: Part, p: Point, q: Point, o: Point, y: number) => {
    const off = (x: Point, d: number) => ({ x: x.x + o.x * d, z: x.z + o.z * d })
    box(part, [off(p, 0.06), off(q, 0.06), off(q, -0.3), off(p, -0.3)], y, y + 0.12)
  }

  /** a block wall from p to q facing o, in bands, with openings `depth` deep */
  const blockWall = (
    p: Point,
    q: Point,
    y0: number,
    y1: number,
    o: Point,
    openings: Opening[] = [],
    u0 = 0,
  ) => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
    const at = (u: number, d = 0) => ({
      x: p.x + dir.x * u - o.x * d,
      z: p.z + dir.z * u - o.z * d,
    })
    const holes = openings.map((w) => w.hole)
    for (const [a0, a1, v0, v1] of solidPieces(len, y0, y1, holes))
      for (const [c0, c1, part] of bandsIn(v0, v1))
        add(part, wallQuad(at(a0), at(a1), c0, c1, o, u0 + a0))

    for (const { hole, glass, depth = 0.18, back: wall, top, open } of openings) {
      if (open) continue
      const [a0, a1, v0, v1] = hole
      const inner = (part: Part) => (depth > 1 ? deep(part) : part)
      for (const [c0, c1, part] of bandsIn(v0, v1)) {
        add(inner(part), wallQuad(at(a0), at(a0, depth), c0, c1, dir))
        add(inner(part), wallQuad(at(a1), at(a1, depth), c0, c1, flip(dir)))
        if (wall) add(inner(part), wallQuad(at(a0, depth), at(a1, depth), c0, c1, o, u0 + a0))
      }
      const rim = [at(a0), at(a1), at(a1, depth), at(a0, depth)]
      if (v0 > 0.01) add(band(v0 - 0.01), flat(rim, v0))
      add(top ?? band(v1), flat(rim, v1, false))
      if (glass) add(glass, glassQuad(at(a0, depth), at(a1, depth), v0, v1, o))
    }
  }

  // small windows filling most of white band k, w wide
  const windows = (us: number[], k: number, w = 1): Opening[] =>
    us.map((u) => ({
      hole: [u - w / 2, u + w / 2, k * BAND + 0.08, (k + 1) * BAND - 0.06],
      glass: 'curtain',
    }))
  // the top floor has a row of them all the way round
  const topRow = (u0: number, u1: number) => windows(row(u0, u1, 3.6), TOP_ROW)

  // gilmer st: windows by the north end, the curved glass wall, the block with the stair
  // windows, and the corner cut away under the second floor
  const gl = gilmer.len
  const notch: [number, number] = [gl - 4.5, gl - 0.3]
  // the two columns of stair windows, lined up in both 2019 photos of this end
  const stairs = [gl - 11.7, gl - 8.8]
  blockWall(N, E, 0, H, gilmer.out, [
    ...windows([4, 8, 12], 2),
    ...topRow(1, gl - 1),
    ...windows(stairs, 2, 0.8),
    ...windows(stairs, 4, 0.8),
    ...windows(stairs, 6, 0.8),
    { hole: [CURTAIN[0], CURTAIN[1], 0, CURTAIN_TOP], open: true },
    { hole: [notch[0], notch[1], 0, CURTAIN_TOP], back: true, depth: 1.4, top: 'soffit' },
  ])
  curtainWall()

  function curtainWall() {
    // the glass bows out toward the middle
    const [a0, a1] = CURTAIN
    const n = 20
    const pts = Array.from({ length: n + 1 }, (_, i) =>
      gilmer.at(a0 + ((a1 - a0) * i) / n, -(1.8 - 1.6 * Math.sin((Math.PI * i) / n))),
    )
    for (let i = 0; i < n; i++) {
      const [p, q] = [pts[i]!, pts[i + 1]!]
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      const o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      add('curtain', glassQuad(p, q, 0.35, CURTAIN_TOP, o))
      add('white', wallQuad(p, q, 0, 0.35, o))
    }
    // the ends of the recess, the ceiling over it and the ground in it
    const [e0, e1] = [gilmer.at(a0), gilmer.at(a1)]
    for (const [y0, y1, part] of bandsIn(0, CURTAIN_TOP)) {
      add(part, wallQuad(e0, pts[0]!, y0, y1, gilmer.along))
      add(part, wallQuad(pts[n]!, e1, y0, y1, flip(gilmer.along)))
    }
    const under = [e0, e1, ...pts.slice().reverse()]
    add('soffit', flat(under, CURTAIN_TOP, false))
    add('paving', flat(under, 0.08))
  }

  // piedmont ave: the corner with the glass entrance tucked in under it, the ballroom (lower)
  // and the south corner with a service door
  const pl = piedmont.len
  const [b0, b1, bd] = BALLROOM
  blockWall(E, piedmont.at(b0), 0, H, piedmont.out, [
    { hole: [ENTRY[0], ENTRY[1], 0, CURTAIN_TOP], glass: 'curtain', depth: 2.6, top: 'soffit' },
    ...windows([3.9, 11], TOP_ROW),
  ])
  blockWall(piedmont.at(b0), piedmont.at(b1), 0, BALLROOM_TOP, piedmont.out, [], b0)
  const sl = pl - b1
  blockWall(
    piedmont.at(b1),
    S,
    0,
    H,
    piedmont.out,
    [
      ...topRow(1, sl - 1),
      { hole: [sl - 3.4, sl - 0.5, 0, 2 * BAND], back: true, depth: 1.2, top: 'soffit' },
    ],
    b1,
  )
  const serviceDoor = [piedmont.at(pl - 2.9, -1.15), piedmont.at(pl - 1, -1.15)] as const
  add('coping', wallQuad(serviceDoor[0], serviceDoor[1], 0, 2.3, piedmont.out))

  // the three floors round the ballroom's roof, facing it
  const c = [piedmont.at(b0), piedmont.at(b0, -bd), piedmont.at(b1, -bd), piedmont.at(b1)] as const
  const toE = flip(piedmont.along)
  blockWall(c[0], c[1], BALLROOM_TOP, H, piedmont.along, windows(row(3, bd - 3, 4.5), TOP_ROW))
  blockWall(c[1], c[2], BALLROOM_TOP, H, piedmont.out, windows(row(2, b1 - b0 - 2, 4.5), TOP_ROW))
  blockWall(c[2], c[3], BALLROOM_TOP, H, toE, windows(row(3, bd - 3, 4.5), TOP_ROW))

  // the back, toward urban life: the loading dock (it's raised) and a door
  const docks: [number, number][] = [
    [7, 10.5],
    [12, 15.5],
  ]
  blockWall(S, W, 0, H, back.out, [
    ...topRow(1, back.len - 1),
    ...docks.map(([u0, u1]): Opening => ({ hole: [u0, u1, 1.2, 4.2], depth: 0.3 })),
    { hole: [22, 23.8, 0, 2.4], depth: 0.15 },
  ])
  for (const [u0, u1] of docks)
    add('metal', wallQuad(back.at(u0, -0.3), back.at(u1, -0.3), 1.2, 4.2, back.out, u0))
  add('coping', wallQuad(back.at(22, -0.15), back.at(23.8, -0.15), 0, 2.4, back.out))
  box('white', [back.at(5, 0.03), back.at(17.5, 0.03), back.at(17.5, 2.6), back.at(5, 2.6)], 0, 1.2)

  // the plaza side above the wing. the bit by the west corner comes down to the ground
  const pw = plaza.len
  const westEnd = Math.max(
    ...outline
      .filter((p) => Math.abs(plaza.dOf(p)) < 0.3 && plaza.aOf(p) < pw / 2)
      .map((p) => plaza.aOf(p)),
  )
  blockWall(W, plaza.at(westEnd), 0, H, plaza.out, windows(row(1, westEnd - 1, 3.6), TOP_ROW))
  blockWall(plaza.at(westEnd), N, WING, H, plaza.out, topRow(1, pw - westEnd - 1), westEnd)

  // copings and roofs
  cap('coping', N, E, gilmer.out, H)
  cap('coping', E, c[0], piedmont.out, H)
  cap('coping', c[0], c[3], piedmont.out, BALLROOM_TOP)
  cap('coping', c[3], S, piedmont.out, H)
  cap('coping', S, W, back.out, H)
  cap('coping', W, N, plaza.out, H)
  cap('coping', c[0], c[1], piedmont.along, H)
  cap('coping', c[1], c[2], piedmont.out, H)
  cap('coping', c[2], c[3], toE, H)
  const main = [N, E, S, W]
  const a = (p: Point) => piedmont.aOf(p)
  const middle = clip(
    clip(main, (p) => a(p) - b0),
    (p) => b1 - a(p),
  )
  for (const r of [
    clip(main, (p) => b0 - a(p)),
    clip(main, (p) => a(p) - b1),
    clip(middle, (p) => -bd - piedmont.dOf(p)),
  ])
    add('roof', flat(r, H - 0.02))
  add(
    'roof',
    flat(
      clip(middle, (p) => piedmont.dOf(p) + bd),
      BALLROOM_TOP - 0.02,
    ),
  )
  // rooftop units where the satellite has them, [a, d, width, depth, height] off piedmont
  const unit = ([ua, ud, w, d, h]: readonly number[], y: number) =>
    box(
      'metal',
      [
        piedmont.at(ua! - w! / 2, ud! - d! / 2),
        piedmont.at(ua! + w! / 2, ud! - d! / 2),
        piedmont.at(ua! + w! / 2, ud! + d! / 2),
        piedmont.at(ua! - w! / 2, ud! + d! / 2),
      ],
      y,
      y + h!,
    )
  for (const u of [
    [14.6, -8.6, 3, 3, 1.8],
    [15.3, -3.6, 2.6, 2.6, 1.4],
    [8, -26.5, 1.2, 1.2, 1],
    [2.9, -51, 1.5, 1, 1],
    [45.9, -48.7, 1, 1, 0.8],
    [41.5, -49, 0.8, 0.8, 0.8],
  ])
    unit(u, H)
  for (const u of [
    [24, -35.5, 2.5, 2.5, 1.4],
    [36.2, -28.1, 3.5, 2.5, 1.4],
    [32.3, -16.3, 2, 2, 1.2],
  ])
    unit(u, BALLROOM_TOP)

  // the name plate by the notch on gilmer st
  const plate = gilmer.at(notch[0] - 1.3, 0.03)
  signs.push({
    x: plate.x,
    y: 2.75,
    z: plate.z,
    rot: Math.atan2(gilmer.out.x, gilmer.out.z),
    text: 'STUDENT CENTER EAST',
    scale: 0.4,
  })

  wingAndLobby()

  function wingAndLobby() {
    // the wing is everything on the plaza side of the three floors, minus the lobby
    const wing = clip(withoutLobby(outline, lobby), (p) => plaza.dOf(p) - 0.15)
    const onLobby = (p: Point) =>
      edges(lobby).some(({ p: l, dir, len, out }) => {
        const t = (p.x - l.x) * dir.x + (p.z - l.z) * dir.z
        return (
          t > -0.05 && t < len + 0.05 && Math.abs((p.x - l.x) * out.x + (p.z - l.z) * out.z) < 0.05
        )
      })
    const onCut = (p: Point) => Math.abs(plaza.dOf(p) - 0.15) < 0.05

    // the curve, from the lobby to the tip of the wing (the corner furthest out)
    const tip = wing.reduce((best, p, i) => (plaza.dOf(p) > plaza.dOf(wing[best]!) ? i : best), 0)
    const n = wing.length
    const next = (i: number, s: number) => (i + s + n) % n
    const gap = (i: number, s: number) =>
      Math.hypot(wing[next(i, s)]!.x - wing[i]!.x, wing[next(i, s)]!.z - wing[i]!.z)
    const way = gap(tip, 1) < gap(tip, -1) ? 1 : -1
    const curve = [wing[tip]!]
    for (let i = next(tip, way); ; i = next(i, way)) {
      curve.push(wing[i]!)
      if (onLobby(wing[i]!)) break
    }
    curve.reverse()
    const lengths = [0]
    for (let i = 1; i < curve.length; i++)
      lengths.push(
        lengths[i - 1]! + Math.hypot(curve[i]!.x - curve[i - 1]!.x, curve[i]!.z - curve[i - 1]!.z),
      )
    // which piece of the curve s is on, and which way is out there
    const segAt = (s: number) => {
      let i = 0
      while (i < curve.length - 2 && lengths[i + 1]! < s) i++
      return i
    }
    const outs = curve.slice(0, -1).map((p, i) => {
      const q = curve[i + 1]!
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      const o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      const mid = lerp(p, q, 0.5)
      return inPolygon({ x: mid.x + o.x * 0.3, z: mid.z + o.z * 0.3 }, wing) ? flip(o) : o
    })
    const outAt = (s: number) => outs[segAt(s)]!
    // a point on the curve s meters from the lobby, d meters out
    const curveAt = (s: number, d = 0) => {
      const i = segAt(s)
      const p = lerp(curve[i]!, curve[i + 1]!, (s - lengths[i]!) / (lengths[i + 1]! - lengths[i]!))
      const o = outs[i]!
      return { x: p.x + o.x * d, z: p.z + o.z * d }
    }
    // d meters out square to the curve, even at its corners
    const offsetAt = (s: number, d: number) => {
      const i = lengths.findIndex((l) => Math.abs(l - s) < 0.02)
      if (i <= 0 || i >= curve.length - 1) return curveAt(s, d)
      const [o0, o1] = [outs[i - 1]!, outs[i]!]
      const l = Math.hypot(o0.x + o1.x, o0.z + o1.z)
      const k = d / ((o0.x * (o0.x + o1.x) + o0.z * (o0.z + o1.z)) / l)
      return { x: curve[i]!.x + ((o0.x + o1.x) / l) * k, z: curve[i]!.z + ((o0.z + o1.z) / l) * k }
    }

    // the front of the curve, open under the arcade
    for (let i = 0; i < curve.length - 1; i++) {
      const [s0, s1] = [lengths[i]!, lengths[i + 1]!]
      const holes: Hole[] = ARCADE.filter(([h0, h1]) => h1 > s0 && h0 < s1).map(([h0, h1]) => [
        Math.max(h0, s0) - s0,
        Math.min(h1, s1) - s0,
        0,
        ARCADE_TOP,
      ])
      const [p, q] = [curve[i]!, curve[i + 1]!]
      for (const [u0, u1, v0, v1] of solidPieces(s1 - s0, 0, WING, holes))
        for (const [y0, y1, part] of bandsIn(v0, v1))
          add(
            part,
            wallQuad(
              lerp(p, q, u0 / (s1 - s0)),
              lerp(p, q, u1 / (s1 - s0)),
              y0,
              y1,
              outs[i]!,
              s0 + u0,
            ),
          )
    }
    for (const [s0, s1] of ARCADE) arcade(s0, s1)

    function arcade(s0: number, s1: number) {
      const ss = [s0, ...lengths.filter((l) => l > s0 + 0.05 && l < s1 - 0.05), s1]
      const front = ss.map((s) => curveAt(s))
      const rear = ss.map((s) => offsetAt(s, -ARCADE_DEPTH))
      for (let i = 0; i < ss.length - 1; i++) {
        const o = outAt((ss[i]! + ss[i + 1]!) / 2)
        for (const [y0, y1, part] of bandsIn(0, ARCADE_TOP))
          add(deep(part), wallQuad(rear[i]!, rear[i + 1]!, y0, y1, o, ss[i]!))
        const cell = [front[i]!, front[i + 1]!, rear[i + 1]!, rear[i]!]
        add('soffit', flat(cell, ARCADE_TOP, false))
        add('paving', flat(cell, 0.08))
      }
      // the piers either side, facing into the arcade
      const e = ss.length - 1
      const toward = (x: Point, y: Point) => {
        const l = Math.hypot(y.x - x.x, y.z - x.z)
        return { x: (y.x - x.x) / l, z: (y.z - x.z) / l }
      }
      for (const [y0, y1, part] of bandsIn(0, ARCADE_TOP)) {
        add(deep(part), wallQuad(front[0]!, rear[0]!, y0, y1, toward(front[0]!, curveAt(s0 + 0.2))))
        add(deep(part), wallQuad(front[e]!, rear[e]!, y0, y1, toward(front[e]!, curveAt(s1 - 0.2))))
      }
    }

    // what's in the back walls of the arcade: glass doors in white frames, brown steel
    // doors and a window, where the photos show them
    const inWall = (s: number, d = 0) => offsetAt(s, -ARCADE_DEPTH + d)
    const jamb = (part: Part, s: number, w: number, y0: number, y1: number) =>
      box(
        part,
        [inWall(s - w / 2), inWall(s + w / 2), inWall(s + w / 2, 0.1), inWall(s - w / 2, 0.1)],
        y0,
        y1,
      )
    for (const [kind, s, w] of ARCADE_DOORS) {
      const o = outAt(s)
      const [a, c] = [s - w / 2, s + w / 2]
      if (kind === 'steel') {
        add('coping', wallQuad(inWall(a, 0.04), inWall(s - 0.01, 0.04), 0, 2.3, o))
        add('coping', wallQuad(inWall(s + 0.01, 0.04), inWall(c, 0.04), 0, 2.3, o))
        for (const u of [a - 0.04, c + 0.04]) jamb('coping', u, 0.08, 0, 2.38)
        box(
          'coping',
          [inWall(a - 0.08), inWall(c + 0.08), inWall(c + 0.08, 0.1), inWall(a - 0.08, 0.1)],
          2.3,
          2.38,
        )
      } else {
        const y0 = kind === 'glass' ? 0 : 0.6
        add('curtain', glassQuad(inWall(a, 0.03), inWall(c, 0.03), y0, 2.4, o))
        add('curtain', glassQuad(inWall(a, 0.03), inWall(c, 0.03), 2.52, 2.95, o))
        for (const u of kind === 'glass' ? [a, s, c] : [a, c]) jamb('frame', u, 0.1, y0, 2.95)
        for (const y of [2.4, 2.95]) jamb('frame', s, w + 0.1, y, y + 0.12)
        if (y0 > 0) jamb('frame', s, w + 0.1, y0 - 0.1, y0)
      }
    }

    // the sign band along the top toward courtland st: gsu's name, a blue square where the
    // logo is (it's a trademark) and the building's name under it
    const [f0, f1] = FASCIA
    const fs = [f0, ...lengths.filter((l) => l > f0 && l < f1), f1]
    for (let i = 0; i < fs.length - 1; i++) {
      const [s0, s1] = [fs[i]!, fs[i + 1]!]
      box(
        'frame',
        [curveAt(s0), curveAt(s1), curveAt(s1, 0.3), curveAt(s0, 0.3)],
        5.95,
        WING - 0.02,
      )
    }
    const facing = (s: number) => Math.atan2(outAt(s).x, outAt(s).z)
    const word = (text: string, s: number, y: number, size: number, color: string, d = 0.32) => {
      const p = curveAt(s, d)
      signs.push({
        x: p.x,
        y,
        z: p.z,
        rot: facing(s),
        text,
        letters: true,
        size,
        color,
        weight: 700,
      })
    }
    const logo = f0 + 0.7
    const side = (s: number) => ({ x: -outAt(s).z, z: outAt(s).x })
    const at = (s: number, k: number, d: number) => {
      const p = curveAt(s, d)
      return { x: p.x + side(s).x * k, z: p.z + side(s).z * k }
    }
    box(
      'blue',
      [at(logo, -0.45, 0.3), at(logo, 0.45, 0.3), at(logo, 0.45, 0.33), at(logo, -0.45, 0.33)],
      6.02,
      6.9,
    )
    // letter colors from gsu's 2024 photo: dark grey on the sign, near black bronze under it
    word('GEORGIA', f0 + 2.8, 6.5, 0.58, '#44464a')
    word('STATE', f0 + 5.5, 6.5, 0.58, '#44464a')
    word('UNIVERSITY', f0 + 8.7, 6.5, 0.58, '#44464a')
    word('STUDENT CENTER\nEAST', f0 + 5.3, 5.35, 0.36, '#34302c', 0.03)

    // gsu's welcome banner on the wall over the first bay (a vinyl sign, it was up in 2023
    // and 2024). the panther on it is a trademark, so it's just the words
    const [w0, w1] = WELCOME
    const ws = [w0, ...lengths.filter((l) => l > w0 && l < w1), w1]
    for (let i = 0; i < ws.length - 1; i++) {
      const [s0, s1] = [ws[i]!, ws[i + 1]!]
      add(
        'blue',
        wallQuad(curveAt(s0, 0.03), curveAt(s1, 0.03), 3.5, 5.85, outAt((s0 + s1) / 2), s0),
      )
    }
    word('WELCOME\nPANTHERS', (w0 + w1) / 2 + 0.7, 4.7, 0.8, '#f4f4f2', 0.05)

    // blue banners on brackets down the piers
    for (const s of BANNERS) {
      box(
        'blue',
        [at(s, -0.28, 0.4), at(s, 0.28, 0.4), at(s, 0.28, 0.42), at(s, -0.28, 0.42)],
        3.5,
        5.7,
      )
      for (const y of [3.45, 5.7])
        box(
          'metal',
          [at(s, -0.03, 0), at(s, 0.03, 0), at(s, 0.03, 0.55), at(s, -0.03, 0.55)],
          y,
          y + 0.05,
        )
    }

    // the wing's other walls: the straight side toward the bookstore (the arcade comes round
    // the tip onto it a little way), the bit toward urban life and the step up from the lobby
    const theTip = curve.at(-1)!
    const onCurve = (x: Point) => curve.some((k) => same(k, x))
    for (const { p, q, len, out } of edges(wing)) {
      if (len < 0.05 || (onCut(p) && onCut(q))) continue
      if (onCurve(p) && onCurve(q)) continue
      if (onLobby(p) && onLobby(q)) {
        blockWall(p, q, LOBBY - 0.2, WING, out)
        continue
      }
      if (same(p, theTip) || same(q, theTip)) {
        const u = (k: number) => (same(p, theTip) ? k : len - k)
        const [h0, h1] = [u(0.4), u(6)].sort((m, k) => m - k) as [number, number]
        blockWall(p, q, 0, WING, out, [
          { hole: [h0, h1, 0, ARCADE_TOP], back: true, depth: ARCADE_DEPTH, top: 'soffit' },
        ])
      } else {
        blockWall(p, q, 0, WING, out)
      }
    }
    for (const { p, q, len, out } of edges(wing)) {
      if (len < 0.05 || (onCut(p) && onCut(q)) || (onLobby(p) && onLobby(q))) continue
      cap('coping', p, q, out, WING)
    }
    add('roof', flat(wing, WING - 0.02))
    for (const [x, z, w] of [
      [14.4, 137.5, 0.8],
      [12.9, 141.6, 1.2],
      [16.6, 148, 1.4],
    ] as const) {
      const r = w / 2
      box(
        'metal',
        [
          { x: x - r, z: z - r },
          { x: x + r, z: z - r },
          { x: x + r, z: z + r },
          { x: x - r, z: z + r },
        ],
        WING,
        WING + 0.9,
      )
    }

    // the lobby: doors and glass in white frames, a white beam, dark glass above that. the
    // side next to the wing is glass all the way up, like the bit of the wing next to it
    for (const { p, q, len, out, dir } of edges(lobby)) {
      if (!outline.some((k) => same(k, p)) || !outline.some((k) => same(k, q))) continue
      const along = (u: number, d = 0) => ({
        x: p.x + dir.x * u + out.x * d,
        z: p.z + dir.z * u + out.z * d,
      })
      const post = (u: number, w: number, y0: number, y1: number) =>
        box(
          'frame',
          [along(u - w / 2), along(u + w / 2), along(u + w / 2, 0.12), along(u - w / 2, 0.12)],
          y0,
          y1,
        )
      box('frame', [p, q, along(len, 0.08), along(0, 0.08)], 0, 0.12)
      post(0, 0.16, 0, LOBBY)
      post(len, 0.16, 0, LOBBY)
      cap('coping', p, q, out, LOBBY)
      if (same(p, curve[0]!) || same(q, curve[0]!)) {
        add('storefront', wallQuad(p, q, 0.12, LOBBY, out))
        continue
      }
      const t = door ? (door.x - p.x) * dir.x + (door.z - p.z) * dir.z : -1
      const hasDoor =
        door && t > 0 && t < len && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
      if (hasDoor) {
        const [d0, d1] = [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2]
        add('storefront', wallQuad(p, along(d0), 0.12, BEAM, out))
        add('storefront', wallQuad(along(d1), q, 0.12, BEAM, out, d1))
        add('storefront', wallQuad(along(d0), along(d1), DOOR_HEIGHT + 0.12, BEAM, out, d0))
        post(d0 - 0.03, 0.06, 0, DOOR_HEIGHT)
        post(d1 + 0.03, 0.06, 0, DOOR_HEIGHT)
        box(
          'frame',
          [along(d0 - 0.06), along(d1 + 0.06), along(d1 + 0.06, 0.12), along(d0 - 0.06, 0.12)],
          DOOR_HEIGHT,
          DOOR_HEIGHT + 0.12,
        )
        // the second pair of doors next to it (the game only opens one): stiles, a head and
        // push bars on the glass
        const [e0, e1] = [d1 + 0.25, Math.min(len - 0.2, d1 + 2.05)]
        for (const u of [e0, (e0 + e1) / 2, e1]) post(u, 0.1, 0.12, DOOR_HEIGHT)
        box(
          'frame',
          [along(e0), along(e1), along(e1, 0.1), along(e0, 0.1)],
          DOOR_HEIGHT,
          DOOR_HEIGHT + 0.1,
        )
        box('frame', [along(e0), along(e1), along(e1, 0.06), along(e0, 0.06)], 1, 1.05)
        const s = along(t, 0.02)
        const rot = Math.atan2(out.x, out.z)
        signs.push({
          x: s.x,
          y: 3.3,
          z: s.z,
          rot,
          text: 'STUDENT CENTER\nEAST',
          letters: true,
          size: 0.28,
          // white letters on the glass
          color: '#e6e6e2',
        })
      } else {
        add('storefront', wallQuad(p, q, 0.12, BEAM, out))
      }
      box(
        'frame',
        [along(-0.05), along(len + 0.05), along(len + 0.05, 0.15), along(-0.05, 0.15)],
        BEAM,
        BEAM + 0.15,
      )
      add('curtain', glassQuad(along(0, 0.02), along(len, 0.02), BEAM + 0.15, LOBBY, out))
      // the address on the gilmer st side
      if (len > 12) {
        const s = along(2.6, 0.02)
        const rot = Math.atan2(out.x, out.z)
        const white = '#f4f4f2'
        signs.push({
          x: s.x,
          y: 2.75,
          z: s.z,
          rot,
          text: '55',
          letters: true,
          size: 0.7,
          color: white,
        })
        signs.push({
          x: s.x,
          y: 2.25,
          z: s.z,
          rot,
          text: 'GILMER STREET',
          letters: true,
          size: 0.2,
          color: white,
        })
      }
    }
    add('roof', flat(lobby, LOBBY - 0.02))
  }

  insideWalls()

  // the inside of the ground floor walls, glass where the outside is glass
  function insideWalls() {
    const lobbyWalls = edges(lobby).filter(
      ({ p, q }) => outline.some((k) => same(k, p)) && outline.some((k) => same(k, q)),
    )
    const glassy = (x: Point) =>
      (Math.abs(gilmer.dOf(x)) < 0.2 && gilmer.aOf(x) > CURTAIN[0] && gilmer.aOf(x) < CURTAIN[1]) ||
      (Math.abs(piedmont.dOf(x)) < 0.2 &&
        piedmont.aOf(x) > ENTRY[0] &&
        piedmont.aOf(x) < ENTRY[1]) ||
      lobbyWalls.some(({ p, dir, len, out }) => {
        const t = (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
        return t > 0 && t < len && Math.abs((x.x - p.x) * out.x + (x.z - p.z) * out.z) < 0.05
      })
    const breaks = [
      gilmer.at(CURTAIN[0]),
      gilmer.at(CURTAIN[1]),
      piedmont.at(ENTRY[0]),
      piedmont.at(ENTRY[1]),
    ]
    for (const { p, len, dir, out } of edges(outline)) {
      const into = flip(out)
      const uOf = (x: Point) => (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
      const onLine = (x: Point) => Math.abs((x.x - p.x) * out.x + (x.z - p.z) * out.z) < 0.1
      const t = door && onLine(door) ? uOf(door) : -1
      const holes: Hole[] =
        t > 0 && t < len ? [[t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]] : []
      const cuts = [
        0,
        len,
        ...breaks
          .filter(onLine)
          .map(uOf)
          .filter((u) => u > 0 && u < len),
      ]
      cuts.sort((m, k) => m - k)
      const at = (u: number) => ({ x: p.x + dir.x * u, z: p.z + dir.z * u })
      for (let i = 1; i < cuts.length; i++) {
        const [c0, c1] = [cuts[i - 1]!, cuts[i]!]
        if (c1 - c0 < 0.01) continue
        const list = glassy(at((c0 + c1) / 2)) ? inside.glass : inside.solid
        for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, holes)) {
          const [a0, a1] = [Math.max(u0, c0), Math.min(u1, c1)]
          if (a1 - a0 > 0.001) list.push(wallQuad(at(a0), at(a1), v0, v1, into))
        }
      }
    }
  }

  return { parts: merged(), inside, signs }
}
