import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  edges,
  flat,
  frame,
  glassQuad,
  insideWalls,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// 100 edgewood ave (gsu offices, classrooms coming), across edgewood ave from hurt park. an 18
// storey office tower from the 1960s: a white precast grid with dark glass set deep in it, 21
// bays on the long faces and 12 on the ends, 15 office floors, a taller top floor with grey
// panels over its glass, a tall ground floor of glass set back behind columns every third bay,
// a penthouse on the roof. it stands on a plaza that's level with the sidewalk at the west end,
// edgewood ave falls 2m along it, so the east end is a board formed concrete wall with a stone
// coping and a black rail. from usgs's lidar (2018), gsu's 2022 photo of the top floors, an
// aerial from hurt park and street photos (2016, mapillary 2022). sources:
// docs/reference/100-edgewood.md
//
// laid out along the edgewood ave face (a, from its west corner) and in from it (d, north).
// the ground is the plaza (309.65m)

export type Edgewood100Data = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { corners?: number[][] }
}

// precast is the grid, the columns, the soffit, the copings and the penthouse, glass the
// windows, lobby the ground floor's glass, concrete the grey panels on the top floor, the
// roof and the plaza's walls, paving the plaza, metal the plaza's rail (only up close)
export type Part = 'precast' | 'glass' | 'lobby' | 'concrete' | 'paving' | 'metal'

type Range = readonly [number, number]

// bays on edgewood ave (and the back) and on the ends, the piers between them
export const BAYS = [21, 12]
export const PIER = 0.4
// the glass this far in from the grid's face, the ground floor's this far (the outline)
export const DEPTH = 0.35
export const RECESS = 2.4
// heights over the plaza (lidar: the parapet 377.55m, the roof 376.3, the penthouse 381.8).
// the ground floor's columns up to the soffit, a solid band, then 15 rows of windows a floor
// each with a band over them, the top floor's glass with a grey panel over it
export const SOFFIT = 6
export const SILL = 7.85
export const FLOOR = 3.6
export const BAND = 0.55
export const FLOORS = 15
export const TOP_GLASS: Range = [SILL + FLOORS * FLOOR, 65.8]
const TOP_PANEL = 67.4
export const PARAPET = 67.9
export const ROOF = 66.65
// the penthouse, in from the south west corner (lidar)
export const PENTHOUSE = { a: [8.4, 49.2] as Range, d: [7.7, 25.8] as Range, top: 72.15 }
// the columns under the grid, every third pier
const COLUMN = 1.1
const EVERY = 3
// the plaza round it: out to here, the steps in the middle of the front
export const PLAZA = { a: [-8, 1.5] as Range, d: [-2.5, 3] as Range }
export const STEPS: Range = [20, 41]
const STEP_EDGE = -1
const COPING = 0.12
// walls that end at the plaza stop a hair over it: anything standing at 0 is pulled down past
// the lowest ground round the building (landmarks.ts sunk)
const LIP = 0.002

export const rows = (): Range[] => [
  ...Array.from({ length: FLOORS }, (_, k): Range => {
    const y = SILL + k * FLOOR
    return [y, y + FLOOR - BAND]
  }),
  [TOP_GLASS[0], TOP_PANEL],
]

// the window columns along a face: equal glass between equal piers, corner to corner
export function columns(len: number, n: number): Range[] {
  const g = (len - (n + 1) * PIER) / n
  return Array.from({ length: n }, (_, i) => {
    const s = PIER + i * (g + PIER)
    return [s, s + g]
  })
}

export function edgewood100Geometry(b: Edgewood100Data) {
  const { add, prism, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const corners = (b.landmark?.corners ?? []).map(pt)
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const f = frame(corners[0]!, corners[1]!)
  const W = f.len
  const D = Math.hypot(corners[3]!.x - corners[0]!.x, corners[3]!.z - corners[0]!.z)
  const south = { x: -f.out.x, z: -f.out.z }
  const rect = (a: Range, d: Range): Point[] => [
    f.at(a[0], d[0]),
    f.at(a[1], d[0]),
    f.at(a[1], d[1]),
    f.at(a[0], d[1]),
  ]

  // the four faces, each the same: the grid's face with the windows cut out, the sides of the
  // piers and the tops and bottoms of the bands back to the glass (whole rows at a time: the
  // bits inside the piers and bands don't show), the glass, the soffit and the columns under it
  const faces = edges(corners)
  faces.forEach(({ p, len, dir, out }, i) => {
    const at = (s: number, k = 0) => ({
      x: p.x + dir.x * s - out.x * k,
      z: p.z + dir.z * s - out.z * k,
    })
    const n = BAYS[i % 2]!
    const cols = columns(len, n)
    const holes = cols.flatMap(([s0, s1]) => rows().map(([y0, y1]): Hole => [s0, s1, y0, y1]))
    for (const [u0, u1, v0, v1] of solidPieces(len, SOFFIT, PARAPET, holes))
      add('precast', wallQuad(at(u0), at(u1), v0, v1, out, u0))
    const back = { x: -dir.x, z: -dir.z }
    for (const [s0, s1] of cols) {
      add('precast', wallQuad(at(s0), at(s0, DEPTH), SILL, TOP_PANEL, dir))
      add('precast', wallQuad(at(s1), at(s1, DEPTH), SILL, TOP_PANEL, back))
    }
    const strip = (y: number, up: boolean) =>
      add(
        'precast',
        flat([at(PIER), at(len - PIER), at(len - PIER, DEPTH), at(PIER, DEPTH)], y, up),
      )
    for (const [y0, y1] of rows()) {
      strip(y0, true)
      strip(y1, false)
    }
    for (const [s0, s1] of cols) {
      for (const [y0, y1] of rows().slice(0, FLOORS))
        add('glass', glassQuad(at(s0, DEPTH), at(s1, DEPTH), y0, y1, out))
      add('glass', glassQuad(at(s0, DEPTH), at(s1, DEPTH), TOP_GLASS[0], TOP_GLASS[1], out))
    }
    // one grey panel along the top floor, the piers cover its joints
    add('concrete', wallQuad(at(PIER, DEPTH), at(len - PIER, DEPTH), TOP_GLASS[1], TOP_PANEL, out))

    // the soffit back to the ground floor's glass, and on in over the core under it so a low
    // sun can't get in between the two
    const r = RECESS + 0.4
    add('precast', flat([at(0), at(len), at(len - r, r), at(r, r)], SOFFIT, false))
    // the columns on every third pier (the next face does this one's last corner)
    for (let k = 0; k < n; k += EVERY) {
      const c = k * (cols[0]![1] - cols[0]![0] + PIER) + PIER / 2
      const s0 = k === 0 ? 0 : c - COLUMN / 2
      prism(
        'precast',
        [at(s0), at(s0 + COLUMN), at(s0 + COLUMN, COLUMN), at(s0, COLUMN)],
        0,
        SOFFIT,
        false,
      )
    }
  })

  // the ground floor's glass on the outline, a light between each pair of columns
  for (const { p, len, dir, out } of edges(outline)) {
    const spans = Math.max(1, Math.round(len / 8.2))
    for (let k = 0; k < spans; k++) {
      const a = { x: p.x + (dir.x * len * k) / spans, z: p.z + (dir.z * len * k) / spans }
      const c = {
        x: p.x + (dir.x * len * (k + 1)) / spans,
        z: p.z + (dir.z * len * (k + 1)) / spans,
      }
      add('lobby', glassQuad(a, c, 0, SOFFIT, out))
    }
  }
  insideWalls(inside, outline, door, () => true)

  // the parapet's top and inside, the roof, the penthouse
  const IN = 0.35
  const top = rect([IN, W - IN], [IN, D - IN])
  edges(top).forEach(({ p, q, out }, i) => {
    const face = faces[i]!
    add('precast', wallQuad(p, q, ROOF, PARAPET, { x: -out.x, z: -out.z }))
    add('precast', flat([face.p, face.q, q, p], PARAPET))
  })
  add('concrete', flat(top, ROOF))
  prism('concrete', rect(PENTHOUSE.a, PENTHOUSE.d), ROOF, PENTHOUSE.top - 0.6, false)
  prism('precast', rect(PENTHOUSE.a, PENTHOUSE.d), PENTHOUSE.top - 0.6, PENTHOUSE.top)

  // hidden blocks for the shadows (landmark.ts core): the tower is empty over the ground
  // floor, and the ground floor's glass doesn't cast either
  core(
    'precast',
    rect([DEPTH + 0.15, W - DEPTH - 0.15], [DEPTH + 0.15, D - DEPTH - 0.15]),
    SOFFIT,
    ROOF - 0.1,
  )
  core(
    'precast',
    rect([RECESS + 0.3, W - RECESS - 0.3], [RECESS + 0.3, D - RECESS - 0.3]),
    CEILING,
    SOFFIT + 0.1,
  )

  // the plaza, round the ground floor's glass out to its walls
  const [a0, a1] = [PLAZA.a[0], W + PLAZA.a[1]]
  const [d0, d1] = [PLAZA.d[0], D + PLAZA.d[1]]
  const plaza = (a: Range, d: Range) => add('paving', flat(rect(a, d), 0))
  plaza([a0, a1], [STEP_EDGE, RECESS])
  plaza([a0, a1], [D - RECESS, d1])
  plaza([a0, RECESS], [RECESS, D - RECESS])
  plaza([W - RECESS, a1], [RECESS, D - RECESS])
  plaza([a0, STEPS[0]], [d0, STEP_EDGE])
  plaza([STEPS[1], a1], [d0, STEP_EDGE])
  // steps down to the sidewalk
  const treads: Range[] = [
    [STEP_EDGE - 0.5, STEP_EDGE],
    [d0, STEP_EDGE - 0.5],
  ]
  treads.forEach((d, k) => {
    const y = -0.22 * (k + 1)
    add('paving', flat(rect(STEPS, d), y))
    add('concrete', wallQuad(f.at(STEPS[0], d[1]), f.at(STEPS[1], d[1]), y, y + LIP + 0.22, south))
  })
  add('concrete', wallQuad(f.at(STEPS[0], d0), f.at(STEPS[1], d0), -0.9, -0.44, south))

  // its walls, board formed concrete under a stone coping. they go down past the lowest ground
  // round it (the lot east of it is 3.7m under the plaza), the coping stands a little proud
  const wallAround = (from: Point, to: Point, o: Point) => {
    add('concrete', wallQuad(from, to, -5, -0.3, o))
    add('precast', wallQuad(from, to, -0.3, COPING, o))
    const back = { x: from.x - o.x * 0.35, z: from.z - o.z * 0.35 }
    const back2 = { x: to.x - o.x * 0.35, z: to.z - o.z * 0.35 }
    add('precast', flat([from, to, back2, back], COPING))
    add('precast', wallQuad(back, back2, LIP, COPING, { x: -o.x, z: -o.z }))
  }
  const east = { x: f.along.x, z: f.along.z }
  const west = { x: -f.along.x, z: -f.along.z }
  wallAround(f.at(a0, d0), f.at(STEPS[0], d0), south)
  wallAround(f.at(STEPS[1], d0), f.at(a1, d0), south)
  wallAround(f.at(a1, d0), f.at(a1, d1), east)
  wallAround(f.at(a1, d1), f.at(a0, d1), f.out)
  wallAround(f.at(a0, d1), f.at(a0, d0), west)
  // the steps' sides
  add('concrete', wallQuad(f.at(STEPS[0], d0), f.at(STEPS[0], STEP_EDGE), -0.9, LIP, east))
  add('concrete', wallQuad(f.at(STEPS[1], d0), f.at(STEPS[1], STEP_EDGE), -0.9, LIP, west))

  // the black rail on the wall where edgewood ave has fallen away from the plaza, and down
  // the east side over the lot
  const rail = (from: Point, to: Point, o: Point) => {
    const len = Math.hypot(to.x - from.x, to.z - from.z)
    const d = { x: (to.x - from.x) / len, z: (to.z - from.z) / len }
    const p = (s: number, k: number) => ({
      x: from.x + d.x * s - o.x * k,
      z: from.z + d.z * s - o.z * k,
    })
    const y = COPING + 1.05
    prism('metal', [p(0, 0.15), p(len, 0.15), p(len, 0.21), p(0, 0.21)], y - 0.05, y)
    for (let s = 0; s <= len; s += 2.4) {
      const s1 = Math.min(s, len - 0.05)
      prism(
        'metal',
        [p(s1, 0.15), p(s1 + 0.05, 0.15), p(s1 + 0.05, 0.21), p(s1, 0.21)],
        COPING,
        y - 0.05,
        false,
      )
    }
  }
  rail(f.at(STEPS[1] + 6, d0), f.at(a1, d0), south)
  rail(f.at(a1, d0), f.at(a1, d1), east)

  // the address on the ground floor's glass by the doors (the 2016 photo)
  const sign = f.at(W / 2 + 0.8, RECESS - 0.03)
  signs.push({
    x: sign.x,
    y: 3.4,
    z: sign.z,
    rot: Math.atan2(south.x, south.z),
    text: '100',
    letters: true,
    size: 0.55,
    color: '#b8955a',
    weight: 500,
  })

  // the boards stand up on the plaza's walls (mapillary 2022), and the penthouse's louvres too:
  // the family lays them along the wall
  const all = merged()
  const uv = all.concrete.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))

  return {
    parts: all,
    inside,
    signs,
    // the cores cast for the floors over the ground floor
    noShadow: ['glass', 'lobby', 'paving', 'metal'],
    near: ['metal'],
  }
}
