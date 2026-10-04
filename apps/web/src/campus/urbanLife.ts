import type { Point } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
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

// the urban life building on the plaza behind student center west. a slab of 11 floors: a
// grid of light precast bands and piers with grey brown brick in between, a slit window
// either side of every pier, and round brick towers at its corners and halfway along its
// long sides that go up past the roof. over the third floor a ledge sticks out all round
// and the floor above it is dark glass set back behind the piers. a low wing toward
// student center west has the doors from the plaza, and the brick box at 140 decatur st
// stands in front (drawn here too). from gsu's photos (2010-2026), commons (2013, 2019),
// mapillary (2017-2021) and esri's satellite images. sources: docs/reference/urban-life.md
//
// on the frame, "a" is meters from the north tower toward the east one, "v" meters in
// toward the west tower. on a wall, "u" is meters along it and "d" meters out from it

export type UrbanLifeData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][]; podium: number[][] }
}

// few parts, each is a draw call in every pass. the glass casts shadows: the building is
// empty inside, and light came through the rows of glass onto the ground behind it
export type Part = 'precast' | 'brick' | 'glass'

// same numbers as build-campus.mjs: the towers, the wing and the bit joining the slab to
// 140 decatur st
export const RADIUS = 3.13
export const WIDTH = 27.5
export const WING = { from: 4.9, to: 21.3, end: -26.3 }
export const LINK = { from: 17.4, to: 37.5, out: 35 }
// the walk through the middle of the wing, from the plaza to the steps up to unity plaza.
// the game's door is in its side by the plaza, under "URBAN LIFE CENTER"
export const PASSAGE = { from: -16.2, to: -10.1 }

// up the slab, from the street (piedmont ave and decatur st are a floor under the plaza): a
// tall ground floor, three floors, the ledge, the glass floor over it, then seven floors
// 3.75m apart and the parapet, 50.8m to the top. the rows are measured on mapillary's 2019
// photo from piedmont ave and the height on commons' 2019 one from courtland st (cameras
// fitted on the towers, usgs ground heights). each row of brick has a band under it
export const GROUND = 5.4
const HEAD = 4.5
export const ROWS: [number, number][] = [
  [6.3, 9.2],
  [10.1, 13.1],
  [14.4, 17.3],
  ...Array.from({ length: 7 }, (_, k): [number, number] => [22.5 + 3.75 * k, 25.4 + 3.75 * k]),
]
export const LEDGE: [number, number] = [17.3, 18.5]
export const DEEP: [number, number] = [18.5, 21.4]
export const PARAPET = 47.9
// the towers go a bit higher than the parapet, the roof is under it
export const TOWER_TOP = 52.3
const ROOF = 49.6
// how far the piers and bands stand out from the brick, the ledge, and how far back the
// glass floor is
export const OUT = 0.3
export const LEDGE_OUT = 0.8
export const DEEP_IN = 1.2
// between two towers: a narrow window next to each, then three bays with a pier either
// side (the 2019 commons photo)
const MARGIN = 0.95
const PIER = 0.55
// the slits either side of each pier, and how far back their glass is
export const SLIT = 0.35
const SLIT_IN = 0.15
// the ground floor's round columns, under the piers, out in front of the glass
const COLUMN = { r: 0.33, d: 0.45 }

// the wing: storefront on the ground floor between round columns, three rows of windows in
// long strips (gsu's 2026 photo from the plaza), level with the tower's ledge at the top
// (gsu's 2010 photo), and its towers a bit higher
export const WING_TOP = 18.9
const WING_BANDS: [number, number][] = [
  [GROUND, 6.3],
  [9.2, 10.1],
  [13.1, 14.4],
  [17.3, WING_TOP],
]
const WING_TOWERS = 20.5
// the link and 140 decatur st: brick with a deep precast band round the top (overture has
// 16.6m for it)
export const LINK_TOP = 16.6
const TRIM = 13.4

// a wall of the slab: where things are on it, which bits are between two towers, and what
// stands in front of the low parts (the wing, the link)
type Face = {
  at: (u: number, d?: number) => Point
  o: Point
  sections: [number, number][]
  covers: { u: [number, number]; y: number }[]
}

export function urbanLifeFrame(b: UrbanLifeData) {
  const [n, e] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(n, e)
  const L = f.len
  const W = WIDTH
  // f's "out" is toward the northeast, away from the west tower
  const A = (a: number, v: number) => f.at(a, -v)
  const neg = (p: Point) => ({ x: -p.x, z: -p.z })
  const faces: Record<'ne' | 'se' | 'sw' | 'nw', Face> = {
    ne: {
      at: (u, d = 0) => A(u, -d),
      o: f.out,
      sections: [
        [RADIUS, L / 2 - RADIUS],
        [L / 2 + RADIUS, L - RADIUS],
      ],
      covers: [],
    },
    se: {
      at: (u, d = 0) => A(L + d, u),
      o: f.along,
      sections: [[RADIUS, W - RADIUS]],
      covers: [],
    },
    sw: {
      at: (u, d = 0) => A(L - u, W + d),
      o: neg(f.out),
      sections: [
        [RADIUS, L / 2 - RADIUS],
        [L / 2 + RADIUS, L - RADIUS],
      ],
      covers: [{ u: [L - LINK.to, L - LINK.from], y: LINK_TOP }],
    },
    nw: {
      at: (u, d = 0) => A(-d, W - u),
      o: neg(f.along),
      sections: [[RADIUS, W - RADIUS]],
      covers: [{ u: [W - WING.to, W - WING.from], y: WING_TOP }],
    },
  }
  return { f, A, L, W, faces }
}

// the piers between two towers, [u0, u1]
export function piers(u0: number, u1: number) {
  const bay = (u1 - u0 - 2 * MARGIN - PIER) / 3
  return [0, 1, 2, 3].map((i): [number, number] => {
    const p = u0 + MARGIN + i * bay
    return [p, p + PIER]
  })
}

// the slits of one stretch: next to each tower, and either side of every pier
export function slits(u0: number, u1: number) {
  const ps = piers(u0, u1)
  const out: [number, number][] = [[u0 + 0.15, ps[0]![0] - 0.1]]
  ps.forEach(([p0, p1], i) => {
    if (i > 0) out.push([p0 - 0.1 - SLIT, p0 - 0.1])
    if (i < 3) out.push([p1 + 0.1, p1 + 0.1 + SLIT])
  })
  out.push([ps[3]![1] + 0.1, u1 - 0.15])
  return out
}

// what's left of [u0, u1] x [y0, y1] once the wing or the link is in front of it
function uncovered(face: Face, u0: number, u1: number, y0: number, y1: number): Hole[] {
  const ys = [y0, ...face.covers.map((c) => c.y).filter((y) => y > y0 && y < y1), y1]
  const out: Hole[] = []
  for (let i = 1; i < ys.length; i++) {
    const [ya, yb] = [ys[i - 1]!, ys[i]!]
    let spans: [number, number][] = [[u0, u1]]
    for (const c of face.covers) {
      if (c.y < yb - 0.001) continue
      spans = spans.flatMap(([s0, s1]): [number, number][] =>
        (
          [
            [s0, Math.min(s1, c.u[0])],
            [Math.max(s0, c.u[1]), s1],
          ] as [number, number][]
        ).filter(([a, b]) => b - a > 0.01),
      )
    }
    for (const [s0, s1] of spans) out.push([s0, s1, ya, yb])
  }
  return out
}

export function urbanLifeGeometry(b: UrbanLifeData) {
  const { add, prism, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { f, A, L, W, faces } = urbanLifeFrame(b)
  // which way is out: toward the east end, back toward the wing, and the two long sides
  const ahead = f.along
  const back = { x: -f.along.x, z: -f.along.z }
  const ne = f.out
  const sw = { x: -f.out.x, z: -f.out.z }
  const rect = (a0: number, a1: number, v0: number, v1: number) => [
    A(a0, v0),
    A(a1, v0),
    A(a1, v1),
    A(a0, v1),
  ]
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : A(PASSAGE.to, WING.to - 3.5)

  // a box in front of a wall, from d0 to d1 out: its front, and its top, bottom and ends if
  // they're not against something
  const box = (
    face: Face,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d0: number,
    d1: number,
    part: Part = 'precast',
    { top = true, bottom = true, ends = true } = {},
  ) => {
    const { at, o } = face
    const dir = { x: at(1).x - at(0).x, z: at(1).z - at(0).z }
    add(part, wallQuad(at(u0, d1), at(u1, d1), y0, y1, o, u0))
    const cell = [at(u0, d0), at(u1, d0), at(u1, d1), at(u0, d1)]
    if (top) add(part, flat(cell, y1))
    if (bottom) add(part, flat(cell, y0, false))
    if (ends) {
      add(part, wallQuad(at(u0, d0), at(u0, d1), y0, y1, { x: -dir.x, z: -dir.z }))
      add(part, wallQuad(at(u1, d0), at(u1, d1), y0, y1, dir))
    }
  }

  // the sides of an opening d deep into a wall, facing into it, and its glass at the back
  const recess = (face: Face, u0: number, u1: number, y0: number, y1: number, d: number) => {
    const { at, o } = face
    const dir = { x: at(1).x - at(0).x, z: at(1).z - at(0).z }
    add('glass', glassQuad(at(u0, -d), at(u1, -d), y0, y1, o))
    add('brick', wallQuad(at(u0, -d), at(u0), y0, y1, dir))
    add('brick', wallQuad(at(u1, -d), at(u1), y0, y1, { x: -dir.x, z: -dir.z }))
    const cell = [at(u0, -d), at(u1, -d), at(u1), at(u0)]
    add('brick', flat(cell, y0))
    add('brick', flat(cell, y1, false))
  }

  // a round tower, t in degrees (0 along the slab, 90 in toward the west tower), smooth
  const drum = (a: number, v: number, t0: number, t1: number, y0: number, y1: number) => {
    const c = A(a, v)
    const step = 11.25
    for (let t = t0; t < t1 - 0.01; t += step) {
      const [ta, tb] = [t, t + step].map((x) => (x * Math.PI) / 180) as [number, number]
      const p = A(a + Math.cos(ta) * RADIUS, v + Math.sin(ta) * RADIUS)
      const q = A(a + Math.cos(tb) * RADIUS, v + Math.sin(tb) * RADIUS)
      const mid = { x: (p.x + q.x) / 2 - c.x, z: (p.z + q.z) / 2 - c.z }
      const l = Math.hypot(mid.x, mid.z)
      const geo = wallQuad(
        p,
        q,
        y0,
        y1,
        { x: mid.x / l, z: mid.z / l },
        (t / 360) * 2 * Math.PI * RADIUS,
      )
      const pos = geo.getAttribute('position')
      const normal = geo.getAttribute('normal')
      for (let i = 0; i < pos.count; i++) {
        const [x, z] = [pos.getX(i) - c.x, pos.getZ(i) - c.z]
        const r = Math.hypot(x, z)
        normal.setXYZ(i, x / r, 0, z / r)
      }
      add('brick', geo)
    }
  }
  const lid = (a: number, v: number, y: number) => {
    const ring = Array.from({ length: 32 }, (_, i) => {
      const t = (i / 32) * Math.PI * 2
      return A(a + Math.cos(t) * RADIUS, v + Math.sin(t) * RADIUS)
    })
    add('precast', flat(ring, y))
  }

  for (const face of Object.values(faces)) {
    const { at, o } = face
    const into = { x: -o.x, z: -o.z }
    for (const [s0, s1] of face.sections) {
      const ps = piers(s0, s1)
      const holes = slits(s0, s1)

      // the ground floor: glass on the outline under a dark head, columns in front
      // the game's door (Doors.tsx draws it) is a hole in the glass
      const doorU =
        (door.x - at(0).x) * (at(1).x - at(0).x) + (door.z - at(0).z) * (at(1).z - at(0).z)
      const onFace = Math.abs((door.x - at(0).x) * o.x + (door.z - at(0).z) * o.z) < 0.1
      const doorway: Hole[] =
        onFace && doorU > s0 && doorU < s1
          ? [[doorU - DOOR_WIDTH / 2, doorU + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]]
          : []
      for (const [u0, u1, y0, y1] of uncovered(face, s0, s1, 0, GROUND)) {
        const holes = doorway.map((h): Hole => [h[0] - u0, h[1] - u0, h[2], h[3]])
        for (const [p0, p1, q0, q1] of solidPieces(u1 - u0, y0, Math.min(y1, HEAD), holes))
          add('glass', glassQuad(at(u0 + p0), at(u0 + p1), q0, q1, o))
        if (y1 > HEAD) add('precast', wallQuad(at(u0), at(u1), HEAD, y1, o, u0))
      }
      for (const [p0, p1] of ps) {
        const u = (p0 + p1) / 2
        if (face.covers.some((c) => u > c.u[0] - 0.5 && u < c.u[1] + 0.5)) continue
        prism('precast', circle(at(u, COLUMN.d), COLUMN.r, 12), 0, GROUND)
      }

      // rows of brick with the slits
      for (const [r0, r1] of ROWS)
        for (const [u0, u1, y0, y1] of uncovered(face, s0, s1, r0, r1)) {
          const inRange = holes
            .map(([h0, h1]): Hole => [Math.max(h0, u0) - u0, Math.min(h1, u1) - u0, y0, y1])
            .filter(([h0, h1]) => h1 - h0 > 0.05)
          for (const [p0, p1, q0, q1] of solidPieces(u1 - u0, y0, y1, inRange))
            add('brick', wallQuad(at(u0 + p0), at(u0 + p1), q0, q1, o, u0 + p0))
          for (const [h0, h1] of inRange) recess(face, u0 + h0, u0 + h1, y0, y1, SLIT_IN)
        }

      // the glass floor over the ledge, set back behind the piers
      const dir = { x: at(1).x - at(0).x, z: at(1).z - at(0).z }
      for (const [u0, u1, y0, y1] of uncovered(face, s0, s1, DEEP[0], DEEP[1])) {
        add('glass', glassQuad(at(u0, -DEEP_IN), at(u1, -DEEP_IN), y0, y1, o))
        const cell = [at(u0, -DEEP_IN), at(u1, -DEEP_IN), at(u1), at(u0)]
        if (y1 >= DEEP[1] - 0.01) add('precast', flat(cell, y1, false))
        add('brick', wallQuad(at(u0, -DEEP_IN), at(u0), y0, y1, dir))
        add('brick', wallQuad(at(u1, -DEEP_IN), at(u1), y0, y1, { x: -dir.x, z: -dir.z }))
      }

      // the piers, in front of the brick rows and standing free in the glass floor
      const gaps: [number, number][] = [...ROWS, DEEP]
      for (const [p0, p1] of ps)
        for (const [g0, g1] of gaps)
          for (const [u0, u1, y0, y1] of uncovered(face, p0, p1, g0, g1)) {
            const back = g0 === DEEP[0] ? -DEEP_IN : 0
            box(face, u0, u1, y0, y1, back, OUT, 'precast', { top: false, bottom: false })
          }

      // the bands under each row, the ledge, and the parapet. they run into the towers a
      // little, so there's no gap where they meet the round wall
      const into1 = (u0: number, u1: number, by: number): [number, number] => [
        Math.abs(u0 - s0) < 0.01 ? u0 - by : u0,
        Math.abs(u1 - s1) < 0.01 ? u1 + by : u1,
      ]
      const between = (rows: [number, number][]) =>
        rows.slice(0, -1).map((r, i): [number, number] => [r[1], rows[i + 1]![0]])
      const bands: [number, number][] = [
        [GROUND, ROWS[0]![0]],
        ...between(ROWS.slice(0, 3)),
        [DEEP[1], ROWS[3]![0]],
        ...between(ROWS.slice(3)),
      ]
      for (const [y0, y1] of bands)
        for (const [u0, u1, v0, v1] of uncovered(face, s0, s1, y0, y1)) {
          const [w0, w1] = into1(u0, u1, 0.05)
          box(face, w0, w1, v0, v1, 0, OUT, 'precast', { ends: false })
        }
      for (const [u0, u1, v0, v1] of uncovered(face, s0, s1, LEDGE[0], LEDGE[1])) {
        const [w0, w1] = into1(u0, u1, 0.12)
        box(face, w0, w1, v0, v1, v1 >= LEDGE[1] - 0.01 ? -DEEP_IN : 0, LEDGE_OUT, 'precast', {
          ends: false,
          top: v1 >= LEDGE[1] - 0.01,
        })
      }
      const [w0, w1] = into1(s0, s1, 0.05)
      box(face, w0, w1, PARAPET, b.height, -0.35, OUT, 'precast', { ends: false })
      add('precast', wallQuad(at(w0, -0.35), at(w1, -0.35), ROOF, b.height, into))
    }
  }

  // the towers: round the outside to the top, all the way round over the roof
  const towers: [number, number, number, number, number][] = [
    [0, 0, 90, 360, 0],
    [L / 2, 0, 180, 360, 0],
    [L, 0, 180, 450, 0],
    [L, W, 270, 540, 0],
    // the one on the side toward 140 decatur st starts over the link
    [L / 2, W, 0, 180, LINK_TOP],
    [0, W, 0, 270, 0],
  ]
  for (const [a, v, t0, t1, y0] of towers) {
    drum(a, v, t0, t1, y0, b.height)
    drum(a, v, t1, t0 + 360, ROOF, b.height)
    drum(a, v, 0, 360, b.height, TOWER_TOP)
    lid(a, v, TOWER_TOP)
  }
  add('precast', flat(rect(0.35, L - 0.35, 0.35, W - 0.35), ROOF))
  // two boxes on the roof (esri's satellite image)
  const onRoof = (a0: number, a1: number, v0: number, v1: number, h: number) =>
    prism('precast', rect(a0, a1, v0, v1), ROOF, ROOF + h)
  onRoof(4, 14, 6, 16, 4)
  onRoof(25, 38, 8, 19, 5.5)

  // the wing. its long sides: storefront between round columns, strips of windows over it
  const wingSide = (from: Point, to: Point, o: Point) => {
    const len = Math.hypot(to.x - from.x, to.z - from.z)
    const dir = { x: (to.x - from.x) / len, z: (to.z - from.z) / len }
    const at = (u: number, d = 0) => ({
      x: from.x + dir.x * u + o.x * d,
      z: from.z + dir.z * u + o.z * d,
    })
    const face: Face = { at, o, sections: [[0, len]], covers: [] }
    // the passage goes through under the head
    const uOf = (a: number) => (A(a, 0).x - from.x) * dir.x + (A(a, 0).z - from.z) * dir.z
    const [p0, p1] = [uOf(PASSAGE.from), uOf(PASSAGE.to)].sort((m, n) => m - n) as [number, number]
    add('glass', glassQuad(at(0), at(p0), 0, HEAD, o))
    add('glass', glassQuad(at(p1), at(len), 0, HEAD, o))
    add('precast', wallQuad(at(0), at(len), HEAD, GROUND, o))
    const bays = [len / 3, (2 * len) / 3]
    for (const u of bays) prism('precast', circle(at(u, COLUMN.d), COLUMN.r, 12), 0, GROUND)
    for (const [y0, y1] of WING_BANDS) box(face, 0, len, y0, y1, 0, OUT, 'precast', { ends: false })
    for (const [y0, y1] of WING_BANDS.slice(0, -1).map((b, i): [number, number] => [
      b[1],
      WING_BANDS[i + 1]![0],
    ])) {
      recess(face, 0, len, y0, y1, SLIT_IN)
      for (const u of bays)
        box(face, u - PIER / 2, u + PIER / 2, y0, y1, -SLIT_IN, OUT, 'precast', {
          top: false,
          bottom: false,
        })
    }
  }
  wingSide(A(0, WING.to), A(WING.end, WING.to), sw)
  wingSide(A(WING.end, WING.from), A(0, WING.from), ne)
  // the passage: storefront along both sides (the door's in the one toward the slab) and a
  // ceiling at the top of the storefronts
  const doorV = -f.dOf(door)
  for (const [a, o] of [
    [PASSAGE.from, ahead],
    [PASSAGE.to, back],
  ] as const) {
    const holes: Hole[] =
      a === PASSAGE.to
        ? [[doorV - WING.from - DOOR_WIDTH / 2, doorV - WING.from + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]]
        : []
    for (const [u0, u1, y0, y1] of solidPieces(WING.to - WING.from, 0, HEAD, holes))
      add('glass', glassQuad(A(a, WING.from + u0), A(a, WING.from + u1), y0, y1, o))
  }
  add('precast', flat(rect(PASSAGE.from, PASSAGE.to, WING.from, WING.to), HEAD, false))

  // brick with a precast band at the top: the wing's end, the bits between its towers and
  // its sides, the link's sides
  const brickWall = (p: Point, q: Point, o: Point, top: number) => {
    add('brick', wallQuad(p, q, 0, top - 2.2, o))
    add('precast', wallQuad(p, q, top - 2.2, top, o))
  }
  const wingEnd = WING.end - RADIUS
  brickWall(A(wingEnd, 0), A(wingEnd, W), back, WING_TOP)
  brickWall(A(WING.end, RADIUS), A(WING.end, WING.from), ahead, WING_TOP)
  brickWall(A(WING.end, WING.to), A(WING.end, W - RADIUS), ahead, WING_TOP)
  add('precast', flat(rect(WING.end, DEEP_IN, WING.from, WING.to), WING_TOP))
  add('precast', flat(rect(wingEnd, WING.end, 0, W), WING_TOP))
  for (const [v, t0, t1] of [
    [0, 180, 450],
    [W, 270, 540],
  ] as const) {
    drum(WING.end, v, t0, t1, 0, WING_TOP)
    drum(WING.end, v, 0, 360, WING_TOP, WING_TOWERS)
    lid(WING.end, v, WING_TOWERS)
  }

  // the link to 140 decatur st. it reaches back under the glass floor, or there'd be a hole
  // behind its roof
  brickWall(A(LINK.from, W - DEEP_IN), A(LINK.from, LINK.out), back, LINK_TOP)
  brickWall(A(LINK.to, W - DEEP_IN), A(LINK.to, LINK.out), ahead, LINK_TOP)
  add('precast', flat(rect(LINK.from, LINK.to, W - DEEP_IN, LINK.out), LINK_TOP))
  // 140 decatur st: brick with the deep band round the top
  const podium = b.landmark!.podium.map(pt)
  prism('brick', podium, 0, TRIM, false)
  prism('precast', podium, TRIM, LINK_TOP)

  // letters on the parapet: the name on both ends, gsu near the corners on the long sides
  const letters = (face: Face, u: number, text: string, size: number) => {
    const p = face.at(u, OUT + 0.03)
    signs.push({
      x: p.x,
      y: (PARAPET + b.height) / 2,
      z: p.z,
      rot: Math.atan2(face.o.x, face.o.z),
      text,
      letters: true,
      size,
      color: '#35312e',
      weight: 700,
    })
  }
  letters(faces.nw, W / 2, 'GEORGIA STATE UNIVERSITY', 1.25)
  letters(faces.se, W / 2, 'GEORGIA STATE UNIVERSITY', 1.25)
  letters(faces.ne, 7.5, 'GSU', 2)
  letters(faces.sw, 7.5, 'GSU', 2)
  // the name over the wing's doors, in its middle bay
  const entrance = A(WING.end / 2, WING.to + OUT + 0.06)
  signs.push({
    x: entrance.x,
    y: (GROUND + WING_BANDS[0]![1]) / 2,
    z: entrance.z,
    rot: Math.atan2(sw.x, sw.z),
    text: 'URBAN LIFE CENTER',
    scale: 1.3,
  })

  // inside the ground floor: glass along the straight walls of the slab and the wing
  const on = (p: Point, q: Point, a: number | null, v: number | null) =>
    [p, q].every((x) =>
      a === null ? Math.abs(-f.dOf(x) - v!) < 0.05 : Math.abs(f.aOf(x) - a) < 0.05,
    )
  insideWalls(
    inside,
    outline,
    door,
    (p, q) =>
      [0, W, WING.from, WING.to].some((v) => on(p, q, null, v)) ||
      [0, L, PASSAGE.to].some((a) => on(p, q, a, null)),
  )

  return { parts: merged(), inside, signs, first: ['brick'] }
}
