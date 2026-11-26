import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BACK,
  FRONT,
  PARAPET,
  ROOF,
  SPLIT,
  WEST,
  WING_SOUTH,
  WING_TOP,
  alumniCenterGeometry,
  type AlumniCenterData,
} from './alumniCenter'

const center = campus.buildings.find((b) => b.name === 'Alumni Center') as AlumniCenterData
const pts = center.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = alumniCenterGeometry(center)

describe('alumni center', () => {
  it('keeps its place in the list as a gsu building', () => {
    expect(campus.buildings[30]!.name).toBe('Alumni Center')
    expect(campus.buildings[30]!.gsu).toBe(true)
  })

  it('has the block and the wing on the lidar, both fronts on one line on piedmont', () => {
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    expect(Math.min(...xs)).toBe(WEST)
    expect(Math.max(...xs)).toBe(FRONT)
    expect(Math.min(...zs)).toBe(BACK)
    expect(Math.max(...zs)).toBe(WING_SOUTH)
    // the block is about 8m deep, its narrow end on the street
    expect(SPLIT - BACK).toBeCloseTo(8.2, 1)
    expect(pts.filter((p) => p.x === FRONT)).toHaveLength(2)
  })

  it('is as tall as the lidar says', () => {
    expect(center.height).toBe(PARAPET)
    expect(302 + ROOF).toBeCloseTo(313.6, 1)
    expect(302 + PARAPET).toBeCloseTo(314.45, 1)
    expect(302 + WING_TOP).toBeCloseTo(306.8, 1)
  })

  it('has its door on piedmont ave in the wing next to the block', () => {
    const [x, z, nx, nz] = center.door!
    expect(x).toBe(FRONT)
    expect(z).toBeGreaterThan(SPLIT)
    expect(z).toBeLessThan(SPLIT + 3)
    expect([nx, nz]).toEqual([1, 0])
    expect(pointInPolygon({ x: x! + 0.5, z: z! }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - 0.5, z: z! }, pts)).toBe(true)
    expect(signs.map((s) => s.text)).toContain('60 Piedmont Ave')
  })

  it('stands on the piedmont ave sidewalk', () => {
    expect(floorOf(center)).toBeCloseTo(fromElevation(302))
    expect(baseOf(center)).toBeCloseTo(floorOf(center))
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays small: 4 parts, under 3k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(4)
    expect(triangles).toBeLessThan(3000)
  })
})
