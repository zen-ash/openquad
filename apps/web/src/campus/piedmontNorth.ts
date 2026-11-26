import * as THREE from 'three'
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
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// piedmont north (175 piedmont ave), gsu's freshman halls at piedmont ave and andrew young
// intl blvd: building b (2010), a tall pale stucco block with rows of single windows, and
// building a (2011), an l of a 5 floor bar and a 6 floor arm in tan stucco with balconies set
// into it under blue grey metal mansards and a gable with gsu's name. between a and piedmont
// ave the dining hall, a low box of red panels and cream ribbed siding with a glass front, and
// the gabled entrance pavilion to a and the dining hall. from usgs's lidar (2018), gsu's
// photos (2019, 2021, 2023, 2026) and mapillary (2019-2022). sources:
// docs/reference/piedmont-north.md
//
// all three stand on 302.0m (the ground is within 0.3m of it all round, see surface.ts)

export type PiedmontNorthData = {
  points: number[][]
  height: number
  door?: number[]
}

// one set of materials for the three. stucco is a's tan, peach its base, bands, the tower and
// the pavilion, beige b's paler stucco, roof the blue grey standing seam (mansards, the
// pavilion, the flat roofs), blue the fascias, canopies and the stripes in the balconies, trim
// the white balcony rails, glass the windows, vent the brown grilles under b's windows, red
// and siding the dining hall's walls
export type Part =
  'stucco' | 'peach' | 'beige' | 'roof' | 'blue' | 'trim' | 'glass' | 'vent' | 'red' | 'siding'

type Range = readonly [number, number]
type Edge = ReturnType<typeof edges>[number]
type Kit = ReturnType<typeof kit>
// an outline's edges in order, there are up to 10
type Edges = [Edge, Edge, Edge, Edge, Edge, Edge, Edge, Edge, Edge, Edge]

const P = (x: number, z: number): Point => ({ x, z })
const at = (e: Edge, u: number, d = 0) =>
  P(e.p.x + e.dir.x * u + e.out.x * d, e.p.z + e.dir.z * u + e.out.z * d)
const v3 = (p: Point, y: number) => new THREE.Vector3(p.x, y, p.z)
const UP = new THREE.Vector3(0, 1, 0)
const toward = (p: Point) => new THREE.Vector3(p.x, 0, p.z)

// building a: the ground floor, then 2.6m floors in the arm and 2.5m in the bar (lidar: the
// arm's roof 318.3m, the bar's 315.3, and the 2021 photo's floor lines)
const GROUND = 3.3
const ARM_FLOORS = [3.3, 5.9, 8.5, 11.1, 13.7]
export const ARM_ROOF = 16.3
export const ARM_TOP = 17.3
const BAR_FLOORS = [3.3, 5.8, 8.3, 10.8]
export const BAR_ROOF = 13.3
export const BAR_TOP = 14.8
// the gable over the arm's west face (lidar: ridge 323.2m, x 367-381, z -549.5..-556.5)
export const GABLE: Range = [17.8, 21.2]
const TOWER: Range = [12.3, 19.3]
// the balconies are 1.2m deep
const LOGGIA = 1.2
// building b: 8 floors (lidar: roof 325.6m, parapet 326.2, the raised parts 329.8, the
// penthouse 330.8)
const B_FLOORS = [0, 3.6, 6.45, 9.3, 12.15, 15, 17.85, 20.7]
export const B_ROOF = 23.6
export const B_TOP = 24.2
export const B_RAISED = 27.8
export const B_PENTHOUSE = 28.8
// the dining hall's roof slopes up to its north front (lidar 305.8 -> 308.6m)
export const HALL_ROOF: Range = [3.9, 6.6]
const LINK_ROOF = 4
const PAVILION_EAVE = 5.2
export const PAVILION_RIDGE = 9
const PORCH_TOP = 3.6

// a flat polygon from 3d corners in order, turned to face `facing`. fan triangles, the
// thin ones left out
function poly(c: THREE.Vector3[], uv: number[][], facing: THREE.Vector3) {
  const n = new THREE.Vector3()
  c.forEach((a, i) => {
    const b = c[(i + 1) % c.length]!
    n.x += (a.y - b.y) * (a.z + b.z)
    n.y += (a.z - b.z) * (a.x + b.x)
    n.z += (a.x - b.x) * (a.y + b.y)
  })
  n.normalize()
  let order = c.map((_, i) => i)
  if (n.dot(facing) < 0) {
    order = order.reverse()
    n.negate()
  }
  const tris: number[] = []
  for (let i = 1; i + 1 < order.length; i++) {
    const [a, b, d] = [order[0]!, order[i]!, order[i + 1]!]
    const area = c[b]!.clone().sub(c[a]!).cross(c[d]!.clone().sub(c[a]!)).length()
    if (area > 1e-6) tris.push(a, b, d)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      tris.flatMap((i) => c[i]!.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      tris.flatMap(() => n.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      tris.flatMap((i) => uv[i]!),
      2,
    ),
  )
  return geo
}

// a flat shape tilted so its height is y(point) everywhere (a sloping roof)
function tilted(points: Point[], y: (p: Point) => number, up = true) {
  const geo = flat(points, 0, up)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) pos.setY(i, y(P(pos.getX(i), pos.getZ(i))))
  geo.computeVertexNormals()
  return geo
}

function kit() {
  const k = collect<Part>()
  const { add } = k

  // a wall along e from u0 to u1, d out from the line, with holes
  const face = (
    part: Part,
    e: Edge,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    holes: Hole[] = [],
    d = 0,
  ) => {
    const cut = holes.map(([a0, a1, b0, b1]): Hole => [a0 - u0, a1 - u0, b0, b1])
    for (const [a0, a1, b0, b1] of solidPieces(u1 - u0, y0, y1, cut))
      add(part, wallQuad(at(e, u0 + a0, d), at(e, u0 + a1, d), b0, b1, e.out, u0 + a0))
  }
  // a hole's sides and head back to its glass (no sill, it's never seen from below)
  const reveal = (part: Part, e: Edge, [u0, u1, y0, y1]: Hole, depth: number) => {
    add(part, wallQuad(at(e, u0), at(e, u0, -depth), y0, y1, e.dir))
    add(part, wallQuad(at(e, u1), at(e, u1, -depth), y0, y1, { x: -e.dir.x, z: -e.dir.z }))
    add(part, flat([at(e, u0), at(e, u1), at(e, u1, -depth), at(e, u0, -depth)], y1, false))
  }
  // a box out of the wall from d0 to d1, an underside if it's off the ground
  const box = (
    part: Part,
    e: Edge,
    u0: number,
    u1: number,
    d0: number,
    d1: number,
    y: Range,
    under = true,
  ) => {
    const c = [at(e, u0, d0), at(e, u1, d0), at(e, u1, d1), at(e, u0, d1)]
    k.prism(part, c, y[0], y[1])
    if (under && y[0] > 0.01) add(part, flat(c, y[0], false))
  }
  // a roof plane sloping up and back from out over the wall
  const slope = (
    part: Part,
    e: Edge,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    over: number,
    deep: number,
  ) => {
    const run = Math.hypot(deep + over, y1 - y0)
    const c = [v3(at(e, u0, over), y0), v3(at(e, u1, over), y0)]
    c.push(v3(at(e, u1, -deep), y1), v3(at(e, u0, -deep), y1))
    const facing = toward(e.out).add(UP)
    add(
      part,
      poly(
        c,
        [
          [u0, 0],
          [u1, 0],
          [u1, run],
          [u0, run],
        ],
        facing,
      ),
    )
  }
  return { ...k, face, reveal, box, slope }
}

// punched windows: holes `depth` deep with glass at the back, a grille under each (b)
function windows(
  K: Kit,
  wall: Part,
  e: Edge,
  cols: number[],
  floors: number[],
  [w, sill, h]: readonly [number, number, number],
  depth: number,
  vent = 0,
) {
  const holes: Hole[] = []
  for (const y of floors)
    for (const u of cols) {
      const hole: Hole = [u - w / 2, u + w / 2, y + sill - vent, y + sill + h]
      holes.push(hole)
      K.reveal(wall, e, hole, depth)
      const [a, b] = [at(e, hole[0], -depth), at(e, hole[1], -depth)]
      K.add('glass', glassQuad(a, b, y + sill, hole[3], e.out))
      if (vent) K.add('vent', wallQuad(a, b, hole[2], y + sill, e.out))
    }
  return holes
}

// columns `step` apart filling u0..u1
function columns(u0: number, u1: number, step: number) {
  const n = Math.max(1, Math.floor((u1 - u0) / step))
  const s = (u1 - u0) / n
  return Array.from({ length: n }, (_, i) => u0 + s * (i + 0.5))
}

// a balcony bay set into a wall: a slab edge at each floor, glass doors at the back, a glass
// rail with a white top in front, a blue stripe down the middle (the 2021 photo)
function loggia(K: Kit, e: Edge, u0: number, u1: number, floors: number[], roof: number) {
  const back = -LOGGIA
  K.reveal('stucco', e, [u0, u1, floors[0]!, roof], LOGGIA)
  const mid = (u0 + u1) / 2
  floors.forEach((y, i) => {
    const next = floors[i + 1] ?? roof
    K.box('stucco', e, u0, u1, back, 0, [y - 0.25, y])
    K.add('glass', glassQuad(at(e, u0, back), at(e, u1, back), y + 0.05, next - 0.45, e.out))
    K.face('stucco', e, u0, u1, next - 0.45, next - 0.25, [], back)
    const [s0, s1] = [at(e, mid - 0.3, back + 0.03), at(e, mid + 0.3, back + 0.03)]
    K.add('blue', wallQuad(s0, s1, y, next - 0.25, e.out))
    K.add('glass', glassQuad(at(e, u0, -0.15), at(e, u1, -0.15), y + 0.12, y + 0.95, e.out))
    K.box('trim', e, u0, u1, -0.2, -0.1, [y + 0.95, y + 1.05], false)
  })
}

// a mansard over a balcony bay: a blue fascia out front, blue grey metal sloping back
function mansard(K: Kit, e: Edge, u0: number, u1: number, y: number, top: number) {
  const [a0, a1] = [u0 - 0.3, u1 + 0.3]
  K.box('blue', e, a0, a1, -0.2, 0.5, [y - 0.35, y])
  K.slope('roof', e, a0, a1, y, top, 0.5, 1.6)
  for (const [u, s] of [
    [a0, -1],
    [a1, 1],
  ] as const) {
    const [f, b] = [at(e, u, 0.5), at(e, u, -1.6)]
    const c = [v3(f, y), v3(b, y), v3(b, top)]
    K.add(
      'roof',
      poly(
        c,
        [
          [0, 0],
          [2.1, 0],
          [2.1, top - y],
        ],
        toward(e.dir).multiplyScalar(s),
      ),
    )
  }
}

const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z) < 0.05

export function piedmontNorthAGeometry(b: PiedmontNorthData) {
  const K = kit()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null
  const E = edges(outline)
  const [south, , barNorth, armEast, armNorth, armWest, barNorthW, barWest] = E as Edges

  // a face of punched windows and balcony bays. `open` is where its ground floor shows: the
  // dining hall and its link stand against the rest up to 3.9m or more
  const front = (
    e: Edge,
    floors: number[],
    roof: number,
    top: number,
    bays: Range[],
    open: Range[] = [[0, e.len]],
    door?: number,
    blank = false,
  ) => {
    const holes: Hole[] = []
    for (const [u0, u1] of bays) {
      holes.push([u0, u1, floors[0]!, top])
      loggia(K, e, u0, u1, floors, roof)
      mansard(K, e, u0, u1, roof, top + 0.3)
    }
    // windows every 3m on the stretches between the bays
    let u = 0
    const stretches: Range[] = []
    for (const [u0, u1] of [...bays, [e.len, e.len] as const]) {
      if (u0 - u > 2.4) stretches.push([u + 0.6, u0 - 0.6])
      u = u1
    }
    const cols = blank ? [] : stretches.flatMap(([u0, u1]) => columns(u0, u1, 3))
    holes.push(...windows(K, 'stucco', e, cols, floors, [1.2, 0.8, 1.5], 0.2))
    // the ground floor where it shows: a storefront under the bays, windows, the door, all
    // in a peach base
    const shows = (u0: number, u1: number) => open.some(([a, c]) => u0 >= a && u1 <= c)
    const low: Hole[] = []
    for (const [u0, u1] of bays) if (shows(u0, u1)) low.push([u0, u1, 0.9, 2.9])
    for (const c of cols) if (shows(c - 0.6, c + 0.6)) low.push([c - 0.6, c + 0.6, 0.9, 2.4])
    const kept =
      door === undefined ? low : low.filter(([u0, u1]) => u1 < door - 1.8 || u0 > door + 1.8)
    if (door !== undefined) kept.push([door - 1.6, door + 1.6, 0, 2.9])
    for (const h of kept) {
      K.reveal('peach', e, h, 0.2)
      K.add('glass', glassQuad(at(e, h[0], -0.2), at(e, h[1], -0.2), h[2], h[3], e.out))
    }
    for (const [u0, u1] of open) K.face('peach', e, u0, u1, 0, GROUND, kept)
    K.face('stucco', e, 0, e.len, GROUND, top, holes)
    // a peach band under the top floor's windows, a coping on top (not over the mansards)
    const band = floors.at(-1)! + 0.5
    K.box('peach', e, 0, e.len, 0, 0.06, [band, band + 0.25])
    let c0 = -0.25
    for (const [u0, u1] of [...bays, [e.len + 0.25, e.len + 0.25] as const]) {
      if (u0 - 0.3 > c0) K.box('stucco', e, c0, u0 - 0.3, -0.25, 0.08, [top - 0.3, top], false)
      c0 = u1 + 0.3
    }
  }

  // the bar's south front on the drive: three balcony bays, the door under the canopy (lidar
  // 304.7m from x 376 to 407)
  const doorU = door ? door.x - south.p.x : undefined
  const bays: Range[] = [
    [6, 14.4],
    [26.4, 34.8],
    [47, 55.4],
  ]
  front(south, BAR_FLOORS, BAR_ROOF, BAR_TOP, bays, undefined, doorU)
  K.box('blue', south, 26.5, 58, 0, 2.6, [2.7, 2.95])
  // its end on piedmont ave: the dining hall stands against the first 4m
  front(barWest, BAR_FLOORS, BAR_ROOF, BAR_TOP, [], [[4, barWest.len]])
  front(barNorth, BAR_FLOORS, BAR_ROOF, BAR_TOP, [[8, 16.4]])
  front(barNorthW, BAR_FLOORS, BAR_ROOF, BAR_TOP, [], [])
  // the arm's west face (2021 photo): a bay, the gable, a narrow bay, a bay. the pavilion's
  // link stands against it from 8.3m, the hall from 17.3m
  const west: Range[] = [
    [4.4, 12.2],
    [19.6, 22.2],
    [27.4, 35.4],
  ]
  // its piers are blank, all the rooms open onto the balconies (2019 and 2021 photos)
  front(armWest, ARM_FLOORS, ARM_ROOF, ARM_TOP, west, [[0, 8.3]], undefined, true)
  const east: Range[] = [
    [4.4, 12.2],
    [16.6, 24.4],
    [28.8, 36.6],
  ]
  front(armEast, ARM_FLOORS, ARM_ROOF, ARM_TOP, east, undefined, undefined, true)
  front(armNorth, ARM_FLOORS, ARM_ROOF, ARM_TOP, [[5.1, 13.4]])

  // the gable tower on the arm's west face: 0.4m out, a peach band, the gable with gsu's name
  // and a blue square where the logo is
  const [t0, t1] = TOWER
  const tm = (t0 + t1) / 2
  const deep = 14
  K.box('stucco', armWest, t0, t1, 0, 0.4, [6.6, GABLE[0]])
  // over the arm's roof it's a block back to the gable's other end
  K.box('stucco', armWest, t0, t1, -deep, 0, [ARM_ROOF, GABLE[0]])
  K.box('peach', armWest, t0 - 0.05, t1 + 0.05, 0, 0.45, [14.6, 15.9])
  const g = [v3(at(armWest, t0, 0.4), GABLE[0]), v3(at(armWest, t1, 0.4), GABLE[0])]
  g.push(v3(at(armWest, tm, 0.4), GABLE[1]))
  const tw = t1 - t0
  K.add(
    'stucco',
    poly(
      g,
      [
        [0, 0],
        [tw, 0],
        [tw / 2, 3.4],
      ],
      toward(armWest.out),
    ),
  )
  const gb = [v3(at(armWest, t0, -deep), GABLE[0]), v3(at(armWest, t1, -deep), GABLE[0])]
  gb.push(v3(at(armWest, tm, -deep), GABLE[1]))
  K.add(
    'stucco',
    poly(
      gb,
      [
        [0, 0],
        [tw, 0],
        [tw / 2, 3.4],
      ],
      toward(armWest.out).negate(),
    ),
  )
  // its roof back over the arm, a blue edge up the gable
  for (const [u, s] of [
    [t0, -1],
    [t1, 1],
  ] as const) {
    const eave = at(armWest, u + s * 0.3, 0.7)
    const ridge = at(armWest, tm, 0.7)
    const c = [v3(eave, GABLE[0] - 0.2), v3(at(armWest, u + s * 0.3, -deep), GABLE[0] - 0.2)]
    c.push(v3(at(armWest, tm, -deep), GABLE[1] + 0.15), v3(ridge, GABLE[1] + 0.15))
    K.add(
      'roof',
      poly(
        c,
        [
          [0, 0],
          [deep, 0],
          [deep, 4],
          [0, 4],
        ],
        toward(armWest.dir).multiplyScalar(s).add(UP),
      ),
    )
    const r = [v3(eave, GABLE[0] - 0.2), v3(ridge, GABLE[1] + 0.15)]
    r.push(v3(ridge, GABLE[1] - 0.25), v3(eave, GABLE[0] - 0.6))
    K.add(
      'blue',
      poly(
        r,
        [
          [0, 0],
          [4, 0],
          [4, 0.4],
          [0, 0.4],
        ],
        toward(armWest.out),
      ),
    )
  }
  windows(K, 'stucco', armWest, [tm], [8.5, 11.1, 13.7], [1.6, 0.8, 1.5], 0.6)
  const rot = Math.atan2(armWest.out.x, armWest.out.z)
  signs.push({
    ...at(armWest, tm + 1.3, 0.45),
    y: 19.3,
    rot,
    text: '',
    plate: '#1d4f9c',
    width: 0.8,
    height: 0.8,
  })
  signs.push({
    ...at(armWest, tm, 0.47),
    y: 18.4,
    rot,
    text: 'Georgia State\nUniversity',
    letters: true,
    size: 0.5,
    line: 0.95,
    weight: 700,
    color: '#1d4f9c',
  })

  // the stair tower where a meets b, out into the court (lidar 320.5m)
  K.box('stucco', barNorth, 0, 4.5, 0, 2, [0, 18.5])
  K.box('blue', barNorth, -0.1, 4.6, -0.1, 2.1, [18.2, 18.6])

  // the flat roofs, and the arm's wall and coping over the bar's roof where they meet
  const bar = [outline[0]!, outline[1]!, outline[2]!, P(385.5, -521.5), P(367, -521.5), outline[7]!]
  const arm = [P(367, -521.5), P(385.5, -521.5), outline[4]!, outline[5]!]
  K.add('stucco', flat(inset(bar, 0.2), BAR_ROOF))
  K.add('stucco', flat(inset(arm, 0.2), ARM_ROOF))
  const meet = edges(arm)[0]!
  K.face('stucco', meet, 0, meet.len, BAR_ROOF, ARM_TOP)
  K.box('stucco', meet, 0, meet.len, -0.25, 0.08, [ARM_TOP - 0.3, ARM_TOP], false)

  // hidden blocks for the shadows: the windows' glass doesn't cast and the floors over the
  // ground floor are empty
  K.core('stucco', inset(bar, 1.4), CEILING, BAR_ROOF - 0.1)
  K.core('stucco', inset(arm, 1.4), CEILING, ARM_ROOF - 0.1)

  insideWalls(K.inside, outline, door, (p, q) => near(p, outline[0]!) && near(q, outline[1]!))
  return {
    parts: K.merged(),
    inside: K.inside,
    signs,
    // the windows cast here: the balconies are deeper than the hidden blocks can sit
    noShadow: ['trim'],
  }
}

export function piedmontNorthBGeometry(b: PiedmontNorthData) {
  const K = kit()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null
  const E = edges(outline)
  const [front, east, notch0, notch1, north, west, extNorth, extWest] = E as Edges
  const doorU = door ? (door.x - front.p.x) * front.dir.x + (door.z - front.p.z) * front.dir.z : -9

  // rows of single windows 3m apart, a brown grille under each (2021 photo)
  const rows = (e: Edge, from: number, skip: Range[] = []) => {
    const cols = columns(1.2, e.len - 1.2, 3).filter((u) => !skip.some(([a, c]) => u > a && u < c))
    const floors = B_FLOORS.filter((y) => y >= from)
    return windows(K, 'beige', e, cols, floors, [1.25, 1.05, 1.55], 0.18, 0.5)
  }
  // the diagonal front with the doors, the long sides, the court
  const store: Hole = [doorU - 3, doorU + 3, 0, 3.1]
  const fh = rows(front, 0, [[doorU - 3.5, doorU + 3.5]])
  K.reveal('beige', front, store, 0.3)
  K.add('glass', glassQuad(at(front, store[0], -0.3), at(front, store[1], -0.3), 0, 3.1, front.out))
  K.face('beige', front, 0, front.len, 0, B_TOP, [...fh, store])
  K.box('blue', front, doorU - 3.6, doorU + 3.6, 0, 2.4, [3.1, 3.4])
  for (const e of [east, west, extNorth]) K.face('beige', e, 0, e.len, 0, B_TOP, rows(e, 0))
  // against a's bar up to its top
  K.face('beige', extWest, 0, extWest.len, BAR_TOP - 0.5, B_TOP, rows(extWest, 15))
  // the north end is blank but for gsu's sign (2021 photo)
  for (const e of [north, notch0, notch1]) K.face('beige', e, 0, e.len, 0, B_TOP)
  // the cornice and the coping round the top
  for (const e of E) {
    K.box('beige', e, 0, e.len, 0, 0.35, [B_ROOF - 0.25, B_ROOF + 0.1])
    K.box('beige', e, -0.25, e.len + 0.25, -0.25, 0.1, [B_TOP - 0.3, B_TOP], false)
  }
  K.add('beige', flat(inset(outline, 0.2), B_ROOF))

  // raised parapets (lidar): the middle of the east face with the sign, the west face's, the
  // corner on the front, and the penthouse
  const raised = (e: Edge, u0: number, u1: number, y1: number) => {
    K.box('beige', e, u0, u1, -0.6, 0.1, [B_TOP - 0.3, y1])
    K.box('beige', e, u0 - 0.2, u1 + 0.2, -0.7, 0.4, [y1 - 0.5, y1 + 0.1])
  }
  raised(east, 25.8, 37.8, B_RAISED)
  raised(west, 22.5, 40.5, B_RAISED)
  raised(front, 24.5, 31, 26.2)
  const pent = [P(434, -541), P(437.5, -541), P(437.5, -547), P(434, -547)]
  K.prism('beige', pent, B_ROOF, B_PENTHOUSE)

  // gsu's name on the east face's raised parapet and high on the north end, a blue square up
  // to its right where the logo is
  const sign = (e: Edge, u: number, y: number, size: number, d: number) => {
    const rot = Math.atan2(e.out.x, e.out.z)
    const sq = size * 1.5
    signs.push({
      ...at(e, u + size * 2.2, d),
      y: y + size * 1.6,
      rot,
      text: '',
      plate: '#1d4f9c',
      width: sq,
      height: sq,
    })
    signs.push({
      ...at(e, u, d + 0.02),
      y,
      rot,
      text: 'Georgia State\nUniversity',
      letters: true,
      size,
      line: 0.95,
      weight: 700,
      color: '#1d4f9c',
    })
  }
  sign(east, 31.8, 25.4, 0.85, 0.15)
  sign(north, 6, 19.5, 1.1, 0.05)

  K.core('beige', inset(outline, 1.2), CEILING, B_ROOF - 0.1)
  insideWalls(K.inside, outline, door, (p, q) => near(p, front.p) && near(q, front.q))
  return {
    parts: K.merged(),
    inside: K.inside,
    signs,
    noShadow: ['glass', 'vent', 'blue'],
  }
}

export function piedmontNorthDiningGeometry(b: PiedmontNorthData) {
  const K = kit()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null
  const E = edges(outline)
  // the hall's south end, the step and the two sides against a, the link's front, the
  // pavilion's east end and north side, the porch's back, the hall's north front, its west side
  const [south, , , , linkNorth, pavEast, pavNorth, porchBack, hallNorth, hallWest] = E as Edges
  const [z0, z1] = [-517.5, -551.5]
  const roofAt = (p: Point) =>
    HALL_ROOF[0] + ((z0 - p.z) / (z0 - z1)) * (HALL_ROOF[1] - HALL_ROOF[0])

  // a hall wall up to the roof (2019 photo): red panels to `red` (to the clerestory on
  // `panels`), cream siding over them, a band of clerestory glass under the roof that steps
  // down with it, windows in `holes`
  const hallWall = (e: Edge, holes: Hole[], red: number, panels: Range[] = [], clere = true) => {
    const sloped = Math.abs(roofAt(e.p) - roofAt(e.q)) > 0.01
    const cuts = new Set([0, e.len, ...panels.flat()])
    if (sloped) for (let i = 1; i < 8; i++) cuts.add((e.len * i) / 8)
    const us = [...cuts].sort((a, b) => a - b)
    for (let i = 1; i < us.length; i++) {
      const [u0, u1] = [us[i - 1]!, us[i]!]
      const [r0, r1] = [roofAt(at(e, u0)), roofAt(at(e, u1))]
      const lo = Math.min(r0, r1)
      const band: Range = clere ? [lo - 1.55, lo - 0.3] : [lo, lo]
      const full = panels.some(([a, c]) => u0 >= a - 1e-6 && u1 <= c + 1e-6)
      const redTop = full ? band[0] : Math.min(red, band[0])
      const cut = holes.map(([a, c, y0, y1]): Hole => [a - u0, c - u0, y0, y1])
      const piece = (part: Part, y0: number, y1: number) => {
        for (const [a, c, b0, b1] of solidPieces(u1 - u0, y0, y1, cut))
          K.add(part, wallQuad(at(e, u0 + a), at(e, u0 + c), b0, b1, e.out, u0 + a))
      }
      piece('red', 0, redTop)
      piece('siding', redTop, band[0])
      if (clere) {
        K.reveal('siding', e, [u0, u1, band[0], band[1]], 0.1)
        K.add('glass', glassQuad(at(e, u0, -0.1), at(e, u1, -0.1), band[0], band[1], e.out))
        piece('siding', band[1], lo)
      }
      // up to the sloping roof
      if (sloped) {
        const c = [v3(at(e, u0), lo), v3(at(e, u1), lo), v3(at(e, u1), r1), v3(at(e, u0), r0)]
        K.add(
          'siding',
          poly(
            c,
            [
              [u0, lo],
              [u1, lo],
              [u1, r1],
              [u0, r0],
            ],
            toward(e.out),
          ),
        )
      }
    }
    for (const h of holes) {
      K.reveal('siding', e, h, 0.15)
      K.add('glass', glassQuad(at(e, h[0], -0.15), at(e, h[1], -0.15), h[2], h[3], e.out))
    }
  }

  // the north front, u from the porch: a door under the porch, red to the siding, the glass
  // corner on piedmont ave with "175 piedmont ave" on it
  hallWall(
    hallNorth,
    [
      [0.6, 3, 0, 2.7],
      [9.2, 14, 0.3, 3.4],
    ],
    3.4,
  )
  // piedmont ave side: the glass corner, then red panels up to the clerestory with
  // storefront windows between them
  hallWall(
    hallWest,
    [
      [0, 2.6, 0.3, 3.4],
      [8, 12, 0.4, 2.8],
      [17, 21, 0.4, 2.8],
      [26, 30, 0.4, 2.8],
    ],
    0,
    [
      [2.6, 8],
      [12, 17],
      [21, 26],
      [30, hallWest.len],
    ],
  )
  hallWall(south, [[2, 7.5, 0.6, 2.6]], 2.6, [], false)
  // the roof, out over the walls with a grey fascia round its edge. it stops at a's walls
  const roof = [
    P(339.2, -552.3),
    P(339.2, -516.7),
    P(349.5, -516.7),
    P(349.5, -521.5),
    P(367, -521.5),
    P(367, -552.3),
  ]
  K.add(
    'roof',
    tilted(roof, (p) => roofAt(p) + 0.05),
  )
  K.add(
    'roof',
    tilted(roof, (p) => roofAt(p) - 0.4, false),
  )
  for (const [a, c, o] of [
    [roof[0]!, roof[1]!, P(-1, 0)],
    [roof[5]!, roof[0]!, P(0, -1)],
    [roof[1]!, roof[2]!, P(0, 1)],
  ] as const) {
    const f = [v3(a, roofAt(a) - 0.4), v3(c, roofAt(c) - 0.4), v3(c, roofAt(c) + 0.05)]
    f.push(v3(a, roofAt(a) + 0.05))
    K.add(
      'roof',
      poly(
        f,
        [
          [0, 0],
          [1, 0],
          [1, 0.45],
          [0, 0.45],
        ],
        toward(o),
      ),
    )
  }

  // the link to a's arm: glass and siding under a flat roof
  const lh: Hole = [0.8, linkNorth.len - 0.8, 0.3, 3]
  K.face('siding', linkNorth, 0, linkNorth.len, 0, LINK_ROOF, [lh])
  K.reveal('siding', linkNorth, lh, 0.15)
  K.add(
    'glass',
    glassQuad(
      at(linkNorth, lh[0], -0.15),
      at(linkNorth, lh[1], -0.15),
      lh[2],
      lh[3],
      linkNorth.out,
    ),
  )
  K.add(
    'roof',
    flat([P(360.5, -551.5), P(367, -551.5), P(367, -560.5), P(360.5, -560.5)], LINK_ROOF),
  )

  // the pavilion: peach stucco, the porch out to 350.5 between two piers, a gable roof with
  // its ridge east-west and the gable over the porch facing piedmont ave
  const [px0, px1, pz0, pz1] = [350.5, 360.5, -551.5, -564]
  const zm = (pz0 + pz1) / 2
  const PIER = 1.4
  // the porch's back: the doors and the storefront round them
  const doorU = door ? (door.z - porchBack.p.z) * porchBack.dir.z : porchBack.len / 2
  const shop: Hole = [doorU - 2.5, doorU + 2.5, 0, 2.9]
  K.face('peach', porchBack, 0, porchBack.len, 0, PORCH_TOP, [shop])
  K.add('glass', glassQuad(at(porchBack, shop[0]), at(porchBack, shop[1]), 0, 2.9, porchBack.out))
  K.face('siding', porchBack, shop[0] - 0.3, shop[1] + 0.3, 2.9, PORCH_TOP, [], 0.03)
  for (const [z, s] of [
    [pz0, -1],
    [pz1, 1],
  ] as const) {
    const c = [P(px0, z), P(px0 + PIER, z), P(px0 + PIER, z + s * PIER), P(px0, z + s * PIER)]
    K.prism('peach', c, 0, PAVILION_EAVE, false)
  }
  const pw = edges([P(px0, pz1), P(px0, pz0), P(px1, pz0), P(px1, pz1)]) as Edges
  const [pavWest, , pavSide, pavBack] = pw
  K.face('peach', pavWest, PIER, pavWest.len - PIER, PORCH_TOP, PAVILION_EAVE)
  const ceil = [
    P(px0, pz0 - PIER),
    P(px0 + PIER, pz0 - PIER),
    P(px0 + PIER, pz1 + PIER),
    P(px0, pz1 + PIER),
  ]
  K.add('peach', flat(ceil, PORCH_TOP, false))
  K.add(
    'peach',
    flat([P(px0 + PIER, pz0), P(354, pz0), P(354, pz1), P(px0 + PIER, pz1)], PORCH_TOP, false),
  )
  // over the porch's north opening, the walls round the rest, above the link
  K.face('peach', pavBack, 6.5, px1 - px0 - PIER, PORCH_TOP, PAVILION_EAVE)
  K.face('peach', pavNorth, 0, pavNorth.len, 0, PAVILION_EAVE)
  K.face('peach', pavEast, 0, pavEast.len, 0, PAVILION_EAVE)
  K.face('peach', pavSide, 0, 9, LINK_ROOF, PAVILION_EAVE)
  // the gables and the roof, white trim up the front gable's edges
  const rise = PAVILION_RIDGE - PAVILION_EAVE
  for (const x of [px0, px1]) {
    const c = [
      v3(P(x, pz0), PAVILION_EAVE),
      v3(P(x, pz1), PAVILION_EAVE),
      v3(P(x, zm), PAVILION_RIDGE),
    ]
    const w = pz0 - pz1
    K.add(
      'peach',
      poly(
        c,
        [
          [0, 0],
          [w, 0],
          [w / 2, rise],
        ],
        toward(P(x === px0 ? -1 : 1, 0)),
      ),
    )
  }
  for (const [z, s] of [
    [pz0, 1],
    [pz1, -1],
  ] as const) {
    const ze = z + s * 0.5
    const c = [v3(P(px0 - 0.5, ze), PAVILION_EAVE - 0.3), v3(P(px1 + 0.5, ze), PAVILION_EAVE - 0.3)]
    c.push(v3(P(px1 + 0.5, zm), PAVILION_RIDGE + 0.15), v3(P(px0 - 0.5, zm), PAVILION_RIDGE + 0.15))
    K.add(
      'roof',
      poly(
        c,
        [
          [0, 0],
          [11, 0],
          [11, 7],
          [0, 7],
        ],
        new THREE.Vector3(0, 1, s),
      ),
    )
    const r = [
      v3(P(px0 - 0.52, ze), PAVILION_EAVE - 0.3),
      v3(P(px0 - 0.52, zm), PAVILION_RIDGE + 0.15),
    ]
    r.push(v3(P(px0 - 0.52, zm), PAVILION_RIDGE - 0.3), v3(P(px0 - 0.52, ze), PAVILION_EAVE - 0.75))
    K.add(
      'siding',
      poly(
        r,
        [
          [0, 0],
          [7, 0],
          [7, 0.45],
          [0, 0.45],
        ],
        toward(P(-1, 0)),
      ),
    )
  }
  // a hidden block over the porch for the shadows, the pavilion is hollow up there
  const hollow = [P(354.1, -551.6), P(360.4, -551.6), P(360.4, -563.9), P(354.1, -563.9)]
  K.core('peach', hollow, PORCH_TOP, PAVILION_EAVE)
  const hg = [v3(P(354.1, pz1 + 0.1), PAVILION_EAVE), v3(P(354.1, pz0 - 0.1), PAVILION_EAVE)]
  hg.push(v3(P(354.1, zm), PAVILION_RIDGE - 0.2))
  K.add(
    'peach',
    poly(
      hg,
      [
        [0, 0],
        [12, 0],
        [6, 3.6],
      ],
      toward(P(-1, 0)),
    ),
  )
  // the white "piedmont north" sign on the porch's front (the plate has the blue square)
  signs.push({
    x: px0 - 0.05,
    y: 4.45,
    z: zm,
    rot: -Math.PI / 2,
    text: 'PIEDMONT NORTH',
    scale: 1.2,
  })

  insideWalls(K.inside, outline, door, (p, q) => near(p, hallNorth.p) && near(q, hallNorth.q))
  const parts = K.merged()
  // the siding's ribs run along the walls, the metal's run up them: swap its walls' uvs
  const { normal, uv } = parts.siding!.attributes as Record<string, THREE.BufferAttribute>
  for (let i = 0; i < uv!.count; i++)
    if (Math.abs(normal!.getY(i)) < 0.5) uv!.setXY(i, uv!.getY(i), uv!.getX(i))
  return {
    parts,
    inside: K.inside,
    signs,
    noShadow: ['trim'],
  }
}
