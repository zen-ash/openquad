import * as THREE from 'three'
import type { Point } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  edges,
  flat,
  frame,
  glassQuad,
  insideWalls,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// petit science center (2010), on the corner of piedmont ave and decatur st. a slab of nine
// tall lab floors in dark grey brick with a cream band at every floor and tall glass slots,
// over a cream base with a colonnade at the decatur st end. on the corner a tower of blue
// glass, then the entrance plaza off decatur st with the lobby at its end and a glass wing
// past it. a grey metal penthouse covers most of the roof, flush with the back walls, and a
// glass bridge goes out the back to the research science center (drawn here too). from
// usgs's lidar (2018), mapillary (2019-2021), gsu's photos (2013-2026) and esri's satellite
// images. sources: docs/reference/petit-science-center.md
//
// on the frame, "a" is meters along piedmont ave from the west corner, "w" meters in from
// it. on a wall, "u" is meters along it as you look at it from outside and "d" meters out

export type PetitData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][]; bridge?: number[][] }
}

// few parts, each is a draw call in every pass. all but the see-through storefronts cast
// shadows: the glass is the walls of the corner tower and the wing (with it left out the
// sun came through the wing in stripes). the storefronts only go up to the inside's
// ceiling, there's nothing behind them higher up
export type Part = 'brick' | 'precast' | 'glass' | 'clear' | 'metal' | 'dark'

// the outline, same numbers as build-campus.mjs. the colonnade and the recess at the south
// corner are only on the ground floor, over them the walls are on the slab's lines
export const OUTLINE: [number, number][] = [
  [0, 0],
  [33, 0],
  [33, 2.4],
  [57.95, 2.4],
  [57.95, 5.3],
  [60.6, 5.4],
  [60.6, -2.6],
  [72.43, -7.3],
  [79.53, 0.76],
  [69.8, 19.14],
  [75.21, 24.33],
  [77.29, 18.7],
  [86.05, 18.38],
  [87.17, 41.48],
  [74.45, 42.03],
  [74.3, 38.42],
  [68.29, 35.29],
  [64.57, 33.25],
  [62.57, 32.16],
  [59.95, 31.86],
  [59.76, 32.92],
  [57.99, 36.5],
  [55.38, 36.48],
  [55.36, 42.2],
  [3.8, 42.2],
  [3.8, 38.8],
  [0, 38.8],
]
export const SLAB = { length: 57.95, depth: 42.2 }
export const COLONNADE = { from: 33, depth: 2.4, top: 5 }
const RECESS = { a: 3.8, w: 38.8, top: 4.5 }
// the glass tower on the corner: next to the gap, toward piedmont ave, the corner, toward
// the plaza
const PROW: [number, number][] = [
  [60.6, 5.4],
  [60.6, -2.6],
  [72.43, -7.3],
  [79.53, 0.76],
  [69.8, 19.14],
]
const WING: [number, number][] = [
  [77.29, 18.7],
  [86.05, 18.38],
  [87.17, 41.48],
  [74.45, 42.03],
]

// up the slab, meters over the piedmont ave sidewalk (usgs lidar, and mapillary's 2019 photo
// from piedmont ave with a camera fitted on it): a cream base, dark brick with a cream band
// at every lab floor, 4.5m apart, and the coping. the tower and the wing go a bit higher
export const BASE = 6.9
export const BANDS = [12.5, 17, 21.5, 26, 30.5, 35, 39.5]
const BAND = 0.22
export const TOP = 44.5
const COPING = 44.05
// how far the bands, the coping and the sill on the base stand out
const OUT = 0.1
export const PARAPET = 45.9
// the floor lines of the labs. the glass walls have their mullions on them
const FLOORS = Array.from({ length: 9 }, (_, k) => 8 + 4.5 * k)
// the penthouse over the roof (lidar): set back from piedmont ave, flush with the back. its
// top is the building's height. the stairs at the west corner, the cooling towers on it
export const PENTHOUSE: [number, number][] = [
  [0, 3.35],
  [52.2, 3.35],
  [69.2, 18.15],
  [69.3, 20.5],
  [61.65, 32.25],
  [56.4, 30.25],
  [55.95, 36.75],
  [55.36, 42.2],
  [0, 42.2],
]
export const STAIRS = { a: 6.5, top: 49.7 }
export const COOLING = { a: [6.7, 22.2], w: [25.45, 36.95], top: 62.6 } as const

// the slots in the brick, 1m of dark glass set back in it. on piedmont ave they go all the
// way up, every 2.8m (measured on the fitted 2019 photo). on the back walls they're a floor
// tall and scattered, about one in every 4.5m of a floor, some in pairs (gsu's 2025 photo,
// the 2021 dashcam)
export const SLOT = 1
const SLOT_IN = 0.04
export const TALL_SLOTS = Array.from({ length: 17 }, (_, k) => 9.3 + 2.8 * k)
// the back wall toward the research tower ends in a strip of blue glass the whole height
const STRIP = 49.4
// shop windows are see-through up to here, the inside's ceiling is at 3.3m
const SHOP = 3.2

// a straight wall from one corner of the frame to another
type Wall = { at: (u: number, d?: number) => Point; o: Point; dir: Point; len: number }

// same "random" numbers every time
const rand = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

// slots of a back wall: for each floor between two bands, a few at random spots
export function backSlots(len: number, seed: number): Hole[] {
  const floors: [number, number][] = [BASE + 0.2, ...BANDS.map((y) => y + BAND / 2)].map(
    (y0, i) => [y0, i < BANDS.length ? BANDS[i]! - BAND / 2 : COPING],
  )
  const spots = Math.floor((len - 3) / 1.45)
  const count = Math.min(Math.round(len / 4.5), spots)
  return floors.flatMap(([y0, y1], k) => {
    const taken = new Set<number>()
    for (let i = 0; taken.size < count; i++)
      taken.add(Math.floor(rand(seed * 101 + k * 17 + i) * spots))
    const bottom = y0 + 0.5
    const top = Math.min(bottom + 3.1, y1 - 0.5)
    return [...taken].map((s): Hole => [1.5 + s * 1.45, 1.5 + s * 1.45 + SLOT, bottom, top])
  })
}

export function petitFrame(b: PetitData) {
  const [w, e] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(w, e)
  // f's out is toward piedmont ave
  const A = (a: number, v: number) => f.at(a, -v)
  const aw = (p: Point): [number, number] => [f.aOf(p), -f.dOf(p)]
  return { f, A, aw }
}

export function petitScienceGeometry(b: PetitData) {
  const { add, prism, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, aw } = petitFrame(b)
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  const wallOf = ([pa, pw]: number[], [qa, qw]: number[]): Wall => {
    const len = Math.hypot(qa! - pa!, qw! - pw!)
    const [da, dw] = [(qa! - pa!) / len, (qw! - pw!) / len]
    // the outline goes round with the outside on the left, -w along piedmont ave
    const at = (u: number, d = 0) => A(pa! + da * u + dw * d, pw! + dw * u - da * d)
    const [p, o, e] = [at(0), at(0, 1), at(1)]
    return { at, len, o: { x: o.x - p.x, z: o.z - p.z }, dir: { x: e.x - p.x, z: e.z - p.z } }
  }
  const back = (v: Point) => ({ x: -v.x, z: -v.z })

  // a piece of wall facing out, d out from the wall line
  const face = (part: Part, w: Wall, u0: number, u1: number, y0: number, y1: number, d = 0) => {
    if (u1 - u0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o, u0))
  }
  const pane = (
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d = 0,
    part: Part = 'glass',
  ) => {
    if (u1 - u0 > 0.01 && y1 - y0 > 0.01)
      add(part, glassQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o))
  }
  // shop windows: see-through up to just under the inside's ceiling, a dark band over that
  // (in the 2026 photo you see the dark ducts there). up in the base it's window glass
  const store = (w: Wall, u0: number, u1: number, y0: number, y1: number, d = 0) => {
    if (y0 >= SHOP) return pane(w, u0, u1, y0, y1, d)
    const top = Math.min(y1, SHOP)
    add('clear', wallQuad(w.at(u0, d), w.at(u1, d), y0, top, w.o, u0))
    if (y1 > top + 0.01) add('dark', smooth(wallQuad(w.at(u0, d), w.at(u1, d), top, y1, w.o)))
  }
  // the sides, top and bottom of a hole back to d (< 0)
  const reveal = (part: Part, w: Wall, [u0, u1, y0, y1]: Hole, d: number) => {
    add(part, wallQuad(w.at(u0, d), w.at(u0), y0, y1, w.dir))
    add(part, wallQuad(w.at(u1, d), w.at(u1), y0, y1, back(w.dir)))
    const rim = [w.at(u0, d), w.at(u1, d), w.at(u1), w.at(u0)]
    if (y0 > 0.01) add(part, flat(rim, y0))
    add(part, flat(rim, y1, false))
  }
  // a box standing out of a wall: front, top, bottom, and the ends that aren't against
  // something
  const box = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d: number,
    ends = [true, true],
  ) => {
    face(part, w, u0, u1, y0, y1, d)
    boxSides(part, w, u0, u1, y0, y1, d, ends)
  }
  const boxSides = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d: number,
    ends: boolean[],
  ) => {
    const rim = [w.at(u0), w.at(u1), w.at(u1, d), w.at(u0, d)]
    add(part, flat(rim, y1))
    if (y0 > 0.01) add(part, flat(rim, y0, false))
    if (ends[0]) add(part, wallQuad(w.at(u0), w.at(u0, d), y0, y1, back(w.dir)))
    if (ends[1]) add(part, wallQuad(w.at(u1), w.at(u1, d), y0, y1, w.dir))
  }
  // a cream band along a wall. its uvs start at its bottom, or the base's panel joints
  // would land on some bands
  const band = (w: Wall, u0: number, u1: number, y0: number, y1: number, ends: boolean[]) => {
    const geo = wallQuad(w.at(u0, OUT), w.at(u1, OUT), y0, y1, w.o, u0)
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) - y0 + 0.1)
    add('precast', geo)
    boxSides('precast', w, u0, u1, y0, y1, OUT, ends)
  }
  // louvres: dark metal with the ribs across. the metal's ribs run up its uvs, so turn them
  const louvre = (w: Wall, u0: number, u1: number, y0: number, y1: number, d: number) => {
    const geo = wallQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o, u0)
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
    add('dark', geo)
  }
  // curtain wall glass, in one piece from the second floor's line to the roof's so the
  // panes line up with the floors
  const curtain = (w: Wall, u0: number, u1: number, y0: number, y1: number) => {
    const ys = [y0, ...[FLOORS[0]!, FLOORS.at(-1)!].filter((y) => y > y0 + 1 && y < y1 - 1), y1]
    for (let i = 1; i < ys.length; i++) pane(w, u0, u1, ys[i - 1]!, ys[i]!)
  }
  // glass you see the floors through: the slab edge of every floor in front of it
  // see-through, with a grey inside a meter behind it (the building is empty up there; the
  // dark metal came out three times darker than the photo's). that wall also casts the
  // shadow the glass doesn't
  const floorsGlass = (w: Wall, y0: number, y1: number, slabs: Part = 'precast') => {
    const lines = FLOORS.filter((y) => y > y0 + 0.5 && y < y1 - 0.5)
    add('clear', wallQuad(w.at(0), w.at(w.len), y0, y1, w.o))
    face('metal', w, 0, w.len, y0, y1, -1)
    add('metal', wallQuad(w.at(0, -1), w.at(0), y0, y1, w.dir))
    add('metal', wallQuad(w.at(w.len, -1), w.at(w.len), y0, y1, back(w.dir)))
    for (const y of lines) box(slabs, w, 0, w.len, y - 0.2, y + 0.2, 0.04, [false, false])
  }

  // the main doors (gsu's 2026 photo): a revolving door of clear glass half out of the
  // wall, the game's door is in it. the game's sliding panels are behind it and came out as
  // a pale glowing block through the glass, so the drum has a dark back across the doorway
  // and a post in the middle. grey metal jambs either side and a band over it cover the rest
  // of the doorway (classroom south's way), and a swing door next to it
  const entrance = (w: Wall, c: number) => {
    const r = 1.05
    const n = 8
    for (let k = 0; k < n; k++) {
      const [t0, t1] = [(Math.PI * k) / n, (Math.PI * (k + 1)) / n]
      const p0 = w.at(c - Math.cos(t0) * r, Math.sin(t0) * r)
      const p1 = w.at(c - Math.cos(t1) * r, Math.sin(t1) * r)
      const tm = (t0 + t1) / 2
      const o = {
        x: -w.dir.x * Math.cos(tm) + w.o.x * Math.sin(tm),
        z: -w.dir.z * Math.cos(tm) + w.o.z * Math.sin(tm),
      }
      add('clear', wallQuad(p0, p1, 0, 2.3, o))
    }
    face('dark', w, c - r, c + r, 0, 2.3, 0.02)
    prism('metal', circle(w.at(c, r * 0.55), 0.06, 8), 0, 2.3, false)
    // its round top
    const top = Array.from({ length: n + 1 }, (_, k) => (Math.PI * k) / n).map((t) =>
      w.at(c - Math.cos(t) * (r + 0.03), Math.sin(t) * (r + 0.03)),
    )
    prism('metal', top, 2.3, 2.6)
    const side = DOOR_WIDTH / 2 + 0.05
    box('metal', w, c - side, c + side, 2.6, DOOR_HEIGHT + 0.05, 0.08)
    box('metal', w, c - side, c - r + 0.1, 0, 2.6, 0.3)
    box('metal', w, c + r - 0.1, c + side, 0, 2.6, 0.3)
    // the swing door's frame
    const s = c + side + 0.5
    box('metal', w, s, s + 0.08, 0, 2.4, 0.06)
    box('metal', w, s + 1, s + 1.08, 0, 2.4, 0.06)
    box('metal', w, s, s + 1.08, 2.32, 2.4, 0.06)
  }

  type Opening = { hole: Hole; fill?: 'glass' | 'louvre' | 'door' }
  /**
   * A wall of the slab: the base with its openings, the brick with its slots, the bands
   * and the coping. wrap says which ends are outside corners, where the bands go round
   */
  const slab = (
    w: Wall,
    slots: Hole[],
    base: Opening[],
    wrap: [boolean, boolean],
    [s0, s1] = [0, w.len],
  ) => {
    const shift = (h: Hole): Hole => [h[0] - s0, h[1] - s0, h[2], h[3]]
    for (const [u0, u1, y0, y1] of solidPieces(
      s1 - s0,
      0,
      BASE,
      base.map((o) => shift(o.hole)),
    ))
      face('precast', w, u0 + s0, u1 + s0, y0, y1)
    for (const { hole, fill } of base) {
      if (!fill) continue
      const [u0, u1, y0, y1] = hole
      reveal('precast', w, hole, -0.15)
      if (fill === 'glass') store(w, u0, u1, y0, y1, -0.15)
      else if (fill === 'louvre') louvre(w, u0, u1, y0, y1, -0.15)
      else face('dark', w, u0, u1, y0, y1, -0.15)
    }
    for (const [u0, u1, y0, y1] of solidPieces(s1 - s0, BASE, COPING, slots.map(shift)))
      face('brick', w, u0 + s0, u1 + s0, y0, y1)
    for (const s of slots) {
      reveal('brick', w, s, -SLOT_IN)
      // the glass in a piece for each floor, the bands cross the tall ones
      const ys = [s[2], ...BANDS.filter((y) => y > s[2] && y < s[3]), s[3]]
      for (let i = 1; i < ys.length; i++) pane(w, s[0], s[1], ys[i - 1]!, ys[i]!, -SLOT_IN)
    }
    const u0 = wrap[0] ? -OUT : s0
    const u1 = wrap[1] ? s1 + OUT : s1
    const ends = [!wrap[0], !wrap[1]]
    band(w, u0, u1, BASE, BASE + 0.2, ends)
    for (const y of BANDS) band(w, u0, u1, y - BAND / 2, y + BAND / 2, ends)
    band(w, u0, u1, COPING, TOP, ends)
  }

  const C = OUTLINE
  const se = wallOf(C[23]!, [0, SLAB.depth])
  const sw = wallOf([0, SLAB.depth], [0, 0])

  // piedmont ave: the colonnade at the decatur st end with the storefront back under it,
  // and a long window in the base next to it (the fitted 2019 photo)
  const piedmont = wallOf([0, 0], [SLAB.length, 0])
  const tall = TALL_SLOTS.map((u): Hole => [u - SLOT / 2, u + SLOT / 2, BASE + 0.2, COPING])
  slab(
    piedmont,
    tall,
    [
      { hole: [23.8, 31.8, 4.15, 5.9], fill: 'glass' },
      { hole: [COLONNADE.from, SLAB.length, 0, COLONNADE.top] },
    ],
    [true, true],
  )
  const shops = wallOf(C[2]!, C[3]!)
  store(shops, 0, shops.len, 0, 4.6)
  face('precast', shops, 0, shops.len, 4.6, COLONNADE.top)
  face('precast', wallOf(C[1]!, C[2]!), 0, COLONNADE.depth, 0, COLONNADE.top)
  const colonnade = [C[1]!, [SLAB.length, 0], C[3]!, C[2]!]
  add(
    'precast',
    flat(
      colonnade.map(([a, v]) => A(a!, v!)),
      COLONNADE.top,
      false,
    ),
  )
  // round columns every 5m (measured on the fitted 2019 photo)
  for (let k = 0; k < 5; k++)
    prism('precast', circle(A(35 + 5 * k, 0.6), 0.5, 12), 0, COLONNADE.top, false)
  // the shadow lookup is pushed out along the surface's normal (normalBias 0.2), so the top
  // 30cm of a column under a thin soffit looked past it and came out sunlit. a hidden ceiling
  // higher up for the shadows only (it faces down, inside the building)
  add(
    'precast',
    flat(
      colonnade.map(([a, v]) => A(a!, v!)),
      COLONNADE.top + 0.8,
      false,
    ),
  )

  // the end of the slab in the gap next to the glass tower, the colonnade comes out under it
  const gapEnd = wallOf([SLAB.length, 0], C[4]!)
  slab(gapEnd, [], [{ hole: [0, COLONNADE.depth, 0, COLONNADE.top] }], [true, false])

  // the gap, and the tower's side in it: glass you see the floors through, over a cream
  // wall with a steel door
  for (const [p, q, top] of [
    [C[4]!, C[5]!, TOP],
    [C[5]!, C[6]!, PARAPET],
  ] as const) {
    const w = wallOf(p, q)
    face('precast', w, 0, w.len, 0, 4.5)
    floorsGlass(w, 4.5, top)
  }
  face('dark', wallOf(C[4]!, C[5]!), 0.6, 1.6, 0, 2.3, 0.02)

  // the glass tower: the storefront on the ground floor, then curtain wall to the parapet.
  // the main doors are on its side toward the plaza
  for (let i = 1; i < 4; i++) {
    const w = wallOf(PROW[i]!, PROW[i + 1]!)
    const t = door ? (door.x - w.at(0).x) * w.dir.x + (door.z - w.at(0).z) * w.dir.z : -1
    const off = door ? Math.abs((door.x - w.at(0).x) * w.o.x + (door.z - w.at(0).z) * w.o.z) : 1
    const holes: Hole[] =
      t > 0 && t < w.len && off < 0.1
        ? [[t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]]
        : []
    for (const [u0, u1, y0, y1] of solidPieces(w.len, 0, 4.5, holes)) store(w, u0, u1, y0, y1)
    // a pane a floor, each lit a bit differently, and the floors' edges show through as
    // thin light lines (the 2019 photo from piedmont ave)
    const ys = [4.5, ...FLOORS, PARAPET]
    for (let k = 1; k < ys.length; k++) pane(w, 0, w.len, ys[k - 1]!, ys[k]!)
    for (const y of FLOORS) box('precast', w, 0, w.len, y - 0.09, y + 0.09, 0.03, [false, false])
    if (holes.length) entrance(w, t)
  }
  // its roof is over the slab's, a step up
  add(
    'precast',
    flat(
      PROW.map(([a, v]) => A(a, v)),
      PARAPET,
    ),
  )
  const prowBack = wallOf(PROW[4]!, PROW[0]!)
  pane(prowBack, 0, prowBack.len, TOP, PARAPET)

  // the plaza side of the tower: a metal canopy the whole way along it over the doors,
  // deeper toward the lobby, on round columns (lidar, gsu's 2026 photo of the doors)
  const plaza = wallOf(PROW[3]!, PROW[4]!)
  const canopy = [plaza.at(1), plaza.at(plaza.len), plaza.at(plaza.len, 4.5), plaza.at(1, 2.5)]
  add('dark', smooth(flat(canopy, 4.85)))
  add('dark', smooth(flat(canopy, 4.45, false)))
  edges(canopy).forEach(({ p, q, out }, i) => {
    if (i > 0) add('metal', wallQuad(p, q, 4.45, 4.85, out))
  })
  for (const u of [4, 10]) prism('precast', circle(plaza.at(u, 2), 0.35, 12), 0, 4.45, false)
  // the same hidden ceiling for the shadows as over the colonnade, inside the canopy (over
  // it you saw it past the edge)
  add('dark', flat(canopy, 4.8, false))
  // round grey tubes lying on it out past its edge (2026 photo)
  for (const u of [8, 17]) {
    const [p, q] = [plaza.at(u, 0), plaza.at(u, 2.5 + (u - 1) * 0.1 + 0.8)]
    add('precast', tube({ x: p.x, y: 5.08, z: p.z }, { x: q.x, y: 5.08, z: q.z }, 0.22))
  }

  // the lobby at the end of the plaza, glass the whole way up
  for (const [p, q] of [
    [C[9]!, C[10]!],
    [C[10]!, C[11]!],
  ] as const) {
    const w = wallOf(p, q)
    store(w, 0, w.len, 0, 4.5)
    floorsGlass(w, 4.5, TOP)
  }

  // the wing on decatur st: curtain wall all round. on decatur st a tall window in a deep
  // frame at the plaza end, and light stone along the bottom from there to the east corner
  // (2019 photos, measured on mapillary's camera from decatur st)
  for (let i = 0; i < 3; i++) {
    const w = wallOf(WING[i]!, WING[i + 1]!)
    // toward the plaza you see the floors through it (2019 photo from decatur st)
    if (i === 0) {
      store(w, 0, w.len, 0, 4.5)
      floorsGlass(w, 4.5, PARAPET, 'metal')
    }
    if (i === 2) curtain(w, 0, w.len, 0, PARAPET)
    if (i !== 1) continue
    const [window, stone] = [{ to: 8.5, top: 10.7 }, 6.6]
    pane(w, 0, window.to, 0, window.top)
    curtain(w, window.to, w.len, stone, PARAPET)
    face('precast', w, window.to, w.len, 0, stone)
    curtain(w, 0, window.to, window.top + 0.5, PARAPET)
    box('dark', w, 0, window.to + 0.4, window.top, window.top + 0.5, 0.5, [false, true])
    box('dark', w, window.to, window.to + 0.4, 0, window.top, 0.5, [true, true])
  }
  add(
    'precast',
    flat(
      WING.map(([a, v]) => A(a, v)),
      PARAPET,
    ),
  )
  const wingBack = wallOf(WING[3]!, WING[0]!)
  pane(wingBack, 0, wingBack.len, TOP, PARAPET)

  // the back between the wing and the slab, where the bridge goes out: storefront on the
  // ground floor (the second way in, gsu's 2026 photo), cream over it, blue glass up top
  for (let i = 14; i < 23; i++) {
    const w = wallOf(C[i]!, C[i + 1]!)
    store(w, 0, w.len, 0, 4.5)
    face('precast', w, 0, w.len, 4.5, BASE)
    curtain(w, 0, w.len, BASE, TOP)
  }

  // the back toward the research tower: big louvres and the loading dock in the base, the
  // slots, the strip of blue glass at the east end. the louvres by the south corner are in
  // gsu's 2025 photo, the rest is hidden behind the research tower there
  const strip = se.len - STRIP
  slab(
    se,
    backSlots(STRIP - 1, 2).map((h): Hole => [h[0] + strip + 0.5, h[1] + strip + 0.5, h[2], h[3]]),
    [
      { hole: [se.len - RECESS.a, se.len, 0, RECESS.top] },
      { hole: [11.4, 17.4, 1.2, 5.6], fill: 'louvre' },
      { hole: [20.4, 24.4, 0, 4.2], fill: 'door' },
      { hole: [27.4, 35.4, 1.2, 5.6], fill: 'louvre' },
      { hole: [38.9, 46.9, 1.2, 5.6], fill: 'louvre' },
    ],
    [false, false],
    [strip, se.len],
  )
  face('precast', se, 0, strip, 0, BASE)
  band(se, 0, strip, BASE, BASE + 0.2, [false, true])
  curtain(se, 0, strip, BASE + 0.2, TOP)
  // the back drive: grey metal the whole way up at the south end (the 2025 photo sees it
  // past the corner), then brick like the rest with louvres in the base
  const metalTo = 16
  face('metal', sw, 0, metalTo, RECESS.top, TOP)
  face('metal', sw, SLAB.depth - RECESS.w, metalTo, 0, RECESS.top)
  slab(
    sw,
    backSlots(sw.len - metalTo, 1).map((h): Hole => [h[0] + metalTo, h[1] + metalTo, h[2], h[3]]),
    [
      { hole: [19, 25, 1.2, 5.6], fill: 'louvre' },
      { hole: [29, 30.6, 0, 2.4], fill: 'door' },
      { hole: [33, 39, 1.2, 5.6], fill: 'louvre' },
    ],
    [false, true],
    [metalTo, sw.len],
  )
  // the recess at the south corner, a door in it
  const recess = [wallOf(C[24]!, C[25]!), wallOf(C[25]!, C[26]!)]
  for (const w of recess) face('precast', w, 0, w.len, 0, RECESS.top)
  face('dark', recess[1]!, 1, 2.2, 0, 2.3, 0.02)
  add(
    'precast',
    flat(
      [C[24]!, C[25]!, C[26]!, [0, SLAB.depth]].map(([a, v]) => A(a!, v!)),
      RECESS.top,
      false,
    ),
  )

  // the roof, the penthouse and what's on it
  const roof = [C[0]!, [SLAB.length, 0], ...C.slice(4, 24), [0, SLAB.depth]]
  add(
    'precast',
    flat(
      roof.map(([a, v]) => A(a!, v!)),
      TOP,
    ),
  )
  const ph = PENTHOUSE.map(([a, v]) => A(a, v))
  prism('metal', ph, TOP, b.height)
  // a big louvre in it over the back toward the research tower (gsu's 2025 photo)
  const phSe = wallOf([45, SLAB.depth], [0, SLAB.depth])
  louvre(phSe, 15, 38, 45.2, 51.2, 0.03)
  prism('brick', [A(0, 0), A(STAIRS.a, 0), A(STAIRS.a, 3.35), A(0, 3.35)], TOP, STAIRS.top - 0.4)
  prism(
    'precast',
    [A(0, 0), A(STAIRS.a, 0), A(STAIRS.a, 3.35), A(0, 3.35)],
    STAIRS.top - 0.4,
    STAIRS.top,
  )
  const [c0, c1] = COOLING.a
  const [v0, v1] = COOLING.w
  prism('dark', [A(c0, v0), A(c1, v0), A(c1, v1), A(c0, v1)], b.height, COOLING.top)
  // a box of machinery on the wing's roof
  prism('metal', [A(69.2, 29.45), A(75.5, 29.45), A(75.5, 37.45), A(69.2, 37.45)], TOP, 47.7)

  // the bridge to the research science center: a floor of glass between blue panels, a
  // grey fascia over it (gsu's 2025 photo of it). the ends are against the two buildings
  const bridge = b.landmark!.bridge?.map(pt)
  if (bridge) {
    const [under, top] = [20.5, 25.8]
    for (const { p, q, out } of edges(bridge)) {
      const mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }
      if (edges(outline).some((e) => onEdge(mid, e))) continue
      add('metal', wallQuad(p, q, under, 22, out))
      add('glass', glassQuad(p, q, 22, 25, out))
      add('metal', wallQuad(p, q, 25, top, out))
    }
    add('metal', flat(bridge, under, false))
    add('metal', flat(bridge, top))
  }

  // the sign in the plaza: a white pillar with the name facing decatur st (2013 photo).
  // gsu's logo is a blue square here
  prism('precast', [A(82.6, 6), A(83.05, 6), A(83.05, 7.2), A(82.6, 7.2)], 0, 3.2)
  const sign = A(83.07, 6.6)
  const toStreet = wallOf([83.05, 6], [83.05, 7.2]).o
  signs.push({
    x: sign.x,
    y: 2.5,
    z: sign.z,
    rot: Math.atan2(toStreet.x, toStreet.z),
    text: 'PARKER H. PETIT\nSCIENCE CENTER',
    scale: 0.22,
  })

  // inside the ground floor: glass on the storefronts, the tower, the lobby, the wing and
  // the back by the bridge
  insideWalls(inside, outline, door, (p, q) => {
    const [a, v] = aw({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 })
    return a > 60.7 || (a > 55.3 && v > 30) || Math.abs(v - COLONNADE.depth) < 0.05
  })

  return { parts: merged(), inside, signs, first: ['brick', 'precast'] }
}

// the dark metal is ribbed for the louvres. the canopy's underside is smooth: its uvs
// stretched so far the ribs fade out like they do far away
function smooth(geo: THREE.BufferGeometry) {
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 200, uv.getY(i) * 200)
  return geo
}

// is p on that edge of an outline
function onEdge(p: Point, e: ReturnType<typeof edges>[number]) {
  const t = (p.x - e.p.x) * e.dir.x + (p.z - e.p.z) * e.dir.z
  const d = (p.x - e.p.x) * e.out.x + (p.z - e.p.z) * e.out.z
  return t > 0 && t < e.len && Math.abs(d) < 0.3
}

// a round tube lying from a to b, r thick, its far end closed
function tube(a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, n = 10) {
  const [p, q] = [new THREE.Vector3().copy(a), new THREE.Vector3().copy(b)]
  const axis = new THREE.Vector3().subVectors(q, p).normalize()
  const e1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize()
  const e2 = new THREE.Vector3().crossVectors(e1, axis)
  const ring = (c: THREE.Vector3, t: number) =>
    c
      .clone()
      .addScaledVector(e1, Math.cos(t) * r)
      .addScaledVector(e2, Math.sin(t) * r)
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  // a triangle, wound so it faces n
  const tri = (v: THREE.Vector3[], n: THREE.Vector3) => {
    const c = new THREE.Vector3()
      .subVectors(v[1]!, v[0]!)
      .cross(new THREE.Vector3().subVectors(v[2]!, v[0]!))
    const vs = c.dot(n) > 0 ? v : [v[0]!, v[2]!, v[1]!]
    for (const x of vs) {
      pos.push(x.x, x.y, x.z)
      nor.push(n.x, n.y, n.z)
      uv.push(x.x + x.z, x.y)
    }
  }
  for (let k = 0; k < n; k++) {
    const [t0, t1] = [(k / n) * Math.PI * 2, ((k + 1) / n) * Math.PI * 2]
    const out = ring(new THREE.Vector3(), (t0 + t1) / 2).normalize()
    const [a0, a1, b0, b1] = [ring(p, t0), ring(p, t1), ring(q, t0), ring(q, t1)]
    tri([a0, b0, b1], out)
    tri([a0, b1, a1], out)
    tri([q, b0, b1], axis)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}
