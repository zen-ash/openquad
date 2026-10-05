import * as THREE from 'three'
import type { Point, Segment } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  edges,
  flat,
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// the gsu sports arena (1973) on decatur st at courtland st. a warm beige precast box, the
// court's hall, between two end walls that stick out past it at both long sides like
// blades. a stair tower at each end of both long sides with a louvre box on top. on
// decatur st the big panel wall with the sign stands over a glass lobby and a terrace on
// columns over the sidewalk, two footbridges go from the terrace over decatur st, and at
// the north corner there's a glass pavilion with a sloping metal roof, the ticket office
// and the passage to today's doors. the long sides have thin ribs every 0.6m. from usgs's
// lidar (2018), commons (2011, 2019), mapillary (2019-2021) and gsu's photos (2024-2026).
// sources: docs/reference/sports-arena.md
//
// "u" is meters along decatur st toward piedmont ave, "v" meters in from decatur st, both
// from hurt park (the same numbers as build-campus.mjs). the game's ground is the decatur st
// sidewalk under the terrace

export type ArenaData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { along: number[]; well?: number[][] }
}

// few parts, each is a draw call in every pass. the glass, the dark bits (louvres, doors)
// and the blue are all set in or on walls with the building behind them, so they don't
// cast. shade is the precast deep under the terrace, the
// bridges and the panel wall: the game's ambient occlusion only reaches about a meter, so
// those came out as bright as the walls in the sun (student center east's arcade too)
export type Part = 'precast' | 'shade' | 'glass' | 'clear' | 'metal' | 'dark' | 'blue'

type Range = readonly [number, number]

// same numbers as build-campus.mjs
export const OUTLINE: [number, number][] = [
  [80, 252.3],
  [94, 252.3],
  [94, 247.7],
  [86, 247.7],
  [80, 244],
  [80, 235.7],
  [89.5, 235.7],
  [89.5, 234.8],
  [98.6, 234.8],
  [98.6, 240.2],
  [104.9, 240.2],
  [104.9, 244.6],
  [140.9, 244.6],
  [140.9, 240.5],
  [151.7, 240.5],
  [151.7, 247.7],
  [146.5, 247.7],
  [146.5, 252.3],
  [163.55, 252.3],
  [163.55, 293.05],
  [151.7, 293.05],
  [151.7, 305.3],
  [140.9, 305.3],
  [140.9, 298.3],
  [104.8, 298.3],
  [104.8, 305.3],
  [93.9, 305.3],
  [93.9, 293.05],
  [80, 293.05],
  [80, 291.8],
  [82.7, 291.8],
  [82.7, 253.6],
  [80, 253.6],
]

// the hall between the end walls: its courtland st side, its side over the practice
// facility, the end walls' inside faces, the roof and the coping on the long sides (lidar)
export const HALL = { nw: 82.7, se: 163.55, ne: 253.6, sw: 291.8, roof: 24.85, top: 25.7 }
// the end walls, 1.3m thick, past the hall at both ends: 2.7m on courtland st, 2.25m over
// the practice facility's roof
export const END = { from: 80, to: 165.8, ne: 252.3, sw: 293.05, top: 26.45 }
// the practice facility draws everything under its roof (10.3m over its own ground, which
// is the game's ground too). the arena's walls over it start a bit under that
export const PRACTICE_ROOF = 10
// the stair towers and the louvre boxes on them (lidar). the north and east ones only go
// 7.5m back from the front, behind them it's the hall's roof
export const TOWER = 29.5
export const LOUVRE = 30.7
export const TOWERS = {
  n: { u: [94, 104.9], v: [240.2, 247.7] },
  e: { u: [140.9, 151.7], v: [240.5, 247.7] },
  w: { u: [93.9, 104.8], v: [293.05, 305.3] },
  s: { u: [140.9, 151.7], v: [293.05, 305.3] },
} as const
// the west one has a lower corner by the end wall
const LOW = { u: 99.8, v: 298.7, top: 19.5 }
// u, v, and which way the slats face: toward the panel wall in front, the back's middle
const LOUVRES: [Range, Range, 1 | -1][] = [
  [[102.2, 104.9], [243.4, 249.2], 1],
  [[140.9, 143.6], [244.2, 249.2], -1],
  [[102, 104.8], [296.4, 301.2], 1],
  [[140.9, 143.6], [296.2, 301.2], -1],
]
// the slats come down the tower's face this far (2011 photo)
const SLATS = 26.6
// the panel wall with the sign, over the lobby: its face, how thick it is, the soffit
export const SIGN_WALL = {
  u: [106.8, 138.8],
  v: 244.6,
  back: 246.3,
  soffit: 15.3,
  top: 26.1,
} as const
// its panel joints, measured on the 2011 photo: rows, and narrow and wide panels in turn
export const SIGN_ROWS = [15.3, 17.3, 19.8, 21, 23.5, 24.75, 26.1]
const NARROW = 0.6
const WIDE = 1.19
const FIRST_JOINT = 108.5
// the low bits either side of it, between it and the towers
const STRIP = 12.45
// the terrace over the sidewalk, on columns
export const TERRACE = {
  u: [104.9, 140.9],
  v: 236.5,
  deck: 5.45,
  soffit: 4.6,
  parapet: 6.4,
} as const
export const COLUMNS = [106, 112.3, 118.6, 124.9, 131.2, 137.5]
// the two bridges over decatur st: their sides, the walkway between the parapets
export const BRIDGES = [
  { u: [107.8, 117.7], walk: [109.7, 115.4] },
  { u: [128.3, 137.8], walk: [129.6, 135.4] },
] as const
// they end where the urban life plaza starts (a deck a floor up there, flat in the game)
export const BRIDGE = { end: 204.5, under: 4 }
// big square piers under them on the far side: at the back of the sidewalk and at the
// plaza's edge (2019 photo)
export const PIERS = [215.8, 204.6]
const PIER = 1.5
// the boxes with panels on them stick out of the lobby over the terrace
const BOXES: Range[] = [
  [106.8, 117.3],
  [128.3, 138.8],
]
const BOX = { v: 242.4, y: [8.3, 13.8] as Range }
const BOX_ROWS = [8.3, 10, 11.9, 13.8]
// the ribs on the long sides, 0.6m apart, and what's under them on courtland st: a beam,
// a dark recess, plain wall (the courtland st bridge hides it)
export const RIBS = {
  pitch: 0.6,
  width: 0.2,
  depth: 0.25,
  y: [12.7, 24] as Range,
  beam: 11.9,
  recess: 11.1,
}
// the sloping metal roof of the pavilion and the lobby at the doors (lidar)
export const roofAt = (u: number, v: number) => 4.9 + 0.25 * (u - 80) + 0.5 * (v - 242)
const CANOPY = [4.3, 4.9] as const
// the storefront at the doors, up to under the inside's ceiling (3.3m)
const SHOP = 3.2
// the precast's panel grid (materials), so a panel of the sign wall can get exactly one
export const PANEL = [0.6, 1.25] as const

export function arenaFrame(b: ArenaData) {
  const [ax, az] = b.landmark!.along as [number, number]
  const A = (u: number, v: number): Point => ({ x: ax * u - az * v, z: az * u + ax * v })
  const uvOf = (p: Point): [number, number] => [ax * p.x + az * p.z, -az * p.x + ax * p.z]
  // a direction (du, dv) in the game
  const D = (du: number, dv: number): Point => ({ x: ax * du - az * dv, z: az * du + ax * dv })
  return { A, uvOf, D }
}

// the sign wall's joints from `from` to `to`, narrow and wide panels in turn
export function signJoints(from: number, to: number) {
  // back from the measured joint to the first one at or before `from`
  let u = FIRST_JOINT
  let width = NARROW
  while (u > from) {
    width = width === NARROW ? WIDE : NARROW
    u -= width
  }
  const joints = [from]
  for (; u < to - 0.05; width = width === NARROW ? WIDE : NARROW) {
    if (u > from + 0.05) joints.push(u)
    u += width
  }
  joints.push(to)
  return joints
}

export function sportsArenaGeometry(b: ArenaData) {
  const { add, prism, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, uvOf, D } = arenaFrame(b)
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const V3 = (u: number, v: number, y: number) => {
    const p = A(u, v)
    return new THREE.Vector3(p.x, y, p.z)
  }
  const dir3 = (du: number, dv: number) => {
    const d = D(du, dv)
    return new THREE.Vector3(d.x, 0, d.z)
  }
  const facing = (du: number, dv: number) => {
    const d = D(du, dv)
    return Math.atan2(d.x, d.z)
  }

  // f changes a piece before it goes in (smooth() for flat metal)
  type Change = (geo: THREE.BufferGeometry) => THREE.BufferGeometry
  const same: Change = (geo) => geo
  // a wall face at v from u0 to u1, facing -v (s -1, toward decatur st) or +v
  const fv = (
    part: Part,
    v: number,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    s: number,
    f = same,
  ) => {
    if (u1 - u0 > 0.001 && y1 - y0 > 0.001)
      add(part, f(wallQuad(A(u0, v), A(u1, v), y0, y1, D(0, s), u0)))
  }
  // a wall face at u from v0 to v1, facing -u (s -1, toward courtland st) or +u
  const fu = (
    part: Part,
    u: number,
    v0: number,
    v1: number,
    y0: number,
    y1: number,
    s: number,
    f = same,
  ) => {
    if (v1 - v0 > 0.001 && y1 - y0 > 0.001)
      add(part, f(wallQuad(A(u, v0), A(u, v1), y0, y1, D(s, 0), v0)))
  }
  // something flat over (u, v) corners. its uvs go along u and v, so the precast's
  // joints run with the walls
  const lid = (part: Part, c: [number, number][], y: number, up = true, f = same) => {
    const geo = flat(
      c.map(([u, v]) => A(u, v)),
      y,
      up,
    )
    const pos = geo.getAttribute('position')
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < pos.count; i++) uv.setXY(i, ...uvOf({ x: pos.getX(i), z: pos.getZ(i) }))
    add(part, f(geo))
  }
  // the soffits are cast in bigger bays than the walls' panels
  const bays = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2)
    return geo
  }
  const rect = (u0: number, u1: number, v0: number, v1: number): [number, number][] => [
    [Math.min(u0, u1), v0],
    [Math.max(u0, u1), v0],
    [Math.max(u0, u1), v1],
    [Math.min(u0, u1), v1],
  ]
  // a box, only the faces asked for: u/U the -u/+u sides, v/V the -v/+v ones, t top, b bottom
  const box = (
    part: Part,
    [u0, u1]: Range,
    [v0, v1]: Range,
    [y0, y1]: Range,
    faces = 'uUvVtb',
    f = same,
  ) => {
    if (faces.includes('u')) fu(part, u0, v0, v1, y0, y1, -1, f)
    if (faces.includes('U')) fu(part, u1, v0, v1, y0, y1, 1, f)
    if (faces.includes('v')) fv(part, v0, u0, u1, y0, y1, -1, f)
    if (faces.includes('V')) fv(part, v1, u0, u1, y0, y1, 1, f)
    if (faces.includes('t')) lid(part, rect(u0, u1, v0, v1), y1, true, f)
    if (faces.includes('b') && y0 > 0.01) lid(part, rect(u0, u1, v0, v1), y0, false, f)
  }
  // window glass on a face at v or at u
  const paneV = (v: number, u0: number, u1: number, y0: number, y1: number, s: number) => {
    if (u1 - u0 > 0.01 && y1 - y0 > 0.01)
      add('glass', glassQuad(A(u0, v), A(u1, v), y0, y1, D(0, s)))
  }
  const paneU = (u: number, v0: number, v1: number, y0: number, y1: number, s: number) => {
    if (v1 - v0 > 0.01 && y1 - y0 > 0.01)
      add('glass', glassQuad(A(u, v0), A(u, v1), y0, y1, D(s, 0)))
  }
  // a face from three or four corners, facing o. uvs in meters across it and up
  const quad = (part: Part, c: THREE.Vector3[], o: THREE.Vector3) => {
    const n = new THREE.Vector3()
      .subVectors(c[1]!, c[0]!)
      .cross(new THREE.Vector3().subVectors(c[2]!, c[0]!))
    const pts = n.dot(o) > 0 ? c : [...c].reverse()
    const tri = (c.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]).map((i) => pts[i]!)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        tri.flatMap((p) => p.toArray()),
        3,
      ),
    )
    geo.computeVertexNormals()
    const side = new THREE.Vector3(-o.z, 0, o.x).normalize()
    const uv = tri.flatMap((p) => [p.x * side.x + p.z * side.z, p.y])
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    add(part, geo)
  }

  // the precast's grid has a joint every 0.6m along and 1.25m up. a real panel gets
  // exactly one cell of it (i along, j up), so its joints are where the real ones are.
  // margin keeps the joints off it altogether (the ribs are one piece top to bottom)
  const cell = (geo: THREE.BufferGeometry, i: number, j: number, margin = 0) => {
    const uv = geo.getAttribute('uv')
    const xs = Array.from({ length: uv.count }, (_, k) => uv.getX(k))
    const ys = Array.from({ length: uv.count }, (_, k) => uv.getY(k))
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    for (let k = 0; k < uv.count; k++) {
      const fx = (uv.getX(k) - x0) / (x1 - x0 || 1)
      const fy = (uv.getY(k) - y0) / (y1 - y0 || 1)
      uv.setXY(
        k,
        (i + margin + fx * (1 - 2 * margin)) * PANEL[0],
        (j + margin + fy * (1 - 2 * margin)) * PANEL[1],
      )
    }
    return geo
  }
  // a wall of real panels at v, facing decatur st: joints along it and up it. the row's
  // number stays close to its height, the grime reads it as that
  const panels = (v: number, cols: number[], rows: number[]) => {
    for (let i = 1; i < cols.length; i++)
      for (let j = 1; j < rows.length; j++) {
        const [u0, u1, y0, y1] = [cols[i - 1]!, cols[i]!, rows[j - 1]!, rows[j]!]
        const geo = wallQuad(A(u0, v), A(u1, v), y0, y1, D(0, -1))
        add('precast', cell(geo, Math.round(u0 / PANEL[0]), Math.round(y0 / PANEL[1])))
      }
  }
  // the metal's ribs run up its uvs: turned, they're slats across
  const slats = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
    return geo
  }
  // stretched so far the ribs fade out, for flat metal
  const smooth = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 200, uv.getY(i) * 200)
    return geo
  }

  // the end walls. the ends over the practice facility start just under its roof
  for (const v of [
    [END.ne, HALL.ne],
    [HALL.sw, END.sw],
  ] as const) {
    box('precast', [END.from, HALL.se], v, [0, END.top], 'uvVt')
    box('precast', [HALL.se, END.to], v, [PRACTICE_ROOF, END.top], 'UvVt')
  }

  // the long sides of the hall: ribs between a beam and a plain band up top. on courtland
  // st a dark recess under the beam and plain wall down to the ground, over the practice
  // facility the ribs go down into its roof (2019 photos)
  const ribbed = (u: number, s: number, bottom: number) => {
    const back = u - s * RIBS.depth
    const [r0, r1] = RIBS.y
    const from = bottom > 0 ? bottom : r0
    fu('precast', u, HALL.ne, HALL.sw, r1, HALL.top, s)
    lid('precast', rect(u, back, HALL.ne, HALL.sw), r1, false)
    if (bottom === 0) {
      fu('precast', u, HALL.ne, HALL.sw, RIBS.beam, r0, s)
      lid('precast', rect(u, back, HALL.ne, HALL.sw), r0)
      const deep = u - s * 0.6
      const recess = wallQuad(A(deep, HALL.ne), A(deep, HALL.sw), RIBS.recess, RIBS.beam, D(s, 0))
      add('dark', smooth(recess))
      lid('precast', rect(u, deep, HALL.ne, HALL.sw), RIBS.beam, false)
      lid('precast', rect(u, deep, HALL.ne, HALL.sw), RIBS.recess)
      fu('precast', u, HALL.ne, HALL.sw, 0, RIBS.recess, s)
    }
    // a pair of deeper ribs near each end, down through the beam and up into the band (the
    // 2019 photo from courtland st)
    const pilasters = [HALL.ne + 2.7, HALL.sw - 2.7]
    const ribs: [number, number][] = []
    for (let v = HALL.ne + RIBS.pitch; v < HALL.sw - RIBS.pitch / 2; v += RIBS.pitch)
      if (pilasters.every((p) => Math.abs(v - p) > 0.45))
        ribs.push([v - RIBS.width / 2, v + RIBS.width / 2])
    // the wall behind them is a strip between each two, its joints out of the way
    let v = HALL.ne
    ribs.forEach(([a, z], k) => {
      add('precast', cell(wallQuad(A(back, v), A(back, a), from, r1, D(s, 0)), 2 * k, 10, 0.05))
      v = z
      add('precast', cell(wallQuad(A(u, a), A(u, z), from, r1, D(s, 0)), 2 * k + 1, 10, 0.1))
      add('precast', cell(wallQuad(A(back, a), A(u, a), from, r1, D(0, -1)), 2 * k + 1, 11, 0.1))
      add('precast', cell(wallQuad(A(back, z), A(u, z), from, r1, D(0, 1)), 2 * k + 1, 12, 0.1))
    })
    add('precast', cell(wallQuad(A(back, v), A(back, HALL.sw), from, r1, D(s, 0)), 1, 10, 0.05))
    const out = u + s * 0.2
    for (const p of pilasters)
      for (const c of [p - 0.25, p + 0.25]) {
        const [a, z] = [c - 0.12, c + 0.12]
        const [y0, y1] = [bottom === 0 ? RIBS.recess : from, r1 + 0.9]
        fu('precast', out, a, z, y0, y1, s)
        fv('precast', a, Math.min(back, out), Math.max(back, out), y0, y1, -1)
        fv('precast', z, Math.min(back, out), Math.max(back, out), y0, y1, 1)
        lid('precast', rect(back, out, a, z), y1)
      }
    // the coping and its inside face over the roof
    const inner = u - s * 0.3
    fu('precast', inner, HALL.ne, HALL.sw, HALL.roof, HALL.top, -s)
    lid('precast', rect(u, inner, HALL.ne, HALL.sw), HALL.top)
  }
  ribbed(HALL.nw, -1, 0)
  ribbed(HALL.se, 1, PRACTICE_ROOF)
  lid('precast', rect(HALL.nw + 0.3, HALL.se - 0.3, HALL.ne, HALL.sw), HALL.roof)
  // a couple of service doors on courtland st
  for (const v of [262, 281]) {
    const geo = wallQuad(A(HALL.nw - 0.02, v), A(HALL.nw - 0.02, v + 1.8), 0, 2.4, D(-1, 0))
    add('dark', smooth(geo))
  }

  // the stair towers. the north and east ones have a tall slot of dark glass toward
  // courtland st (2019 photos), set into the wall
  const T = TOWERS
  const slot = (u: number, [v0, v1]: Range, [y0, y1]: Range) => {
    const back = u + 0.3
    paneU(back, v0, v1, y0, y1, -1)
    fv('precast', v0, u, back, y0, y1, 1)
    fv('precast', v1, u, back, y0, y1, -1)
    lid('precast', rect(u, back, v0, v1), y0)
    lid('precast', rect(u, back, v0, v1), y1, false)
  }
  const slotted = (t: { u: Range; v: Range }, slotV: Range, slotY: Range) => {
    const [u0, u1] = t.u
    const [v0, v1] = t.v
    const holes: Hole[] = [[slotV[0] - v0, slotV[1] - v0, slotY[0], slotY[1]]]
    for (const [a, z, y0, y1] of solidPieces(v1 - v0, 0, TOWER, holes))
      fu('precast', u0, v0 + a, v0 + z, y0, y1, -1)
    slot(u0, slotV, slotY)
    box('precast', [u0, u1], [v0, v1], [0, TOWER], 'UvVt')
  }
  slotted(T.n, [244.6, 247.3], [10.6, 26.1])
  slotted(T.e, [243.5, 246.2], [13, 26.1])
  // the back two stand against the end wall, that bit only shows over it
  box('precast', T.s.u, T.s.v, [0, TOWER], 'uUVt')
  fv('precast', T.s.v[0], T.s.u[0], T.s.u[1], END.top, TOWER, -1)
  // the west one has a lower corner by the end wall (lidar)
  fu('precast', T.w.u[0], LOW.v, T.w.v[1], 0, TOWER, -1)
  fv('precast', T.w.v[1], T.w.u[0], T.w.u[1], 0, TOWER, 1)
  fu('precast', T.w.u[1], T.w.v[0], T.w.v[1], 0, TOWER, 1)
  fv('precast', LOW.v, T.w.u[0], LOW.u, LOW.top, TOWER, -1)
  fu('precast', LOW.u, T.w.v[0], LOW.v, LOW.top, TOWER, -1)
  fv('precast', T.w.v[0], LOW.u, T.w.u[1], END.top, TOWER, -1)
  lid(
    'precast',
    [
      [T.w.u[0], LOW.v],
      [LOW.u, LOW.v],
      [LOW.u, T.w.v[0]],
      [T.w.u[1], T.w.v[0]],
      [T.w.u[1], T.w.v[1]],
      [T.w.u[0], T.w.v[1]],
    ],
    TOWER,
  )
  box('precast', [T.w.u[0], LOW.u], [T.w.v[0], LOW.v], [0, LOW.top], 'ut')
  // the louvre boxes: dark slats on the side toward the panel wall (or the back's middle),
  // from a bit down the tower's face, and on top. the front two reach back past their
  // tower, over the roof behind it
  for (const [[u0, u1], [v0, v1], s] of LOUVRES) {
    const [front, rear] = s > 0 ? [u1, u0] : [u0, u1]
    // where its tower ends under it (the front towers are shorter than the boxes)
    const edge = v0 > 270 ? v1 : Math.min(v1, T.n.v[1])
    const pieces: [number, number, number][] = [
      [v0, edge, TOWER],
      [edge, v1, HALL.roof],
    ]
    for (const [a, z, y0] of pieces) {
      fu('precast', rear, a, z, y0, LOUVRE, -s)
      if (y0 < SLATS) fu('precast', front, a, z, y0, SLATS, s)
    }
    const f = front + s * 0.03
    add('dark', slats(wallQuad(A(f, v0), A(f, v1), SLATS, LOUVRE, D(s, 0), v0)))
    fv('precast', v0, u0, u1, TOWER, LOUVRE, -1)
    fv('precast', v1, u0, u1, edge < v1 ? HALL.roof : TOWER, LOUVRE, 1)
    add(
      'dark',
      slats(
        flat(
          rect(u0, u1, v0, v1).map(([u, v]) => A(u, v)),
          LOUVRE,
        ),
      ),
    )
  }

  // the panel wall with the sign: joints from the 2011 photo, a soffit under it over the
  // lobby, the hall's roof behind its top (lidar has it 1.7m thick)
  const W = SIGN_WALL
  const [w0, w1] = W.u
  panels(W.v, signJoints(w0, w1), SIGN_ROWS)
  lid('precast', rect(w0, w1, W.v, W.back), W.top)
  fv('precast', W.back, w0, w1, HALL.roof, W.top, 1)
  lid('shade', rect(w0, w1, W.v, W.back), W.soffit, false)
  for (const [u, s] of [
    [w0, -1],
    [w1, 1],
  ] as const) {
    fu('precast', u, W.v, W.back, STRIP, W.top, s)
    fu('precast', u, W.back, T.n.v[1], STRIP, HALL.roof, s)
    // the lobby's ends under the soffit
    fu('shade', u, W.v, W.back, TERRACE.deck, W.soffit, -s)
  }
  // four little fins hanging off its bottom row (2011 photo)
  for (const u of [110.6, 114.3, 131.4, 135.15])
    box('precast', [u - 0.17, u + 0.17], [W.v - 0.5, W.v], [14.8, 17], 'uUvb')

  // the low bits either side, dark glass toward the street
  for (const [u0, u1] of [
    [T.n.u[1], w0],
    [w1, T.e.u[0]],
  ] as const) {
    paneV(W.v, u0, u1, TERRACE.deck, STRIP, -1)
    lid('precast', rect(u0, u1, W.v, T.n.v[1]), STRIP)
    fv('precast', T.n.v[1], u0, u1, STRIP, HALL.roof, -1)
  }
  // the roof between the towers and behind the panel wall, at the hall's
  lid(
    'precast',
    [
      [99, T.n.v[1]],
      [w0, T.n.v[1]],
      [w0, W.back],
      [w1, W.back],
      [w1, T.e.v[1]],
      [146.5, T.e.v[1]],
      [146.5, END.ne],
      [99, END.ne],
    ],
    HALL.roof,
  )
  fu('precast', 146.5, T.e.v[1], END.ne, 0, HALL.roof, 1)
  // its side over the doors' lobby roof
  fu('precast', 99, T.n.v[1], END.ne, 11.5, HALL.roof, -1)
  // a box of machinery on it (lidar)
  box('metal', [121.5, 124.8], [W.back, 250.6], [HALL.roof, 27.6], 'uUVt', smooth)

  // the lobby under the soffit: dark bronze glass two floors high, set back, with a few
  // plain piers in front, the widest between the boxes (2011 photo)
  paneV(W.back, w0, w1, TERRACE.deck, W.soffit, -1)
  for (const p of [
    [w0, w0 + 0.6],
    [113.2, 114],
    [120.6, 125],
    [131.6, 132.4],
    [w1 - 0.6, w1],
  ] as const)
    box('precast', p, [W.back - 0.3, W.back], [TERRACE.deck, W.soffit], 'uUv')

  // the boxes: panels in two rows over a plain band, little columns under them
  for (const [u0, u1] of BOXES) {
    panels(BOX.v, signJoints(u0, u1), BOX_ROWS)
    box('precast', [u0, u1], [BOX.v, W.back], BOX.y, 'uUt')
    lid('shade', rect(u0, u1, BOX.v, W.back), BOX.y[0], false)
  }
  for (const u of [109.6, 114.6, 131, 136])
    box(
      'precast',
      [u - 0.17, u + 0.17],
      [BOX.v + 0.4, BOX.v + 0.9],
      [TERRACE.deck, BOX.y[0]],
      'uUv',
    )
  // the landing between them: a slab with a solid parapet, on a wall set back under it
  box('precast', [117.8, 128.3], [237, BOX.v], [7.3, 8.6])
  box('precast', [119.5, 126.5], [239.5, BOX.v], [TERRACE.deck, 7.3], 'uUv')
  // and a stair from it up to doors in the lobby either side of the wide pier, a sloping
  // wall on its outer side
  for (const [u0, u1, s] of [
    [118, 119.6, -1],
    [126.5, 128.1, 1],
  ] as const) {
    const [v0, v1, y0, y1] = [BOX.v, W.back - 0.3, 8.6, 10.2]
    const outer = s < 0 ? u0 : u1
    quad(
      'precast',
      [V3(u0, v0, y0), V3(u1, v0, y0), V3(u1, v1, y1), V3(u0, v1, y1)],
      new THREE.Vector3(0, 1, 0),
    )
    for (const [u, f] of [
      [u0, -1],
      [u1, 1],
    ] as const) {
      const top = u === outer ? 1 : 0
      quad(
        'precast',
        [V3(u, v0, 7.3), V3(u, v1, 7.3), V3(u, v1, y1 + top), V3(u, v0, y0 + top)],
        dir3(f, 0),
      )
    }
    const inner = outer - s * 0.25
    quad(
      'precast',
      [V3(inner, v0, y0), V3(inner, v1, y1), V3(inner, v1, y1 + 1), V3(inner, v0, y0 + 1)],
      dir3(-s, 0),
    )
    quad(
      'precast',
      [V3(inner, v0, y0 + 1), V3(outer, v0, y0 + 1), V3(outer, v1, y1 + 1), V3(inner, v1, y1 + 1)],
      new THREE.Vector3(0, 1, 0),
    )
  }

  // the terrace: its deck, the soffit over the sidewalk, the parapet along the front except
  // where the bridges come in, on square columns
  const [t0, t1] = TERRACE.u
  lid('precast', rect(t0, t1, TERRACE.v, W.back), TERRACE.deck)
  lid('shade', rect(t0, t1, TERRACE.v, W.v), TERRACE.soffit, false, bays)
  // the shadow lookup is pushed out along the surface (normalBias), so right under a soffit
  // it looked past it. a ceiling higher up inside the deck, for the shadows only
  lid('precast', rect(t0, t1, TERRACE.v, W.v), TERRACE.deck - 0.1, false)
  const [g0, g1] = BRIDGES.map((r) => r.u)
  for (const [a, z] of [
    [t0, g0![0]],
    [g0![1], g1![0]],
    [g1![1], t1],
  ] as const) {
    fv('precast', TERRACE.v, a, z, TERRACE.soffit, TERRACE.parapet, -1)
    fv('precast', TERRACE.v + 0.25, a, z, TERRACE.deck, TERRACE.parapet, 1)
    lid('precast', rect(a, z, TERRACE.v, TERRACE.v + 0.25), TERRACE.parapet)
  }
  for (const [u, v1, s] of [
    [t0, T.n.v[0], -1],
    [t1, T.e.v[0], 1],
  ] as const) {
    fu('precast', u, TERRACE.v, v1, TERRACE.soffit, TERRACE.parapet, s)
    fu('precast', u - s * 0.25, TERRACE.v, v1, TERRACE.deck, TERRACE.parapet, -s)
    lid('precast', rect(u, u - s * 0.25, TERRACE.v, v1), TERRACE.parapet)
  }
  for (const u of COLUMNS)
    box('precast', [u - 0.5, u + 0.5], [TERRACE.v, TERRACE.v + 1.2], [0, TERRACE.soffit], 'uUvV')

  // under it, the wall along the sidewalk: big dark windows over wide steps (2021 dashcam).
  // the glass is on the wall, nothing goes behind the inside walls
  const walls = [t0, ...COLUMNS.flatMap((u) => [u - 0.5, u + 0.5]), t1]
  for (let i = 0; i < walls.length; i += 2) {
    const [a, z] = [walls[i]!, walls[i + 1]!]
    const holes: Hole[] = [[0.4, z - a - 0.4, 1.3, 4]]
    for (const [h0, h1, y0, y1] of solidPieces(z - a, 0, TERRACE.soffit, holes))
      fv('shade', W.v, a + h0, a + h1, y0, y1, -1)
    for (const [h0, h1, y0, y1] of holes) paneV(W.v - 0.01, a + h0, a + h1, y0, y1, -1)
  }
  for (let i = 1; i < walls.length - 1; i += 2)
    box('shade', [walls[i]!, walls[i + 1]!], [W.v - 0.3, W.v], [0, TERRACE.soffit], 'uUv')
  for (let k = 0; k < 3; k++)
    box('shade', [t0 + 1.2, t1 - 1.2], [W.v - 1.8 + 0.6 * k, W.v - 0.3], [0, 0.3 * (k + 1)], 'uUvt')

  // the bridges: deep fascias, the parapets either side of the walkway, the far end closed
  // over the plaza's edge, on two pairs of square piers
  for (const { u, walk } of BRIDGES) {
    const [u0, u1] = u
    const [k0, k1] = walk
    const [b0, b1] = [BRIDGE.end, TERRACE.v]
    fu('precast', u0, b0, b1, BRIDGE.under, TERRACE.parapet, -1)
    fu('precast', u1, b0, b1, BRIDGE.under, TERRACE.parapet, 1)
    lid('shade', rect(u0, u1, b0, b1), BRIDGE.under, false, bays)
    lid('precast', rect(u0, u1, b0, b1), TERRACE.deck - 0.1, false)
    lid('precast', rect(u0, k0, b0, b1), TERRACE.parapet)
    lid('precast', rect(k1, u1, b0, b1), TERRACE.parapet)
    lid('precast', rect(k0, k1, b0, b0 + 0.25), TERRACE.parapet)
    fu('precast', k0, b0 + 0.25, b1, TERRACE.deck, TERRACE.parapet, 1)
    fu('precast', k1, b0 + 0.25, b1, TERRACE.deck, TERRACE.parapet, -1)
    fv('precast', b0 + 0.25, k0, k1, TERRACE.deck, TERRACE.parapet, 1)
    lid('precast', rect(k0, k1, b0 + 0.25, b1), TERRACE.deck)
    fv('precast', b0, u0, u1, BRIDGE.under, TERRACE.parapet, -1)
    for (const v of PIERS)
      for (const p of [u0 + 0.1, u1 - 0.1 - PIER])
        box('precast', [p, p + PIER], [v, v + PIER], [0, BRIDGE.under], 'uUvV')
  }

  // the north corner: the ticket office, a box of cream blocks with a deep flat canopy and
  // taller ends, its window, poster case and sign (2019 photos)
  const office = { u: [89.5, 98.6] as Range, v: [234.8, 240.2] as Range, top: 3.75 }
  const [o0, o1] = office.u
  const ov = office.v[0]
  // the precast's grid made the size of a block
  const blocks = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * 6.25)
    return geo
  }
  const windows: Hole[] = [
    [o1 - 6.4, o1 - 3, 0.9, 2.6],
    [o1 - 2.5, o1 - 1, 0.9, 2.5],
  ]
  const cut = windows.map(([a, z, y0, y1]): Hole => [a - o0, z - o0, y0, y1])
  for (const [h0, h1, y0, y1] of solidPieces(o1 - o0, 0, office.top, cut))
    add('precast', blocks(wallQuad(A(o0 + h0, ov), A(o0 + h1, ov), y0, y1, D(0, -1), o0 + h0)))
  for (const [a, z, y0, y1] of windows) {
    if (a < o1 - 4) add('clear', wallQuad(A(a, ov), A(z, ov), y0, y1, D(0, -1)))
    else paneV(ov, a, z, y0, y1, -1)
    box('metal', [a - 0.06, z + 0.06], [ov - 0.04, ov], [y0 - 0.06, y0], 'vt', smooth)
  }
  for (const [u, s] of [
    [o0, -1],
    [o1, 1],
  ] as const)
    add('precast', blocks(wallQuad(A(u, ov), A(u, office.v[1]), 0, 5.1, D(s, 0), ov)))
  box('precast', [o0, o0 + 1.7], office.v, [office.top, 5.1], 'Uvt')
  box('precast', [o1 - 0.8, o1], office.v, [office.top, 5.1], 'uvt')
  box('precast', [o0 + 1.7, o1 + 0.3], [ov - 1.2, office.v[1]], [office.top, 4.3], 'Uvtb')
  fu('precast', o0 + 1.7, ov - 1.2, ov, office.top, 4.3, -1)
  signs.push({
    ...A(o1 - 4.7, ov - 0.03),
    y: 3.15,
    rot: facing(0, -1),
    text: 'SPORTS ARENA\nTICKET OFFICE',
    plate: '#1f4b99',
    color: '#f4f4f2',
    scale: 0.62,
  })

  // the pavilion: storefront glass in light grey frames, a flat canopy over its front, the
  // metal roof sloping up behind it. you see through it up to the canopy, there's the roof's
  // underside over the inside's ceiling
  const pav: [number, number][] = [
    [80, 235.7],
    [o0, 235.7],
    [o0, 240.2],
    [94, 240.2],
    [94, 247.7],
    [86, 247.7],
    [80, 244],
  ]
  const canopy: [number, number][] = [
    [79.6, 235.3],
    [o0, 235.3],
    [o0, 240.2],
    [94, 240.2],
    [94, 242],
    [79.6, 242],
  ]
  lid('metal', canopy, CANOPY[1], true, smooth)
  add(
    'metal',
    smooth(
      flat(
        canopy.map(([u, v]) => A(u, v)),
        CANOPY[0],
        false,
      ),
    ),
  )
  fv('metal', 235.3, 79.6, o0, CANOPY[0], CANOPY[1], -1, smooth)
  fu('metal', 79.6, 235.3, 242, CANOPY[0], CANOPY[1], -1, smooth)
  const middle = A(88, 241)
  const glazed: [[number, number], [number, number]][] = [
    [pav[6]!, pav[0]!],
    [pav[0]!, pav[1]!],
    [pav[4]!, pav[5]!],
    [pav[5]!, pav[6]!],
  ]
  for (const [p, q] of glazed) {
    const [a, z] = [A(...p), A(...q)]
    const len = Math.hypot(z.x - a.x, z.z - a.z)
    let o = { x: (z.z - a.z) / len, z: -(z.x - a.x) / len }
    if (o.x * (a.x - middle.x) + o.z * (a.z - middle.z) < 0) o = { x: -o.x, z: -o.z }
    add('clear', wallQuad(a, z, 0, CANOPY[0], o))
    if (Math.max(p[1], q[1]) <= 242) continue
    // under the sloping roof the glass goes on up to its low end, a metal bit fills the rest
    const [s, e] = [p, q]
      .map(([u, v]): [number, number] => [u, Math.max(v, 242)])
      .sort((m, k) => roofAt(...m) - roofAt(...k)) as [[number, number], [number, number]]
    const low = roofAt(...s)
    add('clear', wallQuad(A(...s), A(...e), CANOPY[0], low, o))
    quad(
      'metal',
      [V3(...s, low), V3(...e, low), V3(...e, roofAt(...e))],
      new THREE.Vector3(o.x, 0, o.z),
    )
  }
  // the slope's low side over the canopy
  quad(
    'metal',
    [V3(80, 242, CANOPY[1]), V3(94, 242, CANOPY[1]), V3(94, 242, roofAt(94, 242))],
    dir3(0, -1),
  )
  // the sloping roofs: standing seams running up the slope, the underside smooth
  const slope = (c: [number, number][], under: boolean) => {
    const geo = flat(
      c.map(([u, v]) => A(u, v)),
      0,
      !under,
    )
    const pos = geo.getAttribute('position')
    const uv = geo.getAttribute('uv')
    const g = Math.hypot(0.25, 0.5)
    for (let i = 0; i < pos.count; i++) {
      const [u, v] = uvOf({ x: pos.getX(i), z: pos.getZ(i) })
      pos.setY(i, roofAt(u, v) - (under ? 0.15 : 0))
      // across the slope, and up it
      uv.setXY(i, (-0.5 * u + 0.25 * v) / g, ((0.25 * u + 0.5 * v) / g) * Math.hypot(1, g))
    }
    geo.computeVertexNormals()
    add('metal', under ? smooth(geo) : geo)
  }
  for (const under of [false, true]) {
    slope(
      [
        [80, 242],
        [94, 242],
        [94, 247.7],
        [86, 247.7],
        [80, 244],
      ],
      under,
    )
    slope(rect(94, 99, T.n.v[1], END.ne), under)
  }

  // the doors (gsu's 2026 photo): sliding doors and glass under a blue arched awning on two
  // posts, a dark curtain wall over them up to the roof. the game's door is in the middle
  const du = OUTLINE[1]![0]
  const [dv0, dv1] = [T.n.v[1], END.ne]
  const doorAt = door ? uvOf(door)[1] : (dv0 + dv1) / 2
  const doorway: Hole = [
    doorAt - DOOR_WIDTH / 2 - dv0,
    doorAt + DOOR_WIDTH / 2 - dv0,
    0,
    DOOR_HEIGHT,
  ]
  for (const [h0, h1, y0, y1] of solidPieces(dv1 - dv0, 0, SHOP, [doorway]))
    paneU(du, dv0 + h0, dv0 + h1, y0, y1, -1)
  const [j0, j1] = [dv0 + doorway[0], dv0 + doorway[1]]
  box('metal', [du - 0.08, du], [j0 - 0.08, j0], [0, DOOR_HEIGHT], 'uV', smooth)
  box('metal', [du - 0.08, du], [j1, j1 + 0.08], [0, DOOR_HEIGHT], 'uv', smooth)
  box('metal', [du - 0.08, du], [dv0, dv1], [DOOR_HEIGHT, SHOP + 0.1], 'ub', smooth)
  const curtain = Math.min(roofAt(du, dv0), roofAt(du, dv1)) - 0.3
  paneU(du, dv0, dv1, SHOP + 0.1, curtain, -1)
  quad(
    'metal',
    [
      V3(du, dv0, curtain),
      V3(du, dv1, curtain),
      V3(du, dv1, roofAt(du, dv1)),
      V3(du, dv0, roofAt(du, dv0)),
    ],
    dir3(-1, 0),
  )
  // the awning: a band with an arched top, sloping back to the wall
  const aw = { u: du - 1.4, v: [dv0 + 0.3, dv1 - 0.2] as Range, y: 3.35, wall: 4.5 }
  const arc = (t: number) => 3.75 + 0.35 * Math.sin(Math.PI * t)
  const at = (t: number) => aw.v[0] + (aw.v[1] - aw.v[0]) * t
  const n = 8
  for (let k = 0; k < n; k++) {
    const [ta, tb] = [k / n, (k + 1) / n]
    const [va, vb] = [at(ta), at(tb)]
    quad(
      'blue',
      [V3(aw.u, va, aw.y), V3(aw.u, vb, aw.y), V3(aw.u, vb, arc(tb)), V3(aw.u, va, arc(ta))],
      dir3(-1, 0),
    )
    const up = new THREE.Vector3().subVectors(V3(du, va, aw.wall), V3(aw.u, va, arc(ta)))
    const o = new THREE.Vector3().crossVectors(up, dir3(0, 1))
    if (o.y < 0) o.negate()
    quad(
      'blue',
      [V3(aw.u, va, arc(ta)), V3(aw.u, vb, arc(tb)), V3(du, vb, aw.wall), V3(du, va, aw.wall)],
      o,
    )
  }
  quad(
    'blue',
    [
      V3(aw.u, aw.v[0], aw.y),
      V3(aw.u, aw.v[1], aw.y),
      V3(du, aw.v[1], aw.y),
      V3(du, aw.v[0], aw.y),
    ],
    new THREE.Vector3(0, -1, 0),
  )
  for (const [v, s, y] of [
    [aw.v[0], -1, arc(0)],
    [aw.v[1], 1, arc(1)],
  ] as const)
    quad(
      'blue',
      [V3(aw.u, v, aw.y), V3(du, v, aw.y), V3(du, v, aw.wall), V3(aw.u, v, y)],
      dir3(0, s),
    )
  for (const v of [aw.v[0] + 0.1, aw.v[1] - 0.1])
    box('metal', [aw.u - 0.05, aw.u + 0.05], [v - 0.05, v + 0.05], [0, aw.y], 'uUvV', smooth)
  signs.push({
    ...A(aw.u - 0.02, (aw.v[0] + aw.v[1]) / 2),
    y: 3.55,
    rot: facing(-1, 0),
    text: 'Welcome to the GEORGIA STATE Sports Arena',
    letters: true,
    size: 0.15,
    color: '#f4f4f2',
    weight: 700,
  })

  // the sign (still up in 2019): a light bar standing off the wall with the name on it, the
  // logo at its end as a plain blue square (it's gsu's trademark), SPORTS ARENA under it
  const bar = {
    u: [105.9, 125.8] as Range,
    v: [W.v - 0.75, W.v - 0.35] as Range,
    y: [20.45, 21.7] as Range,
  }
  box('metal', bar.u, bar.v, bar.y, 'uUvVtb', smooth)
  for (const u of [108, 113, 118])
    box('metal', [u - 0.1, u + 0.1], [bar.v[1], W.v], [20.9, 21.25], 'uUtb', smooth)
  box('blue', [121.1, 124.6], [W.v - 1.05, W.v - 0.55], [19.5, 23.1])
  signs.push({
    ...A(113.85, bar.v[0] - 0.02),
    y: (bar.y[0] + bar.y[1]) / 2,
    rot: facing(0, -1),
    text: 'GEORGIA STATE UNIVERSITY',
    letters: true,
    size: 0.86,
    color: '#34373b',
    weight: 600,
  })
  signs.push({
    ...A(114.35, W.v - 0.02),
    y: 19.93,
    rot: facing(0, -1),
    text: 'SPORTS ARENA',
    letters: true,
    size: 0.56,
    color: '#3a3c3f',
    weight: 700,
  })
  // the small ones: on a column under the terrace, and on the east tower by the flagpole
  signs.push({
    ...A(COLUMNS[1]! - 0.52, TERRACE.v + 0.6),
    y: 2.7,
    rot: facing(-1, 0),
    text: 'SPORTS ARENA',
    plate: '#1f4b99',
    color: '#f4f4f2',
    scale: 0.4,
  })
  signs.push({
    ...A(143.6, T.e.v[0] - 0.03),
    y: 2.6,
    rot: facing(0, -1),
    text: 'SPORTS ARENA',
    scale: 0.55,
  })
  prism('metal', circle(A(147, T.e.v[0] - 0.6), 0.07, 8), 0, 16)

  // the court by the practice facility: a flat canopy over a door in the end wall
  box('metal', [151.5, 161], [249.7, END.ne], [4.3, 4.5], 'uUvtb', smooth)
  add('dark', smooth(wallQuad(A(155.3, END.ne - 0.02), A(157.3, END.ne - 0.02), 0, 2.4, D(0, -1))))

  // the back: plain panels, the loading dock's door by the west tower
  box('precast', [T.w.u[1], T.s.u[0]], [END.sw, 298.3], [0, HALL.top], 'Vt')
  fv('precast', 298, T.w.u[1], T.s.u[0], HALL.roof, HALL.top, -1)
  add('dark', smooth(wallQuad(A(106, 298.32), A(109.6, 298.32), 0, 3.2, D(0, 1))))
  // the loading dock's well (osm's box, building 166): a low wall with a rail round it
  const well = b.landmark!.well?.map(([x, z]) => ({ x: x!, z: z! }))
  for (const { p, q, out, len } of well ? edges(well) : []) {
    const o = { x: -out.x, z: -out.z }
    const by = (c: Point, k: number) => ({ x: c.x + o.x * k, z: c.z + o.z * k })
    add('precast', wallQuad(p, q, 0, 0.5, out))
    add('precast', wallQuad(by(p, 0.25), by(q, 0.25), 0, 0.5, o))
    add('precast', flat([p, q, by(q, 0.25), by(p, 0.25)], 0.5))
    add('metal', smooth(flat([by(p, 0.1), by(q, 0.1), by(q, 0.17), by(p, 0.17)], 1.1)))
    add('metal', smooth(wallQuad(by(p, 0.1), by(q, 0.1), 1.03, 1.1, out)))
    add('metal', smooth(wallQuad(by(p, 0.17), by(q, 0.17), 1.03, 1.1, o)))
    const posts = Math.max(1, Math.round(len / 2))
    for (let k = 0; k < posts; k++) {
      const t = (k + 0.5) / posts
      const c = by({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t }, 0.135)
      prism('metal', circle(c, 0.03, 4), 0.5, 1.03, false)
    }
  }

  // inside the ground floor: the pavilion and the doors are glass. along the party wall
  // they're moved in a bit, the practice facility's walls are on the same line
  insideWalls(inside, outline, door, (p, q) => {
    const [u, v] = uvOf({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 })
    return u < 94.05 && v > 235.5 && v < 252.2
  })
  for (const geo of inside.solid) {
    const pos = geo.getAttribute('position')
    const [u0] = uvOf({ x: pos.getX(0), z: pos.getZ(0) })
    const [u1] = uvOf({ x: pos.getX(1), z: pos.getZ(1) })
    if (Math.abs(u0 - HALL.se) < 0.01 && Math.abs(u1 - HALL.se) < 0.01) {
      const d = D(-0.05, 0)
      geo.translate(d.x, 0, d.z)
    }
  }

  return {
    parts: merged(),
    inside,
    signs,
    first: ['precast'],
    noShadow: ['glass', 'blue', 'dark'],
  }
}

// what you bump into outside: the terrace's columns, the bridges' piers, the steps under the
// terrace and the flagpole
export function arenaObstacles(b: ArenaData) {
  const { A } = arenaFrame(b)
  const circles = [
    ...COLUMNS.map((u) => ({ ...A(u, TERRACE.v + 0.6), radius: 0.65 })),
    ...BRIDGES.flatMap(({ u }) =>
      PIERS.flatMap((v) =>
        [u[0] + 0.1 + PIER / 2, u[1] - 0.1 - PIER / 2].map((c) => ({
          ...A(c, v + PIER / 2),
          radius: PIER * 0.6,
        })),
      ),
    ),
    { ...A(147, TOWERS.e.v[0] - 0.6), radius: 0.15 },
  ]
  const steps = [TERRACE.u[0] + 1.2, TERRACE.u[1] - 1.2].map((u) => A(u, SIGN_WALL.v - 1.8))
  const walls: Segment[] = [{ ax: steps[0]!.x, az: steps[0]!.z, bx: steps[1]!.x, bz: steps[1]!.z }]
  return { circles, walls }
}
