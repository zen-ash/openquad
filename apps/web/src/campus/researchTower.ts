import * as THREE from 'three'
import type { Point, Segment } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import { baseOf } from '../game/surface'
import { heightAt } from '../game/terrain'
import type { Sign } from './landmarks'
import { edges, flat, parts as collect, pt, wallQuad, type Hole, type Opening } from './landmark'

// the research tower, opened september 2026 next to petit. from gsu's photos and hok's
// renderings on gsu's map: dark grey panels, a glass v wrapping the east corner (each arm's
// bottom edge slants up away from the corner), tall thin slots under the slants, a grid of
// narrow windows over a tan brick base on the side toward the railroad, two floors of
// storefront on jesse hill jr dr and a lighter metal screen around the top. "u" is meters
// along each wall

export type TowerData = { points: number[][]; height: number; door?: number[] }

export type Part =
  'panels' | 'glass' | 'blueGlass' | 'screen' | 'ribbed' | 'metal' | 'brick' | 'roof'

// the screen around the rooftop machinery
export const SCREEN = 4.5
const GROUND = 4.5
// the two storeys of storefront on jesse hill jr dr, then 3.9m floors up to the roof
export const LOBBY = 9.3
const FLOOR = 3.9
// the glass v at the east corner, from both renderings with the camera fitted
export const V_LOW = 11.5
const V_TOP = 31.3
// the brick base on the railroad side
const BASE = 4.5

type UY = [number, number]

export function researchTowerGeometry(b: TowerData) {
  const { add, prism, wall, inside, merged } = collect<Part>()
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const H = b.height
  const TOP = H - SCREEN
  const signs: Sign[] = []
  add('roof', flat(outline, H - 0.05))

  for (const { p, q, len, dir, out } of edges(outline)) {
    const uOf = (x: Point) => (x.x - p.x) * dir.x + (x.z - p.z) * dir.z
    const t = door ? uOf(door) : -1
    const hasDoor =
      door && t > 0 && t < len && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
    const openings: Opening<Part>[] = []
    const along = (u: number, d = 0) => ({
      x: p.x + dir.x * u + out.x * d,
      z: p.z + dir.z * u + out.z * d,
    })
    const box = (part: Part, u0: number, u1: number, d: number, y0: number, y1: number) =>
      prism(part, [along(u0), along(u1), along(u1, d), along(u0, d)], y0, y1)
    const onWall = (part: Part, poly: UY[], d: number, glass = false) =>
      add(part, onFace(p, dir, out, poly, d, glass))
    // a light strip along an edge of the glass, like the flashing in the photos
    const trim = (a: UY, c: UY) => {
      const l = Math.hypot(c[0] - a[0], c[1] - a[1])
      const n = [((a[1] - c[1]) / l) * 0.09, ((c[0] - a[0]) / l) * 0.09]
      onWall(
        'ribbed',
        [
          [a[0] - n[0]!, a[1] - n[1]!],
          [c[0] - n[0]!, c[1] - n[1]!],
          [c[0] + n[0]!, c[1] + n[1]!],
          [a[0] + n[0]!, a[1] + n[1]!],
        ],
        0.08,
      )
    }
    const slot = (u: number, y0: number, y1: number, w = 0.75) => {
      if (y1 - y0 > 1.5) openings.push({ hole: [u - w / 2, u + w / 2, y0, y1], glass: 'glass' })
    }
    let walls = true

    if (out.x < 0 && out.z < 0) {
      // toward petit, the loading dock's drive: light ribbed metal all the way up, the dark
      // panels coming round the top from the courtyard side (hok's rendering, gsu's 2026 photo)
      walls = false
      wall('ribbed', p, q, 0, TOP - 2.5, out)
      wall('panels', p, q, TOP - 2.5, TOP, out)
    } else if (out.x > 0 && out.z < 0) {
      // the long side toward the research science center, from the north corner. one arm
      // of the v: its bottom slants up from the east corner, its top steps up near the end.
      // spaced off hok's courtyard rendering (the slots under it are 2.86m apart)
      const end = 14.1
      const high = 34.6
      const arm: UY[] = [
        [len, V_LOW],
        [end, 26.8],
        [end, high],
        [20.9, high],
        [23.9, V_TOP],
        [len, V_TOP],
      ]
      onWall('blueGlass', arm, 0.05, true)
      trim([len, V_LOW], [end, 26.8])
      trim([20.9, high], [23.9, V_TOP])
      const slant = (u: number) => V_LOW + ((len - u) * (26.8 - V_LOW)) / (len - end)
      // slots under the slant, the ones over the two storeys of fins start higher
      for (let u = 14.5; u < len - 7; u += 2.86) slot(u, u > 30 ? 10.3 : 6, slant(u) - 1.1)
      // two tall ones near the north corner
      slot(1.8, 9.5, TOP - 1.5, 1.1)
      slot(7.8, 8.5, TOP - 1.5, 1.1)
      // two storeys of glass behind bronze fins at the east end, one storey of glass under
      // a long canopy with the main doors at its north end, and light ribbed metal by the
      // corner with the name on it right next to the doors (gsu's photo from the opening)
      openings.push({ hole: [31, len - 0.4, 0.1, LOBBY], glass: 'blueGlass' })
      for (let u = 31.3; u < len - 0.5; u += 0.6) box('metal', u, u + 0.08, 0.35, 0.1, 10.2)
      let store = 11.5
      if (hasDoor) {
        const d0 = t - DOOR_WIDTH / 2
        const d1 = t + DOOR_WIDTH / 2
        openings.push({ hole: [d0, d1, 0, DOOR_HEIGHT] })
        openings.push({ hole: [d0, d1, DOOR_HEIGHT + 0.2, GROUND - 0.4], glass: 'blueGlass' })
        store = d1 + 0.2
      }
      openings.push({ hole: [store, 30.6, 0.1, GROUND - 0.4], glass: 'blueGlass' })
      const ribs = hasDoor ? t - DOOR_WIDTH / 2 - 0.2 : 11.2
      box('ribbed', 0.1, ribs, 0.06, 0, GROUND)
      const s = along(ribs - 1.8, 0.08)
      signs.push({
        x: s.x,
        y: 2.25,
        z: s.z,
        rot: Math.atan2(out.x, out.z),
        text: 'RESEARCH TOWER',
        // black letters on brushed metal
        color: '#26282b',
        plate: '#dfe1e3',
        scale: 0.6,
      })
      prism('metal', [along(11.2), along(29.4), along(29.4, 2.4), along(11.2, 2.4)], 4.3, 4.55)
    } else if (out.x > 0 && out.z > 0) {
      // jesse hill jr dr, from the east corner. the other arm of the v: one floor of it
      // runs on toward the south corner and its top slants down that way a bit. two storeys
      // of storefront under it, a solid end by the south corner with gsu's sign at the top.
      // measured on gsu's 2024 rendering from jesse hill with the camera fitted
      const solid = len - 8.6
      const knee = len - 12.4
      const arm: UY[] = [
        [0, V_LOW],
        [knee, 25.1],
        [solid, 25.1],
        [solid, 28],
        [0, V_TOP],
      ]
      onWall('blueGlass', arm, 0.05, true)
      trim([0, V_LOW], [knee, 25.1])
      trim([knee, 25.1], [solid, 25.1])
      trim([solid, 28], [0, V_TOP])
      // slots under the slant, shorter toward the corner
      for (const [s, top] of [
        [9, 23.4],
        [11.9, 23.8],
        [14.7, 20.3],
        [18, 16.7],
        [21.2, 12.9],
      ])
        slot(len - s!, 10, top!)
      openings.push({ hole: [0.5, solid, 0.1, LOBBY], glass: 'blueGlass' })
      const s = along(len - 3.5, 0.06)
      signs.push({
        x: s.x,
        y: TOP - 1.8,
        z: s.z,
        rot: Math.atan2(out.x, out.z),
        text: '',
        plate: '#1f4b99',
        width: 2.2,
        height: 2.2,
      })
    } else if (out.x < 0 && out.z > 0) {
      // toward the railroad, from the south corner: a solid strip by the corner, then a grid
      // of narrow windows from the third floor up over a tan brick base
      walls = false
      for (let u = 11; u < len - 1; u += 3.6)
        for (let y = LOBBY; y < TOP - 1; y += FLOOR)
          openings.push({ hole: [u - 0.5, u + 0.5, y + 0.5, y + 3.4], glass: 'glass' })
      const doors: Hole[] = [
        [14, 16, 0, 3],
        [33, 34.2, 0, 2.6],
      ]
      wall(
        'brick',
        p,
        q,
        0,
        BASE,
        out,
        doors.map((hole) => ({ hole, glass: 'glass' })),
      )
      wall('panels', p, q, BASE, TOP, out, openings, 0.15)
    }

    if (walls) wall('panels', p, q, 0, TOP, out, openings)
    wall('screen', p, q, TOP, H, out)
    // a thin edge where the panels meet the screen
    box('metal', 0, len, 0.12, TOP - 0.2, TOP)
  }

  // the courtyard's end on jesse hill jr dr is shut with a tall black picket fence from the
  // east corner over to the research science center's charcoal tower: bars every 15cm
  // between two rails, posts every 2.4m (hok's renderings from both sides, no gate in them).
  // it stands on the ground, which is up to half a meter over the tower's floor there
  {
    const [p, q] = COURTYARD_FENCE.map(pt) as [Point, Point]
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
    const n = { x: dir.z, z: -dir.x }
    const back = { x: -n.x, z: -n.z }
    const at = (t: number, d = 0) => ({
      x: p.x + dir.x * t + n.x * d,
      z: p.z + dir.z * t + n.z * d,
    })
    const base = baseOf(b)
    const ground = (t: number) => heightAt(at(t).x, at(t).z) - base
    for (let t = 0.1; t < len; t += 0.15) {
      const g = ground(t)
      add('panels', wallQuad(at(t - 0.02, 0.01), at(t + 0.02, 0.01), g - 0.1, g + FENCE, n))
      add('panels', wallQuad(at(t - 0.02, -0.01), at(t + 0.02, -0.01), g - 0.1, g + FENCE, back))
    }
    // the rails a bay at a time, at the ground's height in the middle of it
    const posts = Math.ceil(len / 2.4)
    for (let k = 0; k < posts; k++) {
      const [t0, t1] = [(k * len) / posts, ((k + 1) * len) / posts]
      const g = ground((t0 + t1) / 2)
      for (const y of [g + 0.2, g + FENCE - 0.15]) {
        add('panels', wallQuad(at(t0, 0.025), at(t1, 0.025), y - 0.03, y + 0.03, n))
        add('panels', wallQuad(at(t0, -0.025), at(t1, -0.025), y - 0.03, y + 0.03, back))
      }
      if (k === 0) continue
      const square = [
        at(t0 - 0.05, -0.05),
        at(t0 + 0.05, -0.05),
        at(t0 + 0.05, 0.05),
        at(t0 - 0.05, 0.05),
      ]
      prism('panels', square, ground(t0) - 0.1, ground(t0) + FENCE + 0.05)
    }
  }

  return { parts: merged(), inside, signs }
}

// the fence across the courtyard's jesse hill jr dr end, meters from hurt park
export const COURTYARD_FENCE = [
  [57.75, 421.95],
  [74.05, 417.2],
]
// its height over the ground
const FENCE = 2.6

export const towerFence = (): Segment => {
  const [a, b] = COURTYARD_FENCE as [number[], number[]]
  return { ax: a[0]!, az: a[1]!, bx: b[0]!, bz: b[1]! }
}

// a flat shape on a wall, d out from it: poly is [u along the wall, y up]. glass gets its
// uvs from the shape's corner and aPane its size, for the mullions (see glassQuad)
function onFace(p: Point, dir: Point, out: Point, poly: UY[], d: number, glass: boolean) {
  const shape = new THREE.Shape(poly.map(([u, y]) => new THREE.Vector2(u, y)))
  const geo = new THREE.ShapeGeometry(shape).toNonIndexed()
  const pos = geo.getAttribute('position')
  const u0 = Math.min(...poly.map((c) => c[0]))
  const y0 = Math.min(...poly.map((c) => c[1]))
  // the shape faces +z in (u, y), which is dir x up. flip it if that's not out
  const flip = -dir.z * out.x + dir.x * out.z < 0
  const n = pos.count
  const xyz: number[] = []
  const uv: number[] = []
  for (let i = 0; i < n; i++) {
    const k = flip ? i - (i % 3) + [0, 2, 1][i % 3]! : i
    const u = pos.getX(k)
    const y = pos.getY(k)
    xyz.push(p.x + dir.x * u + out.x * d, y, p.z + dir.z * u + out.z * d)
    uv.push(glass ? u - u0 : u, glass ? y - y0 : y)
  }
  const res = new THREE.BufferGeometry()
  res.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3))
  res.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(Array(n).fill([out.x, 0, out.z]).flat(), 3),
  )
  res.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  if (glass) {
    const size = [
      Math.max(...poly.map((c) => c[0])) - u0,
      Math.max(...poly.map((c) => c[1])) - y0,
      0.37,
    ]
    res.setAttribute('aPane', new THREE.Float32BufferAttribute(Array(n).fill(size).flat(), 3))
  }
  return res
}
