import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  ATRIUM_IN,
  CORNER,
  DRUM_TOP,
  E,
  N,
  PARAPET,
  ROOF,
  S,
  TOWER,
  TOWER_TOP,
  W,
  centennialHallGeometry,
  type CentennialHallData,
} from './centennialHall'

const hall = campus.buildings.find((b) => b.name === 'Centennial Hall') as CentennialHallData
const pts = hall.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = centennialHallGeometry(hall)

describe('centennial hall', () => {
  it('keeps its place in the list as a gsu building', () => {
    expect(campus.buildings[91]!.name).toBe('Centennial Hall')
    expect(campus.buildings[91]!.gsu).toBe(true)
  })

  it('has its outline on the lidar box with the drum in front on auburn ave', () => {
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    expect(Math.min(...xs)).toBe(W)
    expect(Math.max(...xs)).toBe(E)
    // the north side's glass is 2m in under the floors over it
    expect(Math.min(...zs)).toBeCloseTo(N + 2, 5)
    // the drum reaches out past the face to -164
    expect(Math.max(...zs)).toBeGreaterThan(S + 13)
    expect(E - W).toBeCloseTo(65.3, 1)
  })

  it('is as tall as the lidar says', () => {
    expect(hall.height).toBe(PARAPET)
    expect(307.5 + ROOF).toBeCloseTo(326.4, 1)
    expect(307.5 + PARAPET).toBeCloseTo(327.5, 1)
    expect(307.5 + TOWER_TOP).toBeCloseTo(328.1, 1)
    expect(307.5 + DRUM_TOP).toBeCloseTo(313.3, 1)
  })

  it('has its door in the atrium glass, between the corner block and the tower', () => {
    const [x, z, nx, nz] = hall.door!
    expect(z).toBe(ATRIUM_IN)
    expect(x).toBeGreaterThan(CORNER)
    expect(x).toBeLessThan(TOWER[0])
    expect([nx, nz]).toEqual([0, 1])
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the plaza, auburn ave lower in front of it', () => {
    expect(floorOf(hall)).toBeCloseTo(fromElevation(307.5))
    expect(baseOf(hall)).toBeCloseTo(floorOf(hall))
    expect(lowestUnder(hall.points) - floorOf(hall)).toBeLessThan(-1)
  })

  it('has the name over the atrium and a blue square where the logo is', () => {
    expect(signs.map((s) => s.text)).toContain('GEORGIA STATE UNIVERSITY')
    expect(signs.some((s) => s.text === '' && s.plate === '#2453b8')).toBe(true)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 5 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(5)
    expect(triangles).toBeLessThan(8000)
  })
})
