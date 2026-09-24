import type { Point } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import { clip, edges, flat, frame, parts as collect, pt, type Opening } from './landmark'

// dahlberg hall, the old municipal auditorium, drawn from photos of it. the marble front on
// courtland street is from 1943: a corner block with three huge windows and a row of small
// ones above, the entrance block with the canopy, then a lower wing. "a" is meters along
// the front from the gilmer street corner, "d" is meters out toward hurt park

export type DahlbergData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][] }
}

export type Part =
  'marble' | 'base' | 'bigGlass' | 'stripGlass' | 'glass' | 'canopy' | 'roof' | 'metal'

// everything past the entrance block is lower
export const WING = 14
const WING_FROM = 38.1
const ENTRANCE: [number, number] = [22.3, 38.1]
// the three big windows on each side of the corner, measured from the corner
export const BIG_WINDOWS: [number, number][] = [
  [5.6, 9.4],
  [10.8, 14.6],
  [16, 19.8],
]
const BIG_BOTTOM = 1
const BIG_TOP = 10.2
// the row of small windows above them
const SMALL: [number, number] = [12.3, 14.5]
const PLINTH = 0.9

// small windows in a row of n, centered on c
function row(c: number, n: number, width: number, gap: number): [number, number][] {
  const total = n * width + (n - 1) * gap
  return Array.from({ length: n }, (_, i) => {
    const a = c - total / 2 + i * (width + gap)
    return [a, a + width]
  })
}

export function dahlbergGeometry(b: DahlbergData) {
  const { add, prism, block, wall, inside, merged } = collect<Part>()
  const [from, to] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(from, to)
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const signs: { x: number; y: number; z: number; rot: number }[] = []

  // the corner block and entrance are one height, the rest is lower
  const zones = [
    { points: clip(outline, (p) => WING_FROM - f.aOf(p)), height: b.height },
    { points: clip(outline, (p) => f.aOf(p) - WING_FROM), height: WING },
  ]

  for (const zone of zones) {
    const H = zone.height
    add('roof', flat(zone.points, H - 0.05))
    for (const { p, q, len, dir, out } of edges(zone.points)) {
      if (len < 0.05) continue
      // where a point along the wall is, in meters from p
      const uOf = (x: Point) => (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
      const span = (a0: Point, a1: Point): [number, number] => {
        const [u0, u1] = [uOf(a0), uOf(a1)].sort((m, n) => m - n) as [number, number]
        return [u0, u1]
      }
      const fits = ([u0, u1]: [number, number]) => u0 > 0.3 && u1 < len - 0.3
      const mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }
      const a = f.aOf(mid)
      const facing = out.x * f.out.x + out.z * f.out.z
      const sideways = out.x * f.along.x + out.z * f.along.z

      // the line between the two heights: just the step up to the taller part
      if (Math.abs(f.aOf(p) - WING_FROM) < 0.01 && Math.abs(f.aOf(q) - WING_FROM) < 0.01) {
        if (H > WING) wall('marble', p, q, WING, H, out)
        continue
      }

      const openings: Opening<Part>[] = []
      const bands: [number, number, number, number][] = [] // [u0, u1, y0, y1] sticking out
      const ribs: number[] = []
      const tall: number[] = []
      const front = facing > 0.9 && f.dOf(mid) > -3
      // the corner block, on courtland (front) and around the corner on gilmer
      const corner = (front && a < ENTRANCE[0]) || (sideways < -0.9 && a < 2)
      // distance from the corner to a point on this wall
      const atCorner = (c: number) => (front ? f.at(c) : f.at(0, -c))

      if (corner) {
        for (const [c0, c1] of BIG_WINDOWS) {
          const w = span(atCorner(c0), atCorner(c1))
          if (fits(w)) openings.push({ hole: [...w, BIG_BOTTOM, BIG_TOP], glass: 'bigGlass' })
          for (const s of row((c0 + c1) / 2, 3, 0.95, 0.3)) {
            const h = span(atCorner(s[0]), atCorner(s[1]))
            if (fits(h)) openings.push({ hole: [...h, ...SMALL], glass: 'glass' })
          }
        }
        for (const s of row(3.1, 2, 1.05, 0.3)) {
          const h = span(atCorner(s[0]), atCorner(s[1]))
          if (fits(h)) openings.push({ hole: [...h, ...SMALL], glass: 'glass' })
        }
        // fluted pilasters between the groups of small windows, and a pair of ribs down
        // the piers between the big ones
        for (const c of [5.05, 10.1, 15.3])
          ribs.push(...[-0.25, 0, 0.25].map((k) => uOf(atCorner(c + k))))
        for (const c of [10.1, 15.3]) tall.push(...[-0.22, 0.22].map((k) => uOf(atCorner(c + k))))
        const [l0] = span(atCorner(BIG_WINDOWS[0]![0] - 0.6), atCorner(0))
        const [, l1] = span(atCorner(BIG_WINDOWS[2]![1] + 0.6), atCorner(0))
        // ledge over the big windows, the sill under the small ones, a band over them
        bands.push([Math.max(0, Math.min(l0, l1)), Math.min(len, Math.max(l0, l1)), 10.5, 10.8])
        bands.push([0, len, 11.8, 12.1], [0, len, 14.7, 14.9])
      } else if (front && a < ENTRANCE[1]) {
        // the entrance block: three tall strips of windows in a frame, the canopy, and
        // glass and the doors under it
        for (const c of [27.2, 30.2, 33.2]) {
          const w = span(f.at(c - 0.8), f.at(c + 0.8))
          if (fits(w)) openings.push({ hole: [...w, 5.6, 14.8], glass: 'stripGlass' })
        }
        const [f0, f1] = span(f.at(25.1), f.at(35.3))
        bands.push([f0, f0 + 0.4, 4.9, 15.7], [f1 - 0.4, f1, 4.9, 15.7], [f0, f1, 15.3, 15.7])
        for (const [g0, g1] of [
          [23.4, 28.6],
          [31.8, 37],
        ] as const) {
          const w = span(f.at(g0), f.at(g1))
          if (fits(w)) openings.push({ hole: [...w, 0.4, 3.9], glass: 'glass' })
        }
        const t = door ? uOf(door) : -1
        if (
          door &&
          t > 0 &&
          t < len &&
          Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
        ) {
          openings.push({ hole: [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT] })
          openings.push({
            hole: [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 2.9, 3.9],
            glass: 'glass',
          })
        }
        const d = f.dOf(mid)
        block('canopy', f, 23, 37.4, d, d + 3, 4.2, 4.8)
      } else {
        // the wing and the rest: a tall window and three small ones over it, every 5.2m
        const bays = Math.floor((len - 1) / 5.2)
        for (let k = 0; k < bays; k++) {
          const c = (len - bays * 5.2) / 2 + 2.6 + k * 5.2
          openings.push({ hole: [c - 1.8, c + 1.8, 2.4, 8.2], glass: 'bigGlass' })
          for (const [s0, s1] of row(c, 3, 0.95, 0.35))
            if (H > 12) openings.push({ hole: [s0, s1, 9.2, 11.4], glass: 'glass' })
          if (k > 0) ribs.push(c - 2.6)
        }
        if (bays > 0) bands.push([0, len, 8.7, 8.95])
      }

      // the entrance is set back under the canopy
      wall('marble', p, q, 0, H, out, openings, front && !corner && a < ENTRANCE[1] ? 0.8 : 0.3)
      // things that stick out of the wall a bit: ledges, pilasters, the base, the coping
      const along = (u: number, d = 0) => ({
        x: p.x + dir.x * u + out.x * d,
        z: p.z + dir.z * u + out.z * d,
      })
      const box = (part: Part, u0: number, u1: number, d: number, y0: number, y1: number) =>
        prism(part, [along(u0), along(u1), along(u1, d), along(u0, d)], y0, y1)
      for (const [u0, u1, y0, y1] of bands) box('marble', u0, u1, 0.18, y0, y1)
      for (const u of ribs)
        box('marble', u - 0.07, u + 0.07, 0.1, corner ? 12.1 : 2.4, corner ? 14.7 : 8.2)
      for (const u of tall) box('marble', u - 0.08, u + 0.08, 0.08, BIG_BOTTOM, 10.5)
      // the darker stone base stops at doors and windows that go down to the ground
      const low = openings
        .filter((o) => o.hole[2] < PLINTH)
        .map((o) => [o.hole[0], o.hole[1]] as const)
        .sort((m, n) => m[0] - n[0])
      let u = 0
      for (const [h0, h1] of [...low, [len, len] as const]) {
        if (h0 > u + 0.05) box('base', u, h0, 0.06, 0, PLINTH)
        u = Math.max(u, h1)
      }
      box('marble', 0, len, 0.12, H - 0.3, H)
      // the name on the corner, on courtland
      if (corner && front) {
        const s = along(uOf(f.at(2.8)), 0.04)
        signs.push({ x: s.x, y: 4.7, z: s.z, rot: Math.atan2(out.x, out.z) })
      }
    }
  }

  // rooftop units
  for (const [a, d] of [
    [8, -8],
    [14, -14],
    [48, -10],
    [72, -30],
    [80, -20],
  ] as const) {
    const top = a < WING_FROM ? b.height : WING
    block('metal', f, a, a + 3, d, d - 2, top, top + 1.8)
  }

  return {
    parts: merged(),
    inside,
    signs: signs.map((s) => ({ ...s, text: 'DAHLBERG HALL' })),
  }
}
