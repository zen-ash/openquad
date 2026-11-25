import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  flat,
  frame,
  glassQuad,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Frame,
  type Hole,
} from './landmark'

// 55 park place (gsu's andrew young school of policy studies), across park place from woodruff
// park. a 19 floor block of cream precast with deep set windows, each with a sloped sill. on
// park place it's two wings with the entrance between them: the middle has ribbon windows, a
// tall glass wall a few floors up and its top four floors step back 1.5m each. the wings
// stand on round columns with the ground floor's glass behind them. a penthouse on the back of
// the roof. from usgs's lidar (2018) and gsu's photos (2019 front, 2026 along the north wing).
// sources: docs/reference/55-park-place.md
//
// square to the game's x/z: park place is on the west (-x), auburn ave on the south (+z). the
// ground is the terrace in front of the doors (321.7m), auburn ave is up to 4.6m lower

export type ParkPlace55Data = {
  points: number[][]
  height: number
  door?: number[]
}

// precast is every wall, the columns, the roofs and the penthouse, glass the windows and the
// ground floor's, bronze the middle's ribbon windows, dark the entrance canopy, red the
// cafe's awning
export type Part = 'precast' | 'glass' | 'bronze' | 'dark' | 'red'

type Range = readonly [number, number]

// the precast's faces (lidar) and the ground floor's glass on park place (the outline)
export const WEST = -198.2
export const GLASS = -197.5
export const NORTH = -223.5
export const SOUTH = -167.3
export const EAST = -137
// the entrance between the wings: the middle's face, the doors further in
export const NOTCH: Range = [-203.5, -188.5]
export const MIDDLE = -196
export const DOORS = -194.5
// the corners cut out of the back: north east and south east
const NE = { x: -140.2, z: -218 }
const SE = { x: -142.4, z: -172.6 }

// floors: a tall lobby, then 18 office floors of 4m (the stepped top in the lidar: 383.5,
// 387.5, 391.5, 395.4 and the roof 400.0m)
export const LOBBY = 5.3
export const FLOOR = 4
export const FLOORS = 19
export const level = (k: number) => LOBBY + (k - 2) * FLOOR
export const ROOF = 78.4
// the middle's lobby is two floors of glass up to the band with the "55" on it
export const ENTRANCE = LOBBY + FLOOR - 0.6
// the middle's top floors step back from here
const STEP_FROM = 16
const STEP = 1.5
// the window boxes: 3.4m wide every 4.43m (the south face's 12), sill and head over the floor,
// the sloped sill drops this much to the face, glass this deep
export const BAY = 4.43
const WIDE = 3.4
const SILL = 1.15
const HEAD = 3.35
const DROP = 0.65
const DEPTH = 0.6
// the round columns under the wings, standing out of the glass flush with the precast over
// them (gsu's 2026 photo along the north wing)
const COLUMN = 0.45
const COLUMN_AT = GLASS - 0.15
// the penthouse (lidar 406.1m)
export const PENTHOUSE = { x: [-154, -138.5] as Range, z: [-218, -173] as Range, top: 84.4 }

// the middle's face on floor k
export const middleAt = (k: number) =>
  k < STEP_FROM ? MIDDLE : MIDDLE + (k - STEP_FROM + 1) * STEP

export function parkPlace55Geometry(b: ParkPlace55Data) {
  const { add, prism, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  // a wall piece along a frame, d out from it
  const piece = (part: Part, f: Frame, a0: number, a1: number, y0: number, y1: number, d = 0) => {
    if (a1 - a0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(f.at(a0, d), f.at(a1, d), y0, y1, f.out, a0))
  }
  // a wall along a frame from a0 to a1 with holes [a0, a1, y0, y1] cut out
  const holed = (f: Frame, a0: number, a1: number, y0: number, y1: number, holes: Hole[]) => {
    const cut = holes.map(([h0, h1, v0, v1]): Hole => [h0 - a0, h1 - a0, v0, v1])
    for (const [p0, p1, v0, v1] of solidPieces(a1 - a0, y0, y1, cut))
      piece('precast', f, a0 + p0, a0 + p1, v0, v1)
  }
  // a window box in a hole: its sides and head back to the glass, the sill sloping up to it
  const box = (
    f: Frame,
    [a0, a1, v0, v1]: Hole,
    depth = DEPTH,
    drop = DROP,
    pane: Part = 'glass',
  ) => {
    const sill = v0 + drop
    add('precast', wallQuad(f.at(a0), f.at(a0, -depth), v0, v1, f.along))
    add('precast', wallQuad(f.at(a1), f.at(a1, -depth), v0, v1, neg(f.along)))
    add('precast', flat([f.at(a0), f.at(a1), f.at(a1, -depth), f.at(a0, -depth)], v1, false))
    const lift = (p: Point, y: number): V => [p.x, y, p.z]
    const n = norm([f.out.x * depth, drop, f.out.z * depth])
    add(
      'precast',
      quad(
        [
          lift(f.at(a0), v0),
          lift(f.at(a1), v0),
          lift(f.at(a1, -depth), sill),
          lift(f.at(a0, -depth), sill),
        ],
        n,
      ),
    )
    add(pane, glassQuad(f.at(a0, -depth), f.at(a1, -depth), sill, v1, f.out))
  }
  // n windows in rows on every office floor, centred on a face from a0 to a1
  const windows = (n: number, a0: number, a1: number, from = 2): Hole[] => {
    const mid = (a0 + a1) / 2
    const rows = Array.from({ length: FLOORS - from + 1 }, (_, i) => level(from + i))
    return rows.flatMap((y) =>
      Array.from({ length: n }, (_, i): Hole => {
        const c = mid + (i - (n - 1) / 2) * BAY
        return [c - WIDE / 2, c + WIDE / 2, y + SILL - DROP, y + HEAD]
      }),
    )
  }
  // a face with its window boxes, from the lobby's top or the ground up
  const punched = (f: Frame, n: number, y0: number, boxes = true) => {
    const holes = windows(n, 0, f.len)
    holed(f, 0, f.len, y0, ROOF, boxes ? holes : [])
    if (boxes) for (const h of holes) box(f, h)
    // the north face is only seen from far off: the glass flat on the wall
    else
      for (const [a0, a1, v0, v1] of holes)
        add('glass', glassQuad(f.at(a0, 0.02), f.at(a1, 0.02), v0 + DROP, v1, f.out))
  }
  // the ground floor on the street sides: the precast down to the ground, shop windows on it
  const ground = (f: Frame, n: number) => {
    piece('precast', f, 0, f.len, 0, LOBBY)
    const mid = f.len / 2
    for (let i = 0; i < n; i++) {
      const c = mid + (i - (n - 1) / 2) * BAY
      add('glass', glassQuad(f.at(c - WIDE / 2, 0.02), f.at(c + WIDE / 2, 0.02), 0.6, 4.5, f.out))
    }
  }
  const p = (x: number, z: number) => ({ x, z })

  // north (from far off, williams st and the park), the cut corner, east, the cut corner and
  // south on auburn ave. frames go round with their outside on the left
  const north = frame(p(WEST, NORTH), p(NE.x, NORTH))
  ground(north, 13)
  punched(north, 13, LOBBY, false)
  const ne = [frame(p(NE.x, NORTH), p(NE.x, NE.z)), frame(p(NE.x, NE.z), p(EAST, NE.z))]
  for (const f of ne) piece('precast', f, 0, f.len, 0, ROOF)
  const east = frame(p(EAST, NE.z), p(EAST, SE.z))
  ground(east, 10)
  punched(east, 10, LOBBY)
  const se = [frame(p(EAST, SE.z), p(SE.x, SE.z)), frame(p(SE.x, SE.z), p(SE.x, SOUTH))]
  for (const f of se) piece('precast', f, 0, f.len, 0, ROOF)
  const south = frame(p(SE.x, SOUTH), p(WEST, SOUTH))
  ground(south, 12)
  punched(south, 12, LOBBY)

  // the wings on park place: windows from the second floor, round columns under the piers
  // and the glass 1.2m back, a soffit over it
  const wings = [frame(p(WEST, SOUTH), p(WEST, NOTCH[1])), frame(p(WEST, NOTCH[0]), p(WEST, NORTH))]
  for (const f of wings) {
    punched(f, 4, LOBBY)
    const g = frame(p(GLASS, f.at(0).z), p(GLASS, f.at(f.len).z))
    add('glass', glassQuad(g.at(0), g.at(g.len), 0, LOBBY, g.out))
    add('precast', flat([f.at(0), f.at(f.len), g.at(g.len), g.at(0)], LOBBY, false))
    const mid = f.len / 2
    const piers = [0, 1, 2, 3, 4].map((i) => mid + (i - 2) * BAY)
    for (const a of [COLUMN, ...piers.slice(1, -1), f.len - COLUMN])
      prism('precast', circle(f.at(a, WEST - COLUMN_AT), COLUMN, 10), 0, LOBBY, false)
  }
  // the cafe's red awning on the north wing's second bay (gsu's 2026 photo)
  const nw = wings[1]!
  const awning = nw.len / 2 + BAY / 2
  const aw = [awning - 1.6, awning + 1.6] as const
  const out = (a: number, d: number, y: number): V => [nw.at(a, d).x, y, nw.at(a, d).z]
  const back = GLASS - WEST
  add(
    'red',
    quad(
      [out(aw[0], -back, 3.6), out(aw[1], -back, 3.6), out(aw[1], 0.9, 2.8), out(aw[0], 0.9, 2.8)],
      [-0.4, 0.92, 0],
    ),
  )
  piece('red', nw, aw[0], aw[1], 2.5, 2.8, 0.9)

  // the entrance between the wings: the doors' glass two floors high under a soffit, the
  // wings' sides glass at the bottom and plain up to the soffit
  const doors = frame(p(DOORS, NOTCH[1]), p(DOORS, NOTCH[0]))
  add('glass', glassQuad(doors.at(0), doors.at(doors.len), 0, ENTRANCE, doors.out))
  for (const z of NOTCH) {
    const s = z === NOTCH[0] ? 1 : -1
    const g = frame(p(GLASS, z), p(DOORS, z))
    add('glass', glassQuad(g.at(0), g.at(g.len), 0, LOBBY, { x: 0, z: s }))
    add('precast', wallQuad(p(WEST, z), p(DOORS, z), LOBBY, ENTRANCE, { x: 0, z: s }))
  }
  add(
    'precast',
    flat(
      [p(MIDDLE, NOTCH[0]), p(DOORS, NOTCH[0]), p(DOORS, NOTCH[1]), p(MIDDLE, NOTCH[1])],
      ENTRANCE,
      false,
    ),
  )
  // the middle, floor by floor from the third: ribbon windows on sloped spandrels, a glass
  // wall on floors 6-8 (gsu's 2019 photos: three ribbons under it), the stepped top
  for (let k = 3; k <= FLOORS; k++) {
    const x = middleAt(k)
    const y0 = k === 3 ? ENTRANCE : level(k)
    const y1 = k === FLOORS ? ROOF : level(k + 1)
    const f = frame(p(x, NOTCH[1]), p(x, NOTCH[0]))
    // the glass wall is a pane a floor with the slabs showing between them (one tall pane
    // read as a white sheet of sky)
    const atrium = k >= 6 && k <= 8
    const hole: Hole = atrium
      ? [0.6, f.len - 0.6, level(k) + 0.3, level(k + 1) - 0.1]
      : [0.6, f.len - 0.6, level(k) + 0.3, level(k) + 3.4]
    holed(f, 0, f.len, y0, y1, [hole])
    // the ribbons are bronze glass deep behind thick sloped spandrels
    if (atrium) box(f, hole, 0.8, 0.1)
    else box(f, hole, 1.2, 0.9, 'bronze')
    // the step's terrace in front of it
    if (k >= STEP_FROM)
      add(
        'precast',
        flat(
          [
            p(x, NOTCH[0]),
            p(middleAt(k - 1), NOTCH[0]),
            p(middleAt(k - 1), NOTCH[1]),
            p(x, NOTCH[1]),
          ],
          y0,
        ),
      )
  }
  // the wings' sides in the notch, out to the middle's face at each height
  for (const [z, s] of [
    [NOTCH[1], -1],
    [NOTCH[0], 1],
  ] as const) {
    // a window on every floor, narrow where the side is only 2.2m deep (the 2019 photo)
    for (let k = 3; k <= FLOORS; k++) {
      const x = middleAt(k)
      const f = s < 0 ? frame(p(WEST, z), p(x, z)) : frame(p(x, z), p(WEST, z))
      const w = Math.min(WIDE, f.len - 1)
      const hole: Hole = [(f.len - w) / 2, (f.len + w) / 2, level(k) + SILL - DROP, level(k) + HEAD]
      holed(f, 0, f.len, k === 3 ? ENTRANCE : level(k), k === FLOORS ? ROOF : level(k + 1), [hole])
      box(f, hole)
    }
  }

  // the "55" over the doors, gsu's blue banners on the wings' piers
  signs.push({
    x: MIDDLE - 0.03,
    y: ENTRANCE + 0.4,
    z: (NOTCH[0] + NOTCH[1]) / 2,
    rot: -Math.PI / 2,
    text: '55',
    letters: true,
    size: 1,
    color: '#c39443',
    weight: 500,
  })
  for (const f of wings)
    for (const a of [f.len / 2 - BAY, f.len / 2 + BAY]) {
      const at = f.at(a, 0.05)
      signs.push({
        ...at,
        y: LOBBY + 1.6,
        rot: -Math.PI / 2,
        text: '',
        plate: '#1f4fa8',
        width: 0.6,
        height: 2.4,
      })
    }
  // the canopy over the doors, curving out over the steps
  const arc = Array.from({ length: 9 }, (_, i) => {
    const t = (i / 8) * Math.PI
    return p(MIDDLE - Math.sin(t) * 4.5, -196 + Math.cos(t) * 4.8)
  })
  prism('dark', arc, 4.55, 4.8)
  add('dark', flat(arc, 4.55, false))

  // the roof with the middle's notch, the penthouse on the back
  const roof = [
    p(WEST, NORTH),
    p(NE.x, NORTH),
    p(NE.x, NE.z),
    p(EAST, NE.z),
    p(EAST, SE.z),
    p(SE.x, SE.z),
    p(SE.x, SOUTH),
    p(WEST, SOUTH),
    p(WEST, NOTCH[1]),
    p(middleAt(FLOORS), NOTCH[1]),
    p(middleAt(FLOORS), NOTCH[0]),
    p(WEST, NOTCH[0]),
  ]
  add('precast', flat(roof, ROOF))
  const { x: px, z: pz, top } = PENTHOUSE
  prism('precast', [p(px[0], pz[0]), p(px[1], pz[0]), p(px[1], pz[1]), p(px[0], pz[1])], ROOF, top)

  // blocks inside the walls for the shadows: it's empty over the ground floor and the window
  // glass doesn't cast (landmark.ts core)
  const shut = 0.8
  core(
    'precast',
    [
      p(WEST + shut, NORTH + shut),
      p(NE.x - shut, NORTH + shut),
      p(NE.x - shut, NE.z + shut),
      p(EAST - shut, NE.z + shut),
      p(EAST - shut, SE.z - shut),
      p(SE.x - shut, SE.z - shut),
      p(SE.x - shut, SOUTH - shut),
      p(WEST + shut, SOUTH - shut),
      p(WEST + shut, NOTCH[1] + shut),
      p(middleAt(FLOORS) + 1.4, NOTCH[1] + shut),
      p(middleAt(FLOORS) + 1.4, NOTCH[0] - shut),
      p(WEST + shut, NOTCH[0] - shut),
    ],
    CEILING,
    ROOF - 0.1,
  )
  core(
    'precast',
    [
      p(MIDDLE + 1.4, NOTCH[0] + shut),
      p(middleAt(FLOORS) + 1.4, NOTCH[0] + shut),
      p(middleAt(FLOORS) + 1.4, NOTCH[1] - shut),
      p(MIDDLE + 1.4, NOTCH[1] - shut),
    ],
    ENTRANCE,
    level(STEP_FROM) - 0.1,
  )

  // inside the ground floor: glass on park place and round the doors
  insideWalls(
    inside,
    outline,
    door,
    (a, c) =>
      (a.x === c.x && (a.x === GLASS || a.x === DOORS)) ||
      (a.z === c.z && (a.z === NOTCH[0] || a.z === NOTCH[1])),
  )

  return {
    parts: merged(),
    inside,
    signs,
    first: ['precast'],
    noShadow: ['glass', 'bronze', 'dark', 'red'],
    near: ['red'],
  }
}

type V = [number, number, number]
const neg = (v: Point) => ({ x: -v.x, z: -v.z })
function norm([x, y, z]: V): V {
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l]
}

// a flat four cornered face facing n, uvs along its bottom edge and up
function quad(c: V[], n: V) {
  const [a, b] = [c[0]!, c[1]!]
  const e = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const cr = (u: V, v: V): V => [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ]
  const sub = (u: V, v: V): V => [u[0] - v[0], u[1] - v[1], u[2] - v[2]]
  const w = cr(sub(c[1]!, c[0]!), sub(c[2]!, c[0]!))
  const order =
    w[0] * n[0] + w[1] * n[1] + w[2] * n[2] > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
  const len = Math.hypot(e[0]!, e[2]!) || 1
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      order.flatMap((i) => c[i]!),
      3,
    ),
  )
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      order.flatMap(() => n),
      3,
    ),
  )
  const uv = order.flatMap((i) => {
    const q = c[i]!
    return [((q[0] - a[0]) * e[0]! + (q[2] - a[2]) * e[2]!) / len, q[1]]
  })
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}
