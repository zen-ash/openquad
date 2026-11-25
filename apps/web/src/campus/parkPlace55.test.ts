import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  DOORS,
  EAST,
  ENTRANCE,
  GLASS,
  LOBBY,
  NORTH,
  NOTCH,
  PENTHOUSE,
  ROOF,
  SOUTH,
  WEST,
  level,
  middleAt,
  parkPlace55Geometry,
  type ParkPlace55Data,
} from './parkPlace55'

const p55 = campus.buildings.find((b) => b.name === '55 Park Place') as ParkPlace55Data
const pts = p55.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = parkPlace55Geometry(p55)

describe('55 park place', () => {
  it('has its outline on the lidar walls, the glass behind the precast on park place', () => {
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    expect(Math.min(...xs)).toBe(GLASS)
    expect(Math.max(...xs)).toBe(EAST)
    expect(Math.min(...zs)).toBe(NORTH)
    expect(Math.max(...zs)).toBe(SOUTH)
    expect(WEST).toBeLessThan(GLASS)
    // the doors between the wings
    expect(pts.filter((p) => p.x === DOORS).map((p) => p.z)).toEqual([NOTCH[1], NOTCH[0]])
    expect(p55.door![0]).toBe(DOORS)
    expect(p55.door![1]).toBeGreaterThan(NOTCH[0])
    expect(p55.door![1]).toBeLessThan(NOTCH[1])
  })

  it('stands on the park place terrace, the roof and penthouse where the lidar has them', () => {
    expect(baseOf(p55)).toBeCloseTo(fromElevation(321.7))
    expect(floorOf(p55)).toBeCloseTo(baseOf(p55))
    expect(321.7 + ROOF).toBeCloseTo(400.1, 1)
    expect(321.7 + PENTHOUSE.top).toBeCloseTo(406.1, 1)
    expect(p55.height).toBe(PENTHOUSE.top)
  })

  it('has 19 floors, the middle stepping back on the top four like the lidar', () => {
    expect(level(19) + 4).toBeLessThan(ROOF)
    // lidar: the steps' tops at 383.5, 387.5, 391.5, 395.4m, 1.5m apart from x -196
    const tops = [383.5, 387.5, 391.5, 395.4]
    tops.forEach((t, i) => {
      expect(321.7 + level(16 + i)).toBeGreaterThan(t - 1)
      expect(321.7 + level(16 + i)).toBeLessThan(t)
      expect(middleAt(16 + i)).toBeCloseTo(-194.5 + i * 1.5)
    })
    expect(middleAt(15)).toBe(-196)
    expect(LOBBY).toBeGreaterThan(5)
  })

  it('keeps the penthouse on the roof', () => {
    for (const x of PENTHOUSE.x)
      for (const z of PENTHOUSE.z) expect(pointInPolygon({ x, z }, pts)).toBe(true)
  })

  it('is a tower of a few parts and not too many triangles', () => {
    expect(Object.keys(parts).length).toBeLessThanOrEqual(5)
    const tris = Object.values(parts).reduce((n, g) => n + g.getAttribute('position').count / 3, 0)
    expect(tris).toBeLessThan(12000)
  })

  it('has its 55 over the doors and plain blue banners', () => {
    // on the band over the two floor glass lobby, well over the canopy (lidar 326.5m)
    const sign = signs.find((s) => s.text === '55')!
    expect(sign.y).toBeGreaterThan(ENTRANCE)
    expect(ENTRANCE).toBeGreaterThan(326.5 - 321.7 + 3)
    // no logo anywhere
    expect(signs.filter((s) => !s.text).every((s) => s.plate === '#1f4fa8')).toBe(true)
  })
})
