import { fenceDistance } from '@quad/shared'
import campus from '../campus/campus.json'
import { CAR_KINDS, type Car } from './cars'
import { closestOnSegment, pointInPolygon, type Point } from './collision'
import { DECKS, deckFrame, deckObstacles, TIER, type DeckData } from '../campus/parkingDecks'
import {
  COLUMNS,
  DOCK,
  LEVELS,
  parkingFrame,
  STAIR,
  type ParkingData,
} from '../campus/loftsParking'
import { signalJunctions, signalPoles } from './signals'
import { streetLights } from './streetFurniture'
import { surfaceAt } from './surface'
import { fromElevation, heightAt } from './terrain'

// every parked car: along the curbs, in the surface lots and in gsu's decks. where they are
// comes from esri's satellite image of feb 2 2026 (a monday, late morning): which curbs have
// cars along them, how full each lot and deck roof was. docs/traffic.md

// the same "random" numbers on every computer
export function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// a kind of car by how common it is downtown: sedans, compacts, suvs, a few pickups and vans
const MIX = [0.3, 0.2, 0.32, 0.07, 0.11]
export function pickKind(r: number) {
  let k = 0
  while (k < MIX.length - 1 && r > MIX[k]!) r -= MIX[k++]!
  return k
}

// the four corners of a car seen from above, front left first
export function corners(c: { x: number; z: number; heading: number; kind: number }, grow = 0) {
  const { length, width } = CAR_KINDS[c.kind]!
  const [fx, fz] = [Math.sin(c.heading), Math.cos(c.heading)]
  const [hl, hw] = [length / 2 + grow, width / 2 + grow]
  // right of the way it faces (x east, z south)
  const [rx, rz] = [-fz, fx]
  return [
    { x: c.x + fx * hl - rx * hw, z: c.z + fz * hl - rz * hw },
    { x: c.x + fx * hl + rx * hw, z: c.z + fz * hl + rz * hw },
    { x: c.x - fx * hl + rx * hw, z: c.z - fz * hl + rz * hw },
    { x: c.x - fx * hl - rx * hw, z: c.z - fz * hl - rz * hw },
  ]
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point) {
  const den = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x)
  if (den === 0) return false
  const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / den
  const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / den
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/** how close a line gets to a box (four corners), 0 if it goes through it */
export function lineToBox(line: Point[], box: Point[]) {
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1]!, line[i]!]
    for (let k = 0; k < 4; k++) {
      const [c, d] = [box[k]!, box[(k + 1) % 4]!]
      if (segmentsCross(a, b, c, d)) return 0
      const p = closestOnSegment(c, a, b)
      best = Math.min(best, Math.hypot(p.x - c.x, p.z - c.z))
      for (const e of [a, b]) {
        const q = closestOnSegment(e, c, d)
        best = Math.min(best, Math.hypot(q.x - e.x, q.z - e.z))
      }
    }
  }
  if (line.length && pointInPolygon(line[0]!, box)) return 0
  return best
}

/** do two boxes (four corners each) overlap */
export function boxesTouch(a: Point[], b: Point[]) {
  // separating axis: the sides of both
  for (const box of [a, b])
    for (let i = 0; i < 4; i++) {
      const [p, q] = [box[i]!, box[(i + 1) % 4]!]
      const [nx, nz] = [-(q.z - p.z), q.x - p.x]
      const proj = (c: Point[]) => c.map((v) => v.x * nx + v.z * nz)
      const [pa, pb] = [proj(a), proj(b)]
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false
    }
  return true
}

// lines with a box round them, so most can be skipped without looking at every point
type Line = {
  width: number
  points: Point[]
  bridge?: boolean
  oneway?: boolean
  box: [number, number, number, number]
}
const lines = (ls: { width: number; points: number[][]; bridge?: boolean; oneway?: boolean }[]) =>
  ls.map((l): Line => {
    const points = l.points.map(([x, z]) => ({ x: x!, z: z! }))
    const xs = points.map((p) => p.x)
    const zs = points.map((p) => p.z)
    const box: Line['box'] = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]
    return { width: l.width, points, bridge: l.bridge, oneway: l.oneway, box }
  })
const roads = lines(campus.roads)
const paths = lines(campus.paths)
const crossings = lines(campus.crossings)
// is a line's box within m of a spot
export const near = (l: { box: number[] }, p: Point, m: number) =>
  p.x > l.box[0]! - m && p.z > l.box[1]! - m && p.x < l.box[2]! + m && p.z < l.box[3]! + m

function nearestOn(p: Point, line: Point[]) {
  let best = { d: Infinity, at: p, dir: { x: 1, z: 0 } }
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1]!, line[i]!]
    const c = closestOnSegment(p, a, b)
    const d = Math.hypot(c.x - p.x, c.z - p.z)
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1
    if (d < best.d) best = { d, at: c, dir: { x: (b.x - a.x) / l, z: (b.z - a.z) / l } }
  }
  return best
}

// the curbs with cars along them (satellite feb 2026, checked against 2022 where 2026 is in
// shadow): two points along the curb in game coords, and about how many of the spaces had a
// car in them
const CURBS: { from: [number, number]; to: [number, number]; full: number }[] = [
  // gilmer st, both blocks between courtland st and jesse hill jr dr, north east side
  { from: [18, 79], to: [104, 154], full: 0.9 },
  { from: [149, 196], to: [202, 242], full: 0.9 },
  // pryor st, both sides between wall st and the bridge
  { from: [-382, 117], to: [-424, 176], full: 0.7 },
  { from: [-391, 110], to: [-432, 168], full: 0.7 },
  // wall st along the lot
  { from: [-372, 108], to: [-292, 173], full: 0.9 },
  // coca-cola pl
  { from: [345, -3], to: [388, 35], full: 0.8 },
  // mlk jr dr and washington st by the capitol end
  { from: [-193, 525], to: [-252, 485], full: 0.8 },
  { from: [-313, 494], to: [-333, 524], full: 0.9 },
  // courtland st along hurt park, and edgewood ave in front of it (not across the end of the
  // park's middle path)
  { from: [62, 10], to: [20, 60], full: 0.5 },
  { from: [-25, -27], to: [-5, -27], full: 0.5 },
  { from: [7, -27], to: [42, -27], full: 0.5 },
  // jesse hill jr dr north of edgewood ave, both sides, and its block south of coca-cola pl
  { from: [467, -100], to: [467, -46], full: 0.6 },
  { from: [479, -100], to: [479, -46], full: 0.35 },
  { from: [390, 70], to: [330, 136], full: 0.3 },
  // decatur st east of jesse hill jr dr (empty on the 2026 image, half full in 2022)
  { from: [110, 388], to: [155, 428], full: 0.25 },
  // auburn ave east of courtland st, both sides
  { from: [120, -156], to: [290, -156], full: 0.15 },
  { from: [120, -145], to: [290, -145], full: 0.15 },
]
// a parallel parking space, bumper to bumper
const SPACE = 6.4
// clear of crosswalks and the lights
const CROSSWALK = 6
const SIGNAL = 9

// streets have to be clear of these, and so do lots
const trees = campus.trees.map(([x, z]) => ({ x: x!, z: z! }))

let curbs: Car[] | null = null
/** the cars parked along the curbs */
export function curbCars(): Car[] {
  if (curbs) return curbs
  const rand = seeded(1871)
  const signals = signalJunctions()
  const drivable = roads.filter((r) => r.width >= 7)
  curbs = []
  for (const { from, to, full } of CURBS) {
    const [ax, az] = from
    const [bx, bz] = to
    const length = Math.hypot(bx - ax, bz - az)
    const n = Math.floor(length / SPACE)
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const p = { x: ax + (bx - ax) * t, z: az + (bz - az) * t }
      // the street it's on, and which side of it
      let road = drivable[0]!
      let on = nearestOn(p, road.points)
      for (const r of drivable) {
        if (!near(r, p, on.d)) continue
        const m = nearestOn(p, r.points)
        if (m.d < on.d) [road, on] = [r, m]
      }
      const keep = rand() < full
      const kind = pickKind(rand())
      const paint = Math.floor(rand() * 1e9)
      const nudge = (rand() - 0.5) * 0.6
      if (!keep || road.bridge || on.d > road.width) continue
      const side = (p.x - on.at.x) * -on.dir.z + (p.z - on.at.z) * on.dir.x > 0 ? 1 : -1
      const { width } = CAR_KINDS[kind]!
      const out = road.width / 2 - 0.3 - width / 2
      const x = on.at.x - on.dir.z * side * out + on.dir.x * nudge
      const z = on.at.z + on.dir.x * side * out + on.dir.z * nudge
      // they face the way the traffic on their side goes
      const back = side < 0 && !road.oneway
      const heading = Math.atan2(on.dir.x, on.dir.z) + (back ? Math.PI : 0)
      const car = { x, y: 0, z, heading, pitch: 0, kind, paint }
      if (!curbClear(car, road, signals)) continue
      car.y = surfaceAt(x, z)
      curbs.push(car)
    }
  }
  return curbs
}

function curbClear(car: Car, road: Line, signals: { x: number; z: number }[]) {
  const box = corners(car)
  const { length } = CAR_KINDS[car.kind]!
  if (fenceDistance(car.x, car.z) < -230) return false
  if (signals.some((s) => Math.hypot(s.x - car.x, s.z - car.z) < SIGNAL + 7 + length / 2))
    return false
  const reach = length / 2 + CROSSWALK
  if (crossings.some((c) => near(c, car, reach) && lineToBox(c.points, box) < CROSSWALK))
    return false
  if (paths.some((p) => near(p, car, reach) && lineToBox(p.points, box) < p.width / 2)) return false
  if (trees.some((t) => Math.hypot(t.x - car.x, t.z - car.z) < reach && lineToBox([t, t], box) < 1))
    return false
  // clear of the streets and drives that cross it
  const dir = { x: Math.sin(car.heading), z: Math.cos(car.heading) }
  for (const r of roads) {
    if (r === road || !near(r, car, r.width / 2 + length / 2 + 4)) continue
    const m = nearestOn(car, r.points)
    if (m.d > r.width / 2 + length / 2 + 4) continue
    if (Math.abs(m.dir.x * dir.x + m.dir.z * dir.z) > 0.85 && m.d < r.width) continue
    return false
  }
  return true
}

// a 90 degree space: how wide, how deep, and how far a car's middle is in from its back
const STALL = 2.7
const DEEP = 5.5

type Stall = { x: number; z: number; heading: number; y: number; pitch?: number }

// cars in spaces along a row: n spaces from p0 to p1 (game coords), their backs on that line,
// going in toward `inward` (unit), nose first mostly. `full` how many have a car
function row(
  p0: Point,
  p1: Point,
  inward: Point,
  y: (p: Point) => number | null,
  full: number,
  rand: () => number,
  out: (Stall & { kind: number; paint: number })[],
) {
  const len = Math.hypot(p1.x - p0.x, p1.z - p0.z)
  const n = Math.floor(len / STALL)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const keep = rand() < full
    const kind = pickKind(rand())
    const paint = Math.floor(rand() * 1e9)
    const [side, depth, turn] = [(rand() - 0.5) * 0.3, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.06]
    // a few backed in
    const back = rand() < 0.2
    if (!keep) continue
    const { length } = CAR_KINDS[kind]!
    // lined up at the aisle end, but a pickup is longer than the space: keep its end off the
    // wall behind (they stuck out through the decks' walls)
    const into = Math.max(DEEP - length / 2 - 0.3 + depth, length / 2 + 0.35)
    const along = { x: (p1.x - p0.x) / len, z: (p1.z - p0.z) / len }
    const x = p0.x + (p1.x - p0.x) * t + inward.x * into + along.x * side
    const z = p0.z + (p1.z - p0.z) * t + inward.z * into + along.z * side
    const h = y({ x, z })
    if (h === null) continue
    const heading = Math.atan2(-inward.x, -inward.z) + (back ? Math.PI : 0) + turn
    out.push({ x, z, y: h, heading, kind, paint })
  }
}

// how full a deck's levels were: the roof from the satellite (feb 2026, late morning), the
// covered levels a guess (fuller down low, where people park first)
const levelFull = (k: number, top: number, roof: number) =>
  k >= top ? roof : 0.75 - (0.4 * k) / Math.max(1, top - 1)

// gsu's decks, as rows of spaces on their floors (campus/parkingDecks.ts has the floors).
// g deck's roof was empty and its covered floors aren't drawn (dark screens), so it has none
const ROOFS: Record<string, number> = {
  'N Deck': 0.1,
  'K Deck': 0.04,
  'S Deck': 0.05,
  'M Deck': 0.05,
}

function deckCars(rand: () => number) {
  const out: (Stall & { kind: number; paint: number })[] = []
  for (const b of campus.buildings as DeckData[]) {
    const d = b.name ? DECKS[b.name] : undefined
    const roof = b.name ? ROOFS[b.name] : undefined
    if (!d || roof === undefined) continue
    const f = deckFrame(b)
    const A = f.dir(1, 0)
    const inward = (s: number) => ({ x: A[0] * s, z: A[2] * s })
    const P = (a: number, w: number) => f.at(a, w)
    // on a floor over the ground, or the lowest one where it runs on it
    const onFloor = (elevation: number) => (p: Point) => {
      const y = fromElevation(elevation)
      const g = heightAt(p.x, p.z)
      return y < g - 0.3 ? null : Math.max(y, g + 0.05)
    }
    if (d.style === 'steel') {
      const bay = f.lw / d.bays
      for (const h of d.halves)
        for (let k = h.tiers[0]; k <= h.tiers[1]; k++)
          // a bay at a time between the columns, not the end ones where cars turn across
          for (let i = 1; i < d.bays - 1; i++) {
            const [w0, w1] = [i * bay + 0.3, (i + 1) * bay - 0.3]
            const mid = (w0 + w1) / 2
            if (k === h.tiers[1] && h.top && (mid < h.top[0] || mid > h.top[1])) continue
            const top =
              k === h.tiers[1] ||
              (k === h.tiers[1] - 1 && !!h.top && (mid < h.top[0] || mid > h.top[1]))
            const full = levelFull(top ? 9 : k - h.tiers[0], top ? 9 : 8, roof)
            const elevation = h.floor + TIER * k + (h.rise * mid) / f.lw
            for (const [a, s] of [
              [h.a[0] + 0.3, 1],
              [h.a[1] - 0.3, -1],
            ] as const)
              row(P(a, w0), P(a, w1), inward(s), onFloor(elevation), full, rand, out)
          }
    } else if (d.style === 'painted') {
      const [first, step, count] = d.floors
      const bays = Math.round(f.lw / d.bay)
      const bay = f.lw / bays
      const [r0, r1] = d.ramp.w
      const middle = d.ramp.a[0] / 2
      for (let i = 1; i <= count; i++)
        for (let j = 1; j < bays - 1; j++) {
          const [w0, w1] = [j * bay + 0.35, (j + 1) * bay - 0.35]
          const mid = (w0 + w1) / 2
          const flat = first + (i - 1) * step
          const ramp = flat - step * (1 - Math.min(Math.max((mid - r0) / (r1 - r0), 0), 1))
          const full = levelFull(i - 1, count - 1, roof)
          for (const [a, s, e] of [
            [0.4, 1, flat],
            [middle - 0.3, -1, flat],
            [middle + 0.3, 1, flat],
            [d.ramp.a[0] - 0.3, -1, flat],
            [d.ramp.a[0] + 0.3, 1, ramp],
            [f.la - 0.4, -1, ramp],
          ] as const)
            row(P(a, w0), P(a, w1), inward(s), onFloor(e), full, rand, out)
        }
    }
  }
  return out
}

// the lofts' deck: the ground floor, two levels and the roof (16 cars on it in feb 2026), on
// its 8.7m column grid, rows of spaces backing onto the lines of columns
function loftsCars(rand: () => number) {
  const out: (Stall & { kind: number; paint: number })[] = []
  const b = campus.buildings.find((b) => b.name === 'University Lofts Parking') as ParkingData
  if (!b) return out
  const { S, si } = parkingFrame(b)
  const base = fromElevation(304.3)
  const levels = [0.12, ...LEVELS]
  const fills = [0.6, 0.5, 0.35, 0.15]
  levels.forEach((level, k) => {
    for (let j = 0; j < COLUMNS.a.length - 1; j++) {
      const [a0, a1] = [COLUMNS.a[j]! + 0.35, COLUMNS.a[j + 1]! - 0.35]
      COLUMNS.b.forEach((c, i) => {
        // the rows each side of the line of columns (only the inside one along the outside)
        for (const s of [1, -1]) {
          if ((i === 0 && s < 0) || (i === COLUMNS.b.length - 1 && s > 0)) continue
          const line = c + s * 0.35
          const inward = { x: si.x * s, z: si.z * s }
          row(S(a0, line), S(a1, line), inward, () => base + level, fills[k]!, rand, out)
        }
      })
    }
  })
  return out.filter((c) => {
    const ab = parkingFrame(b).ab(c)
    // not in the stair's lobby, the dock's drive or the car doors on piedmont ave
    if (ab[0] > STAIR.a[0] - 3 && ab[1] < STAIR.b[1] + 3) return false
    if (ab[0] < DOCK.a[1] + 2) return false
    return pointInPolygon(
      c,
      b.points.map(([x, z]) => ({ x: x!, z: z! })),
    )
  })
}

// the surface lots (campus.json's and two osm doesn't have) and how full each was. the ones
// out of sight up north, the paved court (l26), the two building sites (l27, l28: a tower
// crane on the 2026 image) and the one built on (l30) have none. l6 is l2 again
const LOTS: Record<number, number> = {
  2: 0.4,
  7: 0.05,
  8: 0.2,
  10: 0.27,
  11: 0.18,
  13: 0.3,
  18: 0.2,
  19: 0.2,
  20: 0.2,
  21: 0.25,
  22: 0.1,
  23: 0.1,
  24: 0.1,
  25: 0.25,
  29: 0.2,
}
const MORE_LOTS: { points: number[][]; full: number }[] = [
  // l12's real lot (osm's outline has a yard and a demolished building in it)
  {
    points: [
      [-367, 344],
      [-290, 344],
      [-290, 415],
      [-367, 415],
    ],
    full: 0.4,
  },
  // by decatur st under wall st, 35 cars
  {
    points: [
      [-300, 72],
      [-250, 72],
      [-250, 130],
      [-300, 130],
    ],
    full: 0.45,
  },
  // off auburn ave behind the lofts' block, 17 cars
  {
    points: [
      [40, -210],
      [90, -210],
      [90, -175],
      [40, -175],
    ],
    full: 0.35,
  },
]

function lotCars(rand: () => number) {
  const out: (Stall & { kind: number; paint: number })[] = []
  const lots = [
    ...Object.entries(LOTS).map(([i, full]) => ({ points: campus.lots[Number(i)]!, full })),
    ...MORE_LOTS,
  ]
  for (const { points, full } of lots) {
    const poly = points.map(([x, z]) => ({ x: x!, z: z! }))
    // rows along its longest side
    let [a, b] = [poly[0]!, poly[1]!]
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length]!
      if (Math.hypot(q.x - p.x, q.z - p.z) > Math.hypot(b.x - a.x, b.z - a.z)) [a, b] = [p, q]
    })
    const l = Math.hypot(b.x - a.x, b.z - a.z)
    const u = { x: (b.x - a.x) / l, z: (b.z - a.z) / l }
    const v = { x: -u.z, z: u.x }
    const us = poly.map((p) => (p.x - a.x) * u.x + (p.z - a.z) * u.z)
    const vs = poly.map((p) => (p.x - a.x) * v.x + (p.z - a.z) * v.z)
    const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]
    const at = (s: number, t: number) => ({
      x: a.x + u.x * s + v.x * t,
      z: a.z + u.z * s + v.z * t,
    })
    // two rows back to back and an aisle, every 18m across
    for (let t = v0 + 0.5; t + DEEP < v1; t += 2 * DEEP + 7) {
      row(at(u0, t), at(u1, t), v, (p) => surfaceAt(p.x, p.z), full, rand, out)
      const back = t + 2 * DEEP + 7 - 0.2
      if (back < v1)
        row(
          at(u0, back),
          at(u1, back),
          { x: -v.x, z: -v.z },
          (p) => surfaceAt(p.x, p.z),
          full,
          rand,
          out,
        )
    }
    // only the ones all the way in the lot
    for (let i = out.length - 1; i >= 0; i--) {
      const c = out[i]!
      if ((c as { lot?: boolean }).lot) continue
      ;(c as { lot?: boolean }).lot = true
      if (!corners(c, 0.2).every((q) => pointInPolygon(q, poly))) out.splice(i, 1)
    }
  }
  return out.map(({ x, y, z, heading, kind, paint }) => ({ x, y, z, heading, kind, paint }))
}

// g deck's toll plaza (game/raised.ts) is a lot too: cars along g's plaza side and the north
// east edge past the pergola, between g and the booth (gsu's 2018 photo from central ave has a
// row of them on the left past the bowls, the 2026 satellite a few by g, in its shadow). in
// g's frame: a meters out from its plaza side, w along it from the south west end
function tollCars(rand: () => number) {
  const out: (Stall & { kind: number; paint: number })[] = []
  const g = campus.buildings.find((b) => b.name === 'G Deck') as DeckData | undefined
  if (!g) return out
  const f = deckFrame(g)
  const P = (a: number, w: number) => f.at(a, w)
  const dir = (a: number, w: number) => {
    const d = f.dir(a, w)
    return { x: d[0], z: d[2] }
  }
  const y = (p: Point) => surfaceAt(p.x, p.z)
  // backs against g, a row facing it across the aisle and one behind that, short of the
  // booth's lanes; and along the north east edge from the pergola's end to g
  row(P(-0.3, 3.5), P(-0.3, 30), dir(-1, 0), y, 0.55, rand, out)
  row(P(-18.3, 3.5), P(-18.3, 30), dir(1, 0), y, 0.45, rand, out)
  row(P(-18.6, 3.5), P(-18.6, 30), dir(-1, 0), y, 0.45, rand, out)
  row(P(-16.5, 36), P(-7, 36), dir(0, -1), y, 0.7, rand, out)
  // clear of the booth, the planter, the bowls, the light poles, the canopy and pergola posts
  const stuff = deckObstacles(g).map((s) => [
    { x: s.ax, z: s.az },
    { x: s.bx, z: s.bz },
  ])
  return out.filter((c) => {
    const box = corners({ ...c }, 0.2)
    return stuff.every((line) => lineToBox(line, box) > 0)
  })
}

// what a parked car mustn't be on: buildings (but the deck it's in), lawns and park islands,
// paths and drives, trees, signal poles and street lights
const solid = campus.buildings.map((b) => ({
  name: b.name,
  minHeight: b.minHeight,
  ...lines([{ width: 0, points: b.points }])[0]!,
}))
const greens = lines([...campus.lawns, ...campus.parks].map((points) => ({ width: 0, points })))
const poles = [...signalPoles(), ...streetLights].map((p) => ({ x: p.x, z: p.z }))

function clear(c: Car, inside?: string, street = false) {
  const box = corners(c, 0.1)
  const { length } = CAR_KINDS[c.kind]!
  for (const b of solid) {
    if (b.minHeight || (inside && b.name === inside) || !near(b, c, length)) continue
    if (box.some((q) => pointInPolygon(q, b.points)) || pointInPolygon(b.points[0]!, box))
      return false
    if (lineToBox([...b.points, b.points[0]!], box) === 0) return false
  }
  for (const g of greens)
    if (near(g, c, length) && box.some((q) => pointInPolygon(q, g.points))) return false
  // (one at the curb is on its street, curbClear has seen to the rest)
  if (!inside && !street) {
    if (paths.some((p) => near(p, c, length) && lineToBox(p.points, box) < p.width / 2))
      return false
    if (roads.some((r) => near(r, c, length) && lineToBox(r.points, box) < r.width / 2))
      return false
  }
  if (trees.some((t) => Math.hypot(t.x - c.x, t.z - c.z) < length && lineToBox([t, t], box) < 1.2))
    return false
  if (poles.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < length && lineToBox([p, p], box) < 0.3))
    return false
  return true
}

// which deck a spot is in, if any
const decks = campus.buildings.filter(
  (b) => (b.name && DECKS[b.name]) || b.name === 'University Lofts Parking',
)
const deckAt = (p: Point) =>
  decks.find((d) =>
    pointInPolygon(
      p,
      d.points.map(([x, z]) => ({ x: x!, z: z! })),
    ),
  )?.name

let parked: Car[] | null = null
/** every parked car: along the curbs, in the lots and the decks (worked out once) */
export function parkedCars(): Car[] {
  if (parked) return parked
  const rand = seeded(2026)
  const found: Car[] = []
  // a 10m grid of them, to check they don't overlap
  const grid = new Map<string, Car[]>()
  const cell = (x: number, z: number) => `${Math.floor(x / 10)},${Math.floor(z / 10)}`
  const add = (c: Car, inside?: string, street = false) => {
    if (!clear(c, inside, street)) return
    const box = corners(c, 0.05)
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const o of grid.get(cell(c.x + i * 10, c.z + j * 10)) ?? [])
          if (Math.abs(o.y - c.y) < 1.5 && boxesTouch(box, corners(o, 0.05))) return
    const k = cell(c.x, c.z)
    grid.set(k, [...(grid.get(k) ?? []), c])
    found.push(c)
  }
  for (const c of [...deckCars(rand), ...loftsCars(rand)]) add({ ...c, pitch: 0 }, deckAt(c))
  for (const c of [...lotCars(rand), ...tollCars(rand)]) add({ ...c, pitch: 0 })
  for (const c of curbCars()) add(c, undefined, true)
  return (parked = found)
}
