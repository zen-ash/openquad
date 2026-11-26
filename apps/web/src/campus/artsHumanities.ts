import type { Point } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import { clip, edges, flat, frame, parts as collect, pt, type Opening } from './landmark'

// arts & humanities, from photos (gsu's event photos, one on commons, mapillary on peachtree
// center). big white marble boxes, narrow windows staggered along peachtree center, a row
// of little square ones along the top, and the glass entrance to the recital hall with the
// blue canopy at the gilmer street corner. the side on the greenway is grey panels.
// "a" is meters along the southwest wall from the peachtree center end, "d" is meters in
// from it toward the quad. gsu is putting a new front on it in 2027, this is it before that

export type ArtsData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][] }
}

export type Part =
  'marble' | 'base' | 'panels' | 'glass' | 'bandGlass' | 'metal' | 'blueGlass' | 'banner' | 'roof'

// the tall marble block runs along the southwest side, this deep
export const TALL = 17
export const LOW = 14
const PLINTH = 0.8
// how far in from the long side the peachtree center wall turns into the entrance end
const CORNER = 31

export function artsHumanitiesGeometry(b: ArtsData) {
  const { add, prism, block, wall, inside, merged } = collect<Part>()
  const [from, to] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(from, to)
  // f.out points into the building here, toward the quad
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const signs: Sign[] = []

  const zones = [
    { points: clip(outline, (p) => TALL - f.dOf(p)), height: b.height },
    { points: clip(outline, (p) => f.dOf(p) - TALL), height: LOW },
  ]

  for (const zone of zones) {
    const H = zone.height
    add('roof', flat(zone.points, H - 0.05))
    for (const { p, q, len, dir, out } of edges(zone.points)) {
      if (len < 0.05) continue
      const uOf = (x: Point) => (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
      const mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }
      const a = f.aOf(mid)
      const d = f.dOf(mid)
      const toQuad = out.x * f.out.x + out.z * f.out.z
      const toSE = out.x * f.along.x + out.z * f.along.z

      // where the tall block meets the low part, just the bit sticking up
      if (Math.abs(f.dOf(p) - TALL) < 0.01 && Math.abs(f.dOf(q) - TALL) < 0.01) {
        if (H > LOW) wall('marble', p, q, LOW, H, out)
        continue
      }

      const openings: Opening<Part>[] = []
      let part: Part = 'marble'
      // a row of little square windows along the top of the tall block
      const topRow = () => {
        const n = Math.floor((len - 2) / 3)
        for (let k = 0; k < n; k++) {
          const c = (len - (n - 1) * 3) / 2 + k * 3
          openings.push({ hole: [c - 0.5, c + 0.5, H - 3.4, H - 2.4], glass: 'glass' })
        }
      }

      // banners and signs to hang on this wall once it's drawn, [u along it]
      const banners: number[] = []
      let plate = -1
      if (toSE < -0.9 && len > 3) {
        // peachtree center (mapillary 2019, gsu's 2025 photos): narrow windows deep in the
        // marble, every other column half a floor higher, dark openings along the sidewalk.
        // by the corner with the entrance a wide window between two banners instead
        const dAt = (u: number) => f.dOf({ x: p.x + dir.x * u, z: p.z + dir.z * u })
        const corner = (u: number) => dAt(u) > CORNER
        for (let k = 0, u = 1.6; u < len - 1.4; k++, u += 3) {
          if (corner(u + 0.4)) continue
          for (let y = 4.8 + (k % 2) * 1.6; y + 2.2 < H - 1.3; y += 3.2)
            openings.push({ hole: [u, u + 0.75, y, y + 2.2], glass: 'glass' })
        }
        for (let u = 2; u < len - 2; u += 4.5)
          if (!corner(u + 1.6)) openings.push({ hole: [u, u + 1.6, 0.4, 3], glass: 'glass' })
        // the wide window, banners either side of it and the plate under it
        const near = [0, len].sort((m, n) => dAt(n) - dAt(m))[0]!
        const back = near === 0 ? 1 : -1
        if (dAt(near) > CORNER + 6) {
          const w0 = near + back * 3
          const w1 = near + back * 6.2
          openings.push({ hole: [Math.min(w0, w1), Math.max(w0, w1), 6.3, 8], glass: 'bandGlass' })
          banners.push(near + back * 1.5, near + back * 7)
          plate = near + back * 3.6
        }
      } else if (toQuad > 0.9 && a < 9.5 && d > 38) {
        // the entrance: glass under the canopy with the doors in it
        const t = door ? uOf(door) : len / 2
        const onDoor =
          door &&
          t > 0 &&
          t < len &&
          Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
        if (onDoor) {
          openings.push({ hole: [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT] })
          openings.push({ hole: [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 2.8, 4], glass: 'glass' })
          if (t - DOOR_WIDTH / 2 - 0.1 > 0.6)
            openings.push({ hole: [0.4, t - DOOR_WIDTH / 2 - 0.1, 0.1, 4], glass: 'glass' })
          if (len - 0.4 - (t + DOOR_WIDTH / 2 + 0.1) > 0.2)
            openings.push({ hole: [t + DOOR_WIDTH / 2 + 0.1, len - 0.4, 0.1, 4], glass: 'glass' })
        } else if (len > 1) {
          openings.push({ hole: [0.2, len - 0.2, 0.1, 4], glass: 'glass' })
        }
      } else if (H === LOW && (toQuad > 0.5 || toSE > 0.5) && a > 38) {
        // the greenway side is painted panels, not marble
        part = 'panels'
      } else if (H > LOW) {
        topRow()
      }

      wall(part, p, q, 0, H, out, openings, toSE < -0.9 ? 0.45 : 0.3)
      const along = (u: number, dd = 0) => ({
        x: p.x + dir.x * u + out.x * dd,
        z: p.z + dir.z * u + out.z * dd,
      })
      const box = (pp: Part, u0: number, u1: number, dd: number, y0: number, y1: number, dd0 = 0) =>
        prism(pp, [along(u0, dd0), along(u1, dd0), along(u1, dd), along(u0, dd)], y0, y1)
      const low = openings
        .filter((o) => o.hole[2] < PLINTH)
        .map((o) => [o.hole[0], o.hole[1]] as const)
        .sort((m, n) => m[0] - n[0])
      let u = 0
      for (const [h0, h1] of [...low, [len, len] as const]) {
        if (h0 > u + 0.05) box('base', u, h0, 0.05, 0, PLINTH)
        u = Math.max(u, h1)
      }
      box(part === 'panels' ? 'metal' : 'marble', 0, len, 0.1, H - 0.25, H)

      // blue banners on brackets
      for (const c of banners) {
        box('metal', c - 0.45, c + 0.45, 0.35, 8.1, 8.16)
        box('banner', c - 0.4, c + 0.4, 0.33, 4.4, 8.1, 0.3)
      }
      if (plate >= 0) {
        const s = along(plate, 0.04)
        signs.push({
          x: s.x,
          y: 2.9,
          z: s.z,
          rot: Math.atan2(out.x, out.z),
          text: 'ARTS & HUMANITIES\nRECITAL HALL',
          scale: 0.5,
        })
      }
      // the hall's name by the doors
      if (toQuad > 0.9 && H === LOW && a > 10 && a < 38 && len > 12) {
        const s = along(3.4, 0.03)
        signs.push({
          x: s.x,
          y: 2.6,
          z: s.z,
          rot: Math.atan2(out.x, out.z),
          text: 'FLORENCE KOPLEFF\nRECITAL HALL',
          letters: true,
        })
      }
    }
  }

  // the canopy over the entrance: a steel frame with blue glass slats in it
  const c0 = -0.8
  const c1 = 10.2
  const [d0, d1] = [40.8, 44.4]
  block('metal', f, c0, c1, d1 - 0.15, d1, 4.3, 4.6)
  block('metal', f, c0, c0 + 0.15, d0, d1, 4.3, 4.6)
  block('metal', f, c1 - 0.15, c1, d0, d1, 4.3, 4.6)
  for (let k = 0; k < 7; k++) {
    const a0 = c0 + 0.5 + k * ((c1 - c0 - 1) / 6)
    block('metal', f, a0 - 0.05, a0 + 0.05, d0, d1, 4.35, 4.55)
  }
  for (let k = 0; k < 6; k++) {
    const dd = d0 + 0.35 + k * 0.55
    block('blueGlass', f, c0 + 0.15, c1 - 0.15, dd, dd + 0.32, 4.5, 4.54)
  }
  const s = f.at(4.2, d0 + 0.03)
  signs.push({
    x: s.x,
    y: 5.3,
    z: s.z,
    rot: Math.atan2(f.out.x, f.out.z),
    text: 'ARTS & HUMANITIES',
  })

  // rooftop units on the low roof
  for (const [a, d] of [
    [20, 30],
    [28, 36],
    [52, 22],
  ] as const) {
    block('metal', f, a, a + 3, d, d + 2, LOW, LOW + 1.6)
  }

  return { parts: merged(), inside, signs }
}
