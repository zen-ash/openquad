import * as THREE from 'three'
import type { Point, Segment } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  flat,
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// the student recreation center (2001) on piedmont ave, across from student center east.
// white metal panels and grey louvres. a long box on piedmont ave sits on round columns
// over a colonnade, with rows of glass, louvres and a white coping band and eleven louvred
// boxes on its roof. at its north end the main doors are in a notch under a louvred sign
// band on columns, with the atrium's glass behind them, and a raised wing over an open
// corner court on gilmer st. the tall white gym box is at the back, the pool's glass bay
// and a patio with a steel canopy and the big corner sign are on the decatur st end. from
// usgs's lidar (2018), mapillary (2019), gsu's photos (2013-2024) and esri's satellite
// images. sources: docs/reference/rec-center.md
//
// "u" is meters along piedmont ave toward gilmer st, "v" meters in from piedmont ave, both
// from hurt park (the same numbers as build-campus.mjs). the game's ground is the piedmont
// ave sidewalk at the main doors: the site drops 4m to the back drive

export type RecData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { along: number[] }
}

// few parts, each is a draw call in every pass. the glass doesn't cast: it's all in walls
// with the building behind it, and the clear storefronts only go up to the inside's ceiling.
// louvres and the dark ribbed metal both have their ribs across (slats())
export type Part = 'white' | 'cream' | 'louvre' | 'dark' | 'glass' | 'clear'

type Range = readonly [number, number]

// same numbers as build-campus.mjs
export const OUTLINE: [number, number][] = [
  [-173.4, 212.5],
  [-99.6, 212.5],
  [-99.6, 220.9],
  [-80, 220.9],
  [-67.5, 220.9],
  [-67.5, 241.2],
  [-65.2, 241.2],
  [-65.2, 271.5],
  [-126.75, 271.5],
  [-136.6, 271],
  [-136.6, 244.7],
  [-199.9, 244.7],
  [-199.9, 240.4],
  [-180.9, 240.4],
  [-180.9, 212.25],
  [-173.4, 212.25],
]

// the piedmont ave face over the colonnade, rows from three fitted photos: a dark fascia
// over the soffit, the second floor's glass, louvres, a strip of windows, the white coping
export const FACE = {
  v: 209,
  soffit: 4.2,
  glass: 4.6,
  louvres: 8.2,
  windows: 10.25,
  coping: 11.3,
  top: 13.2,
}
// the main box: the back of the colonnade, the notch. over the top of the face a dark
// sloping strip goes up to the roof. at the decatur st end the face is plain panels to the
// top (the corner) instead of the rows
export const MAIN = { u: [-173.4, -99.6] as Range, back: 244.7, roof: 14.2 }
export const CORNER = -162.3
// at the notch end it's a strip of plain panels too, over the colonnade's last column (2013)
export const END = -101
export const SHOP = 212.5
const SLOPE: Range = [210, 212]
// the decatur st end of the main box sticks up as a parapet of dark ribbed metal
export const PARAPET = 15.2
// the louvred boxes on the roof: their gilmer st edges (lidar), 1.5m wide, 7.285m apart
export const TEETH = [
  -172.27, -165.3, -157.66, -150.66, -143.13, -136.03, -128.89, -121.23, -113.99, -106.51, -99.42,
]
export const TOOTH = { w: 1.5, v: [209.6, 212.4] as Range, top: 14.9 }
// the colonnade's columns, one under each box (the ones under the corner and at the notch
// by eye from the 2013 and 2019 photos)
export const COLUMNS = [
  -172.8, -166.05, -158.41, -151.41, -143.88, -136.78, -129.64, -121.98, -114.74, -107.26, -100.17,
]
export const COLUMN = { v: 209.9, r: 0.5 }
export const NOTCH = -99.6
// the atrium behind the doors: glass up to a sawtooth of skylights facing piedmont ave
export const ATRIUM = { u: [-99.6, -81.85] as Range, v: [220.9, 238] as Range, ridge: 17.2 }
const VALLEY = 16
const SKYLIGHTS = 8
// the wing on gilmer st, up on columns over the corner court in front of the doors line
export const WING = { u: [-81.85, -66.3] as Range, v: [213.1, 241.2] as Range, under: 4.9 }
// over the court its side toward the doors is a bit further in (lidar)
const COURT = -80
export const WING_TOP = 9.6
// the louvred band with the name across the front of the notch and the wing, on columns,
// with white frames at its ends and where the wing starts that go back to the wing. lidar
// has it from -97 to -63 (it sticks out past the wing on gilmer st) and louvres 8.4-9.9m,
// the 2013 photo has it about a third as tall as the columns and the two in front of the
// doors 6.8m apart
export const BAND = {
  u: [-97.5, -63.2] as Range,
  v: [209.2, 210.5] as Range,
  y: [7.5, 9.9] as Range,
}
export const BAND_COLUMNS = [-93.5, -86.7, -65.2]
// the frames' depth, and the white beam in front of the wing between them (lidar)
const FRAME = { v: 213.1, y: 4.9 }
// low white planter walls [u0, u1, v0, v1]
export const PLANTERS: [number, number, number, number][] = [
  [-80, -70.5, 216.2, 217.2],
  [-97.2, -92.8, 211.6, 212.3],
  [-88.6, -82.4, 211.6, 212.3],
]
const WING_COLUMNS: [number, number][] = [
  [-79.4, 213.7],
  [-67, 213.7],
]
// the gym box at the back, over the dock annex and the back of the main box
export const GYM: [number, number][] = [
  [-126.75, 244.7],
  [-81.85, 244.7],
  [-81.85, 241.2],
  [-65.2, 241.2],
  [-65.2, 271.5],
  [-126.75, 271.5],
]
export const GYM_TOP = 17.9
export const ANNEX = { u: [-136.6, -126.75] as Range, v: [244.7, 271] as Range, top: 4.8 }
// the pool's glass bay on the decatur st end: a glass wall and a roof sloping up to the main
// box, a white block with a sloping metal roof on its piedmont ave end, and a wing behind it
export const LEAN = { u: [-180.9, -173.4] as Range, v: [216.5, 240.4] as Range, eave: 7.2 }
const BLOCK = { v: [212.25, 216.5] as Range, eave: 10.2, top: 14 }
export const SW_WING = { u: [-199.9, -173.4] as Range, v: [240.4, 244.7] as Range, top: 12.5 }
// the patio's steel canopy along piedmont ave: a beam on round columns with light panels
// behind it (lidar has it 3.3m deep, 4.2m over the sidewalk, which is 2m lower than the
// game's ground there), the columns from the 2019 photo. the fence round the patio is
// behind them
export const PATIO = { u: [-210.3, -184.4] as Range, v: [209.2, 209.8] as Range, back: 212.1 }
const PATIO_TOP = 4.2
export const PATIO_COLUMNS = [-208.7, -200.2, -192.8, -184.9]
export const FENCE: [number, number][] = [
  [-180.9, 212.4],
  [-214, 212.4],
  [-214, 240.4],
  [-199.9, 240.4],
]
const FENCE_TOP = 2
// the sign on the decatur st end of the canopy: the name's panel on a white pillar, the
// logo's on a steel post, a steel frame over both (lidar has its top 7m over the sidewalk)
export const SIGN = {
  pillar: [-210.4, 209.95] as Range,
  post: [-212.8, 211.15] as Range,
  top: 6.9,
}
// the storefront goes up to under the inside's ceiling (3.3m)
const STORE = 3.2

export function recFrame(b: RecData) {
  const [ax, az] = b.landmark!.along as [number, number]
  const A = (u: number, v: number): Point => ({ x: ax * u - az * v, z: az * u + ax * v })
  const uvOf = (p: Point): [number, number] => [ax * p.x + az * p.z, -az * p.x + ax * p.z]
  // a direction (du, dv) in the game
  const D = (du: number, dv: number): Point => ({ x: ax * du - az * dv, z: az * du + ax * dv })
  return { A, uvOf, D }
}

// the pool's roofs sloping up to the main box, height at u
const leanRoof = (u: number) => LEAN.eave + (u - LEAN.u[0]) * 0.56
const blockRoof = (u: number) => BLOCK.eave + (u - LEAN.u[0]) * ((BLOCK.top - BLOCK.eave) / 7.5)

export function recCenterGeometry(b: RecData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, uvOf, D } = recFrame(b)
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const facing = (du: number, dv: number) => {
    const d = D(du, dv)
    return Math.atan2(d.x, d.z)
  }

  type Change = (geo: THREE.BufferGeometry) => THREE.BufferGeometry
  const same: Change = (geo) => geo
  // the metal's ribs run up its uvs: turned, they're slats across
  const slats: Change = (geo) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
    return geo
  }
  // stretched so far the ribs and joints fade out, for plain metal (columns, steel)
  const smooth: Change = (geo) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 200, uv.getY(i) * 200)
    return geo
  }
  // a wall face at v from u0 to u1, facing -v (s -1, toward piedmont ave) or +v
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
  // a wall face at u from v0 to v1, facing -u (s -1, toward decatur st) or +u
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
  const rect = (u0: number, u1: number, v0: number, v1: number): [number, number][] => [
    [Math.min(u0, u1), v0],
    [Math.max(u0, u1), v0],
    [Math.max(u0, u1), v1],
    [Math.min(u0, u1), v1],
  ]
  // something flat over (u, v) corners, its uvs along u and v so joints run with the walls
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
  // a flat face through [u, v, y] corners (3 or 4, in order round it) facing o = [du, dv,
  // dy], uvs from uvAt (meters across a wall and up, by default)
  const face = (
    part: Part,
    c: [number, number, number][],
    o: [number, number, number],
    uvAt?: (u: number, v: number, y: number) => [number, number],
    f = same,
  ) => {
    const pts = c.map(([u, v, y]) => {
      const p = A(u, v)
      return new THREE.Vector3(p.x, y, p.z)
    })
    const d = D(o[0], o[1])
    const out = new THREE.Vector3(d.x, o[2], d.z)
    const n = new THREE.Vector3()
      .subVectors(pts[1]!, pts[0]!)
      .cross(new THREE.Vector3().subVectors(pts[2]!, pts[0]!))
    const order = c.map((_, i) => (n.dot(out) > 0 ? i : c.length - 1 - i))
    const tri = (c.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]).map((i) => order[i]!)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        tri.flatMap((i) => pts[i]!.toArray()),
        3,
      ),
    )
    geo.computeVertexNormals()
    // across a wall: along u if it faces v, along v if it faces u
    const across = Math.abs(o[0]) > Math.abs(o[1]) ? 1 : 0
    const at = uvAt ?? ((u: number, v: number, y: number) => [across ? v : u, y])
    geo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        tri.flatMap((i) => at(...c[i]!)),
        2,
      ),
    )
    add(part, f(geo))
  }
  // a round column from y0 to y1, its uvs stretched so no joints show on it
  const column = (part: Part, u: number, v: number, r: number, y0: number, y1: number) => {
    const c = circle(A(u, v), r, 14)
    c.forEach((p, i) => {
      const q = c[(i + 1) % c.length]!
      const mid = { x: (p.x + q.x) / 2 - A(u, v).x, z: (p.z + q.z) / 2 - A(u, v).z }
      const l = Math.hypot(mid.x, mid.z)
      add(part, smooth(wallQuad(p, q, y0, y1, { x: mid.x / l, z: mid.z / l })))
    })
  }
  // a square bar between two points [u, v, y], w thick (steel members, the sign's legs)
  const bar = (part: Part, p: [number, number, number], q: [number, number, number], w: number) => {
    const a = A(p[0], p[1])
    const z = A(q[0], q[1])
    const from = new THREE.Vector3(a.x, p[2], a.z)
    const to = new THREE.Vector3(z.x, q[2], z.z)
    const dir = new THREE.Vector3().subVectors(to, from).normalize()
    const side = new THREE.Vector3()
      .crossVectors(
        dir,
        Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0),
      )
      .normalize()
      .multiplyScalar(w / 2)
    const up = new THREE.Vector3()
      .crossVectors(side, dir)
      .normalize()
      .multiplyScalar(w / 2)
    const corners = [
      side.clone().add(up),
      side.clone().sub(up),
      side.clone().negate().sub(up),
      side.clone().negate().add(up),
    ]
    corners.forEach((c, i) => {
      const k = corners[(i + 1) % 4]!
      const quad = [from.clone().add(c), from.clone().add(k), to.clone().add(k), to.clone().add(c)]
      const n = new THREE.Vector3().addVectors(c, k).normalize()
      const geo = new THREE.BufferGeometry()
      const tri = [0, 1, 2, 0, 2, 3].map((j) => quad[j]!)
      const cross = new THREE.Vector3()
        .subVectors(quad[1]!, quad[0]!)
        .cross(new THREE.Vector3().subVectors(quad[2]!, quad[0]!))
      if (cross.dot(n) < 0) tri.reverse()
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          tri.flatMap((t) => t.toArray()),
          3,
        ),
      )
      geo.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(
          tri.flatMap(() => n.toArray()),
          3,
        ),
      )
      geo.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute([0, 0, 900, 0, 900, 900, 0, 0, 900, 900, 0, 900], 2),
      )
      add(part, geo)
    })
  }

  // the piedmont ave face over the colonnade
  const F = FACE
  const [m0, m1] = MAIN.u
  fv('dark', F.v, m0, m1, F.soffit, F.glass, -1, smooth)
  // the second floor's glass, one piece per box on the roof so their lights differ
  const bays = [CORNER, ...TEETH.slice(2, -2).map((u) => u + 2.89), END]
  for (let i = 1; i < bays.length; i++) paneV(F.v, bays[i - 1]!, bays[i]!, F.glass, F.louvres, -1)
  fv('louvre', F.v, CORNER, END, F.louvres, F.windows, -1, slats)
  // the strip of windows, a bit back: a window every 1.82m with a strip of white panel
  // between, each two panes wide and two high in dark frames (2019 photo, close up)
  const deep = F.v + 0.1
  lid('white', rect(CORNER, END, F.v, deep), F.windows)
  lid('white', rect(CORNER, END, F.v, deep), F.coping, false)
  fu('white', END, F.v, deep, F.windows, F.coping, -1)
  const count = Math.round((END - CORNER) / 1.82)
  const step = (END - CORNER) / count
  const strip = 0.2
  for (let i = 0; i < count; i++) {
    const [a, z] = [CORNER + i * step + strip / 2, CORNER + (i + 1) * step - strip / 2]
    paneV(deep, a, z, F.windows, F.coping, -1)
    const mid = (a + z) / 2
    const y = (F.windows + F.coping) / 2
    fv('dark', deep - 0.01, mid - 0.03, mid + 0.03, F.windows, F.coping, -1, smooth)
    fv('dark', deep - 0.01, a, z, y - 0.03, y + 0.03, -1, smooth)
    box('white', [z, z + strip], [F.v, deep], [F.windows, F.coping], 'uUv')
  }
  fv('white', F.v, CORNER, CORNER + strip / 2, F.windows, F.coping, -1)
  fv('white', F.v, END - strip / 2, END, F.windows, F.coping, -1)
  fv('white', F.v, END, m1, F.glass, F.coping, -1)
  fv('white', F.v, CORNER, m1, F.coping, F.top, -1)
  // the ledge on top and the dark standing seam slope up to the roof behind it
  lid('white', rect(CORNER, m1, F.v, SLOPE[0]), F.top)
  face(
    'dark',
    [
      [CORNER, SLOPE[0], F.top],
      [m1, SLOPE[0], F.top],
      [m1, SLOPE[1], MAIN.roof],
      [CORNER, SLOPE[1], MAIN.roof],
    ],
    [0, -1, 2],
    (u, v) => [u, v * 1.25],
  )
  face(
    'dark',
    [
      [m1, SLOPE[0], F.top],
      [m1, SLOPE[1], F.top],
      [m1, SLOPE[1], MAIN.roof],
    ],
    [1, 0, 0],
    undefined,
    slats,
  )

  // the louvred boxes on the roof: slats on their front and sides, a grey cap
  for (const e of TEETH) {
    const u0 = Math.max(m0 + 0.1, e - TOOTH.w)
    const y0 = u0 < CORNER ? MAIN.roof : F.top
    const [v0, v1] = TOOTH.v
    fv('louvre', v0, u0, e, y0, TOOTH.top - 0.15, -1, slats)
    fu('louvre', u0, v0, v1, y0, TOOTH.top - 0.15, -1, slats)
    fu('louvre', e, v0, v1, y0, TOOTH.top - 0.15, 1, slats)
    fv('louvre', v1, u0, e, MAIN.roof, TOOTH.top - 0.15, 1, slats)
    box(
      'louvre',
      [u0 - 0.05, e + 0.05],
      [v0 - 0.05, v1 + 0.05],
      [TOOTH.top - 0.15, TOOTH.top],
      'uUvVtb',
      smooth,
    )
  }

  // the colonnade: a grey soffit (3.5m deep, darker in the photos than the game's ambient
  // occlusion would make it), round columns, the back wall. cream panels at its ends
  // with a door and a window by the corner, storefront glass between
  lid('louvre', rect(m0, m1, F.v, SHOP), F.soffit, false, smooth)
  // the shadow lookup is pushed out along the surface (normalBias), right under a soffit it
  // looked past it. a ceiling higher up inside the box, for the shadows only
  lid('white', rect(m0, m1, F.v, SHOP), F.soffit + 0.8, false)
  for (const u of COLUMNS) column('white', u, COLUMN.v, COLUMN.r, 0, F.soffit)
  const shop = { from: -151.5, to: -103 }
  fv('cream', SHOP, m0, shop.from, 0, F.soffit, -1)
  fv('cream', SHOP, shop.to, m1, 0, F.soffit, -1)
  fv('cream', SHOP, shop.from, shop.to, STORE, F.soffit, -1)
  add('clear', wallQuad(A(shop.from, SHOP), A(shop.to, SHOP), 0, STORE, D(0, -1)))
  paneV(SHOP - 0.02, -158.6, -154.4, 0.9, 3.1, -1)
  fv('louvre', SHOP - 0.02, -165, -163.6, 0, 2.4, -1, smooth)
  // the corner: plain panels from the fascia to the top
  fv('white', F.v, m0, CORNER, F.glass, MAIN.roof, -1)

  // the notch: the main box's end over the colonnade's last bay is dark ribbed metal to the
  // top (the 2013 photo), storefront glass under it
  fu('dark', NOTCH, F.v, ATRIUM.v[0], F.soffit, F.top, 1, slats)
  fu('dark', NOTCH, SLOPE[1], ATRIUM.v[0], F.top, MAIN.roof, 1, slats)
  fu('cream', NOTCH, SHOP, ATRIUM.v[0], STORE, F.soffit, 1)
  add('clear', wallQuad(A(NOTCH, SHOP), A(NOTCH, ATRIUM.v[0]), 0, STORE, D(1, 0)))

  // the main box's roof, its parapet of dark ribbed metal on the decatur st end
  lid(
    'white',
    [
      [m0, F.v],
      [CORNER, F.v],
      [CORNER, SLOPE[1]],
      [m1, SLOPE[1]],
      [m1, ATRIUM.v[1]],
      [ATRIUM.u[1], ATRIUM.v[1]],
      [ATRIUM.u[1], MAIN.back],
      [m0, MAIN.back],
    ],
    MAIN.roof,
    true,
    smooth,
  )
  const inner = m0 + 0.3
  fu('dark', inner, F.v, MAIN.back, MAIN.roof, PARAPET, 1, slats)
  lid('dark', rect(m0, inner, F.v, MAIN.back), PARAPET, true, smooth)
  fv('dark', F.v, m0, inner, MAIN.roof, PARAPET, -1, smooth)
  fv('dark', MAIN.back, m0, inner, MAIN.roof, PARAPET, 1, smooth)
  // its side: open under the colonnade's end, dark glass over that and dark ribbed metal
  // with a slot window to the top (2019 photo), then over the pool's roofs
  fu('dark', m0, F.v, SHOP, F.soffit, F.glass, -1, smooth)
  paneU(m0, F.v, BLOCK.v[0], F.glass, 7.5, -1)
  fu('cream', m0, BLOCK.v[0], SHOP, F.glass, 7.5, -1)
  fu('cream', m0, BLOCK.v[0], SHOP, 0, F.soffit, -1)
  fu('dark', m0, F.v, BLOCK.v[0], 7.5, PARAPET, -1, slats)
  paneU(m0 - 0.02, 210.4, 211, 9.6, 11.4, -1)
  face(
    'dark',
    [
      [m0, BLOCK.v[0], BLOCK.top],
      [m0, LEAN.v[0], BLOCK.top],
      [m0, LEAN.v[0], PARAPET],
      [m0, BLOCK.v[0], PARAPET],
    ],
    [-1, 0, 0],
    undefined,
    slats,
  )
  fu('dark', m0, LEAN.v[0], LEAN.v[1], leanRoof(m0), PARAPET, -1, slats)
  fu('dark', m0, SW_WING.v[0], MAIN.back, SW_WING.top, PARAPET, -1, slats)
  // the back toward the n deck: cream block, dark ribbed metal over it, the dock's door
  fv('cream', MAIN.back, m0, ANNEX.u[0], 0, 3.3, 1)
  fv('dark', MAIN.back, m0, ANNEX.u[0], 3.3, MAIN.roof, 1, slats)
  fv('dark', MAIN.back, ANNEX.u[0], ANNEX.u[1], ANNEX.top, MAIN.roof, 1, slats)
  fv('louvre', MAIN.back + 0.02, -154, -150.5, 0, 3.2, 1, slats)

  // the atrium: storefront and doors at the bottom, glass up to the skylights, a flat
  // canopy over the doors
  const [a0, a1] = ATRIUM.u
  const av = ATRIUM.v[0]
  const doorAt = door ? uvOf(door)[0] : -90.7
  const doorway: Hole = [doorAt - DOOR_WIDTH / 2 - a0, doorAt + DOOR_WIDTH / 2 - a0, 0, DOOR_HEIGHT]
  for (const [h0, h1, y0, y1] of solidPieces(OUTLINE[4]![0] - a0, 0, STORE, [doorway]))
    add('clear', wallQuad(A(a0 + h0, av), A(a0 + h1, av), y0, y1, D(0, -1)))
  for (const u of [doorAt - DOOR_WIDTH / 2, doorAt + DOOR_WIDTH / 2])
    box('white', [u - 0.06, u + 0.06], [av - 0.08, av], [0, DOOR_HEIGHT], 'uUv', smooth)
  fv(
    'white',
    av - 0.08,
    doorAt - DOOR_WIDTH / 2 - 0.06,
    doorAt + DOOR_WIDTH / 2 + 0.06,
    DOOR_HEIGHT,
    STORE,
    -1,
    smooth,
  )
  fv('white', av, a0, a1, STORE, STORE + 0.3, -1, smooth)
  // the curtain wall in pieces about a pane each, so their lights differ at night
  const cols = 9
  const rows = 12
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const y0 = STORE + 0.3 + ((ATRIUM.ridge - STORE - 0.3) * j) / rows
      const y1 = STORE + 0.3 + ((ATRIUM.ridge - STORE - 0.3) * (j + 1)) / rows
      paneV(av, a0 + ((a1 - a0) * i) / cols, a0 + ((a1 - a0) * (i + 1)) / cols, y0, y1, -1)
    }
  box('white', [-99, -82], [216.5, av], [4, 4.35], 'uUvtb', smooth)
  // the sawtooth: glass facing piedmont ave, white roofs sloping back down from it
  const tooth = (ATRIUM.v[1] - av) / SKYLIGHTS
  for (let i = 0; i < SKYLIGHTS; i++) {
    const [v0, v1] = [av + i * tooth, av + (i + 1) * tooth]
    face(
      'white',
      [
        [a0, v0, ATRIUM.ridge],
        [a1, v0, ATRIUM.ridge],
        [a1, v1, VALLEY],
        [a0, v1, VALLEY],
      ],
      [0, 0.4, 1],
      (u, v) => [u, v],
      smooth,
    )
    if (i < SKYLIGHTS - 1) paneV(v1, a0, a1, VALLEY, ATRIUM.ridge, -1)
    // its ends, over the main box's roof and over the wing's
    for (const [u, s, y0] of [
      [a0, -1, MAIN.roof],
      [a1, 1, WING_TOP],
    ] as const)
      face(
        'white',
        [
          [u, v0, y0],
          [u, v1, y0],
          [u, v1, VALLEY],
          [u, v0, ATRIUM.ridge],
        ],
        [s, 0, 0],
      )
  }
  fv('white', ATRIUM.v[1], a0, a1, MAIN.roof, VALLEY, 1)
  // behind it the main box goes on to the gym at the roof's height
  fu('white', a1, ATRIUM.v[1], WING.v[1], WING_TOP, MAIN.roof, 1)

  // the sign band: grey louvres between white rails, on round columns (2013 and 2019 photos)
  const [b0, b1] = BAND.u
  const [bv0, bv1] = BAND.v
  const [by0, by1] = BAND.y
  const rail = 0.2
  for (const [v, s] of [
    [bv0, -1],
    [bv1, 1],
  ] as const) {
    fv('louvre', v, b0, b1, by0 + rail, by1 - rail, s, slats)
    fv('white', v, b0, b1, by0, by0 + rail, s)
    fv('white', v, b0, b1, by1 - rail, by1, s)
  }
  box('white', BAND.u, BAND.v, BAND.y, 'uUtb')
  for (const u of BAND_COLUMNS) column('white', u, (bv0 + bv1) / 2, 0.42, 0, by0)
  // the end frames: open rings from the band back to the wing's front, on the wing's
  // side a white beam along the bottom
  for (const [u, s] of [
    [b0, 1],
    [COURT + 0.2, 1],
    [b1, -1],
  ] as const) {
    const w: Range = s > 0 ? [u, u + 0.4] : [u - 0.4, u]
    box('white', w, [bv0, FRAME.v], [FRAME.y - 0.45, FRAME.y], 'uUvVtb', smooth)
    box('white', w, [FRAME.v - 0.4, FRAME.v], [FRAME.y, by1], 'uUv')
    box('white', w, [bv1, FRAME.v], [by1 - 0.45, by1], 'uUtb')
    box('white', w, [bv0, bv0 + 0.4], [FRAME.y, by0], 'uUvV')
  }
  box('white', [COURT + 0.6, b1 - 0.4], [bv1, FRAME.v], [FRAME.y - 0.45, FRAME.y], 'vVtb', smooth)

  // the wing over the corner court: dark ribbed metal with a window toward the doors, a
  // ribbon of glass between louvres on gilmer st, a white soffit on columns
  const [w0, w1] = WING.u
  const [wv0, wv1] = WING.v
  fv('white', wv0, COURT, w1, WING.under, WING.under + 0.6, -1)
  fv('dark', wv0, COURT, w1, WING.under + 0.6, WING_TOP, -1, slats)
  const win: Hole = [216.6 - wv0, 219.6 - wv0, 5.8, 8.9]
  for (const [a, z, y0, y1] of solidPieces(av - wv0, WING.under, WING_TOP, [win]))
    fu('dark', COURT, wv0 + a, wv0 + z, y0, y1, -1, slats)
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 3; j++) {
      const a = wv0 + win[0] + ((win[1] - win[0]) * i) / 2
      const y = win[2] + ((win[3] - win[2]) * j) / 3
      paneU(COURT - 0.01, a, a + (win[1] - win[0]) / 2, y, y + (win[3] - win[2]) / 3, -1)
    }
  fv('dark', av, w0, COURT, WING.under, WING_TOP, -1, slats)
  // on gilmer st a white band, a ribbon of glass and louvres up to a thin coping (2019)
  fu('white', w1, wv0, wv1, WING.under, 5.4, 1)
  paneU(w1, wv0, wv1, 5.4, 7.6, 1)
  fu('louvre', w1, wv0, wv1, 7.6, WING_TOP - 0.3, 1, slats)
  fu('white', w1, wv0, wv1, WING_TOP - 0.3, WING_TOP, 1)
  // its ground floor behind the court, and set back under it on gilmer st behind a low wall
  const shop2 = OUTLINE[4]![0]
  fu('white', shop2, av, wv1, STORE, WING.under, 1)
  add('clear', wallQuad(A(shop2, av), A(shop2, wv1), 0, STORE, D(1, 0)))
  fv('white', av, w0, shop2, STORE, WING.under, -1)
  lid('louvre', rect(shop2, w1, av, wv1), WING.under, false, smooth)
  lid('white', rect(shop2, w1, av, wv1), WING.under + 0.8, false)
  fv('white', wv1, shop2, w1, 0, WING.under, -1)
  box('white', [-65.8, -65.3], [av + 0.5, wv1 - 0.6], [0, 0.9], 'uUvVt')
  lid('louvre', rect(COURT, w1, wv0, av), WING.under, false, smooth)
  lid('white', rect(COURT, w1, wv0, av), WING.under + 0.8, false)
  lid(
    'white',
    [
      [COURT, wv0],
      [w1, wv0],
      [w1, wv1],
      [w0, wv1],
      [w0, av],
      [COURT, av],
    ],
    WING_TOP,
    true,
    smooth,
  )
  for (const [u, v] of WING_COLUMNS) column('white', u, v, 0.42, 0, WING.under)
  // low planter walls: in the corner court (2019 photo), and either side of the walk to the
  // doors (2013 photo)
  for (const [u0, u1, v0, v1] of PLANTERS) box('white', [u0, u1], [v0, v1], [0, 0.75], 'uUvVt')

  // the gym box: white panels over a cream base on gilmer st, the base 0.3m back. its
  // corners stick up a bit higher (lidar)
  const g = GYM
  fv('white', 244.7, -126.75, NOTCH, MAIN.roof, GYM_TOP, -1)
  fv('white', 244.7, NOTCH, w0, MAIN.roof, GYM_TOP, -1)
  fu('white', w0, wv1, 244.7, MAIN.roof, GYM_TOP, -1)
  fv('dark', wv1, w0, w1, WING_TOP, GYM_TOP, -1, slats)
  fv('white', wv1, w1, -65.2, 0, GYM_TOP, -1)
  const gilmer = -65.2
  const out = gilmer + 0.3
  const base = 3.3
  fu('cream', gilmer, wv1, 271.5, 0, base, 1)
  lid('white', rect(gilmer, out, wv1, 271.5), base, false)
  // a dark ribbed recess up the wall by the east corner, the corner itself taller
  const recess: Range = [266.3, 268.5]
  const peak = 18.6
  fu('white', out, wv1, recess[0], base, GYM_TOP, 1)
  fu('white', out, recess[1], 271.5, base, peak, 1)
  fu('dark', gilmer, recess[0], recess[1], base, GYM_TOP, 1, slats)
  fv('white', recess[0], gilmer, out, base, GYM_TOP, 1)
  fv('white', recess[1], gilmer, out, base, peak, -1)
  fv('white', wv1, gilmer, out, base, GYM_TOP, -1)
  lid('white', rect(gilmer, out, wv1, recess[0]), GYM_TOP, true, smooth)
  paneU(out + 0.01, 250, 250.6, 6, 13, 1)
  // the back drive side: white panels, a strip of louvres with a slot window, a louvre box,
  // the s deck door's glass bays and doors under a white canopy, a dark ribbed strip
  const back = 271.5
  const parts: [number, number, number, number][] = [
    [-109, -105.5, 0.2, 11.2],
    [-104, -96, 7.4, 11.5],
    [-95.5, -89.5, 0, 7.7],
    [-89.5, -87, 0, 8.7],
    [-104, -95.5, 0, 6.9],
    [-80, -65.2, 0, 4.4],
  ]
  const holes = parts.map(([a, z, y0, y1]): Hole => [a + 126.75, z + 126.75, y0, y1])
  for (const [a, z, y0, y1] of solidPieces(-65.2 + 126.75, 0, GYM_TOP, holes))
    fv('white', back, -126.75 + a, -126.75 + z, y0, y1, 1)
  fv('louvre', back, -109, -107.5, 0.2, 11.2, 1, slats)
  fv('louvre', back, -106, -105.5, 0.2, 11.2, 1, slats)
  fv('louvre', back, -107.5, -106, 6.7, 11.2, 1, slats)
  fv('louvre', back, -107.5, -106, 0.2, 0.7, 1, slats)
  paneV(back, -107.5, -106, 0.7, 6.7, 1)
  fv('louvre', back + 0.02, -103.6, -96.4, 7.8, 11.1, 1, slats)
  fv('white', back, -104, -96, 7.4, 7.8, 1)
  fv('white', back, -104, -96, 11.1, 11.5, 1)
  fv('white', back, -104, -103.6, 7.8, 11.1, 1)
  fv('white', back, -96.4, -96, 7.8, 11.1, 1)
  fv('cream', back, -104, -95.5, 0, 6.9, 1)
  // the glass bays in panes about 1.1m square (2018 photo)
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 7; j++) paneV(back, -95.5 + i, -94.5 + i, j * 1.1, (j + 1) * 1.1, 1)
  add('dark', smooth(wallQuad(A(-97.9, back + 0.02), A(-96.1, back + 0.02), 0, 2.4, D(0, 1))))
  fv('dark', back, -89.5, -87, 0, 8.7, 1, slats)
  box('white', [-104.4, -89], [back, back + 1.6], [6.9, 7.4], 'uUVtb', smooth)
  // by the east corner the white panels stop over the cream base and a dark ribbed band,
  // like on gilmer st (2019 photo from gilmer st)
  fv('cream', back, -80, -65.2, 0, base, 1)
  fv('dark', back, -80, -65.2, base, 4.4, 1, slats)
  // its corners, a bit taller
  for (const [[u0, u1], [v0, v1]] of [
    [
      [-126.75, -121.5],
      [266.5, 271.5],
    ],
    [
      [-70.2, -65.2],
      [266.5, 271.5],
    ],
  ] as const) {
    fv('white', back, u0, u1, GYM_TOP, peak, 1)
    fv('white', v0, u0, u1, GYM_TOP, peak, -1)
    fu('white', u0 === -126.75 ? u1 : u0, v0, v1, GYM_TOP, peak, u0 === -126.75 ? 1 : -1)
    fu('white', u0 === -126.75 ? u0 : u1, v0, v1, GYM_TOP, peak, u0 === -126.75 ? -1 : 1)
    lid('white', rect(u0, u1, v0, v1), peak, true, smooth)
  }
  // over the annex on its decatur st side
  fu('white', -126.75, 244.7, back, ANNEX.top, GYM_TOP, -1)
  fu('white', -126.75, ANNEX.v[1], back, 0, ANNEX.top, -1)
  lid('white', g, GYM_TOP, true, smooth)
  // a few units on the roof
  for (const [u0, v0] of [
    [-112, 252],
    [-98, 258],
    [-84, 250],
  ] as const)
    box('white', [u0, u0 + 4], [v0, v0 + 2.5], [GYM_TOP, GYM_TOP + 1.5], 'uUvVt')

  // the dock annex by the n deck: dark ribbed metal over cream block, a roll up door
  const [x0, x1] = ANNEX.u
  const [xv0, xv1] = ANNEX.v
  fu('cream', x0, xv0, xv1, 0, 1.2, -1)
  fu('dark', x0, xv0, xv1, 1.2, ANNEX.top, -1, slats)
  fv('cream', xv1, x0, x1, 0, 1.2, 1)
  fv('dark', xv1, x0, x1, 1.2, ANNEX.top, 1, slats)
  fv('louvre', xv1 + 0.02, -134, -130.5, 0, 3.6, 1, slats)
  lid('white', rect(x0, x1, xv0, xv1), ANNEX.top, true, smooth)

  // the pool's end: the white block with its sloping roof on piedmont ave, the glass wall
  // and the glass and metal roof sloping up to the main box, the wing behind
  const [l0, l1] = LEAN.u
  face(
    'cream',
    [
      [l0, BLOCK.v[0], 0],
      [l1, BLOCK.v[0], 0],
      [l1, BLOCK.v[0], blockRoof(l1)],
      [l0, BLOCK.v[0], blockRoof(l0)],
    ],
    [0, -1, 0],
  )
  fu('cream', l0, BLOCK.v[0], BLOCK.v[1], 0, BLOCK.eave, -1)
  face(
    'cream',
    [
      [l0, BLOCK.v[1], leanRoof(l0)],
      [l1, BLOCK.v[1], leanRoof(l1)],
      [l1, BLOCK.v[1], blockRoof(l1)],
      [l0, BLOCK.v[1], blockRoof(l0)],
    ],
    [0, 1, 0],
  )
  // its roof: standing seams running down the slope
  const run = Math.hypot(l1 - l0, BLOCK.top - BLOCK.eave)
  face(
    'louvre',
    [
      [l0, BLOCK.v[0], blockRoof(l0)],
      [l1, BLOCK.v[0], blockRoof(l1)],
      [l1, BLOCK.v[1], blockRoof(l1)],
      [l0, BLOCK.v[1], blockRoof(l0)],
    ],
    [-0.5, 0, 1],
    (u, v) => [v, ((u - l0) / (l1 - l0)) * run],
  )
  // the glass wall, a piece per pane (about 1.9m by 1.2m)
  const lv = LEAN.v
  const panes = Math.round((lv[1] - lv[0]) / 1.9)
  for (let i = 0; i < panes; i++)
    for (let j = 0; j < 6; j++) {
      const [v0, v1] = [
        lv[0] + ((lv[1] - lv[0]) * i) / panes,
        lv[0] + ((lv[1] - lv[0]) * (i + 1)) / panes,
      ]
      paneU(l0, v0, v1, (LEAN.eave * j) / 6, (LEAN.eave * (j + 1)) / 6, -1)
    }
  // the roof: glass nearly to the top, a strip of dark standing seam metal over that
  const half = l1 - 1.2
  const lean = Math.hypot(l1 - l0, leanRoof(l1) - LEAN.eave)
  face(
    'dark',
    [
      [half, lv[0], leanRoof(half)],
      [l1, lv[0], leanRoof(l1)],
      [l1, lv[1], leanRoof(l1)],
      [half, lv[1], leanRoof(half)],
    ],
    [-0.6, 0, 1],
    (u, v) => [v, ((u - l0) / (l1 - l0)) * lean],
  )
  const roofPanes = Math.round((lv[1] - lv[0]) / 2.4)
  for (let i = 0; i < roofPanes; i++) {
    const [v0, v1] = [
      lv[0] + ((lv[1] - lv[0]) * i) / roofPanes,
      lv[0] + ((lv[1] - lv[0]) * (i + 1)) / roofPanes,
    ]
    const geo = glassQuad(A(l0, v0), A(l0, v1), 0, ((half - l0) / (l1 - l0)) * lean, D(-1, 0))
    // tip the wall's glass back onto the slope
    const pos = geo.getAttribute('position')
    const up = new THREE.Vector3(D(1, 0).x, 0, D(1, 0).z).multiplyScalar(half - l0)
    const rise = leanRoof(half) - LEAN.eave
    for (let k = 0; k < pos.count; k++) {
      const t = pos.getY(k) / (((half - l0) / (l1 - l0)) * lean)
      pos.setXYZ(k, pos.getX(k) + up.x * t, LEAN.eave + rise * t, pos.getZ(k) + up.z * t)
    }
    geo.computeVertexNormals()
    add('glass', geo)
  }
  fu('white', l0, lv[0], lv[1], LEAN.eave - 0.25, LEAN.eave, -1, smooth)
  // the wing on the decatur st end: glass on its end with the stairs, white toward the patio,
  // the back like the main box's
  const [s0, s1] = SW_WING.u
  const [sv0, sv1] = SW_WING.v
  const stair = 4.7
  for (let k = 0; k < 4; k++)
    paneU(s0, sv0, sv1, (k * SW_WING.top) / 4, ((k + 1) * SW_WING.top) / 4, -1)
  paneV(sv0, s0, s0 + stair, 0, SW_WING.top, -1)
  fv('white', sv0, s0 + stair, l0, 0, SW_WING.top, -1)
  face(
    'white',
    [
      [l0, sv0, leanRoof(l0)],
      [l1, sv0, leanRoof(l1)],
      [l1, sv0, SW_WING.top],
      [l0, sv0, SW_WING.top],
    ],
    [0, -1, 0],
  )
  fv('cream', sv1, s0, s1, 0, 3.3, 1)
  fv('dark', sv1, s0, s1, 3.3, SW_WING.top, 1, slats)
  lid('white', rect(s0, s1, sv0, sv1), SW_WING.top, true, smooth)

  // the patio's canopy: the steel beam on round columns, light panels hung behind it
  const [p0, p1] = PATIO.u
  const pv = (PATIO.v[0] + PATIO.v[1]) / 2
  box('dark', PATIO.u, PATIO.v, [PATIO_TOP - 0.6, PATIO_TOP], 'uUvVtb', smooth)
  for (const u of PATIO_COLUMNS) column('white', u, pv, 0.45, 0, PATIO_TOP - 0.6)
  for (let u = p0 + 0.3; u < p1 - 1; u += 3.2)
    box(
      'white',
      [u, u + 2.4],
      [PATIO.v[1], PATIO.back],
      [PATIO_TOP - 0.3, PATIO_TOP - 0.2],
      'uUvVtb',
      smooth,
    )
  for (let u = p0 + 2.95; u < p1; u += 3.2)
    box(
      'dark',
      [u - 0.1, u + 0.1],
      [PATIO.v[1], PATIO.back],
      [PATIO_TOP - 0.4, PATIO_TOP - 0.2],
      'uUVtb',
      smooth,
    )
  // the fence round the patio: black bars every 14cm between two rails, posts every 2.4m
  for (let i = 1; i < FENCE.length; i++) {
    const [pa0, pa1] = [FENCE[i - 1]!, FENCE[i]!]
    const p = A(...pa0)
    const q = A(...pa1)
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
    const n = { x: dir.z, z: -dir.x }
    const at = (t: number, d = 0) => ({
      x: p.x + dir.x * t + n.x * d,
      z: p.z + dir.z * t + n.z * d,
    })
    // a bit wider than real so they don't break up into dots from across the street
    for (let t = 0.07; t < len; t += 0.14) {
      add('dark', smooth(wallQuad(at(t - 0.03, 0.012), at(t + 0.03, 0.012), 0.08, FENCE_TOP, n)))
      add(
        'dark',
        smooth(
          wallQuad(at(t - 0.03, -0.012), at(t + 0.03, -0.012), 0.08, FENCE_TOP, {
            x: -n.x,
            z: -n.z,
          }),
        ),
      )
    }
    for (const y of [0.15, FENCE_TOP - 0.15]) {
      add('dark', smooth(wallQuad(at(0, 0.025), at(len, 0.025), y - 0.03, y + 0.03, n)))
      add(
        'dark',
        smooth(wallQuad(at(0, -0.025), at(len, -0.025), y - 0.03, y + 0.03, { x: -n.x, z: -n.z })),
      )
    }
    const posts = Math.max(1, Math.round(len / 2.4))
    for (let k = 0; k <= posts; k++) {
      const c = at((k / posts) * len)
      const [cu, cv] = uvOf(c)
      box(
        'dark',
        [cu - 0.05, cu + 0.05],
        [cv - 0.05, cv + 0.05],
        [0, FENCE_TOP + 0.1],
        'uUvVt',
        smooth,
      )
    }
  }

  // the corner sign: two grey panels side by side in a steel frame, the name's on a white
  // pillar and the logo's on a steel post. gsu's logo is a plain blue square here (it's
  // their trademark). the frame's leg comes down on the canopy's last column (2019 photo)
  const [su, sv] = SIGN.pillar
  const [tu, tv] = SIGN.post
  const span = Math.hypot(tu - su, tv - sv)
  // along the panels, from the pillar to the post, and the way they face
  const t: [number, number] = [(tu - su) / span, (tv - sv) / span]
  const n: [number, number] = [-t[1], t[0]]
  const on = (a: number, d = 0): [number, number] => [
    su + t[0] * a + n[0] * d,
    sv + t[1] * a + n[1] * d,
  ]
  const thin = 0.05
  const panel = (a0: number, a1: number, y0: number, y1: number) => {
    for (const s of [1, -1])
      face(
        'louvre',
        [
          [...on(a0, thin * s), y0],
          [...on(a1, thin * s), y0],
          [...on(a1, thin * s), y1],
          [...on(a0, thin * s), y1],
        ],
        [n[0] * s, n[1] * s, 0],
        undefined,
        smooth,
      )
  }
  panel(-0.95, 0.95, 2.6, 6.1)
  panel(1.1, span - 0.3, 2.2, 5.8)
  column('white', su, sv, 0.42, 0, 2.6)
  bar('dark', [tu, tv, 0], [tu, tv, SIGN.top], 0.22)
  // the frame on top, its rungs, and the leg
  const corners = [on(-1.3, 0.5), on(span + 0.4, 0.5), on(span + 0.4, -0.5), on(-1.3, -0.5)]
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % 4]!
    bar('dark', [...p, SIGN.top], [...q, SIGN.top], 0.14)
  })
  for (let a = -0.9; a < span; a += 0.6)
    bar('dark', [...on(a, 0.5), SIGN.top], [...on(a, -0.5), SIGN.top], 0.07)
  const last = PATIO_COLUMNS[0]!
  bar('dark', [last, pv, PATIO_TOP], [...on(-1.3, 0), SIGN.top], 0.2)
  bar('dark', [...on(-1.3, 0), SIGN.top], [...on(-0.95, 0), 6.1], 0.12)
  const lift = (a: number) => A(...on(a, thin + 0.02))
  const outward = facing(...n)
  const light = '#e8eaea'
  signs.push({
    ...lift(0),
    y: 5.05,
    rot: outward,
    text: 'GEORGIA\nSTATE\nUNIVERSITY',
    letters: true,
    size: 0.31,
    color: light,
    weight: 500,
  })
  signs.push({
    ...lift(0),
    y: 3.25,
    rot: outward,
    text: 'STUDENT\nRECREATION\nCENTER',
    letters: true,
    size: 0.2,
    color: light,
    weight: 500,
  })
  signs.push({
    ...lift((0.8 + span) / 2),
    y: 4.1,
    rot: outward,
    text: '',
    plate: '#1f4b99',
    width: 1.1,
    height: 1.4,
  })

  // the name on the band, and the red bar under STATE (2013 photo)
  const bandAt = A(-89.8, bv0 - 0.03)
  const front = facing(0, -1)
  const ink = '#33363a'
  signs.push({
    ...bandAt,
    y: 9.1,
    rot: front,
    text: 'GEORGIA STATE UNIVERSITY',
    letters: true,
    size: 0.5,
    color: ink,
    weight: 600,
  })
  signs.push({
    ...A(-89.35, bv0 - 0.03),
    y: 8.7,
    rot: front,
    text: '',
    plate: '#c8202f',
    width: 1.5,
    height: 0.12,
  })
  signs.push({
    ...bandAt,
    y: 8.3,
    rot: front,
    text: 'STUDENT RECREATION CENTER',
    letters: true,
    size: 0.3,
    color: ink,
    weight: 600,
  })

  // inside the ground floor: glass where the storefronts are (the colonnade, the notch, under
  // the wing), the pool's glass wall and the wing's glass end. by the outline's corner numbers
  const glassy = new Set([0, 1, 2, 3, 4, 11, 13])
  insideWalls(inside, outline, door, (p) => glassy.has(outline.indexOf(p)))

  return {
    parts: merged(),
    inside,
    signs,
    first: ['white', 'cream'],
    noShadow: ['glass'],
  }
}

// what you bump into outside: the columns, the sign's legs, the patio fence and the planter
export function recObstacles(b: RecData) {
  const { A } = recFrame(b)
  const circles = [
    ...COLUMNS.map((u) => ({ ...A(u, COLUMN.v), radius: COLUMN.r + 0.05 })),
    ...BAND_COLUMNS.map((u) => ({ ...A(u, (BAND.v[0] + BAND.v[1]) / 2), radius: 0.45 })),
    ...WING_COLUMNS.map(([u, v]) => ({ ...A(u, v), radius: 0.45 })),
    ...PATIO_COLUMNS.map((u) => ({ ...A(u, (PATIO.v[0] + PATIO.v[1]) / 2), radius: 0.48 })),
    { ...A(...SIGN.pillar), radius: 0.45 },
    { ...A(...SIGN.post), radius: 0.15 },
  ]
  const line = (p: [number, number], q: [number, number]): Segment => {
    const a = A(...p)
    const z = A(...q)
    return { ax: a.x, az: a.z, bx: z.x, bz: z.z }
  }
  const walls: Segment[] = [
    ...FENCE.slice(1).map((q, i) => line(FENCE[i]!, q)),
    line([-65.8, 221.4], [-65.8, 240.6]),
    line([-65.8, 240.6], [-65.3, 240.6]),
    line([-65.3, 240.6], [-65.3, 221.4]),
    line([-65.3, 221.4], [-65.8, 221.4]),
    ...PLANTERS.flatMap(([u0, u1, v0, v1]) => [
      line([u0, v0], [u1, v0]),
      line([u1, v0], [u1, v1]),
      line([u1, v1], [u0, v1]),
      line([u0, v1], [u0, v0]),
    ]),
  ]
  return { circles, walls }
}
