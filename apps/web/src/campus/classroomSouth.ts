import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  clip,
  edges,
  flat,
  frame,
  glassQuad,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// classroom south (1966), the white marble slab on decatur street. a band of low windows
// along the street, then rows of small windows, one to a bay, a thin ledge under each row,
// and the top row higher up. the ends are blank marble in a running bond. in the
// corner where it meets its west wing is the lobby of 2020, the main entrance: glass, a
// cream box over the doors with the name on it, a revolving door under a dark canopy and a
// tan box on the corner. from mapillary (2019-2021), gsu's photos (2018-2026) and commons
// (2020, 2025). the back and the lower block behind it can't be seen from any street,
// they're made like the front. sources: docs/reference/classroom-south.md
//
// "a" is meters along decatur street from the central ave corner, "d" meters out toward
// decatur street (the building is at d < 0)

export type ClassroomSouthData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][]; lobby: number[][]; wing: number[][] }
}

// few parts, each is a draw call in every pass
export type Part =
  'marble' | 'glass' | 'frame' | 'clear' | 'drum' | 'cream' | 'tan' | 'grey' | 'blue'

// the low windows along the ground floor and the band over them (mapillary 2019)
export const RIBBON: [number, number] = [1.2, 1.65]
const BAND: [number, number] = [1.65, 2.2]
// the sills of the rows of small windows, each on a thin ledge. 2.5m apart, and 1.4 times
// that under the top row (mapillary 2019 at the central ave end, commons 2025). decatur st
// climbs about 4.5m toward library south, where the lowest two rows are really under the
// sidewalk. the game's ground is flat, so it's the central ave end all along
export const SILLS = [3.4, 5.9, 8.4, 10.9, 13.4, 17]
// about square (commons 2025, gsu 2021)
export const WINDOW: [number, number] = [0.85, 0.85]
// a window to each bay, the first this far from the central ave corner
export const BAY = 2.7
export const FIRST = 3.7
export const COLUMNS = 20
// the marble stands this far in front of osm's outline, the low windows are on it: a wall
// behind the outline would be behind the inside walls (interiorGeometry.ts)
export const RECESS = 0.35
// the marble's slabs on the front, two to a bay and two to a row of windows
export const SLAB: [number, number] = [BAY / 2, 1.25]
// where the slab goes deeper at the back, and the lower block behind it. no photo sees the
// lower block, how high it is is a guess
const BACK = -21.35
const DEEP: [number, number] = [23, -29.6]
export const REAR = 15
// the lobby: its front, how high it goes (gsu's 2019 mapillary photo from central ave has
// the cream box going up about 20m, as high as the logo)
export const LOBBY = 20.2
// the glass stair between the slab and the cream box is lower, and 2.6m deep (mapillary
// 2019 from central ave)
const STAIR = 17
const STAIR_BACK = -12
export const LOBBY_FRONT = -8.52
// the lobby's front, meters from the slab's end toward central ave (commons, 2020):
// the glass stair, the cream box over the doors, a strip of glass, the tan box on the
// corner, which wraps round it
const CREAM: [number, number] = [2.9, 8]
const TAN: [number, number] = [9.4, 12.75]
const CREAM_BOTTOM = 2.8
const TAN_BOTTOM = 3
// the dark canopy over the doors, on two posts
export const CANOPY: [number, number] = [2.95, 7.8]
// the doors on decatur street toward library south: a cream box of a canopy over glass
// doors, between two bays (gsu 2021, commons 2025: between the second and third windows
// from the library south end)
export const SIDE_ENTRANCE = 50.95
// how wide and high the opening in the marble is there
const DOORS: [number, number] = [3.4, 2.75]
// the low windows stop 6m short of those doors, past that it's plain marble behind a brick
// planter (gsu 2021)
const RIBBON_END = SIDE_ENTRANCE - 6
// the west wing along central ave (2019 mapillary photos, a 2021 dashcam): bands of light,
// grey and tan panels, a meter high, in long pieces, and glass up the stairs. its back and its
// side toward g deck are plain light panels
export const WING_TOP = 14.5
const STRIPE = 1.07
// the glass stair on central ave, meters from the decatur street end, and the glass corner
const WING_STAIR: [number, number] = [10.2, 12.7]
const WING_CORNER = 1.6
// the other doors, on the end at library south, set in under the marble ("95 decatur st"
// on gsu's 2026 photos), meters in from decatur street
const END_DOOR: [number, number] = [2.4, 6.6]

type Wall = {
  p: Point
  len: number
  dir: Point
  o: Point
  // a point u along the wall (from its left end seen from outside) and d out from it
  at: (u: number, d?: number) => Point
}

function wallOf(p: Point, q: Point, o: Point): Wall {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  return {
    p,
    len,
    dir,
    o,
    at: (u, d = 0) => ({ x: p.x + dir.x * u + o.x * d, z: p.z + dir.z * u + o.z * d }),
  }
}
const flip = (o: Point) => ({ x: -o.x, z: -o.z })

// osm's outline as walls, left to right seen from outside. edges nearly in a line are one
// wall (osm has the street front as four)
export function classroomWalls(outline: Point[]) {
  const all = edges(outline).filter((e) => e.len > 0.05)
  const turn = (k: number) => {
    const [e, prev] = [all[k]!, all.at(k - 1)!]
    return e.dir.x * prev.dir.x + e.dir.z * prev.dir.z < 0.99
  }
  const start = all.findIndex((_, k) => turn(k))
  const ring = [...all.slice(start), ...all.slice(0, start)]
  const walls: Wall[] = []
  for (let i = 0; i < ring.length;) {
    const first = ring[i]!
    let j = i
    while (j + 1 < ring.length) {
      const next = ring[j + 1]!
      const off = (next.q.x - first.p.x) * first.out.x + (next.q.z - first.p.z) * first.out.z
      if (next.dir.x * first.dir.x + next.dir.z * first.dir.z < 0.99 || Math.abs(off) > 0.7) break
      j++
    }
    const [p, q] = [first.p, ring[j]!.q]
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    // square to the whole run, pointing out
    let o = { x: (q.z - p.z) / len, z: -(q.x - p.x) / len }
    if (o.x * first.out.x + o.z * first.out.z < 0) o = flip(o)
    const right = { x: o.z, z: -o.x }
    const forward = (q.x - p.x) * right.x + (q.z - p.z) * right.z > 0
    walls.push(forward ? wallOf(p, q, o) : wallOf(q, p, o))
    i = j + 1
  }
  return walls
}

export function classroomSouthGeometry(b: ClassroomSouthData) {
  const { add, inside, merged } = collect<Part>()
  const H = b.height
  // the roof behind the parapet
  const roof = H - 0.6
  const outline = b.points.map(pt)
  const [corner, end] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(corner, end)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : f.at(-5.2, LOBBY_FRONT)
  const signs: Sign[] = []
  const walls = classroomWalls(outline)

  // which part a spot is in: the slab, the lobby or the lower block behind
  const blockOf = (p: Point) => {
    const [a, d] = [f.aOf(p), f.dOf(p)]
    if (a < -0.3) return 'lobby'
    if (d > BACK || (a > DEEP[0] && d > DEEP[1])) return 'slab'
    return 'rear'
  }

  // marble, with its slab joints lined up with the windows and the sills
  let shift = 0
  const marble = (geo: ReturnType<typeof wallQuad>) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + shift, uv.getY(i) + 0.4)
    add('marble', geo)
  }
  // a flat piece of wall facing out, d out from the wall line
  const face = (part: Part, w: Wall, u0: number, u1: number, y0: number, y1: number, d = 0) => {
    if (u1 - u0 < 0.001 || y1 - y0 < 0.001) return
    const geo = wallQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o, u0)
    if (part === 'marble') marble(geo)
    else add(part, geo)
  }
  // a piece square to the wall at u, from d0 to d1 out, facing `into`
  const side = (
    part: Part,
    w: Wall,
    u: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
    into: Point,
  ) => {
    if (y1 > y0) add(part, wallQuad(w.at(u, d0), w.at(u, d1), y0, y1, into))
  }
  // a box sticking out of a wall, u0-u1 along it, y0-y1 up, d0 to d1 out. no back
  const lump = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d1: number,
    d0 = 0,
  ) => {
    face(part, w, u0, u1, y0, y1, d1)
    side(part, w, u0, d0, d1, y0, y1, flip(w.dir))
    side(part, w, u1, d0, d1, y0, y1, w.dir)
    const rim = [w.at(u0, d0), w.at(u1, d0), w.at(u1, d1), w.at(u0, d1)]
    add(part, flat(rim, y1))
    if (y0 > 0.01) add(part, flat(rim, y0, false))
  }
  // the sides, top and bottom of a hole from d0 back to d1
  const reveal = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d0: number,
    d1: number,
  ) => {
    side(part, w, u0, d0, d1, y0, y1, w.dir)
    side(part, w, u1, d0, d1, y0, y1, flip(w.dir))
    const rim = [w.at(u0, d0), w.at(u1, d0), w.at(u1, d1), w.at(u0, d1)]
    if (y0 > 0.01) add(part, flat(rim, y0))
    add(part, flat(rim, y1, false))
  }
  const glass = (w: Wall, u0: number, u1: number, y0: number, y1: number, d: number) => {
    if (u1 - u0 > 0.01 && y1 - y0 > 0.01)
      add('glass', glassQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o))
  }
  // glass you see into: the lobby, the doors
  const curtain = (w: Wall, u0: number, u1: number, y0: number, y1: number, d = 0.02) => {
    if (u1 - u0 > 0.01 && y1 - y0 > 0.01)
      add('clear', wallQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o, u0))
  }
  // the inside of the parapet over the roof, and its cap
  const parapet = (w: Wall, u0: number, u1: number, from: number, top: number, d: number) => {
    const back = wallOf(w.at(u1, d - 0.3), w.at(u0, d - 0.3), flip(w.o))
    face('marble', back, 0, back.len, from, top - 0.2)
    lump('marble', w, u0, u1, top - 0.2, top, d + 0.05, d - 0.3)
  }
  // how far a wall's ends reach out to meet the next wall round an outside corner. at an
  // inside corner it's negative: how far in things sticking out of it have to stop
  const reach = (w: Wall, which: 0 | 1) => {
    const at = which ? w.at(w.len) : w.p
    const other = walls.find(
      (v) => v !== w && [v.p, v.at(v.len)].some((p) => Math.hypot(p.x - at.x, p.z - at.z) < 0.2),
    )
    if (!other) return 0
    if (blockOf(other.at(other.len / 2, -1)) === 'lobby') return -RECESS - 0.1
    const t = other.o.x * w.dir.x + other.o.z * w.dir.z
    if (which ? t > 0.5 : t < -0.5) return RECESS
    return which ? (t < -0.5 ? -RECESS - 0.1 : 0) : t > 0.5 ? -RECESS - 0.1 : 0
  }

  // the lobby's front, u meters from the slab's end toward central ave
  const lobbyFront = wallOf(f.at(0, LOBBY_FRONT), f.at(-13, LOBBY_FRONT), f.out)
  const uFront = (w: Wall, u: number) => {
    const p = lobbyFront.at(u)
    return (p.x - w.p.x) * w.dir.x + (p.z - w.p.z) * w.dir.z
  }

  for (const w of walls) {
    const block = blockOf(w.at(w.len / 2, -1))
    const facing = w.o.x * f.out.x + w.o.z * f.out.z
    const sideways = w.o.x * f.along.x + w.o.z * f.along.z
    const a = f.aOf(w.at(w.len / 2))
    const [e0, e1] = [reach(w, 0), reach(w, 1)]
    shift = 0
    if (block === 'lobby') lobbyWall(w, facing, sideways)
    else if (block === 'slab' && facing > 0.9 && f.dOf(w.at(w.len / 2)) > -1) front(w)
    else if (block === 'slab' && Math.abs(sideways) > 0.9 && (a < 1 || a > 59))
      // osm has the end at library south as two walls, the doors are in the one on the street
      blankEnd(w, e0, e1, a > 59 && f.dOf(w.at(w.len / 2)) > -10)
    else backWall(w, block === 'slab' ? H : REAR, e0, e1)
  }

  /**
   * The front on decatur street: the low windows along the ground floor, set in under a
   * band, the rows of small windows with a thin ledge under each, and the parapet. u runs
   * from the library south end
   */
  function front(w: Wall) {
    const uOf = (a: number) => w.len - a
    const cols = Array.from({ length: COLUMNS }, (_, k) => uOf(FIRST + k * BAY))
    // a slab centered on each window
    shift = (((SLAB[0] / 2 - cols[0]!) % SLAB[0]) + SLAB[0]) % SLAB[0]
    const holes: Hole[] = SILLS.flatMap((y0) =>
      cols.map((u): Hole => [u - WINDOW[0] / 2, u + WINDOW[0] / 2, y0, y0 + WINDOW[1]]),
    )
    // the doors toward library south, between two bays (sideEntrance)
    const e = uOf(SIDE_ENTRANCE)
    const entry: Hole = [e - DOORS[0] / 2, e + DOORS[0] / 2, 0, DOORS[1]]
    const ribbons: Hole[] = [[uOf(RIBBON_END), uOf(1.3), RIBBON[0], RIBBON[1]]]
    const [lo, hi] = [-RECESS, w.len + RECESS]
    const cut = [...holes, ...ribbons, entry].map(([u0, u1, v0, v1]): Hole => [
      u0 - lo,
      u1 - lo,
      v0,
      v1,
    ])
    for (const [u0, u1, v0, v1] of solidPieces(hi - lo, 0, H, cut))
      face('marble', w, u0 + lo, u1 + lo, v0, v1, RECESS)

    const back = RECESS - 0.2
    for (const [u0, u1, y0, y1] of holes) {
      reveal('marble', w, u0, u1, y0, y1, RECESS, back)
      glass(w, u0, u1, y0, y1, back)
    }
    // the low windows sit on the outline, a pier between each bay
    for (const [r0, r1, y0, y1] of ribbons) {
      reveal('marble', w, r0, r1, y0, y1, RECESS, 0.02)
      glass(w, r0, r1, y0, y1, 0.02)
      for (const u of cols.map((c) => c - BAY / 2))
        if (u > r0 + 0.3 && u < r1 - 0.3) lump('marble', w, u - 0.2, u + 0.2, y0, y1, RECESS, 0.02)
    }
    lump('marble', w, lo, hi, BAND[0], BAND[1], RECESS + 0.12, RECESS)
    // a thin ledge a little under each row of windows, a shadow line from across the street
    for (const y of SILLS) lump('marble', w, lo, hi, y - 0.34, y - 0.24, RECESS + 0.04, RECESS)
    parapet(w, lo, hi, roof, H, RECESS)
    sideEntrance(w, e)
  }

  // the doors toward library south: a cream box round them, wide piers, the name on the band
  // over the doors, four glass doors under a transom set well back (gsu 2021)
  function sideEntrance(w: Wall, e: number) {
    const [u0, u1] = [e - DOORS[0] / 2, e + DOORS[0] / 2]
    const [top, head] = [3.45, DOORS[1]]
    reveal('marble', w, u0, u1, 0, head, RECESS, 0.02)
    curtain(w, u0, u1, 0, head)
    lump('frame', w, u0, u1, 2.3, 2.4, 0.08, 0.02)
    lump('cream', w, u0 - 0.9, u1 + 0.9, head, top, 1.3, RECESS)
    lump('cream', w, u0 - 0.9, u0, 0, head, 1.3, RECESS)
    lump('cream', w, u1, u1 + 0.9, 0, head, 1.3, RECESS)
    const s = w.at(e - 0.3, 1.32)
    signs.push({
      x: s.x,
      y: 3.1,
      z: s.z,
      rot: Math.atan2(w.o.x, w.o.z),
      text: 'CLASSROOM SOUTH',
      plate: '#e9eaeb',
      color: '#33363b',
      scale: 0.5,
    })
  }

  // slabs in a running bond on the ends, 1.5 by 1.25m: the material's slabs, stretched,
  // every other course shifted half a slab
  function bond(w: Wall, u0: number, u1: number, y0: number, y1: number, d: number) {
    const course = 1.25
    const [sx, sy] = [SLAB[0] / 1.5, SLAB[1] / course]
    for (let k = Math.floor(y0 / course); k * course < y1 - 0.001; k++) {
      const [c0, c1] = [Math.max(y0, k * course), Math.min(y1, (k + 1) * course)]
      if (c1 - c0 < 0.001) continue
      const geo = wallQuad(w.at(u0, d), w.at(u1, d), c0, c1, w.o, u0)
      const uv = geo.getAttribute('uv')
      for (let i = 0; i < uv.count; i++)
        uv.setXY(
          i,
          uv.getX(i) * sx + (k % 2) * (SLAB[0] / 2),
          k * SLAB[1] + (uv.getY(i) - k * course) * sy,
        )
      add('marble', geo)
    }
  }

  // a marble end, no windows. the one at library south has doors in the corner
  function blankEnd(w: Wall, e0: number, e1: number, library: boolean) {
    const [lo, hi] = [-Math.max(e0, 0), w.len + Math.max(e1, 0)]
    if (!library) bond(w, lo, hi, 0, H, RECESS)
    else {
      // u runs from the back toward decatur street here
      const [d0, d1] = [w.len - END_DOOR[1], w.len - END_DOOR[0]]
      const top = 3.3
      bond(w, lo, d0, 0, top, RECESS)
      bond(w, d1, hi, 0, top, RECESS)
      bond(w, lo, hi, top, H, RECESS)
      // set in under the marble: marble boards, the door and its transom, stucco (about two
      // thirds as bright as the marble in the 2026 photo, like the tan)
      const back = 0.05
      reveal('marble', w, d0, d1, 0, top, RECESS, back)
      // narrow upright boards of marble: its slabs, squeezed
      const boards = wallQuad(w.at(d0, back), w.at(d0 + 1.5, back), 0, top, w.o, 0)
      const uv = boards.getAttribute('uv')
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, (uv.getX(i) * SLAB[0]) / 0.38, (uv.getY(i) * SLAB[1]) / top)
      add('marble', boards)
      curtain(w, d0 + 1.5, d0 + 3.3, 0, 3, back + 0.02)
      lump('frame', w, d0 + 1.5, d0 + 3.3, 2.3, 2.38, back + 0.04, back)
      lump('frame', w, d0 + 1.5, d0 + 3.3, 3, top, back + 0.04, back)
      // a door and a sidelight
      lump('frame', w, d0 + 2.4, d0 + 2.46, 0, 3, back + 0.04, back)
      face('tan', w, d0 + 3.3, d1, 0, top, back)
      for (const [text, at, scale] of [
        ['CLASSROOM SOUTH', d0 + 0.75, 0.42],
        ['95\nDECATUR ST.', d0 + 4.05, 0.36],
      ] as const) {
        const s = w.at(at, back + 0.03)
        signs.push({
          x: s.x,
          y: 2.45,
          z: s.z,
          rot: Math.atan2(w.o.x, w.o.z),
          text,
          scale,
          plate: '#e9eaeb',
          color: '#33363b',
        })
      }
    }
    parapet(w, lo, hi, roof, H, RECESS)
  }

  // the back and the lower block: marble with the front's windows. no photo sees them
  function backWall(w: Wall, top: number, e0: number, e1: number) {
    const holes: Hole[] = []
    if (w.len > 5)
      for (const y0 of SILLS.filter((s) => s + WINDOW[1] < top - 1))
        for (let u = (w.len % BAY) / 2 + BAY / 2; u < w.len - 1; u += BAY)
          holes.push([u - WINDOW[0] / 2, u + WINDOW[0] / 2, y0, y0 + WINDOW[1]])
    const [lo, hi] = [-Math.max(e0, 0), w.len + Math.max(e1, 0)]
    const cut = holes.map(([u0, u1, v0, v1]): Hole => [u0 - lo, u1 - lo, v0, v1])
    for (const [u0, u1, v0, v1] of solidPieces(hi - lo, 0, top, cut))
      face('marble', w, u0 + lo, u1 + lo, v0, v1, RECESS)
    for (const [u0, u1, y0, y1] of holes) {
      reveal('marble', w, u0, u1, y0, y1, RECESS, RECESS - 0.2)
      glass(w, u0, u1, y0, y1, RECESS - 0.2)
    }
    // the ledges too, but not on the short bits in the corners
    if (w.len > 5)
      for (const y of SILLS.filter((s) => s < top - 1))
        lump('marble', w, -e0, w.len + e1, y - 0.34, y - 0.24, RECESS + 0.04, RECESS)
    parapet(w, lo, hi, top - 0.6, top, RECESS)
  }

  /**
   * One wall of the lobby: glass all the way up (the glass stair by the slab, the corner,
   * central ave), less where the cream and tan boxes are in front of it. its back is
   * against the wing, only the bit over the wing shows
   */
  function lobbyWall(w: Wall, facing: number, sideways: number) {
    if (facing < -0.9) return curtain(w, 0, w.len, 13.5, LOBBY)
    // the glass stair next to the slab
    const stair = facing > 0.9 && f.dOf(w.p) < -9
    const top = stair ? STAIR : LOBBY
    // where the boxes are in front of this wall, [u0, u1, bottom, top]
    const boxes: Hole[] = []
    const span = (u0: number, u1: number, y: number) => {
      const [m, n] = [Math.max(0, Math.min(u0, u1)), Math.min(w.len, Math.max(u0, u1))]
      if (n > m) boxes.push([m, n, y, top])
    }
    if (facing > 0.9) {
      span(uFront(w, CREAM[0]), uFront(w, CREAM[1]), CREAM_BOTTOM)
      span(uFront(w, TAN[0]), uFront(w, TAN[1]), TAN_BOTTOM)
    }
    // central ave: the tan box wraps round the corner for 3m
    if (sideways < -0.9 && w.len > 5) {
      const u = uFront(w, TAN[1])
      span(u, u + (w.dir.x * f.out.x + w.dir.z * f.out.z > 0 ? -3 : 3), TAN_BOTTOM)
    }
    for (const [u0, u1, v0, v1] of solidPieces(w.len, 0, top, boxes)) curtain(w, u0, u1, v0, v1)
    // the top edge
    lump('frame', w, 0, w.len, top - 0.4, top, 0.05, -0.3)
  }

  // the boxes in front of the lobby's glass, and the entrance under the cream one
  {
    const w = lobbyFront
    lump('cream', w, CREAM[0], CREAM[1], CREAM_BOTTOM, LOBBY, 0.3, 0.02)
    // the tan box, round the corner onto central ave
    lump('tan', w, TAN[0], TAN[1] + 0.45, TAN_BOTTOM, LOBBY, 0.45, 0.02)
    const aside = wallOf(w.at(TAN[1] + 0.45, 0.45), w.at(TAN[1] + 0.45, -3), flip(f.along))
    lump('tan', aside, 0, aside.len, TAN_BOTTOM, LOBBY, 0.45, 0)
    // the blue stripe down the cream box, and the logo up top (a plain blue square)
    lump('blue', w, CREAM[0] + 0.55, CREAM[0] + 0.78, 3.8, LOBBY - 1.2, 0.36, 0.3)
    lump('blue', w, CREAM[0] + 0.9, CREAM[0] + 2.9, LOBBY - 3.4, LOBBY - 1.4, 0.34, 0.3)
    // a deep fascia, 2.4m out (2026 photo)
    const depth = 2.4
    lump('frame', w, CANOPY[0], CANOPY[1], 2.35, 2.7, depth, 0.02)
    for (const u of [3.75, 7.3])
      lump('frame', w, u - 0.06, u + 0.06, 0, 2.35, depth - 0.2, depth - 0.32)
    // the revolving door: a drum of glass half out of the wall, a dark top. the game's door
    // is in it (build-campus.mjs). its glass is the window family, which isn't see-through:
    // the game's sliding door panels are behind it and showed through the lobby glass pale
    const c = (door.x - w.p.x) * w.dir.x + (door.z - w.p.z) * w.dir.z
    const r = 1.05
    const n = 8
    for (let k = 0; k < n; k++) {
      const [t0, t1] = [(Math.PI * k) / n, (Math.PI * (k + 1)) / n]
      const p0 = w.at(c - Math.cos(t0) * r, Math.sin(t0) * r)
      const p1 = w.at(c - Math.cos(t1) * r, Math.sin(t1) * r)
      const tm = (t0 + t1) / 2
      const o = {
        x: -w.dir.x * Math.cos(tm) + w.o.x * Math.sin(tm),
        z: -w.dir.z * Math.cos(tm) + w.o.z * Math.sin(tm),
      }
      add('drum', glassQuad(p0, p1, 0, 2.2, o))
    }
    lump('frame', w, c - r, c + r, 2.2, 2.3, r, 0.02)
    // wide bronze jambs either side, reaching round the ends of the drum, and a band over
    // it where it meets the lobby's glass. they also cover the game's sliding door panels
    // behind, which are wider than the drum
    const side = DOOR_WIDTH / 2 + 0.05
    lump('frame', w, c - side, c + side, 2.2, DOOR_HEIGHT + 0.05, 0.1, 0.02)
    lump('frame', w, c - side, c - r + 0.12, 0, 2.2, 0.35, 0.02)
    lump('frame', w, c + r - 0.12, c + side, 0, 2.2, 0.35, 0.02)
    // its dark bronze frame: posts round the front of the drum
    for (const t of [0.25, 0.5, 0.75]) {
      const u = c - Math.cos(Math.PI * t) * r
      const d = Math.sin(Math.PI * t) * r
      lump('frame', w, u - 0.04, u + 0.04, 0, 2.2, d + 0.03, d - 0.05)
    }
    // a mullion either side of the single door next to it
    for (const u of [c + r + 0.1, c + r + 0.85])
      lump('frame', w, u - 0.03, u + 0.03, 0, 2.3, 0.06, 0.02)
    const s = w.at(CREAM[0] + 2.45, 0.33)
    signs.push({
      x: s.x,
      y: 3.5,
      z: s.z,
      rot: Math.atan2(w.o.x, w.o.z),
      text: 'CLASSROOM SOUTH',
      plate: '#e9eaeb',
      color: '#33363b',
      scale: 0.62,
    })
  }

  // where the slab stands over the lobby and the lower block
  const over = (p: Point, q: Point, o: Point, y0: number, bonded: boolean) => {
    const w = wallOf(p, q, o)
    if (bonded) bond(w, 0, w.len, y0, H, 0)
    else face('marble', w, 0, w.len, y0, H)
    parapet(w, 0, w.len, roof, H, 0)
  }
  const [back, left] = [flip(f.out), flip(f.along)]
  // its end over the glass stair, and the cream box's side and back over it
  over(f.at(-RECESS, STAIR_BACK), f.at(-RECESS, -9.35), left, STAIR, true)
  const notch = wallOf(f.at(-2.9, STAIR_BACK), f.at(-RECESS, STAIR_BACK), f.out)
  face('cream', notch, 0, notch.len, STAIR, LOBBY)
  const boxSide = wallOf(f.at(-2.9, -9.35), f.at(-2.9, STAIR_BACK), f.along)
  face('cream', boxSide, 0, boxSide.len, STAIR, LOBBY)
  // its back over the lower block, and the side of the deeper part
  over(f.at(DEEP[0], DEEP[1]), f.at(32.3, DEEP[1]), back, REAR - 0.6, false)
  over(f.at(DEEP[0], -27.7), f.at(DEEP[0], DEEP[1]), left, REAR - 0.6, false)

  // the roofs, clipped out of osm's outline
  const [aOf, dOf] = [(p: Point) => f.aOf(p), (p: Point) => f.dOf(p)]
  const roofAt = (y: number, ...sides: ((p: Point) => number)[]) =>
    add(
      'tan',
      flat(
        sides.reduce((acc, side) => clip(acc, side), outline),
        y,
      ),
    )
  roofAt(
    roof,
    (p) => aOf(p) + 0.3,
    (p) => dOf(p) - BACK,
  )
  roofAt(
    roof,
    (p) => aOf(p) - DEEP[0],
    (p) => BACK - dOf(p),
    (p) => dOf(p) - DEEP[1],
  )
  roofAt(
    REAR - 0.6,
    (p) => aOf(p) + 0.3,
    (p) => BACK - dOf(p),
    (p) => DEEP[0] - aOf(p),
  )
  roofAt(
    REAR - 0.6,
    (p) => aOf(p) - DEEP[0],
    (p) => DEEP[1] - dOf(p),
  )
  roofAt(LOBBY - 0.3, (p) => -2.9 - aOf(p))
  roofAt(
    LOBBY - 0.3,
    (p) => aOf(p) + 2.9,
    (p) => -0.3 - aOf(p),
    (p) => STAIR_BACK - dOf(p),
  )
  roofAt(
    STAIR,
    (p) => aOf(p) + 2.9,
    (p) => -0.3 - aOf(p),
    (p) => dOf(p) - STAIR_BACK,
  )
  // a stair house and a few units on the roof (satellite)
  const box = (a0: number, a1: number, d0: number, d1: number, h: number, part: Part) => {
    const w = wallOf(f.at(a0, d0), f.at(a1, d0), f.out)
    lump(part, w, 0, w.len, roof, roof + h, 0, d1 - d0)
  }
  box(26, 31, -9, -15, 3, 'marble')
  box(36, 40, -6, -9, 1.5, 'cream')
  box(44, 49, -6, -9, 1.5, 'cream')

  // the west wing: its walls, less the ones against classroom south
  const wing = b.landmark!.wing.map(pt)
  const touching = (p: Point) =>
    edges(outline).some((e) => {
      const t = (p.x - e.p.x) * e.dir.x + (p.z - e.p.z) * e.dir.z
      return (
        t > -0.1 &&
        t < e.len + 0.1 &&
        Math.abs((p.x - e.p.x) * e.out.x + (p.z - e.p.z) * e.out.z) < 0.3
      )
    })
  const wingWalls = classroomWalls(wing).filter((w) => !touching(w.at(w.len / 2)))
  // the longest one is central ave, the one facing decatur street is its end
  const avenue = wingWalls.reduce((m, w) => (w.len > m.len ? w : m))
  for (const w of wingWalls) {
    const facing = w.o.x * f.out.x + w.o.z * f.out.z
    const striped = w === avenue || facing > 0.9
    // on central ave u runs from the far end, the stair is measured from decatur street
    const holes: Hole[] = []
    if (w === avenue) {
      holes.push([w.len - WING_STAIR[1], w.len - WING_STAIR[0], 0, WING_TOP - 0.6])
      holes.push([0, WING_CORNER, 0, WING_TOP - 0.6])
    }
    if (striped) stripes(w, holes)
    else
      for (const [u0, u1, v0, v1] of solidPieces(w.len, 0, WING_TOP, holes))
        face('cream', w, u0, u1, v0, v1)
    for (const [u0, u1, y0, y1] of holes) {
      reveal('cream', w, u0, u1, y0, y1, 0, -0.5)
      curtain(w, u0, u1, y0, y1, -0.5)
    }
    // glass round the corner at the far end of central ave
    if (w !== avenue && Math.hypot(w.at(w.len).x - avenue.p.x, w.at(w.len).z - avenue.p.z) < 0.5) {
      const u0 = w.len - WING_CORNER
      face('cream', w, u0, w.len, WING_TOP - 0.6, WING_TOP)
      reveal('cream', w, u0, w.len, 0, WING_TOP - 0.6, 0, -0.5)
      curtain(w, u0, w.len, 0, WING_TOP - 0.6, -0.5)
    }
    parapet(w, 0, w.len, WING_TOP - 0.6, WING_TOP, 0)
  }
  add('tan', flat(wing, WING_TOP - 0.6))

  /**
   * Bands of panels, light, grey and tan, each piece 5-11m long. the same "random"
   * pattern every time, no two pieces next to each other the same
   */
  function stripes(w: Wall, holes: Hole[]) {
    // mostly light, a grey or tan piece now and then
    const tones: Part[] = ['cream', 'grey', 'cream', 'tan']
    const rnd = (k: number) => {
      const n = Math.sin(k * 12.9898 + w.len * 78.233) * 43758.5453
      return n - Math.floor(n)
    }
    let k = 0
    for (let y = 0; y < WING_TOP - 0.6 - 0.01; y += STRIPE) {
      const top = Math.min(y + STRIPE, WING_TOP - 0.6)
      let u = -rnd(k++) * 4
      let last: Part | null = null
      while (u < w.len) {
        const len = 5 + Math.floor(rnd(k++) * 5) * 1.5
        let tone = tones[Math.floor(rnd(k++) * tones.length)]!
        if (tone === last) tone = tone === 'cream' ? 'grey' : 'cream'
        last = tone
        const [a, z] = [Math.max(u, 0), Math.min(u + len, w.len)]
        const cut = holes.map(([u0, u1, v0, v1]): Hole => [u0 - a, u1 - a, v0, v1])
        for (const [u0, u1, v0, v1] of solidPieces(z - a, y, top, cut))
          face(tone, w, a + u0, a + u1, v0, v1)
        u += len
      }
    }
    face('cream', w, 0, w.len, WING_TOP - 0.6, WING_TOP)
  }

  // the inside of the ground floor walls: glass along the low windows and the lobby
  for (const { p, len, dir, out } of edges(outline)) {
    if (len < 0.05) continue
    const into = flip(out)
    const at = (u: number) => ({ x: p.x + dir.x * u, z: p.z + dir.z * u })
    const t = (door.x - p.x) * dir.x + (door.z - p.z) * dir.z
    const onEdge =
      t > 0 && t < len && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
    const holes: Hole[] = onEdge ? [[t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]] : []
    const mid = at(len / 2)
    const facing = out.x * f.out.x + out.z * f.out.z
    const lobby = blockOf({ x: mid.x - out.x, z: mid.z - out.z }) === 'lobby' && facing > -0.9
    // the low windows on decatur street, as far as they go along this edge
    const uAt = (a: number) => ((a - f.aOf(p)) / (f.aOf(at(len)) - f.aOf(p))) * len
    const [g0, g1] = [uAt(1.3), uAt(RIBBON_END)].sort((m, n) => m - n) as [number, number]
    const street = facing > 0.9 && Math.abs(f.dOf(mid)) < 1 && g1 > 0 && g0 < len
    const glassy: Hole[] = lobby
      ? solidPieces(len, 0, CEILING, holes)
      : street
        ? [[Math.max(g0, 0), Math.min(g1, len), RIBBON[0], RIBBON[1]]]
        : []
    for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, [...holes, ...glassy]))
      inside.solid.push(wallQuad(at(u0), at(u1), v0, v1, into))
    for (const [u0, u1, v0, v1] of glassy) inside.glass.push(wallQuad(at(u0), at(u1), v0, v1, into))
  }

  // the window glass is deep in the walls, the drum is under the canopy and the blue bits
  // are flat on the box: their shadows don't show
  return { parts: merged(), inside, signs, first: ['marble'], noShadow: ['glass', 'drum', 'blue'] }
}
