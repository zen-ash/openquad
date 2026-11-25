import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
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

// 58 edgewood ave (gsu's collabtech incubator), at equitable pl across edgewood ave from the
// hurt building. a 1920s four storey warehouse: a white marble ground floor with storefronts
// and a band of greek key panels, a blue canopy, three floors of buff brick with big steel
// windows in eight bays, and gsu's blue glass sign box on the corner over the entrance. on
// its east end a taller block against t deck: black granite at the bottom, the ground floor
// tucked in under it, buff brick above with a blue strip window. from usgs's lidar (2018) and
// gsu's photos (2017 by day, 2019 at night, 2026 the entrances). sources:
// docs/reference/58-edgewood.md
//
// it's square to the game's x/z: x along edgewood ave, z out toward it (+z is the street).
// the ground is the sidewalk at the corner door (314.4m), the street falls 2m to t deck

export type Edgewood58Data = {
  points: number[][]
  height: number
  door?: number[]
}

// few parts, each is a draw call in every pass. marble is the ground floor and every stone
// band and coping, granite the east block's black stone, white its painted walls and all
// the roofs, glass the steel windows, store the ground floor's glass, blue the sign box, the
// strip windows and the canopy (shiny painted panels, see the materials)
export type Part = 'brick' | 'marble' | 'granite' | 'white' | 'glass' | 'store' | 'blue'

type Range = readonly [number, number]

// the brick and the marble face, the ground floor's glass (the outline) 0.3m behind it, the
// steel windows 0.25m in
export const FACE = -42.75
export const FRONT = -43.05
const SASH = 0.25
export const WEST = -199.55
export const BACK = -85
// the warehouse's east end, where the east block starts, and t deck's side of it
export const SPLIT = -162.4
export const EAST = -139.4
// heights over the sidewalk at the corner (lidar: roof 328.75m, parapet 329.7, the canopy's
// top 318.7, the strip on the back 332.0)
const STORE: Range = [1.55, 4.2]
const BASEMENT: Range = [0.6, 1.25]
const CANOPY = { y: [4.2, 4.9] as Range, out: 1.5, x: [-197.4, -163.6] as Range }
// the marble ground floor with its frieze up to here, then a stone band, then brick
const MARBLE_TOP = 5.65
const BAND: Range = [5.65, 5.85]
// the window rows upstairs and the stone sill band under the top two
export const ROWS: Range[] = [
  [5.85, 8.05],
  [8.83, 11.28],
  [11.82, 14.25],
]
const SILLS: Range[] = [
  [8.7, 8.83],
  [11.69, 11.82],
]
export const ROOF = 14.35
export const PARAPET = 15.3
const COPING = 0.25
const BACK_STRIP = { x: [WEST, -170] as Range, z: [BACK, -80.5] as Range, top: 17.6 }

// equal bays between piers, from `from` to `to` with the end piers `first` and `last` wide
function bays(from: number, to: number, first: number, last: number, n: number, pier = 0.95) {
  const w = (to - from - first - last - pier * (n - 1)) / n
  return Array.from({ length: n }, (_, i): Range => {
    const a = from + first + i * (w + pier)
    return [a, a + w]
  })
}
// eight bays on edgewood ave, 3.2m windows: the wide corner pier under the sign box, a pier
// twice as wide after the second bay, the end pier 1.45m (gsu's 2019 photo on a fitted
// camera, docs/reference/58-edgewood.md)
const PIERS = [0.95, 1.95, 1, 1, 1, 1, 1]
export const FRONT_BAYS = PIERS.reduce<Range[]>(
  (all, pier) => {
    const at = all.at(-1)![1] + pier
    return [...all, [at, at + 3.2]]
  },
  [[WEST + 2.15, WEST + 5.35]],
)
// equitable pl, from the back to the front: nine bays
export const WEST_BAYS = bays(BACK, FACE, 1, 2.15, 9)
// the corner entrance in the first bay, the fluted pilaster next to it
export const ENTRANCE: Range = [FRONT_BAYS[0]![0], FRONT_BAYS[0]![0] + 2.2]

// gsu's sign box on the corner: blue glass over the corner pier from the band to just over
// the parapet (lidar has its top at 329.75m), 6.5m back along equitable pl (the 2019 photo,
// the lidar's top goes on another 3.5m but that's more likely something on the roof). the
// logo at its top is gsu's trademark: a plain blue square
const SIGN_BOX = {
  x: [-199.75, -197.4] as Range,
  z: [-48.5, -42] as Range,
  y: [5.85, 15.45] as Range,
}

// the east block: the lidar roof 338.2m, parapet 339.0, the stair tower on its front west
// corner 342.7, a cooling unit on the roof 341.5
export const EAST_TOP = 24.6
const EAST_ROOF = 23.8
const TOWER = { x: [SPLIT, -152] as Range, z: [-48.5, FACE] as Range, top: 28.3 }
const UNIT = { x: [-148, -140.5] as Range, z: [-70, -58] as Range, top: 27.1 }
// black polished granite: all of the front but a brick strip on the west end (2019 and 2022
// street photos), the ground floor flush on the west end and 3.15m in under it for the rest
// (the outline). the double doors in there are the accessible entrance (gsu, 2026)
export const TUCK = -45.9
const TUCK_X = -156
const GRANITE_X = -159
const SOFFIT = 4.6
const ACCESS: Hole = [-151.6, -149.4, 0, 2.6]
// blue glass: a strip up the block's west edge and a strip window near the top of the brick
const STRIP_UP: Range = [SPLIT, -161.6]
const STRIP: Hole = [-161.3, GRANITE_X - 0.3, 21, 22.6]

export function edgewood58Geometry(b: Edgewood58Data) {
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
  const lid = (part: Part, x: Range, z: Range, y: number, up = true) => {
    const pts: Point[] = [
      { x: x[0], z: z[0] },
      { x: x[1], z: z[0] },
      { x: x[1], z: z[1] },
      { x: x[0], z: z[1] },
    ]
    add(part, flat(pts, y, up))
  }
  // a box, only the faces asked for: x/X the -x/+x sides, z/Z the -z/+z ones, t top, b bottom
  const box = (part: Part, x: Range, z: Range, y: Range, faces = 'xXzZtb') => {
    if (faces.includes('x')) fx(part, x[0], z[0], z[1], y[0], y[1], -1)
    if (faces.includes('X')) fx(part, x[1], z[0], z[1], y[0], y[1], 1)
    if (faces.includes('z')) fz(part, Math.min(...z), x[0], x[1], y[0], y[1], -1)
    if (faces.includes('Z')) fz(part, Math.max(...z), x[0], x[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, x, z, y[1])
    if (faces.includes('b')) lid(part, x, z, y[0], false)
  }
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
  // the same along z at x, holes are [z0, z1, y0, y1] with z0 < z1
  const holedX = (
    part: Part,
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
  const revealZ = (part: Part, [x0, x1, y0, y1]: Hole, z: number, to: number, pane?: Part) => {
    const s = Math.sign(z - to)
    fx(part, x0, z, to, y0, y1, 1)
    fx(part, x1, z, to, y0, y1, -1)
    const zr: Range = [Math.min(z, to), Math.max(z, to)]
    if (y0 > 0.01) lid(part, [x0, x1], zr, y0)
    lid(part, [x0, x1], zr, y1, false)
    if (pane) add(pane, paneOf(pane, { x: x0, z: to }, { x: x1, z: to }, y0, y1, { x: 0, z: s }))
  }
  const revealX = (part: Part, [z0, z1, y0, y1]: Hole, x: number, to: number, pane?: Part) => {
    const s = Math.sign(x - to)
    fz(part, z0, Math.min(x, to), Math.max(x, to), y0, y1, 1)
    fz(part, z1, Math.min(x, to), Math.max(x, to), y0, y1, -1)
    const xr: Range = [Math.min(x, to), Math.max(x, to)]
    if (y0 > 0.01) lid(part, xr, [z0, z1], y0)
    lid(part, xr, [z0, z1], y1, false)
    if (pane) add(pane, paneOf(pane, { x, z: z0 }, { x, z: z1 }, y0, y1, { x: s, z: 0 }))
  }

  // the warehouse's front. the marble ground floor: storefronts in bays 2-8 with two little
  // basement lights under each, the entrance in the first, the frieze over all of it
  const stores = FRONT_BAYS.slice(1).map(([x0, x1]): Hole => [x0 + 0.2, x1 - 0.2, ...STORE])
  const lights = FRONT_BAYS.slice(1).flatMap(([x0, x1]): Hole[] => {
    const m = (x0 + x1) / 2
    return [
      [x0 + 0.45, m - 0.25, ...BASEMENT],
      [m + 0.25, x1 - 0.45, ...BASEMENT],
    ]
  })
  const entrance: Hole = [ENTRANCE[0], ENTRANCE[1], 0, STORE[1]]
  // a narrow window up the corner pier
  const slot: Hole = [WEST + 0.55, WEST + 1.05, ...STORE]
  holedZ('marble', FACE, WEST, SPLIT, 0, MARBLE_TOP, [...stores, ...lights, entrance, slot], 1)
  revealZ('marble', slot, FACE, FACE - 0.15, 'store')
  for (const h of stores) revealZ('marble', h, FACE, FRONT, 'store')
  for (const h of lights) revealZ('marble', h, FACE, FACE - 0.1, 'store')
  revealZ('marble', entrance, FACE, FRONT, 'store')
  // greek key panels on the frieze over the corner pier, the wide pier and the end pier, a
  // raised border round three raised keys. the fluted pilaster by the entrance
  const key = (x: number, faces = 'Z') => {
    const [w, y0, y1, out] = [1.2, 5.02, 5.52, 0.025]
    const z: Range = [FACE, FACE + out]
    const t = 0.06
    box('marble', [x - w / 2, x + w / 2], z, [y0, y0 + t], faces + 't')
    box('marble', [x - w / 2, x + w / 2], z, [y1 - t, y1], faces + 'b')
    box('marble', [x - w / 2, x - w / 2 + t], z, [y0 + t, y1 - t], faces + 'X')
    box('marble', [x + w / 2 - t, x + w / 2], z, [y0 + t, y1 - t], faces + 'x')
    for (const k of [-0.3, 0, 0.3]) {
      box('marble', [x + k - 0.11, x + k + 0.11], z, [y0 + 0.14, y0 + 0.2], faces + 'tb')
      box('marble', [x + k - 0.11, x + k - 0.05], z, [y0 + 0.2, y1 - 0.14], faces + 'xX')
    }
  }
  key(WEST + 1.1)
  key((FRONT_BAYS[1]![1] + FRONT_BAYS[2]![0]) / 2)
  key(FRONT_BAYS[7]![1] + 0.75)
  for (let i = 0; i < 5; i++) {
    const x = ENTRANCE[1] + 0.1 + i * 0.18
    box('marble', [x, x + 0.1], [FACE, FACE + 0.05], [0.2, STORE[1]], 'xXZt')
  }

  // the band over the frieze, the brick floors with the windows set in, the sills, the
  // parapet's coping
  box('marble', [WEST - 0.06, SPLIT], [FACE, FACE + 0.06], BAND, 'xZtb')
  const windows = FRONT_BAYS.flatMap(([x0, x1]) => ROWS.map((r): Hole => [x0, x1, ...r]))
  holedZ('brick', FACE, WEST, SPLIT, BAND[1], PARAPET - COPING, windows, 1)
  for (const h of windows) revealZ('brick', h, FACE, FACE - SASH, 'glass')
  for (const s of SILLS) box('marble', [WEST - 0.04, SPLIT], [FACE, FACE + 0.04], s, 'xZtb')
  box('marble', [WEST - 0.05, SPLIT], [FACE, FACE + 0.05], [PARAPET - COPING, PARAPET], 'xZtb')

  // the canopy over the storefronts, blue all round
  box('blue', CANOPY.x, [FACE, FACE + CANOPY.out], CANOPY.y, 'xXZtb')

  // equitable pl, from the back: a roll up door, two storefronts, one with a door in it, and
  // by the corner pier a second entrance like the front's (gsu's 2017 and 2026 photos), brick
  // over it like the front. this face is on the outline, its glass is flat on it
  const side = (i: number) => WEST_BAYS[i]!
  const westStores = [5, 6].map((i): Hole => [side(i)[0] + 0.2, side(i)[1] - 0.2, ...STORE])
  const westDoors: Hole[] = [
    [side(7)[0] + 0.2, side(7)[1] - 0.2, 0.05, STORE[1]],
    [side(8)[1] - 2.2, side(8)[1], 0, STORE[1]],
  ]
  const rollUp: Hole = [side(3)[0] + 0.3, side(3)[1] - 0.3, 0, 3.2]
  holedX('marble', WEST, BACK, FACE, 0, MARBLE_TOP, [...westStores, ...westDoors, rollUp], -1)
  for (const h of [...westStores, ...westDoors]) add('store', paneX(WEST - 0.01, h))
  fx('white', WEST - 0.01, rollUp[0], rollUp[1], rollUp[2], rollUp[3], -1)
  box('marble', [WEST - 0.06, WEST], [BACK, FACE], BAND, 'xzZtb')
  const sideWindows = WEST_BAYS.flatMap(([z0, z1]) => ROWS.map((r): Hole => [z0, z1, ...r]))
  holedX('brick', WEST, BACK, FACE, BAND[1], PARAPET - COPING, sideWindows, -1)
  for (const h of sideWindows) revealX('brick', h, WEST, WEST + SASH, 'glass')
  for (const s of SILLS) box('marble', [WEST - 0.04, WEST], [BACK, FACE], s, 'xzZtb')
  box('marble', [WEST - 0.05, WEST], [BACK, FACE + 0.05], [PARAPET - COPING, PARAPET], 'xzZtb')

  // the back on the alley: plain brick with the same windows upstairs, a plain wall on the
  // ground floor
  const backWindows = FRONT_BAYS.flatMap(([x0, x1]) =>
    ROWS.slice(1).map((r): Hole => [x0, x1, ...r]),
  )
  holedZ('brick', BACK, WEST, SPLIT, 0, PARAPET, backWindows, -1)
  for (const h of backWindows) revealZ('brick', h, BACK, BACK + SASH, 'glass')
  // the roof, the parapet's inside and its top
  const IN = 0.3
  lid('white', [WEST + IN, SPLIT], [BACK + IN, FACE - IN], ROOF)
  fz('brick', FACE - IN, WEST + IN, SPLIT, ROOF, PARAPET, -1)
  fx('brick', WEST + IN, BACK + IN, FACE - IN, ROOF, PARAPET, 1)
  fz('brick', BACK + IN, WEST + IN, SPLIT, ROOF, PARAPET, 1)
  lid('marble', [WEST, SPLIT], [FACE - IN, FACE], PARAPET)
  lid('marble', [WEST, WEST + IN], [BACK, FACE - IN], PARAPET)
  lid('marble', [WEST + IN, SPLIT], [BACK, BACK + IN], PARAPET)
  // the higher strip along the back
  box('brick', BACK_STRIP.x, BACK_STRIP.z, [ROOF, BACK_STRIP.top], 'xXzZ')
  lid('white', BACK_STRIP.x, BACK_STRIP.z, BACK_STRIP.top)

  // the sign box on the corner, the blue square at its top
  box('blue', SIGN_BOX.x, SIGN_BOX.z, SIGN_BOX.y)
  signs.push({
    x: (SIGN_BOX.x[0] + SIGN_BOX.x[1]) / 2,
    y: SIGN_BOX.y[1] - 1.1,
    z: SIGN_BOX.z[1] + 0.02,
    rot: 0,
    text: '',
    plate: '#2a5bd7',
    width: 1.3,
    height: 1.3,
  })
  // the address over the entrance on the frieze
  signs.push({
    x: (ENTRANCE[0] + ENTRANCE[1]) / 2 + 0.6,
    y: 5.3,
    z: FACE + 0.02,
    rot: 0,
    text: '58 Edgewood Ave.',
    letters: true,
    size: 0.3,
    color: '#2b2d31',
    weight: 500,
  })

  // the east block. the bottom: black granite flush on the west end, the rest tucked in under
  // a granite soffit with the accessible entrance in its back wall
  fz('granite', FACE, SPLIT, TUCK_X, 0, SOFFIT, 1)
  holedZ('granite', TUCK, TUCK_X, EAST, 0, SOFFIT, [ACCESS], 1)
  revealZ('granite', ACCESS, TUCK, TUCK - 0.1, 'store')
  fx('granite', TUCK_X, TUCK, FACE, 0, SOFFIT, 1)
  fx('granite', EAST, TUCK, FACE, 0, SOFFIT, -1)
  lid('granite', [TUCK_X, EAST], [TUCK, FACE], SOFFIT, false)
  // granite up to the top over that, the brick strip on the west end with the blue glass
  fz('granite', FACE, GRANITE_X, EAST, SOFFIT, EAST_TOP - COPING, 1)
  const upper: Hole[] = [[...STRIP_UP, SOFFIT, EAST_TOP], STRIP]
  holedZ('brick', FACE, SPLIT, GRANITE_X, SOFFIT, EAST_TOP - COPING, upper, 1)
  revealZ('brick', [...STRIP_UP, SOFFIT, EAST_TOP - COPING], FACE, FACE - 0.15, 'blue')
  revealZ('brick', STRIP, FACE, FACE - 0.2, 'blue')
  box('marble', [SPLIT, EAST], [FACE, FACE + 0.05], [EAST_TOP - COPING, EAST_TOP], 'Ztb')
  // its west wall over the warehouse's roof is painted white, the side on t deck too, brick
  // on the back
  fx('white', SPLIT, BACK, FACE, ROOF, EAST_TOP, -1)
  fx('white', EAST, BACK, FACE, SOFFIT, EAST_TOP, 1)
  fx('white', EAST, BACK, TUCK, 0, SOFFIT, 1)
  fz('brick', BACK, SPLIT, EAST, 0, EAST_TOP, -1)
  // the roof, the parapet's inside and top
  lid('white', [SPLIT + IN, EAST - IN], [BACK + IN, FACE - IN], EAST_ROOF)
  fz('white', FACE - IN, SPLIT + IN, EAST - IN, EAST_ROOF, EAST_TOP, -1)
  fz('white', BACK + IN, SPLIT + IN, EAST - IN, EAST_ROOF, EAST_TOP, 1)
  fx('white', SPLIT + IN, BACK + IN, FACE - IN, EAST_ROOF, EAST_TOP, 1)
  fx('white', EAST - IN, BACK + IN, FACE - IN, EAST_ROOF, EAST_TOP, -1)
  lid('marble', [SPLIT, EAST], [FACE - IN, FACE], EAST_TOP)
  lid('marble', [SPLIT, EAST], [BACK, BACK + IN], EAST_TOP)
  lid('marble', [SPLIT, SPLIT + IN], [BACK + IN, FACE - IN], EAST_TOP)
  lid('marble', [EAST - IN, EAST], [BACK + IN, FACE - IN], EAST_TOP)
  // the stair tower and the cooling unit
  box('brick', TOWER.x, TOWER.z, [EAST_ROOF, TOWER.top - COPING], 'xXzZ')
  box('marble', TOWER.x, TOWER.z, [TOWER.top - COPING, TOWER.top], 'xXzZt')
  box('white', UNIT.x, UNIT.z, [EAST_ROOF, UNIT.top], 'xXzZt')

  // blocks just inside the walls, for the shadows: both are empty over the ground floor and
  // a low sun came in the windows on one side and out the other's (landmark.ts core)
  const rect = (x: Range, z: Range): Point[] => [
    { x: x[0], z: z[0] },
    { x: x[1], z: z[0] },
    { x: x[1], z: z[1] },
    { x: x[0], z: z[1] },
  ]
  core('brick', rect([WEST + 0.3, SPLIT - 0.3], [BACK + 0.3, FRONT - 0.3]), CEILING, ROOF - 0.1)
  core('brick', rect([SPLIT + 0.3, EAST - 0.3], [BACK + 0.3, TUCK - 0.3]), CEILING, EAST_ROOF - 0.1)

  // inside the ground floor: the edgewood ave front is glass
  insideWalls(
    inside,
    outline,
    door,
    (p, q) => Math.abs(p.z - FRONT) < 0.01 && Math.abs(q.z - FRONT) < 0.01,
  )

  return {
    parts: merged(),
    inside,
    signs,
    first: ['marble', 'brick'],
    // the cores cast for the floors over the ground floor
    noShadow: ['glass', 'store', 'blue', 'white'],
  }
}

// a pane flat on a wall at x, for openings drawn without a reveal
function paneX(x: number, [z0, z1, y0, y1]: Hole) {
  return glassQuad({ x, z: z0 }, { x, z: z1 }, y0, y1, { x: -1, z: 0 })
}

// the blue glass is drawn as shiny metal panels (it's a lit sign box, no rooms behind it),
// the rest is the glass family that needs aPane
function paneOf(part: Part, a: Point, b: Point, y0: number, y1: number, into: Point) {
  return part === 'blue' ? wallQuad(a, b, y0, y1, into) : glassQuad(a, b, y0, y1, into)
}
