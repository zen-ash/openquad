import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import {
  BACK,
  BRICK,
  ENTRANCE,
  GLASS,
  LOW,
  NORTH,
  PENTHOUSE,
  SOUTH,
  TALL_BACK,
  courtlandBuildingGeometry,
  wingWalls,
  type CourtlandBuildingData,
} from './courtlandBuilding'
import { VIADUCT, courtlandFrame } from './courtlandNorth'
import { buildingsGeometry } from './geometry'

const cb = campus.buildings.find((b) => b.name === 'Courtland Building') as CourtlandBuildingData
const { parts, signs } = courtlandBuildingGeometry(cb)
const { uvOf } = courtlandFrame(cb)
const pts = cb.points.map(([x, z]) => ({ x: x!, z: z! }))
const uvs = pts.map(uvOf)

describe('courtland building', () => {
  it('has the two storey part as its outline: the front on the glass, the entrance notch', () => {
    const us = uvs.map(([u]) => u)
    const vs = uvs.map(([, v]) => v)
    expect(Math.min(...us)).toBeCloseTo(GLASS, 1)
    expect(Math.max(...us)).toBeCloseTo(TALL_BACK, 1)
    expect(Math.min(...vs)).toBeCloseTo(NORTH, 1)
    expect(Math.max(...vs)).toBeCloseTo(SOUTH, 1)
    expect(uvs.filter(([u]) => Math.abs(u - ENTRANCE.back) < 0.02)).toHaveLength(2)
    // the brick stands 10cm out in front of it
    expect(GLASS - BRICK).toBeCloseTo(0.1, 2)
  })

  it('walls in the low part behind it, low enough to hide behind the viaduct parapet', () => {
    expect(LOW.sides).toBeLessThan(VIADUCT.top)
    const walls = wingWalls(cb)
    // from the outline's back corners round to the drive and back
    const ends = [walls[0]!, walls.at(-1)!].map((w, i) =>
      i ? { x: w.bx, z: w.bz } : { x: w.ax, z: w.az },
    )
    for (const e of ends)
      expect(pts.some((p) => Math.hypot(p.x - e.x, p.z - e.z) < 0.02)).toBe(true)
    for (const w of walls) {
      const [u] = uvOf({ x: (w.ax + w.bx) / 2, z: (w.az + w.bz) / 2 })
      expect(u).toBeGreaterThan(TALL_BACK)
      expect(u).toBeLessThanOrEqual(BACK + 5.5)
    }
  })

  it('is 11m to the penthouse, not overture 16.8 (that was from the drive)', () => {
    expect(cb.height).toBe(11)
    expect(PENTHOUSE.top).toBe(cb.height)
  })

  it('has its door at the back of the entrance under the name, facing courtland st', () => {
    const [x, z, nx, nz] = cb.door!
    const [u, v] = uvOf({ x: x!, z: z! })
    expect(u).toBeCloseTo(ENTRANCE.back, 1)
    expect(v).toBeCloseTo((ENTRANCE.v[0] + ENTRANCE.v[1]) / 2, 1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('has the name over the entrance', () => {
    expect(signs.map((s) => s.text)).toContain('COURTLAND BUILDING')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 3k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(3000)
  })
})
