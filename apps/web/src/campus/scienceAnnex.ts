import * as THREE from 'three'
import type { Point, Segment } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import { edges, glassQuad, parts as collect, solidPieces, wallQuad, type Hole } from './landmark'

// the science annex (29 peachtree center ave): chemistry, biology and physics labs over a gsu
// parking level ("i lot"). light grey precast with two rows of punched windows and a ribbon
// on peachtree center ave, a corner on hurt plaza with a tall blank pylon (the sign), two
// bays with columns of windows and louvres, a round stair, and a brick wing over a colonnade
// against the garage that's newer than the 2013 photo. from usgs's lidar (2018), the commons
// photo (2013) and gsu's (2018). sources: docs/reference/science-annex.md
//
// "a" is meters along peachtree center ave toward decatur st, "v" meters in from it toward
// the garage, both from hurt park (the same numbers as build-campus.mjs). the game's ground
// is 312.0m, the sidewalk in the middle of the front

export type AnnexData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { along: number[] }
}

// few parts, each is a draw call in every pass. cream is the warmer precast round the doors,
// on the pylon's base and the piers. metal is the dark blue grey caps, the reveal along the
// front, the ribbons' mullions and the fences. the glass casts shadows: the building is empty inside and has
// windows on two sides and the wing's glass wall, the sun would come through
export type Part = 'precast' | 'cream' | 'metal' | 'glass' | 'brick'

type Range = readonly [number, number]

// the precast face on peachtree center ave (the lidar's coping edge), and the outline 0.25m
// behind it where the ground floor's windows and the parking entrance are set in
export const FACE = 105.3
export const LINE = 105.55
// the north end of the front (the bay with the doors is past it) and the south wall over
// the shops
export const NORTH = 133.9
export const SOUTH = 178.6
// heights over the game's ground (lidar): the roof, the coping with its metal cap, the
// bays' parapets, the pylon, the stair and the brick wing
export const ROOF = 14.7
export const COPING = 15.2
const CAP = 0.15
const BAYS = 16.4
export const PYLON_TOP = 17.1
const DRUM_TOP = 16.2
const WING_TOP = 16.3
// the parapets are 0.3m thick
const THICK = 0.3

// the front, fitted on the 2013 photo: the parking entrance, the ground floor's windows and
// a door, the ribbon on the second floor (a mullion about every 1.95m), the dark reveal
// along the whole front, two rows of punched windows on the same columns, the slot with
// blue rails
export const GARAGE: Hole = [134.2, 138.2, 0, 2.4]
// the parking sign over it: a blade sticking 1.5m out of the front, facing up the street
// toward hurt plaza (it reads square on in the 2013 photo, the front is at a slant)
const ILOT = { a: 140, v: FACE - 0.85, y: 4.05 }
const GROUND_WINDOWS: Range[] = [
  [145.6, 155.3],
  [165, 168.2],
]
const GROUND_Y: Range = [1.2, 2.45]
const SIDE_DOOR: Hole = [159.1, 160.1, 0, 2.2]
const RIBBONS: Range[] = [
  [134.1, 155.3],
  [164.7, 178.4],
]
const RIBBON_Y: Range = [3.15, 5]
const LIGHT = 1.95
const REVEAL: Range = [7.55, 7.85]
export const WINDOWS = [
  134.47, 137.3, 140.11, 142.94, 145.72, 148.5, 151.32, 154.17, 164.38, 167.05, 169.69, 172.27,
  174.85, 177.45,
]
export const ROWS: Range[] = [
  [8.95, 10.25],
  [12.25, 13.5],
]
const WINDOW_W = 1.1
export const SLOT = {
  a: [158.3, 160.6] as Range,
  rows: [
    [8, 10.25],
    [11.3, 13.5],
  ] as Range[],
  deep: 0.6,
  rail: 0.9,
}
// how deep things are set in: ribbon, punched windows, the reveal
const SET = { ribbon: 0.15, window: 0.2, reveal: 0.05 }

// the corner on hurt plaza: the pylon (its front faces the crossing), the bay with the
// doors on peachtree center ave and the north bay on hurt plaza. the stair drum [a, v, r]
// is the same as build-campus.mjs
export const PYLON: [number, number][] = [
  [127.5, 108.7],
  [129.4, 106.15],
  [130.95, 107.42],
  [129.05, 110],
]
export const LEFT = { v: 107.9, a: [131, NORTH] as Range }
export const DRUM = { a: 128.3, v: 113.4, r: 1.35 }
const RIGHT = {
  a: 129.3,
  v: [110, DRUM.v - Math.sqrt(DRUM.r ** 2 - (129.3 - DRUM.a) ** 2)] as Range,
}
// both bays have a column of windows 1.5m wide over the doors (two lights wide), louvres
// under the lower two and over the upper two, and a louvred screen in the parapet
const COLUMN = 1.5
const LIGHTS: { y: Range; louvre: Range }[] = [
  { y: [3.4, 4.6], louvre: [3, 3.4] },
  { y: [6.25, 7.25], louvre: [5.75, 6.25] },
  { y: [8, 10.2], louvre: [10.2, 10.6] },
  { y: [11.4, 13.3], louvre: [13.3, 13.9] },
]
const SCREEN: Range = [15.05, 15.9]
const COLUMN_DEEP = 0.15
// a precast canopy over each bay's doors, just over the game's doorway (the lidar has the
// one on peachtree center ave at 2.7m). cream round the doors and on the pylon's base
const CANOPY: Range = [2.75, 3]
const CREAM = 2.75
const PYLON_BASE = 2.3

// the brick wing on hurt plaza: a colonnade 2m deep (cream piers, black fences between)
// under a precast beam, brick up to a precast coping and a glass wall on the corner. by eye
// from gsu's 2018 photo and mapillary's 2019 one, the lidar has its walls and its top
export const WING = { a: 125, back: 127, v: [114.5, 129.4] as Range, garage: 125.58 }
const COLONNADE = 4
const BEAM = 4.6
const WING_COPING = 15.9
export const PIERS: Range[] = [
  [114.5, 115.4],
  [119.14, 120.04],
  [123.78, 124.68],
  [128.5, 129.4],
]
const PIER = 0.9
const FENCE = { a: 125.45, top: 2.1, bar: 0.15 }
// the glass wall is on the corner: most of hurt plaza's side and a meter round onto the
// side to the bays
const CURTAIN = { v: [114.5, 120.3] as Range, a: [125, 126] as Range, y: [9, 14.3] as Range }
// the north end's roof is higher, from the wing to past the bays (lidar)
const HEAD = { a: 137.5, v: 113.5 }
// the low concrete planter in front of the north bay and the drum, from the pylon's side to
// the wing's corner pier. shrubs behind it
export const PLANTER = {
  from: [127.6, 108.79] as [number, number],
  to: [125.6, 114.5] as [number, number],
  top: 0.9,
  thick: 0.25,
}
// the boxes on the roof [a0, a1, v0, v1, top] (lidar). the first is flush with the front and
// shows over the coping, the next two are an L
const UNITS: [number, number, number, number, number][] = [
  [157, 161.5, FACE, 111.5, 17.3],
  [144, 148.6, 109.5, 124.5, 18],
  [148.6, 158.3, 121.5, 126.8, 18],
  [165.5, 173.5, 120.5, 125.5, 17.9],
  [138, 147, 110, 113, 16.1],
]
// the shops in front of the south wall are 4m, the annex's wall shows from just under their
// roof (their front is 1.2m behind the annex's)
const SHOPS = { top: 3.6, front: 106.5 }

export function annexFrame(b: AnnexData) {
  const [dx, dz] = b.landmark!.along as [number, number]
  const A = (a: number, v: number): Point => ({ x: a * dx - v * dz, z: a * dz + v * dx })
  const avOf = (p: Point): [number, number] => [p.x * dx + p.z * dz, -p.x * dz + p.z * dx]
  return { A, avOf, D: A }
}

export function scienceAnnexGeometry(b: AnnexData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, avOf, D } = annexFrame(b)
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  // a wall face at v from a0 to a1, facing -v (s -1, toward peachtree center ave) or +v
  const fv = (part: Part, v: number, a0: number, a1: number, y0: number, y1: number, s: number) => {
    if (a1 - a0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(A(a0, v), A(a1, v), y0, y1, D(0, s), a0))
  }
  // a wall face at a from v0 to v1, facing -a (s -1, toward hurt plaza) or +a
  const fa = (part: Part, a: number, v0: number, v1: number, y0: number, y1: number, s: number) => {
    if (v1 - v0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(A(a, v0), A(a, v1), y0, y1, D(s, 0), v0))
  }
  // a straight wall from p to q (in a, v) facing away from the point `from`
  const side = (part: Part, p: Range, q: Range, y0: number, y1: number, from: Range) => {
    const [pa, pv] = p
    const [qa, qv] = q
    const l = Math.hypot(qa - pa, qv - pv)
    let n: Range = [(qv - pv) / l, -(qa - pa) / l]
    const mid = [(pa + qa) / 2 - from[0], (pv + qv) / 2 - from[1]]
    if (n[0] * mid[0]! + n[1] * mid[1]! < 0) n = [-n[0], -n[1]]
    if (y1 - y0 > 0.001) add(part, wallQuad(A(pa, pv), A(qa, qv), y0, y1, D(...n)))
  }
  // a flat polygon through [a, v, y] corners facing o = [da, dv, dy]. the families read uv y
  // as the height for the dirt near the ground, so a level one gets its v far from 0
  const polygon = (part: Part, c: [number, number, number][], o: [number, number, number]) => {
    const up = Math.abs(o[2]) > 0.5
    const flatA = Math.abs(o[0]) > Math.abs(o[1])
    const at = ([a, v, y]: [number, number, number]): [number, number] =>
      up ? [a, v + 1000] : flatA ? [v, y] : [a, y]
    const tris = THREE.ShapeUtils.triangulateShape(
      c.map((p) => new THREE.Vector2(...at(p))),
      [],
    )
    const d = D(o[0], o[1])
    const out = new THREE.Vector3(d.x, o[2], d.z).normalize()
    const pts = c.map(([a, v, y]) => {
      const p = A(a, v)
      return new THREE.Vector3(p.x, y, p.z)
    })
    const pos: number[] = []
    const uvs: number[] = []
    const e1 = new THREE.Vector3()
    const e2 = new THREE.Vector3()
    for (const [i, j, k] of tris) {
      e1.subVectors(pts[j!]!, pts[i!]!)
      e2.subVectors(pts[k!]!, pts[i!]!)
      const flip = e1.cross(e2).dot(out) < 0
      for (const n of [i!, flip ? k! : j!, flip ? j! : k!]) {
        pos.push(...pts[n]!.toArray())
        uvs.push(...at(c[n]!))
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
    add(part, geo)
  }
  const level = (c: Range[], y: number) => c.map(([a, v]) => [a, v, y] as [number, number, number])
  const lid = (part: Part, a: Range, v: Range, y: number, up = true) =>
    polygon(
      part,
      level(
        [
          [a[0], v[0]],
          [a[1], v[0]],
          [a[1], v[1]],
          [a[0], v[1]],
        ],
        y,
      ),
      [0, 0, up ? 1 : -1],
    )
  // a box, only the faces asked for: a/A the -a/+a sides, v/V the -v/+v ones, t top, b bottom
  const box = (part: Part, a: Range, v: Range, y: Range, faces = 'aAvVtb') => {
    if (faces.includes('a')) fa(part, a[0], v[0], v[1], y[0], y[1], -1)
    if (faces.includes('A')) fa(part, a[1], v[0], v[1], y[0], y[1], 1)
    if (faces.includes('v')) fv(part, v[0], a[0], a[1], y[0], y[1], -1)
    if (faces.includes('V')) fv(part, v[1], a[0], a[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, a, v, y[1])
    if (faces.includes('b')) lid(part, a, v, y[0], false)
  }
  // a wall face from `from` to `to` with holes cut out of it
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
  // the sides, sill and head of a hole `depth` deep in a wall at v facing -v
  const revealV = (part: Part, [a0, a1, y0, y1]: Hole, v: number, depth: number) => {
    fa(part, a0, v, v + depth, y0, y1, 1)
    fa(part, a1, v, v + depth, y0, y1, -1)
    if (y0 > 0.01) lid(part, [a0, a1], [v, v + depth], y0)
    lid(part, [a0, a1], [v, v + depth], y1, false)
  }
  // the same in a wall at a facing -a (s -1) or +a
  const revealA = (part: Part, [v0, v1, y0, y1]: Hole, a: number, depth: number, s: number) => {
    const ad: Range = s < 0 ? [a, a + depth] : [a - depth, a]
    fv(part, v0, ad[0], ad[1], y0, y1, 1)
    fv(part, v1, ad[0], ad[1], y0, y1, -1)
    if (y0 > 0.01) lid(part, ad, [v0, v1], y0)
    lid(part, ad, [v0, v1], y1, false)
  }
  // glass facing -v at v, facing -a (or +a) at a. z 0 is a pane that never lights up (the
  // dark backs of the louvres)
  const paneV = (v: number, a0: number, a1: number, y0: number, y1: number, z?: number) => {
    if (a1 - a0 < 0.01 || y1 - y0 < 0.01) return
    const geo = glassQuad(A(a0, v), A(a1, v), y0, y1, D(0, -1))
    if (z !== undefined) seed(geo, z)
    add('glass', geo)
  }
  const paneA = (a: number, v0: number, v1: number, y0: number, y1: number, s = -1, z?: number) => {
    if (v1 - v0 < 0.01 || y1 - y0 < 0.01) return
    const geo = glassQuad(A(a, v0), A(a, v1), y0, y1, D(s, 0))
    if (z !== undefined) seed(geo, z)
    add('glass', geo)
  }
  // a row of lights between a0 and a1, each its own pane (the frame round each is the
  // mullion between them)
  const lightsV = (v: number, a0: number, a1: number, y: Range, width: number) => {
    const n = Math.max(1, Math.round((a1 - a0) / width))
    const w = (a1 - a0) / n
    for (let i = 0; i < n; i++) paneV(v, a0 + i * w, a0 + (i + 1) * w, y[0], y[1])
  }
  // a ribbon: glass in pieces of four lights (so they don't all light up at night as one)
  // with dark mullions in front, and a dark frame round it
  const ribbonV = (v: number, a0: number, a1: number, y: Range, width: number) => {
    const n = Math.max(1, Math.round((a1 - a0) / width))
    const w = (a1 - a0) / n
    for (let i = 0; i < n; i += 4) paneV(v, a0 + i * w, a0 + Math.min(n, i + 4) * w, y[0], y[1])
    const m = 0.03
    for (let i = 0; i <= n; i++) {
      const a = a0 + i * w
      fv('metal', v - 0.01, Math.max(a0, a - m), Math.min(a1, a + m), y[0], y[1], -1)
    }
    fv('metal', v - 0.01, a0, a1, y[0], y[0] + 2 * m, -1)
    fv('metal', v - 0.01, a0, a1, y[1] - 2 * m, y[1], -1)
  }
  // a louvre: a dark pane with light slats in front, all frame in the glass's shader
  const slats = (y: Range, quad: (y0: number, y1: number) => void) => {
    const n = Math.max(2, Math.round((y[1] - y[0]) / 0.1))
    const step = (y[1] - y[0]) / n
    for (let i = 0; i < n; i++) quad(y[0] + i * step + 0.025, y[0] + i * step + 0.075)
  }

  // peachtree center ave: the precast face with everything cut out of it, the metal cap on
  // top
  const front = (part: Part, v: number) => (a0: number, a1: number, y0: number, y1: number) =>
    fv(part, v, a0, a1, y0, y1, -1)
  const windows = ROWS.flatMap((r) =>
    WINDOWS.map((c): Hole => [c - WINDOW_W / 2, c + WINDOW_W / 2, r[0], r[1]]),
  )
  const slots = SLOT.rows.map((r): Hole => [SLOT.a[0], SLOT.a[1], r[0], r[1]])
  const grounds = GROUND_WINDOWS.map(([a0, a1]): Hole => [a0, a1, GROUND_Y[0], GROUND_Y[1]])
  const ribbons = RIBBONS.map(([a0, a1]): Hole => [a0, a1, RIBBON_Y[0], RIBBON_Y[1]])
  const reveal: Hole = [NORTH, SOUTH, REVEAL[0], REVEAL[1]]
  holed(front('precast', FACE), NORTH, SOUTH, 0, COPING, [
    GARAGE,
    SIDE_DOOR,
    ...grounds,
    ...ribbons,
    reveal,
    ...windows,
    ...slots,
  ])
  // the ground floor's openings go back to the outline: the parking entrance and the door
  // are dark, the windows glass with a mullion every 1.95m
  const deep = LINE - FACE
  for (const hole of [GARAGE, SIDE_DOOR, ...grounds]) revealV('precast', hole, FACE, deep)
  for (const [a0, a1, y0, y1] of [GARAGE, SIDE_DOOR]) fv('metal', LINE - 0.01, a0, a1, y0, y1, -1)
  for (const [a0, a1, y0, y1] of grounds) ribbonV(LINE - 0.01, a0, a1, [y0, y1], LIGHT)
  // the ribbon and the punched windows
  for (const hole of ribbons) {
    revealV('precast', hole, FACE, SET.ribbon)
    ribbonV(FACE + SET.ribbon, hole[0], hole[1], RIBBON_Y, LIGHT)
  }
  for (const hole of windows) {
    revealV('precast', hole, FACE, SET.window)
    paneV(FACE + SET.window, hole[0], hole[1], hole[2], hole[3])
  }
  // the reveal: a dark metal groove along the whole front
  fv('metal', FACE + SET.reveal, NORTH, SOUTH, REVEAL[0], REVEAL[1], -1)
  lid('precast', [NORTH, SOUTH], [FACE, FACE + SET.reveal], REVEAL[0])
  lid('precast', [NORTH, SOUTH], [FACE, FACE + SET.reveal], REVEAL[1], false)
  // the slot: two deep recesses with glass at the back and a blue rail across each (signs)
  for (const hole of slots) {
    revealV('precast', hole, FACE, SLOT.deep)
    lightsV(FACE + SLOT.deep, hole[0], hole[1], [hole[2], hole[3]], 1.2)
  }
  const toPca = Math.atan2(D(0, -1).x, D(0, -1).z)
  for (const [y0] of SLOT.rows)
    signs.push({
      ...A((SLOT.a[0] + SLOT.a[1]) / 2, FACE + 0.25),
      y: y0 + SLOT.rail,
      rot: toPca,
      text: '',
      plate: '#2c5d9c',
      width: SLOT.a[1] - SLOT.a[0],
      height: 0.12,
    })

  // the parking sign over the entrance (2013): a white plate in a blue border, the logo's
  // blue square, a red line, "I LOT RECITAL HALL PARKING", plain blue on the back. the
  // entrance's steel is yellow
  const toNorth = Math.atan2(D(-1, 0).x, D(-1, 0).z)
  const lot = (d: number, y: number, s: Partial<Sign>) =>
    signs.push({ ...A(ILOT.a - d, ILOT.v), y, rot: toNorth, text: '', ...s })
  lot(0.03, ILOT.y, { plate: '#2a55a5', width: 1.4, height: 2.8 })
  lot(0.04, ILOT.y, { plate: '#f1f1ee', width: 1.24, height: 2.64 })
  lot(0.05, ILOT.y + 0.88, { plate: '#1f4b99', width: 0.38, height: 0.38 })
  lot(0.05, ILOT.y + 0.58, { plate: '#c8202f', width: 0.95, height: 0.035 })
  const letters = { letters: true, color: '#1c2a4a' }
  lot(0.05, ILOT.y + 0.14, { ...letters, text: 'I', size: 0.6, weight: 800 })
  lot(0.05, ILOT.y - 0.27, { ...letters, text: 'LOT', size: 0.25, weight: 700 })
  lot(0.05, ILOT.y - 0.92, { ...letters, text: 'RECITAL\nHALL\nPARKING', size: 0.14, weight: 600 })
  signs.push({
    ...A(ILOT.a + 0.03, ILOT.v),
    y: ILOT.y,
    rot: toNorth + Math.PI,
    text: '',
    plate: '#2a55a5',
    width: 1.4,
    height: 2.8,
  })
  signs.push({
    ...A((GARAGE[0] + GARAGE[1]) / 2, LINE - 0.03),
    y: 2.28,
    rot: toPca,
    text: '',
    plate: '#d6ad24',
    width: 3.9,
    height: 0.16,
  })

  // the coping: the cap on the front and the south wall, the parapets' insides, the roof
  const southEnd = Math.max(
    ...outline
      .map(avOf)
      .filter(([a]) => Math.abs(a - SOUTH) < 0.05)
      .map(([, v]) => v),
  )
  fv('metal', FACE - 0.01, NORTH, SOUTH + 0.01, COPING - CAP, COPING, -1)
  lid('metal', [NORTH, SOUTH + 0.01], [FACE - 0.01, FACE + THICK], COPING)
  fv('precast', FACE + THICK, NORTH + THICK, SOUTH - THICK, ROOF, COPING, 1)
  fa('metal', SOUTH + 0.01, FACE - 0.01, southEnd, COPING - CAP, COPING, 1)
  lid('metal', [SOUTH - THICK, SOUTH + 0.01], [FACE + THICK, southEnd], COPING)
  fa('precast', SOUTH - THICK, FACE + THICK, southEnd, ROOF, COPING, -1)
  polygon('precast', level(outline.map(avOf), ROOF), [0, 0, 1])

  // the south wall over the shops: plain, from the ground where it's in front of them
  fa('precast', SOUTH, FACE, SHOPS.front, 0, COPING, 1)
  fa('precast', SOUTH, SHOPS.front, southEnd, SHOPS.top, COPING, 1)

  // the boxes on the roof
  for (const [a0, a1, v0, v1, top] of UNITS) {
    const flush = v0 === FACE
    box('precast', [a0, a1], [v0, v1], [ROOF, top], flush ? 'aAVt' : 'aAvVt')
    if (flush) {
      fv('precast', FACE, a0, a1, COPING, top - CAP, -1)
      fv('metal', FACE - 0.01, a0, a1, top - CAP, top, -1)
    }
  }

  // the bay with the doors on peachtree center ave. the return to the front, the bay's face
  // with the doorway (the game's door) in cream under the canopy, the column of windows
  // and louvres over it, the parapet with its screen
  const [l0, l1] = LEFT.a
  fa('cream', NORTH, FACE, LEFT.v, 0, CREAM, -1)
  fa('precast', NORTH, FACE, LEFT.v, CREAM, BAYS, -1)
  const doorA = door ? avOf(door)[0] : (l0 + l1) / 2
  holed(front('cream', LEFT.v), l0, l1, 0, CREAM, [
    [doorA - DOOR_WIDTH / 2, doorA + DOOR_WIDTH / 2, 0, DOOR_HEIGHT],
  ])
  const leftC = (l0 + l1) / 2
  const column = (c: number): Hole[] => [
    ...LIGHTS.map(({ y, louvre }): Hole => [
      c - COLUMN / 2,
      c + COLUMN / 2,
      Math.min(y[0], louvre[0]),
      Math.max(y[1], louvre[1]),
    ]),
    [c - COLUMN / 2, c + COLUMN / 2, SCREEN[0], SCREEN[1]],
  ]
  holed(front('precast', LEFT.v), l0, l1, CREAM, BAYS, column(leftC))
  const [c0, c1] = [leftC - COLUMN / 2, leftC + COLUMN / 2]
  for (const { y, louvre } of LIGHTS) {
    const at = LEFT.v + COLUMN_DEEP
    revealV(
      'precast',
      [c0, c1, Math.min(y[0], louvre[0]), Math.max(y[1], louvre[1])],
      LEFT.v,
      COLUMN_DEEP,
    )
    const rows = y[1] - y[0] > 1.5 ? 2 : 1
    for (let k = 0; k < rows; k++) {
      const r: Range = [y[0] + ((y[1] - y[0]) * k) / rows, y[0] + ((y[1] - y[0]) * (k + 1)) / rows]
      lightsV(at, c0, c1, r, COLUMN / 2)
    }
    paneV(at, c0, c1, louvre[0], louvre[1], 0)
    slats(louvre, (y0, y1) => bar(add, A(c0, at - 0.02), A(c1, at - 0.02), y0, y1, D(0, -1)))
  }
  // the screen goes through the parapet, the sky shows between its slats
  revealV('precast', [c0, c1, SCREEN[0], SCREEN[1]], LEFT.v, THICK)
  slats(SCREEN, (y0, y1) => bar(add, A(c0, LEFT.v + 0.1), A(c1, LEFT.v + 0.1), y0, y1, D(0, -1)))
  // the parapet's back, the return's, and the cap
  holed(
    (a0, a1, y0, y1) => fv('precast', LEFT.v + THICK, a0, a1, y0, y1, 1),
    l0,
    l1 + THICK,
    ROOF,
    BAYS,
    [[c0, c1, SCREEN[0], SCREEN[1]]],
  )
  fa('precast', NORTH + THICK, FACE, LEFT.v + THICK, ROOF, BAYS, 1)
  fv('metal', LEFT.v - 0.01, l0, l1 + 0.01, BAYS - CAP, BAYS, -1)
  fa('metal', NORTH - 0.01, FACE - 0.01, LEFT.v, BAYS - CAP, BAYS, -1)
  lid('metal', [l0, NORTH + THICK], [LEFT.v - 0.01, LEFT.v + THICK], BAYS)
  lid('metal', [NORTH - 0.01, NORTH + THICK], [FACE - 0.01, LEFT.v - 0.01], BAYS)
  // the canopy over the doors, out to the front
  box('precast', [l0, l1], [FACE + 0.1, LEFT.v], CANOPY, 'avtb')

  // the north bay on hurt plaza, between the pylon and the drum: the same column, a glass
  // door behind the planter (not the game's), a smaller canopy
  const [r0, r1] = RIGHT.v
  const rightC = (r0 + r1) / 2
  const northFace = (part: Part, a: number) => (v0: number, v1: number, y0: number, y1: number) =>
    fa(part, a, v0, v1, y0, y1, -1)
  const glassDoor: Hole = [rightC - 0.75, rightC + 0.75, 0, 2.4]
  holed(northFace('cream', RIGHT.a), r0, r1, 0, CREAM, [glassDoor])
  paneA(RIGHT.a - 0.01, glassDoor[0], glassDoor[0] + 0.75, 0, glassDoor[3])
  paneA(RIGHT.a - 0.01, glassDoor[0] + 0.75, glassDoor[1], 0, glassDoor[3])
  const rightHoles = column(rightC)
  holed(northFace('precast', RIGHT.a), r0, r1, CREAM, BAYS, rightHoles)
  const [d0, d1] = [rightC - COLUMN / 2, rightC + COLUMN / 2]
  for (const { y, louvre } of LIGHTS) {
    const at = RIGHT.a + COLUMN_DEEP
    const hole: Hole = [d0, d1, Math.min(y[0], louvre[0]), Math.max(y[1], louvre[1])]
    revealA('precast', hole, RIGHT.a, COLUMN_DEEP, -1)
    const rows = y[1] - y[0] > 1.5 ? 2 : 1
    for (let k = 0; k < rows; k++)
      for (const [v0, v1] of [
        [d0, rightC],
        [rightC, d1],
      ] as const)
        paneA(
          at,
          v0,
          v1,
          y[0] + ((y[1] - y[0]) * k) / rows,
          y[0] + ((y[1] - y[0]) * (k + 1)) / rows,
        )
    paneA(at, d0, d1, louvre[0], louvre[1], -1, 0)
    slats(louvre, (y0, y1) => bar(add, A(at - 0.02, d0), A(at - 0.02, d1), y0, y1, D(-1, 0)))
  }
  revealA('precast', [d0, d1, SCREEN[0], SCREEN[1]], RIGHT.a, THICK, -1)
  slats(SCREEN, (y0, y1) => bar(add, A(RIGHT.a + 0.1, d0), A(RIGHT.a + 0.1, d1), y0, y1, D(-1, 0)))
  holed((v0, v1, y0, y1) => fa('precast', RIGHT.a + THICK, v0, v1, y0, y1, 1), r0, r1, ROOF, BAYS, [
    [d0, d1, SCREEN[0], SCREEN[1]],
  ])
  fa('metal', RIGHT.a - 0.01, r0, r1, BAYS - CAP, BAYS, -1)
  lid('metal', [RIGHT.a - 0.01, RIGHT.a + THICK], [r0, r1], BAYS)
  // the bit between the pylon's back corner and the bay
  const back = PYLON[3]!
  fv('cream', back[1], back[0], RIGHT.a, 0, CREAM, 1)
  fv('precast', back[1], back[0], RIGHT.a, CREAM, BAYS, 1)
  box('precast', [RIGHT.a - 0.8, RIGHT.a], [r0, r1 - 0.45], CANOPY, 'avVtb')

  // the pylon: a blank slab facing the crossing, cream at the bottom, its back over the roof
  const mid: Range = [
    PYLON.reduce((sum, p) => sum + p[0], 0) / 4,
    PYLON.reduce((sum, p) => sum + p[1], 0) / 4,
  ]
  PYLON.forEach((p, i) => {
    const q = PYLON[(i + 1) % 4]!
    const isBack = i === 2
    if (!isBack) side('cream', p, q, 0, PYLON_BASE, mid)
    side('precast', p, q, isBack ? ROOF : PYLON_BASE, PYLON_TOP - CAP, mid)
    side('metal', p, q, PYLON_TOP - CAP, PYLON_TOP, mid)
  })
  polygon('metal', level(PYLON, PYLON_TOP), [0, 0, 1])
  // the bit from its back corner to the bay with the doors
  const jog: Range = [l0, LEFT.v]
  side('cream', PYLON[2]!, jog, 0, CREAM, mid)
  side('precast', PYLON[2]!, jog, CREAM, BAYS, mid)
  // the name on its front (2018): a grey plate with a blue top edge, the logo's blue square
  // (it's gsu's trademark) and a red bar. "29" on the side toward the front
  const outward = (p: Range, q: Range) => {
    const l = Math.hypot(q[0] - p[0], q[1] - p[1])
    const n: Range = [(q[1] - p[1]) / l, -(q[0] - p[0]) / l]
    const away = n[0] * ((p[0] + q[0]) / 2 - mid[0]) + n[1] * ((p[1] + q[1]) / 2 - mid[1])
    return away < 0 ? D(-n[0], -n[1]) : D(...n)
  }
  const onFace = (p: Range, q: Range, along: number, d: number) => {
    const n = outward(p, q)
    const c = A((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    // the sign's own x (three turns it by rot about y)
    const x = { x: n.z, z: -n.x }
    return { x: c.x + x.x * along + n.x * d, z: c.z + x.z * along + n.z * d }
  }
  const facing = (p: Range, q: Range) => {
    const n = outward(p, q)
    return Math.atan2(n.x, n.z)
  }
  const [f0, f1] = [PYLON[0]!, PYLON[1]!]
  const scale = 0.62
  const name = { y: 2.55, rot: facing(f0, f1) }
  signs.push({
    ...onFace(f0, f1, 0, 0.03),
    ...name,
    text: 'SCIENCE ANNEX',
    scale,
    plate: '#c3c6c8',
    color: '#39414e',
  })
  signs.push({
    ...onFace(f0, f1, -1.2 * scale, 0.045),
    ...name,
    text: '',
    plate: '#c8202f',
    width: 0.035,
    height: 0.36,
  })
  signs.push({
    ...onFace(f0, f1, 0, 0.04),
    ...name,
    y: name.y + 0.375 * scale,
    text: '',
    plate: '#25539f',
    width: 3.79 * scale,
    height: 0.04,
  })
  const [s0, s1] = [PYLON[1]!, PYLON[2]!]
  signs.push({
    ...onFace(s0, s1, 0, 0.02),
    y: 1.7,
    rot: facing(s0, s1),
    text: '29',
    letters: true,
    size: 0.28,
    color: '#4b4f55',
    weight: 500,
  })

  // the stair drum, on the outline's points
  const drumPoints = outline
    .map(avOf)
    .filter(([a, v]) => Math.abs(Math.hypot(a - DRUM.a, v - DRUM.v) - DRUM.r) < 0.03)
  for (let i = 1; i < drumPoints.length; i++) {
    const p = drumPoints[i - 1]!
    const q = drumPoints[i]!
    side('precast', p, q, 0, DRUM_TOP - CAP, [DRUM.a, DRUM.v])
    side('metal', p, q, DRUM_TOP - CAP, DRUM_TOP, [DRUM.a, DRUM.v])
  }
  const ring = Array.from({ length: 24 }, (_, i): Range => {
    const t = (i / 24) * Math.PI * 2
    return [DRUM.a + Math.cos(t) * DRUM.r, DRUM.v + Math.sin(t) * DRUM.r]
  })
  polygon('metal', level(ring, DRUM_TOP), [0, 0, 1])

  // the planter in front of it all, dark with shrubs inside
  const [pa, pv] = PLANTER.from
  const [qa, qv] = PLANTER.to
  const pl = Math.hypot(qa - pa, qv - pv)
  const pn: Range = [(-(qv - pv) / pl) * PLANTER.thick, ((qa - pa) / pl) * PLANTER.thick]
  const inner = (p: Range): Range => [p[0] - pn[0], p[1] - pn[1]]
  // its outside faces hurt plaza (away from the drum), the inside the building
  side('precast', PLANTER.from, PLANTER.to, 0, PLANTER.top, [DRUM.a, DRUM.v])
  side('precast', inner(PLANTER.from), inner(PLANTER.to), 0.6, PLANTER.top, [pa - 5, pv])
  polygon(
    'precast',
    level([PLANTER.from, PLANTER.to, inner(PLANTER.to), inner(PLANTER.from)], PLANTER.top),
    [0, 0, 1],
  )
  polygon(
    'metal',
    level(
      [
        inner(PLANTER.from),
        inner(PLANTER.to),
        [WING.a + PIER, WING.v[0]],
        ...drumPoints.map((p): Range => [p[0] - 0.01, p[1]]),
        [RIGHT.a, RIGHT.v[0]],
        PYLON[3]!,
      ],
      0.6,
    ),
    [0, 0, 1],
  )

  // the brick wing. the colonnade: the back wall and the beam's underside, cream piers,
  // black fences between them
  const [w0, w1] = WING.v
  fa('precast', WING.back, w0, w1, 0, COLONNADE, -1)
  lid('precast', [WING.a, WING.back], [w0, w1], COLONNADE, false)
  // the shadow lookup is pushed out along the surface (normalBias), right under the beam it
  // looked past it. a ceiling higher up inside the wing, for the shadows only
  lid('precast', [WING.a + 0.2, WING.back], [w0 + 0.2, w1 - 0.1], COLONNADE + 0.8, false)
  for (const [v0, v1] of PIERS)
    box('cream', [WING.a, WING.a + PIER], [v0, v1], [0, COLONNADE], 'aAvV')
  const fence = (p: Point, q: Point, len: number, o: Point) => {
    const n = Math.round(len / FENCE.bar)
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const c = { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t }
      const along = { x: ((q.x - p.x) / len) * 0.02, z: ((q.z - p.z) / len) * 0.02 }
      for (const s of [-1, 1]) {
        const into = { x: o.x * s, z: o.z * s }
        add(
          'metal',
          wallQuad(
            { x: c.x - along.x, z: c.z - along.z },
            { x: c.x + along.x, z: c.z + along.z },
            0,
            FENCE.top,
            into,
          ),
        )
      }
    }
    for (const y of [0.12, FENCE.top - 0.08])
      for (const s of [-1, 1])
        add('metal', wallQuad(p, q, y - 0.04, y + 0.04, { x: o.x * s, z: o.z * s }))
  }
  for (let i = 1; i < PIERS.length; i++) {
    const [v0, v1] = [PIERS[i - 1]![1], PIERS[i]![0]]
    fence(A(FENCE.a, v0), A(FENCE.a, v1), v1 - v0, D(-1, 0))
  }
  const endV = (PIERS[0]![0] + PIERS[0]![1]) / 2
  fence(A(WING.a + PIER, endV), A(WING.back, endV), WING.back - WING.a - PIER, D(0, -1))
  // its far end, in front of the garage's wall
  fv('precast', w1 - 0.12, WING.a + PIER, WING.back, 0, COLONNADE, -1)
  // the stub of wall between the colonnade's back and the drum
  const drumA = drumPoints[0]![0]
  fv('precast', w0, WING.back, drumA, 0, COLONNADE, -1)
  // the garage's wall: from the colonnade's back (the outline's first point) to its last
  const [ga0, gv0] = avOf(outline[0]!)
  const [ga1, gv1] = avOf(outline.at(-1)!)
  const garageAt = (a: number) => gv0 + ((gv1 - gv0) * (a - ga0)) / (ga1 - ga0)
  // over the colonnade: the precast beam, the brick with the glass in it, the precast coping.
  // on hurt plaza, the side to the bays and the bit past the garage's corner
  const bands = (face: (p: Part, y0: number, y1: number, holes?: Hole[]) => void, hole?: Hole) => {
    face('precast', COLONNADE, BEAM)
    face('brick', BEAM, WING_COPING, hole ? [hole] : [])
    face('precast', WING_COPING, WING_TOP - CAP)
    face('metal', WING_TOP - CAP, WING_TOP)
  }
  const [g0, g1] = CURTAIN.y
  const [cv0, cv1] = CURTAIN.v
  const [ca0, ca1] = CURTAIN.a
  bands(
    (p, y0, y1, holes = []) => holed(northFace(p, WING.a), w0, w1, y0, y1, holes),
    [cv0, cv1, g0, g1],
  )
  bands(
    (p, y0, y1, holes = []) => holed(front(p, w0), WING.a, drumA, y0, y1, holes),
    [ca0, ca1, g0, g1],
  )
  bands((p, y0, y1) => fv(p, w1, WING.a, WING.garage, y0, y1, 1))
  // its far ends, the sill and the head round the corner, the glass 0.15m in with a
  // mullion about every 1.2m and a transom
  const gd = 0.15
  fv('brick', cv1, WING.a, WING.a + gd, g0, g1, -1)
  fa('brick', ca1, w0, w0 + gd, g0, g1, -1)
  for (const [y, up] of [
    [g0, true],
    [g1, false],
  ] as const) {
    lid('brick', [WING.a, WING.a + gd], [cv0, cv1], y, up)
    lid('brick', [WING.a + gd, ca1], [cv0, cv0 + gd], y, up)
  }
  for (const [y0, y1] of [
    [g0, (g0 + g1) / 2],
    [(g0 + g1) / 2, g1],
  ] as const) {
    const n = Math.round((cv1 - cv0 - gd) / 1.2)
    const w = (cv1 - cv0 - gd) / n
    for (let i = 0; i < n; i++) paneA(WING.a + gd, cv0 + gd + i * w, cv0 + gd + (i + 1) * w, y0, y1)
    const eg = glassQuad(A(WING.a + gd, cv0 + gd), A(ca1, cv0 + gd), y0, y1, D(0, -1))
    add('glass', eg)
  }

  // the north end's higher roof, over the wing and back past the bays, and its sides over
  // the main roof
  fa('precast', HEAD.a, HEAD.v, garageAt(HEAD.a), ROOF, WING_TOP, 1)
  fv('precast', HEAD.v, DRUM.a + DRUM.r, HEAD.a, ROOF, WING_TOP, -1)
  polygon(
    'precast',
    level(
      [
        [WING.a, w0],
        [WING.a, w1],
        [WING.garage, garageAt(WING.garage)],
        [HEAD.a, garageAt(HEAD.a)],
        [HEAD.a, HEAD.v],
        [DRUM.a + DRUM.r, HEAD.v],
        [drumA, w0],
      ],
      WING_TOP,
    ),
    [0, 0, 1],
  )

  // inside the ground floor: walls round the outline with the doorway, glass where the
  // front's windows are. against the shops, the natural science center and the garage
  // they're 5cm in, their walls are on the same line facing the other way
  for (const { p, q, len, dir, out: o } of edges(outline)) {
    const into = { x: -o.x, z: -o.z }
    const [pa0, pv0] = avOf(p)
    const [qa0, qv0] = avOf(q)
    const pca = Math.abs(pv0 - LINE) < 0.02 && Math.abs(qv0 - LINE) < 0.02
    const shared =
      Math.min(pv0, qv0) > 127 || (Math.abs(pa0 - SOUTH) < 0.02 && Math.abs(qa0 - SOUTH) < 0.02)
    const t = door ? (door.x - p.x) * dir.x + (door.z - p.z) * dir.z : -1
    const onEdge =
      door && t > 0 && t < len && Math.abs((door.x - p.x) * o.x + (door.z - p.z) * o.z) < 0.1
    const holes: Hole[] = onEdge ? [[t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]] : []
    // along the front, u runs from p, which is at the north end
    const glass = pca ? grounds.map(([a0, a1, y0, y1]): Hole => [a0 - pa0, a1 - pa0, y0, y1]) : []
    const s = shared ? 0.05 : 0
    const at = (u: number) => ({
      x: p.x + dir.x * u + into.x * s,
      z: p.z + dir.z * u + into.z * s,
    })
    for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, [...holes, ...glass]))
      inside.solid.push(wallQuad(at(u0), at(u1), v0, v1, into))
    for (const [u0, u1, v0, v1] of glass) inside.glass.push(wallQuad(at(u0), at(u1), v0, v1, into))
  }

  return {
    parts: merged(),
    inside,
    signs,
    first: ['precast'],
  }
}

type Add = (part: Part, geo: THREE.BufferGeometry) => void

// a pane's random number, z 0 never lights up at night
function seed(geo: THREE.BufferGeometry, z: number) {
  const pane = geo.getAttribute('aPane')
  for (let i = 0; i < pane.count; i++) pane.setZ(i, z)
}

// a flat strip from a to b facing o, all frame in the glass's shader (the louvres' slats)
function bar(add: Add, a: Point, b: Point, y0: number, y1: number, o: Point) {
  const geo = glassQuad(a, b, y0, y1, o)
  seed(geo, 0)
  add('glass', geo)
}

// what you bump into outside: the planter on hurt plaza and the wing's piers and fences
export function annexObstacles(b: AnnexData): Segment[] {
  const { A } = annexFrame(b)
  const line = (p: Range, q: Range): Segment => {
    const a = A(...p)
    const z = A(...q)
    return { ax: a.x, az: a.z, bx: z.x, bz: z.z }
  }
  return [line(PLANTER.from, PLANTER.to), line([WING.a, WING.v[0]], [WING.a, WING.v[1]])]
}
