import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  edges,
  flat,
  glassQuad,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// the college of education & human development, 30 pryor st. a white marble office slab from
// the 1960s: a dark ground floor set back under the overhang behind marble piers, then nine
// rows of windows, four panes to a bay, between marble spandrels, a thin marble fin on every
// bay line and a plain band at the top. a blue canopy over the doors on pryor st. from
// mapillary (2019, 2022), gsu's photos (2016, 2021, 2026) and esri's satellite images.
// sources: docs/reference/college-of-education.md
//
// on a side, "u" is meters along it from its corner (pryor st and decatur st from the corner
// where they meet) and "d" meters out from the marble's face

export type CollegeOfEducationData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { corners: number[][] }
}

// few parts, each is a draw call in every pass. the window glass casts shadows: the building
// is empty inside, the sun would come through the rows of windows otherwise. grey is the soffit
export type Part = 'marble' | 'glass' | 'dark' | 'brick' | 'screen' | 'blue' | 'grey' | 'clear'

// the ground floor up to the soffit under the overhang, then nine rows of windows 3.3m apart
// and the top band. fitted on gsu's 2021 photo from the south (the fins give the scale) and on
// two mapillary photos from 2019 (docs/reference/college-of-education.md)
export const SOFFIT = 4.5
export const PITCH = 3.3
export const ROWS = Array.from({ length: 9 }, (_, k): [number, number] => [
  6.25 + k * PITCH,
  7.7 + k * PITCH,
])
// the roof behind the parapet
export const ROOF = 35.2
// how far the ground floor is set back under the overhang. build-campus.mjs moves the outline
// in by this much on the three street sides
export const RECESS = 1
// a fin on every bay line, sticking out of the marble, and the glass a bit behind it
export const FIN = 0.3
export const FIN_OUT = 0.15
const GLASS_IN = 0.1
// the square piers under the fins on the ground floor, and the corner posts that go from the
// sidewalk to the top
export const PIER = 0.32
export const POST = 0.45
const PARAPET = 0.35
// a strip of dark windows under the soffit, over the ground floor's brick and louvres
export const CLERESTORY = 3.85
// 40-42 pryor st (four floors) stands against the south side, no windows behind it
export const PARTY_ROWS = 3
// marble slabs: four to a bay (the joints are on the mullion lines), one to a spandrel
export const SLAB: [number, number] = [1.5, 1.85]

// the ground floor's wall, bay by bay from each side's corner (mapillary 2019, gsu 2024 and
// 2026): navy glazed brick, black louvres, dark glass, the lobby's glass under the canopy, the
// loading dock and the back door on kimball way
type Bay = 'brick' | 'louvres' | 'dark' | 'lobby' | 'dock' | 'back' | 'panel'
export const GROUND: Record<'decatur' | 'kimball' | 'pryor', Bay[]> = {
  decatur: ['louvres', 'brick', 'brick', 'brick', 'brick'],
  kimball: ['brick', 'brick', 'brick', 'dock', 'brick', 'back', 'panel'],
  pryor: ['louvres', 'dark', 'lobby', 'lobby', 'dark', 'dark', 'dark'],
}
// on pryor st grey slatted screens stand between the piers, out in front of the wall, in these
// bays. the one in the corner bay only covers its far end, from here
export const SCREENS = [0, 1, 4, 5, 6]
const CORNER_SCREEN = 4.4
const SCREEN_D = -0.1
// the low vents in the brick, where they are in each bay (0-1, from the side's corner)
const VENTS: Record<string, number[]> = {
  decatur: [0, 0.3, 0.7, 0.5, 0.2],
  kimball: [0.85, 0.5, 0.75, 0, 0.3],
}
// the white marble panels along the bottom at the south end of kimball way
const PANEL = 2.4
// the main doors on pryor st, meters from decatur st (build-campus.mjs puts the game's door
// there), and how wide each of the four sliding doors is
const DOOR = 17.9
const DOOR_PANEL = 1.125
// the blue canopy over the doors on pryor st: from, to, how far out past the marble and its
// fascia (fitted on mapillary's 2019 photo from park place, the far end on another one from
// pryor st). the doors are in the middle of it, where there's no pier
export const CANOPY = { from: 12.5, to: 23.3, out: 2, y: [3.55, 4.15] }
// banners on the corner and three fins of pryor st (blue, gsu's logo left out), the round
// blue sign on a bracket off the last fin but one (it's gsu's logo, plain blue here)
const BANNERS = [0, 1, 4, 5]
const BANNER = { y: [4.55, 6.75], d: [0.1, 0.7] }
const DISC = { fin: 6, y: 6.6, r: 0.65, d: 1 }
// the louvres' slats and the screens' rows
const SLAT = 0.15
export const ROW = 0.45
// the box on the roof, dark glass in a white frame: along decatur st and pryor st from their
// corner, and its top. its side toward kimball way shows over the parapet in gsu's 2021 photo,
// which puts it a bit further from pryor st than the dark patch on esri's satellite images
const PENTHOUSE = { u: [9.5, 15.9], v: [10, 31.5], top: 42.3 } as const

type Side = {
  name: 'decatur' | 'kimball' | 'south' | 'pryor'
  p: Point
  len: number
  dir: Point
  o: Point
  bays: number
  bay: number
  at: (u: number, d?: number) => Point
  uOf: (x: Point) => number
}

// osm's corners: pryor st at decatur st, decatur st at kimball way, then the two ends of the
// wall against 40-42 pryor st
export function coeSides(b: CollegeOfEducationData) {
  const [n, e, s, w] = b.landmark!.corners.map(pt) as [Point, Point, Point, Point]
  const mid = { x: (n.x + s.x) / 2, z: (n.z + s.z) / 2 }
  const side = (name: Side['name'], p: Point, q: Point, bays: number): Side => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
    let o = { x: dir.z, z: -dir.x }
    if ((p.x - mid.x) * o.x + (p.z - mid.z) * o.z < 0) o = { x: -o.x, z: -o.z }
    return {
      name,
      p,
      len,
      dir,
      o,
      bays,
      bay: len / bays,
      at: (u, d = 0) => ({ x: p.x + dir.x * u + o.x * d, z: p.z + dir.z * u + o.z * d }),
      uOf: (x) => (x.x - p.x) * dir.x + (x.z - p.z) * dir.z,
    }
  }
  return {
    corners: [n, e, s, w],
    decatur: side('decatur', n, e, 5),
    kimball: side('kimball', e, s, 7),
    south: side('south', s, w, 5),
    pryor: side('pryor', n, w, 7),
  }
}

// what stands on the sidewalk in front of the outline, for walking into (game/world.ts): the
// piers and corner posts, and the screens on pryor st
export function coeObstacles(b: CollegeOfEducationData) {
  const sides = coeSides(b)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : sides.pryor.at(DOOR, -RECESS)
  const piers = [sides.decatur, sides.kimball, sides.pryor].flatMap((s) =>
    pierLines(s, door).map((c) => ({ ...s.at(c, FIN_OUT - PIER / 2), radius: PIER / 2 })),
  )
  const [n, e, s, w] = sides.corners as [Point, Point, Point, Point]
  const posts = [
    [n, sides.decatur.o, sides.pryor.o],
    [e, sides.decatur.o, sides.kimball.o],
    [s, sides.kimball.o, sides.south.o],
    [w, sides.south.o, sides.pryor.o],
  ].map(([c, a, o]) => {
    const k = FIN_OUT - POST / 2
    return { x: c!.x + (a!.x + o!.x) * k, z: c!.z + (a!.z + o!.z) * k, radius: POST / 2 }
  })
  const walls = screens(sides.pryor).map(([u0, u1]) => {
    const [a, z] = [sides.pryor.at(u0, SCREEN_D), sides.pryor.at(u1, SCREEN_D)]
    return { ax: a.x, az: a.z, bx: z.x, bz: z.z }
  })
  return { circles: [...piers, ...posts], walls }
}

// the bay lines with a pier under the fin: all but where the doors are
function pierLines(s: Side, door: Point) {
  return Array.from({ length: s.bays - 1 }, (_, k) => (k + 1) * s.bay).filter(
    (c) => s.name !== 'pryor' || Math.abs(c - s.uOf(door)) > DOOR_WIDTH,
  )
}

// where the screens are along pryor st, between the piers
function screens(s: Side): [number, number][] {
  return SCREENS.map((k) => [
    k === 0 ? CORNER_SCREEN : k * s.bay + PIER / 2,
    k === s.bays - 1 ? s.len - (POST - FIN_OUT) : (k + 1) * s.bay - PIER / 2,
  ])
}

export function collegeOfEducationGeometry(b: CollegeOfEducationData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const H = b.height
  const sides = coeSides(b)
  const { decatur, kimball, south, pryor } = sides
  const [N, E, S, W] = sides.corners as [Point, Point, Point, Point]
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : pryor.at(DOOR, -RECESS)
  const flip = (o: Point) => ({ x: -o.x, z: -o.z })
  const shift = (geo: THREE.BufferGeometry, f: (u: number, v: number) => [number, number]) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ...f(uv.getX(i), uv.getY(i)))
    return geo
  }

  // marble, its slabs lined up: four to a bay along the side, one to a spandrel up it
  const spandrel = (s: Side, y0: number, y1: number, row: number) => {
    const k = SLAB[0] / (s.bay / 4)
    const geo = wallQuad(s.at(0), s.at(s.len), y0, y1, s.o, 0)
    add(
      'marble',
      shift(geo, (u, v) => [u * k, (row + (v - y0) / (y1 - y0)) * SLAB[1]]),
    )
  }
  // the fins and posts in long pieces, a joint at every floor
  const piece = (geo: THREE.BufferGeometry, at: number) =>
    add(
      'marble',
      shift(geo, (u, v) => [at + u, ((v - ROWS[0]![0]) / PITCH + 4) * SLAB[1]]),
    )
  // a box standing on four corners, its sides only (lids where they show)
  const column = (c: Point[], y0: number, y1: number, at: number, lid: boolean) => {
    const mx = c.reduce((sum, p) => sum + p.x, 0) / c.length
    const mz = c.reduce((sum, p) => sum + p.z, 0) / c.length
    c.forEach((p, i) => {
      const q = c[(i + 1) % c.length]!
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = flip(o)
      piece(wallQuad(p, q, y0, y1, o), at + i * 0.15)
    })
    if (lid) add('marble', flat(c, y1))
  }
  // the roofs: a grey membrane on esri's satellite images. it's the screens' metal with its
  // ribs left out (every bit of it reads the same spot), the dark soffit's material was black
  // from above. no shadows needed, only faces turned away from the sun cast them
  const roof = (geo: THREE.BufferGeometry) =>
    add(
      'screen',
      shift(geo, () => [0.11, 0.2]),
    )
  // a box out from a side: its front, ends, top and bottom
  const box = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
  ) => {
    add(part, wallQuad(s.at(u0, d1), s.at(u1, d1), y0, y1, s.o, u0))
    add(part, wallQuad(s.at(u0, d0), s.at(u0, d1), y0, y1, flip(s.dir)))
    add(part, wallQuad(s.at(u1, d0), s.at(u1, d1), y0, y1, s.dir))
    const cell = [s.at(u0, d0), s.at(u1, d0), s.at(u1, d1), s.at(u0, d1)]
    add(part, flat(cell, y1))
    add(part, flat(cell, y0, false))
  }

  for (const s of [decatur, kimball, south, pryor]) {
    const street = s !== south
    const rows = street ? ROWS : ROWS.slice(PARTY_ROWS)
    const fins = Array.from({ length: s.bays - 1 }, (_, k) => (k + 1) * s.bay)
    const piers = pierLines(s, door)

    // the spandrels, from the soffit (the bottom on the side against 40-42 pryor st) to the
    // band at the top
    const bands: [number, number][] = [
      [street ? SOFFIT : 0, rows[0]![0]],
      ...rows.slice(0, -1).map((r, i): [number, number] => [r[1], rows[i + 1]![0]]),
      [rows.at(-1)![1], H],
    ]
    bands.forEach(([y0, y1], i) => spandrel(s, y0, y1, i))

    // the windows: glass between the fins, set back a bit, the marble's edges in the gap
    const edge = POST - FIN_OUT
    for (const [y0, y1] of rows) {
      for (let k = 0; k < s.bays; k++) {
        const u0 = k === 0 ? edge : k * s.bay + FIN / 2
        const u1 = k === s.bays - 1 ? s.len - edge : (k + 1) * s.bay - FIN / 2
        add('glass', glassQuad(s.at(u0, -GLASS_IN), s.at(u1, -GLASS_IN), y0, y1, s.o))
      }
      const strip = [s.at(0, -GLASS_IN), s.at(s.len, -GLASS_IN), s.at(s.len), s.at(0)]
      add('marble', flat(strip, y0))
      add('marble', flat(strip, y1, false))
    }

    // the fins, from the soffit (over the piers) up to the coping
    const from = street ? SOFFIT : ROWS[PARTY_ROWS - 1]![1]
    fins.forEach((c, k) => {
      const [u0, u1] = [c - FIN / 2, c + FIN / 2]
      const at = k * SLAB[0] * 2 + 0.3
      piece(wallQuad(s.at(u0, FIN_OUT), s.at(u1, FIN_OUT), from, H, s.o, 0), at)
      piece(wallQuad(s.at(u0, -GLASS_IN), s.at(u0, FIN_OUT), from, H, flip(s.dir)), at)
      piece(wallQuad(s.at(u1, -GLASS_IN), s.at(u1, FIN_OUT), from, H, s.dir), at)
      // and the piers under them on the ground floor, out on the sidewalk. over the doors the
      // fin just stops at the soffit
      if (street && piers.includes(c)) {
        const [p0, p1] = [c - PIER / 2, c + PIER / 2]
        const d0 = FIN_OUT - PIER
        column(
          [s.at(p0, d0), s.at(p1, d0), s.at(p1, FIN_OUT), s.at(p0, FIN_OUT)],
          0,
          SOFFIT,
          at,
          true,
        )
      } else if (street) {
        const end = [s.at(u0, 0), s.at(u1, 0), s.at(u1, FIN_OUT), s.at(u0, FIN_OUT)]
        add('marble', flat(end, from, false))
      }
    })

    // the inside of the parapet over the roof
    add('marble', wallQuad(s.at(0, -PARAPET), s.at(s.len, -PARAPET), ROOF, H, flip(s.o)))
  }

  // the corner posts, from the sidewalk to the coping
  const corner = (c: Point, a: Point, o: Point, at: number) => {
    const p = (ka: number, ko: number) => ({
      x: c.x + a.x * ka + o.x * ko,
      z: c.z + a.z * ka + o.z * ko,
    })
    const [x, y] = [FIN_OUT, FIN_OUT - POST]
    column([p(x, x), p(x, y), p(y, y), p(y, x)], 0, H, at, false)
  }
  corner(N, decatur.o, pryor.o, 0.2)
  corner(E, decatur.o, kimball.o, 3.2)
  corner(S, kimball.o, south.o, 6.2)
  corner(W, south.o, pryor.o, 9.2)

  // the coping round the top, the roof, and the soffit under the overhang. the corners are
  // mitred so no two pieces lie on top of each other
  const cornerAt = (c: Point, a: Point, o: Point, k: number) => ({
    x: c.x + (a.x + o.x) * k,
    z: c.z + (a.z + o.z) * k,
  })
  const ring: [Point, Side, Side][] = [
    [N, decatur, pryor],
    [E, decatur, kimball],
    [S, kimball, south],
    [W, south, pryor],
  ]
  const ringAt = (i: number, k: number) => {
    const [c, a, o] = ring[i % 4]!
    return cornerAt(c, a.o, o.o, k)
  }
  const cap = FIN_OUT + 0.03
  for (let i = 0; i < 4; i++) {
    const s = [decatur, kimball, south, pryor][i]!
    const [a, z] = s === pryor ? [3, 0] : [i, i + 1]
    const [p, q] = [ringAt(a, cap), ringAt(z, cap)]
    add('marble', flat([p, q, ringAt(z, -PARAPET), ringAt(a, -PARAPET)], H))
    add('marble', flat([p, q, ringAt(z, 0), ringAt(a, 0)], H - 0.08, false))
    add('marble', wallQuad(p, q, H - 0.08, H, s.o))
  }
  roof(
    flat(
      [0, 1, 2, 3].map((i) => ringAt(i, -PARAPET)),
      ROOF,
    ),
  )

  const inner = (c: Point) =>
    outline.reduce((m, p) =>
      Math.hypot(p.x - c.x, p.z - c.z) < Math.hypot(m.x - c.x, m.z - c.z) ? p : m,
    )
  for (const [a, z] of [
    [N, E],
    [E, S],
    [N, W],
  ])
    add('grey', flat([a!, z!, inner(z!), inner(a!)], SOFFIT, false))

  // the box on the roof: dark glass, white posts on the corners and a white band at the top
  {
    const p = (u: number, v: number) => ({
      x: N.x + decatur.dir.x * u + pryor.dir.x * v,
      z: N.z + decatur.dir.z * u + pryor.dir.z * v,
    })
    const { u, v, top } = PENTHOUSE
    const c = [p(u[0], v[0]), p(u[1], v[0]), p(u[1], v[1]), p(u[0], v[1])]
    const outs = [decatur.o, kimball.o, south.o, pryor.o]
    c.forEach((q, i) => {
      const r = c[(i + 1) % 4]!
      const geo = glassQuad(q, r, ROOF, top - 0.5, outs[i]!)
      // never lit at night, it's not offices
      const pane = geo.getAttribute('aPane')
      for (let k = 0; k < pane.count; k++) pane.setZ(k, 0)
      add('glass', geo)
      add('marble', wallQuad(q, r, top - 0.5, top, outs[i]!))
      // a post on the corner, a bit proud of the glass on both sides
      const [a, o] = [outs[i]!, outs[(i + 3) % 4]!]
      const post = (ka: number, ko: number) => ({
        x: q.x + a.x * ka + o.x * ko,
        z: q.z + a.z * ka + o.z * ko,
      })
      column(
        [post(0.03, 0.03), post(0.03, -0.27), post(-0.27, -0.27), post(-0.27, 0.03)],
        ROOF,
        top - 0.5,
        0.2,
        false,
      )
    })
    roof(flat(c, top))
  }

  // the ground floor on the three streets: on the outline, set back under the overhang
  for (const s of [decatur, kimball, pryor]) {
    const [a, z] = s === decatur ? [N, E] : s === kimball ? [E, S] : [N, W]
    const [ia, iz] = [inner(a), inner(z)]
    const [ua, uz] = [s.uOf(ia), s.uOf(iz)]
    // a point on the set back wall at u along the side, d out from it
    const wat = (u: number, d = 0) => {
      const t = (u - ua) / (uz - ua)
      return {
        x: ia.x + (iz.x - ia.x) * t + s.o.x * d,
        z: ia.z + (iz.z - ia.z) * t + s.o.z * d,
      }
    }
    const quad = (u0: number, u1: number, y0: number, y1: number, d = 0) =>
      wallQuad(wat(u0, d), wat(u1, d), y0, y1, s.o, u0)
    // a piece of wall with holes cut out of it
    const fill = (
      part: Part,
      u0: number,
      u1: number,
      y0: number,
      y1: number,
      holes: Hole[],
      uv = (u: number, v: number): [number, number] => [u, v],
    ) => {
      const cut = holes.map(([h0, h1, v0, v1]): Hole => [h0 - u0, h1 - u0, v0, v1])
      for (const [p0, p1, v0, v1] of solidPieces(u1 - u0, y0, y1, cut))
        add(part, shift(quad(u0 + p0, u0 + p1, v0, v1), uv))
    }
    // louvres are the dark glass with a bar every few cm: aPane says the window is one slat
    // tall, so its mullion repeats all the way up. they never light up at night
    const louvre = (u0: number, u1: number, y0: number, y1: number) => {
      const geo = glassQuad(wat(u0), wat(u1), y0, y1, s.o)
      const pane = geo.getAttribute('aPane')
      for (let k = 0; k < pane.count; k++) pane.setXYZ(k, pane.getX(k), SLAT, 0)
      add('dark', geo)
    }
    const dark = (u0: number, u1: number, y0: number, y1: number) =>
      add('dark', glassQuad(wat(u0), wat(u1), y0, y1, s.o))
    // the mullions line up with the doors
    const doorU = s.uOf(door)
    const clear = (u0: number, u1: number, y0: number, y1: number, holes: Hole[] = []) => {
      const cut = holes.map(([h0, h1, v0, v1]): Hole => [h0 - u0, h1 - u0, v0, v1])
      for (const [p0, p1, v0, v1] of solidPieces(u1 - u0, y0, y1, cut))
        add(
          'clear',
          shift(quad(u0 + p0, u0 + p1, v0, v1, 0.02), (u, v) => [u - doorU + 2 * DOOR_PANEL, v]),
        )
    }

    GROUND[s.name as keyof typeof GROUND].forEach((kind, k) => {
      const u0 = Math.max(ua, k * s.bay)
      const u1 = Math.min(uz, (k + 1) * s.bay)
      // the strip of dark windows under the soffit, all along
      dark(u0, u1, CLERESTORY, SOFFIT)
      const vent = VENTS[s.name]?.[k]
      const vents: Hole[] =
        vent !== undefined && kind === 'brick'
          ? [[u0 + 0.8 + vent * (u1 - u0 - 3), u0 + 2.2 + vent * (u1 - u0 - 3), 0.4, 1.4]]
          : []
      for (const [h0, h1, v0, v1] of vents) louvre(h0, h1, v0, v1)
      if (kind === 'brick') fill('brick', u0, u1, 0, CLERESTORY, vents)
      else if (kind === 'louvres') louvre(u0, u1, 0, CLERESTORY)
      else if (kind === 'dark') dark(u0, u1, 0, CLERESTORY)
      else if (kind === 'lobby') {
        // the lobby's glass, and four sliding doors in the middle of the canopy (gsu 2026): the
        // middle two are the game's door (Doors.tsx draws them)
        clear(u0, u1, 0, CLERESTORY, [
          [doorU - DOOR_WIDTH / 2, doorU + DOOR_WIDTH / 2, 0, DOOR_HEIGHT],
        ])
        // white piers either side of the doors and the sidelight next to them, up to the canopy
        for (const p of [doorU - 2 * DOOR_PANEL - 0.25, doorU + 3 * DOOR_PANEL])
          if (p > u0 && p < u1)
            box('marble', s, p, p + 0.25, -RECESS, -RECESS + 0.3, 0, CANOPY.y[0]!)
      } else if (kind === 'dock') {
        // a grey roll up door, its slats across
        const [r0, r1] = [u0 + 0.85, u1 - 0.85]
        fill('brick', u0, u1, 0, CLERESTORY, [[r0, r1, 0, 3.6]])
        add(
          'screen',
          shift(quad(r0, r1, 0, 3.6), (u, v) => [v * 2.75, 0.2 + u * 0.001]),
        )
      } else {
        // white marble panels along the bottom, brick over them. the back door has a small
        // blue canopy (mapillary 2019, looking up kimball way)
        fill('brick', u0, u1, 0, CLERESTORY, [[u0, u1, 0, PANEL]])
        const at = u0 + 0.5
        const doorway: Hole[] = kind === 'back' ? [[at, at + 1.1, 0, 2.3]] : []
        // one slab up each panel
        fill('marble', u0, u1, 0, PANEL, doorway, (u, v) => [u * 1.25, (v * SLAB[1]) / PANEL])
        if (kind === 'back') {
          dark(at, at + 1.1, 0, 2.3)
          box('blue', s, at - 0.25, at + 1.35, -RECESS, -RECESS + 0.9, 2.45, 2.75)
        }
      }
    })
  }

  for (const [u0, u1] of screens(pryor))
    for (let y = 0, k = 0; y < CLERESTORY - 0.01; y += ROW, k++) {
      const top = Math.min(y + ROW, CLERESTORY)
      const geo = wallQuad(pryor.at(u0, SCREEN_D), pryor.at(u1, SCREEN_D), y, top, pryor.o, u0)
      add(
        'screen',
        shift(geo, (u, v) => [u + (k % 2) * 0.11, v]),
      )
    }

  // the canopy over the doors, gsu blue. it reaches back to the wall under the overhang
  box('blue', pryor, CANOPY.from, CANOPY.to, -RECESS, CANOPY.out, CANOPY.y[0]!, CANOPY.y[1]!)
  // banners square to the wall
  for (const k of BANNERS) {
    const c = k === 0 ? POST / 2 - FIN_OUT : k * pryor.bay
    const [d0, d1] = BANNER.d.map((d) => FIN_OUT + d) as [number, number]
    for (const o of [pryor.dir, flip(pryor.dir)])
      add('blue', wallQuad(pryor.at(c, d0), pryor.at(c, d1), BANNER.y[0]!, BANNER.y[1]!, o))
  }
  // the round sign, both sides, on a bracket
  {
    const u = DISC.fin * pryor.bay
    const c = pryor.at(u, DISC.d)
    for (const o of [pryor.dir, flip(pryor.dir)]) add('blue', disc(c, DISC.y, DISC.r, pryor.o, o))
    box('blue', pryor, u - 0.03, u + 0.03, FIN_OUT, DISC.d - DISC.r, DISC.y - 0.05, DISC.y + 0.05)
  }

  // the name over the doors on pryor st, on the marble over the soffit (mapillary 2019), and on
  // kimball way near the corner at decatur st, on the set back brick
  {
    const p = pryor.at(15.2, 0.04)
    signs.push({
      x: p.x,
      y: 5,
      z: p.z,
      rot: Math.atan2(pryor.o.x, pryor.o.z),
      text: 'COLLEGE OF EDUCATION\n& HUMAN DEVELOPMENT',
      plate: '#f1f1ef',
      color: '#3d4046',
      scale: 0.75,
    })
  }
  {
    const p = kimball.at(3.55, -RECESS + 0.03)
    signs.push({
      x: p.x,
      y: 3.45,
      z: p.z,
      rot: Math.atan2(kimball.o.x, kimball.o.z),
      text: 'COLLEGE OF EDUCATION\n& HUMAN DEVELOPMENT',
      plate: '#f1f1ef',
      color: '#3d4046',
      scale: 0.48,
    })
  }

  // inside the ground floor: walls round the outline, glass at the lobby
  const glassy: [number, number][] = [[2 * pryor.bay, 4 * pryor.bay]]
  for (const { p, len, dir, out } of edges(outline)) {
    const into = flip(out)
    const at = (t: number) => ({ x: p.x + dir.x * t, z: p.z + dir.z * t })
    const tOf = (x: Point) => (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
    const t = tOf(door)
    const onEdge =
      t > 0 && t < len && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
    const holes: Hole[] = onEdge ? [[t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]] : []
    const glass: Hole[] =
      out.x * pryor.o.x + out.z * pryor.o.z > 0.99
        ? glassy.map(([u0, u1]) => {
            const [t0, t1] = [tOf(pryor.at(u0)), tOf(pryor.at(u1))].sort((m, n) => m - n)
            return [Math.max(0, t0!), Math.min(len, t1!), 0, CEILING] as Hole
          })
        : []
    for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, [...holes, ...glass]))
      inside.solid.push(wallQuad(at(u0), at(u1), v0, v1, into))
    for (const [g0, g1] of glass) {
      const cut = holes.map(([h0, h1, v0, v1]): Hole => [h0 - g0, h1 - g0, v0, v1])
      for (const [u0, u1, v0, v1] of solidPieces(g1 - g0, 0, CEILING, cut))
        inside.glass.push(wallQuad(at(g0 + u0), at(g0 + u1), v0, v1, into))
    }
  }

  return {
    parts: merged(),
    inside,
    signs,
    first: ['marble'],
    noShadow: ['dark', 'brick', 'screen', 'blue'],
  }
}

// a flat round sign standing square to a side: `across` is the way it lies along the ground,
// o the way it faces. uvs in meters
function disc(c: Point, y: number, r: number, across: Point, o: Point) {
  const n = 16
  const pos: number[] = []
  const uv: number[] = []
  const rim = (k: number) => {
    const t = (k / n) * Math.PI * 2
    return [c.x + across.x * Math.cos(t) * r, y + Math.sin(t) * r, c.z + across.z * Math.cos(t) * r]
  }
  for (let k = 0; k < n; k++) {
    let [a, b] = [rim(k), rim(k + 1)]
    // the corners have to go counterclockwise seen from the front
    const [ax, az, bx, bz] = [a[0]! - c.x, a[2]! - c.z, b[0]! - c.x, b[2]! - c.z]
    const [ay, by] = [a[1]! - y, b[1]! - y]
    const cross = { x: ay * bz - az * by, z: ax * by - ay * bx }
    if (cross.x * o.x + cross.z * o.z < 0) [a, b] = [b, a]
    for (const p of [[c.x, y, c.z], a, b]) {
      pos.push(...p)
      uv.push((p[0]! - c.x) * across.x + (p[2]! - c.z) * across.z, p[1]!)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => (i % 3 === 0 ? o.x : i % 3 === 2 ? o.z : 0)),
      3,
    ),
  )
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}
