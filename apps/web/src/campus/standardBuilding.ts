import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import { flat, frame, glassQuad, insideWalls, parts as collect, type Hole } from './landmark'
import { kit, placer, rect, type Range } from './haasHowell'

// the standard building (gsu's school of music), 95 luckie st at fairlie st in fairlie-poplar,
// 1923. eleven floors: two of cream painted stone with the entrance on fairlie st ("school of
// music" on its transom), eight of red brown brick with white sash windows (one, two, one,
// two, one across fairlie st), a white band, an attic floor and a deep white cornice on
// brackets on the two streets. the back and the alley side are plainer, lighter brick. from
// usgs's lidar (2018) and photos (2019-2020 commons, gsu's 2022 and 2026).
// sources: docs/reference/standard-building.md
//
// drawn square in its own frame like haasHowell.ts: x along fairlie st from the alley corner
// to luckie st, z in from fairlie st (-z is the street). the ground is fairlie st at the doors
// (320.5m), it's within 0.5m all round

export type StandardData = {
  points: number[][]
  height: number
  door?: number[]
}

// brick the street faces and the penthouse, common the plain back and alley sides, stone the
// cream ground floors and the sills, white the cornice, the bands and the roof's plant room,
// glass the sash windows, store the ground floor's glass
export type Part = 'brick' | 'common' | 'stone' | 'white' | 'glass' | 'store'

// the outline's fairlie st corners (the alley one, the luckie st one). the street faces stand
// FACE out of it (the outline is the glass line). the back is where the lidar has it, 1.3m
// past osm's line (that strip is over the theatrical outfit's roof)
export const ALLEY_CORNER = { x: -414.7, z: -321.8 }
export const LUCKIE_CORNER = { x: -392.9, z: -340.2 }
export const FACE = -0.3
export const BACK = 12.5
// its last 4.7m to luckie st steps out 0.9m more (the lidar, and the 2019 photo over the
// theatrical outfit)
export const BAY = { x: 23.8, z: 13.4 }
const SASH = 0.22

// heights over the doors (lidar: the roof 360.5m, the cornice's top 362.2, the elevator's
// penthouse 365.1, the plant room 363.7)
export const SECOND: Range = [6.4, 8.6]
const BELT: Range = [9.4, 9.85]
// eight brick floors of 3.2m (gsu's photo from the deck across fairlie st, scaled by the
// width of the front)
export const FLOOR = 3.2
export const ROWS: Range[] = Array.from({ length: 8 }, (_, k): Range => {
  const y = BELT[1] + k * FLOOR + 0.75
  return [y, y + 2.1]
})
const BAND: Range = [35.8, 36.15]
export const ATTIC: Range = [36.5, 38.3]
const BED: Range = [38.6, 39]
const BRACKET: Range = [39, 40.7]
const CORONA: Range = [40.7, 41.7]
export const ROOF = 40
export const TOP = CORONA[1]
export const PENTHOUSE = { x: [1.5, 8.5] as Range, z: [2.5, 12] as Range, top: 44.6 }
const PLANT = { x: [9.5, 19] as Range, z: [6, 12] as Range, top: 43.2 }

// fairlie st: a single, a pair, a single, a pair, a single (symmetric)
const WIDE = 1.8
const pairAt = (m: number): Range[] => [
  [m - 1.2 - WIDE / 2, m - 1.2 + WIDE / 2],
  [m + 1.2 - WIDE / 2, m + 1.2 + WIDE / 2],
]
const singleAt = (m: number): Range[] => [[m - WIDE / 2, m + WIDE / 2]]
export const DOOR_BAY = 14.27
export const FAIRLIE = [
  ...singleAt(3.3),
  ...pairAt(8.5),
  ...singleAt(DOOR_BAY),
  ...pairAt(20.04),
  ...singleAt(25.23),
]
// the entrance in the middle under the single window: the outline has a notch for it, the
// doors 1m in
export const ENTRANCE: Range = [13.1, 15.44]
export const VESTIBULE = 1
// luckie st: two pairs. the back: eight windows a floor, the alley side three
const LUCKIE = [2.3, 4.6, 7.9, 10.2]
const BACK_WINDOWS = [3.5, 10, 19, 24.8]
const ALLEY = [2.6, 6.25, 9.9]

export function standardGeometry(b: StandardData) {
  const { add, core, inside, merged } = collect<Part>()
  const { fz, fx, lid, box, holedZ, holedX, revealZ, revealX } = kit<Part>(add)
  const signs: Sign[] = []
  const f = frame(ALLEY_CORNER, LUCKIE_CORNER)
  const place = placer(f, ALLEY_CORNER)
  const LEN = f.len
  const outline = b.points.map(([x, z]) => place.local({ x: x!, z: z! }))
  const door = b.door ? place.local({ x: b.door[0]!, z: b.door[1]! }) : null
  // the faces: fairlie st at z W, luckie st at x E, the alley at x 0, the back at z BACK
  const W = FACE
  const E = LEN - FACE

  // fairlie st's ground floor: the entrance, big windows under the pairs, smaller ones under
  // the singles. cream stone
  const big = (r: Range[]): Hole => [r[0]![0] - 0.25, r[1]![1] + 0.25, 0.75, 4.6]
  const groundWindows: Hole[] = [
    [3.3 - 0.9, 3.3 + 0.9, 0.75, 4.6],
    big(pairAt(8.5)),
    big(pairAt(20.04)),
    [25.23 - 0.9, 25.23 + 0.9, 0.75, 4.6],
  ]
  const entrance: Hole = [ENTRANCE[0], ENTRANCE[1], 0, 3.75]
  holedZ('stone', W, 0, E, 0, SECOND[0] - 0.5, [...groundWindows, entrance], -1)
  for (const h of groundWindows) revealZ('stone', h, W, 0, 'store')
  // the entrance: its sides and head back to the doors, the doors and the transom
  revealZ('stone', entrance, W, VESTIBULE)
  const doors: Hole = [13.45, 15.09, 0, 2.7]
  const transom: Hole = [13.3, 15.24, 2.85, 3.6]
  holedZ('stone', VESTIBULE, ENTRANCE[0], ENTRANCE[1], 0, 3.75, [doors, transom], -1)
  for (const [x0, x1, y0, y1] of [doors, transom])
    add(
      'store',
      glassQuad({ x: x0, z: VESTIBULE }, { x: x1, z: VESTIBULE }, y0, y1, { x: 0, z: -1 }),
    )
  signs.push({
    ...place.point(DOOR_BAY, VESTIBULE - 0.02),
    y: 3.22,
    rot: place.rot(0, -1),
    text: 'SCHOOL OF MUSIC',
    letters: true,
    size: 0.24,
    color: '#f2efe6',
    weight: 600,
  })

  // the second floor, the belt over it
  const second = FAIRLIE.map(([x0, x1]): Hole => [x0, x1, ...SECOND])
  holedZ('stone', W, 0, E, SECOND[0] - 0.5, BELT[0], second, -1)
  for (const h of second) revealZ('stone', h, W, W + SASH, 'glass')
  box('white', [0, E + 0.15], [W - 0.15, W], BELT, 'xXztb')

  // brick up to the cornice: eight floors with a stone sill under each window, the band,
  // the attic
  const upper = FAIRLIE.flatMap(([x0, x1]) => [...ROWS, ATTIC].map((r): Hole => [x0, x1, ...r]))
  holedZ('brick', W, 0, E, BELT[1], BED[0], upper, -1)
  for (const h of upper) {
    revealZ('brick', h, W, W + SASH, 'glass')
    if (h[2] < ATTIC[0])
      box('stone', [h[0] - 0.08, h[1] + 0.08], [W - 0.06, W], [h[2] - 0.12, h[2]], 'xXztb')
  }
  box('white', [0, E + 0.1], [W - 0.1, W], BAND, 'xXztb')

  // luckie st: two big windows on the ground floor, two pairs of windows over them
  const lGround: Hole[] = [
    [1.2, 5.7, 0.6, 4.6],
    [7, 11.4, 0.6, 4.6],
  ]
  holedX('stone', E, W, BAY.z, 0, SECOND[0] - 0.5, lGround, 1)
  for (const h of lGround) revealX('stone', h, E, LEN, 'store')
  const lWindows = LUCKIE.map((m): Range => [m - 0.68, m + 0.68])
  const lSecond = lWindows.map(([z0, z1]): Hole => [z0, z1, ...SECOND])
  holedX('stone', E, W, BAY.z, SECOND[0] - 0.5, BELT[0], lSecond, 1)
  for (const h of lSecond) revealX('stone', h, E, E - SASH, 'glass')
  box('white', [E, E + 0.15], [W, BAY.z], BELT, 'XZtb')
  const lUpper = lWindows.flatMap(([z0, z1]) => [...ROWS, ATTIC].map((r): Hole => [z0, z1, ...r]))
  holedX('brick', E, W, BAY.z, BELT[1], BED[0], lUpper, 1)
  for (const h of lUpper) {
    revealX('brick', h, E, E - SASH, 'glass')
    if (h[2] < ATTIC[0])
      box('stone', [E, E + 0.06], [h[0] - 0.08, h[1] + 0.08], [h[2] - 0.12, h[2]], 'XzZtb')
  }
  box('white', [E, E + 0.1], [W, BAY.z], BAND, 'XZtb')

  // the back over the theatrical outfit and the alley side: plain lighter brick to the
  // parapet, the cornice only on the two streets
  const PARAPET = TOP
  const back = BACK_WINDOWS.flatMap((m) =>
    [...ROWS.slice(1), ATTIC].map((r): Hole => [m - 0.65, m + 0.65, ...r]),
  )
  const inBay = (h: Hole) => h[0] > BAY.x
  holedZ(
    'common',
    BACK,
    0,
    BAY.x,
    0,
    PARAPET,
    back.filter((h) => !inBay(h)),
    1,
  )
  holedZ('common', BAY.z, BAY.x, E, 0, PARAPET, back.filter(inBay), 1)
  fx('common', BAY.x, BACK, BAY.z, 0, PARAPET, -1)
  for (const h of back) {
    const z = inBay(h) ? BAY.z : BACK
    revealZ('common', h, z, z - SASH, 'glass')
  }
  const alley = ALLEY.flatMap((m) =>
    [SECOND, ...ROWS, ATTIC].map((r): Hole => [m - 0.65, m + 0.65, ...r]),
  )
  holedX('common', 0, W, BACK, 0, PARAPET, alley, -1)
  for (const h of alley) revealX('common', h, 0, SASH, 'glass')
  // where the street cornice stops, the parapet's coping, the cornice's ends
  const IN = 0.3
  lid('stone', [0, BAY.x + IN], [BACK - IN, BACK], PARAPET)
  lid('stone', [BAY.x, BAY.x + IN], [BACK, BAY.z], PARAPET)
  lid('stone', [BAY.x + IN, E - IN], [BAY.z - IN, BAY.z], PARAPET)
  lid('stone', [0, IN], [W + IN, BACK - IN], PARAPET)
  fz('common', BACK - IN, IN, BAY.x + IN, ROOF, PARAPET, -1)
  fx('common', BAY.x + IN, BACK - IN, BAY.z - IN, ROOF, PARAPET, 1)
  fz('common', BAY.z - IN, BAY.x + IN, E - IN, ROOF, PARAPET, -1)
  fx('common', IN, W + IN, BACK - IN, ROOF, PARAPET, 1)

  // the cornice: a bed moulding, big brackets every 0.8m, the deep corona. painted white
  const OUT = 0.85
  box('white', [0, E + 0.3], [W - 0.3, W], BED, 'xzb')
  box('white', [E, E + 0.3], [W, BAY.z], BED, 'XZb')
  fz('white', W - 0.3, 0, E + 0.3, BED[1], CORONA[0], -1)
  fx('white', E + 0.3, W - 0.3, BAY.z, BED[1], CORONA[0], 1)
  box('white', [0, E + OUT], [W - OUT, W], CORONA, 'xzb')
  box('white', [E, E + OUT], [W, BAY.z], CORONA, 'XZb')
  for (let x = E + 0.3 - 0.45; x > 0.3; x -= 0.8)
    box('white', [x - 0.12, x + 0.12], [W - OUT + 0.1, W - 0.3], BRACKET, 'xXzb')
  for (let z = W - 0.3 + 0.45; z < BAY.z - 0.3; z += 0.8)
    box('white', [E + 0.3, E + OUT - 0.1], [z - 0.12, z + 0.12], BRACKET, 'XzZb')
  fx('white', 0, W - OUT, W, BED[0], TOP, -1)
  fz('white', BAY.z, E, E + OUT, BED[0], TOP, 1)
  lid('white', [0, E + OUT], [W - OUT, W + 0.3], TOP)
  lid('white', [E - 0.3, E + OUT], [W + 0.3, BAY.z], TOP)
  // the parapet's inside, the roof
  fz('white', W + 0.3, 0.3, E - 0.3, ROOF, TOP, 1)
  fx('white', E - 0.3, W + 0.3, BAY.z - 0.3, ROOF, TOP, -1)
  lid('stone', [0.3, E - 0.3], [W + 0.3, BACK - 0.3], ROOF)
  lid('stone', [BAY.x + 0.3, E - 0.3], [BACK - 0.3, BAY.z - 0.3], ROOF)

  // the elevator's penthouse at the alley end and the plant room
  const P = PENTHOUSE
  box('brick', P.x, P.z, [ROOF, P.top - 0.3], 'xXzZ')
  box('stone', [P.x[0] - 0.05, P.x[1] + 0.05], [P.z[0] - 0.05, P.z[1] + 0.05], [P.top - 0.3, P.top])
  box('white', PLANT.x, PLANT.z, [ROOF, PLANT.top], 'xXzZt')
  // their walls from the inside too: the shadow pass only draws the faces turned away from
  // the sun, so a hollow box on the roof let it in on its sunny side
  for (const r of [P, PLANT]) {
    fx('white', r.x[0] + 0.01, r.z[0], r.z[1], ROOF, r.top - 0.3, 1)
    fx('white', r.x[1] - 0.01, r.z[0], r.z[1], ROOF, r.top - 0.3, -1)
    fz('white', r.z[0] + 0.01, r.x[0], r.x[1], ROOF, r.top - 0.3, 1)
    fz('white', r.z[1] - 0.01, r.x[0], r.x[1], ROOF, r.top - 0.3, -1)
  }

  // a block just inside the walls for the shadows (landmark.ts core)
  const c = SASH + 0.15
  core('brick', rect([c, E - c], [W + c, BACK - c]), CEILING, ROOF - 0.1)
  // the strip behind osm's back line has no inside ceiling under the core: close it
  add('brick', flat(rect([c, E - c], [10.9, BACK - c]), CEILING, false))

  // inside the ground floor: fairlie st and luckie st are glass
  const onStreet = (p: Point, q: Point) =>
    (Math.abs(p.z) < 0.1 && Math.abs(q.z) < 0.1) || (p.x > LEN - 0.2 && q.x > LEN - 0.2)
  insideWalls(inside, outline, door, onStreet)

  const parts = merged()
  for (const g of Object.values(parts)) place.geo(g)
  for (const g of [...inside.solid, ...inside.glass]) place.geo(g)

  return {
    parts,
    inside,
    signs,
    first: ['stone', 'brick'],
    noShadow: ['glass', 'store'],
  }
}
