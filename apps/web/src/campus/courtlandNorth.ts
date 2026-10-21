import * as THREE from 'three'
import type { Point, Segment } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  flat,
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// courtland north (106 courtland st), next to the sports arena on the courtland st viaduct.
// a 1920s two storey building of painted cream brick: five bays between pilasters, four
// light windows upstairs, glass block and an awning over the door downstairs, a parapet with
// little blocks over the pilasters. at its north end a red brick stair tower turned to true
// north (41 degrees off the street) with a rounded corner and the name, and a low link with a
// canopy over a door. two more floors go down to the alley under the viaduct, the game is
// flat so they aren't drawn. from usgs's lidar (2018) and warren lemay's photo (2019, the
// newest of the front). sources: docs/reference/courtland-north.md
//
// "u" is meters along decatur st, "v" meters along courtland st away from decatur st, both
// from hurt park (the same numbers as build-campus.mjs and the sports arena). the game's
// ground is the viaduct's sidewalk in the middle of the front (320.6m)

export type CourtlandNorthData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { along: number[] }
}

// few parts, each is a draw call in every pass. cream is the painted brick and everything
// painted on it (the canopy too), block the glass block and the cooling unit's frame on the
// roof, metal dark bronze (the awning, the copings, the roofs), concrete the viaduct's
// parapet
export type Part = 'cream' | 'brick' | 'glass' | 'block' | 'metal' | 'concrete'

type Range = readonly [number, number]

// the street front: the pilasters stand 12cm out from the wall, the ground floor's glass is
// 5cm in (that's the outline, nothing goes behind it under the inside's ceiling) and the
// windows upstairs 12cm. the plinth stands out a bit more than the pilasters
export const WALL = 67.3
export const PIER = 67.18
export const GLASS = 67.35
const UPPER_GLASS = 67.42
const PLINTH_FACE = 67.12
export const BACK = 82.65
export const NORTH = 264.4
export const SOUTH = 290.4
// heights over the sidewalk (lidar and the 2019 photo): the plinth, the ground floor's heads,
// the sill ledge and the windows upstairs, the course over the pilasters, the roof, the
// parapet
const PLINTH = 0.3
const HEAD = 3.45
const LEDGE: Range = [4.6, 4.72]
const UPPER: Range = [4.72, 7.05]
const COURSE: Range = [7.3, 7.4]
const ROOF = 7.9
export const PARAPET = 8.85
// five equal bays between the corner piers (1.1m) and the pilasters (1m)
export const PIERS: Range[] = [
  [264.4, 265.5],
  [269.46, 270.46],
  [274.42, 275.42],
  [279.38, 280.38],
  [284.34, 285.34],
  [289.3, 290.4],
]
const bay = (i: number): Range => [PIERS[i]![1], PIERS[i + 1]![0]]
// the ground floor: two narrow windows in the first bay, glass block in the second, fourth
// and fifth, the door under the awning in the middle one with a small glass block window
const NARROW: Hole[] = [
  [266.45, 267.45, 1, 3.3],
  [268.4, 269.3, 1, 3.3],
]
const BLOCK_FRAME = 0.08
const SMALL: Hole = [275.8, 276.75, 1.3, 2.5]
const AWNING = { top: 4.6, bottom: 2.8, out: 0.9 }
// the pilasters' parapet: a small block at each edge of every pilaster, the corners a bit
// higher
const FIN = { w: 0.3, y: [8.5, 9] as Range, out: 0.06 }
const CORNER_TOP = 9

// the tower, square to north in the game's x/z (lidar, and the name plate in the photo lines
// up with its north wall). the north east corner is rounded
export const TOWER = { x: [-121.25, -115.25] as Range, z: [240.1, 246] as Range, round: 1.5 }
const TOWER_TOP = 10.55
const TOWER_CAP = 0.16
// the link between the tower and the cream block: its front 1.7m behind the cream wall, a
// tall window over the door with a glass side light, the canopy over the door out to the
// street line (lidar has its flashing 3.9-4.15m)
const LINK = { u: 69, v: [261.62, NORTH] as Range, roof: 7.9 }
// along the cream block's north wall: where the tower's west wall and its south wall cross it
const MEETS = { west: 71.46, south: 72.08 }
const LINK_DOOR: Hole = [262.6, 264.2, 0, 2.4]
const LINK_WINDOW: Hole = [262.7, 264.1, 3.8, 6.7]
const CANOPY = { y: [2.5, 3.9] as Range, flashing: 4.05, end: 261.3 }
// on the roof: the cooling unit by the north end (an open frame with x braces and a band
// round the top), the red pipe railing behind the parapet next to it, a white vent
const UNIT = { u: [69.3, 71.9] as Range, v: [265.4, 268.9] as Range, band: 9.6, top: 10 }
const RAIL = { u: 67.65, v: [265.1, 268.8] as Range, top: 9.45 }
const VENT = { u: 68.2, v: 284.4, top: 10.1 }

// the viaduct's parapet along the sidewalk where the ground falls away under courtland st:
// in front of the void north of this building (the tower stands in it), the alley to the
// courtland building, and south of that one to the fence. concrete with recessed panels about
// 3m long (every photo has it). it's what stops you walking off the sidewalk there
export const VIADUCT = {
  u: [67.3, 67.6] as Range,
  top: 1.1,
  pieces: [
    [234, 262.8],
    [SOUTH, 307.85],
    [339, 342.5],
  ] as Range[],
}
const PANEL = { long: 3, frame: 0.16, y: [0.18, 0.9] as Range, deep: 0.03 }

export function courtlandFrame(b: { landmark?: { along: number[] } }) {
  const [ax, az] = b.landmark!.along as [number, number]
  const A = (u: number, v: number): Point => ({ x: ax * u - az * v, z: az * u + ax * v })
  const uvOf = (p: Point): [number, number] => [ax * p.x + az * p.z, -az * p.x + ax * p.z]
  // a direction (du, dv) in the game
  const D = (du: number, dv: number): Point => ({ x: ax * du - az * dv, z: az * du + ax * dv })
  return { A, uvOf, D }
}

// the metal has ribs (the awning's standing seams), everything else made of it is flat: all
// its uvs on the flat bit between two ribs
const RIBS = 0.3
function smooth(geo: THREE.BufferGeometry) {
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setX(i, RIBS / 2)
  return geo
}

// glass family geometry needs aPane, the window's size and a random number (landmark.ts)
function withPane(geo: THREE.BufferGeometry, w: number, h: number) {
  const n = geo.getAttribute('position').count
  geo.setAttribute(
    'aPane',
    new THREE.Float32BufferAttribute(Array.from({ length: n }, () => [w, h, 0.5]).flat(), 3),
  )
  return geo
}

export function courtlandNorthGeometry(b: CourtlandNorthData) {
  const { add, prism, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, uvOf, D } = courtlandFrame(b)
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  const put = (part: Part, geo: THREE.BufferGeometry) =>
    add(part, part === 'metal' ? smooth(geo) : geo)
  // a wall face at u from v0 to v1, facing -u (s -1, the street) or +u
  const fu = (part: Part, u: number, v0: number, v1: number, y0: number, y1: number, s: number) => {
    if (v1 - v0 > 0.001 && y1 - y0 > 0.001)
      put(part, wallQuad(A(u, v0), A(u, v1), y0, y1, D(s, 0), v0))
  }
  // a wall face at v from u0 to u1, facing -v (s -1, toward decatur st) or +v
  const fv = (part: Part, v: number, u0: number, u1: number, y0: number, y1: number, s: number) => {
    if (u1 - u0 > 0.001 && y1 - y0 > 0.001)
      put(part, wallQuad(A(u0, v), A(u1, v), y0, y1, D(0, s), u0))
  }
  const lid = (part: Part, u: Range, v: Range, y: number, up = true) =>
    put(part, flat([A(u[0], v[0]), A(u[1], v[0]), A(u[1], v[1]), A(u[0], v[1])], y, up))
  // a box, only the faces asked for: u/U the -u/+u sides, v/V the -v/+v ones, t top, b bottom
  const box = (part: Part, u: Range, v: Range, y: Range, faces = 'uUvVtb') => {
    if (faces.includes('u')) fu(part, u[0], v[0], v[1], y[0], y[1], -1)
    if (faces.includes('U')) fu(part, u[1], v[0], v[1], y[0], y[1], 1)
    if (faces.includes('v')) fv(part, v[0], u[0], u[1], y[0], y[1], -1)
    if (faces.includes('V')) fv(part, v[1], u[0], u[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, u, v, y[1])
    if (faces.includes('b')) lid(part, u, v, y[0], false)
  }
  // a face at u facing the street, from v0 to v1 with holes [v0, v1, y0, y1] cut out
  const holed = (
    part: Part,
    u: number,
    v0: number,
    v1: number,
    y0: number,
    y1: number,
    holes: Hole[],
  ) => {
    const cut = holes.map(([h0, h1, a, z]): Hole => [h0 - v0, h1 - v0, a, z])
    for (const [p0, p1, a, z] of solidPieces(v1 - v0, y0, y1, cut))
      fu(part, u, v0 + p0, v0 + p1, a, z, -1)
  }
  // a hole's sides, sill and head from the face at u back to `to`
  const reveal = (part: Part, [v0, v1, y0, y1]: Hole, u: number, to: number) => {
    fv(part, v0, u, to, y0, y1, 1)
    fv(part, v1, u, to, y0, y1, -1)
    if (y0 > 0.01) lid(part, [u, to], [v0, v1], y0)
    lid(part, [u, to], [v0, v1], y1, false)
  }
  const pane = (part: Part, u: number, [v0, v1, y0, y1]: Hole) =>
    add(part, glassQuad(A(u, v0), A(u, v1), y0, y1, D(-1, 0)))

  // the street front. the wall between the pilasters from the plinth up: holes for the
  // ground floor's windows, glass block and the door, and the windows upstairs
  const ground: Hole[] = [...NARROW, SMALL]
  const blocks = [1, 3, 4].map((i): Hole => {
    const [v0, v1] = bay(i)
    return [v0 + BLOCK_FRAME, v1 - BLOCK_FRAME, PLINTH, HEAD]
  })
  const doorV = door ? uvOf(door)[1] : (bay(2)[0] + bay(2)[1]) / 2
  const doorway: Hole = [doorV - DOOR_WIDTH / 2, doorV + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]
  const uppers = [0, 1, 2, 3, 4].map((i): Hole => [...bay(i), UPPER[0], UPPER[1]])
  for (let i = 0; i < 5; i++) {
    const [v0, v1] = bay(i)
    const mine = (h: Hole) => h[0] >= v0 - 0.01 && h[1] <= v1 + 0.01
    const holes = [...ground, ...blocks, doorway].filter(mine)
    holed('cream', WALL, v0, v1, i === 2 ? 0 : PLINTH, LEDGE[0], holes)
    holed('cream', WALL, v0, v1, UPPER[1], COURSE[0], [])
    for (const h of holes) {
      reveal('cream', h, WALL, GLASS)
      if (h === doorway) continue
      pane(blocks.includes(h) || h === SMALL ? 'block' : 'glass', GLASS, h)
    }
  }
  // upstairs the windows go from pilaster to pilaster, set in 12cm, on a sill ledge
  for (const h of uppers) {
    const [v0, v1, y0, y1] = h
    fv('cream', v0, WALL, UPPER_GLASS, y0, y1, 1)
    fv('cream', v1, WALL, UPPER_GLASS, y0, y1, -1)
    lid('cream', [WALL, UPPER_GLASS], [v0, v1], y1, false)
    box('cream', [PIER, UPPER_GLASS], [v0, v1], LEDGE, 'ut')
    lid('cream', [PIER, WALL], [v0, v1], LEDGE[0], false)
    pane('glass', UPPER_GLASS, h)
  }
  // the pilasters and the corner piers, up to the course over them
  for (const v of PIERS) box('cream', [PIER, WALL], v, [PLINTH, COURSE[0]], 'uvV')
  // the course over the pilasters, the band over it up to the parapet
  box('cream', [PIER, WALL], [NORTH, SOUTH], COURSE, 'uvVtb')
  fu('cream', WALL, NORTH, SOUTH, COURSE[1], PARAPET, -1)
  // the plinth, cut for the door
  for (const [v0, v1] of [
    [NORTH, doorway[0]],
    [doorway[1], SOUTH],
  ] as const) {
    box('cream', [PLINTH_FACE, WALL], [v0, v1], [0, PLINTH], 'uvVt')
  }
  // the little blocks on the parapet over the pilasters, the corners stepped up
  for (const [v0, v1] of PIERS.slice(1, -1))
    for (const v of [v0, v1])
      box('cream', [WALL - FIN.out, WALL], [v - FIN.w / 2, v + FIN.w / 2], FIN.y, 'uUvVt')
  for (const v of [PIERS[0]!, PIERS[5]!])
    box('cream', [WALL, WALL + 0.3], v, [PARAPET, CORNER_TOP], 'uvVtU')

  // the awning over the door: a sloped standing seam roof between the pilasters with
  // triangle ends
  {
    const [v0, v1] = bay(2)
    const { top, bottom, out } = AWNING
    const o = WALL - out
    const d = D(-1, 0)
    // up the slope and out from the wall
    const up = new THREE.Vector3(d.x * (top - bottom), out, d.z * (top - bottom)).normalize()
    const corner = (u: number, v: number, y: number) => {
      const p = A(u, v)
      return new THREE.Vector3(p.x, y, p.z)
    }
    const len = Math.hypot(out, top - bottom)
    // uvs along the awning and up the slope, so the seams run down it
    const slope = (dy: number, n: THREE.Vector3) =>
      add(
        'metal',
        quad(
          [
            corner(WALL, v0, top + dy),
            corner(WALL, v1, top + dy),
            corner(o, v1, bottom + dy),
            corner(o, v0, bottom + dy),
          ],
          [
            [v0, len],
            [v1, len],
            [v1, 0],
            [v0, 0],
          ],
          n,
        ),
      )
    slope(0, up)
    slope(-0.04, up.clone().negate())
    for (const [v, s] of [
      [v0 + 0.01, -1],
      [v1 - 0.01, 1],
    ] as const) {
      const n = D(0, s)
      const c = [corner(WALL, v, top), corner(WALL, v, bottom), corner(o, v, bottom)]
      put(
        'metal',
        quad(
          c,
          [
            [0, 0],
            [0, 0],
            [0, 0],
          ],
          new THREE.Vector3(n.x, 0, n.z),
        ),
      )
    }
  }

  // the north end: the cream wall's return in front of the link (all the way down) and over
  // the link's roof, the rest of it behind the tower. the south end and the back, plain
  fv('cream', NORTH, WALL, LINK.u, 0, PARAPET, -1)
  fv('cream', NORTH, LINK.u, MEETS.west, LINK.roof, PARAPET, -1)
  fv('cream', NORTH, MEETS.south, BACK, 0, PARAPET, -1)
  fv('cream', SOUTH, WALL, BACK, 0, PARAPET, 1)
  fu('cream', BACK, NORTH, SOUTH, 0, PARAPET, 1)
  // the parapet's coping, its inside and the roof
  const IN = 0.3
  lid('cream', [WALL, BACK], [NORTH, NORTH + IN], PARAPET)
  lid('cream', [WALL, BACK], [SOUTH - IN, SOUTH], PARAPET)
  lid('cream', [WALL, WALL + IN], [NORTH + IN, SOUTH - IN], PARAPET)
  lid('cream', [BACK - IN, BACK], [NORTH + IN, SOUTH - IN], PARAPET)
  fu('cream', WALL + IN, NORTH + IN, SOUTH - IN, ROOF, PARAPET, 1)
  fu('cream', BACK - IN, NORTH + IN, SOUTH - IN, ROOF, PARAPET, -1)
  fv('cream', NORTH + IN, WALL + IN, BACK - IN, ROOF, PARAPET, 1)
  fv('cream', SOUTH - IN, WALL + IN, BACK - IN, ROOF, PARAPET, -1)
  lid('metal', [WALL + IN, BACK - IN], [NORTH + IN, SOUTH - IN], ROOF)

  // the tower: red brick round its outline, the parts inside the cream block and the link
  // only over their roofs. a dark metal coping round the top
  const [x0, x1] = TOWER.x
  const [z0, z1] = TOWER.z
  const r = TOWER.round
  const c = { x: x1 - r, z: z0 + r }
  const round: Point[] = Array.from({ length: 9 }, (_, i) => {
    const t = -Math.PI / 2 + (i / 8) * (Math.PI / 2)
    return { x: c.x + Math.cos(t) * r, z: c.z + Math.sin(t) * r }
  })
  const westMeets = A(LINK.u, LINK.v[0])
  const blockMeets = A(MEETS.west, NORTH)
  const southMeets = A(MEETS.south, NORTH)
  // [from, to, facing, bottoms along it]
  const towerWalls: [Point, Point, Point, number][] = [
    [{ x: x0, z: z0 }, { x: c.x, z: z0 }, { x: 0, z: -1 }, 0],
    [{ x: x1, z: c.z }, { x: x1, z: z1 }, { x: 1, z: 0 }, 0],
    [{ x: x1, z: z1 }, southMeets, { x: 0, z: 1 }, 0],
    [southMeets, { x: x0, z: z1 }, { x: 0, z: 1 }, PARAPET],
    [{ x: x0, z: z1 }, blockMeets, { x: -1, z: 0 }, PARAPET],
    [blockMeets, westMeets, { x: -1, z: 0 }, LINK.roof],
    [westMeets, { x: x0, z: z0 }, { x: -1, z: 0 }, 0],
  ]
  let along = 0
  const brickWall = (p: Point, q: Point, o: Point, y0: number) => {
    add('brick', wallQuad(p, q, y0, TOWER_TOP - TOWER_CAP, o, along))
    put(
      'metal',
      wallQuad(
        { x: p.x + o.x * 0.02, z: p.z + o.z * 0.02 },
        { x: q.x + o.x * 0.02, z: q.z + o.z * 0.02 },
        TOWER_TOP - TOWER_CAP,
        TOWER_TOP,
        o,
      ),
    )
    along += Math.hypot(q.x - p.x, q.z - p.z)
  }
  for (const [p, q, o, y0] of towerWalls.slice(0, 1)) brickWall(p, q, o, y0)
  for (let i = 1; i < round.length; i++) {
    const p = round[i - 1]!
    const q = round[i]!
    const m = { x: (p.x + q.x) / 2 - c.x, z: (p.z + q.z) / 2 - c.z }
    const l = Math.hypot(m.x, m.z)
    brickWall(p, q, { x: m.x / l, z: m.z / l }, 0)
  }
  for (const [p, q, o, y0] of towerWalls.slice(1)) brickWall(p, q, o, y0)
  put('metal', flat([{ x: x0, z: z0 }, ...round, { x: x1, z: z1 }, { x: x0, z: z1 }], TOWER_TOP))

  // the name on the tower's north wall: a white plate on a blue one, the logo's blue square
  // (it's gsu's trademark) and a red bar
  const north = Math.PI
  const plate = { x: -119.25, y: 3.25, z: z0 - 0.04 }
  signs.push({
    ...plate,
    x: plate.x + 0.03,
    y: plate.y + 0.03,
    z: z0 - 0.02,
    rot: north,
    text: '',
    plate: '#21468f',
    width: 3.32,
    height: 0.72,
  })
  signs.push({
    ...plate,
    rot: north,
    text: 'COURTLAND NORTH',
    scale: 0.776,
    height: 0.9,
    color: '#3a3d44',
  })
  signs.push({
    ...plate,
    x: -117.6 - 0.67,
    z: z0 - 0.05,
    rot: north,
    text: '',
    plate: '#a3262f',
    width: 0.035,
    height: 0.45,
  })

  // the link: brick from the tower to the cream block with the door and the window over it,
  // the canopy in front. a dark coping on its front
  const [lv0, lv1] = LINK.v
  holed('brick', LINK.u, lv0, lv1, 0, LINK.roof - 0.15, [LINK_DOOR, LINK_WINDOW])
  fu('metal', LINK.u - 0.02, lv0, lv1, LINK.roof - 0.15, LINK.roof, -1)
  pane('glass', LINK.u, LINK_DOOR)
  reveal('brick', LINK_WINDOW, LINK.u, LINK.u + 0.12)
  pane('glass', LINK.u + 0.12, LINK_WINDOW)
  put('metal', flat([westMeets, A(LINK.u, NORTH), blockMeets], LINK.roof))
  const canopy = [A(WALL, CANOPY.end), A(LINK.u, lv0), A(LINK.u, NORTH), A(WALL, NORTH)]
  prism('cream', canopy, CANOPY.y[0], CANOPY.y[1], false)
  add('cream', flat(canopy, CANOPY.y[0], false))
  const flashing = [
    A(WALL - 0.03, CANOPY.end - 0.03),
    A(LINK.u, lv0 - 0.03),
    A(LINK.u, NORTH),
    A(WALL - 0.03, NORTH),
  ]
  prism('metal', flashing, CANOPY.y[1], CANOPY.flashing)

  // the roof: the cooling unit, the red railing, the vent. the unit is an open frame with x
  // braces (dark inside) under a pale band
  const [uu0, uu1] = UNIT.u
  const [uv0, uv1] = UNIT.v
  const { band, top } = UNIT
  // pale faces, the glass block's material: a box's sides and a strip
  const pale = (p: Point, q: Point, y0: number, y1: number, o: Point) =>
    add('block', glassQuad(p, q, y0, y1, o))
  const sides = (u: Range, v: Range, y0: number, y1: number, part: 'metal' | 'block') => {
    const faces: [Point, Point, Point][] = [
      [A(u[0], v[0]), A(u[0], v[1]), D(-1, 0)],
      [A(u[1], v[0]), A(u[1], v[1]), D(1, 0)],
      [A(u[0], v[0]), A(u[1], v[0]), D(0, -1)],
      [A(u[0], v[1]), A(u[1], v[1]), D(0, 1)],
    ]
    for (const [p, q, o] of faces)
      if (part === 'block') pale(p, q, y0, y1, o)
      else put('metal', wallQuad(p, q, y0, y1, o))
  }
  sides(UNIT.u, UNIT.v, ROOF, band, 'metal')
  sides([uu0 - 0.02, uu1 + 0.02], [uv0 - 0.02, uv1 + 0.02], band, top, 'block')
  const unitTop = flat([A(uu0, uv0), A(uu1, uv0), A(uu1, uv1), A(uu0, uv1)], top)
  const topUv = unitTop.getAttribute('uv')
  const topPos = unitTop.getAttribute('position')
  for (let i = 0; i < topUv.count; i++) {
    const [u, v] = uvOf({ x: topPos.getX(i), z: topPos.getZ(i) })
    topUv.setXY(i, u - uu0, v - uv0)
  }
  add('block', withPane(unitTop, uu1 - uu0, uv1 - uv0))
  const post = 0.1
  for (const u of [uu0 - 0.03, uu1 + 0.03 - post])
    for (const v of [uv0 - 0.03, uv1 + 0.03 - post])
      sides([u, u + post], [v, v + post], ROOF, band, 'block')
  // the x braces on the two sides you see from the street
  const brace = (p: Point, q: Point, o: Point) => {
    for (const [a, z] of [
      [ROOF, band],
      [band, ROOF],
    ]) {
      const pos = [
        [p.x, a! - 0.09, p.z],
        [q.x, z! - 0.09, q.z],
        [q.x, z!, q.z],
        [p.x, a!, p.z],
      ]
      const geo = glassQuad(p, q, 0, 1, o)
      const at = geo.getAttribute('position')
      // glassQuad's corners are bottom p, bottom q, top q, top p in some order: move each
      // to the brace's corner on the same side
      for (let i = 0; i < at.count; i++) {
        const atP = Math.hypot(at.getX(i) - p.x, at.getZ(i) - p.z) < 0.01
        const k = (atP ? 0 : 1) + (at.getY(i) > 0.5 ? 2 : 0)
        const [x, y, zz] = pos[[0, 1, 3, 2][k]!]!
        at.setXYZ(i, x!, y!, zz!)
      }
      add('block', geo)
    }
  }
  brace(A(uu0 - 0.01, uv0), A(uu0 - 0.01, uv1), D(-1, 0))
  brace(A(uu0, uv0 - 0.01), A(uu1, uv0 - 0.01), D(0, -1))
  const pipe = 0.05
  for (const v of [RAIL.v[0], (RAIL.v[0] + RAIL.v[1]) / 2, RAIL.v[1]])
    box('brick', [RAIL.u, RAIL.u + pipe], [v, v + pipe], [ROOF, RAIL.top], 'uUvV')
  box(
    'brick',
    [RAIL.u, RAIL.u + pipe],
    [RAIL.v[0], RAIL.v[1] + pipe],
    [RAIL.top - pipe, RAIL.top],
    'uUvVt',
  )
  box(
    'brick',
    [RAIL.u, UNIT.u[0]],
    [RAIL.v[1], RAIL.v[1] + pipe],
    [RAIL.top - pipe, RAIL.top],
    'uUvVt',
  )
  const vent = A(VENT.u, VENT.v)
  prism('cream', octagon(vent, 0.25), ROOF, VENT.top - 0.35)
  prism('cream', octagon(vent, 0.35), VENT.top - 0.35, VENT.top)

  // the viaduct's parapet, the panels' recesses on the street side
  const [pu, pb] = VIADUCT.u
  for (const [v0, v1] of VIADUCT.pieces) {
    const n = Math.max(1, Math.round((v1 - v0) / PANEL.long))
    const w = (v1 - v0) / n
    const panels = Array.from({ length: n }, (_, i): Hole => {
      const a = v0 + i * w
      return [a + PANEL.frame, a + w - PANEL.frame, ...PANEL.y]
    })
    holed('concrete', pu, v0, v1, 0, VIADUCT.top, panels)
    for (const h of panels) {
      const [a, z, y0, y1] = h
      fu('concrete', pu + PANEL.deep, a, z, y0, y1, -1)
      fv('concrete', a, pu, pu + PANEL.deep, y0, y1, 1)
      fv('concrete', z, pu, pu + PANEL.deep, y0, y1, -1)
      lid('concrete', [pu, pu + PANEL.deep], [a, z], y0)
      lid('concrete', [pu, pu + PANEL.deep], [a, z], y1, false)
    }
    box('concrete', [pu, pb], [v0, v1], [0, VIADUCT.top], 'UvVt')
  }

  // inside the ground floor: walls round the outline. the arena's walls are 5cm behind the
  // back one
  insideWalls(inside, outline, door, () => false)

  return {
    parts: merged(),
    inside,
    signs,
    first: ['cream', 'brick'],
    noShadow: ['glass', 'block'],
  }
}

function octagon(c: Point, r: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const t = (i / 8) * Math.PI * 2
    return { x: c.x + Math.cos(t) * r, z: c.z + Math.sin(t) * r }
  })
}

// a flat quad through corners a b c d facing n (or a triangle, three corners)
export function quad(c: THREE.Vector3[], uvs: number[][], n: THREE.Vector3) {
  const e1 = new THREE.Vector3().subVectors(c[1]!, c[0]!)
  const e2 = new THREE.Vector3().subVectors(c[2]!, c[0]!)
  const ccw = e1.cross(e2).dot(n) > 0
  const order = ccw ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
  if (c.length === 3) order.length = 3
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      order.flatMap((i) => c[i]!.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      order.flatMap(() => n.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      order.flatMap((i) => uvs[i]!),
      2,
    ),
  )
  return geo
}

// the viaduct's parapet, along its street side
export function courtlandObstacles(b: CourtlandNorthData) {
  const { A } = courtlandFrame(b)
  return VIADUCT.pieces.map(([v0, v1]): Segment => {
    const p = A(VIADUCT.u[0], v0)
    const q = A(VIADUCT.u[0], v1)
    return { ax: p.x, az: p.z, bx: q.x, bz: q.z }
  })
}
