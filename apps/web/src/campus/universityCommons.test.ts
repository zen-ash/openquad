import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { pt } from './landmark'
import {
  CUT,
  CYLINDER,
  DECK,
  TOWERS,
  lightFrom,
  roofOf,
  towerOf,
  universityCommonsGeometry,
  windowColumns,
  type CommonsData,
} from './universityCommons'

const uc = campus.buildings.find((b) => b.name === 'University Commons') as CommonsData
const outline = uc.points.map(pt)
const { parts } = universityCommonsGeometry(uc)
const area = (pts: { x: number; z: number }[]) =>
  Math.abs(
    pts.reduce(
      (a, p, i) => a + p.x * pts[(i + 1) % pts.length]!.z - pts[(i + 1) % pts.length]!.x * p.z,
      0,
    ),
  ) / 2

describe('university commons', () => {
  it('is four buildings of 15, 9, 12 and 8 floors to the lidar roofs', () => {
    const floors = (t: keyof typeof TOWERS) =>
      TOWERS[t].floors + (TOWERS[t].first > DECK - 0.1 ? 0 : 1)
    expect([floors('nw'), floors('sw'), floors('ne'), floors('se')]).toEqual([15, 9, 12, 8])
    // lidar 2018: 352.65, 335.0, 346.8 and 335.0m, over the corner's sidewalk (305.0)
    expect(305 + TOWERS.nw.roof).toBeCloseTo(352.65, 1)
    expect(305 + TOWERS.sw.roof).toBeCloseTo(335, 1)
    expect(305 + TOWERS.ne.roof).toBeCloseTo(346.8, 1)
    expect(305 + TOWERS.se.roof).toBeCloseTo(335, 1)
    expect(305 + DECK).toBeCloseTo(311.3, 1)
    expect(uc.height).toBe(TOWERS.nw.roof)
    // every top floor fits under its roof, the white top two floors start over the first ones
    for (const t of ['nw', 'sw', 'ne', 'se'] as const) {
      const { first, floors, floor, roof } = TOWERS[t]
      expect(first + floors * floor).toBeLessThanOrEqual(roof)
      expect(lightFrom(t)).toBeGreaterThan(first + (floors - 3) * floor)
    }
  })

  it('splits osm outline into the four roofs without losing or doubling any of it', () => {
    const roofs = (['nw', 'sw', 'ne', 'se'] as const).map((t) => roofOf(outline, t))
    const sum = roofs.reduce((a, r) => a + area(r), 0)
    expect(sum).toBeCloseTo(area(outline), 0)
    // each roof is the right building's
    roofs.forEach((r, i) => {
      const mid = {
        x: r.reduce((a, p) => a + p.x, 0) / r.length,
        z: r.reduce((a, p) => a + p.z, 0) / r.length,
      }
      expect(towerOf(mid)).toBe(['nw', 'sw', 'ne', 'se'][i])
    })
    // the two on piedmont ave are apart, the gap between them is outside
    expect(pointInPolygon({ x: 340, z: -398 }, outline)).toBe(false)
    expect(CUT.west).toBeGreaterThan(-403.6)
    expect(CUT.west).toBeLessThan(-389.2)
  })

  it('has its door in the cylinder on the corner, facing the corner', () => {
    const [x, z, nx, nz] = uc.door!
    expect(Math.hypot(x! - CYLINDER.c.x, z! - CYLINDER.c.z)).toBeCloseTo(CYLINDER.r, 0)
    expect(nx).toBeCloseTo(-0.71, 2)
    expect(nz).toBeCloseTo(0.71, 2)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, outline)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, outline)).toBe(true)
  })

  it('stands at the corner, the deck going on down to jesse hill jr dr', () => {
    expect(baseOf(uc)).toBeCloseTo(fromElevation(305))
    expect(floorOf(uc)).toBeCloseTo(baseOf(uc))
    parts.dark.computeBoundingBox()
    expect(parts.dark.boundingBox!.min.x).toBeGreaterThan(CUT.x - 0.1)
  })

  it('puts a window every 2.8m or so, none on the little jogs', () => {
    expect(windowColumns(1.2)).toEqual([])
    expect(windowColumns(4.7)).toHaveLength(1)
    expect(windowColumns(10.3)).toHaveLength(3)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 16k triangles in 8 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(8)
    expect(triangles).toBeLessThan(16_000)
  })
})
