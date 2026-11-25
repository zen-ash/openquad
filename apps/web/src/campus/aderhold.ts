import type * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  flat,
  glassQuad,
  inset,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// gsu's helen m. aderhold learning center, 60 luckie st (2002, classrooms), the whole block
// between luckie st, forsyth st, poplar st and the plaza at peachtree st, west of woodruff park.
// buff brick with cast stone at the bottom, two tall floors of windows under metal eyebrows over
// a tall ground floor: an arcade along luckie st, shops on the plaza side. a glass bay on the
// corner at peachtree, a roof terrace behind the parapet with a pergola all round and a dark
// brown fifth floor set back behind it. from usgs's lidar (2018) and gsu's photos (2020-2026)
// and mapillary (2022). sources: docs/reference/aderhold-learning-center.md
//
// it's turned ~49 degrees to the game's x/z: laid out as (a, b), a along luckie st from the
// corner at peachtree toward forsyth st, b in from luckie st toward poplar st. the ground is the
// luckie st sidewalk (322.6m), the plaza side falls to 321.0 at poplar st

export type AderholdData = {
  points: number[][]
  height: number
  door?: number[]
}

// brick the buff brick, stone the cast stone base, coping, posts' caps and the terrace, metal the
// grey bay, frames, slot, pergola and the roofs, brown the fifth floor's dark cladding and the eyebrows, glass
// every window and storefront
export type Part = 'brick' | 'stone' | 'metal' | 'brown' | 'glass'

type Range = readonly [number, number]
const P = (x: number, z: number): Point => ({ x, z })

// the brick's corner at peachtree and luckie (lidar), and which way a and b go
export const O = P(-306.988, -238.88)
export const U = { x: -0.654783, z: -0.755817 }
export const V = { x: -0.755817, z: 0.654783 }
export const L = (a: number, b: number) => P(O.x + U.x * a + V.x * b, O.z + U.z * a + V.z * b)
// the brick faces: luckie st and poplar st are A long, the plaza side and forsyth st B, with a
// 2.3m cut on each corner (lidar)
export const A = 54
export const B = 60.6
const CUT = 2.3

// the outline (build-campus.mjs) is the ground floor's glass: the back of the arcade on luckie
// st, the corner porch under the bay, 0.3m behind the brick on the other sides
export const ARCADE_BACK = 3
const IN = 0.3
export const OUTLINE: [number, number][] = [
  [IN, 4.6],
  [CUT, ARCADE_BACK],
  [50.8, ARCADE_BACK],
  [50.8, IN],
  [51.6, IN],
  [A - IN, 2.4],
  [A - IN, B - 2.4],
  [A - CUT - 0.1, B - IN],
  [2.4, B - IN],
  [IN, B - 2.4],
]

// heights over the luckie st sidewalk (lidar: terrace 337.5m, pergola 342.0, fifth floor's
// roof 344.7, the high block over the middle 348.3, the one at poplar st 347.3)
export const ARCADE = 4.6
export const FLOOR2 = 5.3
export const ROWS: Range[] = [
  [6, 9.3],
  [10.7, 14],
]
export const TERRACE = 14.9
export const PARAPET = 15.9
const COPING = 0.2
// the cast stone up to here on the piers and the walls
const BASE = 2.2
// the fifth floor stands back from the brick, its roof, the beams over the terrace
export const SET = 3
export const ROOF = 22.1
const POST_TOP = 18.9
const BEAMS: Range = [18.9, 19.4]
// the high blocks on the roof: over the middle toward poplar st, and a smaller one (lidar)
export const HIGH = { a: [18, 48] as Range, b: [38.2, 46.2] as Range, top: 25.7 }
const HIGH_BACK = { b: [46.2, B - SET] as Range, top: 24.7 }
const PENTHOUSE = { a: [22, 36] as Range, b: [16, 29] as Range, top: 24.7 }

// window columns: 3.7m on luckie, poplar and forsyth with 2.3m windows (two lights), 5m on the
// plaza side with 3.4m ones (gsu's 2021 photo from above woodruff park). luckie st has a grey
// slot in the middle with the entrance at its foot
const PITCH = 3.7
const WINDOW = 2.3
const WIDE_PITCH = 5
const WIDE = 3.4
export const SLOT: Range = [22.5, 26.9]

// a straight face from p to q, o the side facing away from `inner`
function sideOf(p: Point, q: Point, inner: Point) {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  let o = { x: dir.z, z: -dir.x }
  if ((inner.x - p.x) * o.x + (inner.z - p.z) * o.z > 0) o = { x: -o.x, z: -o.z }
  const at = (u: number, d = 0) => P(p.x + dir.x * u + o.x * d, p.z + dir.z * u + o.z * d)
  return { p, q, len, dir, o, at }
}
type Side = ReturnType<typeof sideOf>

const MIDDLE = L(A / 2, B / 2)
// the four long sides of the brick and the corner cuts (east at peachtree, then clockwise)
const luckie = sideOf(L(CUT, 0), L(A - CUT, 0), MIDDLE)
const forsyth = sideOf(L(A, CUT), L(A, B - CUT), MIDDLE)
const poplar = sideOf(L(A - CUT, B), L(CUT, B), MIDDLE)
const plaza = sideOf(L(0, B - CUT), L(0, CUT), MIDDLE)
const cuts = {
  east: sideOf(L(0, CUT), L(CUT, 0), MIDDLE),
  north: sideOf(L(A - CUT, 0), L(A, CUT), MIDDLE),
  west: sideOf(L(A, B - CUT), L(A - CUT, B), MIDDLE),
  south: sideOf(L(CUT, B), L(0, B - CUT), MIDDLE),
}

// columns of `pitch` along a side, centered, as [from, to] of each
function columns(len: number, pitch: number, n = Math.floor(len / pitch + 1e-6)) {
  const first = (len - n * pitch) / 2
  return Array.from({ length: n }, (_, i): Range => [first + i * pitch, first + (i + 1) * pitch])
}
const windowIn = ([c0, c1]: Range, w: number): Range => [(c0 + c1 - w) / 2, (c0 + c1 + w) / 2]

// luckie st: six columns, the slot, six more
export const LUCKIE_COLUMNS: Range[] = [
  ...columns(SLOT[0] - 0.3, PITCH).map(([c0, c1]): Range => [c0 + 0.3, c1 + 0.3]),
  SLOT,
  ...columns(luckie.len - 0.3 - SLOT[1], PITCH).map(([c0, c1]): Range => [
    c0 + SLOT[1],
    c1 + SLOT[1],
  ]),
]

export function aderholdGeometry(b: AderholdData) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null

  const face = (part: Part, s: Side, y0: number, y1: number, holes: Hole[] = [], d = 0) => {
    for (const [u0, u1, v0, v1] of solidPieces(s.len, y0, y1, holes))
      add(part, wallQuad(s.at(u0, d), s.at(u1, d), v0, v1, s.o, u0))
  }
  // the same facing in, for the parapet's back and the like
  const back = (part: Part, s: Side, u0: number, u1: number, y0: number, y1: number, d: number) =>
    add(part, wallQuad(s.at(u0, d), s.at(u1, d), y0, y1, { x: -s.o.x, z: -s.o.z }, u0))
  // a hole's sides, sill and head back `depth`, and its glass there
  const reveal = (part: Part, s: Side, h: Hole, depth: number, d = 0) => {
    const [u0, u1, v0, v1] = h
    add(part, wallQuad(s.at(u0, d), s.at(u0, d - depth), v0, v1, s.dir))
    add(part, wallQuad(s.at(u1, d), s.at(u1, d - depth), v0, v1, { x: -s.dir.x, z: -s.dir.z }))
    const rim = [s.at(u0, d), s.at(u1, d), s.at(u1, d - depth), s.at(u0, d - depth)]
    if (v0 > 0.01) add(part, flat(rim, v0))
    add(part, flat(rim, v1, false))
    add('glass', glassQuad(s.at(u0, d - depth), s.at(u1, d - depth), v0, v1, s.o))
  }
  // a box on a side from d0 to d1 (out is +), its ends, lid and underside
  const ledge = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d1: number,
    d0 = 0,
    faces = 'fbelt',
  ) => {
    const away = { x: -s.o.x, z: -s.o.z }
    if (faces.includes('f')) add(part, wallQuad(s.at(u0, d1), s.at(u1, d1), y0, y1, s.o, u0))
    if (faces.includes('b')) add(part, wallQuad(s.at(u0, d0), s.at(u1, d0), y0, y1, away, u0))
    if (faces.includes('e')) {
      add(part, wallQuad(s.at(u0, d0), s.at(u0, d1), y0, y1, { x: -s.dir.x, z: -s.dir.z }))
      add(part, wallQuad(s.at(u1, d0), s.at(u1, d1), y0, y1, s.dir))
    }
    const rim = [s.at(u0, d0), s.at(u1, d0), s.at(u1, d1), s.at(u0, d1)]
    if (faces.includes('t')) add(part, flat(rim, y1))
    if (faces.includes('l') && y0 > 0.01) add(part, flat(rim, y0, false))
  }
  // a metal eyebrow over an opening
  const brow = (s: Side, [u0, u1]: Range, y: number) =>
    ledge('brown', s, u0 - 0.15, u1 + 0.15, y + 0.05, y + 0.35, 0.3, 0, 'felt')
  // the stepped cast stone foot of a pier
  const foot = (s: Side, u0: number, u1: number) => {
    ledge('stone', s, u0 - 0.12, u1 + 0.12, 0, 1.1, 0.25, 0, 'fet')
    ledge('stone', s, u0 - 0.06, u1 + 0.06, 1.1, 1.7, 0.13, 0, 'fet')
  }
  const rows = (cols: Range[], w: number) =>
    cols.flatMap((c) => ROWS.map(([y0, y1]): Hole => [...windowIn(c, w), y0, y1]))

  // luckie st: the arcade. piers 1.2m wide between the columns, 0.9m deep, cast stone at the
  // bottom with a stepped foot; the storefronts at the back (the outline), a stone soffit
  const openings = LUCKIE_COLUMNS.map(([c0, c1]): Range => [c0 + 0.6, c1 - 0.6])
  const arches: Hole[] = openings.map(([o0, o1]) => [o0, o1, 0, ARCADE])
  const upper = rows(LUCKIE_COLUMNS.slice(0, 6), WINDOW).concat(
    rows(LUCKIE_COLUMNS.slice(7), WINDOW),
  )
  const slot: Hole = [SLOT[0] + 0.6, SLOT[1] - 0.6, ARCADE, PARAPET - COPING]
  face('stone', luckie, 0, BASE, arches)
  face('brick', luckie, BASE, PARAPET - COPING, [...arches, ...upper, slot])
  for (const h of upper) reveal('brick', luckie, h, 0.25)
  const PIER = 0.9
  openings.forEach(([o0, o1], i) => {
    // the piers' sides, stone then brick
    for (const [part, y0, y1] of [
      ['stone', 0, BASE],
      ['brick', BASE, ARCADE],
    ] as const) {
      add(part, wallQuad(luckie.at(o0), luckie.at(o0, -PIER), y0, y1, luckie.dir))
      add(part, wallQuad(luckie.at(o1), luckie.at(o1, -PIER), y0, y1, neg(luckie.dir)))
      // the pier's back, facing the storefronts. the last one is solid back to them
      const next = openings[i + 1]?.[0]
      if (next !== undefined) back(part, luckie, o1, next, y0, y1, -PIER)
      else
        add(
          part,
          wallQuad(luckie.at(o1, -PIER), luckie.at(o1, -ARCADE_BACK), y0, y1, neg(luckie.dir)),
        )
      if (i === 0) back(part, luckie, 0, o0, y0, y1, -PIER)
    }
    brow(luckie, [o0, o1], ARCADE)
    const prev = openings[i - 1]?.[1] ?? 0
    foot(luckie, prev, o0)
  })
  foot(luckie, openings.at(-1)![1], luckie.len)
  // the pier on the corner's porch side
  add('stone', wallQuad(luckie.at(0), luckie.at(0, -PIER), 0, BASE, neg(luckie.dir)))
  add('brick', wallQuad(luckie.at(0), luckie.at(0, -PIER), BASE, ARCADE, neg(luckie.dir)))
  for (const h of upper) brow(luckie, [h[0], h[1]], h[3])
  // the arcade's ceiling over to the porch, and the storefronts along its back
  add(
    'stone',
    flat(
      [
        L(0, 4.6),
        L(0, CUT),
        L(CUT, 0),
        L(50.8, 0),
        L(50.8, ARCADE_BACK),
        L(CUT, ARCADE_BACK),
        L(IN, 4.6),
      ],
      ARCADE,
      false,
    ),
  )
  // the arcade's back wall is stone with a storefront in each bay (the 2023 photo of the diner)
  const arcadeBack = sideOf(L(CUT, ARCADE_BACK), L(50.8, ARCADE_BACK), MIDDLE)
  const stores = openings.map(([o0, o1]): Hole => [o0 + 0.2, o1 - 0.2, 0, 3.2])
  face('stone', arcadeBack, 0, ARCADE, stores)
  for (const [u0, u1, y0, y1] of stores)
    add('glass', glassQuad(arcadeBack.at(u0), arcadeBack.at(u1), y0, y1, arcadeBack.o))
  const porch = sideOf(L(IN, 4.6), L(CUT, ARCADE_BACK), MIDDLE)
  add('glass', glassQuad(porch.p, porch.q, 0, ARCADE, porch.o))
  // the grey slot: set back 0.6m over the arcade's ceiling, a window per floor
  const slotBack = 0.6
  add(
    'metal',
    wallQuad(luckie.at(slot[0]), luckie.at(slot[0], -slotBack), slot[2], slot[3], luckie.dir),
  )
  add(
    'metal',
    wallQuad(luckie.at(slot[1]), luckie.at(slot[1], -slotBack), slot[2], slot[3], neg(luckie.dir)),
  )
  const slotWindows = ROWS.map(([y0, y1]): Hole => [slot[0] + 0.5, slot[1] - 0.5, y0, y1])
  face(
    'metal',
    luckie,
    slot[2],
    slot[3],
    [[-1, slot[0], -1, 99], [slot[1], 99, -1, 99], ...slotWindows],
    -slotBack,
  )
  for (const h of slotWindows) reveal('metal', luckie, h, 0.15, -slotBack)

  // the plaza side: shops in the columns between stone piers, the porch at the corner end
  const plazaCols = columns(plaza.len, WIDE_PITCH)
  const shops: Hole[] = plazaCols.slice(0, -1).map((c) => [...windowIn(c, WIDE), 0, 4.4])
  const plazaUpper = rows(plazaCols, WIDE)
  // the ground floor stops at the porch (b 4.6)
  const porchAt = plaza.len - (4.6 - CUT)
  const notPorch: Hole = [porchAt, plaza.len + 1, -1, ARCADE]
  face('stone', plaza, 0, BASE, [...shops, notPorch])
  face('brick', plaza, BASE, PARAPET - COPING, [...shops, ...plazaUpper, notPorch])
  for (const h of shops) reveal('stone', plaza, h, IN)
  for (const h of plazaUpper) reveal('brick', plaza, h, 0.25)
  for (const h of [...shops, ...plazaUpper]) brow(plaza, [h[0], h[1]], h[3])
  shops.forEach((h, i) => foot(plaza, shops[i - 1]?.[1] ?? 0, h[0]))
  foot(plaza, shops.at(-1)![1], porchAt - 0.2)
  // the porch's end on the plaza side
  add('stone', wallQuad(plaza.at(porchAt), plaza.at(porchAt, -IN), 0, BASE, plaza.dir))
  add('brick', wallQuad(plaza.at(porchAt), plaza.at(porchAt, -IN), BASE, ARCADE, plaza.dir))

  // poplar st and forsyth st: a window in each column on the ground floor too
  for (const s of [poplar, forsyth]) {
    const cols = columns(s.len, PITCH)
    const low: Hole[] = cols.map((c) => [...windowIn(c, WINDOW), 0.6, 4.2])
    const high = rows(cols, WINDOW)
    face('stone', s, 0, BASE, low)
    face('brick', s, BASE, PARAPET - COPING, [...low, ...high])
    for (const h of low) reveal('stone', s, h, IN)
    for (const h of high) reveal('brick', s, h, 0.25)
    for (const h of [...low, ...high]) brow(s, [h[0], h[1]], h[3])
  }

  // the corner cuts: plain brick on a stone base, the east one over the porch behind the bay
  for (const s of [cuts.north, cuts.west, cuts.south]) {
    face('stone', s, 0, BASE)
    face('brick', s, BASE, PARAPET - COPING)
  }
  face('brick', cuts.east, ARCADE, PARAPET - COPING)
  bay(add, cuts.east)

  // the coping and the parapet's back, the terrace
  const ring = [luckie, cuts.north, forsyth, cuts.west, poplar, cuts.south, plaza, cuts.east]
  for (const s of ring) {
    ledge('stone', s, 0, s.len, PARAPET - COPING, PARAPET, 0.06, -0.35, 'ft')
    back('brick', s, 0, s.len, TERRACE, PARAPET - COPING, -0.35)
  }
  const corners = [
    L(0, CUT),
    L(CUT, 0),
    L(A - CUT, 0),
    L(A, CUT),
    L(A, B - CUT),
    L(A - CUT, B),
    L(CUT, B),
    L(0, B - CUT),
  ]
  add('stone', flat(inset(corners, 0.35), TERRACE))

  // the fifth floor: dark brown cladding with tall windows, set back SET from the brick
  const fifth = [L(SET, SET), L(A - SET, SET), L(A - SET, B - SET), L(SET, B - SET)]
  const mid = L(A / 2, B / 2)
  for (let i = 0; i < 4; i++) {
    const s = sideOf(fifth[i]!, fifth[(i + 1) % 4]!, mid)
    // no windows on the plaza side (gsu's 2021 photo)
    const wins =
      i === 3 ? [] : columns(s.len, PITCH).map((c): Hole => [...windowIn(c, 2), 15.4, 18.6])
    face('brown', s, TERRACE, ROOF, wins)
    for (const h of wins) reveal('metal', s, h, 0.15)
  }
  add('metal', flat(fifth, ROOF))
  block(add, HIGH.a, HIGH.b, ROOF, HIGH.top)
  block(add, HIGH.a, HIGH_BACK.b, ROOF, HIGH_BACK.top)
  block(add, PENTHOUSE.a, PENTHOUSE.b, ROOF, PENTHOUSE.top)

  // the pergola: brick posts on the parapet between the columns, grey beams from the fifth floor
  // out 1.3m past the brick (lidar)
  const posts: [Side, number[]][] = [
    [luckie, LUCKIE_COLUMNS.map((c) => c[0]).concat(LUCKIE_COLUMNS.at(-1)![1])],
    [plaza, plazaCols.map((c) => c[0]).concat(plazaCols.at(-1)![1])],
    ...[poplar, forsyth].map((s): [Side, number[]] => {
      const cols = columns(s.len, PITCH)
      return [s, cols.map((c) => c[0]).concat(cols.at(-1)![1])]
    }),
  ]
  for (const [s, at] of posts) {
    for (const u of at) {
      ledge('brick', s, u - 0.3, u + 0.3, PARAPET, POST_TOP, 0, -0.6, 'fbet')
      ledge('stone', s, u - 0.35, u + 0.35, POST_TOP - 0.15, POST_TOP, 0.05, -0.65, 'fbelt')
    }
    ledge('metal', s, 0, s.len, POST_TOP, BEAMS[0] + 0.25, -0.15, -0.45, 'fbelt')
    for (let u = 0.8; u < s.len; u += 1.6)
      ledge('metal', s, u - 0.08, u + 0.08, BEAMS[0] + 0.1, BEAMS[1], 1.3, -SET, 'fbelt')
  }

  // brown downpipes down every other pier on luckie st and the plaza side
  for (const [s, cols] of [
    [luckie, LUCKIE_COLUMNS],
    [plaza, plazaCols],
  ] as const)
    cols.slice(1).forEach(([u], i) => {
      if (i % 2 === 0) ledge('brown', s, u - 0.08, u + 0.08, 0.3, PARAPET - COPING, 0.16, 0, 'fet')
    })

  // the name on the parapet over the first columns from the corner (gsu's 2021 photo)
  const name = luckie.at(9.5, 0.03)
  signs.push({
    x: name.x,
    y: (ROWS[1]![1] + PARAPET - COPING) / 2 + 0.05,
    z: name.z,
    rot: Math.atan2(luckie.o.x, luckie.o.z),
    text: 'HELEN M. ADERHOLD LEARNING CENTER',
    letters: true,
    size: 0.5,
    color: '#3b3631',
    weight: 600,
  })

  // blocks hidden inside the walls for the shadows: the building is hollow over the ground
  // floor and the glass doesn't cast (landmark.ts core)
  core('brick', inset(outline, 0.4), CEILING, FLOOR2)
  core('brick', inset(corners, 1), FLOOR2, TERRACE - 0.05)
  core('brown', inset(fifth, 0.4), TERRACE, ROOF - 0.05)

  // inside the ground floor: storefronts all round but on the corner cuts
  const key = (p: Point) => `${p.x},${p.z}`
  const glassFrom = new Set([0, 1, 5, 7, 9].map((i) => key(outline[i]!)))
  insideWalls(inside, outline, door, (p) => glassFrom.has(key(p)))

  return {
    parts: merged(),
    inside,
    signs,
    first: ['brick', 'stone'],
    noShadow: ['glass'],
  }
}

const neg = (v: Point) => ({ x: -v.x, z: -v.z })

// the glass bay on the corner at peachtree: out 0.9m from the corner cut, from over the porch
// to the parapet, grey bands at each floor with a strip of small lights and glass between (gsu's
// 2020 and 2021 photos)
function bay(add: (part: Part, geo: THREE.BufferGeometry) => void, s: Side) {
  const OUT = 0.9
  const pts = [s.at(0), s.at(0.5, OUT), s.at(s.len - 0.5, OUT), s.at(s.len)]
  const mid = s.at(s.len / 2, -1)
  const STRIPS: Range[] = [
    [ARCADE + 0.45, ROWS[0]![0] - 0.25],
    [ROWS[0]![1] + 0.45, ROWS[1]![0] - 0.25],
  ]
  const bands: Range[] = [
    [ARCADE, ROWS[0]![0]],
    [ROWS[0]![1], ROWS[1]![0]],
    [ROWS[1]![1], PARAPET],
  ]
  for (let i = 0; i < 3; i++) {
    const f = sideOf(pts[i]!, pts[i + 1]!, mid)
    for (const [y0, y1] of bands) add('metal', wallQuad(f.p, f.q, y0, y1, f.o))
    for (const [y0, y1] of ROWS) add('glass', glassQuad(f.p, f.q, y0, y1, f.o))
    // a strip of small lights in the band under each
    for (const [y0, y1] of STRIPS)
      add('glass', glassQuad(f.at(0, 0.01), f.at(f.len, 0.01), y0, y1, f.o))
  }
  add('metal', flat(pts, ARCADE, false))
  add('metal', flat(pts, PARAPET))
}

// a box on the roof in (a, b), brown walls and a grey lid
function block(
  add: (part: Part, geo: THREE.BufferGeometry) => void,
  a: Range,
  b: Range,
  y0: number,
  y1: number,
) {
  const pts = [L(a[0], b[0]), L(a[1], b[0]), L(a[1], b[1]), L(a[0], b[1])]
  const mid = L((a[0] + a[1]) / 2, (b[0] + b[1]) / 2)
  for (let i = 0; i < 4; i++) {
    const s = sideOf(pts[i]!, pts[(i + 1) % 4]!, mid)
    add('brown', wallQuad(s.p, s.q, y0, y1, s.o))
  }
  add('metal', flat(pts, y1))
}
