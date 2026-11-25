import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  flat,
  frame,
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Frame,
  type Hole,
} from './landmark'

// the haas-howell building (gsu's school of music), 75 poplar st at forsyth st in fairlie-
// poplar, 1920. eight floors: two of limestone (tall arches on the ground floor, the entrance
// arch on poplar st with "haas-howell bldg" over it), five of dark red brick with white sash
// windows, a band, an attic floor and a deep white cornice on brackets. the rialto is built
// against its back. from usgs's lidar (2018) and photos (2019 commons, gsu's 2025-2026).
// sources: docs/reference/haas-howell-building.md
//
// drawn square in its own frame and turned into place at the end: x along poplar st from the
// forsyth st corner, z in from poplar st (-z is the street). the ground is poplar st's sidewalk
// at the entrance (322.0m), forsyth st is up to 0.6m higher

export type HaasHowellData = {
  points: number[][]
  height: number
  door?: number[]
}

// brick the upper floors and the penthouse, stone the limestone floors, the belt, the sills and
// the roof, white the cornice, the band and the plant room, glass the sash windows, store the
// ground floor's glass, grille the air conditioners' louvers under the brick floors' windows
export type Part = 'brick' | 'stone' | 'white' | 'glass' | 'store' | 'grille'

export type Range = readonly [number, number]

// the outline's corners on poplar st (the forsyth st one and the alley one), its depth to the
// rialto. the faces on the two streets stand FACE out of it (the outline is the glass line)
export const CORNER = { x: -400.3, z: -252.6 }
export const ALLEY_CORNER = { x: -418.4, z: -274 }
export const DEEP = 16.24
export const FACE = -0.3
const SASH = 0.22

// heights over the entrance (lidar: the roof 353.0m, the cornice's top 353.4, the penthouse
// 358.1, the plant room 355.6)
const ARCHES = 6.2
export const SECOND: Range = [7, 8.9]
const BELT: Range = [9.55, 10.1]
// five brick floors of 3.36m, the windows 0.7m over each
export const FLOOR = 3.36
export const ROWS: Range[] = Array.from({ length: 5 }, (_, k): Range => {
  const y = BELT[1] + k * FLOOR + 0.7
  return [y, y + 2.1]
})
const BAND: Range = [26.95, 27.25]
export const ATTIC: Range = [27.5, 28.95]
const BED: Range = [29.25, 29.65]
const MODILLION: Range = [29.65, 30.35]
const CORONA: Range = [30.35, 31.35]
export const ROOF = 30.95
export const TOP = CORONA[1]
export const PENTHOUSE = { x: [6, 17.5] as Range, z: [5, DEEP - 0.3] as Range, top: 36.1 }
const PLANT = { x: [19, 27.3] as Range, z: [5, 15.4] as Range, top: 33.6 }

// poplar st from the forsyth st corner: two single windows, then five pairs to the alley
// (the 2019 photo up the corner, gsu's 2025 one of the entrance)
const WIDE = 1.15
const MULLION = 0.36
const SINGLES = [1.83, 4.63]
const PAIRS = [8.18, 12.49, 16.8, 21.11, 25.42]
const windowsAt = (m: number, pair: boolean): Range[] =>
  pair
    ? [
        [m - MULLION / 2 - WIDE, m - MULLION / 2],
        [m + MULLION / 2, m + MULLION / 2 + WIDE],
      ]
    : [[m - WIDE / 2, m + WIDE / 2]]
export const POPLAR_WINDOWS = [
  ...SINGLES.flatMap((m) => windowsAt(m, false)),
  ...PAIRS.flatMap((m) => windowsAt(m, true)),
]
// the entrance arch between the 3rd and 4th pairs, its vestibule in to the doors (the outline
// has a notch there), the glass arch under the last pair, blind arches to forsyth st
export const ENTRANCE: Range = [17.3, 20.6]
export const VESTIBULE = 1.2
const ENTRANCE_SPRING = 3.6
const GLASS_ARCH: Range = [23.77, 27.07]
const BLIND = [3.23, 8.18, 12.49]
// forsyth st: six windows, three glazed arches under them
const FORSYTH = Array.from({ length: 6 }, (_, i) => 1.75 + i * 2.55)
const FORSYTH_ARCHES = [3.03, 8.13, 13.23]
// the alley and the rialto side: plain brick, a row of windows each floor
const ALLEY = [2.2, 5.2, 8.2, 11.2, 14.2]
const RIALTO = [3.6, 7.4, 11.2, 15, 18.8, 22.6, 26.4]
// the rialto's roof is about 21.5m up, the windows on that side start over it
const RIALTO_TOP = 21.5

type V = [number, number, number]

/** a flat convex polygon facing n, uvs in meters across it */
export function polygon(pts: V[], n: V) {
  const pos: number[] = []
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[0]!
    let b = pts[i]!
    let c = pts[i + 1]!
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const cross = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ]
    if (cross[0]! * n[0] + cross[1]! * n[1] + cross[2]! * n[2] < 0) [b, c] = [c, b]
    pos.push(...a, ...b, ...c)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => n[i % 3]!),
      3,
    ),
  )
  const up = Math.abs(n[1]) > 0.5
  const uv: number[] = []
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = [pos[i]!, pos[i + 1]!, pos[i + 2]!]
    if (up) uv.push(x, z)
    else uv.push(x * -n[2] + z * n[0], y)
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}

/**
 * Helpers for a building drawn square in its own frame: faces along x at some z (s -1 faces the
 * street, -z) and along z at some x, boxes, walls with holes, window reveals and round headed
 * arches. place() turns it all into the frame at the end
 */
export function kit<P extends string>(add: (part: P, geo: THREE.BufferGeometry) => void) {
  const fz = (part: P, z: number, x0: number, x1: number, y0: number, y1: number, s: number) => {
    if (x1 - x0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad({ x: x0, z }, { x: x1, z }, y0, y1, { x: 0, z: s }, x0))
  }
  const fx = (part: P, x: number, z0: number, z1: number, y0: number, y1: number, s: number) => {
    const [a, c] = z0 < z1 ? [z0, z1] : [z1, z0]
    if (c - a > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad({ x, z: a }, { x, z: c }, y0, y1, { x: s, z: 0 }, a))
  }
  const lid = (part: P, x: Range, z: Range, y: number, up = true) => {
    const pts: Point[] = [
      { x: x[0], z: z[0] },
      { x: x[1], z: z[0] },
      { x: x[1], z: z[1] },
      { x: x[0], z: z[1] },
    ]
    add(part, flat(pts, y, up))
  }
  // only the faces asked for: x/X the -x/+x sides, z/Z the -z/+z ones, t top, b bottom
  const box = (part: P, x: Range, z: Range, y: Range, faces = 'xXzZtb') => {
    if (faces.includes('x')) fx(part, x[0], z[0], z[1], y[0], y[1], -1)
    if (faces.includes('X')) fx(part, x[1], z[0], z[1], y[0], y[1], 1)
    if (faces.includes('z')) fz(part, z[0], x[0], x[1], y[0], y[1], -1)
    if (faces.includes('Z')) fz(part, z[1], x[0], x[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, x, z, y[1])
    if (faces.includes('b')) lid(part, x, z, y[0], false)
  }
  // a face along x at z with holes [x0, x1, y0, y1] cut out
  const holedZ = (
    part: P,
    z: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    holes: Hole[],
    s: number,
  ) => {
    const cut = holes.map(([h0, h1, a, c]): Hole => [h0 - x0, h1 - x0, a, c])
    for (const [p0, p1, a, c] of solidPieces(x1 - x0, y0, y1, cut))
      fz(part, z, x0 + p0, x0 + p1, a, c, s)
  }
  // along z at x, holes are [z0, z1, y0, y1]
  const holedX = (
    part: P,
    x: number,
    z0: number,
    z1: number,
    y0: number,
    y1: number,
    holes: Hole[],
    s: number,
  ) => {
    const cut = holes.map(([h0, h1, a, c]): Hole => [h0 - z0, h1 - z0, a, c])
    for (const [p0, p1, a, c] of solidPieces(z1 - z0, y0, y1, cut))
      fx(part, x, z0 + p0, z0 + p1, a, c, s)
  }
  // a hole in a z face: its sides, sill and head back to `to`, and the glass there
  const revealZ = (part: P, [x0, x1, y0, y1]: Hole, z: number, to: number, pane?: P) => {
    const s = Math.sign(z - to)
    fx(part, x0, z, to, y0, y1, 1)
    fx(part, x1, z, to, y0, y1, -1)
    const zr: Range = [Math.min(z, to), Math.max(z, to)]
    if (y0 > 0.01) lid(part, [x0, x1], zr, y0)
    lid(part, [x0, x1], zr, y1, false)
    if (pane) add(pane, glassQuad({ x: x0, z: to }, { x: x1, z: to }, y0, y1, { x: 0, z: s }))
  }
  const revealX = (part: P, [z0, z1, y0, y1]: Hole, x: number, to: number, pane?: P) => {
    const s = Math.sign(x - to)
    fz(part, z0, Math.min(x, to), Math.max(x, to), y0, y1, 1)
    fz(part, z1, Math.min(x, to), Math.max(x, to), y0, y1, -1)
    const xr: Range = [Math.min(x, to), Math.max(x, to)]
    if (y0 > 0.01) lid(part, xr, [z0, z1], y0)
    lid(part, xr, [z0, z1], y1, false)
    if (pane) add(pane, glassQuad({ x, z: z0 }, { x, z: z1 }, y0, y1, { x: s, z: 0 }))
  }

  /**
   * A round headed opening in a face along x at z = w (axis 'z') or along z at x = w (axis
   * 'x'), the hole [u0, u1, y0, spring + half its width] cut by the caller: the stone filling
   * the corners over the curve, the jambs and the curved soffit back to `to`, and what's at the
   * back: glass (with aPane, its round top too) or a flat panel
   */
  const arch = (
    part: P,
    axis: 'x' | 'z',
    [u0, u1]: Range,
    y0: number,
    spring: number,
    w: number,
    to: number,
    back: P,
    pane: boolean,
  ) => {
    // (along the face, up, out of it) to the frame
    const at = (u: number, y: number, d: number): V => (axis === 'z' ? [u, y, d] : [d, y, u])
    const s = Math.sign(w - to)
    const out = at(0, 0, s)
    const r = (u1 - u0) / 2
    const m = (u0 + u1) / 2
    const top = spring + r
    const n = 10
    const arc = Array.from({ length: n + 1 }, (_, i): [number, number] => {
      const t = Math.PI - (i / n) * Math.PI
      return [m + Math.cos(t) * r, spring + Math.sin(t) * r]
    })
    const half = n / 2
    add(
      part,
      polygon([at(u0, top, w), ...arc.slice(0, half + 1).map(([u, y]) => at(u, y, w))], out),
    )
    add(part, polygon([at(u1, top, w), ...arc.slice(half).map(([u, y]) => at(u, y, w))], out))
    const jamb = (u: number, into: number) =>
      add(
        part,
        polygon([at(u, y0, w), at(u, y0, to), at(u, spring, to), at(u, spring, w)], at(into, 0, 0)),
      )
    jamb(u0, 1)
    jamb(u1, -1)
    if (y0 > 0.01)
      add(part, polygon([at(u0, y0, w), at(u1, y0, w), at(u1, y0, to), at(u0, y0, to)], [0, 1, 0]))
    for (let i = 0; i < n; i++) {
      const [au, ay] = arc[i]!
      const [bu, by] = arc[i + 1]!
      const mu = (au + bu) / 2 - m
      const my = (ay + by) / 2 - spring
      const l = Math.hypot(mu, my)
      const into = at(-mu / l, -my / l, 0)
      add(part, polygon([at(au, ay, w), at(bu, by, w), at(bu, by, to), at(au, ay, to)], into))
    }
    // the back: the rectangle up to the spring and the half disc over it
    const backFace = (geo: THREE.BufferGeometry, y: number, h: number) => {
      if (pane) {
        const uv = geo.getAttribute('uv')
        for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) - y)
        const size = [u1 - u0, h, (((m * 7.13 + to * 3.7) % 1) + 1) % 1]
        geo.setAttribute(
          'aPane',
          new THREE.Float32BufferAttribute(Array.from({ length: uv.count }, () => size).flat(), 3),
        )
      }
      add(back, geo)
    }
    const rect = [at(u0, y0, to), at(u1, y0, to), at(u1, spring, to), at(u0, spring, to)]
    backFace(polygon(rect, out), y0, spring - y0)
    backFace(
      polygon(
        arc.map(([u, y]) => at(u, y, to)),
        out,
      ),
      spring,
      r,
    )
    return top
  }

  return { fz, fx, lid, box, holedZ, holedX, revealZ, revealX, arch }
}

// local (x along, z in) to the world, for a frame from `from` along the front: -z is out of
// the frame's left side (its `out`)
export function placer(f: Frame, from: Point) {
  const m = new THREE.Matrix4().set(
    f.along.x,
    0,
    -f.out.x,
    from.x,
    0,
    1,
    0,
    0,
    f.along.z,
    0,
    -f.out.z,
    from.z,
    0,
    0,
    0,
    1,
  )
  const inverse = m.clone().invert()
  return {
    geo: (g: THREE.BufferGeometry) => g.applyMatrix4(m),
    point: (x: number, z: number): Point => ({
      x: from.x + f.along.x * x - f.out.x * z,
      z: from.z + f.along.z * x - f.out.z * z,
    }),
    local: (p: Point): Point => {
      const v = new THREE.Vector3(p.x, 0, p.z).applyMatrix4(inverse)
      return { x: v.x, z: v.z }
    },
    // a sign on a face facing (nx, nz) in the frame
    rot: (nx: number, nz: number) => {
      const w = { x: f.along.x * nx - f.out.x * nz, z: f.along.z * nx - f.out.z * nz }
      return Math.atan2(w.x, w.z)
    },
  }
}

export function haasHowellGeometry(b: HaasHowellData) {
  const { add, core, inside, merged } = collect<Part>()
  const { fz, fx, lid, box, holedZ, holedX, revealZ, revealX, arch } = kit<Part>(add)
  const signs: Sign[] = []
  const f = frame(CORNER, ALLEY_CORNER)
  const place = placer(f, CORNER)
  const LEN = f.len
  const outline = b.points.map(([x, z]) => place.local({ x: x!, z: z! }))
  const door = b.door ? place.local({ x: b.door[0]!, z: b.door[1]! }) : null
  // the faces: poplar st at z W, forsyth st at x W, the alley at x LEN, the rialto at z DEEP
  const W = FACE

  // poplar st's ground floor, limestone: the entrance arch, the glass arch, the blind arches
  const blind = BLIND.map((m): Range => [m - 1.5, m + 1.5])
  const BLIND_SPRING = 3.3
  const GLASS_SPRING = 3.75
  const halfOf = (r: Range) => (r[1] - r[0]) / 2
  const ground: Hole[] = [
    [ENTRANCE[0], ENTRANCE[1], 0, ENTRANCE_SPRING + halfOf(ENTRANCE)],
    [GLASS_ARCH[0], GLASS_ARCH[1], 0.6, GLASS_SPRING + halfOf(GLASS_ARCH)],
    ...blind.map((r): Hole => [r[0], r[1], 0.6, BLIND_SPRING + halfOf(r)]),
  ]
  holedZ('stone', W, W, LEN, 0, SECOND[0] - 0.4, ground, -1)
  arch('stone', 'z', ENTRANCE, 0, ENTRANCE_SPRING, W, VESTIBULE, 'stone', false)
  arch('stone', 'z', GLASS_ARCH, 0.6, GLASS_SPRING, W, 0, 'store', true)
  for (const r of blind) arch('stone', 'z', r, 0.6, BLIND_SPRING, W, W + 0.15, 'stone', false)
  // the doors at the back of the entrance arch, under a round fanlight with the 75 on it (a
  // smaller arch just off the back wall), and a keystone on the big arch
  const mid = (ENTRANCE[0] + ENTRANCE[1]) / 2
  arch(
    'stone',
    'z',
    [mid - 0.8, mid + 0.8],
    0,
    3,
    VESTIBULE - 0.12,
    VESTIBULE - 0.02,
    'store',
    true,
  )
  const crown = ENTRANCE_SPRING + halfOf(ENTRANCE)
  box('stone', [mid - 0.28, mid + 0.28], [W - 0.08, W], [crown - 0.35, crown + 0.45], 'xXztb')
  signs.push({
    ...place.point(mid, W - 0.03),
    y: 6.1,
    rot: place.rot(0, -1),
    text: 'HAAS · HOWELL · BLDG',
    letters: true,
    size: 0.42,
    color: '#7d766a',
    weight: 500,
  })
  signs.push({
    ...place.point(mid, VESTIBULE - 0.05),
    y: 3.4,
    rot: place.rot(0, -1),
    text: '75',
    letters: true,
    size: 0.3,
    color: '#b08a3c',
    weight: 700,
  })

  // the second floor, still limestone, and the belt over it
  const second = POPLAR_WINDOWS.map(([x0, x1]): Hole => [x0, x1, ...SECOND])
  holedZ('stone', W, W, LEN, SECOND[0] - 0.4, BELT[0], second, -1)
  for (const h of second) revealZ('stone', h, W, W + SASH, 'glass')
  box('stone', [W - 0.25, LEN], [W - 0.25, W], BELT, 'xztb')

  // brick from the belt to the cornice: the five floors, a stone sill under each window, the
  // band, the attic
  const upper = POPLAR_WINDOWS.flatMap(([x0, x1]) =>
    [...ROWS, ATTIC].map((r): Hole => [x0, x1, ...r]),
  )
  holedZ('brick', W, W, LEN, BELT[1], BED[0], upper, -1)
  for (const h of upper) {
    revealZ('brick', h, W, W + SASH, 'glass')
    if (h[2] > ATTIC[0]) continue
    box('stone', [h[0] - 0.08, h[1] + 0.08], [W - 0.06, W], [h[2] - 0.12, h[2]], 'xXztb')
    const m = (h[0] + h[1]) / 2
    fz('grille', W - 0.01, m - 0.32, m + 0.32, h[2] - 0.6, h[2] - 0.32, -1)
  }
  box('stone', [W - 0.08, LEN], [W - 0.08, W], BAND, 'xztb')

  // forsyth st: three glazed arches (doors under a transom, gsu's banners), six windows over them
  const arches = FORSYTH_ARCHES.map((m): Range => [m - 1.9, m + 1.9])
  const fGround = arches.map((r): Hole => [r[0], r[1], 0, ARCHES])
  holedX('stone', W, W, DEEP, 0, SECOND[0] - 0.4, fGround, -1)
  for (const r of arches) arch('stone', 'x', r, 0, ARCHES - 1.9, W, 0, 'store', true)
  const fWindows = FORSYTH.map((m): Range => [m - WIDE / 2, m + WIDE / 2])
  const fSecond = fWindows.map(([z0, z1]): Hole => [z0, z1, ...SECOND])
  holedX('stone', W, W, DEEP, SECOND[0] - 0.4, BELT[0], fSecond, -1)
  for (const h of fSecond) revealX('stone', h, W, W + SASH, 'glass')
  box('stone', [W - 0.25, W], [W, DEEP], BELT, 'xtb')
  const fUpper = fWindows.flatMap(([z0, z1]) => [...ROWS, ATTIC].map((r): Hole => [z0, z1, ...r]))
  holedX('brick', W, W, DEEP, BELT[1], BED[0], fUpper, -1)
  for (const h of fUpper) {
    revealX('brick', h, W, W + SASH, 'glass')
    if (h[2] > ATTIC[0]) continue
    box('stone', [W - 0.06, W], [h[0] - 0.08, h[1] + 0.08], [h[2] - 0.12, h[2]], 'xzZtb')
    const m = (h[0] + h[1]) / 2
    fx('grille', W - 0.01, m - 0.32, m + 0.32, h[2] - 0.6, h[2] - 0.32, -1)
  }
  box('stone', [W - 0.08, W], [W, DEEP], BAND, 'xtb')

  // the alley and the rialto side: plain brick up to the parapet. the rialto covers its side
  // up to about 21.5m, the windows there start over it
  const alley = ALLEY.flatMap((m) =>
    [SECOND, ...ROWS, ATTIC].map((r): Hole => [m - WIDE / 2, m + WIDE / 2, ...r]),
  )
  holedX('brick', LEN, W, DEEP, 0, TOP, alley, 1)
  for (const h of alley) revealX('brick', h, LEN, LEN - SASH, 'glass')
  const rialto = RIALTO.flatMap((m) =>
    [...ROWS, ATTIC]
      .filter((r) => r[0] > RIALTO_TOP)
      .map((r): Hole => [m - WIDE / 2, m + WIDE / 2, ...r]),
  )
  holedZ('brick', DEEP, W, LEN, 0, TOP, rialto, 1)
  for (const h of rialto) revealZ('brick', h, DEEP, DEEP - SASH, 'glass')

  // the cornice on the two streets: a bed moulding, modillions every 0.62m, the deep corona.
  // painted white
  const OUT = 0.75
  box('white', [W - 0.25, LEN], [W - 0.25, W], BED, 'xzb')
  box('white', [W - 0.25, W], [W, DEEP], BED, 'xb')
  fz('white', W - 0.25, W - 0.25, LEN, BED[1], CORONA[0], -1)
  fx('white', W - 0.25, W - 0.25, DEEP, BED[1], CORONA[0], -1)
  box('white', [W - OUT, LEN], [W - OUT, W], CORONA, 'xzb')
  box('white', [W - OUT, W], [W, DEEP], CORONA, 'xb')
  for (let x = W + 0.4; x < LEN - 0.2; x += 0.62)
    box('white', [x - 0.09, x + 0.09], [W - OUT + 0.08, W - 0.25], MODILLION, 'xXzb')
  for (let z = W + 0.4; z < DEEP - 0.2; z += 0.62)
    box('white', [W - OUT + 0.08, W - 0.25], [z - 0.09, z + 0.09], MODILLION, 'xzZb')
  // its ends on the back corners
  fx('white', LEN, W - OUT, W, BED[0], TOP, 1)
  fz('white', DEEP, W - OUT, W, BED[0], TOP, 1)
  lid('white', [W - OUT, LEN], [W - OUT, W + 0.3], TOP)
  lid('white', [W - OUT, W + 0.3], [W + 0.3, DEEP], TOP)
  // the parapet's inside all round, the coping on the back ones, the roof
  const IN = 0.3
  fz('white', W + IN, W + IN, LEN - IN, ROOF, TOP, 1)
  fx('white', W + IN, W + IN, DEEP - IN, ROOF, TOP, 1)
  fx('brick', LEN - IN, W + IN, DEEP - IN, ROOF, TOP, -1)
  fz('brick', DEEP - IN, W + IN, LEN - IN, ROOF, TOP, -1)
  lid('stone', [LEN - IN, LEN], [W + IN, DEEP], TOP)
  lid('stone', [W + IN, LEN - IN], [DEEP - IN, DEEP], TOP)
  lid('stone', [W + IN, LEN - IN], [W + IN, DEEP - IN], ROOF)

  // the penthouse against the rialto side and the plant room next to it
  const P = PENTHOUSE
  box('brick', P.x, P.z, [ROOF, P.top - 0.3], 'xXzZ')
  box('stone', [P.x[0] - 0.05, P.x[1] + 0.05], [P.z[0] - 0.05, P.z[1]], [P.top - 0.3, P.top])
  box('white', PLANT.x, PLANT.z, [ROOF, PLANT.top], 'xXzZt')

  // a block just inside the walls for the shadows: it's empty over the ground floor and the
  // window glass doesn't cast (landmark.ts core)
  const c = SASH + 0.15
  // (behind the entrance arch's vestibule on poplar st, it showed in the arch)
  core('brick', rect([W + c, LEN - c], [VESTIBULE + 0.15, DEEP - c]), CEILING, ROOF - 0.1)

  // inside the ground floor: the arches on the two streets are glass
  const onStreet = (p: Point, q: Point) =>
    (Math.abs(p.z) < 0.1 && Math.abs(q.z) < 0.1) || (Math.abs(p.x) < 0.1 && Math.abs(q.x) < 0.1)
  insideWalls(inside, outline, door, onStreet)

  const parts = merged()
  for (const g of Object.values(parts)) place.geo(g)
  for (const g of [...inside.solid, ...inside.glass]) place.geo(g)

  return {
    parts,
    inside,
    signs,
    first: ['stone', 'brick'],
    // the core casts for the hollow floors
    noShadow: ['glass', 'store', 'grille'],
    // a few pixels from across the street
    near: ['grille'],
  }
}

export const rect = (x: Range, z: Range): Point[] => [
  { x: x[0], z: z[0] },
  { x: x[1], z: z[0] },
  { x: x[1], z: z[1] },
  { x: x[0], z: z[1] },
]
