import * as THREE from 'three'
import type { Point } from '../game/collision'
import { baseOf } from '../game/surface'
import { heightAt } from '../game/terrain'
import {
  flat,
  frame,
  glassQuad,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Frame,
  type Hole,
} from './landmark'
import type { LandmarkGeometry, Sign } from './landmarks'

// the hurt building (45 edgewood ave / 50 hurt plaza, 1913-26), across peachtree center ave
// from hurt park. two 17 floor wings, on edgewood ave and on hurt plaza, meet at the apex in
// the west over a marble rotunda, and stand apart in the east round a light court over the
// base. a three storey marble base (white georgia marble, cast iron spandrels), an attic of
// cream terra cotta, then 13 floors of pale grey glazed brick: the windows in pairs and singles
// in tall recesses, a terra cotta panel under each, and the top floor and its big cornice all
// terra cotta. from commons photos (2013-2020), mapillary (2019, 2022), esri and usgs's lidar
// (2018). sources: docs/reference/hurt-building.md
//
// the sides are frames from one corner of the base to the next going round (landmark.ts
// frame(): a along, d out): edgewood ave from the apex, the chamfer on peachtree center ave,
// the edgewood wing's end, the base across the court, the hurt plaza wing's end, hurt plaza

export type HurtData = {
  points: number[][]
  height: number
  landmark?: { corners: number[][]; court: number[][]; rotunda: number[] }
}

// each part is a draw call in every pass. dark is the cast iron, the cornice's lip, the roofs
// and a box inside for the shadows. store is the base's windows (dark frames), glass the rest
export type Part = 'marble' | 'brick' | 'terra' | 'dark' | 'glass' | 'store'

// heights over the peachtree center ave sidewalk at the chamfer (311.3m, surface.ts DATUMS).
// the floors from the window rows up the chamfer in the 2013 and 2017 photos, by cross ratio
// (13 sills in each, 3px): the band under the shaft is 4.7 floors over the sidewalk, the
// crown 1.9 over the top floor's panel. with the lidar's crown (381.4m) a floor is 3.75m. the
// base: three tiers of windows between marble piers, cast iron between them
export const TIERS: [number, number][] = [
  [2.4, 5.7],
  [6.9, 9.4],
  [10.7, 12.8],
]
const OPENING = 12.8
// the base's entablature: architrave, frieze, dentils, the cornice and its moulding, each
// [bottom, top, out]
const ENTABLATURE: [number, number, number][] = [
  [12.8, 13.35, 0.06],
  [14.05, 14.4, 0.22],
  [14.4, 15.15, 0.6],
  [15.15, 15.4, 0.66],
]
const ATTIC = 15.4
const ATTIC_WINDOW = [15.7, 16.9]
const BAND = [17.2, 17.5]
// the shaft: 13 floors, a terra cotta panel (a sill on top) then the window on each. the top
// floor and the frieze over it are terra cotta all over
export const SHAFT = 17.5
export const FLOOR = 3.75
export const FLOORS = 13
export const SPANDREL = 1.1
export const HEAD = SHAFT + FLOORS * FLOOR
const TOP_FLOOR = SHAFT + (FLOORS - 1) * FLOOR
// the cornice: the frieze, dentils, a band behind the corbels, the crown well out on them and
// its dark lip. [bottom, top, out]. its top and the roof behind it are lidar (381.4m, 380m)
const FRIEZE = 67
const CORNICE: [number, number, number][] = [
  [FRIEZE, 67.3, 0.22],
  [67.3, 68.55, 0.12],
  [68.55, 69.85, 1.15],
]
const CORBEL = { every: 1, width: 0.34, out: 1, foot: 0.55 }
const LIP = { y: 69.85, out: 1.2 }
export const TOP = 70.1
export const ROOF = 68.7
const PARAPET = 0.4
// the court: the base across its mouth has its roof at 329.0m behind a 330.9m parapet for
// 12.5m back, then the court's floor is at 321.7m (lidar). its walls go to just over the roof
export const BASE_ROOF = 17.7
export const BASE_TOP = 19.6
const BASE_DEPTH = 12.5
export const COURT_FLOOR = 10.4
const COURT_TOP = 69.3
// the penthouse and the machine room on it (lidar 386.7m and 388.7m)
const PENTHOUSE = {
  points: [
    [-187, -20],
    [-178, -20],
    [-163.2, -15],
    [-164.5, -3],
    [-167, 2.8],
    [-190.9, -4.5],
  ],
  top: 75.4,
}
const MACHINE = {
  points: [
    [-176.5, -10],
    [-164.8, -10],
    [-164.8, -1.5],
    [-176.5, -1.5],
  ],
  top: 77.4,
}

// the windows: a single 1.5m, a pair two of them with 0.14m of brick between (nearly touching
// in the 2017 photo). the piers come out of each side's length (0.55 of a pair, like the
// photos), the ends are wider
const WIN = 1.5
const MULL = 0.14
export const PAIR = 2 * WIN + MULL
// how far into the brick: the glass at the back of the bay, the panel under it a bit proud of
// that with its field sunk in and a sill along its top
const BAY = 0.3
const PANEL = 0.2
const FIELD = 0.26
// the base's openings under each pair are 0.3m wider, deep in the marble, cast iron proud of
// the glass
const OPEN = 0.55
const IRON = 0.45
// the court's walls: plain brick, a window every few meters
const COURT_WIN = 1.2

// what's on each side: windows across [singles or pairs], and the end piers
export const LAYOUT: Record<Side, { bays: number[]; end: number }> = {
  edgewood: { bays: [1, ...Array<number>(16).fill(2), 1], end: 2.5 },
  chamfer: { bays: [1], end: 2.77 },
  edgewoodEnd: { bays: [2, 2, 2], end: 1.7 },
  plazaEnd: { bays: [1, 2, 2, 1], end: 1.96 },
  plaza: { bays: [1, ...Array<number>(13).fill(2), 1], end: 2.5 },
  apex: { bays: [1, 2, 1], end: 2.5 },
}
type Side = 'edgewood' | 'chamfer' | 'edgewoodEnd' | 'plazaEnd' | 'plaza' | 'apex'

// the rotunda: a colonnade of seven columns (the two at the ends half in the apex) on
// pedestals, tall windows between them, the entablature and cornice, a balustrade on top
// (lidar 327.2m and 328.6m). radii from its middle, heights from the 2020 photo of the apex
export const ROTUNDA = {
  core: 4,
  wall: 4.4,
  columns: 4.95,
  column: 0.38,
  pedestal: 1,
  frieze: 5.45,
  cornice: 5.85,
  balustrade: 5.35,
  capital: [12.5, 13.25] as [number, number],
  friezeTop: 14.3,
  corniceTop: 15.05,
  plinth: 15.95,
  roof: 15.9,
  rail: 16.95,
  top: 17.3,
}

const flip = (o: Point) => ({ x: -o.x, z: -o.z })
// where a line through p along d crosses one through q along e
function meet(p: Point, d: Point, q: Point, e: Point) {
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / (d.x * e.z - d.z * e.x)
  return { x: p.x + d.x * t, z: p.z + d.z * t }
}

/** the corners and the sides of the base, going round from the apex on edgewood ave */
export function hurtSides(b: HurtData) {
  type Eight = [Point, Point, Point, Point, Point, Point, Point, Point]
  const c = b.landmark!.corners.map(pt) as Eight
  const [apexN, chamW, chamE, eS, bN, bS, plazaSE, apexS] = c
  const court = b.landmark!.court.map(pt) as [Point, Point, Point, Point]
  return {
    corners: c,
    court,
    rotunda: pt(b.landmark!.rotunda),
    edgewood: frame(apexN, chamW),
    chamfer: frame(chamW, chamE),
    edgewoodEnd: frame(chamE, eS),
    step: frame(eS, bN),
    front: frame(bN, bS),
    plazaEnd: frame(bS, plazaSE),
    plaza: frame(plazaSE, apexS),
    apex: frame(apexS, apexN),
  }
}

/** where the bays are along a side: [from, to, windows] */
export function baysOf(len: number, { bays, end }: { bays: number[]; end: number }) {
  const widths = bays.map((n) => (n === 2 ? PAIR : WIN))
  const pier =
    bays.length > 1 ? (len - 2 * end - widths.reduce((s, w) => s + w, 0)) / (bays.length - 1) : 0
  let a = bays.length > 1 ? end : (len - widths[0]!) / 2
  return bays.map((n, i) => {
    const bay = [a, a + widths[i]!, n] as const
    a += widths[i]! + pier
    return bay
  })
}

/** the brick between the bays (and at the ends), [from, to] along the side */
export function piersOf(len: number, bays: (readonly [number, number, number])[]) {
  const edges = [0, ...bays.flatMap(([a0, a1]) => [a0, a1]), len]
  return Array.from({ length: bays.length + 1 }, (_, i): [number, number] => [
    edges[2 * i]!,
    edges[2 * i + 1]!,
  ])
}

/** a line of points moved d out from it (out is to the left going along), corners mitred */
export function offset(points: Point[], d: number, closed: boolean) {
  const n = points.length
  const dirs = points.map((p, i) => {
    const q = points[(i + 1) % n]!
    const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
    return { x: (q.x - p.x) / l, z: (q.z - p.z) / l }
  })
  const out = (e: Point) => ({ x: e.z, z: -e.x })
  return points.map((p, i) => {
    const next = dirs[i]!
    const prev = dirs[(i + n - 1) % n]!
    const o = out(next)
    if (!closed && i === 0) return { x: p.x + o.x * d, z: p.z + o.z * d }
    if (!closed && i === n - 1) {
      const po = out(prev)
      return { x: p.x + po.x * d, z: p.z + po.z * d }
    }
    const po = out(prev)
    return meet(
      { x: p.x + po.x * d, z: p.z + po.z * d },
      prev,
      { x: p.x + o.x * d, z: p.z + o.z * d },
      next,
    )
  })
}

type V3 = [number, number, number]

/**
 * A flat polygon of any slope (fanned from its first corner), facing the side `toward` points
 * to. uvs in meters: along the ground and up for walls, x and z for flat bits
 */
export function polygon(points: V3[], toward: V3) {
  const v = points.map((p) => new THREE.Vector3(...p))
  const n = new THREE.Vector3()
    .subVectors(v[1]!, v[0]!)
    .cross(new THREE.Vector3().subVectors(v[2]!, v[0]!))
    .normalize()
  if (n.dot(new THREE.Vector3(...toward)) < 0) {
    v.reverse()
    n.negate()
  }
  const flatish = Math.abs(n.y) > 0.7
  const side = new THREE.Vector3(-n.z, 0, n.x).normalize()
  const pos: number[] = []
  const uv: number[] = []
  for (let i = 1; i + 1 < v.length; i++)
    for (const p of [v[0]!, v[i]!, v[i + 1]!]) {
      pos.push(p.x, p.y, p.z)
      uv.push(...(flatish ? [p.x, p.z + 300] : [p.x * side.x + p.z * side.z, p.y]))
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => n.getComponent(i % 3)),
      3,
    ),
  )
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}

export function hurtBuildingGeometry(b: HurtData): LandmarkGeometry {
  const { add, merged } = collect<Part>()
  const signs: Sign[] = []
  const sides = hurtSides(b)
  const { edgewood, chamfer, edgewoodEnd, step, front, plazaEnd, plaza, apex, court } = sides
  const [apexN, chamW, chamE, eS, bN, bS, plazaSE, apexS] = sides.corners
  const [, backN, backS] = court
  // the street climbs 4.7m to the apex: the ground there, over the base's sidewalk
  const base = baseOf(b)
  const ground = (p: Point) => heightAt(p.x, p.z) - base
  const uv = (geo: THREE.BufferGeometry, f: (u: number, v: number) => [number, number]) => {
    const t = geo.getAttribute('uv')
    for (let i = 0; i < t.count; i++) t.setXY(i, ...f(t.getX(i), t.getY(i)))
    return geo
  }
  // flat bits: their uvs are the world's x and z and the grime darkens toward uv y 0 (the
  // ground), this block is right on it, so they're moved off
  const lid = (part: Part, c: Point[], y: number, up = true) =>
    add(
      part,
      uv(flat(c, y, up), (u, v) => [u, v + 300]),
    )
  // a point on a side: a along, y up, d out
  const at3 = (f: Frame, a: number, y: number, d: number): V3 => {
    const p = f.at(a, d)
    return [p.x, y, p.z]
  }
  const out3 = (f: Frame): V3 => [f.out.x, 0, f.out.z]
  // a hole's sides, top and bottom, set `depth` into a side
  const reveal = (
    part: Part,
    f: Frame,
    a0: number,
    a1: number,
    y0: number,
    y1: number,
    depth: number,
  ) => {
    add(part, wallQuad(f.at(a0), f.at(a0, -depth), y0, y1, f.along))
    add(part, wallQuad(f.at(a1), f.at(a1, -depth), y0, y1, flip(f.along)))
    const rim = [f.at(a0), f.at(a1), f.at(a1, -depth), f.at(a0, -depth)]
    lid(part, rim, y0)
    lid(part, rim, y1, false)
  }
  // a wall from y0 to y1 with holes, `part` below `split` and `above` over it
  const solid = (
    f: Frame,
    y0: number,
    y1: number,
    holes: Hole[],
    part: Part,
    split = Infinity,
    above = part,
  ) => {
    for (const [a0, a1, v0, v1] of solidPieces(f.len, y0, y1, holes)) {
      if (v0 < split) add(part, wallQuad(f.at(a0), f.at(a1), v0, Math.min(v1, split), f.out, a0))
      if (v1 > split) add(above, wallQuad(f.at(a0), f.at(a1), Math.max(v0, split), v1, f.out, a0))
    }
  }
  // a window's glass on a side, d out
  const pane = (part: Part, f: Frame, a0: number, a1: number, y0: number, y1: number, d: number) =>
    add(part, glassQuad(f.at(a0, d), f.at(a1, d), y0, y1, f.out))
  const back = (part: Part, f: Frame, a0: number, a1: number, y0: number, y1: number, d: number) =>
    add(part, wallQuad(f.at(a0, d), f.at(a1, d), y0, y1, f.out, a0))
  // a flat strip of a side from d0 out to d1 at height y, facing up or down
  const ledge = (
    part: Part,
    f: Frame,
    a0: number,
    a1: number,
    y: number,
    d0: number,
    d1: number,
    up: boolean,
  ) => lid(part, [f.at(a0, d0), f.at(a1, d0), f.at(a1, d1), f.at(a0, d1)], y, up)
  // a block standing out of a side from d0 to d1: its front, ends (unless it runs between two
  // walls), top and bottom
  const box = (
    part: Part,
    f: Frame,
    a0: number,
    a1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
    ends = true,
    lids: 'both' | 'top' | 'bottom' | 'none' = 'both',
  ) => {
    add(part, wallQuad(f.at(a0, d1), f.at(a1, d1), y0, y1, f.out, a0))
    if (ends) add(part, wallQuad(f.at(a0, d0), f.at(a0, d1), y0, y1, flip(f.along)))
    if (ends) add(part, wallQuad(f.at(a1, d0), f.at(a1, d1), y0, y1, f.along))
    const cell = [f.at(a0, d0), f.at(a1, d0), f.at(a1, d1), f.at(a0, d1)]
    if (lids === 'both' || lids === 'top') lid(part, cell, y1)
    if (lids === 'both' || lids === 'bottom') lid(part, cell, y0, false)
  }
  // a low four sided boss on a side (a rosette, a medallion), its base s wide at d, h high
  const boss = (part: Part, f: Frame, a: number, y: number, d: number, s: number, h: number) => {
    const c: V3[] = [
      at3(f, a - s / 2, y - s / 2, d),
      at3(f, a + s / 2, y - s / 2, d),
      at3(f, a + s / 2, y + s / 2, d),
      at3(f, a - s / 2, y + s / 2, d),
    ]
    const top = at3(f, a, y, d + h)
    const o = out3(f)
    c.forEach((p, i) => add(part, polygon([p, c[(i + 1) % 4]!, top], o)))
  }
  // a panel set in a side: the field sunk to `field` across a0..a1, rails along its top and
  // bottom out at `face`, `fields` fields with a stile between them and a boss in each. the
  // rails' ends only show on one that stands out of the wall (`ends`)
  const panel = (
    part: Part,
    f: Frame,
    a0: number,
    a1: number,
    y0: number,
    y1: number,
    face: number,
    field: number,
    fields: number,
    rail: number,
    ends = false,
  ) => {
    // set in a recess, the rails' outer sides are against a sill or a ledge
    back(part, f, a0, a1, y0 + rail, y1 - rail, -field)
    box(part, f, a0, a1, -field, -face, y1 - rail, y1, ends, ends ? 'both' : 'bottom')
    box(part, f, a0, a1, -field, -face, y0, y0 + rail, ends, ends ? 'both' : 'top')
    const w = (a1 - a0) / fields
    for (let i = 1; i < fields; i++) {
      const a = a0 + i * w
      box(part, f, a - rail / 2, a + rail / 2, -field, -face, y0 + rail, y1 - rail, true, 'none')
    }
    const s = Math.min(w, y1 - y0 - 2 * rail) * 0.4
    for (let i = 0; i < fields; i++)
      boss(part, f, a0 + (i + 0.5) * w, (y0 + y1) / 2, -field, s, (field - face) * 1.3)
  }

  // the shaft on each of the wings' sides: brick (terra cotta from the top floor's panel up) with
  // the bays set into it from the band to the top window's head. in them, to each floor, a
  // terra cotta panel with a sill on top, then the window (or two)
  const shaftSides: [Frame, Side][] = [
    [edgewood, 'edgewood'],
    [chamfer, 'chamfer'],
    [edgewoodEnd, 'edgewoodEnd'],
    [plazaEnd, 'plazaEnd'],
    [plaza, 'plaza'],
    [apex, 'apex'],
  ]
  for (const [f, side] of shaftSides) {
    const bays = baysOf(f.len, LAYOUT[side])
    solid(
      f,
      SHAFT,
      FRIEZE,
      bays.map(([a0, a1]) => [a0, a1, SHAFT, HEAD]),
      'brick',
      TOP_FLOOR,
      'terra',
    )
    for (const [a0, a1, n] of bays) {
      reveal('brick', f, a0, a1, SHAFT, HEAD, BAY)
      for (let k = 0; k < FLOORS; k++) {
        const y = SHAFT + k * FLOOR
        const sill = y + SPANDREL
        panel('terra', f, a0, a1, y, sill, PANEL, FIELD, n === 2 ? 2 : 1, 0.16)
        // the panel's underside over the window below, and its sill
        if (k > 0) ledge('terra', f, a0, a1, y, -BAY, -PANEL, false)
        box('terra', f, a0, a1, -PANEL, -0.1, sill - 0.08, sill + 0.03, false)
        ledge('terra', f, a0, a1, sill + 0.03, -BAY, -PANEL, true)
        if (n === 1) pane('glass', f, a0, a1, sill, y + FLOOR, -BAY)
        else {
          pane('glass', f, a0, a0 + WIN, sill, y + FLOOR, -BAY)
          box('brick', f, a0 + WIN, a1 - WIN, -BAY, -PANEL, sill + 0.03, y + FLOOR, true, 'none')
          pane('glass', f, a1 - WIN, a1, sill, y + FLOOR, -BAY)
        }
      }
    }
    // on each pier from the top floor up a tall terra cotta panel (gold in real life) with a
    // roundel at its head, and a medallion on the frieze over it
    for (const [p0, p1] of piersOf(f.len, bays)) {
      const w = Math.min(1, (p1 - p0) * 0.55)
      const a = (p0 + p1) / 2
      if (w < 0.4) continue
      panel(
        'terra',
        f,
        a - w / 2,
        a + w / 2,
        TOP_FLOOR + 0.2,
        HEAD - 0.2,
        -0.08,
        -0.03,
        1,
        0.1,
        true,
      )
      boss('terra', f, a, HEAD + 0.38, 0, 0.5, 0.14)
    }
  }

  // the base under them, and across the court: marble from the ground to the entablature with
  // an opening under each pair: three tiers of glass, cast iron panels between them. then the
  // terra cotta attic with a window under each one above and a cartouche on each pier
  const baseSides: [Frame, Side | null][] = [
    [edgewood, 'edgewood'],
    [chamfer, 'chamfer'],
    [edgewoodEnd, 'edgewoodEnd'],
    [front, null],
    [plazaEnd, 'plazaEnd'],
    [plaza, 'plaza'],
    [apex, 'apex'],
  ]
  // the base across the court: three wide openings between pairs of pilasters
  const frontBays: [number, number][] = [1.6, 8.39, 15.18].map((a) => [a, a + 4.18])
  // the little return where it's set back from the edgewood wing, under the court's wall
  solid(step, 0, COURT_FLOOR, [], 'marble')
  for (const [f, side] of baseSides) {
    const bays = side ? baysOf(f.len, LAYOUT[side]) : []
    const pairs = bays.filter(([, , n]) => n === 2).map(([a0, a1]) => [a0 - 0.15, a1 + 0.15])
    const openings = f === front ? frontBays : f === apex || f === chamfer ? [] : pairs
    // each opening starts a bit over the sidewalk where the street's climbed past the first tier
    const holes = openings.map(([a0, a1]): Hole => {
      const g = ground(f.at((a0! + a1!) / 2))
      return [a0!, a1!, Math.max(TIERS[0]![0], g + 0.5), OPENING]
    })
    for (const [a0, a1, y0, y1] of holes) {
      reveal('marble', f, a0, a1, y0, y1, OPEN)
      // glass in each tier, cast iron panels between
      let y = y0
      for (const [t0, t1] of TIERS) {
        if (t1 <= y + 0.3) continue
        if (t0 > y + 0.3) {
          panel('dark', f, a0, a1, y, t0, IRON, IRON + 0.04, 3, 0.12)
          ledge('dark', f, a0, a1, y, -OPEN, -IRON, false)
          ledge('dark', f, a0, a1, t0, -OPEN, -IRON, true)
        } else if (t0 > y) back('dark', f, a0, a1, y, t0, -IRON)
        pane('store', f, a0, a1, Math.max(t0, y), t1, -OPEN)
        y = t1
      }
      if (y < y1) back('dark', f, a0, a1, y, y1, -IRON)
    }
    // on the chamfer a tall window over the arched door, a round window over the door
    const mid = f.len / 2
    const slot: Hole = [mid - 0.8, mid + 0.8, 7, OPENING]
    const door: Hole = [mid - 0.9, mid + 0.9, 0, 4.3]
    const oculus: Hole = [mid - 0.38, mid + 0.38, 4.75, 5.5]
    if (f === chamfer) {
      holes.push(slot, door, oculus)
      reveal('marble', f, ...slot, 0.35)
      pane('store', f, slot[0], slot[1], slot[2], 9.6, -0.35)
      panel('dark', f, slot[0], slot[1], 9.6, 10.6, 0.25, 0.3, 2, 0.1, true)
      pane('store', f, slot[0], slot[1], 10.6, slot[3], -0.35)
      reveal('marble', f, door[0], door[1], 0, door[3], 0.3)
      back('dark', f, door[0], door[1], 0, door[3], -0.3)
      pane('store', f, door[0] + 0.2, door[1] - 0.2, 0.1, door[3] - 0.5, -0.28)
      reveal('marble', f, ...oculus, 0.2)
      pane('store', f, oculus[0], oculus[1], oculus[2], oculus[3], -0.2)
      hood(f, mid, door[3])
    }
    solid(f, 0, ENTABLATURE[0]![0], holes, 'marble')
    solid(f, ENTABLATURE[0]![0], ATTIC, [], 'marble')
    const win = (a0: number, a1: number): Hole => [a0, a1, ATTIC_WINDOW[0]!, ATTIC_WINDOW[1]!]
    const attic: Hole[] =
      f === front
        ? frontBays.flatMap(([a0, a1]) => [
            win(a0 + 0.5, a0 + 0.5 + WIN),
            win(a1 - 0.5 - WIN, a1 - 0.5),
          ])
        : bays.flatMap(([a0, a1, n]) =>
            n === 1 ? [win(a0, a1)] : [win(a0, a0 + WIN), win(a1 - WIN, a1)],
          )
    const top = f === front ? BASE_TOP : BAND[0]!
    solid(f, ATTIC, top, attic, 'terra', f === front ? BAND[1]! : Infinity, 'brick')
    for (const [a0, a1, y0, y1] of attic) {
      reveal('terra', f, a0, a1, y0, y1, 0.15)
      pane('glass', f, a0, a1, y0, y1, -0.15)
    }
    // a cartouche on each pier of the attic
    if (f !== front)
      for (const [p0, p1] of piersOf(f.len, bays)) {
        const w = Math.min(0.9, (p1 - p0) * 0.55)
        if (w < 0.4) continue
        const a = (p0 + p1) / 2
        box('terra', f, a - w / 2, a + w / 2, 0, 0.06, 15.75, 16.85)
        boss('terra', f, a, 16.3, 0.06, w * 0.5, 0.12)
      }
  }

  // the arched hood over the door on the chamfer: a half round of marble 0.45m out
  function hood(f: Frame, a: number, y: number) {
    const [r0, r1, d, n] = [1.15, 1.6, 0.45, 10]
    const p = (r: number, t: number, dd: number) =>
      at3(f, a + Math.cos(t) * r, y + Math.sin(t) * r, dd)
    const o = out3(f)
    for (let i = 0; i < n; i++) {
      const [t0, t1] = [(Math.PI * i) / n, (Math.PI * (i + 1)) / n]
      add('marble', polygon([p(r0, t0, d), p(r1, t0, d), p(r1, t1, d), p(r0, t1, d)], o))
      const m = (t0 + t1) / 2
      const radial: V3 = [Math.cos(m) * f.along.x, Math.sin(m), Math.cos(m) * f.along.z]
      add('marble', polygon([p(r1, t0, 0), p(r1, t1, 0), p(r1, t1, d), p(r1, t0, d)], radial))
      const inward: V3 = [-radial[0], -radial[1], -radial[2]]
      add('marble', polygon([p(r0, t0, 0), p(r0, t1, 0), p(r0, t1, d), p(r0, t0, d)], inward))
    }
    for (const t of [0, Math.PI])
      add('marble', polygon([p(r0, t, 0), p(r1, t, 0), p(r1, t, d), p(r0, t, d)], [0, -1, 0]))
  }

  // bands round the outside: the base's entablature (all round), the band the shaft stands on
  // (the wings), the cornice at the top (the wings' outside, ending at the court) and the
  // coping on the base across the court
  const ring = (
    part: Part,
    line: Point[],
    closed: boolean,
    y0: number,
    y1: number,
    d: number,
    lip = 0,
  ) => {
    const outer = offset(line, d, closed)
    const inner = offset(line, -lip, closed)
    const n = closed ? line.length : line.length - 1
    for (let i = 0; i < n; i++) {
      const [p, q] = [outer[i]!, outer[(i + 1) % line.length]!]
      const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
      add(part, wallQuad(p, q, y0, y1, { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }))
      const cell = [line[i]!, line[(i + 1) % line.length]!, q, p]
      lid(part, cell, y0, false)
      const top = [inner[i]!, inner[(i + 1) % line.length]!, q, p]
      lid(part, top, y1)
    }
    if (closed) return
    // the ends, where it stops at the court
    const ends: [Point, Point, Point][] = [
      [line[0]!, outer[0]!, flip(frame(line[0]!, line[1]!).along)],
      [line.at(-1)!, outer.at(-1)!, frame(line.at(-2)!, line.at(-1)!).along],
    ]
    for (const [p, q, o] of ends) add(part, wallQuad(p, q, y0, y1, o))
  }
  const all = [apexN, chamW, chamE, eS, bN, bS, plazaSE, apexS]
  const wings = [bS, plazaSE, apexS, apexN, chamW, chamE, eS]
  for (const [y0, y1, d] of ENTABLATURE) ring('marble', all, true, y0, y1, d)
  ring('terra', wings, false, BAND[0]!, BAND[1]!, 0.12)
  ring('terra', [bN, bS], false, BASE_TOP - 0.3, BASE_TOP, 0.12, PARAPET)
  for (const [y0, y1, d] of CORNICE) ring('terra', wings, false, y0, y1, d)
  ring('dark', wings, false, LIP.y, TOP, LIP.out, PARAPET)
  // the corbels holding the crown up: a sloped foot out to the front, a corbel every meter
  {
    const [y0, y1] = [CORNICE[1]![0], CORNICE[1]![1]]
    const d0 = CORNICE[1]![2]
    const { width: w, out: d1, foot } = CORBEL
    for (const [f] of shaftSides) {
      const n = Math.floor(f.len / CORBEL.every)
      const start = (f.len - (n - 1) * CORBEL.every) / 2
      for (let i = 0; i < n; i++) {
        const a = start + i * CORBEL.every
        const [l, r] = [a - w / 2, a + w / 2]
        add('terra', wallQuad(f.at(l, d1), f.at(r, d1), y0 + foot, y1, f.out, l))
        const down: V3 = [f.out.x, -1.6, f.out.z]
        add(
          'terra',
          polygon(
            [
              at3(f, l, y0, d0),
              at3(f, r, y0, d0),
              at3(f, r, y0 + foot, d1),
              at3(f, l, y0 + foot, d1),
            ],
            down,
          ),
        )
        for (const [e, o] of [
          [l, flip(f.along)],
          [r, f.along],
        ] as const)
          add(
            'terra',
            polygon(
              [at3(f, e, y0, d0), at3(f, e, y0 + foot, d1), at3(f, e, y1, d1), at3(f, e, y1, d0)],
              [o.x, 0, o.z],
            ),
          )
      }
    }
  }
  // the parapet's inside and the roof
  const inside = offset(wings, -PARAPET, false)
  for (let i = 0; i + 1 < inside.length; i++) {
    const [p, q] = [inside[i]!, inside[i + 1]!]
    const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
    add('terra', wallQuad(p, q, ROOF, TOP, { x: -(q.z - p.z) / l, z: (q.x - p.x) / l }))
  }
  const roof = [apexN, chamW, chamE, eS, backN, backS, bS, plazaSE, apexS]
  lid('dark', roof, ROOF)

  // the court: plain brick walls with a window to each floor every few meters, from its floor
  // to just over the roof, dark glass up the back (2013 photo). the base's roof and its
  // parapet across the front, a step down to the court's floor
  const courtWalls: [Frame, number][] = [
    [frame(eS, backN), 13],
    [frame(backN, backS), 0],
    [frame(backS, bS), 8],
  ]
  for (const [f, count] of courtWalls) {
    const cols =
      count > 0
        ? Array.from({ length: count }, (_, i) => {
            const pier = (f.len - 3 - count * COURT_WIN) / Math.max(1, count - 1)
            const a = 1.5 + i * (COURT_WIN + pier)
            return [a, a + COURT_WIN]
          })
        : [[1.4, f.len - 1.4]]
    const holes: Hole[] =
      count > 0
        ? cols.flatMap(([a0, a1]) =>
            Array.from({ length: FLOORS }, (_, k): Hole => {
              const y = SHAFT + k * FLOOR
              return [a0!, a1!, y + SPANDREL, y + FLOOR]
            }),
          )
        : [[cols[0]![0]!, cols[0]![1]!, SHAFT, HEAD]]
    solid(f, COURT_FLOOR, COURT_TOP, holes, 'brick')
    // flat here, you only see these from up high
    for (const [a0, a1, y0, y1] of holes) {
      if (count > 0) pane('glass', f, a0, a1, y0, y1, -0.02)
      else
        for (let k = 0; k < FLOORS; k++) {
          const y = SHAFT + k * FLOOR
          pane('store', f, a0, a1, y, y + FLOOR, -0.02)
        }
    }
  }
  // the court walls' coping, out over the roof
  const courtLine = [eS, backN, backS, bS]
  const coping = offset(courtLine, -0.3, false)
  for (let i = 0; i + 1 < courtLine.length; i++)
    lid('terra', [courtLine[i]!, courtLine[i + 1]!, coping[i + 1]!, coping[i]!], COURT_TOP)
  for (let i = 0; i + 1 < coping.length; i++) {
    const [p, q] = [coping[i]!, coping[i + 1]!]
    const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
    add('brick', wallQuad(p, q, ROOF, COURT_TOP, { x: -(q.z - p.z) / l, z: (q.x - p.x) / l }))
  }
  // the base's roof across the front of the court and the step down behind it
  {
    const back0 = front.at(0, -BASE_DEPTH)
    const n = meet(back0, front.along, eS, frame(eS, backN).along)
    const s = meet(back0, front.along, backS, frame(backS, bS).along)
    const parapet = [front.at(0, -PARAPET), front.at(front.len, -PARAPET)]
    lid('dark', [eS, bN, bS, s, n], BASE_ROOF)
    add('brick', wallQuad(parapet[0]!, parapet[1]!, BASE_ROOF, BASE_TOP, flip(front.out)))
    lid('dark', [n, s, backS, backN], COURT_FLOOR)
    add('brick', wallQuad(n, s, COURT_FLOOR, BASE_ROOF, flip(front.out)))
  }

  // the penthouse and the machine room on it, the same brick
  for (const [c, y0, y1] of [
    [PENTHOUSE.points, ROOF, PENTHOUSE.top],
    [MACHINE.points, PENTHOUSE.top, MACHINE.top],
  ] as const) {
    const ps = c.map(pt)
    const mx = ps.reduce((s, p) => s + p.x, 0) / ps.length
    const mz = ps.reduce((s, p) => s + p.z, 0) / ps.length
    ps.forEach((p, i) => {
      const q = ps[(i + 1) % ps.length]!
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = flip(o)
      add('brick', wallQuad(p, q, y0, y1, o))
    })
    lid('dark', ps, y1)
  }

  // a box just inside the walls, only so the sun doesn't come in one window and out another:
  // the glass doesn't cast shadows and the building's empty
  {
    const core = offset([...roof].reverse(), 0.7, true)
    core.forEach((p, i) => {
      const q = core[(i + 1) % core.length]!
      const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
      add('dark', wallQuad(p, q, 0, ROOF, { x: -(q.z - p.z) / l, z: (q.x - p.x) / l }))
    })
  }

  // the rotunda on the apex
  rotunda(sides, ground, add, lid)

  // "HURT BUILDING" on a red plate on the marble by the rotunda
  {
    const at = apex.at(apex.len - 1.4, 0.03)
    const rot = Math.atan2(apex.out.x, apex.out.z)
    const y = ground(at) + 2.4
    signs.push({ ...at, y, rot, text: '', width: 0.85, height: 1.15, plate: '#b3262b' })
    const t = apex.at(apex.len - 1.4, 0.05)
    signs.push({
      ...t,
      y: y + 0.25,
      rot,
      text: 'HURT\nBUILDING',
      letters: true,
      size: 0.11,
      color: '#ffffff',
      weight: 700,
    })
  }

  return {
    parts: merged(),
    // nobody goes in, it has no inside
    inside: { solid: [], glass: [] },
    signs,
    noShadow: ['glass', 'store'],
  }
}

// the rotunda: tall windows between seven columns on pedestals, under an entablature, a
// cornice and a balustrade. its circle's middle is out in front of the apex and it runs round
// the outside till it meets the apex again
function rotunda(
  sides: ReturnType<typeof hurtSides>,
  ground: (p: Point) => number,
  add: (part: Part, geo: THREE.BufferGeometry) => void,
  lid: (part: Part, c: Point[], y: number, up?: boolean) => void,
) {
  const { apex, rotunda: c } = sides
  const R = ROTUNDA
  const g = ground(c) - 0.3
  // how far the middle is out from the apex, and the way back to it
  const out = apex.dOf(c)
  const home = Math.atan2(-apex.out.z, -apex.out.x)
  const open = (r: number) => Math.acos(Math.min(1, out / r))
  // the arc of a circle r round that's outside the building
  const arc = (r: number, n: number) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = home + open(r) + ((2 * Math.PI - 2 * open(r)) * i) / n
      return { x: c.x + Math.cos(t) * r, z: c.z + Math.sin(t) * r, t }
    })
  const round = (t: number, r: number) => ({ x: c.x + Math.cos(t) * r, z: c.z + Math.sin(t) * r })
  const wallsOf = (part: Part, r: number, y0: number, y1: number, n: number, inward = false) => {
    const ps = arc(r, n)
    for (let i = 0; i < n; i++) {
      const [p, q] = [ps[i]!, ps[i + 1]!]
      const m = (p.t + q.t) / 2
      const s = inward ? -1 : 1
      add(part, wallQuad(p, q, y0, y1, { x: Math.cos(m) * s, z: Math.sin(m) * s }))
    }
  }
  // a flat ring from r0 to r1, ending where each meets the apex
  const annulus = (part: Part, r0: number, r1: number, y: number, up: boolean) =>
    lid(part, [...arc(r1, 24), ...arc(r0, 24).reverse()], y, up)
  // a square post round point p, s across, its sides facing round the middle
  const post = (part: Part, p: Point, t: number, s: number, y0: number, y1: number) => {
    const r = { x: Math.cos(t), z: Math.sin(t) }
    const along = { x: -r.z, z: r.x }
    const k = (u: number, v: number) => ({
      x: p.x + along.x * u * s + r.x * v * s,
      z: p.z + along.z * u * s + r.z * v * s,
    })
    const ring = [k(-0.5, -0.5), k(0.5, -0.5), k(0.5, 0.5), k(-0.5, 0.5)]
    const outs = [flip(r), along, r, flip(along)]
    ring.forEach((a, i) => add(part, wallQuad(a, ring[(i + 1) % 4]!, y0, y1, outs[i]!)))
    lid(part, ring, y1)
  }

  // the drum: tall windows between the columns (a door's height, a transom, then glass up to
  // under the capitals), a strip of marble behind each column. a ring inside for the shadows
  const N = 42
  const drum = arc(R.wall, N)
  wallsOf('dark', R.core, g, R.roof, N)
  for (let i = 0; i < N; i++) {
    const [p, q] = [drum[i]!, drum[i + 1]!]
    const m = (p.t + q.t) / 2
    const o = { x: Math.cos(m), z: Math.sin(m) }
    const glazed = i % 6 !== 0 && i % 6 !== 5
    if (glazed) {
      add('marble', wallQuad(p, q, g, g + 0.3, o))
      add('store', glassQuad(p, q, g + 0.3, g + 3.4, o))
      add('dark', wallQuad(p, q, g + 3.4, g + 3.7, o))
      add('store', glassQuad(p, q, g + 3.7, R.capital[0] - 0.9, o))
      add('marble', wallQuad(p, q, R.capital[0] - 0.9, R.capital[1], o))
    } else add('marble', wallQuad(p, q, g, R.capital[1], o))
  }
  // the columns: a pedestal, a round shaft, a capital
  for (let i = 0; i <= N; i += 6) {
    const t = drum[i]!.t
    const col = round(t, R.columns)
    post('marble', col, t, R.pedestal, g, g + 1.1)
    const shaft = Array.from({ length: 10 }, (_, k) => {
      const u = (k / 10) * Math.PI * 2
      return { x: col.x + Math.cos(u) * R.column, z: col.z + Math.sin(u) * R.column, u }
    })
    shaft.forEach((p, k) => {
      const q = shaft[(k + 1) % 10]!
      const m = p.u + Math.PI / 10
      add('marble', wallQuad(p, q, g + 1.1, R.capital[0], { x: Math.cos(m), z: Math.sin(m) }))
    })
    const cap = Array.from({ length: 8 }, (_, k) => {
      const u = (k / 8) * Math.PI * 2 + Math.PI / 8
      return { x: col.x + Math.cos(u) * 0.6, z: col.z + Math.sin(u) * 0.6, u }
    })
    cap.forEach((p, k) => {
      const q = cap[(k + 1) % 8]!
      const m = p.u + Math.PI / 8
      add('terra', wallQuad(p, q, R.capital[0], R.capital[1], { x: Math.cos(m), z: Math.sin(m) }))
    })
    lid('terra', cap, R.capital[0], false)
  }
  // the entablature and the cornice
  wallsOf('marble', R.frieze, R.capital[1], R.friezeTop, N)
  annulus('marble', R.wall, R.frieze, R.capital[1], false)
  wallsOf('marble', R.cornice, R.friezeTop, R.corniceTop, N)
  annulus('marble', R.frieze, R.cornice, R.friezeTop, false)
  annulus('marble', R.balustrade, R.cornice, R.corniceTop, true)
  // the balustrade: a plinth, balusters, a post over each column, the rail
  const inner = R.balustrade - 0.3
  wallsOf('marble', R.balustrade, R.corniceTop, R.plinth, N)
  annulus('marble', inner, R.balustrade, R.plinth, true)
  wallsOf('marble', R.balustrade, R.rail, R.top, N)
  wallsOf('marble', inner, R.rail, R.top, N, true)
  annulus('marble', inner, R.balustrade, R.top, true)
  annulus('marble', inner, R.balustrade, R.rail, false)
  const mid = R.balustrade - 0.15
  const span = 2 * Math.PI - 2 * open(mid)
  const count = Math.floor((span * mid) / 0.33)
  for (let i = 1; i < count; i++) {
    const t = home + open(mid) + (span * i) / count
    post('marble', round(t, mid), t, 0.14, R.plinth, R.rail)
  }
  for (let i = 0; i <= N; i += 6) {
    const t = drum[i]!.t
    post('marble', round(t, mid), t, 0.45, R.plinth, R.rail)
  }
  lid('dark', arc(inner, N), R.roof)
}
