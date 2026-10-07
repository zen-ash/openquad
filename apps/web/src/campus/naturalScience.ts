import * as THREE from 'three'
import type { Point, Segment } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// the natural science center (about 1993) on decatur st: chemistry and physics labs. a light
// precast frame with dark brown brick bays in it, three rows of ribbon windows in each, three
// pylons with tall glass and stepped parapets over the coping (the main doors are in a recess
// under the east one), a set back top floor and a roof full of fans and stacks. from usgs's
// lidar (2018), mapillary (2019, 2021) and gsu's photos (2020, 2026). sources:
// docs/reference/natural-science-center.md
//
// "u" is meters along decatur st toward peachtree center ave, "v" meters in from decatur st
// toward the garage at the back, both from hurt park (the same numbers as build-campus.mjs).
// the game's ground is 315.0m, the sidewalk in the middle of the front

export type NscData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { along: number[] }
}

// few parts, each is a draw call in every pass. base is the darker exposed aggregate (the
// plinth, the planters). the glass casts shadows: the building is empty inside and has
// windows on two sides, the sun came through both rows otherwise
export type Part = 'precast' | 'brick' | 'base' | 'glass' | 'metal' | 'clear'

type Range = readonly [number, number]

// same numbers as build-campus.mjs: the brick of the front, the recess with the doors, the
// east wall against the shops and the annex, the back, the alley side
export const OUTLINE: [number, number][] = [
  [-213.8, -203.65],
  [-156.8, -203.65],
  [-156.8, -202.6],
  [-152.75, -202.6],
  [-152.75, -203.65],
  [-146.4, -203.65],
  [-146.4, -154.6],
  [-183, -154.6],
  [-183, -151.8],
  [-213.8, -151.8],
  [-213.8, -164],
  [-219.9, -164],
  [-219.9, -170.5],
  [-218.6, -170.5],
  [-218.6, -180.5],
  [-213.8, -180.5],
]
// the precast frame's face (the coping's edge in the lidar), the brick bays are 0.25m behind
// it on the outline. the walls the lidar has round the top
export const FACE = -203.9
export const BRICK = -203.65
export const WEST = -213.8
export const EAST = -146.4
const RIM: [number, number][] = [
  [WEST, FACE],
  [EAST, FACE],
  [EAST, -154.6],
  [-183, -154.6],
  [-183, -151.8],
  [WEST, -151.8],
  [WEST, -164],
  [-219.9, -164],
  [-219.9, -170.5],
  [-218.6, -170.5],
  [-218.6, -180.5],
  [WEST, -180.5],
]
// heights over the game's ground (lidar, 315.0m): the roof behind the coping, the coping,
// the set back top floor
export const ROOF = 21
export const COPING = 21.85
export const TOP = 26.5
// the exposed aggregate plinth (it's lower by the doors, where the sidewalk has fallen 0.6m),
// the three rows of ribbon windows and the precast band over them (fitted on a 2019 photo)
export const PLINTH = 1.48
const PLINTH_EAST = 1.1
export const ROWS: Range[] = [
  [6.6, 8.3],
  [11.6, 13.2],
  [16.6, 17.8],
]
export const BAND = 17.8
// the ribbons have a narrow light at each end and a mullion every 1.05m between
const END = 0.5
const MULLION = 1.05
// the brick bays on decatur st between the pylons, and the ground floor's brick under all of
// them (p1 and p2 start 4.45m up, on a block over it). small windows about every 2m along
// the ground floor (2019, 2020; the ones past p2 by eye)
export const BAYS: Range[] = [
  [-205, -197.6],
  [-192.2, -174.7],
  [-169.3, -157.75],
]
export const GROUND: Range = [-205, -157.75]
const HUNG = 4.45
const SMALL = [
  -201.2, -198.05, -196.24, -194.18, -192.32, -190.4, -188.45, -186.5, -184.6, -182.65, -180.7,
  -178.6, -176.6, -174.63, -172.66, -170.69, -168.72, -166.75, -164.78, -162.81, -160.84, -158.87,
]
const SMALL_Y: Range = [1.72, 2.98]
// the pylons: tall glass (two wide lights and a narrow one between, transoms on the slot
// window's rows), and their parapets over the coping as [u, y] round the top. p2 only has a
// shoulder on its east side, p3 is the tallest and has the doors under its glass
export const PYLONS = [
  {
    u: [-197.6, -192.2] as Range,
    glass: [-196.9, -192.9] as Range,
    top: [
      [-198, COPING],
      [-198, 22.45],
      [-197.4, 22.45],
      [-197.4, 23.07],
      [-196.8, 23.67],
      [-193, 23.67],
      [-192.4, 23.07],
      [-192.4, 22.45],
      [-191.75, 22.45],
      [-191.75, COPING],
    ],
  },
  {
    u: [-174.7, -169.3] as Range,
    glass: [-174, -170] as Range,
    top: [
      [-174.75, COPING],
      [-174.75, 23.08],
      [-174, 23.68],
      [-170, 23.68],
      [-169.25, 23.08],
      [-169.25, 22.44],
      [-168.75, 22.44],
      [-168.75, COPING],
    ],
  },
  {
    u: [-157.75, -151.75] as Range,
    glass: [-156.8, -152.75] as Range,
    top: [
      [-160.25, COPING],
      [-160.25, 23],
      [-157.75, 23],
      [-157.75, 24.5],
      [-157.25, 25.05],
      [-152.25, 25.05],
      [-151.75, 24.5],
      [-151.75, 23],
      [-148.75, 23],
      [-148.75, COPING],
    ],
  },
]
// p3's west edge, where the plinth gets lower
const P3 = -157.75
const CURTAIN: Range = [5.5, 18.85]
// the glass is set in a recess that goes on up as a plain panel over it
const RECESS_TOP = 20.85
// the grey cap along the coping and round every parapet, on the face
const CAP = 0.18
const TRANSOMS = [6.1, 8.7, 10, 11.3, 13.7, 15.1, 16.3]
const NARROW = 0.44
// the slot window in the west end bay
const SLOT = { u: [-211.3, -209.5] as Range, y: [5.05, 18.9] as Range }
// the parapets are thin walls over the coping, the roof is right behind them
const PARAPET = 1.5
// the doors: a recess as wide as p3's glass under a precast soffit, the doors at the back
export const RECESS = { u: [-156.8, -152.75] as Range, v: -202.6, soffit: 3.6 }
// the storefront goes up to under the inside's ceiling (3.3m), an opaque transom over it
const STORE = 3.3
// the east wall shows over the one storey shops (4m) at the front and over the science
// annex's low part (11.8m) at the back. a precast corner with a glass slot and a parapet
// (p4), then a brick bay like the front's
const SHOPS_END = -171.5
const EAST_BAY: Range = [-195.3, -156]
const EAST_SLOT: Range = [-199, -197]
const P4: [number, number][] = [
  [-201.5, COPING],
  [-201.5, 23.05],
  [-197, 23.05],
  [-196.4, 22.45],
  [-196.4, COPING],
]
// the set back top floor (lidar): an L, its west side on the west wall, and the tall bit by
// the dock on the alley
const UPPER: [number, number][] = [
  [WEST, -190.2],
  [-195.8, -190.2],
  [-195.8, -180.5],
  [-183.5, -180.5],
  [-183.5, -154],
  [WEST, -154],
  [WEST, -170.5],
  [-218.6, -170.5],
  [-218.6, -180.5],
  [WEST, -180.5],
]
// the boxes on the roof [u0, u1, v0, v1, top] (lidar, and the one over the coping in the
// 2019 photo), and the stacks [u, v, top]: their tops from the 2019 and 2020 photos, the
// lidar misses most of them
const UNITS: [number, number, number, number, number][] = [
  [-211.6, -207.7, -192.2, -185, 30],
  [-207, -203.5, -189.5, -185.5, 28.8],
  [-200, -184, -166, -159.5, 28.8],
  [-178, -173, -183, -175, 26.7],
  [-150.5, -147, -161, -155, 24.7],
  [-210.5, -203.5, -198, -195.6, 23.9],
  [-200, -160, -195, -194, 23.9],
]
const STACKS: [number, number, number][] = [
  [-205.3, -200.5, 25.8],
  [-203.4, -197, 25],
  [-196.6, -196.4, 25.5],
  [-194, -196.4, 25.5],
  [-172.5, -195.8, 23.8],
  [-183.6, -162, 29.5],
]
// the dock's canopy over the alley, out to ten park place's wall (lidar)
const CANOPY = { y: [5.15, 5.6] as Range, u: -220.5 }
// the gate across the alley at decatur st, a bit in from the sidewalk (2019)
export const GATE = { u: [-220.8, WEST] as Range, v: -202, top: 2.4 }
// low concrete planters in front of the brick bays [u0, u1], 0.8m deep
export const PLANTERS: Range[] = [
  [-205.05, -200.2],
  [-188.5, -175],
  [-168.8, -158.4],
]
const PLANTER = { d: 0.8, top: 1.1 }

export function nscFrame(b: NscData) {
  const [ax, az] = b.landmark!.along as [number, number]
  // u and v are mirrored from the game's x and z (v goes in, z is south)
  const A = (u: number, v: number): Point => ({ x: ax * u + az * v, z: az * u - ax * v })
  const uvOf = (p: Point): [number, number] => [ax * p.x + az * p.z, az * p.x - ax * p.z]
  return { A, uvOf, D: A }
}

export function naturalScienceGeometry(b: NscData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, uvOf, D } = nscFrame(b)
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  type Change = (geo: THREE.BufferGeometry) => THREE.BufferGeometry
  const same: Change = (geo) => geo
  // stretched so the joints are far apart, for the roofs
  const wide: Change = (geo) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.3, uv.getY(i) * 0.3)
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
  // a wall face at u from v0 to v1, facing -u (s -1, toward the alley) or +u
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
  // a flat polygon through [u, v, y] corners facing o = [du, dv, dy], with holes. uvs in
  // meters across it
  const polygon = (
    part: Part,
    c: [number, number, number][],
    o: [number, number, number],
    holes: [number, number, number][][] = [],
    f = same,
  ) => {
    // flat in whichever plane it faces. the families read uv y as the height for the dirt
    // near the ground, so a level one gets its v far away from 0 (v here is about -200,
    // which came out black)
    const up = Math.abs(o[2]) > 0.5
    const flatU = Math.abs(o[0]) > Math.abs(o[1])
    const at = ([u, v, y]: [number, number, number]): [number, number] =>
      up ? [u, v + 1000] : flatU ? [v, y] : [u, y]
    const all = [c, ...holes].flat()
    const tris = THREE.ShapeUtils.triangulateShape(
      c.map((p) => new THREE.Vector2(...at(p))),
      holes.map((h) => h.map((p) => new THREE.Vector2(...at(p)))),
    )
    const d = D(o[0], o[1])
    const out = new THREE.Vector3(d.x, o[2], d.z).normalize()
    const pts = all.map(([u, v, y]) => {
      const p = A(u, v)
      return new THREE.Vector3(p.x, y, p.z)
    })
    const pos: number[] = []
    const uvs: number[] = []
    const e1 = new THREE.Vector3()
    const e2 = new THREE.Vector3()
    for (const [i, a, b] of tris) {
      e1.subVectors(pts[a!]!, pts[i!]!)
      e2.subVectors(pts[b!]!, pts[i!]!)
      const flip = e1.cross(e2).dot(out) < 0
      for (const n of [i!, flip ? b! : a!, flip ? a! : b!]) {
        pos.push(...pts[n]!.toArray())
        uvs.push(...at(all[n]!))
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(
        pos.map((_, i) => out.getComponent(i % 3)),
        3,
      ),
    )
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    add(part, f(geo))
  }
  const rect = (u0: number, u1: number, v0: number, v1: number, y: number) =>
    [
      [u0, v0, y],
      [u1, v0, y],
      [u1, v1, y],
      [u0, v1, y],
    ] as [number, number, number][]
  const lid = (part: Part, u: Range, v: Range, y: number, up = true, f = same) =>
    polygon(part, rect(u[0], u[1], v[0], v[1], y), [0, 0, up ? 1 : -1], [], f)
  // a box, only the faces asked for: u/U the -u/+u sides, v/V the -v/+v ones, t top, b bottom
  const box = (part: Part, u: Range, v: Range, y: Range, faces = 'uUvVtb') => {
    if (faces.includes('u')) fu(part, u[0], v[0], v[1], y[0], y[1], -1)
    if (faces.includes('U')) fu(part, u[1], v[0], v[1], y[0], y[1], 1)
    if (faces.includes('v')) fv(part, v[0], u[0], u[1], y[0], y[1], -1)
    if (faces.includes('V')) fv(part, v[1], u[0], u[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, u, v, y[1])
    if (faces.includes('b')) lid(part, u, v, y[0], false)
  }
  // a wall face from `from` to `to` with holes cut out of it, all in the same u (or v)
  const holed = (
    face: (a: number, b: number, y0: number, y1: number) => void,
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
  const frontFace = (part: Part, v: number) => (a: number, z: number, y0: number, y1: number) =>
    fv(part, v, a, z, y0, y1, -1)
  const eastFace = (part: Part, u: number) => (a: number, z: number, y0: number, y1: number) =>
    fu(part, u, a, z, y0, y1, 1)
  // the sides, sill and head of a hole `depth` deep in a wall facing -v (or +u for the east)
  const revealV = (part: Part, [u0, u1, y0, y1]: Hole, v: number, depth: number) => {
    fu(part, u0, v, v + depth, y0, y1, 1)
    fu(part, u1, v, v + depth, y0, y1, -1)
    if (y0 > 0.01) lid(part, [u0, u1], [v, v + depth], y0)
    lid(part, [u0, u1], [v, v + depth], y1, false)
  }
  const revealU = (part: Part, [v0, v1, y0, y1]: Hole, u: number, depth: number) => {
    fv(part, v0, u - depth, u, y0, y1, 1)
    fv(part, v1, u - depth, u, y0, y1, -1)
    if (y0 > 0.01) lid(part, [u - depth, u], [v0, v1], y0)
    lid(part, [u - depth, u], [v0, v1], y1, false)
  }
  // glass facing -v at v (or +u at u for the east wall)
  const paneV = (v: number, u0: number, u1: number, y0: number, y1: number) => {
    if (u1 - u0 > 0.01 && y1 - y0 > 0.01)
      add('glass', glassQuad(A(u0, v), A(u1, v), y0, y1, D(0, -1)))
  }
  const paneU = (u: number, v0: number, v1: number, y0: number, y1: number) => {
    if (v1 - v0 > 0.01 && y1 - y0 > 0.01)
      add('glass', glassQuad(A(u, v0), A(u, v1), y0, y1, D(1, 0)))
  }
  // a ribbon window: a narrow light at each end, the mullions between are the shader's. in
  // pieces of four lights so they don't all light up at night (or tint) as one
  const ribbon = (pane: typeof paneV, at: number, a: number, z: number, y: Range) => {
    pane(at, a, a + END, y[0], y[1])
    pane(at, z - END, z, y[0], y[1])
    const lights = Math.round((z - a - 2 * END) / MULLION)
    const w = (z - a - 2 * END) / lights
    for (let i = 0; i < lights; i += 4)
      pane(at, a + END + i * w, a + END + Math.min(lights, i + 4) * w, y[0], y[1])
  }
  // tall glass split into lights where the transoms are
  const tall = (pane: typeof paneV, at: number, cols: number[], y: Range) => {
    const rows = [y[0], ...TRANSOMS.filter((t) => t > y[0] + 0.1 && t < y[1] - 0.1), y[1]]
    for (let i = 1; i < cols.length; i++)
      for (let k = 1; k < rows.length; k++) pane(at, cols[i - 1]!, cols[i]!, rows[k - 1]!, rows[k]!)
  }
  // a thin wall standing up over the coping, its outline [s, y] along a wall: front at d 0,
  // back at d `deep`. the edges over the top are the metal cap, it comes down the front CAP
  const slab = (
    pts: [number, number][],
    at: (s: number, d: number) => [number, number],
    out: [number, number],
    deep: number,
  ) => {
    const c = (d: number) => pts.map(([s, y]) => [...at(s, d), y] as [number, number, number])
    polygon('precast', c(0), [out[0], out[1], 0])
    polygon('precast', c(deep), [-out[0], -out[1], 0])
    for (let i = 1; i < pts.length; i++) {
      const [s0, y0] = pts[i - 1]!
      const [s1, y1] = pts[i]!
      // out of the slab, square to the edge
      const l = Math.hypot(s1 - s0, y1 - y0)
      const [ns, ny] = [-(y1 - y0) / l, (s1 - s0) / l]
      const [p0, p1] = [at(s0, 0), at(s1, 0)]
      const [q0, q1] = [at(s0, deep), at(s1, deep)]
      const across = [at(1, 0)[0] - at(0, 0)[0], at(1, 0)[1] - at(0, 0)[1]]
      polygon(
        'metal',
        [
          [...p0, y0],
          [...p1, y1],
          [...q1, y1],
          [...q0, y0],
        ],
        [across[0]! * ns, across[1]! * ns, ny],
      )
    }
    // the cap's band on the front: the outline and the same moved in by CAP, mitred
    const inward = pts.map(([s, y], i) => {
      const n = (a: number[], b: number[]) => {
        const l = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!)
        return [(b[1]! - a[1]!) / l, -(b[0]! - a[0]!) / l]
      }
      const prev = i > 0 ? n(pts[i - 1]!, pts[i]!) : null
      const next = i < pts.length - 1 ? n(pts[i]!, pts[i + 1]!) : null
      const [a, b] = [prev ?? next!, next ?? prev!]
      const k = CAP / (1 + a[0]! * b[0]! + a[1]! * b[1]!)
      return [s + (a[0]! + b[0]!) * k, y + (a[1]! + b[1]!) * k] as [number, number]
    })
    const band = [...pts, ...inward.reverse()].map(
      ([s, y]) => [...at(s, -0.01), y] as [number, number, number],
    )
    polygon('metal', band, [out[0], out[1], 0])
  }

  // decatur st. the precast frame from the plinth up, with the brick, the slot window, the
  // pylons' glass and the doors cut out of it
  const front = frontFace('precast', FACE)
  const [g1, g2, g3] = PYLONS.map((p) => p.glass) as [Range, Range, Range]
  const tallHole = (g: Range, y: Range): Hole => [g[0], g[1], y[0], y[1]]
  holed(front, WEST, P3, PLINTH, COPING, [
    [GROUND[0], GROUND[1], PLINTH, HUNG],
    ...BAYS.map(([u0, u1]): Hole => [u0, u1, HUNG, BAND]),
    tallHole(SLOT.u, SLOT.y),
    tallHole(g1, [CURTAIN[0], RECESS_TOP]),
    tallHole(g2, [CURTAIN[0], RECESS_TOP]),
  ])
  const doors: Hole = [RECESS.u[0], RECESS.u[1], 0, RECESS.soffit]
  holed(front, P3, EAST, PLINTH_EAST, COPING, [doors, tallHole(g3, [CURTAIN[0], RECESS_TOP])])
  // the exposed aggregate along the bottom
  fv('base', FACE, WEST, P3, 0, PLINTH, -1)
  holed(frontFace('base', FACE), P3, EAST, 0, PLINTH_EAST, [doors])

  // the brick: on the outline, the frame's sides and undersides round it, the plinth's top
  // under it. the ribbons are set in 10cm
  const bayDeep = BRICK - FACE
  const hung = PYLONS.slice(0, 2).map((p) => p.u)
  const small = SMALL.map((c): Hole => [c - 0.3, c + 0.3, SMALL_Y[0], SMALL_Y[1]])
  const ribbons = BAYS.flatMap(([u0, u1]) => ROWS.map((r): Hole => [u0, u1, r[0], r[1]]))
  holed(frontFace('brick', BRICK), GROUND[0], GROUND[1], PLINTH, BAND, [
    ...hung.map(([u0, u1]): Hole => [u0, u1, HUNG, BAND]),
    ...ribbons,
    ...small,
  ])
  fu('precast', GROUND[0], FACE, BRICK, PLINTH, BAND, 1)
  fu('precast', GROUND[1], FACE, BRICK, PLINTH, BAND, -1)
  lid('base', GROUND, [FACE, BRICK], PLINTH)
  for (const [u0, u1] of hung) {
    fu('precast', u0, FACE, BRICK, HUNG, BAND, -1)
    fu('precast', u1, FACE, BRICK, HUNG, BAND, 1)
    lid('precast', [u0, u1], [FACE, BRICK], HUNG, false)
  }
  for (const [u0, u1] of BAYS) lid('precast', [u0, u1], [FACE, BRICK], BAND, false)
  for (const [u0, u1, y0, y1] of ribbons) {
    fu('precast', u0, BRICK, BRICK + 0.1, y0, y1, 1)
    fu('precast', u1, BRICK, BRICK + 0.1, y0, y1, -1)
    lid('brick', [u0, u1], [BRICK, BRICK + 0.1], y0)
    lid('brick', [u0, u1], [BRICK, BRICK + 0.1], y1, false)
    ribbon(paneV, BRICK + 0.1, u0, u1, [y0, y1])
  }
  // the small windows 8cm in. that's behind the inside walls, which is what makes them
  // dark like in the photos (the walls' backs shade them)
  for (const hole of small) {
    revealV('brick', hole, BRICK, 0.08)
    paneV(BRICK + 0.08, ...hole)
  }

  // the slot window and the pylons' glass, 20cm in
  revealV('precast', tallHole(SLOT.u, SLOT.y), FACE, 0.2)
  tall(paneV, FACE + 0.2, [...SLOT.u], SLOT.y)
  for (const g of [g1, g2, g3]) {
    revealV('precast', tallHole(g, [CURTAIN[0], RECESS_TOP]), FACE, 0.2)
    const w = (g[1] - g[0] - NARROW) / 2
    tall(paneV, FACE + 0.2, [g[0], g[0] + w, g[1] - w, g[1]], CURTAIN)
    fv('precast', FACE + 0.2, g[0], g[1], CURTAIN[1], RECESS_TOP, -1)
  }
  // the parapets
  for (const p of PYLONS)
    slab(p.top as [number, number][], (s, d) => [s, FACE + d], [0, -1], PARAPET)

  // the doors: the recess's sides (the exposed aggregate along their bottom too), the soffit,
  // the storefront at the back with a transom over it. the game's door is the middle of it
  const [r0, r1] = RECESS.u
  for (const [u, s] of [
    [r0, 1],
    [r1, -1],
  ] as const) {
    fu('base', u, FACE, RECESS.v, 0, PLINTH_EAST, s)
    fu('precast', u, FACE, RECESS.v, PLINTH_EAST, RECESS.soffit, s)
  }
  lid('precast', RECESS.u, [FACE, RECESS.v], RECESS.soffit, false)
  // the shadow lookup is pushed out along the surface (normalBias), right under a soffit it
  // looked past it. a ceiling higher up inside the pylon, for the shadows only
  lid('precast', [r0 - 0.3, r1 + 0.3], [FACE + 0.05, RECESS.v + 0.5], RECESS.soffit + 0.8, false)
  paneV(RECESS.v - 0.02, r0, r1, STORE, RECESS.soffit)
  const doorU = door ? uvOf(door)[0] : (r0 + r1) / 2
  const store = RECESS.v - 0.02
  holed(
    (a, z, y0, y1) => add('clear', wallQuad(A(a, store), A(z, store), y0, y1, D(0, -1), a - r0)),
    r0,
    r1,
    0,
    STORE,
    [[doorU - DOOR_WIDTH / 2, doorU + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]],
  )

  // the planters along the brick bays
  for (const [u0, u1] of PLANTERS)
    box('precast', [u0, u1], [FACE - PLANTER.d, FACE], [0, PLANTER.top], 'uUvt')

  // the east wall over the shops and the annex: the precast corner with its glass slot, the
  // brick bay with ribbons under a precast band, a precast strip at the back. below the
  // shops' roof and the annex's it's their wall
  const east = eastFace('precast', EAST)
  holed(east, FACE, EAST_BAY[0], 0, COPING, [[EAST_SLOT[0], EAST_SLOT[1], CURTAIN[0], CURTAIN[1]]])
  revealU('precast', [EAST_SLOT[0], EAST_SLOT[1], CURTAIN[0], CURTAIN[1]], EAST, 0.2)
  tall(paneU, EAST - 0.2, [...EAST_SLOT], CURTAIN)
  fu('precast', EAST, EAST_BAY[0], EAST_BAY[1], BAND, COPING, 1)
  fu('precast', EAST, EAST_BAY[1], -154.6, 11.2, COPING, 1)
  const ebrick = EAST - bayDeep
  for (const [v0, v1, y0] of [
    [EAST_BAY[0], SHOPS_END, 3.6],
    [SHOPS_END, EAST_BAY[1], 11.2],
  ] as const) {
    const rows = ROWS.filter((r) => r[0] > y0).map((r): Hole => [v0, v1, r[0], r[1]])
    holed(eastFace('brick', ebrick), v0, v1, y0, BAND, rows)
    for (const r of rows) {
      lid('brick', [ebrick - 0.1, ebrick], [v0, v1], r[2])
      lid('brick', [ebrick - 0.1, ebrick], [v0, v1], r[3], false)
    }
  }
  for (const [v, s] of [
    [EAST_BAY[0], 1],
    [EAST_BAY[1], -1],
  ] as const) {
    fv('precast', v, ebrick, EAST, 3.6, BAND, s)
    for (const r of ROWS) fv('precast', v, ebrick - 0.1, ebrick, r[0], r[1], s)
  }
  lid('precast', [ebrick, EAST], [...EAST_BAY], BAND, false)
  // the bottom row is only over the shops
  ROWS.forEach((r, i) => ribbon(paneU, ebrick - 0.1, EAST_BAY[0], i ? EAST_BAY[1] : SHOPS_END, r))
  slab(P4, (s, d) => [EAST - d, s], [1, 0], PARAPET)

  // the back against the hurt plaza garage: plain precast, only its top shows
  fv('precast', -154.6, -183, EAST, 0, COPING, 1)
  fu('precast', -183, -154.6, -151.8, 0, COPING, 1)
  fv('precast', -151.8, WEST, -183, 0, COPING, 1)

  // the alley side: dark brick under a precast band, the corner precast. the tall bit by the
  // dock and the wing are the same
  fu('precast', WEST, FACE, -202.4, 0, COPING, -1)
  for (const [a, z, top] of [
    [-202.4, -190.2, COPING],
    [-190.2, -180.5, TOP],
    [-164, -154, TOP],
    [-154, -151.8, COPING],
  ] as const) {
    fu('brick', WEST, a, z, 0, BAND, -1)
    fu('precast', WEST, a, z, BAND, top, -1)
  }
  fu('precast', WEST, -170.5, -164, COPING, TOP, -1)
  // the tall bit and the wing
  fv('brick', -180.5, -218.6, WEST, 0, BAND, -1)
  fv('precast', -180.5, -218.6, WEST, BAND, TOP, -1)
  fu('brick', -218.6, -180.5, -170.5, 0, BAND, -1)
  fu('precast', -218.6, -180.5, -170.5, BAND, TOP, -1)
  fv('precast', -170.5, -218.6, WEST, COPING, TOP, 1)
  fv('brick', -170.5, -219.9, -218.6, 0, BAND, -1)
  fv('precast', -170.5, -219.9, -218.6, BAND, COPING, -1)
  fu('brick', -219.9, -170.5, -164, 0, BAND, -1)
  fu('precast', -219.9, -170.5, -164, BAND, COPING, -1)
  fv('brick', -164, -219.9, WEST, 0, BAND, 1)
  fv('precast', -164, -219.9, WEST, BAND, COPING, 1)

  // the coping round the top, the parapet's inside and the roof (a light grey membrane)
  const inner = shrink(RIM, 0.3)
  const ring = (c: [number, number][], y: number) =>
    c.map(([u, v]) => [u, v, y] as [number, number, number])
  polygon('metal', ring(RIM, COPING), [0, 0, 1], [ring(inner, COPING)])
  inner.forEach(([u, v], i) => {
    const [u1, v1] = inner[(i + 1) % inner.length]!
    const p = A(u, v)
    const q = A(u1, v1)
    // facing in, toward the middle of the roof
    const l = Math.hypot(u1 - u, v1 - v)
    const into = D(-(v1 - v) / l, (u1 - u) / l)
    add(
      'precast',
      wallQuad(p, q, ROOF, COPING, signedArea(RIM) > 0 ? into : { x: -into.x, z: -into.z }),
    )
  })
  polygon('precast', ring(inner, ROOF), [0, 0, 1], [], wide)
  // the grey cap along the coping's edge, where no parapet stands on it
  for (const [a, z] of [
    [WEST, -198],
    [-191.75, -174.75],
    [-168.75, -160.25],
    [-148.75, EAST],
  ] as const)
    fv('metal', FACE - 0.01, a, z, COPING - CAP, COPING, -1)
  for (const [a, z] of [
    [FACE, P4[0]![0]],
    [P4.at(-1)![0], -154.6],
  ] as const)
    fu('metal', EAST + 0.01, a, z, COPING - CAP, COPING, 1)

  // the top floor, set back: plain precast
  fv('precast', -190.2, WEST, -195.8, ROOF, TOP, -1)
  fu('precast', -195.8, -190.2, -180.5, ROOF, TOP, 1)
  fv('precast', -180.5, -195.8, -183.5, ROOF, TOP, -1)
  fu('precast', -183.5, -180.5, -154, ROOF, TOP, 1)
  fv('precast', -154, -183.5, WEST, ROOF, TOP, 1)
  polygon('precast', ring(UPPER, TOP), [0, 0, 1], [], wide)

  // the roof's fans and units, and the stacks with their hoods
  for (const [u0, u1, v0, v1, top] of UNITS) {
    const base = u0 < -183.5 && v0 > -190.2 ? TOP : ROOF
    box('metal', [u0, u1], [v0, v1], [base, top], 'uUvVt')
  }
  for (const [u, v, top] of STACKS) {
    const base = u < -195.8 && v > -190.2 ? TOP : ROOF
    stack(add, A(u, v), base, top)
  }

  // the dock's canopy over the alley, from the wall out to ten park place
  box('metal', [CANOPY.u, WEST], [-186.5, -180.5], CANOPY.y)
  box('metal', [CANOPY.u, -218.6], [-180.5, -170.5], CANOPY.y, 'uVtb')

  // the gate: black bars, all frame in the glass's shader
  const [ga, gz] = GATE.u
  const bars = Math.round((gz - ga) / 0.15)
  for (let i = 0; i <= bars; i++) {
    const u = ga + ((gz - ga) * i) / bars
    for (const s of [-1, 1])
      bar(add, A(u - 0.02, GATE.v), A(u + 0.02, GATE.v), 0, GATE.top, D(0, s))
  }
  for (const y of [0.1, GATE.top - 0.1])
    for (const s of [-1, 1]) bar(add, A(ga, GATE.v), A(gz, GATE.v), y - 0.04, y + 0.04, D(0, s))

  // the name on the end bay by the doors: a white plate, the logo's blue square (it's gsu's
  // trademark) and a red bar. "50" on the pier on the other side
  const front0 = Math.atan2(D(0, -1).x, D(0, -1).z)
  const plate = { u: -150.2, y: 3.15 }
  signs.push({
    ...A(plate.u, FACE - 0.03),
    y: plate.y,
    rot: front0,
    text: 'NATURAL SCIENCE\nCENTER',
    scale: 0.54,
    color: '#3a4250',
  })
  signs.push({
    ...A(plate.u - 0.77, FACE - 0.045),
    y: plate.y,
    rot: front0,
    text: '',
    plate: '#c8202f',
    width: 0.04,
    height: 0.42,
  })
  signs.push({
    ...A(-157.27, FACE - 0.02),
    y: 2.75,
    rot: front0,
    text: '50',
    letters: true,
    size: 0.22,
    color: '#5b5e60',
    weight: 500,
  })

  // inside the ground floor: walls round the outline, glass at the storefront. along the
  // shops and the annex they're 5cm in, their walls are on the same line facing the other way
  insideWalls(inside, outline, door, (p, q) => {
    const [u, v] = uvOf({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 })
    return Math.abs(v - RECESS.v) < 0.01 && u > r0 && u < r1
  })
  for (const geo of inside.solid) {
    const pos = geo.getAttribute('position')
    const [u] = uvOf({ x: (pos.getX(0) + pos.getX(1)) / 2, z: (pos.getZ(0) + pos.getZ(1)) / 2 })
    if (Math.abs(u - EAST) < 0.01) {
      const d = D(-0.05, 0)
      geo.translate(d.x, 0, d.z)
    }
  }

  return {
    parts: merged(),
    inside,
    signs,
    first: ['precast', 'brick'],
    noShadow: ['base'],
  }
}

// the outline moved in by d, corners mitred
function shrink(c: [number, number][], d: number): [number, number][] {
  const s = signedArea(c) > 0 ? 1 : -1
  return c.map(([u, v], i) => {
    const [pu, pv] = c[(i + c.length - 1) % c.length]!
    const [nu, nv] = c[(i + 1) % c.length]!
    const n = (a: number, b: number) => {
      const l = Math.hypot(a, b)
      return [(-b / l) * s, (a / l) * s]
    }
    const [n1u, n1v] = n(u - pu, v - pv) as [number, number]
    const [n2u, n2v] = n(nu - u, nv - v) as [number, number]
    const k = d / (1 + n1u * n2u + n1v * n2v)
    return [u + (n1u + n2u) * k, v + (n1v + n2v) * k]
  })
}

function signedArea(c: [number, number][]) {
  let a = 0
  c.forEach(([u, v], i) => {
    const [u1, v1] = c[(i + 1) % c.length]!
    a += u * v1 - u1 * v
  })
  return a / 2
}

type Add = (part: Part, geo: THREE.BufferGeometry) => void

// a flat strip from a to b facing o, all frame in the glass's shader (the gate's bars)
function bar(add: Add, a: Point, b: Point, y0: number, y1: number, o: Point) {
  const geo = glassQuad(a, b, y0, y1, o)
  const pane = geo.getAttribute('aPane')
  for (let i = 0; i < pane.count; i++) pane.setZ(i, 0)
  add('glass', geo)
}

// an exhaust stack: a pipe, a wider hood and a low cone on top. uvs stretched so the metal's
// joints don't show
function stack(add: Add, c: Point, base: number, top: number) {
  const n = 14
  const ring = (r: number, y: number) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2
      return new THREE.Vector3(c.x + Math.cos(t) * r, y, c.z + Math.sin(t) * r)
    })
  const pos: number[] = []
  const quad = (a: THREE.Vector3, b: THREE.Vector3, p: THREE.Vector3, q: THREE.Vector3) => {
    // a b on the bottom, q p over them. outward is away from the axis (or down/up)
    const mid = new THREE.Vector3().addVectors(a, q).multiplyScalar(0.5)
    const out = new THREE.Vector3(mid.x - c.x, 0, mid.z - c.z)
    const n1 = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(q, a))
    const tri = n1.dot(out) >= 0 ? [a, b, q, a, q, p] : [a, q, b, a, p, q]
    for (const v of tri) pos.push(...v.toArray())
  }
  const band = (r0: number, y0: number, r1: number, y1: number) => {
    const lo = ring(r0, y0)
    const hi = ring(r1, y1)
    for (let i = 0; i < n; i++) quad(lo[i]!, lo[(i + 1) % n]!, hi[i]!, hi[(i + 1) % n]!)
  }
  const hood = top - 1.1
  band(0.55, base, 0.55, hood)
  band(0.75, hood, 0.75, top - 0.25)
  band(0.75, top - 0.25, 0.3, top)
  // under the hood's rim, facing down
  const under = ring(0.75, hood)
  const pipe = ring(0.55, hood)
  for (let i = 0; i < n; i++) {
    const [a, b, p, q] = [pipe[i]!, pipe[(i + 1) % n]!, under[i]!, under[(i + 1) % n]!]
    const n1 = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(q, a))
    const tri = n1.y <= 0 ? [a, b, q, a, q, p] : [a, q, b, a, p, q]
    for (const v of tri) pos.push(...v.toArray())
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0.3), 2),
  )
  add('metal', geo)
}

// what you bump into outside: the planters and the alley's gate
export function nscObstacles(b: NscData) {
  const { A } = nscFrame(b)
  const line = (p: [number, number], q: [number, number]): Segment => {
    const a = A(...p)
    const z = A(...q)
    return { ax: a.x, az: a.z, bx: z.x, bz: z.z }
  }
  // osm's sidewalk runs along the face, over the planters (the real curb is further out)
  const planters = PLANTERS.flatMap(([u0, u1]) => {
    const v0 = FACE - PLANTER.d
    return [line([u0, FACE], [u0, v0]), line([u0, v0], [u1, v0]), line([u1, v0], [u1, FACE])]
  })
  return { planters, gate: line([GATE.u[0], GATE.v], [GATE.u[1], GATE.v]) }
}
