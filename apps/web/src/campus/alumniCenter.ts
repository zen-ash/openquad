import * as THREE from 'three'
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

// the alumni center, 60 piedmont ave: a 1940s three storey red brick block with its narrow end
// on piedmont ave, two steel windows a floor in light cast stone panels, and a one storey wing
// beside it with the doors under a blue canopy. a lower block at the back has a round window.
// from usgs's lidar (2018), gsu's photo (2025) and the satellite. sources:
// docs/reference/alumni-center.md
//
// square to the game's x/z. the ground is the piedmont ave sidewalk (302.0m), the lot behind
// it is 1m higher

export type AlumniCenterData = {
  points: number[][]
  height: number
  door?: number[]
}

// brick the walls, stone the cast stone panels, sills and copings (and the roofs), glass the
// steel windows and the doors, blue the canopy and its posts
export type Part = 'brick' | 'stone' | 'glass' | 'blue'

type Range = readonly [number, number]
const P = (x: number, z: number): Point => ({ x, z })

// the block (lidar): its west end, the front on piedmont, north and south sides
export const WEST = 251.6
export const FRONT = 280
export const BACK = -215.8
export const SPLIT = -207.6
// the wing beside it
export const WING_WEST = 256
export const WING_SOUTH = -194.5
// the lower block at the back of the wing (lidar 312.8m)
const REAR: Range = [256, 266]
const REAR_DEEP = 3

// heights over the sidewalk: the roof 313.6m, the parapet 314.45, the wing's roof 306.8
export const FLOORS = [0, 3.9, 7.8]
export const ROOF = 11.6
export const PARAPET = 12.45
export const WING_TOP = 4.8
export const REAR_TOP = 10.8
// the windows: steel, in stone panels on the front (gsu 2025)
const SILL = 1.15
const HEAD = 2.95
// the canopy over the doors, and the doors along the front from the block
export const DOORS: Range = [1.2, 2.8]
const CANOPY = { out: 1.9, y: [3.05, 3.35] as Range }

function sideOf(p: Point, q: Point, inner: Point) {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  let o = { x: dir.z, z: -dir.x }
  if ((inner.x - p.x) * o.x + (inner.z - p.z) * o.z > 0) o = { x: -o.x, z: -o.z }
  const at = (u: number, d = 0) => P(p.x + dir.x * u + o.x * d, p.z + dir.z * u + o.z * d)
  return { p, q, len, dir, o, at }
}
type Side = ReturnType<typeof sideOf>

// inside the block, and inside the wing
const MIDDLE = P(266, -212)
const WING_MID = P(268, -200)

export function alumniCenterGeometry(b: AlumniCenterData) {
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
  // a window: its brick sides, a stone sill, the head, the glass at the back
  const reveal = (s: Side, h: Hole, depth = 0.15, pane: Part = 'glass') => {
    const [u0, u1, v0, v1] = h
    add('brick', wallQuad(s.at(u0), s.at(u0, -depth), v0, v1, s.dir))
    add('brick', wallQuad(s.at(u1), s.at(u1, -depth), v0, v1, neg(s.dir)))
    const rim = [s.at(u0), s.at(u1), s.at(u1, -depth), s.at(u0, -depth)]
    if (v0 > 0.01) add('stone', flat(rim, v0))
    add('brick', flat(rim, v1, false))
    add(pane, glassQuad(s.at(u0, -depth), s.at(u1, -depth), v0, v1, s.o))
  }
  // a box standing out of a face by `out`, its ends, lid and underside
  const ledge = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    out: number,
  ) => {
    add(part, wallQuad(s.at(u0, out), s.at(u1, out), y0, y1, s.o))
    add(part, wallQuad(s.at(u0), s.at(u0, out), y0, y1, neg(s.dir)))
    add(part, wallQuad(s.at(u1), s.at(u1, out), y0, y1, s.dir))
    const rim = [s.at(u0), s.at(u1), s.at(u1, out), s.at(u0, out)]
    add(part, flat(rim, y1))
    if (y0 > 0.01) add(part, flat(rim, y0, false))
  }
  const windows = (us: number[], w: number, floors: number[]) =>
    us.flatMap((u) => floors.map((f): Hole => [u, u + w, f + SILL, f + HEAD]))
  // the copings along the top of a wall, stone
  const coping = (s: Side, y: number) => ledge('stone', s, 0, s.len, y - 0.25, y, 0.05)

  // the front on piedmont: in each floor a stone panel with two steel windows in it
  const front = sideOf(P(FRONT, BACK), P(FRONT, SPLIT), MIDDLE)
  const pairs = windows([1.2, 4.75], 2.25, FLOORS)
  face('brick', front, 0, PARAPET, pairs)
  for (const f of FLOORS) {
    const panel: Hole = [0.95, 7.25, f + SILL - 0.25, f + HEAD + 0.2]
    face(
      'stone',
      front,
      panel[2],
      panel[3],
      [...pairs, [-1, panel[0], 0, 99], [panel[1], 99, 0, 99]],
      0.04,
    )
    const [u0, u1, y0, y1] = panel
    add('stone', wallQuad(front.at(u0), front.at(u0, 0.04), y0, y1, neg(front.dir)))
    add('stone', wallQuad(front.at(u1), front.at(u1, 0.04), y0, y1, front.dir))
    const rim = [front.at(u0), front.at(u1), front.at(u1, 0.04), front.at(u0, 0.04)]
    add('stone', flat(rim, y1))
    add('stone', flat(rim, y0, false))
  }
  for (const h of pairs) reveal(front, h, 0.16)
  coping(front, PARAPET)

  // the long sides and the west end: smaller windows, irregular on the south over the wing
  // (gsu 2025), the north and west ones guessed from the satellite's spacing
  const south = sideOf(P(FRONT, SPLIT), P(WEST, SPLIT), MIDDLE)
  const southHoles = [
    ...windows([4.3, 8.8], 0.85, FLOORS.slice(1)),
    ...windows([16.6], 0.85, FLOORS.slice(2)),
  ].map((h): Hole => [h[0], h[1], h[2], h[3] + 0.2])
  face('brick', south, WING_TOP, PARAPET, southHoles)
  for (const h of southHoles) reveal(south, h)
  // below the wing's roof only the bit at the west end shows
  face('brick', sideOf(P(WING_WEST, SPLIT), P(WEST, SPLIT), MIDDLE), 0, WING_TOP, [
    [1.6, 2.8, SILL, HEAD],
  ])
  reveal(sideOf(P(WING_WEST, SPLIT), P(WEST, SPLIT), MIDDLE), [1.6, 2.8, SILL, HEAD])
  coping(south, PARAPET)

  const north = sideOf(P(WEST, BACK), P(FRONT, BACK), MIDDLE)
  const northHoles = windows([3, 7.5, 12, 16.5, 21, 25.5], 1.3, FLOORS)
  face('brick', north, 0, PARAPET, northHoles)
  for (const h of northHoles) reveal(north, h)
  coping(north, PARAPET)
  const west = sideOf(P(WEST, SPLIT), P(WEST, BACK), MIDDLE)
  const westHoles = windows([2, 5], 1.2, FLOORS)
  face('brick', west, 0, PARAPET, westHoles)
  for (const h of westHoles) reveal(west, h)
  coping(west, PARAPET)
  // the parapet's inside and the roof
  for (const s of [front, south, north, west])
    add(
      'brick',
      wallQuad(s.at(0, -0.3), s.at(s.len, -0.3), ROOF, PARAPET, { x: -s.o.x, z: -s.o.z }),
    )
  add('stone', flat([P(WEST, BACK), P(FRONT, BACK), P(FRONT, SPLIT), P(WEST, SPLIT)], ROOF))

  // the wing: the doors next to the block under the canopy, a window in a stone frame, a
  // stone band at the canopy's height on the door's bay, brick past it behind the trees
  const wing = sideOf(P(FRONT, SPLIT), P(FRONT, WING_SOUTH), WING_MID)
  const doors: Hole = [DOORS[0], DOORS[1], 0, 2.9]
  const wingWindow: Hole = [5.2, 6.8, SILL, HEAD - 0.4]
  const wingHoles = [
    doors,
    wingWindow,
    ...windows([9.5], 1.6, [0]).map((h): Hole => [h[0], h[1], h[2], h[3] - 0.4]),
  ]
  face('brick', wing, 0, WING_TOP, wingHoles)
  for (const h of wingHoles.slice(1)) reveal(wing, h)
  reveal(wing, doors, 0.3)
  ledge('stone', wing, 3.4, 8.6, 3.45, 3.75, 0.04)
  ledge(
    'stone',
    wing,
    wingWindow[0] - 0.2,
    wingWindow[1] + 0.2,
    wingWindow[2] - 0.15,
    wingWindow[2],
    0.06,
  )
  coping(wing, WING_TOP)
  const wingSouth = sideOf(P(FRONT, WING_SOUTH), P(WING_WEST, WING_SOUTH), WING_MID)
  const wingSouthHoles = windows([4, 10, 16], 1.4, [0]).map((h): Hole => [
    h[0],
    h[1],
    h[2],
    h[3] - 0.4,
  ])
  face('brick', wingSouth, 0, WING_TOP, wingSouthHoles)
  for (const h of wingSouthHoles) reveal(wingSouth, h)
  coping(wingSouth, WING_TOP)
  const wingWest = sideOf(P(WING_WEST, WING_SOUTH), P(WING_WEST, SPLIT), WING_MID)
  face('brick', wingWest, 0, WING_TOP)
  coping(wingWest, WING_TOP)
  add(
    'stone',
    flat(
      [P(WING_WEST, SPLIT), P(FRONT, SPLIT), P(FRONT, WING_SOUTH), P(WING_WEST, WING_SOUTH)],
      WING_TOP,
    ),
  )

  // the canopy: a blue box on two thin posts, the red and white stripes along its front edge
  const c = CANOPY
  ledge('blue', wing, DOORS[0] - 0.9, DOORS[1] + 0.9, c.y[0], c.y[1], c.out)
  for (const u of [DOORS[0] - 0.8, DOORS[1] + 0.8]) {
    const at = wing.at(u, c.out - 0.1)
    for (const [p, q, o] of [
      [P(at.x - 0.05, at.z - 0.05), P(at.x + 0.05, at.z - 0.05), { x: 0, z: -1 }],
      [P(at.x + 0.05, at.z - 0.05), P(at.x + 0.05, at.z + 0.05), { x: 1, z: 0 }],
      [P(at.x + 0.05, at.z + 0.05), P(at.x - 0.05, at.z + 0.05), { x: 0, z: 1 }],
      [P(at.x - 0.05, at.z + 0.05), P(at.x - 0.05, at.z - 0.05), { x: -1, z: 0 }],
    ] as const)
      add('blue', wallQuad(p, q, 0, c.y[0], o))
  }
  // the steps up from the sidewalk
  for (const [out, y] of [
    [1.2, -0.3],
    [0.8, -0.16],
  ] as const)
    ledge('stone', wing, DOORS[0] - 0.9, DOORS[1] + 0.9, -0.6, y + 0.15, out)

  // the lower block at the back with the round window
  const rearSouth = sideOf(
    P(REAR[1], SPLIT + REAR_DEEP),
    P(REAR[0], SPLIT + REAR_DEEP),
    P(261, -206),
  )
  const oculus: Hole = [4.4, 5.6, 7.6, 8.8]
  face('brick', rearSouth, WING_TOP, REAR_TOP, [oculus])
  add('glass', glassQuad(rearSouth.at(4.4, -0.12), rearSouth.at(5.6, -0.12), 7.6, 8.8, rearSouth.o))
  // a stone ring round it over the square hole, 16 quads
  const mid = rearSouth.at(5, 0.03)
  const side = neg(rearSouth.dir)
  const ringAt = (t: number, r: number) => [
    mid.x + side.x * Math.cos(t) * r,
    8.2 + Math.sin(t) * r,
    mid.z + side.z * Math.cos(t) * r,
  ]
  const pos: number[] = []
  for (let k = 0; k < 16; k++) {
    const [t0, t1] = [(k / 16) * Math.PI * 2, ((k + 1) / 16) * Math.PI * 2]
    const [a, b2, c2, d] = [ringAt(t0, 0.5), ringAt(t0, 0.8), ringAt(t1, 0.8), ringAt(t1, 0.5)]
    pos.push(...a!, ...b2!, ...c2!, ...a!, ...c2!, ...d!)
  }
  const plate = new THREE.BufferGeometry()
  plate.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  const o = rearSouth.o
  plate.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, k) => [o.x, 0, o.z][k % 3]!),
      3,
    ),
  )
  const uv: number[] = []
  for (let k = 0; k < pos.length; k += 3)
    uv.push(pos[k]! * side.x + pos[k + 2]! * side.z, pos[k + 1]!)
  plate.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  add('stone', plate)
  for (const s of [
    sideOf(P(REAR[1], SPLIT), P(REAR[1], SPLIT + REAR_DEEP), P(261, -206)),
    sideOf(P(REAR[0], SPLIT + REAR_DEEP), P(REAR[0], SPLIT), P(261, -206)),
  ])
    face('brick', s, WING_TOP, REAR_TOP)
  add(
    'stone',
    flat(
      [
        P(REAR[0], SPLIT),
        P(REAR[1], SPLIT),
        P(REAR[1], SPLIT + REAR_DEEP),
        P(REAR[0], SPLIT + REAR_DEEP),
      ],
      REAR_TOP,
    ),
  )

  // the address over the doors
  const sign = wing.at((DOORS[0] + DOORS[1]) / 2, 0.02)
  signs.push({
    x: sign.x,
    y: 2.6,
    z: sign.z,
    rot: Math.atan2(wing.o.x, wing.o.z),
    text: '60 Piedmont Ave',
    letters: true,
    size: 0.2,
    color: '#e8e8e4',
    weight: 500,
  })

  // a block inside the walls for the shadows (landmark.ts core): it's hollow over the ground
  // floor and the windows don't cast
  core(
    'brick',
    inset([P(WEST, BACK), P(FRONT, BACK), P(FRONT, SPLIT), P(WEST, SPLIT)], 0.4),
    CEILING,
    ROOF - 0.05,
  )

  insideWalls(inside, outline, door, () => false)

  return {
    parts: merged(),
    inside,
    signs,
    first: ['brick'],
    noShadow: ['glass', 'blue'],
  }
}

const neg = (v: Point) => ({ x: -v.x, z: -v.z })
