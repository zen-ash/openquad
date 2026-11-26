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

// 75 piedmont ave, the old citizens trust bank building, gsu's offices now (admissions, the
// registrar, counseling). a slab on piedmont ave: tan precast fins at every bay on the long
// sides with dark glass and taupe spandrels between them, plain ribbed ends, a light grey
// band at the top with "GEORGIA STATE UNIVERSITY" on the piedmont side. a granite annex on
// its east side holds the lobby, it opens onto j deck's roof. from usgs's lidar (2018) and
// gsu's photos (2020-2021 the tower, april 2026 the entrances and the deck side). sources:
// docs/reference/75-piedmont.md
//
// square to the game's x/z: x east, -z north. heights over the lobby floor (303.8m, the same
// as the deck's roof)

export type Piedmont75Data = {
  points: number[][]
  height: number
  door?: number[]
}

// fin the tan precast (fins, the ribbed ends, the ground floor, the canopies), spandrel the
// taupe panels between the windows, glass the windows and the storefronts, granite the red
// granite of the annex and the north wing, band the light grey sign band
export type Part = 'fin' | 'spandrel' | 'glass' | 'granite' | 'band'

type Range = readonly [number, number]

// the tower on the lidar's walls
export const WEST = 308
export const EAST = 329.8
export const NORTH = -304
export const SOUTH = -234
// the fins stand out of the wall this far, this wide, the corners wider
export const FIN = 0.45
const FIN_W = 0.36
const CORNER = 0.8
// 22 bays on the long sides (gsu's 2021 photo), two panes each
export const BAYS = 22
// the ground floor, then 12 floors of windows up to the band (lidar: the band's top 355.3m,
// the roof 354.6)
export const GROUND = 4.8
export const STOREY = 3.575
export const FLOORS = 12
const SPANDREL = 1.6
export const BAND: Range = [47.7, 51.2]
export const TOP = 51.5
const ROOF = 50.8
// the low annex on the east side (the lobby) and the strip on the north end: granite with a
// tan fascia (lidar 312.4-313m)
export const ANNEX = { x: [EAST, 343.8] as Range, z: [-297.8, -266.4] as Range, top: 8.8 }
const NORTH_WING = { x: [WEST, 331.8] as Range, z: [-308.9, NORTH] as Range, top: 8.6 }
const FASCIA = 1.5
// the drop off canopy over the deck roof by the annex's doors (lidar 307m), the canopy over
// the ramp up to the piedmont ave doors (308.6m), the second floor stuck out over the
// sidewalk north of it (312.4m)
export const DROP = {
  x: [ANNEX.x[1], 354] as Range,
  z: [-276, -267.6] as Range,
  y: [2.6, 3.2] as Range,
}
const RAMP = { x: [301.6, WEST] as Range, z: [-282, -265] as Range, y: [3.0, 4.8] as Range }
const OVERHANG = {
  x: [306.4, WEST] as Range,
  z: [NORTH, -279] as Range,
  y: [GROUND, 8.6] as Range,
}
// the annex's doors under the drop off canopy
const LOBBY: Range = [-274.3, -269.3]

export function piedmont75Geometry(b: Piedmont75Data) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  // a face at z from x0 to x1 facing +z (s 1) or -z
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
    if (faces.includes('z')) fz(part, z[0], x[0], x[1], y[0], y[1], -1)
    if (faces.includes('Z')) fz(part, z[1], x[0], x[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, x, z, y[1])
    if (faces.includes('b')) lid(part, x, z, y[0], false)
  }
  // the same with holes [along0, along1, y0, y1] cut out, along x (z faces) or z (x faces)
  const holedZ = (part: Part, z: number, x: Range, y: Range, holes: Hole[], s: number) => {
    const cut = holes.map(([h0, h1, a, c]): Hole => [h0 - x[0], h1 - x[0], a, c])
    for (const [p0, p1, a, c] of solidPieces(x[1] - x[0], y[0], y[1], cut))
      fz(part, z, x[0] + p0, x[0] + p1, a, c, s)
  }
  const holedX = (part: Part, x: number, z: Range, y: Range, holes: Hole[], s: number) => {
    const cut = holes.map(([h0, h1, a, c]): Hole => [h0 - z[0], h1 - z[0], a, c])
    for (const [p0, p1, a, c] of solidPieces(z[1] - z[0], y[0], y[1], cut))
      fx(part, x, z[0] + p0, z[0] + p1, a, c, s)
  }
  const paneX = (x: number, z: Range, y: Range, s: number) =>
    add('glass', glassQuad({ x, z: z[0] }, { x, z: z[1] }, y[0], y[1], { x: s, z: 0 }))
  const paneZ = (z: number, x: Range, y: Range, s: number) =>
    add('glass', glassQuad({ x: x[0], z }, { x: x[1], z }, y[0], y[1], { x: 0, z: s }))

  // the bay lines along the long sides, north to south
  const bay = (SOUTH - NORTH) / BAYS
  const lines = Array.from({ length: BAYS + 1 }, (_, i) => NORTH + i * bay)
  const rows = Array.from({ length: FLOORS }, (_, i) => GROUND + i * STOREY)

  // the long sides: spandrels on the wall line, the glass just behind, a fin out front at
  // every bay line from the ground (or the annex's roof) up under the band
  for (const [x, s] of [
    [WEST, -1],
    [EAST, 1],
  ] as const) {
    const zs: Range = [NORTH, SOUTH]
    for (const y of rows) {
      fx('spandrel', x, NORTH, SOUTH, y, y + SPANDREL, s)
      paneX(x - s * 0.05, zs, [y + SPANDREL, y + STOREY], s)
    }
    // the bit of wall between the top row and the band
    fx('spandrel', x, NORTH, SOUTH, GROUND + FLOORS * STOREY, BAND[0], s)
    for (const [i, z] of lines.entries()) {
      const w = i === 0 || i === BAYS ? CORNER : FIN_W / 2
      const [z0, z1] = [i === 0 ? z : z - w, i === BAYS ? z : z + w]
      const covered = x === EAST && z < ANNEX.z[1] + 0.5
      const y0 = covered ? ANNEX.top : 0
      const fin: Range = x === WEST ? [x - FIN, x] : [x, x + FIN]
      box('fin', fin, [z0, z1], [y0, BAND[0]], (s < 0 ? 'x' : 'X') + 'zZ')
    }
  }
  // the ground floor on piedmont ave: storefronts between the fins, a tan band over them
  for (let i = 0; i < BAYS; i++) paneX(WEST, [lines[i]!, lines[i + 1]!], [0, 4.2], -1)
  fx('fin', WEST, NORTH, SOUTH, 4.2, GROUND, -1)
  // the deck side south of the annex: tan wall with kenley's windows (2026 photo)
  const kenleys: Hole[] = [
    [-262, -255.6, 0.4, 3.4],
    [-251.6, -245.2, 0.4, 3.4],
  ]
  holedX('fin', EAST, [ANNEX.z[1], SOUTH], [0, GROUND], kenleys, 1)
  for (const [z0, z1, y0, y1] of kenleys) paneX(EAST, [z0, z1], [y0, y1], 1)

  // the ends: plain tan with ribs, the north end over the north wing
  const ribs = 10
  for (const [z, s, y0] of [
    [NORTH, -1, NORTH_WING.top],
    [SOUTH, 1, 0],
  ] as const) {
    if (s > 0) {
      const shops: Hole[] = [
        [WEST + 2.5, WEST + 9.5, 0.3, 4.2],
        [WEST + 11.5, EAST - 2.5, 0.3, 4.2],
      ]
      holedZ('fin', z, [WEST, EAST], [0, BAND[0]], shops, s)
      for (const [x0, x1, a, c] of shops) paneZ(z, [x0, x1], [a, c], s)
    } else fz('fin', z, WEST, EAST, y0, BAND[0], s)
    const step = (EAST - WEST - 2 * CORNER) / ribs
    for (let i = 1; i < ribs; i++) {
      const x = WEST + CORNER + i * step
      const fin: Range = s < 0 ? [z - 0.3, z] : [z, z + 0.3]
      box(
        'fin',
        [x - 0.13, x + 0.13],
        fin,
        [Math.max(y0, GROUND), BAND[0]],
        'xX' + (s < 0 ? 'z' : 'Z'),
      )
    }
    // the corner piers' faces on the ends
    const out: Range = s < 0 ? [z - FIN, z] : [z, z + FIN]
    box('fin', [WEST - FIN, WEST + CORNER], out, [y0, BAND[0]], s < 0 ? 'zX' : 'ZX')
    box('fin', [EAST - CORNER, EAST + FIN], out, [y0, BAND[0]], s < 0 ? 'zx' : 'Zx')
  }

  // the sign band, flush with the fins all round, the coping over it, the roof inside
  const bx: Range = [WEST - FIN, EAST + FIN]
  const bz: Range = [NORTH - FIN, SOUTH + FIN]
  box('band', bx, bz, BAND, 'xXzZb')
  box('fin', [bx[0] - 0.05, bx[1] + 0.05], [bz[0] - 0.05, bz[1] + 0.05], [BAND[1], TOP], 'xXzZb')
  const IN = 0.35
  const rx: Range = [bx[0] + IN, bx[1] - IN]
  const rz: Range = [bz[0] + IN, bz[1] - IN]
  lid('fin', rx, rz, ROOF)
  fx('fin', rx[0], rz[0], rz[1], ROOF, TOP, 1)
  fx('fin', rx[1], rz[0], rz[1], ROOF, TOP, -1)
  fz('fin', rz[0], rx[0], rx[1], ROOF, TOP, 1)
  fz('fin', rz[1], rx[0], rx[1], ROOF, TOP, -1)
  lid('fin', [bx[0] - 0.05, bx[1] + 0.05], [bz[0] - 0.05, rz[0]], TOP)
  lid('fin', [bx[0] - 0.05, bx[1] + 0.05], [rz[1], bz[1] + 0.05], TOP)
  lid('fin', [bx[0] - 0.05, rx[0]], [rz[0], rz[1]], TOP)
  lid('fin', [rx[1], bx[1] + 0.05], [rz[0], rz[1]], TOP)

  // gsu's name on the piedmont ave side, red under STATE, the logo a plain blue square at the
  // north end (and another at the top of the south end, 2021 photo)
  const band = (BAND[0] + BAND[1]) / 2
  const west = { x: bx[0] - 0.03, rot: -Math.PI / 2 }
  const word = (text: string, z: number) =>
    signs.push({
      ...west,
      y: band,
      z,
      text,
      letters: true,
      size: 3.3,
      wide: 1.15,
      color: '#2d3136',
      weight: 500,
    })
  word('GEORGIA', NORTH + 15.5)
  word('STATE', NORTH + 31)
  word('UNIVERSITY', NORTH + 50.5)
  signs.push(
    { ...west, y: band, z: NORTH + 4, text: '', width: 2.6, height: 2.9, plate: '#1f4b99' },
    {
      ...west,
      y: BAND[0] + 0.35,
      z: NORTH + 31,
      text: '',
      width: 9,
      height: 0.4,
      plate: '#c8202f',
    },
    {
      x: WEST + 3,
      y: band,
      z: bz[1] + 0.03,
      rot: 0,
      text: '',
      width: 2.6,
      height: 2.9,
      plate: '#1f4b99',
    },
  )

  // the annex: granite with a tan fascia, the lobby doors under the drop off canopy
  const ay: Range = [0, ANNEX.top - FASCIA]
  const lobby: Hole = [LOBBY[0], LOBBY[1], 0, 3.1]
  holedX('granite', ANNEX.x[1], ANNEX.z, ay, [lobby], 1)
  paneX(ANNEX.x[1] - 0.3, LOBBY, [0, 3.1], 1)
  fz('granite', LOBBY[0], ANNEX.x[1] - 0.3, ANNEX.x[1], 0, 3.1, 1)
  fz('granite', LOBBY[1], ANNEX.x[1] - 0.3, ANNEX.x[1], 0, 3.1, -1)
  lid('granite', [ANNEX.x[1] - 0.3, ANNEX.x[1]], LOBBY, 3.1, false)
  fz('granite', ANNEX.z[1], ANNEX.x[0], ANNEX.x[1], ...ay, 1)
  fz('granite', ANNEX.z[0], NORTH_WING.x[1], ANNEX.x[1], ...ay, -1)
  const fa: Range = [ANNEX.x[0], ANNEX.x[1] + 0.15]
  const fzr: Range = [ANNEX.z[0] - 0.15, ANNEX.z[1] + 0.15]
  box('fin', fa, fzr, [ay[1], ANNEX.top], 'XzZtb')
  // the north wing the same
  const wy: Range = [0, NORTH_WING.top - FASCIA]
  fz('granite', NORTH_WING.z[0], ...NORTH_WING.x, ...wy, -1)
  fx('granite', WEST, ...NORTH_WING.z, ...wy, -1)
  fx('granite', NORTH_WING.x[1], NORTH_WING.z[0], ANNEX.z[0], ...wy, 1)
  box(
    'fin',
    [WEST - 0.15, NORTH_WING.x[1] + 0.15],
    [NORTH_WING.z[0] - 0.15, NORTH],
    [wy[1], NORTH_WING.top],
    'xXztb',
  )
  box('fin', [EAST, NORTH_WING.x[1] + 0.15], [NORTH, ANNEX.z[0]], [wy[1], NORTH_WING.top], 'Xt')

  // the canopies on square tan columns, and the second floor out over the sidewalk with its
  // strip of windows
  box('fin', DROP.x, DROP.z, DROP.y, 'XzZtb')
  for (const z of [DROP.z[0] + 0.45, DROP.z[1] - 0.45])
    box('fin', [DROP.x[1] - 0.75, DROP.x[1] - 0.25], [z - 0.25, z + 0.25], [0, DROP.y[0]], 'xXzZ')
  // the ramp's canopy is a deep fascia with a dark strip in it (mapillary 2019)
  const band2: Hole = [RAMP.z[0] + 0.6, RAMP.z[1] - 0.6, 3.5, 4.3]
  holedX('fin', RAMP.x[0], RAMP.z, RAMP.y, [band2], -1)
  paneX(RAMP.x[0] + 0.05, [band2[0], band2[1]], [band2[2], band2[3]], -1)
  box('fin', RAMP.x, RAMP.z, RAMP.y, 'zZtb')
  for (const z of [RAMP.z[0] + 0.5, RAMP.z[1] - 0.5])
    box('fin', [RAMP.x[0], RAMP.x[0] + 0.6], [z - 0.3, z + 0.3], [0, RAMP.y[0]], 'xXzZ')
  const strip: Hole = [OVERHANG.z[0] + 1, OVERHANG.z[1] - 1, 5.6, 7.7]
  holedX('fin', OVERHANG.x[0], OVERHANG.z, OVERHANG.y, [strip], -1)
  paneX(OVERHANG.x[0] + 0.05, [strip[0], strip[1]], [strip[2], strip[3]], -1)
  box('fin', OVERHANG.x, OVERHANG.z, OVERHANG.y, 'zZtb')

  // the tower is empty over the ground floor and the glass doesn't cast: a block inside for
  // the shadows (landmark.ts core)
  const rect = (x: Range, z: Range): Point[] => [
    { x: x[0], z: z[0] },
    { x: x[1], z: z[0] },
    { x: x[1], z: z[1] },
    { x: x[0], z: z[1] },
  ]
  core('spandrel', rect([WEST + 0.3, EAST - 0.3], [NORTH + 0.3, SOUTH - 0.3]), CEILING, ROOF - 0.1)

  // inside the ground floor: piedmont ave's storefronts are glass
  insideWalls(inside, outline, door, (p, q) => p.x === WEST && q.x === WEST && p.z > NORTH - 0.01)

  return {
    parts: merged(),
    inside,
    signs,
    first: ['fin'],
    noShadow: ['glass', 'band'],
  }
}
