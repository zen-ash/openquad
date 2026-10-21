import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'
import { BRIDGE } from './petitScience'

// the research science center (2016) on decatur st next to petit: labs for molecular and
// translational medicine. a glass box on decatur st over a band of aluminium fins and a
// ground floor set back under it, a grey brick block by petit with the sign and the doors in
// a glass recess beside it, a glass box on the jesse hill jr dr corner, a charcoal brick tower
// down jesse hill jr dr with gsu's flame up top, tan brick on round columns toward the
// research tower and a silver metal penthouse. petit's glass bridge comes in to a glass box
// at the back. from usgs's lidar (2018), gsu's photos (2016-2026), the epsten group's (about
// 2017) and mapillary (2019, 2020). sources: docs/reference/research-science-center.md
//
// "u" is meters along decatur st toward jesse hill jr dr, "v" meters in from decatur st toward
// the research tower, from an osm node on the front (the same numbers as build-campus.mjs).
// heights are over 306.5m, petit's ground, so its bridge lines up

export type RscData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { origin: number[]; along: number[] }
}

// few parts, each is a draw call in every pass. three bricks, the window glass (its frame
// color is also the dark joints in the brick, the canopy, the pergola and the louvres), the
// silver metal (the penthouse, fins, copings) and the see-through storefronts. all of it
// casts: the building is empty inside and has glass on both sides
export type Part = 'tan' | 'grey' | 'charcoal' | 'glass' | 'metal' | 'clear'

type Range = readonly [number, number]
type UV = [number, number]

// same numbers as build-campus.mjs: the ground floor's walls
export const OUTLINE: UV[] = [
  [-12.4, 0.4],
  [-4.3, 0.4],
  [-4.3, 2.7],
  [15, 2.7],
  [30.2, 2.7],
  [30.2, 0.6],
  [39.3, 0.6],
  [39.3, 6],
  [40, 6],
  [40, 24],
  [34.9, 24],
  [34.9, 20.7],
  [-2.5, 20.7],
  [-2.5, 20.3],
  [-12.4, 20.3],
]
// the slab lines (4.65m apart), the roof behind the coping, the coping and its metal cap
export const FLOORS = [6.3, 11, 15.6, 20.3]
const ROOF = 24.9
export const COPING = 25.85
const CAP = 0.25
// the grey block by petit
export const BLOCK = { u: [-12.4, -4.3] as Range, v: [0.4, 20.3] as Range, roof: 30.2, top: 31.2 }
// the ground floor on decatur st, 2.7m in under the floors over it: glass from the recess to
// `to`, tan brick on to the corner box. the soffit over it
export const STORE = { v: 2.7, to: 15, soffit: 5 }
// the storefronts are see-through up to the inside's ceiling, window glass over that
const SEE = CEILING
// the recess with the doors: glass all the way up, a sunshade across it and a metal box set
// back over it (lidar)
export const NOTCH = {
  u: [-4.3, 1] as Range,
  box: [5.5, 15.5] as Range,
  ledge: [10.75, 11] as Range,
}
// the main box's glass on decatur st, and the fins in front of the second floor
export const MAIN = { u: [1, 28.4] as Range }
const FINS = { from: 1.3, to: 28.1, every: 0.6, deep: 0.5, y: [5, 11] as Range }
const ROWS = [5, ...FLOORS, 24.35, COPING - CAP]
// the light pier next to the corner box, and the dark slot between them
const PIER = { u: [28.4, 30.2] as Range, out: 0.3 }
const GAP = { u: [30.2, 31] as Range, v: 0.3 }
// the glass box on the corner of jesse hill jr dr, louvres along its bottom
export const CORNER = { u: [31, 39.5] as Range, v: [-0.2, 6] as Range, bottom: 4.3, glass: 4.95 }
// the charcoal tower down jesse hill jr dr: a glass slot up it and gsu's flame at the top
export const TOWER = { u: [34.9, 40] as Range, v: [6, 24] as Range, roof: 31.4, top: 32.75 }
const TOWER_SLOT = { v: [10.3, 12.8] as Range, y: [4.9, 26.7] as Range }
// toward the research tower: tan brick from a soffit at 5.65m on round columns, the ground
// floor 3m in behind them. a grey brick panel set in it with three ribbon windows and a light
// shelf across each, a stair slot by the tower and the stair core by the grey block
export const BACK = { v: 23.7, store: 20.7, soffit: 5.65, u: [-2.5, 33.6] as Range }
export const COLUMNS = [0.7, 7, 13.3, 19.8, 26.4, 32.4]
export const COLUMN = { v: 23, r: 0.3 }
const PANEL = { u: [7.6, 26.3] as Range, from: 11.1, v: 23.4 }
export const RIBBONS: Range[] = [
  [11.95, 14.7],
  [16.6, 19.35],
  [21.1, 24],
]
const SHELF = 1.15
const SLOT = { u: [33.6, 34.9] as Range, v: 23.5 }
const CORE: Range = [-4.3, -2.5]
// the second doors toward the research tower, in a storefront right by the charcoal tower
// (gsu 2026, by eye: in 2017 it was dark brick there, the courtyard was a parking lot)
const BACK_DOORS = { store: [30, 34.9] as Range, doors: [32.8, 34.5] as Range }
// the joints in the brick: the tan's at the ribbons' sills, the others at the slabs, and a
// soldier course along the bottom
const TAN_JOINTS = [7.3, 11.95, 16.6, 21.25]
const JOINTS = [0.5, ...FLOORS, ROOF, 29.5]
// the glass box petit's bridge comes in to, on two square columns (one under the bridge)
export const BOX = {
  u: [-9.2, -2.5] as Range,
  v: [20.3, 25.6] as Range,
  under: 18,
  glass: 18.6,
  roof: 25.1,
  top: 26.2,
}
// petit's bridge (campus.json building 239) runs along the grey block's back and ends against
// the box at u, from the block out to `to`
export const BRIDGE_IN = { u: -9.2, to: 23.3 }
export const BOX_COLUMNS: [number, number, number][] = [
  [-11.8, 21.8, BRIDGE.under],
  [-5.6, 23, 18],
]
// the penthouse: silver metal with ribs across, a band of louvres on decatur st. the metal box
// over the recess is lower. behind it a yard of fans and a screen along the back (lidar)
const PENTHOUSE = { u: [0, 35.5] as Range, v: [3.2, 15] as Range, top: 32.7 }
const LOUVRES = { u: [1.7, 31.7] as Range, y: [27.4, 29.2] as Range }
const SCREEN = { u: [0, 33.6] as Range, v: [20.6, 21.2] as Range, top: 31.8 }
const FANS: [number, number, number, number, number][] = [
  [2, 7, 16, 19.6, 29.5],
  [10, 16, 15.8, 19.8, 28.6],
  [19, 25, 15.8, 19.8, 28.6],
  [28, 33, 16, 19.6, 29.5],
]
// the canopy over the doors on two posts (the lidar has its inner half at 3.9m, gsu's photos
// have it 7m out from the doors), and the pergola of dark steel along the front (lidar
// 3.9-4.2m)
export const CANOPY = { u: [-6.2, 3.3] as Range, v: -4.6, y: [3.85, 4.05] as Range }
export const CANOPY_POSTS: UV[] = [
  [-1.7, -4.3],
  [2.4, -4.3],
]
export const PERGOLA = { u: [3.5, 33] as Range, v: -2.3, y: [3.95, 4.15] as Range, every: 2.45 }

export function rscFrame(b: RscData) {
  const [ox, oz] = b.landmark!.origin as [number, number]
  const [ax, az] = b.landmark!.along as [number, number]
  // v goes in, toward the research tower
  const A = (u: number, v: number): Point => ({ x: ox + ax * u - az * v, z: oz + az * u + ax * v })
  const D = (u: number, v: number): Point => ({ x: ax * u - az * v, z: az * u + ax * v })
  const uvOf = (p: Point): UV => {
    const [dx, dz] = [p.x - ox, p.z - oz]
    return [ax * dx + az * dz, -az * dx + ax * dz]
  }
  return { A, D, uvOf }
}

// the posts of the pergola, every other beam
export const pergolaPosts = () => {
  const out: number[] = []
  for (let u = PERGOLA.u[0], i = 0; u <= PERGOLA.u[1] + 0.01; u += PERGOLA.every, i++)
    if (i % 2 === 0) out.push(u)
  return out
}

export function researchScienceGeometry(b: RscData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, D, uvOf } = rscFrame(b)
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  type Change = (geo: THREE.BufferGeometry) => THREE.BufferGeometry
  const same: Change = (geo) => geo
  // uvs stretched so far the texture, the joints and the metal's ribs fade to their average:
  // a flat paint or a smooth surface (the canopy's top, posts, soffits, columns)
  const plain: Change = (geo) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 200, uv.getY(i) * 200)
    return geo
  }
  // the metal's ribs run up its uvs, turned so they run across (the penthouse's panels)
  const across: Change = (geo) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
    return geo
  }
  // all frame in the glass's shader: its dark bronze paint, for the canopy's underside, the
  // pergola and the louvres (the brick stretched flat came out light grey under the canopy,
  // the real one is nearly black)
  const dark: Change = (geo) => {
    const n = geo.getAttribute('position').count
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(n * 2).fill(0), 2))
    const pane = Array.from({ length: n }, () => [0.01, 0.01, 0]).flat()
    geo.setAttribute('aPane', new THREE.Float32BufferAttribute(pane, 3))
    return geo
  }
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
  // a wall face at u from v0 to v1, facing -u (s -1, toward petit) or +u
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
  // a level polygon through [u, v] corners at y, facing up or down. the families read uv y
  // as the height for the dirt near the ground, so its v is moved far from 0
  const level = (part: Part, c: UV[], y: number, up = true, f = same) => {
    const tris = THREE.ShapeUtils.triangulateShape(
      c.map(([u, v]) => new THREE.Vector2(u, v)),
      [],
    )
    const pos: number[] = []
    const uvs: number[] = []
    for (const tri of tris) {
      const [p, q, r] = tri.map((i) => c[i]!) as [UV, UV, UV]
      // the frame keeps handedness, so the turn in u, v is the turn seen from above
      const turn = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
      // seen from above with x east and z south, counterclockwise is a negative turn here
      const order = turn < 0 === up ? [p, q, r] : [p, r, q]
      for (const [u, v] of order) {
        const g = A(u, v)
        pos.push(g.x, y, g.z)
        uvs.push(u, v + 1000)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(
        pos.map((_, i) => (i % 3 === 1 ? (up ? 1 : -1) : 0)),
        3,
      ),
    )
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    add(part, f(geo))
  }
  const rect = ([u0, u1]: Range, [v0, v1]: Range): UV[] => [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ]
  const lid = (part: Part, u: Range, v: Range, y: number, up = true, f = same) =>
    level(part, rect(u, v), y, up, f)
  // a box, only the faces asked for: u/U the -u/+u sides, v/V the -v/+v ones, t top, b bottom
  const box = (part: Part, u: Range, v: Range, y: Range, faces = 'uUvVtb', f = same) => {
    if (faces.includes('u')) fu(part, u[0], v[0], v[1], y[0], y[1], -1, f)
    if (faces.includes('U')) fu(part, u[1], v[0], v[1], y[0], y[1], 1, f)
    if (faces.includes('v')) fv(part, v[0], u[0], u[1], y[0], y[1], -1, f)
    if (faces.includes('V')) fv(part, v[1], u[0], u[1], y[0], y[1], 1, f)
    if (faces.includes('t')) lid(part, u, v, y[1], true, f)
    if (faces.includes('b')) lid(part, u, v, y[0], false, f)
  }
  // a wall face from `from` to `to` with holes cut out of it, all in the same u (or v)
  const holed = (
    face: (a: number, z: number, y0: number, y1: number) => void,
    from: number,
    to: number,
    y0: number,
    y1: number,
    holes: Hole[],
  ) => {
    const cut = holes.map(([h0, h1, v0, v1]): Hole => [h0 - from, h1 - from, v0, v1])
    for (const [p0, p1, v0, v1] of solidPieces(to - from, y0, y1, cut))
      face(from + p0, from + p1, v0, v1)
  }
  const faceV =
    (part: Part, v: number, s: number, f = same) =>
    (a: number, z: number, y0: number, y1: number) =>
      fv(part, v, a, z, y0, y1, s, f)
  const faceU =
    (part: Part, u: number, s: number, f = same) =>
    (a: number, z: number, y0: number, y1: number) =>
      fu(part, u, a, z, y0, y1, s, f)
  // window glass facing s at v (or at u), split where the rows are and in bays about `bay`
  // wide, so the panes light up (and tint) a bay at a time
  const paneV = (v: number, u0: number, u1: number, rows: number[], s: number, bay = 3.6) => {
    const n = Math.max(1, Math.round((u1 - u0) / bay))
    for (let i = 0; i < n; i++)
      for (let k = 1; k < rows.length; k++) {
        const [a, z] = [u0 + ((u1 - u0) * i) / n, u0 + ((u1 - u0) * (i + 1)) / n]
        if (rows[k]! - rows[k - 1]! > 0.01)
          add('glass', glassQuad(A(a, v), A(z, v), rows[k - 1]!, rows[k]!, D(0, s)))
      }
  }
  const paneU = (u: number, v0: number, v1: number, rows: number[], s: number, bay = 3.6) => {
    const n = Math.max(1, Math.round((v1 - v0) / bay))
    for (let i = 0; i < n; i++)
      for (let k = 1; k < rows.length; k++) {
        const [a, z] = [v0 + ((v1 - v0) * i) / n, v0 + ((v1 - v0) * (i + 1)) / n]
        if (rows[k]! - rows[k - 1]! > 0.01)
          add('glass', glassQuad(A(u, a), A(u, z), rows[k - 1]!, rows[k]!, D(s, 0)))
      }
  }
  const rowsOf = (y0: number, y1: number) => [
    y0,
    ...FLOORS.filter((y) => y > y0 + 1 && y < y1 - 1),
    y1,
  ]
  // thin dark joints across a brick face, 1cm out of it, round the holes. a bar this thin is
  // all frame in the glass's shader. at(s) is the spot s along the wall
  const joints = (
    at: (s: number) => Point,
    out: Point,
    from: number,
    to: number,
    ys: number[],
    holes: Hole[] = [],
  ) => {
    for (const y of ys) {
      const gaps = holes
        .filter((h) => y > h[2] - 0.03 && y < h[3] + 0.03)
        .sort((h, k) => h[0] - k[0])
      let s = from
      for (const [a, z] of [...gaps.map((h) => [h[0], h[1]] as const), [to, to] as const]) {
        if (a - s > 0.05) {
          const geo = glassQuad(at(s), at(Math.min(a, to)), y - 0.02, y + 0.02, out)
          const pane = geo.getAttribute('aPane')
          for (let i = 0; i < pane.count; i++) pane.setZ(i, 0)
          add('glass', geo)
        }
        s = Math.max(s, z)
      }
    }
  }
  const jointsV = (v: number, s: number, from: number, to: number, ys: number[], holes?: Hole[]) =>
    joints((a) => A(a, v + s * 0.01), D(0, s), from, to, ys, holes)
  const jointsU = (u: number, s: number, from: number, to: number, ys: number[], holes?: Hole[]) =>
    joints((a) => A(u + s * 0.01, a), D(s, 0), from, to, ys, holes)
  // the metal cap along the top of a wall and the parapet's inside down to the roof, along a
  // path of [u, v] with the outside on its left: a band down the outside, the top (mitred at
  // the corners) and the inside
  const rim = (path: UV[], top: number, roof: number, closed = false, part: Part = 'metal') => {
    const n = path.length
    const left = (p: UV, q: UV): UV => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1])
      return [(q[1] - p[1]) / l, -(q[0] - p[0]) / l]
    }
    const offset = (i: number, d: number): UV => {
      const p = path[i]!
      const prev = closed || i > 0 ? left(path[(i - 1 + n) % n]!, p) : null
      const next = closed || i < n - 1 ? left(p, path[(i + 1) % n]!) : null
      const [a, z] = [prev ?? next!, next ?? prev!]
      const k = d / (1 + a[0] * z[0] + a[1] * z[1])
      return [p[0] + (a[0] + z[0]) * k, p[1] + (a[1] + z[1]) * k]
    }
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n
      const [o0, o1, i0, i1] = [offset(i, 0.03), offset(j, 0.03), offset(i, -0.3), offset(j, -0.3)]
      const [du, dv] = left(path[i]!, path[j]!)
      const out = D(du, dv)
      add('metal', plain(wallQuad(A(...o0), A(...o1), top - CAP, top, out)))
      level('metal', [o0, o1, i1, i0], top, true, plain)
      add(part, plain(wallQuad(A(...i0), A(...i1), roof, top, { x: -out.x, z: -out.z })))
    }
  }
  // a round column, its uvs stretched smooth
  const column = (part: Part, [u, v]: UV, r: number, y0: number, y1: number, sides = 12) => {
    for (let k = 0; k < sides; k++) {
      const [t0, t1] = [(k / sides) * Math.PI * 2, ((k + 1) / sides) * Math.PI * 2]
      const tm = (t0 + t1) / 2
      add(
        part,
        plain(
          wallQuad(
            A(u + Math.cos(t0) * r, v + Math.sin(t0) * r),
            A(u + Math.cos(t1) * r, v + Math.sin(t1) * r),
            y0,
            y1,
            D(Math.cos(tm), Math.sin(tm)),
          ),
        ),
      )
    }
  }

  const doorU = door ? uvOf(door)[0] : -2.7
  const doorHole: Hole = [doorU - DOOR_WIDTH / 2, doorU + DOOR_WIDTH / 2, 0, SEE]
  const [b0, b1] = BLOCK.u
  const [bf, bb] = BLOCK.v
  const blockTop = BLOCK.top - CAP

  // the grey block by petit: brick all round, the bridge and the box come in on its back
  fv('grey', bf, b0, b1, 0, blockTop, -1)
  fu('grey', b0, bf, bb, 0, blockTop, -1)
  const boxHole: Hole = [BOX.u[0], b1, BOX.under, BOX.top]
  const bridgeHole: Hole = [b0, BRIDGE_IN.u, BRIDGE.under, BRIDGE.top]
  holed(faceV('grey', bb, 1), b0, b1, 0, blockTop, [bridgeHole, boxHole])
  // its side in the recess, and over the roofs next to it
  fu('grey', b1, bf, STORE.v, 0, blockTop, 1)
  fu('grey', b1, STORE.v, NOTCH.box[0], COPING, blockTop, 1)
  fu('grey', b1, NOTCH.box[1], bb, ROOF, blockTop, 1)
  rim(
    [
      [b0, bf],
      [b1, bf],
      [b1, bb],
      [b0, bb],
    ],
    BLOCK.top,
    BLOCK.roof,
    true,
    'grey',
  )
  lid('metal', [b0 + 0.3, b1 - 0.3], [bf + 0.3, bb - 0.3], BLOCK.roof, true, plain)
  jointsV(
    bf,
    -1,
    b0,
    b1,
    JOINTS.filter((y) => y < blockTop),
  )
  jointsU(
    b0,
    -1,
    bf,
    bb,
    JOINTS.filter((y) => y < blockTop),
  )
  jointsU(
    b1,
    1,
    bf,
    STORE.v,
    JOINTS.filter((y) => y < blockTop),
  )
  jointsV(
    bb,
    1,
    b0,
    b1,
    JOINTS.filter((y) => y < blockTop),
    [bridgeHole, boxHole],
  )

  // the recess with the doors: the storefront at the bottom (see-through up to the inside's
  // ceiling), glass the whole way up over it with a sunshade across, a cap and a metal box
  // set back over the top. the main box's end on its other side is ribbed metal
  const [n0, n1] = NOTCH.u
  const store = STORE.v - 0.02
  holed(
    (a, z, y0, y1) => add('clear', wallQuad(A(a, store), A(z, store), y0, y1, D(0, -1), a - n0)),
    n0,
    STORE.to,
    0,
    SEE,
    [doorHole],
  )
  paneV(STORE.v, n0, n1, rowsOf(SEE, COPING - CAP), -1, 2.7)
  // over it, under the soffit: dark behind the glass (the window glass reflected the sky
  // there, the photos have it in deep shade)
  fv('charcoal', STORE.v, n1, STORE.to, SEE, STORE.soffit, -1, plain)
  add('clear', wallQuad(A(n1, store), A(STORE.to, store), SEE, STORE.soffit, D(0, -1), n1 - n0))
  box('metal', NOTCH.u, [1, STORE.v], NOTCH.ledge, 'vtb', plain)
  fv('metal', STORE.v - 0.03, n0, n1, COPING - CAP, COPING, -1, plain)
  lid('metal', NOTCH.u, [STORE.v - 0.03, NOTCH.box[0]], COPING, true, plain)
  fu('metal', n1, 0, STORE.v, STORE.soffit, COPING, -1, across)
  const [k0, k1] = NOTCH.box
  fv('metal', k0, n0, PENTHOUSE.u[0], COPING, BLOCK.top, -1, across)
  fv('metal', k1, n0, PENTHOUSE.u[0], ROOF, BLOCK.top, 1, across)
  lid('metal', [n0, PENTHOUSE.u[0]], NOTCH.box, BLOCK.top, true, plain)
  // a small louvred door in it (gsu's photo from the parking deck)
  fv('glass', k0 - 0.02, -3.6, -2.6, 26.1, 27.4, -1, dark)
  // the doors: a frame round the game's doorway, a dark transom with "157" over it
  for (const u of [doorHole[0] - 0.08, doorHole[1]])
    box('metal', [u, u + 0.08], [STORE.v - 0.1, STORE.v], [0, DOOR_HEIGHT], 'uUv', plain)
  fv('glass', STORE.v - 0.04, doorHole[0] - 0.08, doorHole[1] + 0.08, DOOR_HEIGHT, SEE, -1, dark)

  // decatur st: the main box's glass from the soffit to the coping, the fins across the
  // second floor, the soffit over the ground floor and a ceiling higher up inside it for the
  // shadows only (the shadow lookup is pushed out along the surface, right under a soffit it
  // looked past it). the ground floor at the back: glass, then tan brick
  const [m0, m1] = MAIN.u
  paneV(0, m0, m1, ROWS, -1)
  for (let u = FINS.from; u <= FINS.to + 0.01; u += FINS.every)
    box('metal', [u - 0.03, u + 0.03], [-FINS.deep, 0], FINS.y, 'uUvtb', plain)
  lid('grey', MAIN.u, [0, STORE.v], STORE.soffit, false, plain)
  lid('grey', [m1, PIER.u[1]], [-PIER.out, STORE.v], STORE.soffit, false, plain)
  lid('metal', [m0 + 0.05, PIER.u[1] - 0.05], [0.05, STORE.v - 0.05], STORE.soffit + 0.8, false)
  fv('tan', STORE.v, STORE.to, PIER.u[1], 0, STORE.soffit, -1)
  // the pier, and the slot between it and the corner box
  box('metal', PIER.u, [-PIER.out, 0], [STORE.soffit, COPING - CAP], 'uv', plain)
  fu('metal', PIER.u[1], -PIER.out, GAP.v, STORE.soffit, COPING - CAP, 1, plain)
  paneV(GAP.v, GAP.u[0], GAP.u[1], rowsOf(CORNER.bottom, COPING - CAP), -1)
  fu('metal', GAP.u[1], CORNER.v[0], GAP.v, CORNER.bottom, COPING - CAP, -1, plain)

  // the corner box: louvres along the bottom, glass on both faces, the ground floor's tan
  // brick set in under it. its soffit, and the shadow ceiling inside
  const [c0, c1] = CORNER.u
  const [cf, cb] = CORNER.v
  const crows = [CORNER.glass, ...ROWS.slice(1)]
  paneV(cf, c0, c1, crows, -1)
  paneU(c1, cf, cb, crows, 1)
  fv('metal', cf, c0, c1, CORNER.bottom, CORNER.glass, -1, across)
  fu('metal', c1, cf, cb, CORNER.bottom, CORNER.glass, 1, across)
  level(
    'grey',
    [
      [GAP.u[0], cf],
      [c1, cf],
      [c1, cb],
      [39.3, cb],
      [39.3, 0.6],
      [GAP.u[0], 0.6],
    ],
    CORNER.bottom,
    false,
    plain,
  )
  lid('metal', [c0 + 0.05, c1 - 0.05], [cf + 0.05, 0.55], CORNER.bottom + 0.8, false)
  fu('metal', GAP.u[0], cf, 0.6, CORNER.bottom, STORE.soffit, -1, plain)
  fu('tan', GAP.u[0], 0.6, STORE.v, 0, STORE.soffit, -1)
  fv('tan', 0.6, GAP.u[0], 39.3, 0, CORNER.bottom, -1)
  fu('tan', 39.3, 0.6, 6, 0, CORNER.bottom, 1)
  // the main roof's coping round decatur st and the corner box
  rim(
    [
      [m0, STORE.v],
      [m0, 0],
      [m1, 0],
      [m1, -PIER.out],
      [PIER.u[1], -PIER.out],
      [PIER.u[1], GAP.v],
      [c0, GAP.v],
      [c0, cf],
      [c1, cf],
      [c1, cb],
    ],
    COPING,
    ROOF,
  )

  // the charcoal tower: brick to the ground, the slot up its jesse hill jr dr side, a parapet
  const [t0, t1] = TOWER.u
  const [tf, tb] = TOWER.v
  const towerTop = TOWER.top - CAP
  const slotHole: Hole = [TOWER_SLOT.v[0], TOWER_SLOT.v[1], TOWER_SLOT.y[0], TOWER_SLOT.y[1]]
  holed(faceU('charcoal', t1, 1), tf, tb, 0, towerTop, [slotHole])
  const sv = TOWER_SLOT.v
  fv('charcoal', sv[0], t1 - 0.25, t1, TOWER_SLOT.y[0], TOWER_SLOT.y[1], 1)
  fv('charcoal', sv[1], t1 - 0.25, t1, TOWER_SLOT.y[0], TOWER_SLOT.y[1], -1)
  lid('charcoal', [t1 - 0.25, t1], sv, TOWER_SLOT.y[0])
  lid('charcoal', [t1 - 0.25, t1], sv, TOWER_SLOT.y[1], false)
  paneU(t1 - 0.25, sv[0], sv[1], [TOWER_SLOT.y[0], ...FLOORS.slice(1), ROOF, TOWER_SLOT.y[1]], 1)
  fv('charcoal', tb, t0, t1, 0, towerTop, 1)
  fv('charcoal', tf, 39.3, t1, 0, CORNER.bottom, -1)
  fv('charcoal', tf, c1, t1, CORNER.bottom, ROOF, -1)
  fv('charcoal', tf, PENTHOUSE.u[1], t1, ROOF, towerTop, -1)
  fu('charcoal', t0, BACK.store, tb, 0, BACK.soffit, -1)
  fu('charcoal', t0, SLOT.v, tb, BACK.soffit, ROOF, -1)
  fu('charcoal', t0, PENTHOUSE.v[1], tb, ROOF, towerTop, -1)
  rim(
    [
      [t0, tf],
      [t1, tf],
      [t1, tb],
      [t0, tb],
    ],
    TOWER.top,
    TOWER.roof,
    true,
    'charcoal',
  )
  lid('metal', [t0 + 0.3, t1 - 0.3], [tf + 0.3, tb - 0.3], TOWER.roof, true, plain)
  jointsU(t1, 1, tf, tb, JOINTS, [slotHole])
  jointsV(tb, 1, t0, t1, JOINTS)

  // toward the research tower: the tan brick on its columns, the grey panel set 0.3m in with
  // the ribbons (a light shelf across each), the stair slot by the tower
  const [w0, w1] = BACK.u
  const panelHole: Hole = [PANEL.u[0], PANEL.u[1], PANEL.from, COPING - CAP]
  holed(faceV('tan', BACK.v, 1), w0, w1, BACK.soffit, COPING - CAP, [panelHole])
  const [p0, p1] = PANEL.u
  holed(
    faceV('grey', PANEL.v, 1),
    p0,
    p1,
    PANEL.from,
    COPING - CAP,
    RIBBONS.map(([y0, y1]): Hole => [p0, p1, y0, y1]),
  )
  fu('tan', p0, PANEL.v - 0.1, BACK.v, PANEL.from, COPING - CAP, 1)
  fu('tan', p1, PANEL.v - 0.1, BACK.v, PANEL.from, COPING - CAP, -1)
  lid('tan', PANEL.u, [PANEL.v, BACK.v], PANEL.from)
  lid('metal', PANEL.u, [PANEL.v, BACK.v], COPING - CAP, false, plain)
  for (const [y0, y1] of RIBBONS) {
    const shelf = y1 - SHELF
    paneV(PANEL.v - 0.1, p0, p1, [y0, shelf - 0.05, shelf + 0.05, y1], 1)
    lid('grey', PANEL.u, [PANEL.v - 0.1, PANEL.v], y0)
    lid('grey', PANEL.u, [PANEL.v - 0.1, PANEL.v], y1, false)
    box(
      'metal',
      PANEL.u,
      [PANEL.v - 0.1, PANEL.v + 0.2],
      [shelf - 0.05, shelf + 0.05],
      'Vtb',
      plain,
    )
  }
  jointsV(BACK.v, 1, w0, w1, TAN_JOINTS, [panelHole])
  // the stair slot by the tower
  fv('charcoal', SLOT.v - 0.05, SLOT.u[0], SLOT.u[1], BACK.soffit, COPING - CAP, 1, plain)
  add(
    'clear',
    wallQuad(A(SLOT.u[0], SLOT.v), A(SLOT.u[1], SLOT.v), BACK.soffit, COPING - CAP, D(0, 1)),
  )
  fu('tan', SLOT.u[0], SLOT.v, BACK.v, BACK.soffit, COPING - CAP, 1)
  // the soffit over the ground floor (and its shadow ceiling), the columns under it
  lid('grey', [w0, w1], [BACK.store, BACK.v], BACK.soffit, false, plain)
  lid('grey', SLOT.u, [BACK.store, SLOT.v], BACK.soffit, false, plain)
  lid('metal', [w0 + 0.05, t0 - 0.05], [BACK.store + 0.05, SLOT.v - 0.05], BACK.soffit + 0.8, false)
  for (const u of COLUMNS) column('tan', [u, COLUMN.v], COLUMN.r, 0, BACK.soffit)
  // the ground floor behind the columns: dark brick (2017; the grey came out as bright as the
  // sunlit tan in the 3m deep shade), and the second doors in a storefront by the tower
  // (2026). dark behind the storefront's glass, window glass reflected the sky there
  const [d0, d1] = BACK_DOORS.store
  fv('charcoal', BACK.store, w0, d0, 0, BACK.soffit, 1)
  jointsV(BACK.store, 1, w0, d0, [JOINTS[0]!])
  fv('charcoal', BACK.store, d0, d1, 0, BACK.soffit, 1, plain)
  const backStore = BACK.store + 0.02
  add('clear', wallQuad(A(d0, backStore), A(d1, backStore), 0, BACK.soffit, D(0, 1)))
  const doors = BACK_DOORS.doors
  for (const u of [...doors, (doors[0] + doors[1]) / 2])
    box('metal', [u - 0.04, u + 0.04], [BACK.store, BACK.store + 0.08], [0, 2.4], 'uUV', plain)
  box('metal', doors, [BACK.store, BACK.store + 0.08], [2.4, 2.48], 'Vtb', plain)
  // the end of the tan brick by the box, and the stair core next to it under the box
  fu('tan', w0, BOX.v[0], BACK.store, 0, BOX.under, -1)
  fu('tan', w0, BACK.store, BACK.v, BACK.soffit, BOX.under, -1)
  fv('charcoal', BOX.v[0], CORE[0], CORE[1], 0, BOX.under, 1, plain)
  add(
    'clear',
    wallQuad(A(CORE[0], BOX.v[0] + 0.02), A(CORE[1], BOX.v[0] + 0.02), 0, BOX.under, D(0, 1)),
  )
  // the coping toward the research tower
  rim(
    [
      [t0, SLOT.v],
      [SLOT.u[0], SLOT.v],
      [SLOT.u[0], BACK.v],
      [w0, BACK.v],
    ],
    COPING,
    ROOF,
  )

  // the glass box at the back, the bridge from petit comes in through its petit end: a metal
  // fascia and its soffit, glass to the cap, the square columns. the shadow ceilings inside
  // the box and the bridge, over the columns
  const [x0, x1] = BOX.u
  const [y0, y1] = BOX.v
  const boxTop = BOX.top - CAP
  const brows = [BOX.glass, 21.07, 23.53, boxTop]
  fv('metal', y1, x0, x1, BOX.under, BOX.glass, 1, plain)
  fu('metal', x1, BACK.v, y1, BOX.under, BOX.glass, 1, plain)
  fu('metal', x0, y0, y1, BOX.under, BOX.glass, -1, plain)
  paneV(y1, x0, x1, brows, 1, 2.4)
  paneU(x1, BACK.v, y1, brows, 1)
  const i1 = BRIDGE_IN.to
  paneU(x0, i1, y1, brows, -1)
  paneU(x0, y0, i1, [BOX.glass, BRIDGE.under], -1)
  paneU(x0, y0, i1, [BRIDGE.top, boxTop], -1)
  fv('metal', y0, CORE[0], x1, ROOF, boxTop, -1, plain)
  lid('grey', BOX.u, BOX.v, BOX.under, false, plain)
  lid('metal', [x0 + 0.05, x1 - 0.05], [y0 + 0.05, y1 - 0.05], BOX.under + 0.8, false)
  lid('metal', [b0 + 0.05, x0 - 0.05], [y0 + 0.05, i1 - 0.05], BRIDGE.under + 0.8, false)
  rim(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    BOX.top,
    BOX.roof,
    true,
  )
  lid('metal', [x0 + 0.3, x1 - 0.3], [y0 + 0.3, y1 - 0.3], BOX.roof, true, plain)
  for (const [u, v, top] of BOX_COLUMNS)
    box('tan', [u - 0.35, u + 0.35], [v - 0.35, v + 0.35], [0, top], 'uUvV', plain)

  // the roof: in front of the penthouse over decatur st and the corner box, and the yard
  // behind it
  level(
    'metal',
    [
      [m0, 0],
      [c0, 0],
      [c0, cf],
      [c1, cf],
      [c1, tf],
      [t0, tf],
      [t0, PENTHOUSE.v[1]],
      [m0, PENTHOUSE.v[1]],
    ],
    ROOF,
    true,
    plain,
  )
  level(
    'metal',
    [
      [n0, k1],
      [PENTHOUSE.u[0], k1],
      [PENTHOUSE.u[0], PENTHOUSE.v[1]],
      [t0, PENTHOUSE.v[1]],
      [t0, BACK.v],
      [w0, BACK.v],
      [w0, y0],
      [n0, y0],
    ],
    ROOF,
    true,
    plain,
  )
  // the penthouse: ribbed silver metal, the louvres on decatur st
  const [h0, h1] = PENTHOUSE.u
  const [hf, hb] = PENTHOUSE.v
  const ph = PENTHOUSE.top
  const louvre: Hole = [LOUVRES.u[0], LOUVRES.u[1], LOUVRES.y[0], LOUVRES.y[1]]
  holed(faceV('metal', hf, -1, across), m0, h1, ROOF, ph, [louvre])
  fv('metal', hf, h0, m0, COPING, ph, -1, across)
  fv('glass', hf - 0.02, ...LOUVRES.u, ...LOUVRES.y, -1, dark)
  fu('metal', h0, hf, k0, COPING, ph, -1, across)
  fu('metal', h0, k0, hb, BLOCK.top, ph, -1, across)
  fu('metal', h0, hb, k1, ROOF, BLOCK.top, 1, across)
  fu('metal', h1, hf, tf, ROOF, ph, 1, across)
  fv('metal', hb, h0, t0, ROOF, ph, 1, across)
  lid('metal', PENTHOUSE.u, PENTHOUSE.v, ph, true, plain)
  box('metal', SCREEN.u, SCREEN.v, [ROOF, SCREEN.top], 'uUvVt', across)
  for (const [u0, u1, v0, v1, top] of FANS)
    box('metal', [u0, u1], [v0, v1], [ROOF, top], 'uUvVt', plain)

  // the canopy over the doors: dark paint, two posts at the curb. a ceiling inside it for the
  // shadows. the pergola of dark steel along the front, posts every other beam
  const [g0, g1] = CANOPY.y
  const canopy: UV[] = [
    [CANOPY.u[0], CANOPY.v],
    [CANOPY.u[1], CANOPY.v],
    [CANOPY.u[1], STORE.v],
    [n0, STORE.v],
    [n0, bf],
    [CANOPY.u[0], bf],
  ]
  level('metal', canopy, g1, true, plain)
  level('glass', canopy, g0, false, dark)
  level('glass', canopy, g1 - 0.05, false, dark)
  fv('glass', CANOPY.v, CANOPY.u[0], CANOPY.u[1], g0, g1, -1, dark)
  fu('glass', CANOPY.u[0], CANOPY.v, bf, g0, g1, -1, dark)
  fu('glass', CANOPY.u[1], CANOPY.v, STORE.v, g0, g1, 1, dark)
  for (const [u, v] of CANOPY_POSTS)
    box('grey', [u - 0.08, u + 0.08], [v - 0.08, v + 0.08], [0, g0], 'uUvV', plain)
  const [e0, e1] = PERGOLA.y
  const pv = PERGOLA.v
  for (let u = PERGOLA.u[0]; u <= PERGOLA.u[1] + 0.01; u += PERGOLA.every) {
    const wall = u < GAP.u[0] ? STORE.v : 0.6
    box('glass', [u - 0.06, u + 0.06], [pv - 0.06, wall], [e0, e1], 'uUvtb', dark)
  }
  box('glass', PERGOLA.u, [pv - 0.08, pv + 0.08], [e0 - 0.1, e0], 'uUvVtb', dark)
  for (const u of pergolaPosts())
    box('glass', [u - 0.08, u + 0.08], [pv - 0.08, pv + 0.08], [0, e0 - 0.1], 'uUvV', dark)

  // the name on the grey block by the doors: a white plate, the logo's blue square (it's
  // gsu's trademark) and a red bar. "157" over the doors, the flame up the tower's side (a
  // blue square here too)
  const front = Math.atan2(D(0, -1).x, D(0, -1).z)
  const plate = { u: -8.3, y: 3.2 }
  signs.push({
    ...A(plate.u, bf - 0.03),
    y: plate.y,
    rot: front,
    text: 'RESEARCH SCIENCE\nCENTER',
    height: 0.95,
  })
  signs.push({
    ...A(plate.u + 1.52, bf - 0.045),
    y: plate.y,
    rot: front,
    text: '',
    plate: '#c8202f',
    width: 0.07,
    height: 0.75,
  })
  signs.push({
    ...A(doorU, STORE.v - 0.06),
    y: (DOOR_HEIGHT + SEE) / 2,
    rot: front,
    text: '157',
    letters: true,
    size: 0.55,
    color: '#dcdddb',
    weight: 500,
  })
  signs.push({
    ...A(t1 + 0.03, 20.4),
    y: 25.6,
    rot: Math.atan2(D(1, 0).x, D(1, 0).z),
    text: '',
    plate: '#1f4b99',
    width: 2.6,
    height: 2.9,
  })

  // inside the ground floor: walls round the outline, glass along the storefront on decatur
  // st (toward the research tower it's dark behind the glass, a wall inside)
  insideWalls(inside, outline, door, (p, q) => {
    const [u, v] = uvOf({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 })
    return Math.abs(v - STORE.v) < 0.01 && u < STORE.to
  })

  return { parts: merged(), inside, signs, first: ['tan', 'grey', 'charcoal'] }
}

// what you bump into outside: the columns toward the research tower and under the box, the
// canopy's and the pergola's posts
export function rscObstacles(b: RscData) {
  const { A } = rscFrame(b)
  return {
    circles: [
      ...COLUMNS.map((u) => ({ ...A(u, COLUMN.v), radius: COLUMN.r + 0.05 })),
      ...BOX_COLUMNS.map(([u, v]) => ({ ...A(u, v), radius: 0.45 })),
      ...CANOPY_POSTS.map(([u, v]) => ({ ...A(u, v), radius: 0.2 })),
      ...pergolaPosts().map((u) => ({ ...A(u, PERGOLA.v), radius: 0.12 })),
    ],
  }
}
