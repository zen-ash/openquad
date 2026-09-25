import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
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

// student center west, the old university center (1963). a white marble box on courtland
// street: rows of tall slabs with a row of short ones between them, a band of cast stone
// grilles along the street, carved columns with slot windows on the decatur street end,
// and a higher block set back on the roof. from gsu's photos (2023-2026), two photos on
// commons (2019) and mapillary (2019-2021). the side on the urban life plaza is from one
// photo, the roof from the satellite. sources: docs/reference/student-center-west.md
//
// "a" is meters along courtland street from the decatur street corner, "d" meters out
// toward the street (the building is at d < 0)

export type StudentCenterWestData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][] }
}

export type Part = 'marble' | 'stone' | 'shade' | 'glass' | 'cream' | 'frame' | 'blue' | 'roof'

// rows of tall slabs with a row of short wide ones between them, 5 tall rows at the
// bookstore end (courtland street climbs toward decatur street, where only 4 show). the
// bottom short row is mostly under the sidewalk
export const TALL = 1.7
export const SHORT = 0.82
export const BOTTOM = 0.42
// the block on the roof, [a from, a to, d front, d back] and how much higher. solved from
// both 2019 photos at once: the corner one sees its ends and top, the one from the
// bookstore end only its top peeking over the parapet. the satellite has it a bit further
// along and closer to the street, it leans
export const UPPER: [number, number, number, number] = [18.5, 61, -7, -29.7]
export const RISE = 4
// the cast stone grilles along courtland street, centers, and how high they go
export const GRILLES = [21.6, 29.95, 38.3, 46.65, 55]
const GRILLE_WIDTH = 6.6
const GRILLE: [number, number] = [2.35, 4.4]
// the doors under "66" (the door is in the middle of them) and the side door under the
// window at the decatur street end, which was cinefest's
const ENTRANCE: [number, number] = [69.84, 73.34]
const ENTRANCE_TOP = BOTTOM + TALL * 2 + SHORT
const SIDE_DOOR: [number, number] = [4.02, 7.04]
// the carved columns on decatur street, meters from the courtland corner
export const COLUMNS = [9.62, 13.15, 16.68, 20.21, 23.74, 27.27, 30.8]
const COLUMN = 0.84
const SET = 0.08
// banners on arms along the top, where they are in gsu's 2023 photo
const BANNERS = [10.3, 19.2, 27.7, 36.4, 45.2, 54]

type Row = { y0: number; y1: number; part: 'tall' | 'short'; k: number }

// the rows of slabs from y0 to y1. k numbers them so each gets its own slab tones
export function rows(y0: number, y1: number) {
  const out: Row[] = []
  let y = BOTTOM - SHORT
  for (let k = 0; y < y1 - 1e-4; k++) {
    const part = k % 2 ? 'tall' : 'short'
    const top = y + (part === 'tall' ? TALL : SHORT)
    if (top > y0 + 1e-4) out.push({ y0: Math.max(y0, y), y1: Math.min(y1, top), part, k })
    y = top
  }
  return out
}
// where row k starts, for its uvs
function rowBottom(k: number) {
  const tall = Math.floor(k / 2)
  return BOTTOM - SHORT + tall * TALL + (k - tall) * SHORT
}

type Wall = {
  p: Point
  len: number
  dir: Point
  o: Point
  // a point u along the wall and d out from it
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
const PLATE = { plate: '#a4a5a3', color: '#3a3c3f' }
const span = (m: number, n: number) => [Math.min(m, n), Math.max(m, n)] as [number, number]

// a hole in a marble wall, with glass at the back or left open (filled in separately)
type Opening = { hole: Hole; depth?: number; glass?: boolean; open?: boolean }

export function studentCenterWestGeometry(b: StudentCenterWestData) {
  const { add, prism, inside, merged } = collect<Part>()
  const H = b.height
  const outline = b.points.map(pt)
  const [sw, ne] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(sw, ne)
  const L = f.len
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const doorA = door ? f.aOf(door) : -1
  const signs: Sign[] = []

  // a quad of marble row r. both kinds of row are one material (every part is a draw call
  // in 5 passes, that's what costs): its slabs are a tall row's, and a short row's uvs are
  // stretched so each short row is one row of them, twice as wide
  const rowQuad = (w: Wall, u0: number, u1: number, r: Row) => {
    const geo = wallQuad(w.at(u0), w.at(u1), r.y0, r.y1, w.o, u0)
    const uv = geo.getAttribute('uv')
    const h = r.part === 'tall' ? TALL : SHORT
    const across = r.part === 'tall' ? 1 : 0.5
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * across, r.k * TALL + ((uv.getY(i) - rowBottom(r.k)) * TALL) / h)
    add('marble', geo)
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
    add(part, wallQuad(w.at(u0, d1), w.at(u1, d1), y0, y1, w.o, u0))
    add(part, wallQuad(w.at(u0, d0), w.at(u0, d1), y0, y1, flip(w.dir)))
    add(part, wallQuad(w.at(u1, d0), w.at(u1, d1), y0, y1, w.dir))
    const rim = [w.at(u0, d0), w.at(u1, d0), w.at(u1, d1), w.at(u0, d1)]
    add(part, flat(rim, y1))
    if (y0 > 0.01) add(part, flat(rim, y0, false))
  }

  /** a marble wall in rows, with openings `depth` deep, from y0 to y1 */
  const marbleWall = (w: Wall, y0: number, y1: number, openings: Opening[] = []) => {
    for (const [u0, u1, v0, v1] of solidPieces(
      w.len,
      y0,
      y1,
      openings.map((o) => o.hole),
    ))
      for (const r of rows(v0, v1)) rowQuad(w, u0, u1, r)
    for (const { hole, depth = 0.25, glass, open } of openings) {
      if (open) continue
      const [u0, u1, v0, v1] = hole
      add('stone', wallQuad(w.at(u0), w.at(u0, -depth), v0, v1, w.dir))
      add('stone', wallQuad(w.at(u1), w.at(u1, -depth), v0, v1, flip(w.dir)))
      const rim = [w.at(u0), w.at(u1), w.at(u1, -depth), w.at(u0, -depth)]
      if (v0 > 0.01) add('stone', flat(rim, v0))
      add('stone', flat(rim, v1, false))
      if (glass) add('glass', glassQuad(w.at(u0, -depth), w.at(u1, -depth), v0, v1, w.o))
    }
  }

  // a plain wall of cream panels
  const creamWall = (w: Wall, y0: number, y1: number, holes: Hole[] = []) => {
    for (const [u0, u1, v0, v1] of solidPieces(w.len, y0, y1, holes))
      add('cream', wallQuad(w.at(u0), w.at(u1), v0, v1, w.o, u0))
  }

  // the coping along the top of a wall and the inside of the parapet
  const coping = (w: Wall, y: number) => {
    lump('stone', w, -0.03, w.len + 0.03, y - 0.12, y + 0.06, 0.04, -0.35)
    add('stone', wallQuad(w.at(0, -0.35), w.at(w.len, -0.35), y - 0.6, y - 0.12, flip(w.o)))
  }

  // outline edges by where they are
  const courtland: Wall[] = []
  const plaza: Wall[] = []
  for (const { p, q, len, out } of edges(outline)) {
    if (len < 0.05) continue
    const w = wallOf(p, q, out)
    const facing = out.x * f.out.x + out.z * f.out.z
    const sideways = out.x * f.along.x + out.z * f.along.z
    const mid = w.at(len / 2)
    const a = f.aOf(mid)
    const d = f.dOf(mid)
    if (facing > 0.9 && d > -1) {
      courtland.push(w)
      courtlandSide(w)
    } else if (sideways < -0.9 && a < 1) decaturSide(w)
    else if (sideways > 0.9 && a > L - 1) {
      marbleWall(w, 0, H)
      // a brown panel at the bottom of the bit that shows between here and the bookstore
      if (d > -2) lump('frame', w, 0.1, len - 0.1, 0, ENTRANCE_TOP, 0.05)
    } else if (facing < -0.9 && a < 36) plaza.push(w)
    else creamWall(w, 0, H)
    coping(w, H)
  }
  // the plaza side is a few edges in a straight line, one wall for the lot
  const ends = plaza.flatMap((w) => [w.p, w.at(w.len)]).sort((m, n) => f.aOf(n) - f.aOf(m))
  plazaSide(wallOf(ends[0]!, ends.at(-1)!, flip(f.out)))

  // courtland street: the side door with a window over it, the grilles, the "66" doors and
  // the sign, a window over them. the doorway is where the game's door is
  function courtlandSide(w: Wall) {
    // courtland street is one straight edge of the outline, u is along it
    const sign = w.dir.x * f.along.x + w.dir.z * f.along.z
    const u = (a: number) => (a - f.aOf(w.p)) * sign
    const openings: Opening[] = [
      { hole: [...SIDE_DOOR, 0, BOTTOM + TALL], depth: 0.2, open: true },
      { hole: [5.45, 6.7, 5.55, 6.75], depth: 0.2, glass: true },
      { hole: [71.17, 72.56, 8.1, 9.5], depth: 0.2, glass: true },
      { hole: [...ENTRANCE, 0, ENTRANCE_TOP], depth: 0.35, open: true },
      ...GRILLES.map((c): Opening => ({
        hole: [c - GRILLE_WIDTH / 2, c + GRILLE_WIDTH / 2, ...GRILLE],
        depth: 0.45,
        open: true,
      })),
    ].map((o) => ({
      ...o,
      hole: [...span(u(o.hole[0]), u(o.hole[1])), o.hole[2], o.hole[3]] as Hole,
    }))
    marbleWall(w, 0, H, openings)

    // the side door: a pair of glass doors in dark frames
    recess(w, u(SIDE_DOOR[0]), u(SIDE_DOOR[1]), 0, BOTTOM + TALL, 0.2)
    for (const [d0, d1] of [
      [SIDE_DOOR[0] + 0.08, (SIDE_DOOR[0] + SIDE_DOOR[1]) / 2 - 0.03],
      [(SIDE_DOOR[0] + SIDE_DOOR[1]) / 2 + 0.03, SIDE_DOOR[1] - 0.08],
    ] as const)
      add(
        'glass',
        glassQuad(w.at(u(d0), -0.19), w.at(u(d1), -0.19), 0.05, BOTTOM + TALL - 0.1, w.o),
      )
    add('frame', wallQuad(w.at(u(SIDE_DOOR[0])), w.at(u(SIDE_DOOR[1])), 0, 0.02, w.o))
    doorFrame(w, u(SIDE_DOOR[0]), u(SIDE_DOOR[1]), BOTTOM + TALL, -0.2)

    for (const c of GRILLES) grille(w, ...span(u(c - GRILLE_WIDTH / 2), u(c + GRILLE_WIDTH / 2)))
    entrance(w, u(ENTRANCE[0]), u(ENTRANCE[1]), u(doorA))

    // the sign by the doors (a blue square where gsu's logo is) and the number
    const rot = Math.atan2(w.o.x, w.o.z)
    const s = w.at(u(65.7), 0.03)
    // the real ones are brushed aluminium with dark grey letters. this one is 4.7 by 1m in
    // the 2019 photo, the plate can't be that long and thin, so a bit shorter and taller
    signs.push({
      x: s.x,
      y: 3.3,
      z: s.z,
      rot,
      text: 'STUDENT CENTER\nWEST',
      scale: 0.9,
      ...PLATE,
    })
    const n = w.at(u(74.3), 0.01)
    signs.push({
      x: n.x,
      y: 2.55,
      z: n.z,
      rot,
      text: '66',
      letters: true,
      size: 0.3,
      color: '#1d1c1b',
    })

    // blue banners along the top, hanging from an arm out of the wall (gsu's 2023 photos)
    for (const c of BANNERS) {
      const bu = u(c)
      lump('blue', w, bu - 0.015, bu + 0.015, H - 5.2, H - 0.5, 1.45, 0.25)
      lump('stone', w, bu - 0.025, bu + 0.025, H - 0.45, H - 0.39, 1.55)
      lump('stone', w, bu - 0.02, bu + 0.02, H - 5.25, H - 5.2, 1.47, 0.23)
    }
  }

  // the sides and top of a shallow opening that's filled in separately
  function recess(w: Wall, u0: number, u1: number, v0: number, v1: number, depth: number) {
    add('stone', wallQuad(w.at(u0), w.at(u0, -depth), v0, v1, w.dir))
    add('stone', wallQuad(w.at(u1), w.at(u1, -depth), v0, v1, flip(w.dir)))
    add('stone', flat([w.at(u0), w.at(u1), w.at(u1, -depth), w.at(u0, -depth)], v1, false))
  }

  // dark bronze jambs and head round a door
  function doorFrame(w: Wall, u0: number, u1: number, top: number, d: number) {
    lump('frame', w, u0, u0 + 0.08, 0, top, d + 0.06, d)
    lump('frame', w, u1 - 0.08, u1, 0, top, d + 0.06, d)
    lump('frame', w, u0, u1, top - 0.1, top, d + 0.06, d)
  }

  // a grille of cast stone in a recess, the dark windows behind it. a band of little
  // blocks along the top and the bottom, each with a hole in it, and in the middle bars
  // with five big blocks on a rail: square, octagon, square, octagon, square
  function grille(w: Wall, u0: number, u1: number) {
    const [y0, y1] = GRILLE
    const depth = 0.45
    recess(w, u0, u1, y0, y1, depth)
    add('stone', flat([w.at(u0), w.at(u1), w.at(u1, -depth), w.at(u0, -depth)], y0))
    add('glass', glassQuad(w.at(u0, -depth), w.at(u1, -depth), y0, y1, w.o))
    // the frame round it and the lattice stick out of the wall (gsu's 2023 photo along it)
    const out = 0.25
    lump('stone', w, u0 - 0.3, u1 + 0.3, y0 - 0.22, y0, out)
    lump('stone', w, u0 - 0.3, u1 + 0.3, y1, y1 + 0.2, out)
    lump('stone', w, u0 - 0.3, u0, y0, y1, out)
    lump('stone', w, u1, u1 + 0.3, y0, y1, out)
    const [front, back] = [0.1, -0.1]
    const band = 0.34
    const cy = (y0 + y1) / 2
    for (const [a, b] of [
      [y0, y0 + 0.08],
      [y0 + band, y0 + band + 0.09],
      [y1 - band - 0.09, y1 - band],
      [y1 - 0.08, y1],
    ])
      lump('stone', w, u0, u1, a!, b!, front, back)
    lump('stone', w, u0, u1, cy - 0.08, cy + 0.08, front + 0.03, back)
    const n = Math.round((u1 - u0) / 0.33)
    const step = (u1 - u0) / n
    // the little blocks, and bars between them in the middle
    const block = (c: number, y: number) =>
      lump('stone', w, c - 0.1, c + 0.1, y - 0.1, y + 0.1, front + 0.02, back)
    for (let i = 0; i < n; i++) {
      const c = u0 + step * (i + 0.5)
      block(c, y0 + 0.08 + (band - 0.08) / 2)
      block(c, y1 - 0.08 - (band - 0.08) / 2)
      lump('stone', w, c - 0.035, c + 0.035, y0 + band + 0.09, y1 - band - 0.09, front - 0.02, back)
    }
    const m = 5
    for (let i = 0; i < m; i++) {
      const c = u0 + ((u1 - u0) * (i + 0.5)) / m
      if (i % 2) {
        octagon(w, c, cy, 0.42, front + 0.12, back)
        octagon(w, c, cy, 0.15, front + 0.22, front + 0.12)
      } else {
        lump('stone', w, c - 0.34, c + 0.34, cy - 0.4, cy + 0.4, front + 0.12, back)
        lump('stone', w, c - 0.2, c + 0.1, cy - 0.12, cy + 0.2, front + 0.22, front + 0.12)
      }
      // and the little blocks either side of the big ones
      for (const k of [-1, 1])
        for (const y of [cy - 0.3, cy + 0.3]) block(c + k * (u1 - u0) * 0.1, y)
    }
  }

  // an eight sided block sticking out of a wall
  function octagon(w: Wall, c: number, cy: number, r: number, d1: number, d0: number) {
    const k = r * Math.tan(Math.PI / 8)
    const ring = [
      [-k, -r],
      [k, -r],
      [r, -k],
      [r, k],
      [k, r],
      [-k, r],
      [-r, k],
      [-r, -k],
    ].map(([du, dy]) => [c + du!, cy + dy!] as const)
    ring.forEach(([pu, py], i) => {
      const [qu, qy] = ring[(i + 1) % ring.length]!
      // each side faces away from the middle, the face is a fan from the middle
      const side = [pu + qu - 2 * c, 0, py + qy - 2 * cy]
      add(
        'stone',
        triangles(
          w,
          [
            [pu, py, d0],
            [qu, qy, d0],
            [qu, qy, d1],
          ],
          side,
        ),
      )
      add(
        'stone',
        triangles(
          w,
          [
            [pu, py, d0],
            [qu, qy, d1],
            [pu, py, d1],
          ],
          side,
        ),
      )
      add(
        'stone',
        triangles(
          w,
          [
            [c, cy, d1],
            [pu, py, d1],
            [qu, qy, d1],
          ],
          [0, 1, 0],
        ),
      )
    })
  }

  // a triangle from [u, y, d] corners, facing `toward` given as [along the wall, out, up]
  function triangles(w: Wall, corners: number[][], toward: number[]) {
    const n = {
      x: w.dir.x * toward[0]! + w.o.x * toward[1]!,
      y: toward[2]!,
      z: w.dir.z * toward[0]! + w.o.z * toward[1]!,
    }
    const l = Math.hypot(n.x, n.y, n.z)
    const v = corners.map(([u, y, d]) => {
      const p = w.at(u!, d!)
      return [p.x, y!, p.z]
    }) as [number[], number[], number[]]
    const e1 = [0, 1, 2].map((i) => v[1][i]! - v[0][i]!)
    const e2 = [0, 1, 2].map((i) => v[2][i]! - v[0][i]!)
    const cross = [
      e1[1]! * e2[2]! - e1[2]! * e2[1]!,
      e1[2]! * e2[0]! - e1[0]! * e2[2]!,
      e1[0]! * e2[1]! - e1[1]! * e2[0]!,
    ]
    const order = cross[0]! * n.x + cross[1]! * n.y + cross[2]! * n.z < 0 ? [0, 2, 1] : [0, 1, 2]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        order.flatMap((i) => v[i]!),
        3,
      ),
    )
    geo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(
        order.flatMap(() => [n.x / l, n.y / l, n.z / l]),
        3,
      ),
    )
    geo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        order.flatMap((i) => [corners[i]![0]!, corners[i]![1]!]),
        2,
      ),
    )
    return geo
  }

  // the doors under "66": the game's doorway, glass either side of it, a panel of cast
  // stone over them and glass over that, all in a deep frame
  function entrance(w: Wall, u0: number, u1: number, at: number) {
    const depth = 0.35
    recess(w, u0, u1, 0, ENTRANCE_TOP, depth)
    const d = -depth
    const [d0, d1] = [at - DOOR_WIDTH / 2, at + DOOR_WIDTH / 2]
    const panel = DOOR_HEIGHT + 0.08
    const transom = panel + 0.85
    for (const [g0, g1] of [
      [u0, d0],
      [d1, u1],
    ] as const)
      if (g1 - g0 > 0.05) add('glass', glassQuad(w.at(g0, d), w.at(g1, d), 0, DOOR_HEIGHT, w.o))
    // over the doors a bronze panel of square blocks in two rows (dark brown in the photo)
    add('frame', wallQuad(w.at(u0, d), w.at(u1, d), DOOR_HEIGHT, transom, w.o, u0))
    add('glass', glassQuad(w.at(u0, d), w.at(u1, d), transom, ENTRANCE_TOP, w.o))
    const n = 4
    for (let i = 0; i < n; i++) {
      const c = u0 + ((u1 - u0) * (i + 0.5)) / n
      for (const y of [panel + 0.04, panel + 0.42]) {
        lump('frame', w, c - 0.36, c + 0.36, y, y + 0.34, d + 0.04, d)
        lump('frame', w, c - 0.18, c + 0.18, y + 0.09, y + 0.25, d + 0.07, d + 0.04)
      }
    }
    // bronze frames: round the doors, over them, and the mullions of the glass on top
    for (const u of [u0, d0 - 0.06, d1, u1 - 0.06])
      lump('frame', w, u, u + 0.06, 0, DOOR_HEIGHT, d + 0.07, d)
    lump('frame', w, u0, u1, DOOR_HEIGHT - 0.04, DOOR_HEIGHT + 0.06, d + 0.07, d)
    lump('frame', w, u0, u1, transom - 0.03, transom + 0.05, d + 0.07, d)
    add('frame', wallQuad(w.at(u0), w.at(u1), 0, 0.02, w.o))
  }

  // decatur street: the carved columns, a square block at the top of every other tall row
  // and a slot window between them. they go on down past what shows over the bridge's
  // wall in the photo, unverified
  function decaturSide(w: Wall) {
    const s = (c: number) => w.len - c
    const holes: Opening[] = []
    const blocks: Row[] = rows(0, H).filter((r) => r.part === 'tall')
    blocks.forEach((r, i) => {
      // counting down from the top: block, window, block, window...
      const window = (blocks.length - 1 - i) % 2 === 1
      for (const c of COLUMNS) {
        const [u0, u1] = [s(c) - COLUMN / 2, s(c) + COLUMN / 2]
        const y0 = window ? Math.max(0, r.y0 - SHORT) : r.y0
        holes.push({ hole: [u0, u1, y0, r.y1], depth: SET })
      }
    })
    marbleWall(w, 0, H, holes)
    // the carving is on a strip set back into the wall
    const back = wallOf(w.at(0, -SET), w.at(w.len, -SET), w.o)
    blocks.forEach((r, i) => {
      const window = (blocks.length - 1 - i) % 2 === 1
      for (const c of COLUMNS) {
        const [u0, u1] = [s(c) - COLUMN / 2, s(c) + COLUMN / 2]
        if (window) slot(back, u0, u1, Math.max(0, r.y0 - SHORT), r.y1)
        else carved(back, u0, u1, r.y0, r.y1)
      }
    })
  }

  // a row of little blocks across a column
  function dentils(w: Wall, u0: number, u1: number, y: number, d: number) {
    const n = 4
    const step = (u1 - u0) / n
    for (let i = 0; i < n; i++)
      lump('stone', w, u0 + step * (i + 0.2), u0 + step * (i + 0.8), y, y + 0.1, d)
  }

  // the square block: dentils, a bar, the square with a smaller one on it, a bar, dentils
  function carved(w: Wall, u0: number, u1: number, y0: number, y1: number) {
    add('shade', wallQuad(w.at(u0), w.at(u1), y0, y1, w.o, u0))
    const c = (u0 + u1) / 2
    const cy = (y0 + y1) / 2
    dentils(w, u0, u1, y1 - 0.14, 0.05)
    lump('stone', w, u0 + 0.03, u1 - 0.03, y1 - 0.3, y1 - 0.2, 0.05)
    lump('stone', w, c - 0.34, c + 0.34, cy - 0.4, cy + 0.4, 0.09)
    lump('stone', w, c - 0.2, c + 0.2, cy - 0.2, cy + 0.22, 0.17, 0.09)
    lump('stone', w, u0 + 0.03, u1 - 0.03, y0 + 0.2, y0 + 0.3, 0.05)
    dentils(w, u0, u1, y0 + 0.04, 0.05)
  }

  // the slot window in two frames, one inside the other, with dentils over and under
  function slot(w: Wall, u0: number, u1: number, y0: number, y1: number) {
    const c = (u0 + u1) / 2
    const cy = (y0 + y1) / 2
    const [g0, g1, v0, v1] = [c - 0.1, c + 0.1, cy - 0.62, cy + 0.62]
    for (const [a0, a1, b0, b1] of solidPieces(u1 - u0, y0, y1, [[g0 - u0, g1 - u0, v0, v1]]))
      add('shade', wallQuad(w.at(u0 + a0), w.at(u0 + a1), b0, b1, w.o, u0 + a0))
    const rim = [w.at(g0), w.at(g1), w.at(g1, -0.15), w.at(g0, -0.15)]
    add('stone', wallQuad(w.at(g0), w.at(g0, -0.15), v0, v1, w.dir))
    add('stone', wallQuad(w.at(g1), w.at(g1, -0.15), v0, v1, flip(w.dir)))
    add('stone', flat(rim, v0))
    add('stone', flat(rim, v1, false))
    add('glass', glassQuad(w.at(g0, -0.15), w.at(g1, -0.15), v0, v1, w.o))
    // outer frame, then the inner one: [half width, half height, bar, how far out]
    for (const [e, h, t, d] of [
      [0.38, 0.84, 0.08, 0.07],
      [0.24, 0.74, 0.06, 0.13],
    ] as const) {
      lump('stone', w, c - e, c - e + t, cy - h, cy + h, d)
      lump('stone', w, c + e - t, c + e, cy - h, cy + h, d)
      lump('stone', w, c - e + t, c + e - t, cy + h - t, cy + h, d)
      lump('stone', w, c - e + t, c + e - t, cy - h, cy - h + t, d)
    }
    dentils(w, u0, u1, y1 - 0.14, 0.05)
    dentils(w, u0, u1, y0 + 0.04, 0.05)
  }

  // the side on the urban life plaza: the marble comes round the corner from decatur
  // street, then cream panels with a long window, a louver and a door with the name over
  // it behind a low dark brick wall (gsu's 2025 photo, placed by eye, unverified)
  function plazaSide(w: Wall) {
    // a is 0 at decatur street, this wall runs the other way
    const a0 = f.aOf(w.at(0))
    const u = (a: number) => Math.abs(a - a0)
    const [lo, hi] = [Math.min(a0, f.aOf(w.at(w.len))), Math.max(a0, f.aOf(w.at(w.len)))]
    const within = (x: number, y: number) => x >= lo - 1e-3 && y <= hi + 1e-3
    const MARBLE = 3.4
    const holes: Hole[] = []
    const openings: [number, number, number, number, 'glass' | 'louver' | 'door'][] = [
      [4.3, 7.2, 4.3, 5.6, 'glass'],
      [4.5, 6.6, 1.75, 2.55, 'louver'],
      [7.9, 10.8, 0, 2.6, 'door'],
    ]
    for (const [x0, x1, y0, y1] of openings)
      if (within(x0, x1)) holes.push([...[u(x0), u(x1)].sort((m, n) => m - n), y0, y1] as Hole)
    if (lo < MARBLE) {
      const [m0, m1] = [u(lo), u(Math.min(hi, MARBLE))].sort((m, n) => m - n) as [number, number]
      const mw = wallOf(w.at(m0), w.at(m1), w.o)
      marbleWall(mw, 0, H)
      holes.push([m0, m1, 0, H])
    }
    creamWall(w, 0, H, holes)
    for (const [x0, x1, y0, y1, kind] of openings) {
      if (!within(x0, x1)) continue
      const [h0, h1] = [u(x0), u(x1)].sort((m, n) => m - n) as [number, number]
      const depth = kind === 'door' ? 0.6 : 0.15
      add('cream', wallQuad(w.at(h0), w.at(h0, -depth), y0, y1, w.dir))
      add('cream', wallQuad(w.at(h1), w.at(h1, -depth), y0, y1, flip(w.dir)))
      const rim = [w.at(h0), w.at(h1), w.at(h1, -depth), w.at(h0, -depth)]
      if (y0 > 0.01) add('cream', flat(rim, y0))
      add('cream', flat(rim, y1, false))
      if (kind === 'louver') {
        add('stone', wallQuad(w.at(h0, -depth), w.at(h1, -depth), y0, y1, w.o, h0))
        for (let y = y0 + 0.1; y < y1 - 0.05; y += 0.12)
          lump('stone', w, h0, h1, y, y + 0.03, 0.03 - depth, -depth)
      } else {
        add('glass', glassQuad(w.at(h0, -depth), w.at(h1, -depth), y0, y1, w.o))
        if (kind === 'door') doorFrame(w, h0, h1, y1, -depth)
      }
      // the long window has light aluminium frames, three panes
      if (kind === 'glass') {
        const d = 0.04 - depth
        for (const k of [0, 1, 2, 3]) {
          const x = h0 + ((h1 - h0) * k) / 3
          lump('stone', w, x - 0.04, x + 0.04, y0, y1, d, -depth)
        }
        for (const y of [y0, y1 - 0.07]) lump('stone', w, h0, h1, y, y + 0.07, d, -depth)
      }
      if (kind === 'door') {
        const s = w.at((h0 + h1) / 2, 0.03)
        signs.push({
          x: s.x,
          y: y1 + 0.5,
          z: s.z,
          rot: Math.atan2(w.o.x, w.o.z),
          text: 'STUDENT CENTER\nWEST',
          scale: 0.4,
          ...PLATE,
        })
      }
    }
    // the low brick wall in front, either side of the door
    for (const [x0, x1] of [
      [4.1, 7.6],
      [11.1, 13.4],
    ] as const) {
      if (!within(x0, x1)) continue
      const [h0, h1] = [u(x0), u(x1)].sort((m, n) => m - n) as [number, number]
      prism('shade', [w.at(h0, 1.2), w.at(h1, 1.2), w.at(h1, 1.6), w.at(h0, 1.6)], 0, 1.25)
    }
  }

  // the roofs, and the block on top: marble in rows like the walls
  add('roof', flat(outline, H - 0.6))
  const [x0, x1, e0, e1] = UPPER
  const upper = [f.at(x0, e0), f.at(x1, e0), f.at(x1, e1), f.at(x0, e1)]
  for (const { p, q, out } of edges(upper)) {
    const w = wallOf(p, q, out)
    marbleWall(w, H - 0.6, H + RISE)
    coping(w, H + RISE)
  }
  add('roof', flat(upper, H + RISE - 0.6))
  // rooftop units where the satellite has them, [a, d, width, depth, height]
  for (const [ua, ud, uw, dd, uh, top] of [
    [28, -12, 1.6, 1.4, 1.1, H + RISE],
    [36, -20, 1.2, 1.2, 0.9, H + RISE],
    [47, -15, 2.2, 1.6, 1.2, H + RISE],
    [8, -14, 1.4, 1.4, 1, H],
    [6, -26, 1.2, 1, 0.9, H],
    [66, -20, 1.8, 1.4, 1.1, H],
  ] as const) {
    const c = [
      f.at(ua - uw / 2, ud - dd / 2),
      f.at(ua + uw / 2, ud - dd / 2),
      f.at(ua + uw / 2, ud + dd / 2),
      f.at(ua - uw / 2, ud + dd / 2),
    ]
    prism('stone', c, top - 0.6, top - 0.6 + uh)
  }

  insideWalls()

  // the inside of the ground floor walls: glass where the grilles and doors are
  function insideWalls() {
    for (const { p, len, dir, out } of edges(outline)) {
      if (len < 0.05) continue
      const into = flip(out)
      const at = (u: number) => ({ x: p.x + dir.x * u, z: p.z + dir.z * u })
      const front = courtland.some((w) => Math.hypot(w.p.x - p.x, w.p.z - p.z) < 0.01)
      const holes: Hole[] = []
      const glass: Hole[] = []
      const u = (a: number) => Math.abs(a - f.aOf(p))
      const t = door ? (door.x - p.x) * dir.x + (door.z - p.z) * dir.z : -1
      const onLine = door && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
      if (onLine && t > 0 && t < len)
        holes.push([t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT])
      if (front) {
        for (const c of GRILLES)
          glass.push([u(c - GRILLE_WIDTH / 2), u(c + GRILLE_WIDTH / 2), ...GRILLE])
        glass.push([u(SIDE_DOOR[0]), u(SIDE_DOOR[1]), 0, BOTTOM + TALL])
      }
      const all = [...holes, ...glass].map(
        ([a, c, y0, y1]) => [...[a, c].sort((m, n) => m - n), y0, y1] as Hole,
      )
      for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, all))
        inside.solid.push(wallQuad(at(u0), at(u1), v0, v1, into))
      for (const [a, c, y0, y1] of glass) {
        const [g0, g1] = [a, c].sort((m, n) => m - n) as [number, number]
        if (y0 < CEILING)
          inside.glass.push(wallQuad(at(g0), at(g1), y0, Math.min(y1, CEILING), into))
      }
    }
  }

  return { parts: merged(), inside, signs }
}
