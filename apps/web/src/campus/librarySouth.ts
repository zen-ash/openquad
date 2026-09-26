import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import { classroomWalls } from './classroomSouth'
import type { Sign } from './landmarks'
import {
  circle,
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

// library south (1988), nine tall floors of buff brick where decatur street meets courtland
// street. a band of stone at every floor, narrow slot windows the height of a floor
// scattered over the brick, and on the side toward library north a wall of dark glass over
// the plaza entrance. the plaza is a deck a floor up from classroom south's end to the
// library link over decatur street, on columns along the street, with the loading dock
// under it (osm's "corner", drawn here too, with a low glass box on the plaza). from
// mapillary (2016-2021), gsu's photos (2018-2026), commons (2007, 2025) and esri's
// satellite images (2023-2025). sources: docs/reference/library-south.md
//
// "u" is meters along a wall from its left end as you look at it from outside, "d" meters
// out from it (the building is at d < 0). on the frame, "a" is meters along decatur street
// toward courtland street from the north end of the front, "d" out toward decatur street

export type LibrarySouthData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][]; corner: number[][] }
}

// few parts, each is a draw call in every pass
export type Part =
  'brick' | 'cream' | 'stone' | 'glass' | 'curtain' | 'metal' | 'dark' | 'clear' | 'pavers'

// a floor is 5m: the bands on courtland street are 5m apart, nine floors under the coping
// (the 2019 photo from courtland street, fitted on the building's corners)
export const FLOOR = 5
export const FLOORS = 9
// the brick stands this far in front of osm's outline: anything behind the outline under
// 3.3m would be behind the inside walls (interiorGeometry.ts)
export const RECESS = 0.2
// the stone band at each floor line, from under it to over it, and how far it sticks out.
// it has a thin lip along its top that throws a shadow line (2016 photo)
export const BAND: [number, number] = [-0.15, 0.2]
const OUT = 0.04
const LIP = 0.05
// the stone coping on the parapet
const COPING = 0.35
// the slot windows: how wide, and how far the glass sits back in the brick
export const SLOT = 0.45
const SLOT_DEPTH = 0.12
// the street floor is a lighter brick with stripes of the tan one, [every, how tall]
// (2021 dashcam)
const STRIPES: [number, number] = [0.8, 0.2]
// the plaza: the underside of its deck and its floor
export const DECK: [number, number] = [4.2, 5.2]

export type Side = 'ne' | 'se' | 's' | 'sw' | 'nw' | 'n'

// the slot windows on each side, for each floor from the bottom: where their middles are,
// meters from the left end seen from outside. courtland street (se) is measured on the
// fitted 2019 photo, its street floor is under the bridge there. decatur street (ne) near
// courtland street from the same photo, the rest by eye from the 2018 ones. the side toward
// g deck (sw) from esri's 2026 satellite image, which sees it from above at an angle: its
// west two thirds are blank, the low floors are in g deck's shadow (drawn like the ones
// over them, not verified). the short sides (s, nw) are only a smudge on the satellite
// images, made up like the others (not verified)
export const SLOTS: Record<Side, number[][]> = {
  se: [
    [],
    [14.6, 17.5, 22, 25.2],
    [15.6, 23.2],
    [16.1, 23.4],
    [1.35, 8, 17, 22.6],
    [3.55, 7.2, 16.3, 23.2],
    [1.15, 3.95, 5.7, 8.75, 14.2, 15.4, 17.8, 19.2],
    [4.3, 6, 7.9, 9.05, 16.6, 17.8, 21.9, 23.1],
    [],
  ],
  ne: [
    [],
    [9.2],
    [13.4],
    [6.2, 12.6],
    [2.4, 9.6, 10.8],
    [5, 14],
    [1.7, 7.9, 9.1],
    [5.3, 11.4, 12.6],
    [],
  ],
  n: [[], [], [], [], [], [], [], [], []],
  s: [
    [],
    [3.4, 11.2],
    [6.8],
    [2.6, 7.6, 12.4],
    [4.4, 5.6, 10.9],
    [3.1, 9.2],
    [6.3, 7.5, 12.9],
    [4.6, 11.1],
    [],
  ],
  sw: [
    [],
    [19.4, 23.9],
    [17.6, 18.8, 22.4],
    [17.4, 20.5, 23, 24.8],
    [19.9, 22.3, 25.4],
    [17, 18.3, 20.7, 22.6, 24.4],
    [18, 19.2],
    [],
    [],
  ],
  nw: [[], [], [11.8], [8.4, 9.6], [4.9], [10.3], [7, 8.2], [], []],
}

// big windows [u0, u1, bottom, top, how deep in the brick]. courtland street: the corner by
// g deck is glass on floors 2 and 3 under the brick over it (2016 and 2019 photos). decatur
// street: two wide windows on the street floor (2021 dashcam) and two wider slots by the
// courtland street corner on floors 2 and 3 (2019)
type Window = [number, number, number, number, number]
export const WINDOWS: Partial<Record<Side, Window[]>> = {
  se: [
    [1.8, 10.9, 6.9, 9.75, 0.9],
    [1.3, 7.1, 10.3, 14.75, 0.9],
  ],
  ne: [
    [2.7, 6.3, 2.9, 4.3, 0.15],
    [7.9, 11.5, 2.9, 4.3, 0.15],
    ...[5.2, 10.2].flatMap((y): Window[] => [
      [1.9, 2.6, y, y + 4.65, 0.15],
      [3.5, 4.2, y, y + 4.65, 0.15],
    ]),
  ],
}

// the plaza side (n), meters from its east end at decatur street: the glass wall, all but a
// strip of brick at the west end, and the plaza entrance under it from the link to the
// glass box. under the plaza, the doors on decatur street under the link and the ones
// under the entrance (the game's door)
export const GLASS_WALL = 29
export const ENTRY: [number, number] = [13.2, 24.3]
const STREET_DOORS: [number, number] = [4.5, 8.5]
export const PLAZA_DOORS: [number, number] = [16.2, 20.6]
// the plaza entrance (gsu 2026): a tall storefront set back under a soffit, a deep grey
// fascia over it in two tiers, round columns, and the dark glass from the top of the fascia.
// heights from a camera fitted on the 2026 photo: the plaza came out 5.3m up
const SOFFIT = 9.8
const TRANSOM = 0.95
const FASCIA: [number, number, number] = [9.8, 11.4, 12.3]
const ENTRY_DEPTH = 2.6
// the corner by classroom south stands against the west end of the plaza side: the dock
// under the plaza, a glass box on it with brick piers and a dark fascia with a lip along
// its top (gsu 2026, measured on a camera fitted on the box)
const CORNER = 5.1
export const CORNER_TOP = 8.85
const BOX_FASCIA = 7.7

// solidPieces() wants only holes that reach into y0-y1: one wholly above it comes back as
// wall up to the hole
const pieces = (len: number, y0: number, y1: number, holes: Hole[]) =>
  solidPieces(
    len,
    y0,
    y1,
    holes.filter((h) => h[2] < y1 && h[3] > y0),
  )

type Wall = ReturnType<typeof classroomWalls>[number]
const flip = (o: Point) => ({ x: -o.x, z: -o.z })
const wallOf = (p: Point, q: Point, o: Point): Wall => {
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

export function librarySouthGeometry(b: LibrarySouthData) {
  const { add, block, inside, merged } = collect<Part>()
  const H = b.height
  const top = H - COPING
  const roof = H - 1
  const outline = b.points.map(pt)
  const [north, east] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(north, east)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const signs: Sign[] = []
  const walls = classroomWalls(outline)

  const sideOf = (w: Wall): Side => {
    const x = w.o.x * f.out.x + w.o.z * f.out.z
    const y = w.o.x * f.along.x + w.o.z * f.along.z
    if (x > 0.9) return 'ne'
    if (x < -0.9) return 'sw'
    if (y > 0.9) return 'se'
    if (y < -0.9) return 'nw'
    return x > 0 ? 'n' : 's'
  }

  // a flat piece of wall facing out, d out from the wall line
  const face = (part: Part, w: Wall, u0: number, u1: number, y0: number, y1: number, d = 0) => {
    if (u1 - u0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o, u0))
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
  const glass = (
    part: Part,
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d: number,
  ) => {
    if (u1 - u0 > 0.01 && y1 - y0 > 0.01)
      add(part, glassQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o))
  }
  const sign = (
    w: Wall,
    u: number,
    d: number,
    y: number,
    s: Omit<Sign, 'x' | 'y' | 'z' | 'rot'>,
  ) => {
    const p = w.at(u, d)
    signs.push({ x: p.x, y, z: p.z, rot: Math.atan2(w.o.x, w.o.z), ...s })
  }

  // how far a wall's ends reach past the corners for each meter out from the walls. they're
  // all outside corners, two walls meet on the line halfway between them
  const miter = (w: Wall, end: 0 | 1) => {
    const at = end ? w.at(w.len) : w.p
    const v = walls.find(
      (v) => v !== w && [v.p, v.at(v.len)].some((p) => Math.hypot(p.x - at.x, p.z - at.z) < 0.2),
    )
    if (!v) return 0
    const cos = w.o.x * v.o.x + w.o.z * v.o.z
    return Math.abs(w.o.x * v.o.z - w.o.z * v.o.x) / (1 + cos)
  }

  /**
   * A strip along the whole wall from y0 to y1, its face d1 out and its top and bottom back
   * to d0, cut on the miter at the corners: the bands and the coping. where something goes
   * through it, it stops with an end
   */
  const strip = (
    part: Part,
    w: Wall,
    t: [number, number],
    y0: number,
    y1: number,
    d0: number,
    d1: number,
    cuts: Hole[],
  ) => {
    const lo = -d1 * t[0]
    const hi = w.len + d1 * t[1]
    const kept = pieces(
      hi - lo,
      y0,
      y1,
      cuts.map(([a, c, e, g]): Hole => [a - lo, c - lo, e, g]),
    ).filter((p) => p[3] - p[2] > y1 - y0 - 0.001)
    for (const [p0, p1] of kept) {
      const [u0, u1] = [p0 + lo, p1 + lo]
      face(part, w, u0, u1, y0, y1, d1)
      const a0 = u0 <= lo + 0.001 ? -d0 * t[0] : u0
      const a1 = u1 >= hi - 0.001 ? w.len + d0 * t[1] : u1
      const rim = [w.at(a0, d0), w.at(a1, d0), w.at(u1, d1), w.at(u0, d1)]
      add(part, flat(rim, y1))
      if (y0 > 0.01) add(part, flat(rim, y0, false))
      if (u0 > lo + 0.001) side(part, w, u0, d0, d1, y0, y1, flip(w.dir))
      if (u1 < hi - 0.001) side(part, w, u1, d0, d1, y0, y1, w.dir)
    }
  }

  /**
   * One side of the building: brick with the slots and windows cut into it, the lighter
   * street floor with its stripes, the stone band at each floor, the coping and the inside
   * of the parapet over the roof. `glassy` are openings the side fills itself, `skip` wall
   * that something else stands in front of
   */
  function facade(w: Wall, s: Side, t: [number, number], glassy: Hole[], skip: Hole[]) {
    const slots: Hole[] = []
    SLOTS[s].forEach((us, k) => {
      const y0 = k * FLOOR + (k ? BAND[1] : 0.9)
      const y1 = Math.min((k + 1) * FLOOR + BAND[0], top)
      for (const u of us) slots.push([u - SLOT / 2, u + SLOT / 2, y0, y1])
    })
    const windows = WINDOWS[s] ?? []
    const holes = windows.map(([u0, u1, y0, y1]): Hole => [u0, u1, y0, y1])
    const lo = -RECESS * t[0]
    const hi = w.len + RECESS * t[1]
    const shift = (holes: Hole[]) => holes.map(([a, c, e, g]): Hole => [a - lo, c - lo, e, g])
    const cut = [...slots, ...holes, ...glassy, ...skip]
    const stripes: Hole[] = []
    for (let y = STRIPES[0]; y + STRIPES[1] < FLOOR + BAND[0] - 0.3; y += STRIPES[0])
      stripes.push([lo, hi, y, y + STRIPES[1]])
    const street = FLOOR + BAND[0]
    for (const [u0, u1, v0, v1] of pieces(hi - lo, 0, street, shift([...cut, ...stripes])))
      face('cream', w, u0 + lo, u1 + lo, v0, v1, RECESS)
    const tan = [...stripes, [lo, hi, street, top] as Hole]
    for (const [, , y0, y1] of tan)
      for (const [u0, u1, v0, v1] of pieces(hi - lo, y0, y1, shift(cut)))
        face('brick', w, u0 + lo, u1 + lo, v0, v1, RECESS)

    for (const [u0, u1, y0, y1] of slots) {
      reveal('brick', w, u0, u1, y0, y1, RECESS, RECESS - SLOT_DEPTH)
      glass('glass', w, u0, u1, y0, y1, RECESS - SLOT_DEPTH)
    }
    for (const [u0, u1, y0, y1, deep] of windows) {
      const back = RECESS - deep
      reveal(y1 < FLOOR ? 'cream' : 'brick', w, u0, u1, y0, y1, RECESS, back)
      // wide ones have the glass wall's mullions, narrow ones are like the slots
      glass(u1 - u0 > 1 ? 'curtain' : 'glass', w, u0, u1, y0, y1, back)
    }
    // the bands, cut where something goes through them, and a lip along their tops
    const through = [...holes, ...glassy, ...skip]
    for (let k = 1; k < FLOORS; k++) {
      const [y0, y1] = [k * FLOOR + BAND[0], k * FLOOR + BAND[1]]
      const cuts = through.filter((h) => h[2] < y1 && h[3] > y0)
      strip('stone', w, t, y0, y1 - 0.04, RECESS, RECESS + OUT, cuts)
      strip('stone', w, t, y1 - 0.04, y1, RECESS, RECESS + OUT + LIP, cuts)
    }
    // the coping (not over the glass wall), and the parapet's inside over the roof
    strip(
      'stone',
      w,
      t,
      top,
      H,
      RECESS - 0.35,
      RECESS + 0.06,
      through.filter((h) => h[3] > top),
    )
    const [b0, b1] = [-(RECESS - 0.35) * t[0], w.len + (RECESS - 0.35) * t[1]]
    add('brick', wallQuad(w.at(b1, RECESS - 0.35), w.at(b0, RECESS - 0.35), roof, top, flip(w.o)))
  }

  // the inside of a room behind glass, from d0 back to d1: its back, sides and ceiling
  const lobby = (
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d0: number,
    d1: number,
  ) => {
    face('dark', w, u0, u1, y0, y1, d1)
    side('dark', w, u0, d1, d0, y0, y1, w.dir)
    side('dark', w, u1, d1, d0, y0, y1, flip(w.dir))
    add('dark', flat([w.at(u0, d0), w.at(u1, d0), w.at(u1, d1), w.at(u0, d1)], y1, false))
  }

  /**
   * The side toward library north and the plaza. u runs from its east end at decatur
   * street: the doors under the link, the plaza entrance and the doors under it, and the
   * dark glass wall up to the roof. at the west end the corner stands against it
   */
  function plazaSide(w: Wall, t: [number, number], glassy: Hole[], skip: Hole[]) {
    skip.push([w.len - CORNER, w.len + 1, 0, CORNER_TOP])
    // the glass wall, a dark spandrel at each floor line (commons 2007 and 2025)
    const [g0, g1] = [-RECESS * t[0], GLASS_WALL]
    const plane = RECESS - 0.05
    glassy.push([g0 - 0.5, g1, FASCIA[0], H])
    glassy.push([g0 - 0.5, ENTRY[0], 8.2, FASCIA[0]])
    // each floor tall panes and a row of short ones along the top (commons 2025), one piece
    // of glass each, so the mullions line up floor to floor
    for (let k = 2; k < FLOORS; k++) {
      const y0 = Math.max(FASCIA[2], k * FLOOR + 0.25)
      const y1 = k === FLOORS - 1 ? top : (k + 1) * FLOOR - 0.2
      glass('curtain', w, g0, g1, y0, y1 - TRANSOM, plane)
      glass('curtain', w, g0, g1, y1 - TRANSOM, y1, plane)
    }
    for (let k = 3; k < FLOORS; k++)
      lump('dark', w, g0, g1, k * FLOOR - 0.2, k * FLOOR + 0.25, plane + 0.06, plane)
    lump('dark', w, g0, g1, top, H, plane + 0.1, plane - 0.3)

    // the fascia over the plaza entrance: a deep lower tier with the soffit under it, a
    // shallower one over it, both grey metal panels
    const [e0, e1] = ENTRY
    lump('metal', w, g0, e1, FASCIA[0], FASCIA[1], RECESS + 0.9, plane)
    lump('metal', w, g0, e1, FASCIA[1], FASCIA[2], RECESS + 0.35, plane)
    glass('curtain', w, g0, e0, 8.2, FASCIA[0], plane)

    // the plaza entrance, set back under the soffit: a tall storefront, round columns
    glassy.push([e0, e1, DECK[1], FASCIA[0]])
    const back = RECESS - ENTRY_DEPTH
    // its sides and the soffit, back from under the fascia's front
    side('dark', w, e0, plane, back, DECK[1], SOFFIT, w.dir)
    side('dark', w, e1, plane, back, DECK[1], SOFFIT, flip(w.dir))
    add(
      'dark',
      flat([w.at(e0, plane), w.at(e1, plane), w.at(e1, back), w.at(e0, back)], SOFFIT, false),
    )
    face('clear', w, e0, e1, DECK[1], SOFFIT, back)
    // a dim room behind it, or you'd see into the empty building
    lobby(w, e0, e1, DECK[1], SOFFIT - 0.4, back, back - 4)
    for (const u of [e0 + 1.6, e0 + 3.4, e0 + 5.2, e0 + 7.3, e1 - 1.5])
      lump('dark', w, u - 0.04, u + 0.04, DECK[1], SOFFIT, back + 0.07, back)
    for (const y of [DECK[1] + 2.1, DECK[1] + 2.9])
      lump('dark', w, e0, e1, y, y + 0.1, back + 0.07, back)
    // the columns go on up through the fascia to a beam over the next floor (red in 2007,
    // grey now; gsu's 2026 photo sees them over the fascia, not the beam)
    for (const u of [e0 + 1.3, e0 + 7.2])
      add('metal', column(w.at(u, RECESS + 0.35), 0.33, DECK[1], 15.2))
    lump('metal', w, e0, e0 + 8, 14.6, 15.2, RECESS + 0.7, plane)
    sign(w, e0 + 3.2, back + 0.09, DECK[1] + 3.3, {
      text: 'LIBRARY SOUTH',
      letters: true,
      size: 0.32,
      weight: 600,
      color: '#e8e8e6',
    })

    // under the link: glass doors on decatur street
    const [s0, s1] = STREET_DOORS
    glassy.push([s0, s1, 0, 3.2])
    reveal('dark', w, s0, s1, 0, 3.2, RECESS, 0.02)
    face('clear', w, s0, s1, 0, 3.2, 0.02)
    lump('dark', w, s0, s1, 2.55, 2.65, 0.07, 0.02)
    for (const u of [s0 + 1, (s0 + s1) / 2, s1 - 1])
      lump('dark', w, u - 0.04, u + 0.04, 0, 2.6, 0.07, 0.02)
    sign(w, s1 + 1.6, RECESS + 0.02, 2.7, {
      text: 'LIBRARY SOUTH',
      plate: '#eeeeec',
      color: '#33363b',
      scale: 0.55,
    })
    // under the plaza: sliding doors (the game's) in a dark frame, the sign next to them
    const [p0, p1] = PLAZA_DOORS
    glassy.push([p0, p1, 0, 3.3])
    reveal('dark', w, p0, p1, 0, 3.3, RECESS, 0.02)
    face('clear', w, p0, p1, 0, 3.3, 0.02)
    lump('dark', w, p0, p1, DOOR_HEIGHT, DOOR_HEIGHT + 0.12, 0.08, 0.02)
    const c = door ? (door.x - w.p.x) * w.dir.x + (door.z - w.p.z) * w.dir.z : (p0 + p1) / 2
    for (const u of [p0 + 0.05, c - DOOR_WIDTH / 2, c + DOOR_WIDTH / 2, p1 - 0.05])
      lump('dark', w, u - 0.05, u + 0.05, 0, DOOR_HEIGHT, 0.08, 0.02)
    sign(w, p1 + 1.8, RECESS + 0.02, 2.7, {
      text: 'LIBRARY SOUTH',
      plate: '#eeeeec',
      color: '#33363b',
      scale: 0.55,
    })
  }

  let plaza: Wall | undefined
  for (const w of walls) {
    const s = sideOf(w)
    const t: [number, number] = [miter(w, 0), miter(w, 1)]
    const glassy: Hole[] = []
    const skip: Hole[] = []
    if (s === 'n') {
      plaza = w
      plazaSide(w, t, glassy, skip)
    }
    facade(w, s, t, glassy, skip)
    // a low planter along decatur street, and a grey pilaster at the corner where the
    // link comes in (2021 dashcam)
    if (s === 'ne') {
      lump('stone', w, 1.2, w.len - 1.5, 0, 0.35, RECESS + 1.2, RECESS)
      lump('metal', w, w.len - 0.9, w.len + RECESS * t[1], 0, FASCIA[0], RECESS + 0.15, RECESS)
    }
  }

  // the roof: a louvred box for the fans toward classroom south and a bigger screened yard
  // at the other end (esri's satellite images)
  add('pavers', flat(outline, roof))
  block('metal', f, -19, -9, -22, -28, roof, roof + 2.5)
  block('metal', f, -3, 8, -6.5, -17, roof, roof + 3)

  // the plaza deck: from classroom south's end to the link, out to the curb, on round
  // columns along it (gsu 2018) and a leaning one by the link (mapillary 2019). its floor
  // goes back into the entrance
  const at = (a: number, d: number) => f.at(a, d)
  const back = RECESS - ENTRY_DEPTH
  const edge = 6.8
  const deck = [
    at(-26.85, -8.4),
    at(-24.25, -8.4),
    at(-24.25, -9.4),
    at(-21.05, -9.4),
    at(-21.05, -11.95),
    at(-18.2, -11.95),
    plaza!.at(ENTRY[1], back - 4),
    plaza!.at(ENTRY[0], back - 4),
    at(-9.25, edge),
    at(-25.95, edge),
    at(-25.95, -1.5),
  ]
  add('pavers', flat(deck, DECK[1]))
  // its underside in grey panels, like the link's
  add('metal', flat(deck, DECK[0], false))
  // a deep edge beam along the street and the end by classroom south's corner, and a low
  // wall on the plaza. the street edge stops short of the corner, the end covers it
  for (const [w, end] of [
    [wallOf(at(-9.25, edge), at(-25.95, edge), f.out), 0.3],
    [wallOf(at(-25.95, edge), at(-25.95, -1.5), flip(f.along)), 0],
  ] as const) {
    lump('stone', w, 0, w.len - end, DECK[0] - 0.5, DECK[1] + 0.8, 0, -0.3)
    const inner = wallOf(w.at(w.len - end, -0.3), w.at(0, -0.3), flip(w.o))
    face('stone', inner, 0, inner.len, DECK[1], DECK[1] + 0.8)
  }
  for (const a of [-23.5, -16.5]) add('stone', column(at(a, edge - 0.6), 0.38, 0, DECK[0]))
  // wider at the top, leaning toward courtland street
  add(
    'stone',
    loft(
      [at(-11.9, edge - 0.1), at(-11.1, edge - 0.1), at(-11.1, edge - 0.9), at(-11.9, edge - 0.9)],
      0,
      [at(-11.9, edge - 0.1), at(-9.9, edge - 0.1), at(-9.9, edge - 0.9), at(-11.9, edge - 0.9)],
      DECK[0],
    ),
  )

  // the corner by classroom south (osm's "corner"): brick with the loading dock under the
  // plaza, a low glass box on the plaza with brick piers and a dark fascia with a lip, a
  // flat roof. none of the sides that stand against library south or classroom south
  const corner = b.landmark!.corner.map(pt)
  const against = (p: Point) =>
    edges(outline).some((e) => {
      const t = (p.x - e.p.x) * e.dir.x + (p.z - e.p.z) * e.dir.z
      return (
        t > -0.1 &&
        t < e.len + 0.1 &&
        Math.abs((p.x - e.p.x) * e.out.x + (p.z - e.p.z) * e.out.z) < 0.4
      )
    })
  const cornerWalls = classroomWalls(corner).filter(
    (w) => !against(w.at(w.len / 2)) && w.o.x * f.along.x + w.o.z * f.along.z > -0.9,
  )
  for (const w of cornerWalls) {
    // toward decatur street or the plaza entrance
    const open =
      w.o.x * f.out.x + w.o.z * f.out.z > 0.5 || w.o.x * f.along.x + w.o.z * f.along.z > 0.5
    // cream brick with the tan stripes, like the street floor
    const stripes = (y0: number, y1: number) => {
      for (let y = y0; y < y1 - 0.01; y += STRIPES[0]) {
        const s = Math.min(y + STRIPES[0] - STRIPES[1], y1)
        face('cream', w, 0, w.len, y, s)
        face('brick', w, 0, w.len, s, Math.min(y + STRIPES[0], y1))
      }
    }
    if (!open) {
      stripes(0, BOX_FASCIA)
    } else {
      stripes(0, DECK[0])
      face('stone', w, 0, w.len, DECK[0], DECK[1])
      // a roll-up door on the dock, a glass door on the short side
      if (w.len > 2.5) lump('dark', w, w.len / 2 - 1.4, w.len / 2 + 1.4, 0.9, 3.6, 0.03)
      else face('clear', w, 0.3, w.len - 0.3, 0, 2.4, 0.02)
      // on the plaza: brick piers, dark tile under the glass, and the glass
      const pier = Math.min(0.7, w.len / 4)
      for (const [u0, u1] of [
        [0, pier],
        [w.len - pier, w.len],
      ]) {
        face('dark', w, u0!, u1!, DECK[1], DECK[1] + 0.35, 0.02)
        face('cream', w, u0!, u1!, DECK[1] + 0.35, BOX_FASCIA, 0.02)
      }
      face('dark', w, pier, w.len - pier, DECK[1], DECK[1] + 0.35, -0.05)
      face('clear', w, pier, w.len - pier, DECK[1] + 0.35, BOX_FASCIA, -0.08)
      // the room behind the glass
      face('dark', w, pier, w.len - pier, DECK[1], BOX_FASCIA, -1.5)
    }
    lump('dark', w, -0.15, w.len + 0.15, BOX_FASCIA, CORNER_TOP - 0.3, 0.22)
    lump('dark', w, -0.2, w.len + 0.2, CORNER_TOP - 0.3, CORNER_TOP, 0.28)
  }
  add('pavers', flat(corner, CORNER_TOP - 0.05))

  // the inside of the street floor walls: glass where the doors and the wide windows are
  const glassAt: { side: Side; hole: Hole }[] = [
    { side: 'n', hole: [...STREET_DOORS, 0, 3.2] },
    { side: 'n', hole: [...PLAZA_DOORS, 0, 3.3] },
    ...(WINDOWS.ne ?? [])
      .filter((h) => h[2] < CEILING)
      .map(([u0, u1, y0, y1]) => ({ side: 'ne' as Side, hole: [u0, u1, y0, y1] as Hole })),
  ]
  for (const e of edges(outline)) {
    if (e.len < 0.05) continue
    const into = flip(e.out)
    const pos = (u: number) => ({ x: e.p.x + e.dir.x * u, z: e.p.z + e.dir.z * u })
    const t = door ? (door.x - e.p.x) * e.dir.x + (door.z - e.p.z) * e.dir.z : -1
    const onEdge =
      door &&
      t > 0 &&
      t < e.len &&
      Math.abs((door.x - e.p.x) * e.out.x + (door.z - e.p.z) * e.out.z) < 0.1
    const holes: Hole[] = onEdge ? [[t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]] : []
    // the wall this edge is part of, and where the edge is along it
    const mid = pos(e.len / 2)
    const w = walls.find(
      (w) =>
        w.o.x * e.out.x + w.o.z * e.out.z > 0.98 &&
        Math.abs((mid.x - w.p.x) * w.o.x + (mid.z - w.p.z) * w.o.z) < 0.8,
    )
    const glassy: Hole[] = []
    if (w) {
      const uOf = (p: Point) => (p.x - w.p.x) * w.dir.x + (p.z - w.p.z) * w.dir.z
      const [ua, ub] = [uOf(e.p), uOf(pos(e.len))]
      for (const { hole } of glassAt.filter((g) => g.side === sideOf(w))) {
        const [g0, g1] = [hole[0], hole[1]]
          .map((u) => ((u - ua) / (ub - ua)) * e.len)
          .sort((m, n) => m - n) as [number, number]
        if (g1 > 0 && g0 < e.len)
          glassy.push([Math.max(g0, 0), Math.min(g1, e.len), hole[2], Math.min(hole[3], CEILING)])
      }
    }
    for (const [u0, u1, v0, v1] of pieces(e.len, 0, CEILING, [...holes, ...glassy]))
      inside.solid.push(wallQuad(pos(u0), pos(u1), v0, v1, into))
    for (const [g0, g1, y0, y1] of glassy)
      for (const [u0, u1, v0, v1] of pieces(
        g1 - g0,
        y0,
        y1,
        holes.map(([a, c, d, g]): Hole => [a - g0, c - g0, d, g]),
      ))
        inside.glass.push(wallQuad(pos(g0 + u0), pos(g0 + u1), v0, v1, into))
  }

  // the slot windows are set into the brick: their shadows don't show, and each part that
  // casts one is three more draws. the glass wall does cast, it's the whole side toward the
  // plaza (shadows are drawn from the faces turned away from the sun)
  return { parts: merged(), inside, signs, first: ['brick'], noShadow: ['glass', 'clear'] }
}

// a round column from y0 to y1
function column(c: Point, r: number, y0: number, y1: number) {
  const { prism, merged } = collect<'c'>()
  prism('c', circle(c, r, 12), y0, y1, false)
  return merged().c
}

/** the sides of a solid from a ring at y0 to another (same number of corners) at y1 */
function loft(lo: Point[], y0: number, hi: Point[], y1: number) {
  const mx = lo.reduce((s, p) => s + p.x, 0) / lo.length
  const mz = lo.reduce((s, p) => s + p.z, 0) / lo.length
  const pos: number[] = []
  const uv: number[] = []
  lo.forEach((p, i) => {
    const q = lo[(i + 1) % lo.length]!
    const [p1, q1] = [hi[i]!, hi[(i + 1) % hi.length]!]
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    let quad = [
      [p.x, y0, p.z, 0, y0],
      [q.x, y0, q.z, len, y0],
      [q1.x, y1, q1.z, len, y1],
      [p1.x, y1, p1.z, 0, y1],
    ]
    // wound so it faces away from the middle
    const n = { x: -(q.z - p.z), z: q.x - p.x }
    if (n.x * ((p.x + q.x) / 2 - mx) + n.z * ((p.z + q.z) / 2 - mz) < 0) quad = quad.reverse()
    for (const k of [0, 1, 2, 0, 2, 3]) {
      const [x, y, z, u, v] = quad[k]!
      pos.push(x!, y!, z!)
      uv.push(u!, v!)
    }
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.computeVertexNormals()
  return geo
}
