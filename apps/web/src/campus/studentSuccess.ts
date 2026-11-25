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

// gsu's student success center, 25-27 auburn ave at equitable pl: the old southern bell
// exchange, two buildings (1907 and 1922) empty for decades and opened again by gsu in oct
// 2025. the 1907 one on the corner: a limestone ground floor with fluted columns and the
// address on the frieze, two tall floors of red brick with stone quoins and keystones, a deep
// bracketed cornice painted dark grey. its long side down equitable pl is plain darker brick
// with four rows of paired windows. the 1922 one east of it: cream terra cotta, paired
// windows in three bays, medallions, a parapet of little piers. from usgs's lidar (2018) and
// the 2025 photos (gsu's, the architects'). sources: docs/reference/student-success-center.md
//
// it's square to the game's x/z: x along auburn ave, the street is on the -z side. the ground
// is the sidewalk at the door (318.1m), equitable pl falls 2m to the back

export type StudentSuccessData = {
  points: number[][]
  height: number
  door?: number[]
}

// few parts, each is a draw call in every pass. brick is the 1907 building's red brick, dark
// the plainer brick of its long side, the back and the east side, stone the limestone,
// cream the 1922 building's terra cotta (and the roofs, the penthouses), metal the cornice,
// the doors and the dark panels in the shop windows, glass the steel windows upstairs, store
// the big ground floor glass
export type Part = 'brick' | 'dark' | 'stone' | 'cream' | 'metal' | 'glass' | 'store'

type Range = readonly [number, number]

// the stone and the brick (the face) and the ground floor's glass 0.3m behind it (the outline)
export const FACE = -146.7
export const FRONT = -146.4
export const WEST = -198.1
export const EAST = -170.1
export const BACK = -89
// where the 1907 building ends and the 1922 one starts on auburn ave (the lidar's party wall
// parapet, and a camera fitted to gsu's 2025 photo)
export const PARTY = -184.5
// the 1907 building's dressed corner block on equitable pl ends here, then the plain side
export const BLOCK = FACE + 12.6
// the last bit of the side is a little taller (the 1922 building wraps round the back)
const TALL_Z = -102.5
const SASH = 0.2

// heights over the sidewalk at the door. lidar: the cornice's top 336.36m, the 1922
// parapet 336.95 (its piers go higher, the photos), the roofs 335.3-335.8, the back's parapet 337.7
export const CORNICE: Range = [17, 18.3]
// the bed moulding's top, the brackets' top
const BED = 17.35
const CORONA = 17.8
export const ROOF = 17.4
const SIDE_TOP = 18
const TALL_TOP = 19.5
const CREAM_TOP = 18.85
export const PIER_TOP = 19.6
// the 1907 building: the stone up to here, columns to 5.75 under the entablature, the ledge
const STONE_TOP = 8.3
const OPEN_TOP = 5.7
const ENTABLATURE: Range = [5.75, 7.75]
const LEDGE: Range = [7.75, 8.3]
// its two floors of windows (2025 photos on the lidar's heights)
export const ROWS: Range[] = [
  [8.55, 11.1],
  [13, 15.7],
]
// the long side: four rows, the bottom one at the street
export const SIDE_ROWS: Range[] = [
  [0.4, 2.5],
  [4.3, 7],
  [8.8, 11.6],
  [13.4, 16.3],
]
// the 1922 building: tall ground floor openings, a frieze and ledge, two floors of windows
const CREAM_OPEN: Range = [0.15, 6]
const CREAM_FRIEZE: Range = [6.4, 7.8]
const CREAM_LEDGE: Range = [7.8, 8.05]
const CREAM_ROWS: Range[] = [
  [8.25, 10.8],
  [12.3, 15],
]

// the 1907 front: a quoin strip at each end and four bays between them, a window in the
// middle of each upstairs. same on the corner block's side
const QUOIN = 1
const PITCH = (PARTY - WEST - 2 * QUOIN) / 4
export const FRONT_BAYS = Array.from({ length: 4 }, (_, i): Range => {
  const a = WEST + QUOIN + i * PITCH
  return [a, a + PITCH]
})
const WINDOW = 1.7
// the door bay is the east one, next to the 1922 building
export const DOOR_BAY = FRONT_BAYS[3]!
// the 1922 front: three bays of two windows, wide piers between
const END_PIER = 1.3
const MID_PIER = 1.4
const CREAM_BAY = (EAST - PARTY - 2 * END_PIER - 2 * MID_PIER) / 3
export const CREAM_BAYS = Array.from({ length: 3 }, (_, i): Range => {
  const a = PARTY + END_PIER + i * (CREAM_BAY + MID_PIER)
  return [a, a + CREAM_BAY]
})
// the plain side: ten pairs of windows from the corner block to the back
export const PAIRS = 10

// the penthouses gsu put on the roof (lidar): two plant rooms, a stair and the elevator
const PENTHOUSES: { x: Range; z: Range; top: number }[] = [
  { x: [-188, -181], z: [-136.5, -120], top: 20.9 },
  { x: [-187, -182], z: [-129, -123.5], top: 24.2 },
  { x: [-189, -180], z: [-118, -112], top: 22.3 },
  { x: [-188, -181], z: [-109.5, -104], top: 21.2 },
]

export function studentSuccessGeometry(b: StudentSuccessData) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  // a face at z from x0 to x1 facing +z (s 1) or -z (s -1, the street)
  const fz = (part: Part, z: number, x0: number, x1: number, y0: number, y1: number, s: number) => {
    if (x1 - x0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad({ x: x0, z }, { x: x1, z }, y0, y1, { x: 0, z: s }, x0))
  }
  // a face at x from z0 to z1 facing +x (s 1) or -x (s -1, equitable pl)
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
    if (faces.includes('z')) fz(part, z[0], x[0], x[1], y[0], y[1], -1)
    if (faces.includes('Z')) fz(part, z[1], x[0], x[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, x, z, y[1])
    if (faces.includes('b')) lid(part, x, z, y[0], false)
  }
  // something standing out of the front by `out` (the street side)
  const outFront = (part: Part, x: Range, y: Range, out: number, faces = 'xXztb') =>
    box(part, x, [FACE - out, FACE], y, faces)
  // and out of the west side, onto equitable pl
  const outSide = (part: Part, z: Range, y: Range, out: number, faces = 'zZxtb') =>
    box(part, [WEST - out, WEST], z, y, faces)

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
    if (pane) add(pane, glassQuad({ x: x0, z: to }, { x: x1, z: to }, y0, y1, { x: 0, z: s }))
  }
  const revealX = (part: Part, [z0, z1, y0, y1]: Hole, x: number, to: number, pane?: Part) => {
    const s = Math.sign(x - to)
    fz(part, z0, Math.min(x, to), Math.max(x, to), y0, y1, 1)
    fz(part, z1, Math.min(x, to), Math.max(x, to), y0, y1, -1)
    const xr: Range = [Math.min(x, to), Math.max(x, to)]
    if (y0 > 0.01) lid(part, xr, [z0, z1], y0)
    lid(part, xr, [z0, z1], y1, false)
    if (pane) add(pane, glassQuad({ x, z: z0 }, { x, z: z1 }, y0, y1, { x: s, z: 0 }))
  }
  // an engaged fluted column on the front: half round, in flat flutes
  // three quarters round: its middle 0.12m out from the wall
  const column = (x: number) => {
    const r = 0.32
    const c = FACE - 0.12
    const n = 10
    const from = -0.4
    const to = Math.PI + 0.4
    for (let i = 0; i < n; i++) {
      const t0 = from + ((to - from) * i) / n
      const t1 = from + ((to - from) * (i + 1)) / n
      const p = { x: x + Math.cos(t0) * r, z: c - Math.sin(t0) * r }
      const q = { x: x + Math.cos(t1) * r, z: c - Math.sin(t1) * r }
      const tm = (t0 + t1) / 2
      add('stone', wallQuad(p, q, 0.45, 5.45, { x: Math.cos(tm), z: -Math.sin(tm) }))
    }
    // the base and the capital
    outFront('stone', [x - 0.4, x + 0.4], [0, 0.45], 0.52)
    outFront('stone', [x - 0.42, x + 0.42], [5.45, ENTABLATURE[0]], 0.54)
  }
  // stone quoins up a corner: long and short blocks in turn, a bit proud of the brick
  const quoins = (y0: number, y1: number, place: (y: Range, long: boolean) => void) => {
    const course = 0.48
    for (let i = 0, y = y0; y + course <= y1 + 0.01; i++, y += course)
      place([y + 0.03, y + course - 0.03], i % 2 === 0)
  }

  // the 1907 building's front. the limestone ground floor: the corner pier, a door bay and
  // three window bays between columns, each window a basement light, a dark panel, the glass
  // and a transom (2025 photos)
  const groundHoles = FRONT_BAYS.map(([x0, x1], i): Hole => [
    x0 + 0.3,
    x1 - 0.3,
    i === 3 ? 0 : 0.25,
    OPEN_TOP,
  ])
  holedZ('stone', FACE, WEST, PARTY, 0, STONE_TOP, groundHoles, -1)
  for (const [i, h] of groundHoles.entries()) {
    revealZ('stone', h, FACE, FRONT)
    const [x0, x1] = h
    const pane = (y0: number, y1: number, part: Part = 'store') =>
      add(part, paneOf(part, { x: x0, z: FRONT }, { x: x1, z: FRONT }, y0, y1, { x: 0, z: -1 }))
    if (i === 3) {
      // the doors, glass over them
      pane(0, 2.9)
      pane(2.9, 3.25, 'metal')
      pane(3.25, OPEN_TOP)
    } else {
      pane(0.25, 0.85)
      pane(0.85, 1.9, 'metal')
      pane(1.9, 4.8)
      pane(4.8, 4.95, 'metal')
      pane(4.95, OPEN_TOP)
    }
  }
  for (let k = 1; k < 4; k++) column(FRONT_BAYS[k]![0])
  column(PARTY - QUOIN / 2)
  // the corner pier, a flat pilaster on both faces
  box('stone', [WEST - 0.1, WEST + QUOIN], [FACE - 0.1, FACE], [0, ENTABLATURE[0]], 'xXztb')
  // the entablature with the address, the ledge over it (round the corner block's side too)
  outFront('stone', [WEST - 0.12, PARTY], ENTABLATURE, 0.12, 'xztb')
  outFront('stone', [WEST - 0.3, PARTY], LEDGE, 0.3, 'xXztb')
  outSide('stone', [FACE, BLOCK], ENTABLATURE, 0.12, 'Zxtb')
  outSide('stone', [FACE, BLOCK], LEDGE, 0.3, 'Zxtb')
  signs.push({
    x: (WEST + PARTY) / 2 + 0.4,
    y: 6.95,
    z: FACE - 0.14,
    rot: Math.PI,
    text: '25-27 AUBURN AVENUE',
    letters: true,
    size: 0.6,
    color: '#1d1e20',
    weight: 500,
  })

  // upstairs: brick with the windows set in, a stone sill and keystone each, quoins at both
  // ends
  const upper = FRONT_BAYS.flatMap(([x0, x1]) => {
    const m = (x0 + x1) / 2
    return ROWS.map((r): Hole => [m - WINDOW / 2, m + WINDOW / 2, ...r])
  })
  holedZ('brick', FACE, WEST, PARTY, STONE_TOP, CORNICE[0], upper, -1)
  for (const h of upper) {
    revealZ('brick', h, FACE, FACE + SASH, 'glass')
    const m = (h[0] + h[1]) / 2
    outFront('stone', [h[0] - 0.12, h[1] + 0.12], [h[2] - 0.15, h[2]], 0.08)
    outFront('stone', [m - 0.16, m + 0.16], [h[3], h[3] + 0.6], 0.05)
  }
  quoins(STONE_TOP, CORNICE[0], (y, long) => {
    const w = long ? QUOIN : 0.65
    // the west corner wraps round onto equitable pl
    box('stone', [WEST - 0.06, WEST + w], [FACE - 0.06, FACE], y, 'xXztb')
    box('stone', [WEST - 0.06, WEST], [FACE, FACE + w - 0.06], y, 'xZtb')
    outFront('stone', [PARTY - w, PARTY], y, 0.06)
  })

  // the corner block's side on equitable pl, the same as the front. the ground floor's
  // windows are tall and narrow and flat on the outline (it's the wall here)
  const side = (BLOCK - FACE - 2 * QUOIN) / 4
  const sideBays = [0, 1, 2, 3].map((i): Range => [
    FACE + QUOIN + i * side,
    FACE + QUOIN + (i + 1) * side,
  ])
  const sideGround = sideBays.map(([z0, z1]): Hole => {
    const m = (z0 + z1) / 2
    return [m - 0.7, m + 0.7, 1, OPEN_TOP - 0.2]
  })
  holedX('stone', WEST, FACE, BLOCK, 0, STONE_TOP, sideGround, -1)
  for (const [z0, z1, y0, y1] of sideGround) {
    const pane = (a: number, c: number, part: Part = 'store') =>
      add(
        part,
        paneOf(part, { x: WEST - 0.01, z: z0 }, { x: WEST - 0.01, z: z1 }, a, c, { x: -1, z: 0 }),
      )
    pane(y0, 1.9, 'metal')
    pane(1.9, y1)
  }
  const sideUpper = sideBays.flatMap(([z0, z1]) => {
    const m = (z0 + z1) / 2
    return ROWS.map((r): Hole => [m - WINDOW / 2, m + WINDOW / 2, ...r])
  })
  holedX('brick', WEST, FACE, BLOCK, STONE_TOP, CORNICE[0], sideUpper, -1)
  for (const h of sideUpper) {
    revealX('brick', h, WEST, WEST + SASH, 'glass')
    const m = (h[0] + h[1]) / 2
    outSide('stone', [h[0] - 0.12, h[1] + 0.12], [h[2] - 0.15, h[2]], 0.08)
    outSide('stone', [m - 0.16, m + 0.16], [h[3], h[3] + 0.6], 0.05)
  }
  quoins(STONE_TOP, CORNICE[0], (y, long) =>
    outSide('stone', [BLOCK - (long ? QUOIN : 0.65), BLOCK], y, 0.06),
  )

  // the cornice, front and the corner block's side: a bed moulding, brackets every 0.85m and
  // the deep top. dark grey paint
  const OUT = 0.85
  outFront('metal', [WEST - 0.25, PARTY], [CORNICE[0], BED], 0.25, 'xztb')
  outSide('metal', [FACE, BLOCK], [CORNICE[0], BED], 0.25, 'Zxtb')
  fz('metal', FACE - 0.25, WEST - 0.25, PARTY, BED, CORONA, -1)
  fx('metal', WEST - 0.25, FACE - 0.25, BLOCK, BED, CORONA, -1)
  outFront('metal', [WEST - OUT, PARTY], [CORONA, CORNICE[1]], OUT, 'xzb')
  outSide('metal', [FACE, BLOCK], [CORONA, CORNICE[1]], OUT, 'Zxb')
  for (let x = PARTY - 0.45; x > WEST; x -= 0.85)
    outFront('metal', [x - 0.12, x + 0.12], [BED, CORONA], OUT - 0.1, 'xXzb')
  for (let z = BLOCK - 0.45; z > FACE; z -= 0.85)
    outSide('metal', [z - 0.12, z + 0.12], [BED, CORONA], OUT - 0.1, 'zZxb')
  box(
    'metal',
    [WEST - OUT, WEST - OUT + 0.24],
    [FACE - OUT, FACE - OUT + 0.24],
    [BED, CORONA],
    'xzb',
  )

  // the plain side down equitable pl: darker brick, paired windows in four rows, a corbel
  // under the top. the bottom row is flat on the outline (it's down at the street)
  const pairs = (from: number, to: number, n: number) => {
    const pitch = (to - from) / n
    return Array.from({ length: n }, (_, i) => from + pitch * (i + 0.5)).flatMap((m): Range[] => [
      [m - 1.1, m - 0.2],
      [m + 0.2, m + 1.1],
    ])
  }
  const windows = pairs(BLOCK, BACK, PAIRS).flatMap(([z0, z1]) =>
    SIDE_ROWS.map((r): Hole => [z0, z1, ...r]),
  )
  // their heads are shallow arches: a narrower step on top of each, set in like the window
  const arches = windows
    .filter((h) => h[2] > 1)
    .map(([z0, z1, , y1]): Hole => [z0 + 0.15, z1 - 0.15, y1, y1 + 0.15])
  const longSide = [...windows, ...arches]
  holedX(
    'dark',
    WEST,
    BLOCK,
    TALL_Z,
    0,
    SIDE_TOP,
    longSide.filter((h) => h[1] <= TALL_Z),
    -1,
  )
  holedX(
    'dark',
    WEST,
    TALL_Z,
    BACK,
    0,
    TALL_TOP,
    longSide.filter((h) => h[0] >= TALL_Z),
    -1,
  )
  for (const h of longSide) {
    if (h[2] < 0.5)
      add(
        'glass',
        glassQuad({ x: WEST - 0.01, z: h[0] }, { x: WEST - 0.01, z: h[1] }, h[2], h[3], {
          x: -1,
          z: 0,
        }),
      )
    else revealX('dark', h, WEST, WEST + SASH, 'glass')
  }
  outSide('dark', [BLOCK, TALL_Z], [17.2, 17.5], 0.1, 'zZxtb')

  // the back on the alley and the east side on t deck: the same brick and windows. the 1922
  // building's front part along t deck's stair is plain
  const back = pairs(WEST, EAST, 6).flatMap(([x0, x1]) =>
    SIDE_ROWS.slice(1).map((r): Hole => [x0, x1, ...r]),
  )
  holedZ('dark', BACK, WEST, EAST, 0, TALL_TOP, back, 1)
  for (const h of back) revealZ('dark', h, BACK, BACK - SASH, 'glass')
  const east = pairs(-133.5, BACK, 9).flatMap(([z0, z1]) =>
    SIDE_ROWS.slice(1).map((r): Hole => [z0, z1, ...r]),
  )
  holedX('dark', EAST, -133.5, BACK, 0, CREAM_TOP, east, 1)
  for (const h of east) revealX('dark', h, EAST, EAST - SASH, 'glass')
  fx('cream', EAST, FACE, -133.5, 0, CREAM_TOP, 1)

  // the 1922 building's front. the ground floor: three tall openings in moulded frames, the
  // glass in two lights with a dark panel between, the ornament frieze and a ledge over it
  const creamGround = CREAM_BAYS.map(([x0, x1]): Hole => {
    const m = (x0 + x1) / 2
    return [m - 1.3, m + 1.3, ...CREAM_OPEN]
  })
  holedZ('cream', FACE, PARTY, EAST, 0, CREAM_LEDGE[0], creamGround, -1)
  for (const h of creamGround) {
    revealZ('cream', h, FACE, FRONT)
    const pane = (y0: number, y1: number, part: Part = 'store') =>
      add(part, paneOf(part, { x: h[0], z: FRONT }, { x: h[1], z: FRONT }, y0, y1, { x: 0, z: -1 }))
    pane(CREAM_OPEN[0], 2.75)
    pane(2.75, 3.5, 'metal')
    pane(3.5, CREAM_OPEN[1])
    // the frame round it
    outFront('cream', [h[0] - 0.3, h[0]], [0, h[3] + 0.3], 0.08, 'xXzt')
    outFront('cream', [h[1], h[1] + 0.3], [0, h[3] + 0.3], 0.08, 'xXzt')
    outFront('cream', [h[0], h[1]], [h[3], h[3] + 0.3], 0.08, 'ztb')
  }
  outFront('cream', [PARTY, EAST], CREAM_FRIEZE, 0.1, 'zXtb')
  outFront('cream', [PARTY, EAST], CREAM_LEDGE, 0.22, 'zXtb')
  // upstairs: two windows a bay, a medallion over each pair and one between the floors
  // (round and diamond in turn), piers up into the parapet
  const creamUpper = CREAM_BAYS.flatMap(([x0]) =>
    [x0 + 0.3, x0 + CREAM_BAY - 1.3].flatMap((a) => CREAM_ROWS.map((r): Hole => [a, a + 1, ...r])),
  )
  holedZ('cream', FACE, PARTY, EAST, CREAM_LEDGE[1], CREAM_TOP, creamUpper, -1)
  for (const h of creamUpper) {
    revealZ('cream', h, FACE, FACE + SASH, 'glass')
    outFront('cream', [h[0] - 0.08, h[1] + 0.08], [h[2] - 0.12, h[2]], 0.07)
  }
  for (const [i, [x0, x1]] of CREAM_BAYS.entries()) {
    const m = (x0 + x1) / 2
    medallion(m, 11.55, i === 1 ? 'round' : 'diamond')
    medallion(m, 15.85, i === 1 ? 'diamond' : 'round')
  }
  const piers = [PARTY, ...CREAM_BAYS.map(([, x1]) => x1)].map((x, i) =>
    i === 0 ? x + 0.55 : i === 3 ? EAST - 0.55 : x + MID_PIER / 2,
  )
  for (const x of piers) {
    outFront('cream', [x - 0.45, x + 0.45], [CREAM_LEDGE[1], 19.3], 0.08)
    outFront('cream', [x - 0.3, x + 0.3], [19.3, PIER_TOP], 0.05)
  }
  for (const [x0] of CREAM_BAYS)
    for (const a of [x0 + 0.3, x0 + CREAM_BAY / 2, x0 + CREAM_BAY - 0.3])
      outFront('cream', [a - 0.18, a + 0.18], [16.9, 19.2], 0.05)

  // the roof, the parapets' insides and tops, the penthouses
  const IN = 0.3
  // a dark roofing membrane (esri's image)
  lid('metal', [WEST + IN, EAST - IN], [FACE + IN, BACK - IN], ROOF)
  fz('brick', FACE + IN, WEST + IN, PARTY, ROOF, CORNICE[1], 1)
  fz('cream', FACE + IN, PARTY, EAST - IN, ROOF, CREAM_TOP, 1)
  fx('brick', WEST + IN, FACE + IN, BLOCK, ROOF, CORNICE[1], 1)
  fx('dark', WEST + IN, BLOCK, TALL_Z, ROOF, SIDE_TOP, 1)
  fz('metal', BLOCK, WEST, WEST + IN, SIDE_TOP, CORNICE[1], 1)
  fx('dark', WEST + IN, TALL_Z, BACK - IN, ROOF, TALL_TOP, 1)
  fx('dark', EAST - IN, FACE + IN, BACK - IN, ROOF, CREAM_TOP, -1)
  fz('dark', BACK - IN, WEST + IN, EAST - IN, ROOF, TALL_TOP, -1)
  lid('metal', [WEST - OUT, PARTY], [FACE - OUT, FACE + IN], CORNICE[1])
  lid('metal', [WEST - OUT, WEST + IN], [FACE + IN, BLOCK], CORNICE[1])
  lid('cream', [PARTY, EAST], [FACE, FACE + IN], CREAM_TOP)
  lid('dark', [WEST, WEST + IN], [BLOCK, TALL_Z], SIDE_TOP)
  lid('dark', [WEST, WEST + IN], [TALL_Z, BACK], TALL_TOP)
  lid('dark', [WEST + IN, EAST], [BACK - IN, BACK], TALL_TOP)
  lid('dark', [EAST - IN, EAST], [FACE + IN, BACK - IN], CREAM_TOP)
  // the step up of the taller back where it stands over the side
  fz('dark', TALL_Z, WEST, WEST + IN, SIDE_TOP, TALL_TOP, -1)
  fx('dark', EAST, BACK - IN, BACK, CREAM_TOP, TALL_TOP, 1)
  for (const p of PENTHOUSES) box('cream', p.x, p.z, [ROOF, p.top], 'xXzZt')

  // gsu's blue blade sign on its pole at the curb by the 1922 building, both faces
  const pole = { x: -184.6, z: FACE - 1.4 }
  box('metal', [pole.x - 0.08, pole.x + 0.08], [pole.z - 0.08, pole.z + 0.08], [0, 6.6], 'xXzZt')
  for (const s of [1, -1])
    signs.push({
      x: pole.x + 0.1 * s,
      y: 4.9,
      z: pole.z - 0.75,
      rot: (s * Math.PI) / 2,
      text: 'STUDENT\nSUCCESS\nCENTER',
      plate: '#1a3399',
      color: '#ffffff',
      height: 2.6,
      scale: 1.05,
    })

  // a block just inside the walls, for the shadows: the windows don't cast and it's empty
  // over the ground floor (landmark.ts core)
  const rect = (x: Range, z: Range): Point[] => [
    { x: x[0], z: z[0] },
    { x: x[1], z: z[0] },
    { x: x[1], z: z[1] },
    { x: x[0], z: z[1] },
  ]
  core('dark', rect([WEST + 0.35, EAST - 0.35], [FRONT + 0.3, BACK - 0.35]), CEILING, ROOF - 0.1)

  // inside the ground floor: the auburn ave front is glass
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
    first: ['stone', 'cream'],
    noShadow: ['glass', 'store'],
  }

  // a little terra cotta plaque, round (an octagon) or a diamond, on the 1922 front
  function medallion(x: number, y: number, kind: 'round' | 'diamond') {
    const n = kind === 'round' ? 8 : 4
    const r = kind === 'round' ? 0.28 : 0.34
    const t0 = kind === 'round' ? Math.PI / 8 : 0
    const pts = Array.from({ length: n }, (_, i) => {
      const t = t0 + (i / n) * Math.PI * 2
      return { x: Math.cos(t) * r, z: Math.sin(t) * r }
    })
    // flat() lays it on the ground facing up, stand it up facing the street
    const geo = flat(pts, 0)
    geo.rotateX(-Math.PI / 2)
    geo.translate(x, y, FACE - 0.06)
    add('cream', geo)
  }
}

// glass needs aPane (glassQuad), the dark panels between the panes are plain metal
function paneOf(part: Part, a: Point, b: Point, y0: number, y1: number, into: Point) {
  return part === 'metal' ? wallQuad(a, b, y0, y1, into) : glassQuad(a, b, y0, y1, into)
}
