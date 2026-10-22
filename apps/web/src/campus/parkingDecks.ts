import * as THREE from 'three'
import { pointInPolygon, type Point, type Segment } from '../game/collision'
import { decksAt, floorOf, lowestUnder } from '../game/surface'
import { fromElevation, heightAt } from '../game/terrain'
import { clip, solidPieces, type Hole } from './landmark'
import type { LandmarkGeometry, Sign } from './landmarks'

// gsu's parking decks. there's no one look: n, k and s are open steel frames with chain link
// on every floor and their floors are ramps, m is cream painted precast with glass stair
// towers, g is banded precast with dark screens. each deck is data (DECKS) drawn by the
// builder for its style. from usgs's lidar (2018) for the outlines, floors and towers, gsu's
// 2018 photos and mapillary's 2019 ones for the look. sources:
// docs/reference/parking-decks.md
//
// every deck has a box (landmark.body in campus.json): "a" is meters in from its north west
// face, "w" meters along it from the south west end. heights below are meters above sea level
// (navd88) like the lidar has them

export type DeckData = {
  name?: string
  points: number[][]
  height: number
  door?: number[]
  landmark?: { body: number[][] }
}

// one set of materials per style, shared by its decks (parkingDecksMaterials.ts). steel:
// slab the concrete roof, floor the floors under it, soffit their undersides, steel the
// painted frame, mesh the chain link, lamp the lights under the floors, block the stair
// towers' painted block, glass their curtain walls
export type SteelPart = 'slab' | 'floor' | 'soffit' | 'steel' | 'mesh' | 'lamp' | 'block' | 'glass'
// m: cream the painted precast (spandrels, pilasters, towers), dark the black screens and
// the light poles, and the floors, lamps and glass like the steel ones
export type PaintedPart = 'cream' | 'dark' | 'slab' | 'floor' | 'soffit' | 'lamp' | 'glass'
// g: precast the exposed aggregate panels, screen the dark bronze framed screens in the
// openings, glass the stair towers', slab the roof, pole the floodlights and the dark
// inside of the ways in
export type BandPart = 'precast' | 'screen' | 'glass' | 'slab' | 'pole'
export type Part = SteelPart | PaintedPart | BandPart

type Range = [number, number]

// one of a steel deck's two side by side ramps. a is across the deck, floor is the ramp's
// height at the south west end for tier 0 and rise how much it climbs to the north east end.
// the tiers are TIER apart, the top one can stop part way along (top, the w it runs over)
type Half = { a: Range; floor: number; rise: number; tiers: Range; top?: Range }

// a stair tower: its corners in game coords, its top, which of its sides (from the first
// corner on) are glass. inside means it stands in the deck, the floors go round it
type Tower = { corners: number[][]; top: number; glass: number[]; inside?: boolean }

type Steel = {
  style: 'steel'
  halves: Half[]
  // column bays along the deck
  bays: number
  towers: Tower[]
  // the outline is the deck's shape (s has a notch), not just its box
  notched?: boolean
  // x braces on the north west face: [first bay, last bay, lowest tier, highest tier, half]
  braces: number[][]
  // and across the deck on a line of columns: [line, lowest tier, highest tier, half]
  cross?: number[][]
  // gaps in the fence round the ground floor (the ways in): [a, w] at each end
  openings: number[][][]
  // light poles on the roof, [a, w]
  poles: number[][]
  // the letter on the gsu signs, and where the little plate goes on the first tower's north
  // west side: [w, height over the ground]
  letter: string
  plate?: number[]
}

// the box's four sides, by which way they face
type Face = 'sw' | 'se' | 'ne' | 'nw'

// m: cream painted precast. spandrels with a sloped top between round faced pilasters with a
// little diamond on each at every floor, open between them. floors flat, but a ramp bay
// along one side climbs a floor from w0 to w1
type Painted = {
  style: 'painted'
  // the first floor's elevation, how far apart they are, how many (the last is the roof)
  floors: [number, number, number]
  parapet: number
  ramp: { a: Range; w: Range }
  // about how far apart the pilasters are
  bay: number
  // stair towers, cream with glass on some sides. passage is the way in through one
  towers: { corners: number[][]; top: number; glass: Face[]; passage?: Face }[]
  // the ways in for cars on the ground floor: the side, from and to along it, how tall
  ways: [Face, number, number, number][]
  letter: string
}

// g: exposed aggregate precast in deep bands, two steps each, dark screens between them, so
// it looks more like an office building than a deck. its own outline (osm's is right)
type Band = {
  style: 'band'
  floors: [number, number, number]
  parapet: number
  // the roof's ramp bay down the middle: across, along, and its height at each end along a
  ramp: { a: Range; w: Range; y: Range }
  towers: { corners: number[][]; top: number; glass: number }[]
  // ways in for cars: from and to (a, w) on a side, which floor, how tall
  ways: { from: number[]; to: number[]; floor: number; tall: number; clearance: string }[]
  // which parts of a side have screens between one floor's band and the next, the rest is
  // solid panels (a side or floor that isn't listed has screens all along): side -> floor ->
  // [from, to] along it, w on the north west and south east sides and a on the others
  rows: Partial<Record<Face, Record<number, Range[]>>>
  // bits of the bands that are dark panels like the screens, and where the parapet steps
  dark: { face: Face; at: Range; floors: Range }[]
  steps: { face: Face; at: Range; by: number }[]
  // where the "G DECK" lightbox is: [a, w, which floor] on the first tower, facing out
  lightbox: number[]
  letter: string
}

export const TIER = 2.8
// the floor slab, the beam along its edge under it and the curb over it
const SLAB = 0.22
const BEAM = 0.25
const CURB = 0.1
// how far in the edge beam goes, the chain link's top rail, the columns
const BAND = 0.3
export const GUARD = 1.07
const COLUMN = 0.36
// the chain link's posts (the mesh material's grid), a third of a bay apart on the long faces
const POST = 2.75
// light poles on the roof with a box lantern on top
const POLE = 5.5

export const DECKS: Record<string, Steel | Painted | Band> = {
  // 3m floors: level 1 on collins st under the viaduct (312.3), 3 on the toll plaza (318.3),
  // 4 on courtland st (321.3), the roof (8) at 333.3 with its parapet at 334.9 (lidar). the
  // ramp bay down the middle climbs 6% to the south east
  'G Deck': {
    style: 'band',
    floors: [312.3, 3, 8],
    parapet: 334.9,
    ramp: { a: [18, 58], w: [13, 31], y: [330.9, 333.2] },
    towers: [
      // the north one, a lift shaft with the glass stair facing library south
      {
        corners: [
          [-209.87, 201.49],
          [-201.6, 208.59],
          [-197.63, 203.96],
          [-205.9, 196.86],
        ],
        top: 338.4,
        glass: 2,
      },
      // the south one by the 90 central ave garage, its stair's glass on collins st
      {
        corners: [
          [-193.13, 281.19],
          [-189.33, 284.45],
          [-186.4, 281.03],
          [-190.2, 277.78],
        ],
        top: 338.5,
        glass: 1,
      },
    ],
    ways: [
      // collins st, under the viaduct, by the south tower (gsu's photo)
      {
        from: [73.3, 1],
        to: [73.4, 6],
        floor: 1,
        tall: 2.6,
        clearance: '6\'-6"    CLEARANCE    6\'-6"',
      },
      // courtland st, at the north end of its side (mapillary 2019)
      {
        from: [73.8, 24],
        to: [74, 30],
        floor: 4,
        tall: 2.6,
        clearance: '6\'-6"    CLEARANCE    6\'-6"',
      },
    ],
    // the plaza side from gsu's 2018 photo (fitted camera): three sections, the north one
    // with a grid of dark panels over two floors, the middle one stands up higher with a long
    // screen at the top. under the plaza (level 3) it's walled. courtland st from the 2019
    // photo: solid on the sidewalk floor and the top one, screens on the two between
    rows: {
      nw: {
        1: [],
        2: [],
        3: [[13, 40]],
        4: [
          [7.6, 14.9],
          [26.6, 34.5],
          [35.3, 42.9],
        ],
        5: [
          [2.1, 14.7],
          [26.6, 34.5],
          [35.3, 42.9],
        ],
        6: [
          [2.1, 14.7],
          [26.6, 34.5],
          [35.3, 42.9],
        ],
        7: [
          [2.1, 14.7],
          [15.6, 29],
          [39.7, 46.8],
        ],
      },
      se: { 4: [], 7: [] },
    },
    dark: [{ face: 'nw', at: [2.1, 14.7], floors: [6, 8] }],
    steps: [
      { face: 'nw', at: [14.7, 39.7], by: 0.45 },
      { face: 'nw', at: [39.7, 46.8], by: -0.4 },
    ],
    lightbox: [2.4, 47.2, 5],
    letter: 'G',
  },
  // floors 3.1m apart (the piedmont ave photo, and the 7'-0" entrance), the roof is "LEVEL 7"
  // at 327.0 (lidar). the south east bay is the ramp: lidar has the roof's 324.0 -> 327.0
  'M Deck': {
    style: 'painted',
    floors: [308.4, 3.1, 7],
    parapet: 328.6,
    ramp: { a: [35, 52.72], w: [16, 72] },
    bay: 8.2,
    towers: [
      // the elevator by dahlberg hall
      {
        corners: [
          [85.12, 106.27],
          [90.36, 110.77],
          [97.2, 102.8],
          [91.96, 98.31],
        ],
        top: 332.1,
        glass: ['nw'],
      },
      // "M DECK PEDESTRIAN ENTRANCE" on the gilmer st and piedmont ave corner
      {
        corners: [
          [108.94, 145.94],
          [117.29, 153.1],
          [121.59, 148.09],
          [113.24, 140.93],
        ],
        top: 332.1,
        glass: ['sw', 'se'],
        passage: 'sw',
      },
      // the narrow stair at piedmont ave and auditorium pl
      {
        corners: [
          [164.93, 93.71],
          [167.59, 95.99],
          [171.5, 91.43],
          [168.84, 89.15],
        ],
        top: 330.7,
        glass: ['se', 'ne'],
      },
    ],
    // off the drive by dahlberg hall, south west of the elevator (gsu's 2018 photo)
    ways: [['nw', 6.5, 12.6, 2.7]],
    letter: 'M',
  },
  // the double helix: each half climbs one tier over the deck's length, the north west one
  // to the north east and the other back. the halves meet at both ends and in the middle,
  // where the top tier's two halves stop (lidar: 320.55 -> 322.0 and 322.0 <- 320.65)
  'N Deck': {
    style: 'steel',
    halves: [
      { a: [0, 16.74], floor: 306.55, rise: TIER, tiers: [-2, 5], top: [0, 40.2] },
      { a: [16.74, 33.48], floor: 309.35, rise: -TIER, tiers: [-1, 5], top: [36.1, 80] },
    ],
    bays: 9,
    towers: [
      {
        corners: [
          [47.61, 330.58],
          [52.01, 334.35],
          [54.88, 331.01],
          [50.48, 327.24],
        ],
        top: 323.56,
        // the decatur st side and round the corner
        glass: [0, 1],
      },
      {
        corners: [
          [121.74, 290.08],
          [125.99, 293.72],
          [128.65, 290.61],
          [124.4, 286.97],
        ],
        top: 323.6,
        glass: [2],
      },
    ],
    // gsu's photo from decatur st: x braces in the bays by the tower and two more along
    braces: [
      [0, 0, 0, 1, 0],
      [2, 2, 0, 1, 0],
      [4, 4, 0, 0, 0],
    ],
    openings: [
      [
        [0, 0.8],
        [0, 4.3],
      ],
    ],
    poles: [
      [16.74, 17],
      [16.74, 34],
      [16.74, 51],
      [16.74, 68],
    ],
    letter: 'N',
    plate: [-0.7, 6.1],
  },
  // like n, 0.1m lower
  'K Deck': {
    style: 'steel',
    halves: [
      { a: [0, 16.82], floor: 306.45, rise: TIER, tiers: [-2, 5], top: [0, 40.1] },
      { a: [16.82, 33.63], floor: 309.25, rise: -TIER, tiers: [-1, 5], top: [36.1, 80] },
    ],
    bays: 9,
    towers: [
      {
        corners: [
          [78.77, 357.74],
          [83.1, 361.45],
          [85.83, 358.26],
          [81.51, 354.55],
        ],
        top: 323.3,
        glass: [0, 1],
      },
      {
        corners: [
          [152.9, 317.24],
          [157.07, 320.82],
          [159.61, 317.86],
          [155.44, 314.28],
        ],
        top: 323.2,
        glass: [2],
      },
    ],
    // gsu's photo from the drive: big x braces in the third bay and on the low floors
    braces: [
      [0, 0, 0, 0, 0],
      [2, 2, 0, 3, 0],
      [5, 5, 0, 1, 0],
    ],
    openings: [
      [
        [0, 0.8],
        [0, 4.4],
      ],
    ],
    poles: [
      [16.82, 17],
      [16.82, 34],
      [16.82, 51],
      [16.82, 68],
    ],
    letter: 'K',
    plate: [-0.2, 5],
  },
  // one helix: the south east half climbs half a tier to the north east, the north west one
  // half a tier back, so each end has a 1.4m step between the halves. the north west half is
  // a bit narrower (lidar)
  'S Deck': {
    style: 'steel',
    halves: [
      { a: [0, 16.5], floor: 303.65, rise: -TIER / 2, tiers: [0, 5] },
      { a: [16.5, 36.53], floor: 303.95, rise: TIER / 2, tiers: [-1, 4] },
    ],
    bays: 7,
    towers: [
      {
        corners: [
          [159.42, 264.45],
          [163.18, 267.68],
          [165.52, 264.94],
          [161.76, 261.72],
        ],
        top: 319.8,
        glass: [3],
        inside: true,
      },
    ],
    notched: true,
    braces: [],
    // the 2019 photo sees x braces inside, across the south east half
    cross: [
      [2, 1, 3, 1],
      [4, 1, 3, 1],
    ],
    // the way in under "Enter" on the south west end
    openings: [
      [
        [21.5, 0],
        [30.5, 0],
      ],
    ],
    // along the jesse hill jr dr side (the 2019 photo)
    poles: [
      [36, 7.8],
      [36, 16.7],
      [36, 25],
      [36, 34.3],
      [36, 43.2],
      [36, 51.7],
    ],
    letter: 'S',
  },
}

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const unit = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

// collects triangles by part, one geometry each at the end. a deck is thousands of little
// quads, one BufferGeometry each would be slow to merge
function collector() {
  const bufs = {} as Record<Part, { pos: number[]; nor: number[]; uv: number[]; pane: number[] }>
  // a triangle, turned to face `facing` if it's given
  const tri = (part: Part, c: V3[], uv: number[][], pane?: V3, facing?: V3) => {
    const b = (bufs[part] ??= { pos: [], nor: [], uv: [], pane: [] })
    if (facing && dot(cross(sub(c[1]!, c[0]!), sub(c[2]!, c[0]!)), facing) < 0) {
      c = [c[0]!, c[2]!, c[1]!]
      uv = [uv[0]!, uv[2]!, uv[1]!]
    }
    const cr = cross(sub(c[1]!, c[0]!), sub(c[2]!, c[0]!))
    // nothing to draw (a skin with no height)
    if (Math.hypot(...cr) < 1e-6) return
    const n = unit(cr)
    for (let i = 0; i < 3; i++) {
      b.pos.push(...c[i]!)
      b.nor.push(...n)
      b.uv.push(...uv[i]!)
      if (pane) b.pane.push(...pane)
    }
  }
  /** four corners going round, turned to face `facing`. they needn't be in a plane */
  const quad = (part: Part, c: V3[], uv: number[][], facing: V3, pane?: V3) => {
    const n = cross(sub(c[1]!, c[0]!), sub(c[2]!, c[0]!))
    const p = dot(n, facing) < 0 ? [0, 3, 2, 1] : [0, 1, 2, 3]
    const k = p.map((i) => c[i]!)
    const u = p.map((i) => uv[i]!)
    tri(part, [k[0]!, k[1]!, k[2]!], [u[0]!, u[1]!, u[2]!], pane)
    tri(part, [k[0]!, k[2]!, k[3]!], [u[0]!, u[2]!, u[3]!], pane)
  }
  const done = () =>
    Object.fromEntries(
      Object.entries(bufs).map(([part, b]) => {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3))
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3))
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
        if (b.pane.length) geo.setAttribute('aPane', new THREE.Float32BufferAttribute(b.pane, 3))
        return [part, geo]
      }),
    ) as Record<Part, THREE.BufferGeometry>
  return { tri, quad, done }
}

/** the deck's box as a frame: game coords from (a, w) and back, heights from its floor */
export function deckFrame(b: DeckData) {
  const [w, s, , n] = b.landmark!.body.map(([x, z]) => ({ x: x!, z: z! })) as Point[]
  const la = Math.hypot(s!.x - w!.x, s!.z - w!.z)
  const lw = Math.hypot(n!.x - w!.x, n!.z - w!.z)
  const A = { x: (s!.x - w!.x) / la, z: (s!.z - w!.z) / la }
  const W = { x: (n!.x - w!.x) / lw, z: (n!.z - w!.z) / lw }
  const at = (a: number, v: number): Point => ({
    x: w!.x + A.x * a + W.x * v,
    z: w!.z + A.z * a + W.z * v,
  })
  // the two directions aren't quite square
  const det = A.x * W.z - A.z * W.x
  const aw = (p: Point): [number, number] => {
    const [dx, dz] = [p.x - w!.x, p.z - w!.z]
    return [(dx * W.z - dz * W.x) / det, (A.x * dz - A.z * dx) / det]
  }
  const floor = floorOf(b)
  // the lowest ground round it: the walls' uvs count up from there, the weathering in
  // materials.ts darkens toward v 0 and goes black under it
  const base = lowestUnder(b.points) - floor
  return {
    la,
    lw,
    at,
    aw,
    floor,
    v: (y: number) => y - base,
    // a height measured above sea level, over the deck's floor
    rel: (elevation: number) => fromElevation(elevation) - floor,
    ground: (a: number, v: number) => {
      const p = at(a, v)
      return heightAt(p.x, p.z) - floor
    },
    p3: (a: number, v: number, y: number): V3 => {
      const p = at(a, v)
      return [p.x, y, p.z]
    },
    // a direction in the frame, in the game
    dir: (da: number, dv: number): V3 => [A.x * da + W.x * dv, 0, A.z * da + W.z * dv],
  }
}
type Frame = ReturnType<typeof deckFrame>

type AW = { x: number; z: number }
// round a bar's middle
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]
const P = (a: number, w: number): AW => ({ x: a, z: w })

function area(points: AW[]) {
  let s = 0
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!
    s += p.x * q.z - q.x * p.z
  })
  return s / 2
}

const lerpP = (p: AW, q: AW, t: number) => P(p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t)

// a polygon cut into squares about `size` across
function cells(poly: AW[], size: number) {
  const out: AW[][] = []
  const [a0, a1] = [Math.min(...poly.map((p) => p.x)), Math.max(...poly.map((p) => p.x))]
  const [w0, w1] = [Math.min(...poly.map((p) => p.z)), Math.max(...poly.map((p) => p.z))]
  const [na, nw] = [Math.ceil((a1 - a0) / size), Math.ceil((w1 - w0) / size)]
  for (let i = 0; i < na; i++) {
    const [c0, c1] = [a0 + ((a1 - a0) * i) / na, a0 + ((a1 - a0) * (i + 1)) / na]
    const band = clip(
      clip(poly, (p) => p.x - c0),
      (p) => c1 - p.x,
    )
    for (let j = 0; j < nw; j++) {
      const [d0, d1] = [w0 + ((w1 - w0) * j) / nw, w0 + ((w1 - w0) * (j + 1)) / nw]
      const cell = clip(
        clip(band, (p) => p.z - d0),
        (p) => d1 - p.z,
      )
      if (cell.length >= 3 && Math.abs(area(cell)) > 0.001) out.push(cell)
    }
  }
  return out
}

function distToSegment(p: AW, a: AW, b: AW) {
  const [dx, dz] = [b.x - a.x, b.z - a.z]
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)),
  )
  return Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z)
}

// takes the parts of [0, 1] that the cuts (also in [0, 1]) don't cover
function without(cuts: Range[]): Range[] {
  let left: Range[] = [[0, 1]]
  for (const [c0, c1] of cuts)
    left = left.flatMap(([l0, l1]): Range[] =>
      c1 <= l0 || c0 >= l1
        ? [[l0, l1]]
        : (
            [
              [l0, c0],
              [c1, l1],
            ] as Range[]
          ).filter(([x0, x1]) => x1 - x0 > 0.001),
    )
  return left
}

// the shapes every deck is made of, in its frame: flat plates, upright skins, bars, boxes
function shapes(f: Frame, { quad, tri }: ReturnType<typeof collector>) {
  const { p3, dir, v } = f
  // a flat polygon in (a, w), its height from w, facing up or down. uvs in meters along the
  // deck, kept off 0 so the weathering near the ground (materials.ts) leaves it alone
  const plate = (
    part: Part,
    poly: AW[],
    y: (w: number, a: number) => number,
    up: boolean,
    holes: AW[][] = [],
  ) => {
    const all = [...poly, ...holes.flat()]
    const v2 = (ps: AW[]) => ps.map((p) => new THREE.Vector2(p.x, p.z))
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(v2(poly), holes.map(v2))) {
      const c = [all[i!]!, all[j!]!, all[k!]!]
      const pts = c.map((p) => p3(p.x, p.z, y(p.z, p.x)))
      const n = cross(sub(pts[1]!, pts[0]!), sub(pts[2]!, pts[0]!))
      const flip = up ? n[1] < 0 : n[1] > 0
      const order = flip ? [0, 2, 1] : [0, 1, 2]
      tri(
        part,
        order.map((o) => pts[o]!),
        order.map((o) => [c[o]!.x, c[o]!.z + 50]),
      )
    }
  }

  // a vertical skin along the line p -> q (a, w) facing `out` (a, w), bottom and top at
  // each end. u runs along the face from u0, v is the height or, for the chain link, the
  // height over its bottom
  const side = (
    part: Part,
    p: AW,
    q: AW,
    [b0, b1]: Range,
    [t0, t1]: Range,
    out: AW,
    u0: number,
    u1: number,
    follow = false,
  ) => {
    const c = [p3(p.x, p.z, b0), p3(q.x, q.z, b1), p3(q.x, q.z, t1), p3(p.x, p.z, t0)]
    const uv = follow
      ? [
          [u0, 0],
          [u1, 0],
          [u1, t1 - b1],
          [u0, t0 - b0],
        ]
      : [
          [u0, v(b0)],
          [u1, v(b1)],
          [u1, v(t1)],
          [u0, v(t0)],
        ]
    quad(part, c, uv, dir(out.x, out.z))
  }
  // a bar from p to q (a, w) between heights, `depth` deep toward `inward`: its faces
  // facing out, in, down and (if open) up
  const bar = (
    part: Part,
    p: AW,
    q: AW,
    [b0, b1]: Range,
    [t0, t1]: Range,
    inward: AW,
    depth: number,
    u0: number,
    u1: number,
    lid = true,
  ) => {
    const pi = P(p.x + inward.x * depth, p.z + inward.z * depth)
    const qi = P(q.x + inward.x * depth, q.z + inward.z * depth)
    const out = P(-inward.x, -inward.z)
    side(part, p, q, [b0, b1], [t0, t1], out, u0, u1)
    side(part, pi, qi, [b0, b1], [t0, t1], inward, u0, u1)
    quad(
      part,
      [p3(p.x, p.z, b0), p3(q.x, q.z, b1), p3(qi.x, qi.z, b1), p3(pi.x, pi.z, b0)],
      [
        [u0, 0],
        [u1, 0],
        [u1, depth],
        [u0, depth],
      ],
      [0, -1, 0],
    )
    if (lid)
      quad(
        part,
        [p3(p.x, p.z, t0), p3(q.x, q.z, t1), p3(qi.x, qi.z, t1), p3(pi.x, pi.z, t0)],
        [
          [u0, 0],
          [u1, 0],
          [u1, depth],
          [u0, depth],
        ],
        [0, 1, 0],
      )
  }
  // an upright box in (a, w), y0 to y1
  const box = (part: Part, a: Range, w: Range, y0: number, y1: number, lid = true) => {
    const c = [P(a[0], w[0]), P(a[1], w[0]), P(a[1], w[1]), P(a[0], w[1])]
    const outs = [P(0, -1), P(1, 0), P(0, 1), P(-1, 0)]
    c.forEach((p, i) => {
      const q = c[(i + 1) % 4]!
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      side(part, p, q, [y0, y0], [y1, y1], outs[i]!, 0, len)
    })
    if (lid) plate(part, c, () => y1, true)
  }
  // a straight bar between two points (a, y, w), `t` thick
  const strut = (part: Part, from: V3, to: V3, t: number) => {
    const [p, q] = [p3(from[0], from[2], from[1]), p3(to[0], to[2], to[1])]
    const along = unit(sub(q, p))
    const s1 = unit(cross(along, [0, 1, 0]))
    const s2 = unit(cross(along, s1))
    const len = Math.hypot(...sub(q, p))
    const corner = (base: V3, i: number): V3 => {
      const [x, y] = CORNERS[i]!
      return [
        base[0] + ((s1[0] * x + s2[0] * y) * t) / 2,
        base[1] + ((s1[1] * x + s2[1] * y) * t) / 2,
        base[2] + ((s1[2] * x + s2[2] * y) * t) / 2,
      ]
    }
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      const mid: V3 = [
        (corner(p, i)[0] + corner(p, j)[0]) / 2 - p[0],
        (corner(p, i)[1] + corner(p, j)[1]) / 2 - p[1],
        (corner(p, i)[2] + corner(p, j)[2]) / 2 - p[2],
      ]
      quad(
        part,
        [corner(p, i), corner(p, j), corner(q, j), corner(q, i)],
        [
          [0, 0],
          [t, 0],
          [t, len],
          [0, len],
        ],
        mid,
      )
    }
  }

  return { plate, side, bar, box, strut }
}

function steelDeck(b: DeckData, d: Steel): LandmarkGeometry {
  const f = deckFrame(b)
  const c = collector()
  const { quad, done } = c
  const signs: Sign[] = []
  const { la, lw, ground, rel } = f
  const bay = lw / d.bays
  // posts along the faces, every third of a bay
  const postScale = POST / (bay / 3)

  // the shape of the floors: the box, or the outline where it isn't one
  const shape = d.notched
    ? b.points.map(([x, z]) => {
        const [a, w] = f.aw({ x: x!, z: z! })
        return P(a, w)
      })
    : [P(0, 0), P(la, 0), P(la, lw), P(0, lw)]
  const onEdge = (p: AW) =>
    shape.some((s, i) => distToSegment(p, s, shape[(i + 1) % shape.length]!) < 0.02)
  // the furthest along the deck goes at a
  const end = (a: number) => {
    for (let w = lw + 1; w > 0; w -= 0.05)
      if (pointInPolygon(P(Math.min(Math.max(a, 0.01), la - 0.01), w), shape)) return w
    return 0
  }

  // towers the floors go round, as (a, w) boxes
  const towers = d.towers.map((t) => {
    const aws = t.corners.map(([x, z]) => f.aw({ x: x!, z: z! }))
    return {
      ...t,
      a: [Math.min(...aws.map((p) => p[0])), Math.max(...aws.map((p) => p[0]))] as Range,
      w: [Math.min(...aws.map((p) => p[1])), Math.max(...aws.map((p) => p[1]))] as Range,
    }
  })
  const holes = towers.filter((t) => t.inside)

  const heightOf = (h: Half, k: number, w: number) => rel(h.floor + TIER * k + (h.rise * w) / lw)
  const has = (h: Half, k: number, w: number) =>
    k !== h.tiers[1] || !h.top || (w >= h.top[0] - 0.01 && w <= h.top[1] + 0.01)
  // the highest floor of a half at w
  const topOf = (h: Half, w: number) => {
    let best = -Infinity
    for (let k = h.tiers[0]; k <= h.tiers[1]; k++)
      if (has(h, k, w)) best = Math.max(best, heightOf(h, k, w))
    return best
  }

  const { plate, side, bar, box, strut } = shapes(f, c)

  // where the floors are cut along the deck: the columns, the top tiers' ends, the towers
  const cuts = [
    ...Array.from({ length: d.bays + 1 }, (_, i) => i * bay),
    ...d.halves.flatMap((h) => h.top ?? []),
    ...holes.flatMap((t) => t.w),
  ]
    .filter((w) => w > 0.01 && w < lw + 0.5)
    .sort((x, y) => x - y)
  const strips: Range[] = []
  let from = 0
  for (const c of [...cuts, lw + 0.5]) {
    if (c - from > 0.05) strips.push([from, c])
    from = c
  }

  // along a face, the coordinate the posts and uvs run on
  const along = (p: AW, q: AW) => (Math.abs(q.z - p.z) > Math.abs(q.x - p.x) ? 'w' : 'a')
  const coord = (p: AW, axis: 'a' | 'w') => (axis === 'w' ? p.z : p.x) * postScale

  // gaps in the ground floor's fence, as parts of p -> q
  const gaps = (p: AW, q: AW) => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const ux = (q.x - p.x) / len
    const uz = (q.z - p.z) / len
    return d.openings.flatMap(([o0, o1]): Range[] => {
      const ts = [o0!, o1!].map(([a, w]) => {
        const off = Math.abs((a! - p.x) * uz - (w! - p.z) * ux)
        return off < 0.05 ? ((a! - p.x) * ux + (w! - p.z) * uz) / len : NaN
      })
      if (ts.some(Number.isNaN)) return []
      const [t0, t1] = [Math.min(...ts), Math.max(...ts)]
      return t1 > 0 && t0 < 1 ? [[Math.max(0, t0), Math.min(1, t1)]] : []
    })
  }

  for (const h of d.halves) {
    const split = h.a[0] > 0.01 ? h.a[0] : h.a[1] < la - 0.01 ? h.a[1] : null
    for (const [s0, s1] of strips) {
      let poly = clip(shape, (p) => p.x - h.a[0])
      poly = clip(poly, (p) => h.a[1] - p.x)
      poly = clip(poly, (p) => p.z - s0)
      poly = clip(poly, (p) => s1 - p.z)
      for (const t of holes)
        if (s0 >= t.w[0] - 0.01 && s1 <= t.w[1] + 0.01)
          poly =
            t.a[0] < h.a[0] + 0.5
              ? clip(poly, (p) => p.x - t.a[1])
              : clip(poly, (p) => t.a[0] - p.x)
      if (poly.length < 3 || Math.abs(area(poly)) < 0.01) continue
      const ccw = area(poly) > 0
      const mid = (s0 + s1) / 2
      const endStrip = s0 < 0.01 || s1 > end((h.a[0] + h.a[1]) / 2) - 0.01
      let lowest = true
      // the highest floor here is out in the sun, the ones under it are in the shade inside
      const roof = has(h, h.tiers[1], mid) ? h.tiers[1] : h.tiers[1] - 1

      for (let k = h.tiers[0]; k <= h.tiers[1]; k++) {
        if (!has(h, k, mid)) continue
        const y = (w: number) => heightOf(h, k, w)
        // under the ground there
        const above = poly.map((p) => y(p.z) - ground(p.x, p.z))
        if (Math.max(...above) < -0.3) continue
        if (lowest) {
          // the lowest floor runs on the ground in places: drawn in 2m squares kept just over
          // the ground's own shape, or the paving under the deck shows through
          for (const cell of cells(poly, 3))
            plate('floor', cell, (w, a) => Math.max(y(w), ground(a, w) + 0.05), true)
        } else plate(k === roof ? 'slab' : 'floor', poly, y, true)
        // the undersides, and the floors under other floors (in the shade inside)
        if (Math.min(...above) > 1) plate('soffit', poly, (w) => y(w) - SLAB, false)
        // a light in each bay a couple of meters in from the outside, under the floor over it
        if (k > h.tiers[0] && s1 - s0 > 3) {
          const la = h.a[0] < 0.01 ? 2.2 : h.a[1] - 2.2
          const ly = y(mid) - SLAB
          const r = 0.17
          box('lamp', [la - r, la + r], [mid - r, mid + r], ly - 0.3, ly, false)
          const lens = [
            P(la - r, mid - r),
            P(la + r, mid - r),
            P(la + r, mid + r),
            P(la - r, mid + r),
          ]
          plate('lamp', lens, () => ly - 0.3, false)
        }

        poly.forEach((p, i) => {
          const q = poly[(i + 1) % poly.length]!
          const len = Math.hypot(q.x - p.x, q.z - p.z)
          if (len < 0.02) return
          // into the floor from this edge
          const [ex, ez] = [(q.x - p.x) / len, (q.z - p.z) / len]
          const inward = ccw ? P(-ez, ex) : P(ez, -ex)
          const m = P((p.x + q.x) / 2, (p.z + q.z) / 2)
          const axis = along(p, q)
          const [u0, u1] = [coord(p, axis), coord(q, axis)]
          const band: Range = [y(p.z) - SLAB - BEAM, y(q.z) - SLAB - BEAM]
          if (onEdge(m)) {
            // the outside: the edge beam, the chain link on its posts and rails
            bar('steel', p, q, band, [y(p.z) + CURB, y(q.z) + CURB], inward, BAND, u0, u1)
            // the floor people can reach from the street has chain link all the way up to the
            // next floor, but not across the ways in
            const reach =
              lowest &&
              has(h, k + 1, mid) &&
              Math.min(y(p.z) - ground(p.x, p.z), y(q.z) - ground(q.x, q.z)) < 2.4
            const next = (w: number) => heightOf(h, k + 1, w) - SLAB - BEAM
            for (const [t0, t1] of reach ? without(gaps(p, q)) : [[0, 1] as Range]) {
              const [c0, c1] = [lerpP(p, q, t0), lerpP(q, p, 1 - t1)]
              const top: Range = reach
                ? [next(c0.z), next(c1.z)]
                : [y(c0.z) + GUARD, y(c1.z) + GUARD]
              chainLink(
                c0,
                c1,
                [y(c0.z) + CURB, y(c1.z) + CURB],
                top,
                inward,
                u0 + (u1 - u0) * t0,
                u0 + (u1 - u0) * t1,
              )
            }
            // the galvanized w beam rail for the bumpers, inside the chain link
            const [wb, wq] = [0.12, 0.12].map((o, j) => {
              const c = j ? q : p
              return P(c.x + inward.x * o, c.z + inward.z * o)
            })
            bar(
              'steel',
              wb!,
              wq!,
              [y(p.z) + 0.45, y(q.z) + 0.45],
              [y(p.z) + 0.76, y(q.z) + 0.76],
              inward,
              0.06,
              u0,
              u1,
            )
            if (lowest) fence(p, q, band, inward, u0, u1)
          } else if (
            (split !== null && Math.abs(m.x - split) < 0.02) ||
            (k === h.tiers[1] &&
              h.top &&
              [h.top[0], h.top[1]].some((t) => Math.abs(m.z - t) < 0.02))
          ) {
            // between the halves (and where the top floor stops): the beam, a curb and a pipe
            // rail. the ends are where cars turn across, open
            bar('steel', p, q, band, [y(p.z) - SLAB, y(q.z) - SLAB], inward, 0.2, u0, u1, false)
            if (endStrip && Math.abs(m.x - (split ?? -1)) < 0.02) return
            bar(
              'slab',
              p,
              q,
              [y(p.z) - 0.05, y(q.z) - 0.05],
              [y(p.z) + 0.25, y(q.z) + 0.25],
              inward,
              0.2,
              u0,
              u1,
            )
            const [r0, r1] = [y(p.z) + 0.95, y(q.z) + 0.95]
            bar('steel', p, q, [r0, r1], [r0 + 0.08, r1 + 0.08], inward, 0.08, u0, u1)
          }
        })
        lowest = false
      }
    }
  }

  // chain link a little in from the edge p -> q, both sides drawn (see through, so no
  // DoubleSide: three would draw it twice)
  function chainLink(p: AW, q: AW, bottom: Range, top: Range, inward: AW, u0: number, u1: number) {
    const [m0, m1] = [p, q].map((c) => P(c.x + inward.x * 0.1, c.z + inward.z * 0.1))
    for (const facing of [P(-inward.x, -inward.z), inward])
      side('mesh', m0!, m1!, bottom, top, facing, u0, u1, true)
  }

  // the ground floor's sides under the lowest floor: a low wall and tall chain link panels
  // where there's room for cars, just wall where it's low
  function fence(p: AW, q: AW, band: Range, inward: AW, u0: number, u1: number) {
    const g = [ground(p.x, p.z), ground(q.x, q.z)]
    const gap = [band[0] - g[0]!, band[1] - g[1]!]
    if (Math.max(...gap) < 0.05) return
    const tall = Math.max(...gap) > 2
    for (const [t0, t1] of without(gaps(p, q))) {
      const lerp = (v: number[], t: number) => v[0]! + (v[1]! - v[0]!) * t
      const [a0, a1] = [
        P(p.x + (q.x - p.x) * t0, p.z + (q.z - p.z) * t0),
        P(p.x + (q.x - p.x) * t1, p.z + (q.z - p.z) * t1),
      ]
      const [gg0, gg1] = [lerp(g, t0), lerp(g, t1)]
      const [bb0, bb1] = [lerp(band, t0), lerp(band, t1)]
      const [uu0, uu1] = [u0 + (u1 - u0) * t0, u0 + (u1 - u0) * t1]
      const top: Range = tall ? [Math.min(gg0 + 0.45, bb0), Math.min(gg1 + 0.45, bb1)] : [bb0, bb1]
      bar('slab', a0, a1, [gg0 - 0.4, gg1 - 0.4], top, inward, 0.2, uu0, uu1)
      if (!tall) continue
      chainLink(a0, a1, top, [bb0, bb1], inward, uu0, uu1)
    }
  }

  // columns: along both long sides and between the halves every bay, and at the quarters of
  // each end, from the ground to the top rail
  const spots: AW[] = []
  for (let i = 0; i <= d.bays; i++) {
    const w = i * bay
    for (const a of [0, la, ...d.halves.map((h) => h.a[0]).filter((a) => a > 0.01)])
      spots.push(P(a, w))
  }
  for (const a of [la / 4, (3 * la) / 4]) spots.push(P(a, 0), P(a, end(a)))
  for (const s of shape) spots.push(s)
  const placed: AW[] = []
  for (const s of spots) {
    const a = Math.min(Math.max(s.x - COLUMN / 2, 0), la - COLUMN)
    const w = Math.min(Math.max(s.z - COLUMN / 2, 0), end(a + COLUMN / 2) - COLUMN)
    if (placed.some((p) => Math.hypot(p.x - a, p.z - w) < 1)) continue
    if (towers.some((t) => a + COLUMN > t.a[0] && a < t.a[1] && w + COLUMN > t.w[0] && w < t.w[1]))
      continue
    placed.push(P(a, w))
    const tops = d.halves
      .filter((h) => a + COLUMN >= h.a[0] - 0.01 && a <= h.a[1] + 0.01)
      .map((h) => topOf(h, w + COLUMN / 2))
    const low = Math.min(
      ...[0, COLUMN].flatMap((da) => [0, COLUMN].map((dw) => ground(a + da, w + dw))),
    )
    box('steel', [a, a + COLUMN], [w, w + COLUMN], low - 0.3, Math.max(...tops) + GUARD)
  }

  // x braces in the north west face's bays, between one floor's beam and the next
  for (const [b0, b1, k0, k1, hi] of d.braces) {
    const h = d.halves[hi!]!
    for (let i = b0!; i <= b1!; i++)
      for (let k = k0!; k <= k1!; k++) {
        const [w0, w1] = [i * bay + COLUMN, (i + 1) * bay]
        const lowY = (w: number) => Math.max(heightOf(h, k, w) + CURB, ground(0, w))
        const highY = (w: number) => heightOf(h, k + 1, w) - SLAB - BEAM
        if (highY(w0) - lowY(w0) < 1) continue
        strut('steel', [0.15, lowY(w0), w0], [0.15, highY(w1), w1], 0.14)
        strut('steel', [0.15, lowY(w1), w1], [0.15, highY(w0), w0], 0.14)
      }
  }

  for (const [line, k0, k1, hi] of d.cross ?? []) {
    const h = d.halves[hi!]!
    const w = line! * bay + COLUMN / 2
    const [a0, a1] = [h.a[0] + COLUMN, h.a[1] - COLUMN]
    for (let k = k0!; k <= k1!; k++) {
      const [lo, hi2] = [heightOf(h, k, w) + CURB, heightOf(h, k + 1, w) - SLAB - BEAM]
      strut('steel', [a0, lo, w], [a1, hi2, w], 0.14)
      strut('steel', [a1, lo, w], [a0, hi2, w], 0.14)
    }
  }

  // stair towers: painted block, one or two sides glass in a thin dark frame
  for (const t of towers) {
    const c = t.corners.map(([x, z]) => ({ x: x!, z: z! }))
    const low = Math.min(...c.map((p) => heightAt(p.x, p.z))) - f.floor - 0.3
    const top = rel(t.top)
    const mx = c.reduce((s, p) => s + p.x, 0) / 4
    const mz = c.reduce((s, p) => s + p.z, 0) / 4
    c.forEach((p, i) => {
      const q = c[(i + 1) % 4]!
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      let out: V3 = [(q.z - p.z) / len, 0, -(q.x - p.x) / len]
      if (out[0] * ((p.x + q.x) / 2 - mx) + out[2] * ((p.z + q.z) / 2 - mz) < 0)
        out = [-out[0], 0, -out[2]]
      const at = (u: number, y: number): V3 => [
        p.x + ((q.x - p.x) * u) / len,
        y,
        p.z + ((q.z - p.z) * u) / len,
      ]
      const wall = (u0: number, u1: number, y0: number, y1: number) =>
        quad(
          'block',
          [at(u0, y0), at(u1, y0), at(u1, y1), at(u0, y1)],
          [
            [u0, y0 - low],
            [u1, y0 - low],
            [u1, y1 - low],
            [u0, y1 - low],
          ],
          out,
        )
      if (!t.glass.includes(i)) return wall(0, len, low, top)
      // the glass is set back a little in the block, a strip of block at each side and
      // across the top, and a stone base
      const [g0, g1] = [0.35, len - 0.35]
      const [y0, y1] = [Math.max(low + 0.3, 0.6), top - 0.9]
      wall(0, g0, low, top)
      wall(g1, len, low, top)
      wall(g0, g1, low, y0)
      wall(g0, g1, y1, top)
      const back = (u: number, y: number): V3 => {
        const v = at(u, y)
        return [v[0] - out[0] * 0.12, y, v[2] - out[2] * 0.12]
      }
      const n = Math.sin(p.x * 12.9898 + p.z * 78.233) * 43758.5453
      quad(
        'glass',
        [back(g0, y0), back(g1, y0), back(g1, y1), back(g0, y1)],
        [
          [0, 0],
          [g1 - g0, 0],
          [g1 - g0, y1 - y0],
          [0, y1 - y0],
        ],
        out,
        [g1 - g0, y1 - y0, n - Math.floor(n)],
      )
      // the reveal round it
      for (const [u, y] of [
        [g0, y0],
        [g1, y0],
      ] as const) {
        const sideOut: V3 = u === g0 ? unit(sub(at(1, 0), at(0, 0))) : unit(sub(at(0, 0), at(1, 0)))
        quad(
          'block',
          [at(u, y), back(u, y), back(u, y1), at(u, y1)],
          [
            [0, y],
            [0.12, y],
            [0.12, y1],
            [0, y1],
          ],
          sideOut,
        )
      }
      quad(
        'block',
        [at(g0, y1), at(g1, y1), back(g1, y1), back(g0, y1)],
        [
          [0, 0],
          [1, 0],
          [1, 0.1],
          [0, 0.1],
        ],
        [0, -1, 0],
      )
      quad(
        'block',
        [at(g0, y0), at(g1, y0), back(g1, y0), back(g0, y0)],
        [
          [0, 0],
          [1, 0],
          [1, 0.1],
          [0, 0.1],
        ],
        [0, 1, 0],
      )
    })
    quad(
      'block',
      c.map((p): V3 => [p.x, top, p.z]),
      c.map((p) => [p.x, p.z + 50]),
      [0, 1, 0],
    )
  }

  // light poles on the roof: white square posts with a box lantern
  for (const [pa, pw] of d.poles) {
    const a = Math.min(Math.max(pa!, 0.3), la - 0.3)
    const base = Math.max(
      ...d.halves.filter((h) => a >= h.a[0] - 0.3 && a <= h.a[1] + 0.3).map((h) => topOf(h, pw!)),
    )
    const r = 0.08
    box('steel', [a - r, a + r], [pw! - r, pw! + r], base + 0.25, base + POLE - 0.55, false)
    box(
      'steel',
      [a - 0.24, a + 0.24],
      [pw! - 0.24, pw! + 0.24],
      base + POLE - 0.55,
      base + POLE - 0.05,
    )
    box('steel', [a - 0.3, a + 0.3], [pw! - 0.3, pw! + 0.3], base + POLE - 0.05, base + POLE)
  }

  // gsu's signs, navy with white letters. the flame in the corner is gsu's logo, a plain
  // blue square here
  const signAt = signer(f)
  // the little plate on the first tower's north west side
  if (d.plate) {
    const [pw, up] = d.plate as [number, number]
    const [a, y] = [towers[0]!.a[0], ground(towers[0]!.a[0], pw) + up]
    const nw = P(-1, 0)
    signs.push(
      signAt(a, pw, y, nw, { width: 1.05, height: 0.95, plate: '#21336f' }),
      signAt(a, pw, y + 0.13, nw, { width: 0.32, height: 0.32, plate: '#3a68c8' }, -0.25, 0.01),
      signAt(a, pw, y - 0.21, nw, { width: 0.95, height: 0.025, plate: '#c4122f' }, 0, 0.01),
      signAt(a, pw, y + 0.08, nw, { ...white, text: d.letter, size: 0.55 }, 0.2, 0.02),
      signAt(a, pw, y - 0.33, nw, { ...white, text: 'PARKING        DECK', size: 0.075 }, 0, 0.02),
    )
  }

  const geo: LandmarkGeometry = {
    parts: done(),
    inside: { solid: [], glass: [] },
    signs,
    noShadow: ['mesh', 'lamp'],
    open: true,
  }
  if (b.name === 'S Deck') sDeckSigns(f, d, geo.signs, topOf(d.halves[1]!, 0))
  return geo
}

const white = { letters: true, color: '#ffffff', weight: 700 }

// a sign flat on a face of the deck at (a, w), facing (a, w), moved `right` along the face
// (seen from outside) and `out` off it
function signer(f: Frame) {
  return (a: number, w: number, y: number, facing: AW, s: Partial<Sign>, right = 0, out = 0) => {
    const p = f.at(a, w)
    const n = f.dir(facing.x, facing.z)
    const r = [n[2], -n[0]]
    return {
      x: p.x + r[0]! * right + n[0] * (0.03 + out),
      y,
      z: p.z + r[1]! * right + n[2] * (0.03 + out),
      rot: Math.atan2(n[0], n[2]),
      text: '',
      ...s,
    } as Sign
  }
}

// s's big lightbox on the roof rail at its south corner, facing decatur st, and "Enter" with
// a blue clearance bar over the way in
function sDeckSigns(f: Frame, d: Steel, signs: Sign[], roof: number) {
  const signAt = signer(f)
  const se = d.halves[1]!
  // hung on the top floor's rail (the 2019 photo has its middle a little over the floor)
  const y = roof + 0.3
  const a = f.la - 1.6
  const [sw, ne] = [P(0, -1), P(0, 1)]
  signs.push(
    signAt(a, 0, y, sw, { width: 2.5, height: 1.1, plate: '#21336f' }, 0, 0.3),
    signAt(a, 0, y, ne, { width: 2.5, height: 1.1, plate: '#2b2f3a' }, 0, 0.05),
    signAt(a, 0, y, sw, { ...white, text: 'S', size: 0.8 }, -0.72, 0.32),
    signAt(a, 0, y + 0.2, sw, { width: 0.42, height: 0.42, plate: '#3a68c8' }, 0.35, 0.32),
    signAt(a, 0, y - 0.28, sw, { ...white, text: 'DECK', size: 0.3 }, 0.35, 0.32),
  )
  // over the way in, on the beam of the floor above it
  const [o0, o1] = d.openings[0]!
  const mid = (o0![0]! + o1![0]!) / 2
  const band = f.rel(se.floor + TIER) - SLAB - BEAM
  signs.push(
    signAt(mid, 0, band + 0.22, sw, { width: 2.6, height: 0.45, plate: '#2a3f9a' }, 0, 0.02),
    signAt(mid, 0, band + 0.22, sw, { ...white, text: 'Enter', size: 0.3 }, 0, 0.04),
    signAt(mid, 0, band - 0.45, sw, { width: 3.6, height: 0.16, plate: '#2f55c2' }, 0, 0.25),
    signAt(mid, 0, band - 0.45, ne, { width: 3.6, height: 0.16, plate: '#2f55c2' }, 0, -0.41),
  )
}

export function parkingDeckGeometry(b: DeckData): LandmarkGeometry {
  const d = DECKS[b.name!]!
  if (d.style === 'steel') return steelDeck(b, d)
  return d.style === 'painted' ? paintedDeck(b, d) : bandDeck(b, d)
}

// how far the spandrels sit behind the pilasters' fronts (the outline)
const SET = 0.3

function paintedDeck(b: DeckData, d: Painted): LandmarkGeometry {
  const f = deckFrame(b)
  const c = collector()
  const { quad, done } = c
  const { plate, side, bar, box } = shapes(f, c)
  const { la, lw, rel, ground } = f
  const signs: Sign[] = []
  const signAt = signer(f)
  const [first, step, count] = d.floors
  const F = (i: number) => rel(first + (i - 1) * step)
  const top = rel(d.parapet)

  // each side: along which of a and w, where it is, which way is out. at(u, in) is the
  // point u along it, `in` meters in from the outline
  const span = (face: Face) => (face === 'sw' || face === 'ne' ? la : lw)
  const at = (face: Face, u: number, inset = 0) =>
    face === 'sw'
      ? P(u, inset)
      : face === 'ne'
        ? P(u, lw - inset)
        : face === 'nw'
          ? P(inset, u)
          : P(la - inset, u)
  const outOf = (face: Face) => ({ sw: P(0, -1), ne: P(0, 1), nw: P(-1, 0), se: P(1, 0) })[face]
  const faces: Face[] = ['sw', 'se', 'ne', 'nw']

  const towers = d.towers.map((t) => {
    const aws = t.corners.map(([x, z]) => f.aw({ x: x!, z: z! }))
    const a: Range = [Math.min(...aws.map((p) => p[0])), Math.max(...aws.map((p) => p[0]))]
    const w: Range = [Math.min(...aws.map((p) => p[1])), Math.max(...aws.map((p) => p[1]))]
    return { ...t, a, w }
  })
  // where a tower stands on a side, along it
  const covers = (face: Face) =>
    towers.flatMap((t): Range[] => {
      const near =
        face === 'sw'
          ? t.w[0] < 0.8
          : face === 'ne'
            ? t.w[1] > lw - 0.8
            : face === 'nw'
              ? t.a[0] < 0.8
              : t.a[1] > la - 0.8
      return near ? [face === 'sw' || face === 'ne' ? t.a : t.w] : []
    })

  for (const face of faces) {
    const len = span(face)
    const out = outOf(face)
    const inward = P(-out.x, -out.z)
    const n = Math.max(1, Math.round(len / d.bay))
    const blocked = covers(face)
    const free = without(blocked.map(([u0, u1]) => [u0 / len, u1 / len] as Range)).map(
      ([t0, t1]) => [t0 * len, t1 * len] as Range,
    )
    const g = (u: number) => ground(at(face, u).x, at(face, u).z)
    // the pilasters, every bay
    const piers = Array.from({ length: n + 1 }, (_, i) =>
      Math.min(Math.max((i * len) / n, 0.3), len - 0.3),
    ).filter((u) => !blocked.some(([u0, u1]) => u > u0 - 0.4 && u < u1 + 0.4))
    for (const u of piers) pilaster(face, u, Math.min(g(u - 0.3), g(u + 0.3)) - 0.3)

    for (const [s0, s1] of free) {
      // cut where the pilasters are, so the ground can step along under the screens
      const cuts = [s0, ...piers.filter((u) => u > s0 + 0.01 && u < s1 - 0.01), s1]
      for (let i = 2; i <= count; i++) spandrel(face, s0, s1, F(i), i === count ? top : F(i) + 1.05)
      for (let k = 1; k < cuts.length; k++) {
        const [u0, u1] = [cuts[k - 1]!, cuts[k]!]
        const ways = d.ways.filter((w) => w[0] === face && w[2] > u0 && w[1] < u1)
        const pieces = without(
          ways.map((w) => [(w[1] - u0) / (u1 - u0), (w[2] - u0) / (u1 - u0)] as Range),
        )
        const head = F(2) - 0.5
        for (const [t0, t1] of pieces) {
          const [a0, a1] = [u0 + (u1 - u0) * t0, u0 + (u1 - u0) * t1]
          const [g0, g1] = [g(a0), g(a1)]
          // a cream base along the street and black steel screens over it
          const [p, q] = [at(face, a0, SET), at(face, a1, SET)]
          bar('cream', p, q, [g0 - 0.3, g1 - 0.3], [g0 + 0.5, g1 + 0.5], inward, 0.25, a0, a1)
          const [sp, sq] = [at(face, a0, SET + 0.12), at(face, a1, SET + 0.12)]
          for (const facing of [out, inward])
            side('dark', sp, sq, [g0 + 0.5, g1 + 0.5], [head, head], facing, a0, a1)
        }
        for (const [, w0, w1, tall] of ways) {
          const [a0, a1] = [Math.max(w0, u0), Math.min(w1, u1)]
          const y = Math.max(g(a0), g(a1)) + tall
          bar(
            'cream',
            at(face, a0, SET),
            at(face, a1, SET),
            [y, y],
            [head, head],
            inward,
            0.4,
            a0,
            a1,
          )
        }
      }
    }
  }

  // a spandrel from u0 to u1 along a side: the face, a sloped top going back and the flat
  // bit behind it, its underside and back (seen from inside and across the deck)
  function spandrel(face: Face, u0: number, u1: number, floor: number, y1: number) {
    const out = outOf(face)
    const inward = P(-out.x, -out.z)
    const y0 = floor - 0.5
    const [p0, q0] = [at(face, u0, SET), at(face, u1, SET)]
    const [p1, q1] = [at(face, u0, SET + 0.2), at(face, u1, SET + 0.2)]
    const [p2, q2] = [at(face, u0, SET + 0.4), at(face, u1, SET + 0.4)]
    const chamfer = y1 - 0.25
    side('cream', p0, q0, [y0, y0], [chamfer, chamfer], out, u0, u1)
    quad(
      'cream',
      [
        f.p3(p0.x, p0.z, chamfer),
        f.p3(q0.x, q0.z, chamfer),
        f.p3(q1.x, q1.z, y1),
        f.p3(p1.x, p1.z, y1),
      ],
      [
        [u0, f.v(chamfer)],
        [u1, f.v(chamfer)],
        [u1, f.v(y1)],
        [u0, f.v(y1)],
      ],
      [f.dir(out.x, out.z)[0], 1, f.dir(out.x, out.z)[2]],
    )
    plate('cream', [p1, q1, q2, p2], () => y1, true)
    plate('cream', [p0, q0, q2, p2], () => y0, false)
    side('cream', p2, q2, [y0, y0], [y1, y1], inward, u0, u1)
  }

  // a round faced pilaster at u along a side, from y0 to over the parapet, a diamond on it at
  // every floor
  function pilaster(face: Face, u: number, y0: number) {
    const out = outOf(face)
    const along = face === 'sw' || face === 'ne' ? P(1, 0) : P(0, 1)
    const [h0, h1] = [0.18, 0.3]
    const y1 = top + 0.25
    // its front, the two rounded corners (as flats) and the sides back to the spandrels
    const pts = [
      at(face, u - h1, SET),
      at(face, u - h1, 0.12),
      at(face, u - h0, 0),
      at(face, u + h0, 0),
      at(face, u + h1, 0.12),
      at(face, u + h1, SET),
    ]
    for (let i = 0; i < pts.length - 1; i++) {
      const [p, q] = [pts[i]!, pts[i + 1]!]
      // facing out of its middle, away from the pilaster's middle line
      const m = P((p.x + q.x) / 2, (p.z + q.z) / 2)
      const c0 = at(face, u, SET)
      const facing =
        i === 0 ? P(-along.x, -along.z) : i === pts.length - 2 ? along : P(m.x - c0.x, m.z - c0.z)
      side('cream', p, q, [y0, y0], [y1, y1], facing, i * 0.12, (i + 1) * 0.12)
    }
    plate('cream', pts, () => y1, true)
    // the cap over the parapet
    const cap = [
      at(face, u - 0.36, -0.06),
      at(face, u + 0.36, -0.06),
      at(face, u + 0.36, SET + 0.1),
      at(face, u - 0.36, SET + 0.1),
    ]
    const capA: Range = [Math.min(...cap.map((p) => p.x)), Math.max(...cap.map((p) => p.x))]
    const capW: Range = [Math.min(...cap.map((p) => p.z)), Math.max(...cap.map((p) => p.z))]
    box('cream', capA, capW, y1, y1 + 0.22)
    for (let i = 2; i <= count; i++) {
      const y = F(i) + 0.3
      const c0 = at(face, u, 0)
      const tip = at(face, u, -0.06)
      const ring = [
        [at(face, u - 0.16, 0), y],
        [c0, y - 0.16],
        [at(face, u + 0.16, 0), y],
        [c0, y + 0.16],
      ] as const
      ring.forEach(([p, py], k) => {
        const [q, qy] = ring[(k + 1) % 4]!
        c.tri(
          'cream',
          [f.p3(p.x, p.z, py), f.p3(q.x, q.z, qy), f.p3(tip.x, tip.z, y)],
          [
            [0, f.v(py)],
            [0.1, f.v(qy)],
            [0.05, f.v(y)],
          ],
          undefined,
          f.dir(out.x, out.z),
        )
      })
    }
  }

  // the floors, the ramp bay climbing between them, columns and lights
  const [r0, r1] = d.ramp.w
  for (let i = 1; i <= count; i++) {
    const flat = (w: number) => F(i) + 0 * w
    const ramp = (w: number) => F(i) - step * (1 - Math.min(Math.max((w - r0) / (r1 - r0), 0), 1))
    const pieces: [AW[], (w: number) => number][] = [
      [[P(0, 0), P(d.ramp.a[0], 0), P(d.ramp.a[0], lw), P(0, lw)], flat],
      ...(
        [
          [0, r0],
          [r0, r1],
          [r1, lw],
        ] as Range[]
      ).map(([w0, w1]): [AW[], (w: number) => number] => [
        [P(d.ramp.a[0], w0), P(la, w0), P(la, w1), P(d.ramp.a[0], w1)],
        ramp,
      ]),
    ]
    for (const [poly, y] of pieces) {
      const above = poly.map((p) => y(p.z) - ground(p.x, p.z))
      if (Math.max(...above) < 0.25) continue
      plate(i === count ? 'slab' : 'floor', poly, y, true)
      if (Math.min(...above) > 1) plate('soffit', poly, (w) => y(w) - SLAB, false)
    }
    if (i < 2) continue
    // a light in every bay along both long sides
    for (let k = 0; k < Math.round(lw / d.bay); k++) {
      const w = (k + 0.5) * (lw / Math.round(lw / d.bay))
      for (const a of [2.5, la - 2.5]) {
        const y = (a > d.ramp.a[0] ? ramp(w) : F(i)) - SLAB
        const r = 0.17
        box('lamp', [a - r, a + r], [w - r, w + r], y - 0.3, y, false)
        plate(
          'lamp',
          [P(a - r, w - r), P(a + r, w - r), P(a + r, w + r), P(a - r, w + r)],
          () => y - 0.3,
          false,
        )
      }
    }
  }
  // the columns inside, under the roof
  const bays = Math.round(lw / d.bay)
  for (let k = 1; k < bays; k++) {
    const w = (k * lw) / bays
    for (const a of [d.ramp.a[0] / 2, d.ramp.a[0]]) {
      const low = ground(a, w) - 0.3
      if (
        towers.some(
          (t) => a > t.a[0] - 0.5 && a < t.a[1] + 0.5 && w > t.w[0] - 0.5 && w < t.w[1] + 0.5,
        )
      )
        continue
      box('soffit', [a - 0.25, a + 0.25], [w - 0.25, w + 0.25], low, F(count) - SLAB, false)
    }
  }

  // floodlights on the roof: a dark pole with two heads on a t
  for (const w of [lw * 0.25, lw * 0.5, lw * 0.75]) {
    const a = d.ramp.a[0] / 2
    const y = F(count)
    box('dark', [a - 0.1, a + 0.1], [w - 0.1, w + 0.1], y, y + 9, false)
    box('dark', [a - 0.9, a + 0.9], [w - 0.06, w + 0.06], y + 8.9, y + 9.02)
    for (const s of [-1, 1])
      box('dark', [a + s * 0.85 - 0.28, a + s * 0.85 + 0.28], [w - 0.2, w + 0.2], y + 8.6, y + 8.9)
  }

  // the towers: cream with a band at every floor, glass between in white mullions, the
  // bottom of the glass cream (white louvres in the photos)
  for (const t of towers) {
    const cs: AW[] = [P(t.a[0], t.w[0]), P(t.a[1], t.w[0]), P(t.a[1], t.w[1]), P(t.a[0], t.w[1])]
    const sides: Face[] = ['sw', 'se', 'ne', 'nw']
    const low = Math.min(...cs.map((p) => ground(p.x, p.z))) - 0.3
    const ttop = rel(t.top)
    cs.forEach((p, i) => {
      const q = cs[(i + 1) % 4]!
      const face = sides[i]!
      const out = outOf(face)
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      const dirU = P((q.x - p.x) / len, (q.z - p.z) / len)
      const pt = (u: number, inset = 0) =>
        P(p.x + dirU.x * u - out.x * inset, p.z + dirU.z * u - out.z * inset)
      const holes: Hole[] = []
      // the glass from a little over the sidewalk, white louvres across the bottom of it
      const g0 = low + 0.9
      const slot: Range = [len / 2 - 1.6, len / 2 + 1.6]
      if (t.glass.includes(face))
        for (let y = g0; y < ttop - 1.5; y += step) {
          const y1 = Math.min(y + step - 0.5, ttop - 0.8)
          if (t.passage === face)
            holes.push([0.35, slot[0] - 0.35, y, y1], [slot[1] + 0.35, len - 0.35, y, y1])
          else holes.push([0.35, len - 0.35, y, y1])
        }
      // the way in, and the open stair over it behind white rails
      if (t.passage === face) holes.push([slot[0], slot[1], low, ttop - 0.8])
      for (const [u0, u1, y0, y1] of solidPieces(len, low, ttop, holes))
        side('cream', pt(u0), pt(u1), [y0, y0], [y1, y1], out, u0, u1)
      for (const [u0, u1, y0, y1] of holes) {
        const deep = y0 <= low + 0.01 ? 1.8 : 0.12
        const [a0, a1, b0, b1] = [pt(u0), pt(u1), pt(u0, deep), pt(u1, deep)]
        side('cream', a0, b0, [y0, y0], [y1, y1], dirU, 0, deep)
        side('cream', a1, b1, [y0, y0], [y1, y1], P(-dirU.x, -dirU.z), 0, deep)
        plate('cream', [a0, a1, b1, b0], () => y1, false)
        if (y0 > low + 0.01) plate('cream', [a0, a1, b1, b0], () => y0, true)
        if (deep > 1) {
          const pass = low + 3.3
          side('dark', b0, b1, [y0, y0], [pass, pass], out, u0, u1)
          side('cream', b0, b1, [pass, pass], [y1, y1], out, u0, u1)
          for (let i = 2; i <= count && F(i) < y1 - 1; i++) {
            const landing = [a0, a1, b1, b0]
            plate('cream', landing, () => F(i), true)
            plate('cream', landing, () => F(i) - 0.25, false)
            const [r0, r1] = [pt(u0, 0.1), pt(u1, 0.1)]
            bar(
              'cream',
              r0,
              r1,
              [F(i) + 1, F(i) + 1],
              [F(i) + 1.06, F(i) + 1.06],
              out,
              0.05,
              u0,
              u1,
            )
            bar(
              'cream',
              r0,
              r1,
              [F(i) + 0.5, F(i) + 0.5],
              [F(i) + 0.54, F(i) + 0.54],
              out,
              0.04,
              u0,
              u1,
            )
          }
          continue
        }
        // louvres across the bottom of the lowest glass
        let gy = y0
        if (Math.abs(y0 - g0) < 0.01) {
          gy = y0 + 1.1
          side('dark', b0, b1, [y0, y0], [gy, gy], out, u0, u1)
          for (let k = 0; k < 6; k++) {
            const y = y0 + 0.1 + k * 0.17
            const [c0, c1] = [pt(u0, 0.03), pt(u1, 0.03)]
            quad(
              'cream',
              [
                f.p3(c0.x, c0.z, y),
                f.p3(c1.x, c1.z, y),
                f.p3(b1.x, b1.z, y + 0.12),
                f.p3(b0.x, b0.z, y + 0.12),
              ],
              [
                [u0, f.v(y)],
                [u1, f.v(y)],
                [u1, f.v(y + 0.12)],
                [u0, f.v(y + 0.12)],
              ],
              [f.dir(out.x, out.z)[0], 1.5, f.dir(out.x, out.z)[2]],
            )
          }
        }
        const n = Math.sin(a0.x * 12.9898 + a0.z * 78.233 + y0 * 37.719) * 43758.5453
        quad(
          'glass',
          [f.p3(b0.x, b0.z, gy), f.p3(b1.x, b1.z, gy), f.p3(b1.x, b1.z, y1), f.p3(b0.x, b0.z, y1)],
          [
            [0, 0],
            [u1 - u0, 0],
            [u1 - u0, y1 - gy],
            [0, y1 - gy],
          ],
          f.dir(out.x, out.z),
          [u1 - u0, y1 - gy, n - Math.floor(n)],
        )
      }
    })
    plate('cream', cs, () => ttop, true)

    if (t.passage) {
      const face = t.passage
      const [p, q] = face === 'sw' ? [cs[0]!, cs[1]!] : [cs[1]!, cs[2]!]
      const mid = P((p.x + q.x) / 2, (p.z + q.z) / 2)
      const out = outOf(face)
      signs.push(
        signAt(mid.x, mid.z, low + 3.65, out, {
          text: 'M DECK\nPEDESTRIAN ENTRANCE',
          plate: '#c5c8cc',
          scale: 0.55,
        }),
      )
    }
  }

  // gsu's "M PARKING DECK" plate over the way in, and its clearance bar
  for (const [face, w0, w1, tall] of d.ways) {
    const u = (w0 + w1) / 2
    const p = at(face, u, SET)
    const out = outOf(face)
    const y = ground(p.x, p.z) + tall
    signs.push(
      signAt(p.x, p.z, y + 0.95, out, { width: 0.95, height: 0.85, plate: '#21336f' }),
      signAt(p.x, p.z, y + 1.08, out, { width: 0.28, height: 0.28, plate: '#3a68c8' }, -0.25, 0.01),
      signAt(p.x, p.z, y + 1.02, out, { ...white, text: d.letter, size: 0.5 }, 0.17, 0.02),
      signAt(p.x, p.z, y + 0.64, out, { ...white, text: 'PARKING      DECK', size: 0.07 }, 0, 0.02),
      signAt(
        p.x,
        p.z,
        y - 0.35,
        out,
        { width: (w1 - w0) * 0.7, height: 0.2, plate: '#2f55c2' },
        0,
        -0.6,
      ),
      signAt(
        p.x,
        p.z,
        y - 0.35,
        out,
        { ...white, text: '7\'-0"    CLEARANCE    7\'-0"', size: 0.11 },
        0,
        -0.58,
      ),
    )
  }

  return {
    parts: done(),
    inside: { solid: [], glass: [] },
    signs,
    noShadow: ['lamp', 'glass'],
    open: true,
  }
}

// g's bands: an upper band flush with the outline over a lower one set back, the screen set
// further back between one floor's band and the next
const UPPER = 0.15
const LOWER = 0.45
const STEP_IN = 0.18
const SCREEN_IN = 0.35

function bandDeck(b: DeckData, d: Band): LandmarkGeometry {
  const f = deckFrame(b)
  const c = collector()
  const { quad, done } = c
  const { plate, side, bar, box } = shapes(f, c)
  const { rel, ground } = f
  const signs: Sign[] = []
  const signAt = signer(f)
  const [first, step, count] = d.floors
  const F = (i: number) => rel(first + (i - 1) * step)
  const top = rel(d.parapet)
  const outline = b.points.map(([x, z]) => {
    const [a, w] = f.aw({ x: x!, z: z! })
    return P(a, w)
  })
  const ccw = area(outline) > 0

  const towers = d.towers.map((t) => {
    const cs = t.corners.map(([x, z]) => {
      const [a, w] = f.aw({ x: x!, z: z! })
      return P(a, w)
    })
    const a: Range = [Math.min(...cs.map((p) => p.x)), Math.max(...cs.map((p) => p.x))]
    const w: Range = [Math.min(...cs.map((p) => p.z)), Math.max(...cs.map((p) => p.z))]
    return { ...t, cs, a, w }
  })
  const inTower = (p: AW) =>
    towers.some(
      (t) => p.x > t.a[0] - 0.3 && p.x < t.a[1] + 0.3 && p.z > t.w[0] - 0.3 && p.z < t.w[1] + 0.3,
    )

  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length]!
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    if (len < 0.3) return
    const dir = P((q.x - p.x) / len, (q.z - p.z) / len)
    const inward = ccw ? P(-dir.z, dir.x) : P(dir.z, -dir.x)
    const out = P(-inward.x, -inward.z)
    const pt = (u: number, inset: number) =>
      P(p.x + dir.x * u + inward.x * inset, p.z + dir.z * u + inward.z * inset)
    const face: Face =
      Math.abs(out.x) > Math.abs(out.z) ? (out.x < 0 ? 'nw' : 'se') : out.z < 0 ? 'sw' : 'ne'
    // a range along the side (w or a) as a range of u along this edge
    const along = (r: Range): Range => {
      const at = (u: number) => (face === 'nw' || face === 'se' ? pt(u, 0).z : pt(u, 0).x)
      const [c0, c1] = [at(0), at(len)]
      const us = r.map((v) => ((v - c0) / (c1 - c0 || 1)) * len)
      return [Math.min(...us), Math.max(...us)]
    }
    // splits [a0, a1] along the edge into the bits in and out of the ranges
    const parts = (a0: number, a1: number, ranges: Range[]) => {
      const inside = ranges
        .map(along)
        .map(([r0, r1]): Range => [Math.max(r0, a0), Math.min(r1, a1)])
        .filter(([r0, r1]) => r1 - r0 > 0.05)
      const outside = without(
        inside.map(([r0, r1]) => [(r0 - a0) / (a1 - a0), (r1 - a0) / (a1 - a0)] as Range),
      )
      return [
        ...inside.map(([r0, r1]) => [r0, r1, true] as const),
        ...outside.map(([t0, t1]) => [a0 + (a1 - a0) * t0, a0 + (a1 - a0) * t1, false] as const),
      ]
    }
    // the ways in on this side, as parts of it
    const ways = d.ways.flatMap((wy) => {
      const ts = [wy.from, wy.to].map(([a, w]) => ((a! - p.x) * dir.x + (w! - p.z) * dir.z) / len)
      const off = Math.abs((wy.from[0]! - p.x) * dir.z - (wy.from[1]! - p.z) * dir.x)
      return off < 1 && ts.every((t) => t > -0.01 && t < 1.01)
        ? [{ ...wy, t: [Math.min(...ts), Math.max(...ts)] as Range }]
        : []
    })
    // in pieces of 10m at most, so the bottom follows the ground
    const n = Math.max(1, Math.ceil(len / 10))
    for (let k = 0; k < n; k++) {
      const [t0, t1] = [k / n, (k + 1) / n]
      const [u0, u1] = [t0 * len, t1 * len]
      if (inTower(pt((u0 + u1) / 2, 0.5))) continue
      const g: Range = [ground(pt(u0, 0).x, pt(u0, 0).z), ground(pt(u1, 0).x, pt(u1, 0).z)]
      // the openings between bands, the ways in cut out of them
      for (let lv = 1; lv < count; lv++) {
        const y1 = F(lv + 1) - LOWER
        const y0 = lv === 1 ? null : F(lv) + 1.05
        const cut = ways.filter((wy) => wy.floor === lv).map((wy) => wy.t)
        const row = d.rows[face]?.[lv]
        for (const [s0, s1] of without(
          cut.map(([a, z]) => [(a - t0) / (t1 - t0), (z - t0) / (t1 - t0)] as Range),
        )) {
          const gl = (u: number) => g[0] + ((g[1] - g[0]) * (u - u0)) / (u1 - u0)
          for (const [a0, a1, open] of row
            ? parts(u0 + (u1 - u0) * s0, u0 + (u1 - u0) * s1, row)
            : [[u0 + (u1 - u0) * s0, u0 + (u1 - u0) * s1, true] as const]) {
            const bottom: Range = y0 === null ? [gl(a0) + 0.3, gl(a1) + 0.3] : [y0, y0]
            if (Math.max(...bottom) > y1 - 0.1) continue
            if (!open) {
              // solid panels, flush with the band over it
              const from: Range = y0 === null ? [gl(a0) - 0.3, gl(a1) - 0.3] : [y0, y0]
              side('precast', pt(a0, 0), pt(a1, 0), from, [y1, y1], out, a0, a1)
              plate(
                'precast',
                [pt(a0, 0), pt(a1, 0), pt(a1, STEP_IN), pt(a0, STEP_IN)],
                () => y1,
                false,
              )
              continue
            }
            if (y0 === null)
              bar(
                'precast',
                pt(a0, 0),
                pt(a1, 0),
                [gl(a0) - 0.3, gl(a1) - 0.3],
                bottom,
                inward,
                SCREEN_IN,
                a0,
                a1,
              )
            else
              plate(
                'precast',
                [pt(a0, 0), pt(a1, 0), pt(a1, SCREEN_IN), pt(a0, SCREEN_IN)],
                () => y0,
                true,
              )
            screen(pt(a0, SCREEN_IN), pt(a1, SCREEN_IN), bottom, y1, out, a0, a1)
            // the head: under the next floor's lower band, back to the screen, and the sides
            plate(
              'precast',
              [pt(a0, STEP_IN), pt(a1, STEP_IN), pt(a1, SCREEN_IN), pt(a0, SCREEN_IN)],
              () => y1,
              false,
            )
            if (row) {
              const b0 = Math.max(...bottom)
              side('precast', pt(a0, 0), pt(a0, SCREEN_IN), [b0, b0], [y1, y1], dir, 0, SCREEN_IN)
              side(
                'precast',
                pt(a1, 0),
                pt(a1, SCREEN_IN),
                [b0, b0],
                [y1, y1],
                P(-dir.x, -dir.z),
                0,
                SCREEN_IN,
              )
            }
          }
        }
        // a way in: open, dark inside, the bands over it carry on
        for (const wy of ways.filter((w) => w.floor === lv)) {
          const [a0, a1] = [Math.max(wy.t[0], t0), Math.min(wy.t[1], t1)].map((t) => t * len)
          if (a1! - a0! < 0.1) continue
          const floorY = lv === 1 ? Math.max(...g) : F(lv)
          const head = Math.min(floorY + wy.tall, y1)
          side(
            'pole',
            pt(a0!, 4),
            pt(a1!, 4),
            [floorY - 0.3, floorY - 0.3],
            [y1, y1],
            out,
            a0!,
            a1!,
          )
          side('precast', pt(a0!, 0), pt(a0!, 4), [floorY - 0.3, floorY - 0.3], [y1, y1], dir, 0, 4)
          side(
            'precast',
            pt(a1!, 0),
            pt(a1!, 4),
            [floorY - 0.3, floorY - 0.3],
            [y1, y1],
            P(-dir.x, -dir.z),
            0,
            4,
          )
          if (head < y1 - 0.05)
            bar(
              'precast',
              pt(a0!, 0),
              pt(a1!, 0),
              [head, head],
              [y1, y1],
              inward,
              STEP_IN,
              a0!,
              a1!,
              false,
            )
        }
      }
      // the bands, from the second floor up, the top one is the parapet
      for (let lv = 2; lv <= count; lv++) {
        const cut = ways.filter((wy) => wy.floor === lv).map((wy) => wy.t)
        const darks = d.dark.filter(
          (dk) => dk.face === face && lv >= dk.floors[0] && lv <= dk.floors[1],
        )
        const stepsHere = lv === count ? d.steps.filter((st) => st.face === face) : []
        for (const [s0, s1] of without(
          cut.map(([a, z]) => [(a - t0) / (t1 - t0), (z - t0) / (t1 - t0)] as Range),
        )) {
          const [b0, b1] = [u0 + (u1 - u0) * s0, u0 + (u1 - u0) * s1]
          for (const [a0, a1, dark] of parts(
            b0,
            b1,
            darks.map((dk) => dk.at),
          )) {
            // the parapet a bit higher or lower in places
            for (const [c0, c1] of stepsHere.length
              ? parts(
                  a0,
                  a1,
                  stepsHere.map((st) => st.at),
                )
              : [[a0, a1] as const]) {
              const st = stepsHere.find((x) => {
                const [r0, r1] = along(x.at)
                return (c0 + c1) / 2 > r0 && (c0 + c1) / 2 < r1
              })
              const roof = top + (st?.by ?? 0)
              const upper: Range = [F(lv) + UPPER, lv === count ? roof : F(lv) + 1.05]
              if (upper[1] < Math.min(...g)) continue
              // the lower band, set back, and the upper one's underside over it
              side(
                'precast',
                pt(c0, STEP_IN),
                pt(c1, STEP_IN),
                [F(lv) - LOWER, F(lv) - LOWER],
                [upper[0], upper[0]],
                out,
                c0,
                c1,
              )
              plate(
                'precast',
                [pt(c0, 0), pt(c1, 0), pt(c1, STEP_IN), pt(c0, STEP_IN)],
                () => upper[0],
                false,
              )
              if (dark) screen(pt(c0, 0), pt(c1, 0), [upper[0], upper[0]], upper[1], out, c0, c1)
              else
                side(
                  'precast',
                  pt(c0, 0),
                  pt(c1, 0),
                  [upper[0], upper[0]],
                  [upper[1], upper[1]],
                  out,
                  c0,
                  c1,
                )
              if (lv === count) {
                // the parapet's top and its inside, seen from the roof
                plate(
                  'precast',
                  [pt(c0, 0), pt(c1, 0), pt(c1, SCREEN_IN), pt(c0, SCREEN_IN)],
                  () => roof,
                  true,
                )
                side(
                  'precast',
                  pt(c0, SCREEN_IN),
                  pt(c1, SCREEN_IN),
                  [F(lv), F(lv)],
                  [roof, roof],
                  inward,
                  c0,
                  c1,
                )
              }
            }
          }
        }
      }
    }
  })

  // the screens: dark bronze frames round dark mesh panels, a mullion every 2.7m or so
  function screen(p: AW, q: AW, [b0, b1]: Range, y1: number, out: AW, u0: number, u1: number) {
    const bottom = Math.max(b0, b1)
    const nr = Math.sin(p.x * 12.9898 + p.z * 78.233 + bottom * 37.719) * 43758.5453
    quad(
      'screen',
      [f.p3(p.x, p.z, bottom), f.p3(q.x, q.z, bottom), f.p3(q.x, q.z, y1), f.p3(p.x, p.z, y1)],
      [
        [0, 0],
        [u1 - u0, 0],
        [u1 - u0, y1 - bottom],
        [0, y1 - bottom],
      ],
      f.dir(out.x, out.z),
      [u1 - u0, y1 - bottom, nr - Math.floor(nr)],
    )
    // and the precast under it where the ground slopes
    if (Math.abs(b0 - b1) > 0.02) side('precast', p, q, [b0, b1], [bottom, bottom], out, u0, u1)
  }

  // the roof: flat round the ramp bay, the ramp climbing along it
  const [ra, rw] = [d.ramp.a, d.ramp.w]
  const bay = [P(ra[0], rw[0]), P(ra[1], rw[0]), P(ra[1], rw[1]), P(ra[0], rw[1])]
  plate('slab', outline, () => F(count), true, [ccw ? bay : [...bay].reverse()])
  const rampY = (_w: number, a: number) =>
    rel(d.ramp.y[0] + ((d.ramp.y[1] - d.ramp.y[0]) * (a - ra[0])) / (ra[1] - ra[0]))
  plate('slab', bay, rampY, true)
  // the ramp's sides, down from the flat roof
  for (const w of rw) {
    const [p, q] = [P(ra[0], w), P(ra[1], w)]
    const facing = P(0, w === rw[0] ? 1 : -1)
    side(
      'precast',
      p,
      q,
      [rampY(w, ra[0]), rampY(w, ra[1])],
      [F(count), F(count)],
      facing,
      ra[0],
      ra[1],
    )
    // a low wall along it on the roof
    bar(
      'precast',
      p,
      q,
      [F(count), F(count)],
      [F(count) + 0.9, F(count) + 0.9],
      P(0, -facing.z),
      0.25,
      ra[0],
      ra[1],
    )
  }

  // floodlights along the ramp bay, two heads on a t
  for (const w of rw)
    for (const a of [22, 34, 46, 56]) {
      const y = F(count) + 0.9
      const ww = w + (w === rw[0] ? -0.15 : 0.15)
      box('pole', [a - 0.1, a + 0.1], [ww - 0.1, ww + 0.1], y, y + 8.2, false)
      box('pole', [a - 0.06, a + 0.06], [ww - 0.8, ww + 0.8], y + 8.1, y + 8.22)
      for (const s of [-1, 1])
        box(
          'pole',
          [a - 0.25, a + 0.25],
          [ww + s * 0.75 - 0.3, ww + s * 0.75 + 0.3],
          y + 7.85,
          y + 8.1,
        )
    }

  // the towers: plain precast in 1.5m courses of panels, a glass stair on one side
  for (const t of towers) {
    const cs = [P(t.a[0], t.w[0]), P(t.a[1], t.w[0]), P(t.a[1], t.w[1]), P(t.a[0], t.w[1])]
    const outs = [P(0, -1), P(1, 0), P(0, 1), P(-1, 0)]
    const low = Math.min(...cs.map((p) => ground(p.x, p.z))) - 0.3
    const ttop = rel(t.top)
    cs.forEach((p, i) => {
      const q = cs[(i + 1) % 4]!
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      const out = outs[i]!
      if (i !== t.glass) return side('precast', p, q, [low, low], [ttop, ttop], out, 0, len)
      const dirU = P((q.x - p.x) / len, (q.z - p.z) / len)
      const at = (u: number, inset = 0) =>
        P(p.x + dirU.x * u - out.x * inset, p.z + dirU.z * u - out.z * inset)
      const holes: Hole[] = [[0.5, len - 0.5, low + 0.8, ttop - 1]]
      for (const [h0, h1, y0, y1] of solidPieces(len, low, ttop, holes))
        side('precast', at(h0), at(h1), [y0, y0], [y1, y1], out, h0, h1)
      const [h0, h1, y0, y1] = holes[0]!
      side('precast', at(h0), at(h0, 0.2), [y0, y0], [y1, y1], dirU, 0, 0.2)
      side('precast', at(h1), at(h1, 0.2), [y0, y0], [y1, y1], P(-dirU.x, -dirU.z), 0, 0.2)
      plate('precast', [at(h0), at(h1), at(h1, 0.2), at(h0, 0.2)], () => y1, false)
      plate('precast', [at(h0), at(h1), at(h1, 0.2), at(h0, 0.2)], () => y0, true)
      const [g0, g1] = [at(h0, 0.2), at(h1, 0.2)]
      const nr = Math.sin(g0.x * 12.9898 + g0.z * 78.233) * 43758.5453
      quad(
        'glass',
        [f.p3(g0.x, g0.z, y0), f.p3(g1.x, g1.z, y0), f.p3(g1.x, g1.z, y1), f.p3(g0.x, g0.z, y1)],
        [
          [0, 0],
          [h1 - h0, 0],
          [h1 - h0, y1 - y0],
          [0, y1 - y0],
        ],
        f.dir(out.x, out.z),
        [h1 - h0, y1 - y0, nr - Math.floor(nr)],
      )
    })
    plate('precast', cs, () => ttop, true)
  }

  // gsu's "G DECK" lightbox on the north tower's north west side
  {
    const [a, w, lv] = d.lightbox as [number, number, number]
    const nw = P(-1, 0)
    const y = F(lv) + 1.6
    signs.push(
      signAt(a, w, y, nw, { width: 2.6, height: 1.3, plate: '#22336b' }, 0, 0.12),
      signAt(a, w, y, nw, { ...white, text: d.letter, size: 0.95 }, -0.75, 0.14),
      signAt(a, w, y + 0.25, nw, { width: 0.48, height: 0.48, plate: '#3a68c8' }, 0.5, 0.14),
      signAt(a, w, y - 0.33, nw, { ...white, text: 'DECK', size: 0.3 }, 0.5, 0.14),
    )
  }
  // the clearance bars over the ways in, a small gsu plate by the collins st one
  for (const wy of d.ways) {
    const [a, w] = [(wy.from[0]! + wy.to[0]!) / 2, (wy.from[1]! + wy.to[1]!) / 2]
    const se = P(1, 0)
    const floorY = wy.floor === 1 ? ground(a, w) : F(wy.floor)
    const y = floorY + wy.tall - 0.45
    signs.push(
      signAt(a, w, y, se, { width: 4.4, height: 0.2, plate: '#2f55c2' }, 0, 0.6),
      signAt(a, w, y, se, { ...white, text: wy.clearance, size: 0.11 }, 0, 0.62),
    )
    if (wy.floor === 1)
      signs.push(
        signAt(
          a,
          w + 4.5,
          floorY + 2.1,
          se,
          { width: 0.85, height: 0.75, plate: '#21336f' },
          0,
          0.36,
        ),
        signAt(a, w + 4.5, floorY + 2.2, se, { ...white, text: d.letter, size: 0.45 }, 0.15, 0.37),
        signAt(
          a,
          w + 4.5,
          floorY + 2.2,
          se,
          { width: 0.26, height: 0.26, plate: '#3a68c8' },
          -0.2,
          0.37,
        ),
      )
  }

  // courtland st's sidewalk is narrower in the game than for real, where it runs up to the
  // deck: the strip between, at the sidewalk's height
  const se = outline.flatMap((p, i) => {
    const q = outline[(i + 1) % outline.length]!
    return p.x > 72 && q.x > 72 && Math.abs(q.z - p.z) > 5 ? [[p, q] as const] : []
  })
  for (const [p, q] of se) {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const n = Math.ceil(len / 4)
    for (let k = 0; k < n; k++) {
      const [s0, s1] = [k / n, (k + 1) / n]
      const [c0, c1] = [lerpP(p, q, s0), lerpP(p, q, s1)]
      const deckAt = (cc: AW) => {
        const g = f.at(cc.x + 2.6, cc.z)
        return Math.max(-Infinity, ...decksAt(g.x, g.z)) - f.floor
      }
      const [h0, h1] = [deckAt(c0), deckAt(c1)]
      if (!Number.isFinite(h0) || !Number.isFinite(h1)) continue
      const strip = [c0, c1, P(c1.x + 2.2, c1.z), P(c0.x + 2.2, c0.z)]
      plate('slab', strip, (w) => h0 + ((h1 - h0) * (w - c0.z)) / (c1.z - c0.z || 1), true)
      plate('slab', strip, (w) => h0 - 0.4 + ((h1 - h0) * (w - c0.z)) / (c1.z - c0.z || 1), false)
    }
  }

  return {
    parts: done(),
    inside: { solid: [], glass: [] },
    signs,
    noShadow: ['screen', 'glass'],
    open: true,
  }
}

/**
 * The bits of g's stair towers that stand out past its outline (the lidar has them a little
 * bigger than osm's outline), as walls. the other decks' towers are in their outlines
 */
export function deckObstacles(b: DeckData): Segment[] {
  const d = b.name ? DECKS[b.name] : undefined
  if (d?.style !== 'band') return []
  return d.towers.flatMap((t) =>
    t.corners.map(([ax, az], i) => {
      const [bx, bz] = t.corners[(i + 1) % t.corners.length]!
      return { ax: ax!, az: az!, bx: bx!, bz: bz! }
    }),
  )
}
