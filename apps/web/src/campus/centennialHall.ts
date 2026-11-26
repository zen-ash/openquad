import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  flat,
  glassQuad,
  inset,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// centennial hall, 100 auburn ave: atlanta life insurance's offices (~1980), gsu's since 2013
// (the president, the provost, the honors college, the welcome center). pink tan stone panels,
// ribbon windows on the long sides, and on auburn ave a frame: the stone corner block, the glass
// atrium under the top floor with the sign, a stone tower over the roof, the auditorium's drum
// in front of a recessed curtain wall. from usgs's lidar (2018), the commons photos (2020) and
// mapillary (2021-2022). sources: docs/reference/centennial-hall.md
//
// all square to the game's x/z. the ground is the plaza at the doors (307.5m), auburn ave's
// sidewalk is 2.5m lower and the east side 1-1.5m

export type CentennialHallData = {
  points: number[][]
  height: number
  door?: number[]
}

// stone the panels, shade the same stone in the deep recesses and under the soffits (and the
// roof), ribbon the dark windows, atrium the teal glass, metal the sign's band, mullions and
// the doors
export type Part = 'stone' | 'shade' | 'ribbon' | 'atrium' | 'metal'

type Range = readonly [number, number]
const P = (x: number, z: number): Point => ({ x, z })

// the box (lidar): its west, east, north and south faces. the ground floor on the north is
// 2m in behind columns
export const W = 137.2
export const E = 202.5
export const N = -206.9
export const S = -177.3
export const N_GLASS = -204.9
// auburn ave from the west: the corner block, the atrium (3.5m in behind its pier), the tower,
// the curtain wall behind the drum (2.5m in), the pier at the south east, a recess at the end
export const CORNER = 141.5
export const TOWER: Range = [155.5, 168]
export const ATRIUM_IN = -180.8
export const CURTAIN_IN = -179.8
export const SE_PIER: Range = [193.5, 198.5]
export const SE_IN = -179.3
// the tower reaches back to here over the roof (lidar)
const TOWER_BACK = -187

// heights over the plaza: five floors, a tall ground floor. the roof 326.4m, the parapet
// 327.5, the tower 328.1, the west end's sign fascia lower (lidar)
export const FLOORS = [0, 4.5, 8.2, 11.9, 15.6]
export const ROOF = 18.9
export const PARAPET = 20
export const TOWER_TOP = 20.6
export const WEST_TOP = 19.1
// the top floor on auburn ave: a stone band with a soffit under it, the ribbon set back, a deep
// fascia (commons 2020)
export const BAND: Range = [13.9, 16]
const RIBBON: Range = [16, 17.4]
// how far the band and the fascia stand out of the face
export const OUT = 1.2
// the drum: the auditorium, 313.3m at its parapet (lidar)
export const DRUM_TOP = 5.8
const DRUM = { x: 176.3, z: -170.5, r: 6.5 }
// the ribbon windows on the long sides, in each floor
const SILL = 1
const HEAD = 2.75
// the walkway roof out to the drive on the north (lidar 311.2-311.45)
const PORCH = { x: [150, 157] as Range, z: [-225, N] as Range, y: [3, 3.9] as Range }

// a straight face from p to q, o the side facing away from `inner`
function sideOf(p: Point, q: Point, inner: Point) {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  let o = { x: dir.z, z: -dir.x }
  if ((inner.x - p.x) * o.x + (inner.z - p.z) * o.z > 0) o = { x: -o.x, z: -o.z }
  const at = (u: number, d = 0) => P(p.x + dir.x * u + o.x * d, p.z + dir.z * u + o.z * d)
  return { p, q, len, dir, o, at }
}
type Side = ReturnType<typeof sideOf>

const MIDDLE = P(170, -192)

export function centennialHallGeometry(b: CentennialHallData) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null

  // holes wholly over or under the band are left out: solidPieces fills up to them
  const face = (part: Part, s: Side, y0: number, y1: number, holes: Hole[] = [], d = 0) => {
    const cut = holes.filter((h) => h[3] > y0 && h[2] < y1)
    for (const [u0, u1, v0, v1] of solidPieces(s.len, y0, y1, cut))
      add(part, wallQuad(s.at(u0, d), s.at(u1, d), v0, v1, s.o, u0))
  }
  // a hole's sides, sill and head `depth` deep, and its glass at the back
  const reveal = (part: Part, s: Side, h: Hole, depth: number, pane?: Part) => {
    const [u0, u1, v0, v1] = h
    add(part, wallQuad(s.at(u0), s.at(u0, -depth), v0, v1, s.dir))
    add(part, wallQuad(s.at(u1), s.at(u1, -depth), v0, v1, { x: -s.dir.x, z: -s.dir.z }))
    const rim = [s.at(u0), s.at(u1), s.at(u1, -depth), s.at(u0, -depth)]
    if (v0 > 0.01) add(part, flat(rim, v0))
    add(part, flat(rim, v1, false))
    if (pane) add(pane, glassQuad(s.at(u0, -depth), s.at(u1, -depth), v0, v1, s.o))
  }
  const pane = (part: Part, s: Side, u0: number, u1: number, y0: number, y1: number, d = 0) =>
    add(part, glassQuad(s.at(u0, d), s.at(u1, d), y0, y1, s.o))
  // a flat panel a hair out of a face
  const panel = (s: Side, u0: number, u1: number, y0: number, y1: number, d: number) =>
    add('metal', wallQuad(s.at(u0, d), s.at(u1, d), y0, y1, s.o))
  // walls round a box, its lid, and its underside if it's off the ground
  const box = (part: Part, x: Range, z: Range, y: Range, lid = true) => {
    const pts = [P(x[0], z[0]), P(x[1], z[0]), P(x[1], z[1]), P(x[0], z[1])]
    const mid = P((x[0] + x[1]) / 2, (z[0] + z[1]) / 2)
    for (let i = 0; i < 4; i++) {
      const s = sideOf(pts[i]!, pts[(i + 1) % 4]!, mid)
      add(part, wallQuad(s.p, s.q, y[0], y[1], s.o))
    }
    if (lid) add(part, flat(pts, y[1]))
    if (y[0] > 0.01) add(part, flat(pts, y[0], false))
  }
  // a box standing out of a face by `out` from u0 to u1: its front, ends, lid and underside
  const ledge = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    out: number,
  ) => {
    add(part, wallQuad(s.at(u0, out), s.at(u1, out), y0, y1, s.o, u0))
    add(part, wallQuad(s.at(u0), s.at(u0, out), y0, y1, { x: -s.dir.x, z: -s.dir.z }))
    add(part, wallQuad(s.at(u1), s.at(u1, out), y0, y1, s.dir))
    const rim = [s.at(u0), s.at(u1), s.at(u1, out), s.at(u0, out)]
    add(part, flat(rim, y1))
    add(part, flat(rim, y0, false))
  }
  const under = (part: Part, x: Range, z: Range, y: number) =>
    add(part, flat([P(x[0], z[0]), P(x[1], z[0]), P(x[1], z[1]), P(x[0], z[1])], y, false))
  const ribbons = (u0: number, u1: number, floors: number[]) =>
    floors.map((f): Hole => [u0, u1, f + SILL, f + HEAD])

  // the north side: four ribbons over a ground floor of glass 2m in behind square columns
  const north = sideOf(P(W, N), P(E, N), MIDDLE)
  const northHoles = ribbons(1.6, north.len - 1.6, FLOORS.slice(1))
  face('stone', north, FLOORS[1]!, PARAPET, northHoles)
  for (const h of northHoles) reveal('shade', north, h, 0.35, 'ribbon')
  under('shade', [W, E], [N, N_GLASS], FLOORS[1]!)
  const northGlass = sideOf(P(W, N_GLASS), P(E, N_GLASS), MIDDLE)
  panel(northGlass, 0, northGlass.len, FLOORS[1]! - 0.6, FLOORS[1]!, 0.02)
  pane('ribbon', northGlass, 0, northGlass.len, 0, FLOORS[1]! - 0.6)
  for (let i = 0; i <= 8; i++) {
    const x = W + 0.4 + (i * (E - W - 0.8)) / 8
    box('stone', [x - 0.4, x + 0.4], [N, N + 0.8], [0, FLOORS[1]!], false)
  }

  // the west side: ribbons like the north's, the corner block solid up to the band, the top
  // floor's ribbon round the corner. the ground floor has its own windows
  const west = sideOf(P(W, N), P(W, S), MIDDLE)
  const westHoles = [
    ...ribbons(1.6, west.len - (S - ATRIUM_IN) - 1.5, FLOORS.slice(1, 4)),
    [1.6, west.len - 1, RIBBON[0], RIBBON[1]] as Hole,
  ]
  face('stone', west, FLOORS[1]!, WEST_TOP, westHoles)
  for (const h of westHoles) reveal('shade', west, h, h[2] > 15 ? 0.6 : 0.35, 'ribbon')
  const westGround = sideOf(P(W, N_GLASS), P(W, S), MIDDLE)
  const westShops = Array.from({ length: 5 }, (_, i): Hole => [
    2 + i * 4.6,
    5.4 + i * 4.6,
    0.5,
    3.8,
  ])
  face('stone', westGround, 0, FLOORS[1]!, westShops)
  for (const h of westShops) reveal('shade', westGround, h, 0.3, 'ribbon')
  // the west parapet steps up to the main one behind the sign fascia's end
  face('stone', west, WEST_TOP, PARAPET, [[TOWER_BACK - N, west.len + 1, 0, 99]])

  // the east side, the same, open under the top floor at the south end. no door in it
  const east = sideOf(P(E, N), P(E, S), MIDDLE)
  const eastHoles = ribbons(1.6, east.len - 3.6, FLOORS.slice(1))
  face('stone', east, FLOORS[1]!, PARAPET, [...eastHoles, [SE_IN - N, east.len + 1, 0, BAND[0]]])
  for (const h of eastHoles) reveal('shade', east, h, 0.35, 'ribbon')
  const eastGround = sideOf(P(E, N_GLASS), P(E, SE_IN), MIDDLE)
  const eastShops = Array.from({ length: 5 }, (_, i): Hole => [
    2 + i * 4.6,
    5.4 + i * 4.6,
    0.5,
    3.8,
  ])
  face('stone', eastGround, 0, FLOORS[1]!, eastShops)
  for (const h of eastShops) reveal('shade', eastGround, h, 0.3, 'ribbon')

  // auburn ave. the corner block, solid up to the band
  const south = (x0: number, x1: number) => sideOf(P(x0, S), P(x1, S), MIDDLE)
  face('stone', south(W, CORNER), 0, BAND[0])
  // the atrium: its sides, the glass in front of it in tall panes, a soffit, the free pier
  face('shade', sideOf(P(CORNER, S), P(CORNER, ATRIUM_IN), P(139, -179)), 0, BAND[0])
  face('shade', sideOf(P(TOWER[0], S), P(TOWER[0], ATRIUM_IN), P(160, -179)), 0, BAND[0])
  const atrium = sideOf(P(CORNER, ATRIUM_IN), P(TOWER[0], ATRIUM_IN), MIDDLE)
  pane('atrium', atrium, 0, atrium.len, 0, BAND[0])
  // the revolving door's drum and the frame over the doors (commons 2020)
  panel(atrium, 2.8, 6.2, 2.9, 3.3, 0.04)
  under('shade', [CORNER, TOWER[0]], [ATRIUM_IN, S], BAND[0])
  box('stone', [149.2, 150.8], [S - 1.6, S], [0, BAND[0]], false)

  // the tower, up through the roof, with one narrow slot of dark glass
  const tower = south(TOWER[0], TOWER[1])
  const slot: Hole = [5.4, 7, 1, ROOF - 1.6]
  face('stone', tower, 0, ROOF, [slot])
  reveal('shade', tower, slot, 0.6, 'ribbon')
  box('stone', [TOWER[0], TOWER[1]], [TOWER_BACK, S], [ROOF, TOWER_TOP])
  face('shade', sideOf(P(TOWER[1], S), P(TOWER[1], CURTAIN_IN), P(165, -178)), 0, BAND[0])

  // the curtain wall behind the drum, a pane a floor
  const curtain = sideOf(P(TOWER[1], CURTAIN_IN), P(SE_PIER[0], CURTAIN_IN), MIDDLE)
  const cuts = [0, FLOORS[1]!, FLOORS[2]!, FLOORS[3]!, BAND[0]]
  for (let i = 1; i < cuts.length; i++)
    pane('ribbon', curtain, 0, curtain.len, cuts[i - 1]!, cuts[i]!)
  under('shade', [TOWER[1], SE_PIER[0]], [CURTAIN_IN, S], BAND[0])
  // the pier at the south east, and the recessed stone at the end under the top floor
  face('shade', sideOf(P(SE_PIER[0], S), P(SE_PIER[0], CURTAIN_IN), P(196, -178)), 0, BAND[0])
  face('stone', south(SE_PIER[0], SE_PIER[1]), 0, BAND[0])
  face('shade', sideOf(P(SE_PIER[1], S), P(SE_PIER[1], SE_IN), P(196, -178)), 0, BAND[0])
  face('shade', sideOf(P(SE_PIER[1], SE_IN), P(E, SE_IN), MIDDLE), 0, BAND[0])
  under('shade', [SE_PIER[1], E], [SE_IN, S], BAND[0])

  // the top floor on both sides of the tower: the band and the fascia stand OUT over auburn ave
  // with soffits under them, the ribbon set back between them (commons 2020)
  for (const [x0, x1, top] of [
    [W, TOWER[0], WEST_TOP],
    [TOWER[1], E, PARAPET],
  ] as const) {
    const s = south(x0, x1)
    ledge('stone', s, 0, s.len, BAND[0], RIBBON[0], OUT)
    ledge('stone', s, 0, s.len, RIBBON[1], top, OUT)
    pane('ribbon', s, 0, s.len, RIBBON[0], RIBBON[1], OUT - 0.5)
  }

  // the roof and the parapet's inside, the coping on top
  add('shade', flat([P(W, N), P(E, N), P(E, S), P(W, S)], ROOF))
  const ring: [Point, Point, number][] = [
    [P(W, N), P(E, N), PARAPET],
    [P(E, N), P(E, S), PARAPET],
    [P(E, S), P(TOWER[1], S), PARAPET],
    [P(TOWER[0], S), P(W, S), WEST_TOP],
    [P(W, S), P(W, TOWER_BACK), WEST_TOP],
    [P(W, TOWER_BACK), P(W, N), PARAPET],
  ]
  for (const [p, q, top] of ring) {
    const s = sideOf(p, q, MIDDLE)
    add('stone', wallQuad(s.at(0, -0.3), s.at(s.len, -0.3), ROOF, top, { x: -s.o.x, z: -s.o.z }))
    add('stone', flat([s.at(0), s.at(s.len), s.at(s.len, -0.3), s.at(0, -0.3)], top))
  }
  // the step up from the sign fascia's parapet to the main one
  add(
    'stone',
    wallQuad(P(W, TOWER_BACK), P(W + 0.3, TOWER_BACK), WEST_TOP, PARAPET, { x: 0, z: 1 }),
  )

  // the drum: plain stone all round, nothing in it
  const arc = Array.from({ length: 9 }, (_, i) => {
    const t = Math.PI / 2 + (i / 8) * (Math.PI / 2)
    return P(DRUM.x + Math.cos(t) * DRUM.r, DRUM.z + Math.sin(t) * DRUM.r)
  })
  const drum = [P(192.6, CURTAIN_IN), P(192.6, -164.1), ...arc, P(169.8, CURTAIN_IN)]
  drum.forEach((p, i) => {
    if (i === drum.length - 1) return
    const s = sideOf(p, drum[i + 1]!, P(181, -172))
    add('stone', wallQuad(s.p, s.q, 0, DRUM_TOP, s.o))
  })
  add('shade', flat(drum, DRUM_TOP))

  // the walkway roof out to the drive on the north, on four columns
  box('stone', PORCH.x, PORCH.z, PORCH.y)
  for (const z of [-224.4, -214.5])
    for (const x of [150.6, 156.4])
      box('stone', [x - 0.4, x + 0.4], [z - 0.4, z + 0.4], [0, PORCH.y[0]], false)

  // the sign on the top floor over the atrium: dark letters on a light grey band, the red bar
  // under STATE, and a blue square where gsu's logo stands on the corner (commons 2020)
  panel(south(W, TOWER[0]), 1.3, 17.1, RIBBON[1] + 0.15, WEST_TOP - 0.15, OUT + 0.04)
  signs.push({
    x: (W + TOWER[0]) / 2 + 0.6,
    y: (RIBBON[1] + WEST_TOP) / 2 + 0.05,
    z: S + OUT + 0.08,
    rot: 0,
    text: 'GEORGIA STATE UNIVERSITY',
    letters: true,
    size: 0.95,
    color: '#26292e',
    weight: 700,
  })
  signs.push({
    x: 145.2,
    y: RIBBON[1] + 0.32,
    z: S + OUT + 0.07,
    rot: 0,
    text: '',
    plate: '#c8432d',
    width: 2.4,
    height: 0.16,
  })
  signs.push({
    x: W + 2.2,
    y: WEST_TOP + 1.05,
    z: S + OUT - 0.4,
    rot: 0,
    text: '',
    plate: '#2453b8',
    width: 1.9,
    height: 2.1,
  })
  // the small name plate by the doors
  signs.push({
    x: W + 2.2,
    y: 2.8,
    z: S + 0.03,
    rot: 0,
    text: 'CENTENNIAL HALL',
    plate: '#c9d3df',
    scale: 0.6,
  })

  // the hidden block that stops a low sun shining in one side's ribbons and out the other's
  // (landmark.ts core). it stays behind the atrium's and the curtain wall's glass
  core(
    'stone',
    inset(
      [
        P(W, N_GLASS),
        P(E, N_GLASS),
        P(E, SE_IN),
        P(SE_PIER[0], SE_IN),
        P(SE_PIER[0], CURTAIN_IN),
        P(TOWER[1], CURTAIN_IN),
        P(TOWER[1], S),
        P(TOWER[0], S),
        P(TOWER[0], ATRIUM_IN),
        P(CORNER, ATRIUM_IN),
        P(CORNER, S),
        P(W, S),
      ],
      0.6,
    ),
    CEILING,
    ROOF - 0.1,
  )
  // and in the top floor out to the face over the atrium and the curtain wall
  const strip = [P(W, ATRIUM_IN - 1), P(E, ATRIUM_IN - 1), P(E, S), P(W, S)]
  core('stone', inset(strip, 0.3), BAND[0] + 0.1, ROOF - 0.1)

  // inside the ground floor: glass on the north and the atrium, the rest stone with windows
  const glassy = (p: Point, q: Point) =>
    (p.z === N_GLASS && q.z === N_GLASS) || (p.z === ATRIUM_IN && q.z === ATRIUM_IN)
  insideWalls(inside, outline, door, glassy)

  return {
    parts: merged(),
    inside,
    signs,
    first: ['stone'],
    noShadow: ['ribbon', 'atrium', 'metal'],
  }
}
