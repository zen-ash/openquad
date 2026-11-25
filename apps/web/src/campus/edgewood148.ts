import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  edges,
  flat,
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// 148 edgewood ave: georgia railway and power's substation from 1926, gsu's since 1966 (the
// photography department had it), empty for years now. gsu decided in aug 2025 to tear it
// down for a fraternity and sorority plaza, but it's still standing. a four storey red brick
// box, the front three bays wide: a big brick arch in the middle round three columns of
// steel windows over the stone doorway, tall arched windows each side, a stone belt course,
// a dentil cornice under the top floor. the sides and the back are plain brick (other
// buildings stood against them once). from usgs's lidar (2018) and the georgia trust's
// photos (winter 2024-25). sources: docs/reference/148-edgewood.md
//
// it's square to the game's x/z: x along edgewood ave, +z is the street. the ground is the
// sidewalk at the door (303.9m)

export type Edgewood148Data = {
  points: number[][]
  height: number
  door?: number[]
}

// brick for the walls, old for the pale patches on the sides where other buildings stood
// against it (mortar and whitewash left on the brick), stone for the trim, the base, the roof and its skylights, glass the
// steel windows, panel the grey metal panels between them and the back's roll up doors,
// dark the coping and the doors
export type Part = 'brick' | 'old' | 'stone' | 'glass' | 'panel' | 'dark'

type Range = readonly [number, number]

// the outline: the windows' glass (front) and the brick (the rest). the brick on the front is
// 0.2m in front of the glass
export const WEST = 184.7
export const EAST = 200.25
// the outline's east side, on the greek housing's wall
export const LINE = 199.95
export const BACK = -64.6
export const FRONT = -38.8
export const FACE = -38.6
// the middle of the front
export const CX = (WEST + EAST) / 2
// an east strip has a lower roof (lidar), all but the front 3m of it
export const MID = 196.1
export const STRIP = -41.5
// heights over the sidewalk (lidar: parapet 319.85m, roof 319.5, the east strip's roof 316.5
// and its parapet 316.8)
export const TOP = 15.95
export const ROOF = 15.6
export const LOW_ROOF = 12.6
export const LOW_TOP = 12.9
const COPING = 0.25
const IN = 0.3

// the front, from the georgia trust's straight on photo, in meters out from the middle
// (it's symmetric). the stucco base, the tall arched windows each side with a panel at the
// second floor, the windows over them, the belt course the big arch springs from
const BASE = 1.1
const SIDE: Range = [4.72, 6.22]
const SIDE_WIN: Range = [1.24, 7.1]
const SIDE_PANEL: Range = [4.1, 5.04]
const UPPER: Range = [4.77, 6.17]
export const UPPER_WIN: Range = [9.33, 10.9]
const BELT: Range = [8.1, 8.55]
// the arch: outer and inner radius, where it springs (a bit over the belt course, its sides
// go straight down from there). the brick inside it is set back a bit
export const ARCH = { outer: 2.6, inner: 2.15, spring: 8.87, back: 0.08 }
// three columns of windows in the arch, the middle one over the door. each has a panel at
// every floor
const NARROW: Range = [1.42, 2.07]
const MIDDLE = 0.71
const COLUMN_PANELS: Range[] = [
  [4.0, 5.04],
  [7.4, 8.2],
]
// the doorway in its stone surround, the hood on two brackets
export const DOOR: Range = [0.2, 2.85]
const DOOR_W = 0.69
const SURROUND = 1.15
const HOOD = { w: 1.43, y: [3.5, 3.98] as Range, out: 0.45 }
// the cornice under the top floor (lidar has its top 0.9m out at 316.2m, the photo a bit
// higher), the dentils under it, the keystone over the arch
export const CORNICE: Range = [11.55, 12.56]
const DENTIL = { w: 0.2, step: 0.42, out: 0.25, top: 11.95 }
const KEY: Range = [10.95, 11.55]
// the top floor: five windows over the columns below, a stone band over them
export const ATTIC: Range = [12.8, 14.3]
const BAND: Range = [14.5, 14.82]

// the back, from a photo by the alley: a door, a window and two roll up doors, small windows
// over them (the east strip's side). painted red at the bottom for real, brick here
const BACK_DOORS: Hole[] = [
  [198.4, 199.4, 0, 2.3],
  [191.6, 194.4, 0, 3.2],
  [187.6, 190.2, 0, 3.2],
]
const BACK_WINDOWS: Hole[] = [
  [196.4, 197.4, 1, 2.6],
  [198.3, 199.3, 6.3, 8.3],
  [196.3, 197.3, 6.3, 8.3],
  [198.3, 199.3, 9.9, 11.9],
  [196.3, 197.3, 9.9, 11.9],
  [192.0, 194.6, 9.9, 11.9],
  [188.2, 190.8, 9.9, 11.9],
]

// skylights on the roofs (esri's image, lidar has them 0.4m up)
const SKYLIGHTS: [Range, Range, number, number][] = [
  [[187.3, 190.0], [-62, -42.5], ROOF, 0.45],
  [[191.6, 194.2], [-62, -42.5], ROOF, 0.45],
  [[197.2, 199.4], [-58, -45], LOW_ROOF, 0.35],
]

type V3 = [number, number, number]

export function edgewood148Geometry(b: Edgewood148Data) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  // a face at z from x0 to x1 facing +z (s 1, the street) or -z
  const fz = (part: Part, z: number, x0: number, x1: number, y0: number, y1: number, s: number) => {
    if (x1 - x0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad({ x: x0, z }, { x: x1, z }, y0, y1, { x: 0, z: s }, x0))
  }
  // a face at x from z0 to z1 facing +x (s 1) or -x
  const fx = (part: Part, x: number, z0: number, z1: number, y0: number, y1: number, s: number) => {
    const [a, c] = z0 < z1 ? [z0, z1] : [z1, z0]
    if (c - a > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad({ x, z: a }, { x, z: c }, y0, y1, { x: s, z: 0 }, a))
  }
  const rect = (x: Range, z: Range): Point[] => [
    { x: x[0], z: z[0] },
    { x: x[1], z: z[0] },
    { x: x[1], z: z[1] },
    { x: x[0], z: z[1] },
  ]
  const lid = (part: Part, x: Range, z: Range, y: number, up = true) =>
    add(part, flat(rect(x, z), y, up))
  // a box, only the faces asked for: x/X the -x/+x sides, z/Z the -z/+z ones, t top, b bottom
  const box = (part: Part, x: Range, z: Range, y: Range, faces = 'xXzZtb') => {
    if (faces.includes('x')) fx(part, x[0], z[0], z[1], y[0], y[1], -1)
    if (faces.includes('X')) fx(part, x[1], z[0], z[1], y[0], y[1], 1)
    if (faces.includes('z')) fz(part, Math.min(...z), x[0], x[1], y[0], y[1], -1)
    if (faces.includes('Z')) fz(part, Math.max(...z), x[0], x[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, x, z, y[1])
    if (faces.includes('b')) lid(part, x, z, y[0], false)
  }
  // a box sticking out of the front by `out`, from `from` (the face unless said)
  const ledge = (part: Part, x: Range, y: Range, out: number, from = FACE, faces = 'xXZtb') =>
    box(part, x, [from, FACE + out], y, faces)
  // a face along x at z with holes [x0, x1, y0, y1] cut out
  const holedZ = (
    part: Part,
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
  // any flat convex polygon, wound to face n, uvs given per corner
  const poly = (part: Part, pts: V3[], n: V3, uv: [number, number][]) => {
    const pos: number[] = []
    const uvs: number[] = []
    for (let i = 1; i < pts.length - 1; i++) {
      let tri = [0, i, i + 1]
      const [a, c, d] = tri.map((k) => pts[k]!) as [V3, V3, V3]
      const e1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      const e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]
      const cross = [
        e1[1]! * e2[2]! - e1[2]! * e2[1]!,
        e1[2]! * e2[0]! - e1[0]! * e2[2]!,
        e1[0]! * e2[1]! - e1[1]! * e2[0]!,
      ]
      if (cross[0]! * n[0] + cross[1]! * n[1] + cross[2]! * n[2] < 0) tri = [0, i + 1, i]
      for (const k of tri) {
        pos.push(...pts[k]!)
        uvs.push(...uv[k]!)
      }
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
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    add(part, geo)
  }

  // a round headed opening from x0 to x1, y0 up to its spring and the half round over it: the
  // bit of wall in the two corners over the half round (its hole is a rectangle)
  const N = 10
  const arc = (x0: number, x1: number, spring: number) => {
    const [c, r] = [(x0 + x1) / 2, (x1 - x0) / 2]
    return Array.from({ length: N + 1 }, (_, i) => {
      const t = Math.PI * (1 - i / N)
      return [c + Math.cos(t) * r, spring + Math.sin(t) * r, t] as const
    })
  }
  const corners = (part: Part, x0: number, x1: number, spring: number, z: number) => {
    const pts = arc(x0, x1, spring)
    const top = spring + (x1 - x0) / 2
    const half = N / 2
    const fan = (corner: V3, from: number, to: number) => {
      const ring = [corner, ...pts.slice(from, to + 1).map(([x, y]): V3 => [x, y, z])]
      poly(
        part,
        ring,
        [0, 0, 1],
        ring.map(([x, y]) => [x, y]),
      )
    }
    fan([x0, top, z], 0, half)
    fan([x1, top, z], half, N)
  }
  // its sides, sill and arched head going back from the face at z to `to`, the glass there
  const reveal = (
    part: Part,
    [x0, x1, y0, spring]: Hole,
    z: number,
    to: number,
    pane?: Part,
    sill = true,
  ) => {
    fx(part, x0, to, z, y0, spring, 1)
    fx(part, x1, to, z, y0, spring, -1)
    if (sill && y0 > 0.01) lid(part, [x0, x1], [to, z], y0)
    const pts = arc(x0, x1, spring)
    let along = 0
    for (let i = 0; i < N; i++) {
      const [ax, ay] = pts[i]!
      const [bx, by] = pts[i + 1]!
      const t = (pts[i]![2] + pts[i + 1]![2]) / 2
      const len = Math.hypot(bx - ax, by - ay)
      poly(
        part,
        [
          [ax, ay, z],
          [bx, by, z],
          [bx, by, to],
          [ax, ay, to],
        ],
        [-Math.cos(t), -Math.sin(t), 0],
        [
          [along, z],
          [along + len, z],
          [along + len, to],
          [along, to],
        ],
      )
      along += len
    }
    if (pane)
      add(
        pane,
        glassQuad({ x: x0, z: to }, { x: x1, z: to }, y0, spring + (x1 - x0) / 2, { x: 0, z: 1 }),
      )
  }
  // a half ring of header bricks round an arch at c, from radius r0 to r1, `out` off the face
  const arch = (c: number, r0: number, r1: number, spring: number, out: number) => {
    const zr = FACE + out
    const at = (r: number, t: number, z: number): V3 => [
      c + Math.cos(t) * r,
      spring + Math.sin(t) * r,
      z,
    ]
    const flatUv = (p: V3): [number, number] => [p[0], p[1]]
    for (let i = 0; i < N; i++) {
      const [t0, t1] = [Math.PI * (1 - i / N), Math.PI * (1 - (i + 1) / N)]
      const front = [at(r0, t0, zr), at(r1, t0, zr), at(r1, t1, zr), at(r0, t1, zr)]
      poly('old', front, [0, 0, 1], front.map(flatUv))
      const t = (t0 + t1) / 2
      for (const [r, k] of [
        [r1, 1],
        [r0, -1],
      ] as const) {
        const side = [at(r, t0, FACE), at(r, t1, FACE), at(r, t1, zr), at(r, t0, zr)]
        poly('brick', side, [k * Math.cos(t), k * Math.sin(t), 0], side.map(flatUv))
      }
    }
  }
  // a hole for an arched opening [x0, x1, y0, spring]: the rectangle round it
  const box2d = ([x0, x1, y0, spring]: Hole): Hole => [x0, x1, y0, spring + (x1 - x0) / 2]
  const both = ([a0, a1]: Range): Range[] => [
    [CX - a1, CX - a0],
    [CX + a0, CX + a1],
  ]
  // a panel in front of the glass at `to`
  const panel = (x: Range, y: Range, to: number) =>
    fz('panel', to + 0.02, x[0], x[1], y[0], y[1], 1)

  // the front. the stucco base, the brick from it to the coping with the side windows, the
  // windows over them, the top floor's and the arch cut out
  const sides = both(SIDE).map(([x0, x1]): Hole => [
    x0,
    x1,
    SIDE_WIN[0],
    SIDE_WIN[1] - (x1 - x0) / 2,
  ])
  const uppers = both(UPPER).map(([x0, x1]): Hole => [x0, x1, ...UPPER_WIN])
  const attics = [...both(UPPER), ...both(NARROW), [CX - MIDDLE, CX + MIDDLE] as Range].map(
    ([x0, x1]): Hole => [x0, x1, ...ATTIC],
  )
  const { outer, inner, spring, back } = ARCH
  const recess: Hole = [CX - inner, CX + inner, BASE, spring]
  ledge('stone', [WEST - 0.04, CX - DOOR_W], [0, BASE], 0.04, FACE, 'xXZt')
  ledge('stone', [CX + DOOR_W, EAST], [0, BASE], 0.04, FACE, 'xXZt')
  holedZ(
    'brick',
    FACE,
    WEST,
    EAST,
    BASE,
    TOP - COPING,
    [...sides.map(box2d), ...uppers, ...attics, box2d(recess)],
    1,
  )
  for (const h of sides) {
    corners('brick', h[0], h[1], h[3], FACE)
    reveal('brick', h, FACE, FRONT, 'glass')
    panel([h[0], h[1]], SIDE_PANEL, FRONT)
    const r = (h[1] - h[0]) / 2
    arch((h[0] + h[1]) / 2, r, r + 0.22, h[3], 0.02)
  }
  for (const [x0, x1, y0, y1] of [...uppers, ...attics]) {
    fx('brick', x0, FRONT, FACE, y0, y1, 1)
    fx('brick', x1, FRONT, FACE, y0, y1, -1)
    lid('brick', [x0, x1], [FRONT, FACE], y1, false)
    lid(uppers.some((u) => u[2] === y0) ? 'stone' : 'brick', [x0, x1], [FRONT, FACE], y0)
    add('glass', glassQuad({ x: x0, z: FRONT }, { x: x1, z: FRONT }, y0, y1, { x: 0, z: 1 }))
  }
  // sills under the windows over the side ones
  for (const [x0, x1] of both(UPPER))
    ledge('stone', [x0 - 0.1, x1 + 0.1], [UPPER_WIN[0] - 0.15, UPPER_WIN[0]], 0.08)

  // the arch: its corners on the face, the brick inside it set back, with the three columns
  // of windows and the doorway in that
  corners('brick', recess[0], recess[1], spring, FACE)
  // the arch's ring of header bricks, a lighter tan, a little proud of the wall
  const RING = 0.04
  arch(CX, inner, outer, spring, RING)
  // and its sides, from the base up
  for (const [x0, x1] of both([inner, outer]))
    ledge('brick', [x0, x1], [BASE, spring], RING, FACE, 'xXZ')
  const inset = FACE - back
  reveal('brick', recess, FACE, inset, undefined, false)
  lid('brick', [recess[0], CX - DOOR_W], [inset, FACE], BASE)
  lid('brick', [CX + DOOR_W, recess[1]], [inset, FACE], BASE)
  const narrow = both(NARROW).map(([x0, x1]): Hole => [x0, x1, SIDE_WIN[0], 9.4])
  const middle: Hole = [CX - MIDDLE, CX + MIDDLE, HOOD.y[1], 9.8]
  const doorway: Hole = [CX - DOOR_W, CX + DOOR_W, 0, DOOR[1]]
  holedZ(
    'brick',
    inset,
    recess[0],
    recess[1],
    BASE,
    spring + inner,
    [...[...narrow, middle].map(box2d), doorway],
    1,
  )
  // the base under the arch is the face's, the doorway goes through it
  for (const h of [...narrow, middle]) {
    corners('brick', h[0], h[1], h[3], inset)
    reveal('brick', h, inset, FRONT, 'glass')
    for (const y of COLUMN_PANELS) panel([h[0], h[1]], [Math.max(y[0], h[2]), y[1]], FRONT)
  }
  // the doorway: back from the surround to the doors at the outline, a step in it
  const S = 0.16
  fx('stone', doorway[0], FRONT, inset, 0, DOOR[1], 1)
  fx('stone', doorway[1], FRONT, inset, 0, DOOR[1], -1)
  lid('stone', [doorway[0], doorway[1]], [FRONT, inset], DOOR[1], false)
  box('stone', [doorway[0], doorway[1]], [FRONT, FACE + S], [0, DOOR[0]], 'Zt')
  // the doors: dark glass in black frames, shut
  fz('dark', FRONT, doorway[0], doorway[1], DOOR[0], DOOR[1], 1)
  // the stone surround round it, the brackets and the hood
  for (const [x0, x1] of both([DOOR_W, SURROUND]))
    ledge('stone', [x0, x1], [0, HOOD.y[0]], S, inset)
  ledge('stone', [CX - DOOR_W, CX + DOOR_W], [DOOR[1], HOOD.y[0]], S, inset, 'Zb')
  for (const [x0, x1] of both([SURROUND - 0.3, SURROUND - 0.05]))
    ledge('stone', [x0, x1], [2.75, HOOD.y[0]], 0.36, FACE + S, 'xXZb')
  ledge('stone', [CX - HOOD.w, CX + HOOD.w], HOOD.y, HOOD.out, inset)

  // the belt course to the arch, the keystone at its top
  for (const x of [
    [WEST - 0.04, CX - outer],
    [CX + outer, EAST],
  ] as Range[])
    ledge('stone', x, BELT, 0.12)
  box('stone', [CX - 0.24, CX + 0.24], [FACE - back, FACE + 0.12], KEY, 'xXZb')

  // the cornice: dentils, a band, the corona, the top moulding
  const n = Math.floor((EAST - WEST - 0.2) / DENTIL.step)
  const d0 = CX - ((n - 1) * DENTIL.step) / 2
  for (let i = 0; i < n; i++) {
    const x = d0 + i * DENTIL.step
    ledge(
      'stone',
      [x - DENTIL.w / 2, x + DENTIL.w / 2],
      [CORNICE[0], DENTIL.top],
      DENTIL.out,
      FACE,
      'xXZb',
    )
  }
  ledge('stone', [WEST, EAST], [DENTIL.top, 12.05], 0.3, FACE, 'xXZb')
  ledge('stone', [WEST, EAST], [12.05, 12.4], 0.55, FACE, 'xXZb')
  ledge('stone', [WEST, EAST], [12.4, CORNICE[1]], 0.62, FACE)
  ledge('stone', [WEST, EAST], BAND, 0.08)

  // the west side: plain brick, the stucco base round the corner
  fx('brick', WEST, BACK, FACE, 0, TOP - COPING, -1)
  box('stone', [WEST - 0.04, WEST], [FACE - 3, FACE], [0, BASE], 'xzt')
  // the pale patches: on the west side the old neighbour's walls up to its sloping roof (2022
  // street photos), on the east the edge of one round the corner (2025)
  const patch = (x: number, s: number, pts: [number, number][]) => {
    const ring = pts.map(([z, y]): V3 => [x + s * 0.01, y, z])
    poly('old', ring, [s, 0, 0], pts)
  }
  patch(WEST, -1, [
    [FACE - 0.4, 0],
    [FACE - 0.4, 7],
    [BACK + 0.5, 5],
    [BACK + 0.5, 0],
  ])
  patch(EAST, 1, [
    [FACE - 0.6, 6],
    [FACE - 0.6, 10.8],
    [-45, 9.2],
    [-45, 6],
  ])
  // the east side: the front's 3m return full height, the strip behind lower, the main
  // block's wall over that
  fx('brick', EAST, STRIP, FACE, 0, TOP - COPING, 1)
  fx('brick', EAST, BACK, STRIP, 0, LOW_TOP - COPING, 1)
  fx('brick', MID, BACK, STRIP, LOW_ROOF, TOP - COPING, 1)
  fz('brick', STRIP, MID, EAST, LOW_ROOF, TOP - COPING, -1)
  // the back
  const backHoles = [...BACK_DOORS, ...BACK_WINDOWS]
  holedZ(
    'brick',
    BACK,
    WEST,
    MID,
    0,
    TOP - COPING,
    backHoles.filter((h) => h[1] <= MID),
    -1,
  )
  holedZ(
    'brick',
    BACK,
    MID,
    EAST,
    0,
    LOW_TOP - COPING,
    backHoles.filter((h) => h[0] >= MID),
    -1,
  )
  // the ground floor's openings flat on the wall (nothing goes behind the outline down there,
  // the inside walls are on it), the windows upstairs set in
  for (const [x0, x1, y0, y1] of BACK_DOORS)
    fz(y1 > 3 ? 'panel' : 'dark', BACK - 0.01, x0, x1, y0, y1, -1)
  for (const [x0, x1, y0, y1] of BACK_WINDOWS.filter((h) => h[2] < 3))
    add(
      'glass',
      glassQuad({ x: x1, z: BACK - 0.01 }, { x: x0, z: BACK - 0.01 }, y0, y1, { x: 0, z: -1 }),
    )
  for (const [x0, x1, y0, y1] of BACK_WINDOWS.filter((h) => h[2] > 3)) {
    fx('brick', x0, BACK, BACK + 0.15, y0, y1, 1)
    fx('brick', x1, BACK, BACK + 0.15, y0, y1, -1)
    lid('brick', [x0, x1], [BACK, BACK + 0.15], y0)
    lid('brick', [x0, x1], [BACK, BACK + 0.15], y1, false)
    add(
      'glass',
      glassQuad({ x: x1, z: BACK + 0.15 }, { x: x0, z: BACK + 0.15 }, y0, y1, { x: 0, z: -1 }),
    )
  }

  // the roofs, the parapets' insides and the coping on top, dark metal lipped over the brick
  const high: Point[] = [
    { x: WEST + IN, z: BACK + IN },
    { x: MID - IN, z: BACK + IN },
    { x: MID - IN, z: STRIP + IN },
    { x: EAST - IN, z: STRIP + IN },
    { x: EAST - IN, z: FACE - IN },
    { x: WEST + IN, z: FACE - IN },
  ]
  const highOut: Point[] = [
    { x: WEST, z: BACK },
    { x: MID, z: BACK },
    { x: MID, z: STRIP },
    { x: EAST, z: STRIP },
    { x: EAST, z: FACE },
    { x: WEST, z: FACE },
  ]
  add('stone', flat(high, ROOF))
  parapet(high, highOut, ROOF, TOP)
  const low: Point[] = [
    { x: MID, z: BACK + IN },
    { x: EAST - IN, z: BACK + IN },
    { x: EAST - IN, z: STRIP },
    { x: MID, z: STRIP },
  ]
  add('stone', flat(low, LOW_ROOF))
  fz('brick', BACK + IN, MID, EAST - IN, LOW_ROOF, LOW_TOP, 1)
  fx('brick', EAST - IN, BACK + IN, STRIP, LOW_ROOF, LOW_TOP, -1)
  lid('dark', [MID, EAST], [BACK, BACK + IN], LOW_TOP)
  lid('dark', [EAST - IN, EAST], [BACK + IN, STRIP], LOW_TOP)
  // the coping's lip over the brick
  const lip = 0.05
  const top: Range = [TOP - COPING, TOP]
  const lowTop: Range = [LOW_TOP - COPING, LOW_TOP]
  box('dark', [WEST - lip, EAST + lip], [FACE, FACE + lip], top)
  box('dark', [WEST - lip, WEST], [BACK - lip, FACE], top)
  box('dark', [EAST, EAST + lip], [STRIP - lip, FACE], top)
  box('dark', [WEST, MID + lip], [BACK - lip, BACK], top)
  box('dark', [MID, MID + lip], [BACK, STRIP - lip], top)
  box('dark', [MID + lip, EAST], [STRIP - lip, STRIP], top)
  box('dark', [EAST, EAST + lip], [BACK - lip, STRIP - lip], lowTop)
  box('dark', [MID + lip, EAST], [BACK - lip, BACK], lowTop)
  for (const [x, z, y, h] of SKYLIGHTS) box('stone', x, z, [y, y + h], 'xXzZt')

  // the parapet round a roof: inside faces from the roof up, the top
  function parapet(line: Point[], outer: Point[], y0: number, y1: number) {
    const e = edges(line)
    e.forEach(({ p, q, len, out }, i) => {
      if (len < 0.01) return
      add('brick', wallQuad(p, q, y0, y1, { x: -out.x, z: -out.z }))
      const o = [outer[i]!, outer[(i + 1) % outer.length]!]
      add('dark', flat([p, q, o[1]!, o[0]!], y1))
    })
  }

  // blocks just inside the walls for the shadows: it's empty over the ground floor and a low
  // sun came in the windows on one side and out the other's (landmark.ts core)
  core('brick', rect([WEST + IN, EAST - IN], [BACK + IN, FRONT - IN]), CEILING, LOW_ROOF - 0.1)
  core('brick', high, LOW_ROOF - 0.1, ROOF - 0.1)

  // inside the ground floor: all brick, the doorway
  insideWalls(inside, outline, door, () => false)

  return {
    parts: merged(),
    inside,
    signs,
    // the windows are set into the brick, the cores cast for the floors over the ground
    noShadow: ['glass', 'panel', 'dark', 'old'],
  }
}
