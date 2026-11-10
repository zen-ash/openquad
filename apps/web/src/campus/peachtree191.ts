import * as THREE from 'three'
import type { Point } from '../game/collision'
import {
  edges,
  flat,
  glassQuad,
  inset,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'
import type { LandmarkGeometry } from './landmarks'

// 191 peachtree tower (1990, johnson/burgee): two towers of pale pink granite joined by a link,
// every outer corner notched, on a base that fills out the corners up to a cornice. glass strips
// up the middle of each face broken by a band every three floors, a column of punched windows
// at each edge, an upper stage with a dome at each corner, and the two open temple crowns on
// top. the crowns are what you see over the rooftops from all over campus, 500m away. from
// usgs's lidar (2018) and lemay's photos from courtland st and campus (2019, cc0). sources:
// docs/reference/191-peachtree.md

export type PeachtreeData = { points: number[][]; height: number; landmark?: object }

// each part is a draw call in every pass. the crowns are lit at night: they're the brick family
// for its uplights, in the granite's color (the bricks are far too small to see from campus)
export type Part = 'granite' | 'glass' | 'crown'

type Pair = [number, number]

// elevations (m navd88, lidar), drawn from peachtree center ave (peachtree st is 9.5m higher)
export const DATUM = 319.3
const y = (e: number) => e - DATUM

// the towers' plan on the lidar's roof lines, going round from the north west: each tower's
// end face, the notched corners, its bay faces north and south, and the link between them
export const PLAN: Pair[] = [
  [-162, -544.6],
  [-156.05, -544.6],
  [-156.05, -549.2],
  [-130.3, -549.2],
  [-130.3, -544.6],
  [-117, -544.6],
  [-117, -549.2],
  [-91.25, -549.2],
  [-91.25, -544.6],
  [-85.3, -544.6],
  [-85.3, -517],
  [-91.25, -517],
  [-91.25, -512.4],
  [-117, -512.4],
  [-117, -517],
  [-130.3, -517],
  [-130.3, -512.4],
  [-156.05, -512.4],
  [-156.05, -517],
  [-162, -517],
]
// the base fills the notches out to the towers' outer faces, the atrium on peachtree st is
// against its west end
const BASE_RECT = { x: [-162, -85.3] as Pair, z: [-549.2, -512.4] as Pair }
const ATRIUM = { x: [-190, -162] as Pair, z: [-559, -509] as Pair, eaves: 356, ridge: 361.5 }
const RIDGE: Pair = [-541, -526]
// the low strip along peachtree center ave
const STRIP = { x: [-85.3, -81.4] as Pair, top: 329.3 }
export const BASE = 365
// the band between the arched lower base and its top three floors
const LOWER = 343.5
export const PARAPET = 523.5
// 50 floors from peachtree center ave, the punched windows' sills and heads in each
export const PITCH = 4.08
export const FLOORS = 50
const SILL = 0.85
const HEAD = 3.25
const floorAt = (n: number) => y(DATUM + n * PITCH)
// the windows: punched ones 2.7m in from a face's edges; four glass strips 2.5m wide, 4.2m apart
// in the middle of each big face. the strips are broken by a granite band every third floor
// (rectified from the courtland st photo). the punched ones are 1.5 x 2.2m for real, they're
// drawn a bit bigger for their deep reveals' shadows, which don't show from campus otherwise
const PUNCHED = 1.7
const EDGE = 2.7
const STRIPS = [-6.3, -2.1, 2.1, 6.3]
const STRIP_W = 2.5
// the link's three columns of punched windows
const LINK = [-3.9, 0, 3.9]
// the strips stop under a frieze at the top
const FRIEZE = 522

// over the parapet each tower has an upper stage, as wide as its bay faces and as deep as its
// end face (lidar), with a dome near each corner, and its crown on that
export const CROWNS = [-143.55, -103.75]
export const MID = -530.8
const STAGE = { half: [12.875, 13.8] as Pair, top: 532, cornice: 0.3 }
const DOMES = { at: [11, 12.2] as Pair, pedestal: [1.4, 534] as Pair, radius: 1.8 }
// the temple: a podium (its top is the roof inside the colonnade), corner piers, two slender
// piers between on each side, the frieze and cornice round the top, a low balustrade on it and a
// tall pedestal with a ball on each corner. the finials are 13.3m apart and 552.3m up (lidar),
// the rest is from the photos
export const TEMPLE = {
  podium: [8.5, 537.5] as Pair,
  corner: [6.65, 1.1] as Pair,
  slender: [2.2, 0.5] as Pair,
  frieze: [7.9, 546.5] as Pair,
  cornice: [8.3, 548, 549] as const,
  balustrade: [8, 7.6, 550.4] as const,
  pedestal: 551.4,
  ball: [0.5, 551.8] as Pair,
  top: 552.3,
}
// how the uplights reach up the crown: its uvs are squashed this much up the walls
const GLOW = 0.25

type Column = { at: number; w: number; strip?: boolean }

// the windows of a face of `kind`, meters along it
function columns(kind: string, len: number): Column[] {
  const mid = len / 2
  if (kind === 'bay' || kind === 'end')
    return [
      { at: EDGE, w: PUNCHED },
      ...STRIPS.map((o) => ({ at: mid + o, w: STRIP_W, strip: true })),
      { at: len - EDGE, w: PUNCHED },
    ]
  if (kind === 'link') return LINK.map((o) => ({ at: mid + o, w: PUNCHED }))
  if (kind === 'wing') return [{ at: mid, w: PUNCHED }]
  return []
}

const kindOf = (len: number) =>
  Math.abs(len - 27.6) < 0.2
    ? 'end'
    : Math.abs(len - 25.75) < 0.2
      ? 'bay'
      : Math.abs(len - 13.3) < 0.2
        ? 'link'
        : Math.abs(len - 5.95) < 0.2
          ? 'wing'
          : 'return'

// it doesn't need the map's outline: the tower, base and atrium are all drawn from the lidar here
export function peachtree191Geometry(): LandmarkGeometry {
  const { add, core, inside, merged } = collect<Part>()

  // flat bits: their uvs are the world's x and z, and the granite's grime darkens toward uv y 0
  // and under it. this block's at z -559..-509, so they go well up out of it
  const lid = (part: Part, c: Point[], at: number, up = true, v = 800) => {
    const geo = flat(c, at, up)
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, part === 'crown' ? v : uv.getY(i) + v)
    add(part, geo)
  }
  // walls up a shape's sides (each facing away from its middle), a lid on top and one under it
  // if it's off the ground
  const box = (part: Part, c: Point[], y0: number, y1: number, bottom = false) => {
    const mx = c.reduce((s, p) => s + p.x, 0) / c.length
    const mz = c.reduce((s, p) => s + p.z, 0) / c.length
    c.forEach((p, i) => {
      const q = c[(i + 1) % c.length]!
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = { x: -o.x, z: -o.z }
      const geo = wallQuad(p, q, y0, y1, o)
      if (part === 'crown') {
        // the uplights shine from the crown's foot
        const uv = geo.getAttribute('uv')
        const pos = geo.getAttribute('position')
        for (let k = 0; k < uv.count; k++) uv.setY(k, (pos.getY(k) - y(STAGE.top)) * GLOW)
      }
      add(part, geo)
    })
    lid(part, c, y1, true, part === 'crown' ? 4 : 800)
    if (bottom) lid(part, c, y0, false, part === 'crown' ? 4 : 800)
  }
  const square = (cx: number, cz: number, hx: number, hz = hx) => [
    { x: cx - hx, z: cz - hz },
    { x: cx + hx, z: cz - hz },
    { x: cx + hx, z: cz + hz },
    { x: cx - hx, z: cz + hz },
  ]

  // a face of the tower from p to q facing out, y0 to y1, with its windows in it: glass flush in
  // the holes (from campus a reveal would be a fraction of a pixel)
  const face = (p: Point, q: Point, out: Point, y0: number, y1: number, holes: Hole[]) => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const at = (a: number) => ({
      x: p.x + ((q.x - p.x) * a) / len,
      z: p.z + ((q.z - p.z) * a) / len,
    })
    for (const [u0, u1, v0, v1] of solidPieces(len, y0, y1, holes))
      add('granite', wallQuad(at(u0), at(u1), v0, v1, out, u0))
    for (const [u0, u1, v0, v1] of holes) add('glass', glassQuad(at(u0), at(u1), v0, v1, out))
  }
  // the windows of floors `from` to `to`, in columns. the strips go in threes with a band
  // between, at floors 49, 46, 43... (the photo has them about a meter lower)
  const shaftWindows = (cols: Column[], from: number, to: number) => {
    const holes: Hole[] = []
    for (const c of cols) {
      const [u0, u1] = [c.at - c.w / 2, c.at + c.w / 2]
      if (c.strip)
        for (let n = from - ((from - 1) % 3); n <= to; n += 3) {
          const [lo, hi] = [Math.max(n, from), Math.min(n + 2, to)]
          holes.push([u0, u1, floorAt(lo) + SILL, Math.min(floorAt(hi) + HEAD, y(FRIEZE))])
        }
      else
        for (let n = from; n <= to; n++) holes.push([u0, u1, floorAt(n) + SILL, floorAt(n) + HEAD])
    }
    return holes
  }
  // nobody sees the north faces, all of campus is south of the tower
  const seen = (out: Point) => out.z > -0.5

  // the shaft, from the base's cornice to the parapet
  // the first floor whose windows are over the cornice
  const first = Math.ceil((y(BASE) + 0.1 - SILL) / PITCH)
  const last = FLOORS - 1
  const plan = PLAN.map(pt)
  for (const { p, q, len, out } of edges(plan)) {
    const kind = kindOf(len)
    const holes = seen(out) ? shaftWindows(columns(kind, len), first, last) : []
    face(p, q, out, y(BASE), y(PARAPET), holes)
  }
  lid('granite', plan, y(PARAPET))

  // the base: the rectangle round the towers up to the cornice. its faces are the towers' and
  // the notches between, the link's in the middle. its top three floors have the strips and
  // punched windows, the lower part tall windows (arched for real)
  {
    const r = square(
      (BASE_RECT.x[0] + BASE_RECT.x[1]) / 2,
      (BASE_RECT.z[0] + BASE_RECT.z[1]) / 2,
      (BASE_RECT.x[1] - BASE_RECT.x[0]) / 2,
      (BASE_RECT.z[1] - BASE_RECT.z[0]) / 2,
    )
    const upper = [8, 10] as const
    for (const { p, q, len, dir, out } of edges(r)) {
      // only the south and east faces: the west is inside the atrium, the north never seen
      const south = out.z > 0.5
      const east = out.x > 0.5
      const holes: Hole[] = []
      if (south || east) {
        // the stretches along this face: the towers' faces and what's between them
        const a = (pp: Point) => (pp.x - p.x) * dir.x + (pp.z - p.z) * dir.z
        const along = plan
          .map(a)
          .filter((v) => v > 0.01 && v < len - 0.01)
          .sort((m, n) => m - n)
        const cuts = [...new Set([0, ...along.map((v) => Math.round(v * 100) / 100), len])]
        for (let i = 1; i < cuts.length; i++) {
          const [s0, s1] = [cuts[i - 1]!, cuts[i]!]
          const kind = kindOf(s1 - s0)
          // the notches' bits of base get one column, like the wings over them
          const cols = (
            kind === 'return' || kind === 'wing' ? columns('wing', s1 - s0) : columns(kind, s1 - s0)
          ).map((c) => ({ ...c, at: c.at + s0 }))
          holes.push(...shaftWindows(cols, upper[0], upper[1]))
          const low = east ? y(STRIP.top) + 1.5 : 3.5
          for (const c of cols) holes.push([c.at - c.w / 2, c.at + c.w / 2, low, y(LOWER) - 2])
        }
      }
      face(p, q, out, 0, y(BASE), holes)
    }
    // the cornice (its top is the base's roof), standing out round the top, and the band over the lower part
    for (const [y0, y1, o] of [
      [BASE - 1.2, BASE, 0.6],
      [LOWER - 1, LOWER, 0.3],
    ] as const) {
      const c = square(
        (BASE_RECT.x[0] + BASE_RECT.x[1]) / 2,
        (BASE_RECT.z[0] + BASE_RECT.z[1]) / 2,
        (BASE_RECT.x[1] - BASE_RECT.x[0]) / 2 + o,
        (BASE_RECT.z[1] - BASE_RECT.z[0]) / 2 + o,
      )
      box('granite', c, y(y0), y(y1), true)
    }
  }

  // the atrium on peachtree st, its roof a ridge along it, glass at the front
  {
    const [x0, x1] = ATRIUM.x
    const [z0, z1] = ATRIUM.z
    const [e, r] = [y(ATRIUM.eaves), y(ATRIUM.ridge)]
    // the west front, with its big window over peachtree st (328.8m), and its gable
    face(pt([x0, z1]), pt([x0, z0]), { x: -1, z: 0 }, 0, e, [[15, 35, y(328.8) + 3, e - 3]])
    add(
      'granite',
      triangles(
        [
          [x0, e, z0],
          [x0, e, z1],
          [x0, r, RIDGE[1]],
          [x0, r, RIDGE[0]],
        ],
        [-1, 0, 0],
      ),
    )
    face(pt([x0, z0]), pt([x1, z0]), { x: 0, z: -1 }, 0, e, [])
    face(pt([x1, z1]), pt([x0, z1]), { x: 0, z: 1 }, 0, e, [])
    face(pt([x1, z0]), pt([x1, BASE_RECT.z[0]]), { x: 1, z: 0 }, 0, e, [])
    face(pt([x1, BASE_RECT.z[1]]), pt([x1, z1]), { x: 1, z: 0 }, 0, e, [])
    // the roof: up from each side to the ridge, flat along it
    for (const [za, zb, ya, yb] of [
      [z0, RIDGE[0], e, r],
      [RIDGE[0], RIDGE[1], r, r],
      [RIDGE[1], z1, r, e],
    ] as const)
      add(
        'granite',
        triangles(
          [
            [x0, ya, za],
            [x1, ya, za],
            [x1, yb, zb],
            [x0, yb, zb],
          ],
          [0, 1, 0],
        ),
      )
  }

  // the low strip along peachtree center ave, a storefront under it
  {
    const [x0, x1] = STRIP.x
    const [z0, z1] = BASE_RECT.z
    face(pt([x1, z0]), pt([x1, z1]), { x: 1, z: 0 }, 0, y(STRIP.top), [[1, z1 - z0 - 1, 0.6, 6.5]])
    face(pt([x0, z1]), pt([x1, z1]), { x: 0, z: 1 }, 0, y(STRIP.top), [])
    face(pt([x1, z0]), pt([x0, z0]), { x: 0, z: -1 }, 0, y(STRIP.top), [])
    lid('granite', square((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2), y(STRIP.top))
  }

  // the link's top, a bit higher in the middle
  box('granite', square((CROWNS[0]! + CROWNS[1]!) / 2, MID, 6.65, 11), y(PARAPET) - 0.3, y(528.5))

  CROWNS.forEach((cx, k) => {
    // the upper stage, on the middle of the tower's bay faces: arched windows (square here)
    // over the strips, a cornice round its top
    const bays = PLAN.filter(([, z]) => z === BASE_RECT.z[0]).map(([x]) => x)
    const bx = (bays[k * 2]! + bays[k * 2 + 1]!) / 2
    const [hx, hz] = STAGE.half
    const stage = square(bx, MID, hx, hz)
    for (const { p, q, len, out } of edges(stage)) {
      const holes: Hole[] = seen(out)
        ? STRIPS.map((o) => [len / 2 + o - 0.8, len / 2 + o + 0.8, y(525), y(529.5)])
        : []
      face(p, q, out, y(PARAPET) - 0.3, y(STAGE.top) - 0.8, holes)
    }
    core('granite', inset(stage, 0.5), y(PARAPET) - 0.5, y(STAGE.top) - 1)
    box(
      'granite',
      square(bx, MID, hx + STAGE.cornice, hz + STAGE.cornice),
      y(STAGE.top) - 0.8,
      y(STAGE.top),
      true,
    )
    // a dome on a pedestal near each corner
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const [dx, dz] = [bx + sx * DOMES.at[0], MID + sz * DOMES.at[1]]
        box('granite', square(dx, dz, DOMES.pedestal[0]), y(STAGE.top), y(DOMES.pedestal[1]))
        const dome = new THREE.SphereGeometry(DOMES.radius, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2)
        dome.translate(dx, y(DOMES.pedestal[1]), dz)
        add('granite', dome.toNonIndexed())
      }

    // the crown
    const t = TEMPLE
    box('crown', square(cx, MID, t.podium[0]), y(STAGE.top), y(t.podium[1]))
    const [c, cw] = t.corner
    const [s, sw] = t.slender
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        box('crown', square(cx + sx * c, MID + sz * c, cw), y(t.podium[1]), y(t.frieze[1]))
        // a slender pier each side of the middle, on all four sides
        box('crown', square(cx + sx * s, MID + sz * c, sw), y(t.podium[1]), y(t.frieze[1]))
        box('crown', square(cx + sx * c, MID + sz * s, sw), y(t.podium[1]), y(t.frieze[1]))
        box('crown', square(cx + sx * c, MID + sz * c, cw * 0.8), y(t.cornice[2]), y(t.pedestal))
        const ball = new THREE.SphereGeometry(t.ball[0], 8, 4)
        ball.translate(cx + sx * c, y(t.ball[1]), MID + sz * c)
        add('crown', ball.toNonIndexed())
      }
    // the frieze, the cornice and the balustrade: square rings over the piers, open in the
    // middle
    const inner = c - cw
    ring(cx, t.frieze[0], inner, y(t.frieze[1]), y(t.cornice[1]))
    ring(cx, t.cornice[0], inner, y(t.cornice[1]), y(t.cornice[2]))
    ring(cx, t.balustrade[0], t.balustrade[1], y(t.cornice[2]), y(t.balustrade[2]))
  })

  // a square ring round (cx, MID), outer and inner half widths: its walls out and in, its top
  // and its underside, open in the middle
  function ring(cx: number, o: number, i: number, y0: number, y1: number) {
    const out = square(cx, MID, o)
    const inn = square(cx, MID, i)
    for (let k = 0; k < 4; k++) {
      const [p, q] = [inn[k]!, inn[(k + 1) % 4]!]
      const [op, oq] = [out[k]!, out[(k + 1) % 4]!]
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      const away = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      // square() goes round clockwise seen from above, so that's out of the middle
      for (const [a, b, d] of [
        [op, oq, away],
        [p, q, { x: -away.x, z: -away.z }],
      ] as const) {
        const geo = wallQuad(a, b, y0, y1, d)
        const uv = geo.getAttribute('uv')
        const pos = geo.getAttribute('position')
        for (let n = 0; n < uv.count; n++) uv.setY(n, (pos.getY(n) - y(STAGE.top)) * GLOW)
        add('crown', geo)
      }
      lid('crown', [op, oq, q, p], y1, true, 4)
      lid('crown', [op, oq, q, p], y0, false, 4)
    }
  }

  // blocks just inside the walls, for the shadows: it's empty, and a low sun shone in the
  // windows on one side and out the other's (landmark.ts core). the shaft, the base under it
  // and the atrium
  core('granite', inset(plan, 0.5), y(BASE) - 1, y(PARAPET) - 0.4)
  const rect = ([x0, x1]: Pair, [z0, z1]: Pair) =>
    square((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2 - 0.5, (z1 - z0) / 2 - 0.5)
  core('granite', rect(BASE_RECT.x, BASE_RECT.z), 0, y(BASE) - 1.3)
  core('granite', rect(ATRIUM.x, ATRIUM.z), 0, y(ATRIUM.eaves) - 0.2)

  return {
    parts: merged(),
    inside,
    signs: [],
    noShadow: ['glass'],
  }
}

// a flat polygon through 3d corners (going round), facing n. uvs in meters
function triangles(c: [number, number, number][], n: [number, number, number]) {
  const geo = new THREE.BufferGeometry()
  const pos: number[] = []
  for (let i = 1; i < c.length - 1; i++) pos.push(...c[0]!, ...c[i]!, ...c[i + 1]!)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  const normal = geo.getAttribute('normal')
  // turn it round if it faces the wrong way
  if (normal.getX(0) * n[0] + normal.getY(0) * n[1] + normal.getZ(0) * n[2] < 0) {
    for (let i = 0; i < pos.length; i += 9)
      for (let k = 0; k < 3; k++) {
        const t = pos[i + 3 + k]!
        pos[i + 3 + k] = pos[i + 6 + k]!
        pos[i + 6 + k] = t
      }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.computeVertexNormals()
  }
  const p = geo.getAttribute('position')
  const uv: number[] = []
  for (let i = 0; i < p.count; i++) {
    const [x, yy, z] = [p.getX(i), p.getY(i), p.getZ(i)]
    uv.push(Math.abs(n[0]) > 0.5 ? z : x, Math.abs(n[1]) > 0.5 ? z + 800 : yy)
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}
