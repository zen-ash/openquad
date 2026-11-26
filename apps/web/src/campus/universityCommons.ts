import type { Point } from '../game/collision'
import type { Sign } from './landmarks'
import {
  circle,
  clip,
  edges,
  flat,
  glassQuad,
  insideWalls,
  parts as collect,
  pt,
  wallQuad,
} from './landmark'

// university commons (141 piedmont ave, gsu housing since 2007, ~2000 students): four
// apartment buildings in a c round courtyards. 15 floors on the north west, 9 on the south
// west (a tall brick ground floor of shops on piedmont ave and j w dobbs ave), 12 on the north
// east and 8 on the south east, those two on a parking deck whose roof is the big courtyard
// (311.3m) and whose open floors face j w dobbs ave, jesse hill jr dr and the ellis st ramp.
// beige precast panels with white topped bays, small punched windows in white frames, a glass
// cylinder over the main doors on the piedmont / j w dobbs corner. from usgs's lidar (2018),
// gsu's photos (2019 the corner, 2020/2022 the courtyard, the deck on j w dobbs) and mapillary
// (2019-2022). sources: docs/reference/university-commons.md
//
// osm's one outline is all four. each wall belongs to the building its middle is in, split by
// the two cut lines below. heights over the corner's sidewalk (305.0m)

export type CommonsData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: object
}

// tan and light are the precast (light the top two floors and the roof's cornice), glass the
// windows, curtain the cylinder and the shop windows, brick the shops' ground floor, concrete the deck's spandrels and
// piers, the plinth and the roofs, dark the deck's open floors, metal the blue canopies
export type Part = 'tan' | 'light' | 'glass' | 'curtain' | 'brick' | 'concrete' | 'dark' | 'metal'

export type Tower = 'nw' | 'sw' | 'ne' | 'se'

// first is the first residential floor (the ground floor's taller, the east two start on the
// deck's roof), then floors of `floor` meters up to the roof (lidar: 352.65, 335.0, 346.8 and
// 335.0m)
export const TOWERS: Record<Tower, { first: number; floors: number; floor: number; roof: number }> =
  {
    nw: { first: 4.6, floors: 14, floor: 3, roof: 47.65 },
    sw: { first: 5, floors: 8, floor: 2.95, roof: 30 },
    ne: { first: 6.3, floors: 12, floor: 2.9, roof: 41.8 },
    se: { first: 6.3, floors: 8, floor: 2.85, roof: 30 },
  }
// west of x the two on piedmont ave, split by the gap between them; east of it the deck's two,
// split where the north east one's roof steps down (lidar)
export const CUT = { x: 379, west: -398, east: -416 }
// the deck's roof (the courtyard), its floors under it every 3.2m
export const DECK = 6.3
const LEVEL = 3.2
const SPANDREL = 1.05
// the glass cylinder: the outline's quarter circle, from the ground floor up past the roof
export const CYLINDER = { c: { x: 311.8, z: -358.2 }, r: 5.65, top: 33.5 }
// the stair and lift tops on the roofs (lidar), [x0, x1, z0, z1, from, top]
export const PENTHOUSES = [
  [365, 381, -438.5, -426.5, 41.8, 52.9],
  [312.5, 318, -434.5, -429.5, 47.65, 50.5],
  [370.5, 378.5, -425.5, -420, 47.65, 50.8],
  [406, 411.5, -431, -426.5, 41.8, 44.6],
  [370, 386.5, -382, -369.5, 30, 35.1],
]
// the terrace along j w dobbs ave: its wall from the corner end to the deck end, then back to
// the building
const TERRACE = [
  [335, -338.5],
  [377.8, -346.5],
  [377.8, -349],
  [335, -349],
]
// windows: one about every 2.8m of wall, 1.15 x 1.45m, 0.8m over the floor
const SPACING = 2.8
const WIDE = 1.15
const TALL = 1.45
const SILL = 0.8
const CORNICE = 0.35
// a concrete strip along the bottom of every wall: it's what goes on down to the low streets
const PLINTH = 0.4

export const towerOf = (p: Point): Tower =>
  p.x < CUT.x ? (p.z < CUT.west ? 'nw' : 'sw') : p.z < CUT.east ? 'ne' : 'se'

// the courtyards and the gap to piedmont ave: a wall facing into one isn't on a street
const COURTS = [
  [306, 378, -428, -364],
  [378, 451.5, -421, -378.5],
]
export const onCourt = (p: Point) =>
  COURTS.some(([x0, x1, z0, z1]) => p.x > x0! && p.x < x1! && p.z > z0! && p.z < z1!)

// each building's roof: osm's outline cut down to its corner. the order matters, the first cut
// has to leave one piece (the c's two west arms would be joined along the cut otherwise)
export function roofOf(outline: Point[], t: Tower) {
  const west = (p: Point) => CUT.x - p.x
  const east = (p: Point) => p.x - CUT.x
  if (t === 'nw')
    return clip(
      clip(outline, (p) => CUT.west - p.z),
      west,
    )
  if (t === 'sw')
    return clip(
      clip(outline, (p) => p.z - CUT.west),
      west,
    )
  if (t === 'ne') return clip(clip(outline, east), (p) => CUT.east - p.z)
  return clip(clip(outline, east), (p) => p.z - CUT.east)
}

// an outline edge split where it crosses a cut line
function pieces(p: Point, q: Point) {
  const ts = [0, 1]
  const cross = (a: number, b: number, v: number) => {
    if ((a - v) * (b - v) < 0) ts.push((v - a) / (b - a))
  }
  cross(p.x, q.x, CUT.x)
  cross(p.z, q.z, CUT.west)
  cross(p.z, q.z, CUT.east)
  ts.sort((a, b) => a - b)
  const at = (t: number) => ({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t })
  return ts.slice(1).map((t, i) => [at(ts[i]!), at(t)] as const)
}

export function windowColumns(len: number) {
  if (len < 2.2) return []
  const n = Math.max(1, Math.floor(len / SPACING))
  return Array.from({ length: n }, (_, i) => ((i + 0.5) * len) / n)
}

// where the light top starts: the top two floors' sills
export const lightFrom = (t: Tower) => {
  const { first, floors, floor } = TOWERS[t]
  return first + (floors - 2) * floor + SILL - 0.4
}

export function universityCommonsGeometry(b: CommonsData) {
  const { add, prism, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const { c, r } = CYLINDER
  const onCylinder = (m: Point) =>
    Math.hypot(m.x - c.x, m.z - c.z) < r + 0.3 && m.x < c.x && m.z > c.z

  for (const edge of edges(outline)) {
    for (const [p, q] of pieces(edge.p, edge.q)) {
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      if (len < 0.01) continue
      const o = edge.out
      const m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }
      const t = towerOf(m)
      const tower = TOWERS[t]
      const street = !onCourt({ x: m.x + o.x * 6, z: m.z + o.z * 6 })
      const deck = street && (t === 'ne' || t === 'se')
      // shops on piedmont ave, and on j w dobbs ave under the south west one
      const shops = street && !deck && (o.x < -0.7 || (t === 'sw' && o.z > 0.7) || onCylinder(m))
      const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
      const at = (u: number, d = 0) => ({
        x: p.x + dir.x * u + o.x * d,
        z: p.z + dir.z * u + o.z * d,
      })
      const wall = (part: Part, y0: number, y1: number, d = 0) =>
        y1 > y0 && add(part, wallQuad(at(0, d), at(len, d), y0, y1, o))

      // the deck's open floors: dark behind, the spandrels and piers standing out in front
      if (deck) {
        wall('dark', 0, DECK - 0.8)
        const bays = Math.max(1, Math.round(len / 9.6))
        const box = (u0: number, u1: number, y0: number, y1: number, depth: number) =>
          prism('concrete', [at(u0), at(u1), at(u1, depth), at(u0, depth)], y0, y1, false)
        if (len < 2.2) wall('concrete', 0, DECK)
        else {
          for (let k = 0; k <= bays; k++) {
            const u = Math.min(Math.max((k * len) / bays - 0.45, 0), len - 0.9)
            box(u, u + 0.9, 0, DECK, 0.45)
          }
          for (let y = DECK - LEVEL; y > -11; y -= LEVEL) box(0, len, y, y + SPANDREL, 0.3)
        }
        add('concrete', wallQuad(at(0, 0.3), at(len, 0.3), DECK - 0.8, DECK + 0.4, o))
        wall('tan', DECK + 0.4, lightFrom(t))
      } else {
        wall('concrete', 0, PLINTH)
        if (shops) {
          // the ground floor: brick with shop windows under blue canopies, a light band over it
          wall('brick', PLINTH, tower.first - 0.5)
          wall('light', tower.first - 0.5, tower.first)
          if (!onCylinder(m) && len > 3.5) {
            const n = Math.floor(len / 4.2)
            for (let i = 0; i < n; i++) {
              const u = ((i + 0.5) * len) / n
              add('curtain', glassQuad(at(u - 1.5, 0.02), at(u + 1.5, 0.02), 0.9, 3.9, o))
            }
            if (t === 'sw') {
              const y = Math.min(4.2, tower.first - 0.6)
              prism(
                'metal',
                [at(0.3), at(len - 0.3), at(len - 0.3, 1.5), at(0.3, 1.5)],
                y,
                y + 0.25,
              )
            }
          }
          if (onCylinder(m) && door && Math.hypot(door.x - m.x, door.z - m.z) < 0.5)
            add('curtain', glassQuad(at(0.4, 0.02), at(len - 0.4, 0.02), 0.4, 3.6, o))
          wall('tan', tower.first, onCylinder(m) ? CYLINDER.top : lightFrom(t))
        } else wall('tan', PLINTH, lightFrom(t))
      }
      if (!onCylinder(m)) wall('light', lightFrom(t), tower.roof)
      // a cornice capping each bay that stands out on the streets (not the narrow ones set back)
      if (street && len > 6 && !onCylinder(m))
        prism(
          'light',
          [at(0), at(len), at(len, CORNICE), at(0, CORNICE)],
          tower.roof - 0.7,
          tower.roof,
        )

      // the windows, flat on the wall: a floor below the first on the courtyards
      if (onCylinder(m)) continue
      const from = !street && t !== 'ne' && t !== 'se' ? -1 : 0
      for (let k = from; k < tower.floors; k++) {
        const y = tower.first + k * tower.floor + SILL
        for (const u of windowColumns(len))
          add('glass', glassQuad(at(u - WIDE / 2, 0.03), at(u + WIDE / 2, 0.03), y, y + TALL, o))
      }
    }
  }

  // roofs, and the walls where a taller building stands over a lower one
  for (const t of ['nw', 'sw', 'ne', 'se'] as const) {
    const roof = roofOf(outline, t)
    add('concrete', flat(roof, TOWERS[t].roof))
    for (const e of edges(roof)) {
      const onCut =
        (Math.abs(e.p.x - CUT.x) < 1e-6 && Math.abs(e.q.x - CUT.x) < 1e-6) ||
        (Math.abs(e.p.z - CUT.east) < 1e-6 && Math.abs(e.q.z - CUT.east) < 1e-6)
      if (!onCut || e.len < 0.01) continue
      const mid = { x: (e.p.x + e.q.x) / 2 + e.out.x, z: (e.p.z + e.q.z) / 2 + e.out.z }
      const below = TOWERS[towerOf(mid)].roof
      if (below < TOWERS[t].roof) add('light', wallQuad(e.p, e.q, below, TOWERS[t].roof, e.out))
    }
  }
  for (const [x0, x1, z0, z1, y0, y1] of PENTHOUSES)
    prism('tan', [pt([x0!, z0!]), pt([x1!, z0!]), pt([x1!, z1!]), pt([x0!, z1!])], y0!, y1!)

  // the glass cylinder: a true quarter circle round the outline's three facets, a pane a floor
  // from the ground floor's top up past the roof, the facets behind it in precast for the
  // shadows. a white band round the top and a lid
  const arc = circle(c, r, 48).slice(12, 25)
  const rows: number[] = []
  const band = CYLINDER.top - 1.1
  for (let y = TOWERS.sw.first; y < band - 0.5; y += TOWERS.sw.floor) rows.push(y)
  rows.push(band)
  for (let i = 1; i < arc.length; i++) {
    const [a, d] = [arc[i - 1]!, arc[i]!]
    const n = { x: (a.x + d.x) / 2 - c.x, z: (a.z + d.z) / 2 - c.z }
    const l = Math.hypot(n.x, n.z)
    const o = { x: n.x / l, z: n.z / l }
    for (let k = 1; k < rows.length; k++) add('curtain', glassQuad(a, d, rows[k - 1]!, rows[k]!, o))
    add('light', wallQuad(a, d, band, CYLINDER.top, o))
  }
  // the terrace in front of the shops on j w dobbs ave: level with the corner, the street falls
  // away from it, so a concrete wall along the sidewalk (mapillary 2019) that goes on down
  const [w0, w1] = [pt(TERRACE[0]!), pt(TERRACE[1]!)]
  const back = [pt(TERRACE[2]!), pt(TERRACE[3]!)]
  add('concrete', flat([w0, w1, ...back], 0.02))
  add('concrete', wallQuad(w0, w1, 0, 0.5, { x: 0.18, z: 0.98 }))
  add('concrete', wallQuad(w1, back[0]!, 0, 0.5, { x: 1, z: 0 }))
  add('concrete', wallQuad(w0, w1, 0.02, 0.5, { x: -0.18, z: -0.98 }))

  // the curved canopy over the doors, out 2.5m from the glass
  const brim = circle(c, r + 2.5, 48).slice(12, 25)
  const canopy = [...arc, ...brim.slice().reverse()]
  const y = TOWERS.sw.first - 0.6
  add('light', flat(canopy, y + 0.3))
  add('light', flat(canopy, y, false))
  for (let i = 1; i < brim.length; i++) {
    const [a, d] = [brim[i - 1]!, brim[i]!]
    const n = { x: (a.x + d.x) / 2 - c.x, z: (a.z + d.z) / 2 - c.z }
    const l = Math.hypot(n.x, n.z)
    add('metal', wallQuad(a, d, y, y + 0.3, { x: n.x / l, z: n.z / l }))
  }
  const sector = [c, ...arc]
  add('light', flat(sector, CYLINDER.top))
  add('light', wallQuad(c, arc[0]!, TOWERS.sw.roof, CYLINDER.top, { x: 1, z: 0 }))
  add('light', wallQuad(arc.at(-1)!, c, TOWERS.sw.roof, CYLINDER.top, { x: 0, z: -1 }))

  insideWalls(inside, outline, door, () => false)

  return {
    parts: merged(),
    inside,
    signs,
    noShadow: ['glass', 'curtain', 'metal'],
    near: ['metal'],
  }
}
