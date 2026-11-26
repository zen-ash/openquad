import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  edges,
  flat,
  glassQuad,
  inset,
  insideWalls,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// piedmont central (gsu housing and the dining hall, opened aug 2016), on john wesley dobbs ave
// at piedmont ave. an 11 storey u of rooms round a court open to the south: tan panels with
// tall blue stripes between pairs of windows, red brick up to the 8th floor on the wings and
// the street sides, a brick core over the main doors, a taller tan block on the north east
// corner with a two storey glass corner. the one storey dining hall fills the court's east
// half: glass under a blue band, a curved glass clerestory on its roof, a brick box at its
// east end, and since 2026 a deep canopy along its front and the core's foot. from usgs's
// lidar (2018), gsu's photos (2016-2021 and nov 2026) and mapillary (2019, 2022). sources:
// docs/reference/piedmont-central.md
//
// the ground is the court at the main doors (305.4m)

export type PiedmontCentralData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { upper?: number[][] }
}

// tan is the panels, the parapets and the roofs, brick the brick, blue the stripes and the
// dining hall's band, glass the room windows, store the ground floor's glass, metal the
// canopy, the clerestory and the screen round the roof's machinery
export type Part = 'tan' | 'brick' | 'blue' | 'glass' | 'store' | 'metal'

type Range = readonly [number, number]

// heights over the court. a tall ground floor, then 10 floors of rooms and a tall parapet about
// 3m over the top windows (photos: the floors measured against the court's 23.6m back wall;
// lidar: the parapets 344.1m, the corner block, the stair towers and the screen 347.3)
export const GROUND = 6.6
export const FLOOR = 2.95
export const FLOORS = 10
export const ROOF = GROUND + FLOORS * FLOOR
export const PARAPET = 38.7
export const TALL = 41.9
// a window in each floor (photos: about 1.5 x 1.85m), set this far in
const SILL = 0.55
const HEAD = 2.4
const DEPTH = 0.15
// the stripes: a window each side of a blue panel, every 6.2m or so (4 across the court's
// back wall west of the core, 5 east of it)
export const WIN = 1.5
export const BLUE = 1.15
export const BAY = 6.2
// half the pair of windows up the middle of the wings' ends and the core
const PAIR = 1.6
// the brick goes up to the 8th floor, tan over it (the core over the doors to the 9th)
const BRICK_FLOORS = 7
// the dining hall's band and roof, the brick box at its east end a little taller, and the
// clerestory on its roof
export const DINING = 5.0
const BAND = 3.3
export const BOX = 5.6
const CLERESTORY = 7

type Face = {
  look: 'groups' | 'column' | 'ribbon' | 'plain'
  // a tan edge this wide down both sides (the core's brick is a panel in a tan frame)
  edge?: number
  brick: boolean
  ground: 'brick' | 'store' | 'court' | 'doors'
  top?: number
  floors?: number
}

// the tower's faces, the same order as `upper` in build-campus.mjs
export const FACES: Face[] = [
  // the west wing's south end, with a notch in its corner
  { look: 'plain', brick: true, ground: 'brick' },
  { look: 'plain', brick: true, ground: 'brick' },
  { look: 'column', brick: true, ground: 'brick' },
  // round the court
  { look: 'groups', brick: true, ground: 'court' },
  { look: 'groups', brick: false, ground: 'court' },
  // the brick core over the doors, up to the screen's height
  { look: 'plain', brick: true, ground: 'brick', top: TALL },
  { look: 'column', brick: true, ground: 'doors', top: TALL, floors: 8, edge: 0.35 },
  { look: 'plain', brick: true, ground: 'brick', top: TALL },
  // behind the dining hall, and the east wing's side over it
  { look: 'groups', brick: false, ground: 'court' },
  { look: 'groups', brick: true, ground: 'brick' },
  // the east wing's south end
  { look: 'column', brick: true, ground: 'brick' },
  // the piedmont ave side, then the corner block (its two street faces and its step back)
  { look: 'groups', brick: true, ground: 'brick' },
  { look: 'ribbon', brick: false, ground: 'store', top: TALL },
  { look: 'ribbon', brick: false, ground: 'store', top: TALL },
  { look: 'plain', brick: false, ground: 'store', top: TALL },
  // john wesley dobbs ave (shop fronts at the east end, brick at the west), the west side
  { look: 'groups', brick: true, ground: 'store' },
  { look: 'groups', brick: true, ground: 'brick' },
  { look: 'groups', brick: true, ground: 'brick' },
]

// the corner block over the roof, the stair tower on the east wing's south end, the screen
// round the machinery on the north bar (lidar), in game x and z
export const CORNER = { x: [267.5, 280.8] as Range, z: [-313, -297] as Range }
export const STAIR = { x: [269, 280.65] as Range, z: [-283.5, -276.15] as Range }
export const SCREEN = { x: [202.5, 230] as Range, z: [-311.2, -295.7] as Range }
// the core's front, x
const CORE: Range = [221, 230]
// the dining hall: its glass part and the brick box, and the canopy round its glass
const HALL_X: Range = [226.2, 243]
const BOX_X: Range = [243, 264.2]
const DOCK_X = 251.7
const HALL_FRONT = -276
const DOCK_FRONT = -278.5
const BACK = -295.7
export const CANOPY = { out: 3.2, to: -294.8, end: 236, y: [3.2, 4.1] as Range }

const floorAt = (k: number) => GROUND + k * FLOOR

// what a face's window openings are, and the bits of wall that go tan on a brick face
function openings(face: Face, len: number, door: number | null) {
  const rooms: Hole[] = []
  const stripes: Hole[] = []
  const ground: Hole[] = []
  const tan: Range[] = []
  const each = (s0: number, s1: number) => {
    for (let k = 0; k < FLOORS; k++) rooms.push([s0, s1, floorAt(k) + SILL, floorAt(k) + HEAD])
  }
  if (face.look === 'groups' && len > 6) {
    const n = Math.max(1, Math.round(len / BAY))
    for (let i = 0; i < n; i++) {
      const c = ((i + 0.5) * len) / n
      const b0 = c - BLUE / 2
      const b1 = c + BLUE / 2
      stripes.push([b0, b1, floorAt(0) + SILL, floorAt(FLOORS - 1) + HEAD])
      each(b0 - WIN, b0)
      each(b1, b1 + WIN)
      ground.push([b0 - WIN, b0, 1, 4.4], [b1, b1 + WIN, 1, 4.4])
    }
  }
  if (face.look === 'column') {
    // a pair of windows in a tan strip up the middle
    const c = len / 2
    each(c - PAIR, c + PAIR)
    tan.push([c - PAIR - 0.25, c + PAIR + 0.25])
    if (face.ground !== 'doors') ground.push([c - PAIR, c + PAIR, 1, 4.4])
  }
  // glass under the core, on the court side (the rest of it stands on the dining hall)
  if (face.ground === 'doors') ground.push([0.6, 4.6, 0, 3.6])
  if (face.edge) tan.push([0, face.edge], [len - face.edge, len])
  // the main doors in place of the windows there
  if (door !== null) {
    const keep = ground.filter((h) => h[1] < door - 1.5 || h[0] > door + 1.5)
    ground.splice(0, ground.length, ...keep, [door - 1.4, door + 1.4, 0, 3])
  }
  if (face.look === 'ribbon') {
    // wide windows between narrow piers
    const n = Math.max(1, Math.round((len - 1.4) / 6))
    const w = (len - 1.4) / n
    for (let i = 0; i < n; i++) {
      const s = 0.7 + i * w
      for (let k = 0; k < FLOORS; k++)
        rooms.push([s + 0.25, s + w - 0.25, floorAt(k) + 0.6, floorAt(k) + 2.9])
    }
  }
  if (face.ground === 'store') {
    // glass between tan piers, the corner block's glass goes up two floors
    const n = Math.max(1, Math.round(len / 6.5))
    const w = len / n
    const top = face.look === 'ribbon' ? floorAt(1) - 0.5 : 5.2
    ground.length = 0
    for (let i = 0; i < n; i++) ground.push([i * w + 0.45, (i + 1) * w - 0.45, 0, top])
    if (face.look === 'ribbon') rooms.splice(0, rooms.length, ...rooms.filter((h) => h[2] > top))
  }
  return { rooms, stripes, ground, tan }
}

export function piedmontCentralGeometry(b: PiedmontCentralData) {
  const { add, prism, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(pt)
  const upper = (b.landmark?.upper ?? b.points).map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const rect = (x: Range, z: Range): Point[] => [
    { x: x[0], z: z[0] },
    { x: x[1], z: z[0] },
    { x: x[1], z: z[1] },
    { x: x[0], z: z[1] },
  ]

  // where a face stands on the dining hall's roof instead of the ground
  const footOf = (p: Point) => {
    if (p.z < BACK - 0.05 || p.z > HALL_FRONT - 0.05) return 0
    if (p.x > HALL_X[0] + 0.05 && p.x < BOX_X[0]) return DINING
    const front = p.x < DOCK_X ? HALL_FRONT : DOCK_FRONT
    if (p.x >= BOX_X[0] && p.x < BOX_X[1] + 0.05 && p.z < front - 0.05) return BOX
    return 0
  }

  const faces = edges(upper)
  faces.forEach(({ p, len, dir, out }, i) => {
    const face = FACES[i]!
    const top = face.top ?? PARAPET
    const at = (s: number, k = 0) => ({
      x: p.x + dir.x * s - out.x * k,
      z: p.z + dir.z * s - out.z * k,
    })
    // the door on this face, if it's here
    const t = door ? (door.x - p.x) * dir.x + (door.z - p.z) * dir.z : -1
    const onFace =
      door && t > 0 && t < len && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
    const { rooms, stripes, ground, tan } = openings(face, len, onFace ? t : null)
    // the wall's foot along it: on the ground, or on the dining hall where it's in front
    const cuts = [0, len]
    for (const x of [HALL_X[0], BOX_X[0], BOX_X[1]])
      if (Math.abs(dir.x) > 0.5) cuts.push((x - p.x) / dir.x)
    for (const z of [BACK, DOCK_FRONT, HALL_FRONT])
      if (Math.abs(dir.z) > 0.5) cuts.push((z - p.z) / dir.z)
    cuts.splice(0, cuts.length, ...cuts.filter((s) => s >= 0 && s <= len).sort((a, c) => a - c))
    const feet = cuts.slice(1).map((s1, k) => {
      const s0 = cuts[k]!
      return { s0, s1, y: footOf(at((s0 + s1) / 2)) }
    })
    const footAt = (s: number) => feet.find((f) => s >= f.s0 && s <= f.s1)!.y
    const groundHoles = ground.filter((h) => footAt((h[0] + h[1]) / 2) === 0)
    const holes = [...rooms, ...stripes, ...groundHoles]
    // cuts with nothing in them: the edges of the tan strips and of the feet
    const marks: Hole[] = [...tan, ...feet.map((f) => [f.s0, f.s1] as const)].map(
      ([s0, s1]): Hole => [s0, s1, -1, -1],
    )
    const tanFrom = floorAt(face.floors ?? BRICK_FLOORS)
    const groundTan = face.ground === 'store' || face.ground === 'doors' || !face.brick
    const partOf = (s: number, y0: number): Part => {
      if (!face.brick || y0 >= tanFrom - 0.01) return 'tan'
      if (y0 < GROUND - 0.01) return groundTan ? 'tan' : 'brick'
      return tan.some(([a, c]) => s > a && s < c) ? 'tan' : 'brick'
    }
    for (const [u0, u1, v0, v1] of solidPieces(len, 0, top, [...holes, ...marks])) {
      const foot = footAt((u0 + u1) / 2)
      // split at the ground floor's top and where the brick stops
      const ys = [Math.max(v0, foot), GROUND, tanFrom, v1].filter((y) => y >= Math.max(v0, foot))
      ys.sort((a, c) => a - c)
      for (let k = 1; k < ys.length; k++) {
        const [y0, y1] = [ys[k - 1]!, Math.min(ys[k]!, v1)]
        if (y1 - y0 < 0.001) continue
        add(partOf((u0 + u1) / 2, y0), wallQuad(at(u0), at(u1), y0, y1, out, u0))
      }
    }
    // the glass a little in, a bit bigger than its hole so you never see past its edge
    for (const [s0, s1, y0, y1] of rooms)
      add(
        'glass',
        glassQuad(at(s0 - DEPTH, DEPTH), at(s1 + DEPTH, DEPTH), y0 - DEPTH, y1 + DEPTH, out),
      )
    for (const [s0, s1, y0, y1] of groundHoles)
      add(
        'store',
        // from 0, so it carries on down where the street is lower (landmarks.ts sunk)
        glassQuad(at(s0 - DEPTH, DEPTH), at(s1 + DEPTH, DEPTH), y0, y1, out),
      )
    for (const [s0, s1, y0, y1] of stripes) add('blue', wallQuad(at(s0), at(s1), y0, y1, out, s0))
  })

  // the parapets' insides and tops, the roof, the taller blocks on it
  const lip = inset(upper, 0.3)
  faces.forEach(({ p, q, out }, i) => {
    if (FACES[i]!.top) return
    const a = lip[i]!
    const c = lip[(i + 1) % lip.length]!
    add('tan', wallQuad(a, c, ROOF, PARAPET, { x: -out.x, z: -out.z }))
    add('tan', flat([p, q, c, a], PARAPET))
  })
  add('tan', flat(lip, ROOF))
  // the corner block's walls over the roof on its two inner sides, and its roof
  const [cx, cz] = [CORNER.x, CORNER.z]
  add('tan', wallQuad({ x: cx[0], z: -311.6 }, { x: cx[0], z: cz[1] }, ROOF, TALL, { x: -1, z: 0 }))
  add('tan', wallQuad({ x: cx[0], z: cz[1] }, { x: cx[1], z: cz[1] }, ROOF, TALL, { x: 0, z: 1 }))
  add('tan', flat(rect(cx, cz), TALL))
  prism('tan', rect(STAIR.x, STAIR.z), ROOF, TALL)
  // the core's lid, and the light grey screen behind it
  add('brick', flat(rect(CORE, [SCREEN.z[1], -294.8]), TALL))
  prism('metal', rect(SCREEN.x, SCREEN.z), PARAPET - 0.01, TALL)

  // the dining hall: glass under a blue band on its west and south sides
  const hall = [
    { x: HALL_X[0], z: -294.8 },
    { x: HALL_X[0], z: HALL_FRONT },
    { x: HALL_X[1], z: HALL_FRONT },
  ]
  const store = (from: Point, to: Point, o: Point) => {
    const len = Math.hypot(to.x - from.x, to.z - from.z)
    const n = Math.max(1, Math.round(len / 6))
    const d = { x: (to.x - from.x) / len, z: (to.z - from.z) / len }
    const at = (s: number, k = 0) => ({
      x: from.x + d.x * s - o.x * k,
      z: from.z + d.z * s - o.z * k,
    })
    // a slim post between each light
    for (let k = 0; k < n; k++) {
      const s0 = (k * len) / n
      const s1 = ((k + 1) * len) / n
      add('store', glassQuad(at(s0 + 0.1, DEPTH), at(s1 - 0.1, DEPTH), 0.002, BAND, o))
      add('tan', wallQuad(at(s0), at(s0 + 0.1), 0, BAND, o))
      add('tan', wallQuad(at(s1 - 0.1), at(s1), 0, BAND, o))
    }
    add('blue', wallQuad(from, to, BAND, DINING, o))
  }
  store(hall[0]!, hall[1]!, { x: -1, z: 0 })
  store(hall[1]!, hall[2]!, { x: 0, z: 1 })
  add(
    'tan',
    flat(
      [
        { x: HALL_X[0], z: HALL_FRONT },
        { x: HALL_X[1], z: HALL_FRONT },
        { x: HALL_X[1], z: BACK },
        { x: CORE[1], z: BACK },
        { x: CORE[1], z: -294.8 },
        { x: HALL_X[0], z: -294.8 },
      ],
      DINING,
    ),
  )
  // east of it a brick box, then the loading dock set back under a blue band, both a bit taller
  const south = { x: 0, z: 1 }
  add(
    'brick',
    wallQuad({ x: BOX_X[0], z: HALL_FRONT }, { x: DOCK_X, z: HALL_FRONT }, 0, BOX, south),
  )
  add(
    'brick',
    wallQuad({ x: DOCK_X, z: HALL_FRONT }, { x: DOCK_X, z: DOCK_FRONT }, 0, BOX, { x: 1, z: 0 }),
  )
  add(
    'brick',
    wallQuad({ x: DOCK_X, z: DOCK_FRONT }, { x: BOX_X[1], z: DOCK_FRONT }, 0, 3.6, south),
  )
  add(
    'blue',
    wallQuad({ x: DOCK_X, z: DOCK_FRONT }, { x: BOX_X[1], z: DOCK_FRONT }, 3.6, BOX, south),
  )
  add(
    'brick',
    wallQuad({ x: BOX_X[0], z: HALL_FRONT }, { x: BOX_X[0], z: BACK }, DINING, BOX, {
      x: -1,
      z: 0,
    }),
  )
  add(
    'tan',
    flat(
      [
        { x: BOX_X[0], z: HALL_FRONT },
        { x: DOCK_X, z: HALL_FRONT },
        { x: DOCK_X, z: DOCK_FRONT },
        { x: BOX_X[1], z: DOCK_FRONT },
        { x: BOX_X[1], z: BACK },
        { x: BOX_X[0], z: BACK },
      ],
      BOX,
    ),
  )
  // the clerestory: a curved wall of pale glass on the roof, bowed out to the south (the "c"
  // on the roof on gsu's map)
  const arc: Point[] = []
  const c = { x: 236, z: -290 }
  const r = 9
  for (let k = 0; k <= 10; k++) {
    const x = 231 + k
    arc.push({ x, z: c.z + Math.sqrt(r * r - (x - c.x) ** 2) })
  }
  prism('metal', [...arc, { x: 241, z: -288 }, { x: 231, z: -288 }], DINING, CLERESTORY)

  // the canopy (2026): a deep flat box round the glass on slim posts
  const [y0, y1] = CANOPY.y
  const o = CANOPY.out
  const canopy = [
    { x: CORE[0], z: CANOPY.to },
    { x: HALL_X[0], z: CANOPY.to },
    { x: HALL_X[0], z: HALL_FRONT },
    { x: CANOPY.end, z: HALL_FRONT },
    { x: CANOPY.end, z: HALL_FRONT + o },
    { x: CORE[0], z: HALL_FRONT + o },
  ]
  prism('metal', canopy, y0, y1)
  add('metal', flat(canopy, y0, false))
  const post = (x: number, z: number) =>
    prism('metal', rect([x - 0.08, x + 0.08], [z - 0.08, z + 0.08]), 0, y0, false)
  for (let x = CORE[0] + 0.3; x < CANOPY.end; x += 6) post(x, HALL_FRONT + o - 0.3)
  for (let z = HALL_FRONT - 5.5; z > CANOPY.to + 2; z -= 6) post(CORE[0] + 0.3, z)

  insideWalls(inside, outline, door, (p, q) => {
    // the dining hall's glass sides
    const mx = (p.x + q.x) / 2
    const mz = (p.z + q.z) / 2
    return (
      (Math.abs(mx - HALL_X[0]) < 0.1 && mz > -294.8) ||
      (Math.abs(mz - HALL_FRONT) < 0.1 && mx > HALL_X[0] && mx < HALL_X[1])
    )
  })

  // hidden blocks for the shadows: the rooms over the ground floor are empty
  core('tan', inset(upper, DEPTH + 0.2), CEILING, ROOF - 0.1)

  // a plain blue square where gsu's logo is on the core's top, the name over the door on john
  // wesley dobbs ave (a blue square for the logo again)
  signs.push({
    x: 226,
    y: TALL - 2.4,
    z: -294.75,
    rot: 0,
    text: '',
    width: 2.2,
    height: 2.2,
    plate: '#2f5aa8',
  })
  const north = Math.PI
  signs.push({
    x: 200,
    y: 5.6,
    z: -311.65,
    rot: north,
    text: 'PIEDMONT CENTRAL',
    plate: '#ffffff',
    color: '#2a3f6e',
    scale: 0.5,
  })
  signs.push({
    x: 204.6,
    y: 5.6,
    z: -311.66,
    rot: north,
    text: '',
    width: 0.6,
    height: 0.6,
    plate: '#2f5aa8',
  })
  signs.push({
    x: 280.85,
    y: 7.4,
    z: -310.5,
    rot: Math.PI / 2,
    text: '92',
    letters: true,
    size: 0.5,
    color: '#f2f2ee',
  })

  return {
    parts: merged(),
    inside,
    signs,
    // the core casts for the floors over the ground floor
    noShadow: ['glass', 'store'],
  }
}
