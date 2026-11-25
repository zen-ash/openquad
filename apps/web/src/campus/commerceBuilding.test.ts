import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  CANOPY,
  E,
  LEDGE,
  N,
  ROOF,
  S,
  W,
  commerceGeometry,
  type CommerceData,
} from './commerceBuilding'
import { buildingsGeometry } from './geometry'

const cb = campus.buildings.find((b) => b.name === 'Commerce Building') as CommerceData
const pts = cb.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts } = commerceGeometry(cb)
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z)

describe('commerce building', () => {
  it('goes by the name on gsu map', () => {
    expect(campus.buildings.some((b) => b.name === 'Bennett A. Brown Commerce Building')).toBe(
      false,
    )
    expect(campus.buildings.find((b) => b.name === 'Commerce Building')?.gsu).toBe(true)
  })

  it('is a box the size of the lidar roof', () => {
    expect(dist(S, E)).toBeCloseTo(33.2, 0)
    expect(dist(S, W)).toBeCloseTo(27, 0)
    expect(dist(E, N)).toBeCloseTo(27, 0)
    // square corners
    const dot = (E.x - S.x) * (W.x - S.x) + (E.z - S.z) * (W.z - S.z)
    expect(Math.abs(dot) / (dist(S, E) * dist(S, W))).toBeLessThan(0.01)
  })

  it('is as tall as the lidar says', () => {
    expect(cb.height).toBe(ROOF)
    expect(320.6 + ROOF).toBeCloseTo(383.2, 1)
    expect(320.6 + LEDGE).toBeCloseTo(376.4, 1)
  })

  it('has its door on broad st near the alley, the canopy over it', () => {
    const [x, z, nx, nz] = cb.door!
    expect(dist({ x: x!, z: z! }, E)).toBeLessThan(6)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    expect(CANOPY).toBeGreaterThan(2)
  })

  it('stands on the broad st sidewalk', () => {
    expect(floorOf(cb)).toBeCloseTo(fromElevation(320.6))
    expect(baseOf(cb)).toBeCloseTo(floorOf(cb))
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 4 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(4)
    expect(triangles).toBeLessThan(8000)
  })
})
