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

// gsu's commerce building, 34 broad st at marietta st (1960, built for the commerce club, it
// had its rooms on the top floor). a plain white box of 16 floors: black granite storefronts
// under a blue canopy that wraps the corner, white panels over them, rows of narrow windows,
// the top floor set back on broad and marietta st. from usgs's lidar (2018) and gsu's photo of
// the corner (2022). no photo of the floors over about 15m was found: the windows up there are
// a guess. sources: docs/reference/commerce-building.md
//
// broad st on the south east (33.2m), marietta st on the south west, a 3m alley on the north
// east and the next building 2m off the back. the ground is broad st's sidewalk (320.6m)

export type CommerceData = {
  points: number[][]
  height: number
  door?: number[]
}

// white the panels, roofs and the canopy's soffit, granite the black ground floor, blue the
// canopy's fascia, glass the windows and storefronts
export type Part = 'white' | 'granite' | 'blue' | 'glass'

const P = (x: number, z: number): Point => ({ x, z })

// the corners (build-campus.mjs): broad at marietta, broad at the alley, the back two
export const S = P(-469.22, -99.15)
export const E = P(-443.72, -120.41)
export const N = P(-461.0, -141.15)
export const W = P(-486.51, -119.9)

// the ground floor, then 3.6m floors. the broad and marietta sides top out at 55.8 (lidar
// 376.4m) with the top floor set back behind a parapet, the roof at 62.6 (383.2m)
export const GROUND = 4.6
export const FLOOR = 3.6
export const FLOORS = Array.from({ length: 14 }, (_, i) => GROUND + i * FLOOR)
export const LEDGE = 55.8
export const ROOF = 62.6
export const SETBACK = 2.5
const PARAPET = 1
// the panels stand out of the outline, the glass sits back in them
const PROUD = 0.2
// windows: one every 3m, a meter wide (narrow slots in the white)
const COLUMN = 3
const SLOT = 1
// the canopy: how far out, its fascia
export const CANOPY = 2.6
const FASCIA: readonly [number, number] = [3.5, 4.4]
// how far the canopy goes round onto marietta st
const WRAP = 11

// a straight face from p to q, o the side facing away from the middle
function sideOf(p: Point, q: Point, inner: Point) {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  let o = { x: dir.z, z: -dir.x }
  if ((inner.x - p.x) * o.x + (inner.z - p.z) * o.z > 0) o = { x: -o.x, z: -o.z }
  const at = (u: number, d = 0) => P(p.x + dir.x * u + o.x * d, p.z + dir.z * u + o.z * d)
  return { p, q, len, dir, o, at }
}
type Side = ReturnType<typeof sideOf>

const MIDDLE = P((S.x + N.x) / 2, (S.z + N.z) / 2)

// slots every COLUMN along a side, centered, in the given floors
function slots(s: Side, floors: number[], w = SLOT, pad = 1.2) {
  const n = Math.floor((s.len - 2 * pad) / COLUMN)
  const first = (s.len - n * COLUMN) / 2 + COLUMN / 2
  return Array.from({ length: n }, (_, i) => first + i * COLUMN).flatMap((c) =>
    floors.map((f): Hole => [c - w / 2, c + w / 2, f + 0.9, f + 2.9]),
  )
}

export function commerceGeometry(b: CommerceData) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null

  const face = (part: Part, s: Side, y0: number, y1: number, holes: Hole[] = [], d = PROUD) => {
    for (const [u0, u1, v0, v1] of solidPieces(s.len, y0, y1, holes))
      add(part, wallQuad(s.at(u0, d), s.at(u1, d), v0, v1, s.o, u0))
  }
  // a window set `depth` into the face at d: its sides, sill, head and glass
  const reveal = (part: Part, s: Side, h: Hole, depth: number, d = PROUD) => {
    const [u0, u1, v0, v1] = h
    add(part, wallQuad(s.at(u0, d), s.at(u0, d - depth), v0, v1, s.dir))
    add(part, wallQuad(s.at(u1, d), s.at(u1, d - depth), v0, v1, { x: -s.dir.x, z: -s.dir.z }))
    const rim = [s.at(u0, d), s.at(u1, d), s.at(u1, d - depth), s.at(u0, d - depth)]
    if (v0 > 0.01) add(part, flat(rim, v0))
    add(part, flat(rim, v1, false))
    add('glass', glassQuad(s.at(u0, d - depth), s.at(u1, d - depth), v0, v1, s.o))
  }
  const pane = (s: Side, h: Hole, d: number) =>
    add('glass', glassQuad(s.at(h[0], d), s.at(h[1], d), h[2], h[3], s.o))

  // the street sides run PROUD past the corner so they meet
  const broad = sideOf(P(S.x - (E.x - S.x) * 0.006, S.z - (E.z - S.z) * 0.006), E, MIDDLE)
  const marietta = sideOf(W, P(S.x + (S.x - W.x) * 0.0074, S.z + (S.z - W.z) * 0.0074), MIDDLE)
  const alley = sideOf(E, N, MIDDLE)
  const back = sideOf(N, W, MIDDLE)

  // ground floor on the streets: storefronts between black granite piers under the canopy
  // (broad st and the corner of marietta st), plain granite on the rest of marietta
  const stores = (s: Side, u0: number, u1: number) => {
    const holes: Hole[] = []
    for (let u = u0 + 0.6; u + 2.4 <= u1 - 0.6 + 0.01; u += 3) holes.push([u, u + 2.4, 0, 3.2])
    return holes
  }
  const broadStores = stores(broad, 0, broad.len)
  face('granite', broad, 0, GROUND, broadStores)
  for (const h of broadStores) reveal('granite', broad, h, 0.35)
  const mStores = stores(marietta, marietta.len - WRAP, marietta.len)
  face('granite', marietta, 0, GROUND, mStores)
  for (const h of mStores) reveal('granite', marietta, h, 0.35)

  // the white over it. broad st is blank to the fifth floor (gsu 2022), the rest has slots
  // from the second. the alley and back sides only where they're over the neighbours
  const broadSlots = slots(broad, FLOORS.slice(4))
  face('white', broad, GROUND, LEDGE, broadSlots)
  for (const h of broadSlots) reveal('white', broad, h, 0.25)
  const mSlots = slots(marietta, FLOORS.slice(1))
  face('white', marietta, GROUND, LEDGE, mSlots)
  for (const h of mSlots) reveal('white', marietta, h, 0.25)
  const aSlots = slots(
    alley,
    FLOORS.filter((f) => f > 40),
    SLOT,
    0.8,
  )
  face('white', alley, 0, ROOF, aSlots, 0)
  for (const h of aSlots) pane(alley, h, 0)
  const bSlots = slots(
    back,
    FLOORS.filter((f) => f > 50),
    SLOT,
    0.8,
  )
  face('white', back, 0, ROOF, bSlots, 0)
  for (const h of bSlots) pane(back, h, 0)

  // the parapet on the two street sides and the top floor 2.5m behind it, glass in white
  // frames. broad's top wall starts at marietta's setback, marietta's stops at broad's
  for (const s of [broad, marietta]) {
    const ends: Hole[] =
      s === broad
        ? [[-1, PROUD + SETBACK, -99, 99]]
        : [[s.len - PROUD - SETBACK, s.len + 1, -99, 99]]
    face('white', s, LEDGE, LEDGE + PARAPET)
    face('white', sideOf(s.q, s.p, MIDDLE), LEDGE, LEDGE + PARAPET, [], -PROUD - 0.25)
    add(
      'white',
      flat(
        [s.at(0, PROUD), s.at(s.len, PROUD), s.at(s.len, -0.25), s.at(0, -0.25)],
        LEDGE + PARAPET,
      ),
    )
    const tops = slots(s, [LEDGE], 1.8).map((h): Hole => [h[0], h[1], LEDGE + 0.6, ROOF - 1.4])
    face('white', s, LEDGE, ROOF, [...ends, ...tops], -SETBACK)
    for (const h of tops) pane(s, h, -SETBACK)
  }
  // the terrace, and the roof over the top floor
  add('white', flat(outline, LEDGE))
  add(
    'white',
    flat(
      [
        broad.at(PROUD + SETBACK, -SETBACK),
        broad.at(broad.len, -SETBACK),
        N,
        marietta.at(0, -SETBACK),
      ],
      ROOF,
    ),
  )

  // the penthouses (lidar 387.4 and 389.7m)
  const box = (
    a: readonly [number, number],
    d: readonly [number, number],
    y: readonly [number, number],
  ) => {
    const c = [
      broad.at(a[0], -d[0]),
      broad.at(a[1], -d[0]),
      broad.at(a[1], -d[1]),
      broad.at(a[0], -d[1]),
    ]
    c.forEach((p, i) => {
      const s = sideOf(p, c[(i + 1) % 4]!, broad.at((a[0] + a[1]) / 2, -(d[0] + d[1]) / 2))
      add('white', wallQuad(s.p, s.q, y[0], y[1], s.o))
    })
    add('white', flat(c, y[1]))
  }
  box([10.5, 22.5], [6, 14], [ROOF, 66.8])
  box([12.5, 21.5], [7, 13.5], [66.8, 69.1])

  // the blue canopy: along broad, round the corner on a curve, a bit along marietta
  const corner = broad.at(0, PROUD)
  const out = CANOPY + PROUD
  const curve = Array.from({ length: 9 }, (_, k) => {
    const t = (k / 8) * (Math.PI / 2)
    const [cb, cm] = [Math.cos(t) * CANOPY, Math.sin(t) * CANOPY]
    return P(
      corner.x + broad.o.x * cb + marietta.o.x * cm,
      corner.z + broad.o.z * cb + marietta.o.z * cm,
    )
  })
  const edge = [broad.at(broad.len, out), ...curve, marietta.at(marietta.len - WRAP, out)]
  const canopy = [
    ...edge,
    marietta.at(marietta.len - WRAP, PROUD),
    corner,
    broad.at(broad.len, PROUD),
  ]
  add('white', flat(canopy, FASCIA[0], false))
  add('white', flat(canopy, FASCIA[1]))
  for (let i = 1; i < edge.length; i++) {
    const s = sideOf(edge[i - 1]!, edge[i]!, corner)
    add('blue', wallQuad(s.p, s.q, FASCIA[0], FASCIA[1], s.o))
  }
  for (const s of [broad, marietta]) {
    const u = s === broad ? broad.len : marietta.len - WRAP
    const end = sideOf(s.at(u, PROUD), s.at(u, out), corner)
    add('blue', wallQuad(end.p, end.q, FASCIA[0], FASCIA[1], end.o))
  }

  // the hidden block that keeps a low sun from shining through the slots
  core('white', inset(outline, 0.8), CEILING, ROOF - 0.1)

  // storefronts on broad st
  const near = (a: Point, c: Point) => Math.hypot(a.x - c.x, a.z - c.z) < 0.05
  insideWalls(
    inside,
    outline,
    door,
    (p, q) => (near(p, S) && near(q, E)) || (near(p, E) && near(q, S)),
  )

  return {
    parts: merged(),
    inside,
    signs,
    first: ['white'],
    noShadow: ['glass'],
  }
}
