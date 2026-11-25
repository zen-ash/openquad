import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BASE_TOP,
  CORNICE,
  FLOOR,
  N,
  ROOF,
  S,
  SHAFT,
  TOP,
  W,
  robinsonGeometry,
  type RobinsonData,
} from './robinsonCollege'

const rcb = campus.buildings.find(
  (b) => b.name === 'J. Mack Robinson College of Business',
) as RobinsonData
const pts = rcb.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = robinsonGeometry(rcb)
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z)

describe('robinson college of business', () => {
  it('is 204 by 80 feet like the empire building', () => {
    expect(dist(W, N)).toBeCloseTo(62.2, 0)
    expect(dist(W, S)).toBeCloseTo(24.4, 0)
    for (const p of [W, N, S]) expect(pts.some((q) => q.x === p.x && q.z === p.z)).toBe(true)
  })

  it('is as tall as the lidar says, with 14 floors', () => {
    expect(rcb.height).toBe(CORNICE)
    expect(320.6 + CORNICE).toBeCloseTo(376.2, 1)
    expect(320.6 + ROOF).toBeCloseTo(375.0, 1)
    // three in the base, ten of terra cotta, the top one
    expect(SHAFT).toHaveLength(10)
    expect(TOP + FLOOR).toBeLessThan(CORNICE)
    expect(BASE_TOP).toBeGreaterThan(3 * 4)
  })

  it('has its door on broad st in the middle', () => {
    const [x, z, nx, nz] = rcb.door!
    const along = ((x! - W.x) * (N.x - W.x) + (z! - W.z) * (N.z - W.z)) / dist(W, N)
    expect(along).toBeCloseTo(dist(W, N) / 2, 0)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the broad st sidewalk', () => {
    expect(floorOf(rcb)).toBeCloseTo(fromElevation(320.6))
    expect(baseOf(rcb)).toBeCloseTo(floorOf(rcb))
  })

  it('has the sign by the doors', () => {
    expect(signs.map((s) => s.text)).toContain('J. MACK ROBINSON\nCOLLEGE OF BUSINESS')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 12k triangles in 5 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(5)
    expect(triangles).toBeLessThan(12000)
  })
})
