import type { Segment } from '../game/collision'
import { DOOR_HEIGHT } from '../game/interiors'
import { courtlandFrame } from './courtlandNorth'
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

// the courtland building (120 courtland st), on the courtland st viaduct past courtland
// north. red brick, two storeys over the sidewalk: seven bays with a pair of tall windows each
// upstairs and a wide one downstairs, cast stone sills, lintels, a band and the coping, two
// stone tablets in the brick over the band, the entrance in a recess in the middle bay under
// the name. behind it a lower brick part with gsu's loading dock on the back drive, 8.7m under
// the street. from usgs's lidar (2018), warren lemay's photo (2019, the newest of the front)
// and gsu's photo of the dock (2024). sources: docs/reference/courtland-building.md
//
// "u" is meters along decatur st, "v" meters along courtland st, both from hurt park (like
// courtland north and the arena). the game's ground is the sidewalk at the doors (322.0m). the
// low part's real roof is 3.3m under that, hidden from courtland st: it's a low box here that
// stays under the viaduct's parapet, so from the drive it's much lower than real

export type CourtlandBuildingData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { along: number[] }
}

// few parts, each is a draw call in every pass. stone is the cast stone trim, base the grey
// concrete along the bottom (and the roofs, the dock), metal the copings, the frames
// downstairs and the panel over the doors. glass is upstairs (white blinds behind it), dark
// the windows downstairs and the louvre
export type Part = 'brick' | 'stone' | 'base' | 'glass' | 'dark' | 'metal'

type Range = readonly [number, number]

// the street front: the brick, the windows 10cm in (that's the outline, nothing goes behind
// it under the inside's ceiling), the stone 5cm out from the brick
export const BRICK = 67.3
export const GLASS = 67.4
const TRIM = 67.25
const BASE_FACE = 67.27
export const NORTH = 307.85
export const SOUTH = 339
// the back of the two storey part, and of the low part on the drive
export const TALL_BACK = 83.85
export const BACK = 98.6
// the entrance, 1m deep, as wide as the game's doorway
export const ENTRANCE = { v: [322.25, 324.65] as Range, back: 68.3, soffit: 3.4 }
// heights over the sidewalk (lidar, the 2019 photo): the base, the windows downstairs and
// their lintels, the sills and windows upstairs, the band, the coping. the parapets on the
// north and south walls and the back have metal copings, a bit lower
const BASE = 0.45
const DOWN: Range = [0.45, 3.4]
const LINTEL: Range = [3.4, 3.6]
const SILL: Range = [4.75, 4.95]
const UP: Range = [4.95, 7.25]
const MEETING = 6.1
const BAND: Range = [7.25, 7.5]
const COPING: Range = [8.7, 8.95]
const SIDES = 8.6
const BACK_TOP = 8.4
const ROOF = 7.6
const CAP = 0.15
const PARAPET = 0.35
// seven bays 4.19m apart between corner piers
const BAYS = Array.from({ length: 7 }, (_, i) => 310.87 + i * 4.19)
const WIDE = 1.475
const FRAME = 0.07
const MULLION = 0.035
const PAIR = { off: 0.875, w: 1.05 }
// the stone tablets in the brick between the band and the coping, over two piers
const TABLETS = [317.17, 329.74]
const TABLET = { w: 1.25, side: 0.15, bar: [8.04, 8.16] as Range }
// the back: two stair towers on the low roof and the penthouse with a louvre (gsu 2024, lidar)
const PROJECTIONS: Range[] = [
  [312.3, 317.9],
  [329.4, 335.2],
]
const PROJECTION = { u: 88.75, top: 8.35 }
export const PENTHOUSE = { u: [77, TALL_BACK] as Range, v: [325, 330.5] as Range, top: 11 }
const LOUVRE: Hole = [326.65, 328.85, 8.7, 10.5]
// the low part: its roof and the parapets on its north and south walls and on the back, just
// under the top of the viaduct's parapet (1.1m) so it's hidden from courtland st like the
// real one. the dock's concrete face along the back, the brick shaft next to it
export const LOW = { roof: 0.6, sides: 1, back: 0.9 }
const DOCK: Range = [325.8, 334.9]
export const SHAFT = { u: [BACK, 104] as Range, v: [317.5, 322.2] as Range }
// it isn't in the outline (the inside's ceiling is 3.3m up, it would stand over it), so its
// walls are here: [u, v] from the two storey part's back round the north, the shaft, the south
export const WING: [number, number][] = [
  [TALL_BACK, NORTH],
  [BACK, NORTH],
  [BACK, SHAFT.v[0]],
  [SHAFT.u[1], SHAFT.v[0]],
  [SHAFT.u[1], SHAFT.v[1]],
  [BACK, SHAFT.v[1]],
  [BACK, SOUTH],
  [TALL_BACK, SOUTH],
]

export function courtlandBuildingGeometry(b: CourtlandBuildingData) {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { A, D } = courtlandFrame(b)
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  // a wall face at u from v0 to v1, facing -u (s -1, the street) or +u
  const fu = (part: Part, u: number, v0: number, v1: number, y0: number, y1: number, s: number) => {
    if (v1 - v0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(A(u, v0), A(u, v1), y0, y1, D(s, 0), v0))
  }
  // a wall face at v from u0 to u1, facing -v (s -1, toward decatur st) or +v
  const fv = (part: Part, v: number, u0: number, u1: number, y0: number, y1: number, s: number) => {
    if (u1 - u0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(A(u0, v), A(u1, v), y0, y1, D(0, s), u0))
  }
  const lid = (part: Part, u: Range, v: Range, y: number, up = true) =>
    add(part, flat([A(u[0], v[0]), A(u[1], v[0]), A(u[1], v[1]), A(u[0], v[1])], y, up))
  // a box, only the faces asked for: u/U the -u/+u sides, v/V the -v/+v ones, t top, b bottom
  const box = (part: Part, u: Range, v: Range, y: Range, faces = 'uUvVtb') => {
    if (faces.includes('u')) fu(part, u[0], v[0], v[1], y[0], y[1], -1)
    if (faces.includes('U')) fu(part, u[1], v[0], v[1], y[0], y[1], 1)
    if (faces.includes('v')) fv(part, v[0], u[0], u[1], y[0], y[1], -1)
    if (faces.includes('V')) fv(part, v[1], u[0], u[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, u, v, y[1])
    if (faces.includes('b')) lid(part, u, v, y[0], false)
  }
  // a face at u (facing s) from v0 to v1 with holes [v0, v1, y0, y1] cut out
  const holed = (
    part: Part,
    u: number,
    s: number,
    v0: number,
    v1: number,
    y0: number,
    y1: number,
    holes: Hole[],
  ) => {
    const cut = holes.map(([h0, h1, a, z]): Hole => [h0 - v0, h1 - v0, a, z])
    for (const [p0, p1, a, z] of solidPieces(v1 - v0, y0, y1, cut))
      fu(part, u, v0 + p0, v0 + p1, a, z, s)
  }
  const pane = (u: number, s: number, [v0, v1, y0, y1]: Hole, part: Part = 'dark') =>
    add(part, glassQuad(A(u, v0), A(u, v1), y0, y1, D(s, 0)))

  // the street front. the brick from the base to the coping, with the windows and the
  // entrance cut out
  const down = BAYS.filter((_, i) => i !== 3).map((c): Hole => [c - WIDE, c + WIDE, ...DOWN])
  const up = BAYS.flatMap((c) =>
    [-1, 1].map((s): Hole => {
      const m = c + s * PAIR.off
      return [m - PAIR.w / 2, m + PAIR.w / 2, ...UP]
    }),
  )
  const entrance: Hole = [...ENTRANCE.v, 0, ENTRANCE.soffit]
  holed('brick', BRICK, -1, NORTH, SOUTH, BASE, COPING[0], [...down, ...up, entrance])
  // the windows' reveals: brick sides, a stone sill and head (the base's top downstairs)
  for (const h of [...down, ...up]) {
    const [v0, v1, y0, y1] = h
    fv('brick', v0, BRICK, GLASS, y0, y1, 1)
    fv('brick', v1, BRICK, GLASS, y0, y1, -1)
    lid(y0 < 1 ? 'base' : 'stone', [BRICK, GLASS], [v0, v1], y0)
    lid('stone', [BRICK, GLASS], [v0, v1], y1, false)
  }
  // downstairs the glass is in light aluminium frames, three lights
  for (const h of down) {
    pane(GLASS, -1, h)
    const [v0, v1, y0, y1] = h
    const f = GLASS - 0.01
    const strip = (a: number, z: number, b: number, t: number) => fu('metal', f, a, z, b, t, -1)
    strip(v0, v0 + FRAME, y0, y1)
    strip(v1 - FRAME, v1, y0, y1)
    strip(v0 + FRAME, v1 - FRAME, y0, y0 + FRAME)
    strip(v0 + FRAME, v1 - FRAME, y1 - FRAME, y1)
    for (const k of [1, 2]) {
      const m = v0 + ((v1 - v0) * k) / 3
      strip(m - MULLION, m + MULLION, y0 + FRAME, y1 - FRAME)
    }
  }
  // upstairs they're one over one: two sashes
  for (const [v0, v1, y0, y1] of up) {
    pane(GLASS, -1, [v0, v1, y0, MEETING], 'glass')
    pane(GLASS, -1, [v0, v1, MEETING, y1], 'glass')
  }
  // the stone: lintels downstairs, sills upstairs, the band, the coping (higher at the north
  // corner), the tablets
  for (const [v0, v1] of [...down, entrance])
    box('stone', [TRIM, BRICK], [v0 - 0.1, v1 + 0.1], LINTEL, 'uvVtb')
  for (const [v0, v1] of up) box('stone', [TRIM, BRICK], [v0 - 0.05, v1 + 0.05], SILL, 'uvVtb')
  box('stone', [TRIM, BRICK], [NORTH, SOUTH], BAND, 'uvVtb')
  box('stone', [TRIM, BRICK + PARAPET], [NORTH - 0.05, SOUTH + 0.05], COPING, 'uUvVt')
  lid('stone', [TRIM, BRICK], [NORTH - 0.05, SOUTH + 0.05], COPING[0], false)
  box('stone', [TRIM, BRICK + PARAPET], [NORTH - 0.05, NORTH + 0.9], [COPING[1], COPING[1] + 0.15])
  for (const c of TABLETS) {
    const [v0, v1] = [c - TABLET.w / 2, c + TABLET.w / 2]
    box('stone', [TRIM, BRICK], [v0, v0 + TABLET.side], [BAND[1], COPING[0]], 'uvV')
    box('stone', [TRIM, BRICK], [v1 - TABLET.side, v1], [BAND[1], COPING[0]], 'uvV')
    box('stone', [TRIM, BRICK], [v0 + TABLET.side, v1 - TABLET.side], TABLET.bar, 'utb')
  }
  // the base, grey concrete, cut for the entrance
  for (const [v0, v1] of [
    [NORTH, ENTRANCE.v[0]],
    [ENTRANCE.v[1], SOUTH],
  ] as const)
    box('base', [BASE_FACE, BRICK], [v0, v1], [0, BASE], 'uvVt')

  // the entrance: brick sides, a stone soffit, the grey doors at the back (the game's doorway
  // is all of it) with a panel over them
  const [ev0, ev1] = ENTRANCE.v
  fv('brick', ev0, BRICK, ENTRANCE.back, 0, ENTRANCE.soffit, 1)
  fv('brick', ev1, BRICK, ENTRANCE.back, 0, ENTRANCE.soffit, -1)
  lid('stone', [BRICK, ENTRANCE.back], [ev0, ev1], ENTRANCE.soffit, false)
  fu('metal', ENTRANCE.back, ev0, ev1, DOOR_HEIGHT, ENTRANCE.soffit, -1)
  // the shadow lookup is pushed out along the surface (normalBias), right under a soffit it
  // looked past it. a ceiling higher up, for the shadows only
  lid(
    'stone',
    [BRICK + 0.05, ENTRANCE.back + 0.5],
    [ev0 - 0.3, ev1 + 0.3],
    ENTRANCE.soffit + 0.8,
    false,
  )

  // the north and south walls: plain brick to a metal coping, the stone coping's end over them
  // at the street
  for (const [v, s] of [
    [NORTH, -1],
    [SOUTH, 1],
  ] as const) {
    fv('brick', v, BRICK, BRICK + PARAPET, 0, COPING[0], s)
    fv('brick', v, BRICK + PARAPET, TALL_BACK, 0, SIDES - CAP, s)
    const w = s < 0 ? ([v - 0.03, v + 0.3] as const) : ([v - 0.3, v + 0.03] as const)
    box('metal', [BRICK + PARAPET, TALL_BACK + 0.03], w, [SIDES - CAP, SIDES], 'UvVt')
  }
  // the back of the two storey part over the low roof, to its metal coping. the north and
  // south parapets are higher, their ends show over it
  fu('brick', TALL_BACK, NORTH, SOUTH, LOW.roof, BACK_TOP - CAP, 1)
  box(
    'metal',
    [TALL_BACK - 0.3, TALL_BACK + 0.03],
    [NORTH + 0.3, SOUTH - 0.3],
    [BACK_TOP - CAP, BACK_TOP],
    'uUt',
  )
  // the parapets' insides and the roof
  fu('brick', BRICK + PARAPET, NORTH + 0.3, SOUTH - 0.3, ROOF, COPING[0], 1)
  fv('brick', NORTH + 0.3, BRICK + PARAPET, TALL_BACK - 0.3, ROOF, SIDES - CAP, 1)
  fv('brick', SOUTH - 0.3, BRICK + PARAPET, TALL_BACK - 0.3, ROOF, SIDES - CAP, -1)
  fu('brick', TALL_BACK - 0.3, NORTH + 0.3, SOUTH - 0.3, ROOF, BACK_TOP - CAP, -1)
  lid('base', [BRICK + PARAPET, TALL_BACK - 0.3], [NORTH + 0.3, SOUTH - 0.3], ROOF)

  // the penthouse with its louvre to the back, and the stair towers on the low roof
  const [pu0, pu1] = PENTHOUSE.u
  const [pv0, pv1] = PENTHOUSE.v
  box('brick', [pu0, pu1], [pv0, pv1], [ROOF, PENTHOUSE.top - CAP], 'uvV')
  holed('brick', pu1, 1, pv0, pv1, BACK_TOP - CAP, PENTHOUSE.top - CAP, [LOUVRE])
  pane(pu1 + 0.01, 1, LOUVRE)
  box(
    'metal',
    [pu0 - 0.03, pu1 + 0.03],
    [pv0 - 0.03, pv1 + 0.03],
    [PENTHOUSE.top - CAP, PENTHOUSE.top],
  )
  for (const v of PROJECTIONS) {
    box('brick', [TALL_BACK, PROJECTION.u], v, [LOW.roof, PROJECTION.top - CAP], 'UvV')
    box(
      'metal',
      [TALL_BACK, PROJECTION.u + 0.03],
      [v[0] - 0.03, v[1] + 0.03],
      [PROJECTION.top - CAP, PROJECTION.top],
      'UvVt',
    )
  }

  // the low part: brick round it to metal copings (lower on the back), the roof
  for (const [v, s] of [
    [NORTH, -1],
    [SOUTH, 1],
  ] as const) {
    fv('brick', v, TALL_BACK, BACK, 0, LOW.sides - CAP, s)
    const w = s < 0 ? ([v - 0.03, v + 0.3] as const) : ([v - 0.3, v + 0.03] as const)
    box('metal', [TALL_BACK, BACK + 0.03], w, [LOW.sides - CAP, LOW.sides], 'UvVt')
  }
  // the ends of the north and south parapets over the lower one on the back, both parts
  for (const [v0, v1] of [
    [NORTH, NORTH + 0.3],
    [SOUTH - 0.3, SOUTH],
  ] as const) {
    fu('brick', TALL_BACK, v0, v1, BACK_TOP - CAP, SIDES - CAP, 1)
    fu('brick', BACK, v0, v1, LOW.back - CAP, LOW.sides - CAP, 1)
  }
  fu('brick', BACK, NORTH, SOUTH, 0, LOW.back - CAP, 1)
  box(
    'metal',
    [BACK - 0.3, BACK + 0.03],
    [NORTH + 0.3, SOUTH - 0.3],
    [LOW.back - CAP, LOW.back],
    'uUt',
  )
  fv('brick', NORTH + 0.3, TALL_BACK, BACK - 0.3, LOW.roof, LOW.sides - CAP, 1)
  fv('brick', SOUTH - 0.3, TALL_BACK, BACK - 0.3, LOW.roof, LOW.sides - CAP, -1)
  fu('brick', BACK - 0.3, NORTH + 0.3, SOUTH - 0.3, LOW.roof, LOW.back - CAP, -1)
  lid('base', [TALL_BACK, BACK - 0.3], [NORTH + 0.3, SOUTH - 0.3], LOW.roof)
  // the dock's face: a low concrete wall along the back where the doors are
  box('base', [BACK, BACK + 0.08], DOCK, [0, LOW.back - CAP], 'UvVt')
  // the brick shaft, as low as the rest
  const [su0, su1] = SHAFT.u
  const [sv0, sv1] = SHAFT.v
  box('brick', [su0, su1], [sv0, sv1], [0, LOW.sides - CAP], 'UvV')
  box('metal', [su0, su1 + 0.03], [sv0 - 0.03, sv1 + 0.03], [LOW.sides - CAP, LOW.sides], 'UvVt')

  // the name over the entrance: a white plate with the logo's blue square (it's gsu's
  // trademark) at the north end, "120" by the doors
  const front = Math.atan2(D(-1, 0).x, D(-1, 0).z)
  signs.push({
    ...A(BRICK - 0.03, 323.6),
    y: 4.1,
    rot: front,
    text: 'COURTLAND BUILDING',
    scale: 0.648,
    height: 0.93,
    color: '#3a3d44',
  })
  signs.push({
    ...A(BRICK - 0.02, 321.6),
    y: 2.2,
    rot: front,
    text: '120',
    letters: true,
    size: 0.14,
    color: '#cfc9bd',
    weight: 500,
  })

  // inside the ground floor: walls round the outline
  insideWalls(inside, outline, door, () => false)

  return {
    parts: merged(),
    inside,
    signs,
    first: ['brick'],
    noShadow: ['glass', 'dark'],
  }
}

// the low part's walls, for walking into (world.ts)
export function wingWalls(b: CourtlandBuildingData) {
  const { A } = courtlandFrame(b)
  return WING.slice(1).map(([u, v], i): Segment => {
    const p = A(...WING[i]!)
    const q = A(u, v)
    return { ax: p.x, az: p.z, bx: q.x, bz: q.z }
  })
}
