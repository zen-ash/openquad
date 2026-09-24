import * as THREE from 'three'
import type { Point } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import { edges, flat, parts as collect, pt, type Hole, type Opening } from './landmark'

// the research tower, opened september 2026 next to petit. from gsu's and urbanize atlanta's
// photos: dark grey panels, tall thin slots of windows, a band of blue glass that slants up
// the side on decatur street, a lighter metal screen around the top, and light ribbed metal
// by the doors. "a" is meters along each wall

export type TowerData = { points: number[][]; height: number; door?: number[] }

export type Part = 'panels' | 'glass' | 'blueGlass' | 'screen' | 'ribbed' | 'metal' | 'roof'

// the screen around the rooftop machinery
export const SCREEN = 4.5
const GROUND = 4.5

export function researchTowerGeometry(b: TowerData) {
  const { add, prism, wall, inside, merged } = collect<Part>()
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const H = b.height
  const signs: Sign[] = []
  add('roof', flat(outline, H - 0.05))

  for (const { p, q, len, dir, out } of edges(outline)) {
    const uOf = (x: Point) => (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
    const t = door ? uOf(door) : -1
    const hasDoor =
      door && t > 0 && t < len && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
    const openings: Opening<Part>[] = []
    // tall slots of windows from the second floor up to the screen
    const slot = (u: number, w = 0.8, y0 = GROUND + 1) =>
      openings.push({ hole: [u - w / 2, u + w / 2, y0, H - SCREEN - 1], glass: 'glass' })

    if (hasDoor) {
      // the front, toward petit: glass along the ground floor with the doors in it, a
      // strip of glass up the corner and slots
      const d0 = t - DOOR_WIDTH / 2
      const d1 = t + DOOR_WIDTH / 2
      openings.push({ hole: [d0, d1, 0, DOOR_HEIGHT] })
      openings.push({ hole: [d0, d1, DOOR_HEIGHT + 0.2, GROUND - 0.3], glass: 'glass' })
      if (d0 - 0.2 > 1.2) openings.push({ hole: [1, d0 - 0.2, 0.1, GROUND - 0.3], glass: 'glass' })
      openings.push({ hole: [len - 2.6, len - 1, GROUND + 1, H - SCREEN - 1], glass: 'blueGlass' })
      for (const u of [len * 0.3, len * 0.42, len * 0.6, len * 0.72]) slot(u)
    } else if (len > 40 && out.x > 0 && out.z < 0) {
      // the side toward decatur street: a wide band of blue glass slanting up toward the
      // north corner, slots under the low end
      const band = { u0: 3, u1: len - 3, low: GROUND + 1, high: H - SCREEN - 10, tall: 9 }
      add('blueGlass', slanted(p, dir, out, band))
      for (const f of [0.55, 0.65, 0.75, 0.85]) {
        const u = f * len
        const bottom = band.high + ((band.low - band.high) * (u - band.u0)) / (band.u1 - band.u0)
        if (bottom - 0.6 > GROUND + 4)
          openings.push({ hole: [u - 0.4, u + 0.4, GROUND + 1, bottom - 0.6], glass: 'glass' })
      }
      openings.push({ hole: [2, len - 2, 0.3, GROUND - 0.5], glass: 'glass' })
    } else {
      // the other sides: slots every so often, a few doubled up
      const n = Math.max(2, Math.floor(len / 7))
      for (let k = 0; k < n; k++) slot(((k + 0.5) / n) * len, k % 3 === 1 ? 1.6 : 0.8)
    }

    // ribbed light metal on the ground floor and the screen along the top, in front of
    // the dark panels
    const holes: Hole[] = openings.map((o) => o.hole)
    wall('panels', p, q, 0, H - SCREEN, out, openings)
    wall('screen', p, q, H - SCREEN, H, out)
    const along = (u: number, d = 0) => ({
      x: p.x + dir.x * u + out.x * d,
      z: p.z + dir.z * u + out.z * d,
    })
    const box = (part: Part, u0: number, u1: number, d: number, y0: number, y1: number) =>
      prism(part, [along(u0), along(u1), along(u1, d), along(u0, d)], y0, y1)
    // a thin edge where the panels meet the screen
    box('metal', 0, len, 0.12, H - SCREEN - 0.2, H - SCREEN)
    if (hasDoor) {
      // ribbed panels beside the doors with the name on them
      const free = holes.filter((h) => h[2] < GROUND).map((h) => h[1])
      const u0 = Math.max(...free) + 0.1
      if (len - u0 > 2) {
        box('ribbed', u0, len - 0.1, 0.06, 0, GROUND)
        const s = along((u0 + len) / 2, 0.08)
        signs.push({
          x: s.x,
          y: 2.6,
          z: s.z,
          rot: Math.atan2(out.x, out.z),
          text: 'RESEARCH TOWER',
        })
      }
      // canopy over the doors
      prism(
        'metal',
        [along(t - 3), along(t + 3), along(t + 3, 2.4), along(t - 3, 2.4)],
        GROUND - 0.2,
        GROUND + 0.1,
      )
    }
  }

  return { parts: merged(), inside, signs }
}

// a band of glass on a wall with slanted top and bottom edges, a hair in front of it. the
// mullions still run straight up and across (see windowGlass)
function slanted(
  p: Point,
  dir: Point,
  out: Point,
  b: { u0: number; u1: number; low: number; high: number; tall: number },
) {
  const at = (u: number) => ({
    x: p.x + dir.x * u + out.x * 0.05,
    z: p.z + dir.z * u + out.z * 0.05,
  })
  const [a, c] = [at(b.u0), at(b.u1)]
  // high at the start of the wall, low at the end
  const corners = [
    [a, b.high, 0],
    [c, b.low, b.u1 - b.u0],
    [c, b.low + b.tall, b.u1 - b.u0],
    [a, b.high + b.tall, 0],
  ] as const
  const bottom = Math.min(b.low, b.high)
  const size = [b.u1 - b.u0, Math.max(b.low, b.high) + b.tall - bottom, 0.5]
  // the front of (0, 1, 2) faces (1 - 0) x up, flip it if that's not out
  const facesOut = -(c.z - a.z) * out.x + (c.x - a.x) * out.z > 0
  const order = facesOut ? [0, 1, 2, 0, 2, 3] : [1, 0, 3, 1, 3, 2]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      order.flatMap((i) => [corners[i]![0].x, corners[i]![1], corners[i]![0].z]),
      3,
    ),
  )
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      order.flatMap(() => [out.x, 0, out.z]),
      3,
    ),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      order.flatMap((i) => [corners[i]![2], corners[i]![1] - bottom]),
      2,
    ),
  )
  geo.setAttribute(
    'aPane',
    new THREE.Float32BufferAttribute(
      order.flatMap(() => size),
      3,
    ),
  )
  return geo
}
