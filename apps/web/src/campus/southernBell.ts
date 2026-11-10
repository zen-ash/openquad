import * as THREE from 'three'
import type { Point } from '../game/collision'
import {
  flat,
  frame,
  glassQuad,
  inset,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'
import type { LandmarkGeometry } from './landmarks'

// the southern bell telephone company building (51 peachtree center ave), at&t's exchange: the
// 1929 art deco block in buff limestone, built up to 14 floors by 1963, and the microwave shaft
// on it from 1963: bronze, a flared top with horn antennas round its rim and a white lattice
// tower. you see it from the campus edge (edgewood ave, courtland st) over the volunteer center
// deck, 150-200m away. from usgs's lidar (2018) and lemay's photos from campus and courtland st
// (2019, cc0). sources: docs/reference/southern-bell.md
//
// each face is a frame from one corner to the next going round (landmark.ts frame(): a along,
// d out): east from the north east corner, then south, west and north. a pavilion at each end
// of a face goes up the whole way, the bay between them steps back as it goes up

export type SouthernBellData = { points: number[][]; height: number; landmark?: object }

// each part is a draw call in every pass. light is the shaft's white trim, its rim and the
// lattice, grey the louvres in the windows and the horns
export type Part = 'stone' | 'glass' | 'bronze' | 'light' | 'grey'

type Pair = [number, number]
type V3 = [number, number, number]

// elevations (m navd88, lidar), the building's drawn from peachtree center ave at the entrance
export const DATUM = 315.8
const y = (e: number) => e - DATUM

export const PARAPET = 383.5
// the bay in the middle of every face: [meters in from the face, top]. the third is 0.1 under
// the lidar's 374, the windows of the floor over it sit right on it
export const STEPS: Pair[] = [
  [0, 351],
  [2, 364.5],
  [4, 373.9],
  [6, PARAPET],
]
// on the north and south faces the pavilions step back 1m from here up (14.5m under the
// parapet, the step shows at every corner)
export const LEDGE = 369
const LEDGE_IN = 1
// the bays' widths: on the east and west faces, and the north and south ones
export const BAY = { short: 15.5, long: 19.9 }
// 14 floors 4.55m apart, the windows' heads counted down from the top floor's (fitted on the
// photo of the east face)
export const HEAD = 380.9
export const PITCH = 4.55
export const ROWS = 14
export const WINDOW: Pair = [1.25, 2.4]
// window columns, meters from the middle of a pavilion and of a bay: edge, three, edge in the
// pavilions, narrow ones between fins in the long faces' bays
const COLUMNS = {
  short: { pavilion: [-5.6, -2.1, 0, 2.1, 5.6], bay: [-3.5, -1.2, 1.2, 3.5] },
  long: {
    pavilion: [-7, -2.6, 0, 2.6, 7],
    bay: [-8.05, -5.75, -3.45, -1.15, 1.15, 3.45, 5.75, 8.05],
  },
}
const NARROW = 1
// the top two floors of the long faces' pavilions are tall narrow slots between fins
const SLOTS = [-9, -6, -3, 0, 3, 6, 9]
const SLOT = 0.9
// the fins: how wide, how far out, how far over the top they stand
const FIN: [w: number, out: number, over: number] = [0.6, 0.35, 0.8]
// how deep the windows are set in, on the faces with reveals
const REVEAL = 0.3
// about a third of the openings are buff louvres, not glass
const LOUVRES = 0.37

// the penthouse on the roof (lidar)
const PENTHOUSE = { x: [-33, -17] as Pair, z: [-199, -172] as Pair, top: 390 }
// the microwave shaft: its body from the roof, flaring out to the rim, the white fascia round the
// rim, the horns on it and the lattice tower in the middle (lidar and the fitted photos)
export const SHAFT = {
  body: { x: [-48.35, -38.15] as Pair, z: [-178.2, -168] as Pair },
  flare: 414,
  rim: { x: [-50, -36.5] as Pair, z: [-179.9, -166.3] as Pair },
  fascia: [418.5, 420] as Pair,
  horns: 423.8,
  // the lidar's box round it is 4.7 x 5.4m with the dish, the photos have it narrower
  lattice: { x: [-44.35, -40.75] as Pair, z: [-175.7, -171.5] as Pair, top: 443 },
}
// the white trim up each corner of the shaft, and the thin light ribs between
const TRIM = 0.6
const RIB = 1.15

const flip = (o: Point) => ({ x: -o.x, z: -o.z })
const hash = (a: number, b: number) => {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return n - Math.floor(n)
}

// a flat quad through four corners going round, turned to face n. uvs in meters along its first
// edge and its last
function quad(c: V3[], n: V3) {
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const e1 = sub(c[1]!, c[0]!)
  const e2 = sub(c[3]!, c[0]!)
  const face: V3 = [
    e1[1] * e2[2] - e1[2] * e2[1],
    e1[2] * e2[0] - e1[0] * e2[2],
    e1[0] * e2[1] - e1[1] * e2[0],
  ]
  if (dot(face, n) < 0) c = [c[0]!, c[3]!, c[2]!, c[1]!]
  const len = Math.hypot(...face)
  const normal = face.map((v) => (v / len) * Math.sign(dot(face, n))) as V3
  const u1 = sub(c[1]!, c[0]!)
  const l1 = Math.hypot(...u1)
  const u = u1.map((v) => v / l1) as V3
  const w = sub(c[3]!, c[0]!)
  const along = dot(w, u)
  const v1: V3 = [w[0] - u[0] * along, w[1] - u[1] * along, w[2] - u[2] * along]
  const l2 = Math.hypot(...v1) || 1
  const v = v1.map((k) => k / l2) as V3
  const order = [0, 1, 2, 0, 2, 3].map((i) => c[i]!)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(order.flat(), 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      order.flatMap(() => normal),
      3,
    ),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      order.flatMap((p) => [dot(sub(p, c[0]!), u), dot(sub(p, c[0]!), v)]),
      2,
    ),
  )
  return geo
}

export function southernBellGeometry(b: SouthernBellData): LandmarkGeometry {
  const { add, core, inside, merged } = collect<Part>()
  const xs = b.points.map((p) => p[0]!)
  const zs = b.points.map((p) => p[1]!)
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
  const ne = { x: x1, z: z0 }
  const se = { x: x1, z: z1 }
  const sw = { x: x0, z: z1 }
  const nw = { x: x0, z: z0 }

  // flat bits: their uvs are the world's x and z, and the stone's grime darkens toward uv y 0 and
  // under it (the ground). this block's at z -212..-163, so they go well up out of it
  const lid = (part: Part, c: Point[], at: number, up = true) => {
    const geo = flat(c, at, up)
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + 400)
    add(part, geo)
  }
  // a box standing on the ground plan c (going round), its sides and top
  const box = (part: Part, c: Point[], y0: number, y1: number) => {
    const mx = c.reduce((s, p) => s + p.x, 0) / c.length
    const mz = c.reduce((s, p) => s + p.z, 0) / c.length
    c.forEach((p, i) => {
      const q = c[(i + 1) % c.length]!
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = flip(o)
      add(part, wallQuad(p, q, y0, y1, o))
    })
    lid(part, c, y1)
  }
  const rect = ([a0, a1]: Pair, [b0, b1]: Pair) =>
    [pt([a0, b0]), pt([a1, b0]), pt([a1, b1]), pt([a0, b1])] as Point[]
  // the louvres' slats run across: their uvs turned so the metal's ribs do
  const louvre = (p: Point, q: Point, y0: number, y1: number, into: Point) => {
    const geo = wallQuad(p, q, y0, y1, into)
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
    add('grey', geo)
  }

  // the four faces, going round
  const faces = [
    { f: frame(ne, se), long: false, detail: 'deep' },
    { f: frame(se, sw), long: true, detail: 'deep' },
    { f: frame(sw, nw), long: false, detail: 'flush' },
    // nobody sees the north face: all of campus is south of it
    { f: frame(nw, ne), long: true, detail: 'none' },
  ] as const

  faces.forEach(({ f, long, detail }, side) => {
    const L = f.len
    const P = (L - (long ? BAY.long : BAY.short)) / 2
    const cols = long ? COLUMNS.long : COLUMNS.short
    // where the pavilions' faces are at a height, and where their top floors start and end
    // along this face (the long faces step in at the corners over the ledge)
    const front = (at: number) => (long && at >= y(LEDGE) ? -LEDGE_IN : 0)
    const ends = (at: number): Pair => (!long && at >= y(LEDGE) ? [LEDGE_IN, L - LEDGE_IN] : [0, L])

    // a wall from a0 to a1 at d, y0 to y1, with windows [a0, a1, sill, head, louvre]
    type Win = [number, number, number, number, boolean]
    const wall = (a0: number, a1: number, d: number, y0: number, y1: number, wins: Win[]) => {
      const holes =
        detail === 'none' ? [] : wins.map(([w0, w1, s, h]): Hole => [w0 - a0, w1 - a0, s, h])
      for (const [u0, u1, v0, v1] of solidPieces(a1 - a0, y0, y1, holes))
        add('stone', wallQuad(f.at(a0 + u0, d), f.at(a0 + u1, d), v0, v1, f.out, a0 + u0))
      if (detail === 'none') return
      for (const [w0, w1, s, h, slats] of wins) {
        const r = detail === 'deep' ? REVEAL : 0
        const [p, q] = [f.at(w0, d - r), f.at(w1, d - r)]
        if (slats) louvre(p, q, s, h, f.out)
        else add('glass', glassQuad(p, q, s, h, f.out))
        if (!r) continue
        add('stone', wallQuad(f.at(w0, d), p, s, h, f.along))
        add('stone', wallQuad(f.at(w1, d), q, s, h, flip(f.along)))
        lid('stone', [f.at(w0, d), f.at(w1, d), q, p], h, false)
      }
    }
    // the windows of a column at a, w wide, on the floors between y0 and y1
    const windows = (a: number, w: number, y0: number, y1: number): Win[] => {
      const out: Win[] = []
      for (let k = 0; k < ROWS; k++) {
        const head = y(HEAD - k * PITCH)
        const sill = head - WINDOW[1]
        if (sill < y0 || head > y1) continue
        out.push([a - w / 2, a + w / 2, sill, head, hash(side * 100 + a, k) < LOUVRES])
      }
      return out
    }
    // a fin standing out of the wall at d, from y0 to over y1
    const fin = (a: number, d: number, y0: number, y1: number) => {
      const [w, out, over] = FIN
      const [l, r] = [a - w / 2, a + w / 2]
      const top = y1 + over
      add('stone', wallQuad(f.at(l, d + out), f.at(r, d + out), y0, top, f.out, l))
      add('stone', wallQuad(f.at(l, d), f.at(l, d + out), y0, top, flip(f.along)))
      add('stone', wallQuad(f.at(r, d), f.at(r, d + out), y0, top, f.along))
      lid('stone', [f.at(l, d), f.at(r, d), f.at(r, d + out), f.at(l, d + out)], top)
    }
    const slot = (k: number) => y(HEAD - k * PITCH)

    // the pavilions, each up the whole way
    for (const c of [P / 2, L - P / 2]) {
      const [a0, a1] = c < L / 2 ? [0, P] : [L - P, L]
      const wins = cols.pavilion.flatMap((o) => windows(c + o, WINDOW[0], 0, y(LEDGE)))
      if (long) {
        wall(a0, a1, 0, 0, y(LEDGE), wins)
        // over the ledge: one floor of windows, then the slots up to the parapet between fins
        const top = [
          ...cols.pavilion.flatMap((o) => windows(c + o, WINDOW[0], y(LEDGE), slot(1) - 1)),
          ...SLOTS.map((o): Win => [
            c + o - SLOT / 2,
            c + o + SLOT / 2,
            slot(1) - WINDOW[1],
            slot(0),
            false,
          ]),
        ]
        wall(a0, a1, -LEDGE_IN, y(LEDGE), y(PARAPET), top)
        lid('stone', [f.at(a0, 0), f.at(a1, 0), f.at(a1, -LEDGE_IN), f.at(a0, -LEDGE_IN)], y(LEDGE))
        if (detail !== 'none')
          for (let i = 0; i <= SLOTS.length; i++) {
            const o = i === 0 ? SLOTS[0]! - 1.5 : SLOTS[i - 1]! + 1.5
            fin(c + o, -LEDGE_IN, slot(1) - WINDOW[1], y(PARAPET))
          }
      } else {
        const [e0, e1] = ends(y(LEDGE))
        const all = cols.pavilion.flatMap((o) => windows(c + o, WINDOW[0], 0, y(PARAPET)))
        const low = all.filter((w) => w[3] <= y(LEDGE))
        wall(a0, a1, 0, 0, y(LEDGE), low)
        wall(
          Math.max(a0, e0),
          Math.min(a1, e1),
          0,
          y(LEDGE),
          y(PARAPET),
          all.filter((w) => w[3] > y(LEDGE)),
        )
      }
    }

    // the bay, stepping back. each step's wall with its windows, its top, its sides back to the
    // pavilions, and fins over the windows of the top floors of the middle two
    const [b0, b1] = [P, L - P]
    const mid = L / 2
    const width = long ? NARROW : WINDOW[0]
    STEPS.forEach(([inset, top], i) => {
      const from = i === 0 ? 0 : y(STEPS[i - 1]![1])
      const to = y(top)
      const d = -inset
      wall(
        b0,
        b1,
        d,
        from,
        to,
        cols.bay.flatMap((o) => windows(mid + o, width, from, to)),
      )
      if (i < STEPS.length - 1)
        lid(
          'stone',
          [f.at(b0, d), f.at(b1, d), f.at(b1, -STEPS[i + 1]![0]), f.at(b0, -STEPS[i + 1]![0])],
          to,
        )
      if (i > 0) {
        // the sides, split where the pavilions step back
        const cuts = [from, ...(long && from < y(LEDGE) && to > y(LEDGE) ? [y(LEDGE)] : []), to]
        for (let k = 1; k < cuts.length; k++) {
          const [v0, v1] = [cuts[k - 1]!, cuts[k]!]
          const pf = front(v0)
          add('stone', wallQuad(f.at(b0, pf), f.at(b0, d), v0, v1, f.along))
          add('stone', wallQuad(f.at(b1, pf), f.at(b1, d), v0, v1, flip(f.along)))
        }
      }
      if (detail !== 'none' && (i === 1 || i === 2)) {
        const gaps = cols.bay.slice(1).map((o, k) => (o + cols.bay[k]!) / 2)
        // from the sill of the floor under the top one (they come top floor first)
        const rows = windows(mid + cols.bay[0]!, width, from, to)
        const start = rows[1]?.[2] ?? from
        for (const o of gaps) fin(mid + o, d, start, to)
      }
    })
  })

  // the roof, at the parapet: the outline with the bays 6m in and the long faces 1m in
  {
    const ring: Point[] = []
    for (const { f, long } of faces) {
      const P = (f.len - (long ? BAY.long : BAY.short)) / 2
      const d = long ? -LEDGE_IN : 0
      const [e0, e1] = long ? [0, f.len] : [LEDGE_IN, f.len - LEDGE_IN]
      const deep = -STEPS.at(-1)![0]
      for (const p of [
        f.at(e0, d),
        f.at(P, d),
        f.at(P, deep),
        f.at(f.len - P, deep),
        f.at(f.len - P, d),
        f.at(e1, d),
      ]) {
        const last = ring.at(-1)
        if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.01) ring.push(p)
      }
    }
    if (Math.hypot(ring[0]!.x - ring.at(-1)!.x, ring[0]!.z - ring.at(-1)!.z) < 0.01) ring.pop()
    lid('stone', ring, y(PARAPET))
  }
  box('stone', rect(PENTHOUSE.x, PENTHOUSE.z), y(PARAPET) - 0.5, y(PENTHOUSE.top))

  // blocks just inside the walls, for the shadows: it's empty and a low sun shone in the
  // windows on one side and out the other's (landmark.ts core). a ring like the roof's for
  // each step of the bays, over the ledge with the pavilions 1m in all round
  const cuts = [0, ...STEPS.map(([, top]) => y(top)), y(LEDGE)].sort((m, n) => m - n)
  for (let i = 1; i < cuts.length; i++) {
    const [lo, hi] = [cuts[i - 1]!, cuts[i]!]
    const step = STEPS.find(([, top]) => y(top) > hi - 0.01)![0]
    const pav = lo > y(LEDGE) - 0.01 ? LEDGE_IN : 0
    const ring = faces.flatMap(({ f, long }) => {
      const P = (f.len - (long ? BAY.long : BAY.short)) / 2
      const d = Math.max(step, pav)
      return [
        f.at(pav, -pav),
        f.at(P, -pav),
        f.at(P, -d),
        f.at(f.len - P, -d),
        f.at(f.len - P, -pav),
      ]
    })
    core('stone', inset(ring, 0.5), Math.max(lo - 0.5, 0), hi - 0.1)
  }

  // the shaft
  const { body, rim, lattice } = SHAFT
  const [bx, bz] = [body.x, body.z]
  const shaftFaces = [
    { p: pt([bx[0], bz[1]]), q: pt([bx[1], bz[1]]), o: { x: 0, z: 1 } },
    { p: pt([bx[1], bz[1]]), q: pt([bx[1], bz[0]]), o: { x: 1, z: 0 } },
    { p: pt([bx[1], bz[0]]), q: pt([bx[0], bz[0]]), o: { x: 0, z: -1 } },
    { p: pt([bx[0], bz[0]]), q: pt([bx[0], bz[1]]), o: { x: -1, z: 0 } },
  ]
  const [s0, s1] = [y(PARAPET) - 0.5, y(SHAFT.flare)]
  for (const { p, q, o } of shaftFaces) {
    const f = frame(p, q)
    // frame() puts out to the left: these go round the other way
    const out = (a: number, d: number) => f.at(a, -d)
    add('bronze', wallQuad(p, q, s0, s1, o))
    // thin light ribs between the trims, a bit proud of the panels
    const n = Math.round((f.len - 2 * TRIM) / RIB)
    for (let k = 1; k < n; k++) {
      const a = TRIM + ((f.len - 2 * TRIM) * k) / n
      add('light', wallQuad(out(a - 0.09, 0.06), out(a + 0.09, 0.06), s0, s1, o))
    }
  }
  // the corner trims: a post round each corner, standing out a bit from both faces
  for (const cx of [0, 1])
    for (const cz of [0, 1]) {
      const x = bx[cx]!
      const z = bz[cz]!
      const [sx, sz] = [cx ? -1 : 1, cz ? -1 : 1]
      const c = rect([x - sx * 0.1, x + sx * TRIM], [z - sz * 0.1, z + sz * TRIM])
      box('light', c, s0, s1)
    }
  // the flare out to the rim, the fascia round the rim and its top
  {
    const [r0, r1] = SHAFT.fascia
    const b = rect(bx, bz)
    const r = rect(rim.x, rim.z)
    const [fy, ry] = [y(SHAFT.flare), y(r0)]
    const mx = (bx[0] + bx[1]) / 2
    const mz = (bz[0] + bz[1]) / 2
    b.forEach((p, i) => {
      const q = b[(i + 1) % 4]!
      const [rp, rq] = [r[i]!, r[(i + 1) % 4]!]
      const m = { x: (p.x + q.x) / 2 - mx, z: (p.z + q.z) / 2 - mz }
      const l = Math.hypot(m.x, m.z)
      const n: V3 = [m.x / l, -0.7, m.z / l]
      add(
        'bronze',
        quad(
          [
            [p.x, fy, p.z],
            [q.x, fy, q.z],
            [rq.x, ry, rq.z],
            [rp.x, ry, rp.z],
          ],
          n,
        ),
      )
    })
    box('light', r, ry, y(r1))
  }
  // the horns round the rim: square horns flaring up and out, at the corners and two a side
  {
    const top = y(SHAFT.fascia[1])
    const mx = (rim.x[0] + rim.x[1]) / 2
    const mz = (rim.z[0] + rim.z[1]) / 2
    const [hx, hz] = [(rim.x[1] - rim.x[0]) / 2 - 1.2, (rim.z[1] - rim.z[0]) / 2 - 1.2]
    const spots: Pair[] = []
    for (const t of [-1, -1 / 3, 1 / 3, 1]) {
      spots.push([t * hx, -hz], [t * hx, hz])
      if (Math.abs(t) < 1) spots.push([-hx, t * hz], [hx, t * hz])
    }
    for (const [ox, oz] of spots) {
      const l = Math.hypot(ox, oz)
      const out: V3 = [ox / l, 0, oz / l]
      const side: V3 = [-out[2], 0, out[0]]
      const base: V3 = [mx + ox, top, mz + oz]
      const mouth: V3 = [base[0] + out[0] * 0.5, y(SHAFT.horns), base[2] + out[2] * 0.5]
      const ring = (c: V3, h: number) =>
        [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([i, j]): V3 => [
          c[0] + (out[0] * i! + side[0] * j!) * h,
          c[1],
          c[2] + (out[2] * i! + side[2] * j!) * h,
        ])
      const lo = ring(base, 0.4)
      const hi = ring(mouth, 0.9)
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4
        const m: V3 = [
          (lo[i]![0] + lo[j]![0]) / 2 - base[0],
          0,
          (lo[i]![2] + lo[j]![2]) / 2 - base[2],
        ]
        add('grey', quad([lo[i]!, lo[j]!, hi[j]!, hi[i]!], m))
      }
      add('grey', quad(hi, [0, 1, 0]))
    }
  }
  // the lattice tower: four legs, a ring every 3m, a brace across each side between rings, and
  // the white dish near the top on the north east corner
  {
    const [lx, lz] = [lattice.x, lattice.z]
    const [l0, l1] = [y(SHAFT.fascia[1]), y(lattice.top)]
    // a straight member from p to q, w across: its four sides (two for the thin ones)
    const bar = (p: V3, q: V3, w: number, sides = 4) => {
      const t: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]
      const tl = Math.hypot(...t)
      const dir = t.map((v) => v / tl) as V3
      const ref: V3 = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]
      let s: V3 = [
        dir[1] * ref[2] - dir[2] * ref[1],
        dir[2] * ref[0] - dir[0] * ref[2],
        dir[0] * ref[1] - dir[1] * ref[0],
      ]
      const sl = Math.hypot(...s)
      s = s.map((v) => v / sl) as V3
      const r: V3 = [
        dir[1] * s[2] - dir[2] * s[1],
        dir[2] * s[0] - dir[0] * s[2],
        dir[0] * s[1] - dir[1] * s[0],
      ]
      const h = w / 2
      const at = (c: V3, i: number, j: number): V3 => [
        c[0] + (s[0] * i + r[0] * j) * h,
        c[1] + (s[1] * i + r[1] * j) * h,
        c[2] + (s[2] * i + r[2] * j) * h,
      ]
      const around: Pair[] = [
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ]
      for (let k = 0; k < 4; k += 4 / sides) {
        const [a, b] = [around[k]!, around[(k + 1) % 4]!]
        const n: V3 = [
          s[0] * (a[0] + b[0]) + r[0] * (a[1] + b[1]),
          s[1] * (a[0] + b[0]) + r[1] * (a[1] + b[1]),
          s[2] * (a[0] + b[0]) + r[2] * (a[1] + b[1]),
        ]
        add('light', quad([at(p, ...a), at(p, ...b), at(q, ...b), at(q, ...a)], n))
      }
    }
    const corners: Pair[] = [
      [lx[0], lz[0]],
      [lx[1], lz[0]],
      [lx[1], lz[1]],
      [lx[0], lz[1]],
    ]
    for (const [x, z] of corners) bar([x, l0, z], [x, l1, z], 0.28)
    const rings = Math.round((l1 - l0) / 3)
    for (let k = 1; k <= rings; k++) {
      const at = l0 + ((l1 - l0) * k) / rings
      const below = l0 + ((l1 - l0) * (k - 1)) / rings
      corners.forEach(([x, z], i) => {
        const [nx, nz] = corners[(i + 1) % 4]!
        bar([x, at, z], [nx, at, nz], 0.16, 2)
        // the braces zigzag up each side
        const [p, q] =
          k % 2
            ? [
                [x, z],
                [nx, nz],
              ]
            : [
                [nx, nz],
                [x, z],
              ]
        bar([p[0]!, below, p[1]!], [q[0]!, at, q[1]!], 0.12, 2)
      })
    }
    const dish = new THREE.SphereGeometry(1.3, 8, 6).toNonIndexed()
    dish.translate(lx[1] + 0.6, l1 - 4, lz[0] - 0.6)
    add('light', dish)
  }

  return {
    parts: merged(),
    inside,
    signs: [],
    noShadow: ['glass', 'grey', 'light'],
  }
}
