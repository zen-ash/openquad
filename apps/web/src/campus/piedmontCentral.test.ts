import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BAY,
  BLUE,
  CORNER,
  FACES,
  PARAPET,
  ROOF,
  TALL,
  WIN,
  piedmontCentralGeometry,
  type PiedmontCentralData,
} from './piedmontCentral'

const pc = campus.buildings.find((b) => b.name === 'Piedmont Central') as PiedmontCentralData
const pts = pc.points.map(([x, z]) => ({ x: x!, z: z! }))
const upper = pc.landmark!.upper!.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = piedmontCentralGeometry(pc)

describe('piedmont central', () => {
  it('is as tall as the lidar says', () => {
    // parapets 344.1m, the corner block and the stair towers 347.3, over the court at 305.4
    expect(305.4 + PARAPET).toBeCloseTo(344.1, 0)
    expect(305.4 + TALL).toBeCloseTo(347.3, 0)
    expect(pc.height).toBe(TALL)
    expect(ROOF).toBeLessThan(PARAPET)
  })

  it('has a face plan for every face of the tower', () => {
    expect(FACES).toHaveLength(upper.length)
  })

  it('keeps the dining hall out of the tower but in the ground floor', () => {
    const hall = { x: 235, z: -285 }
    expect(pointInPolygon(hall, pts)).toBe(true)
    expect(pointInPolygon(hall, upper)).toBe(false)
    // the court west of it is open
    expect(pointInPolygon({ x: 210, z: -285 }, pts)).toBe(false)
    // the corner block is part of the tower
    const corner = { x: (CORNER.x[0] + CORNER.x[1]) / 2, z: (CORNER.z[0] + CORNER.z[1]) / 2 }
    expect(pointInPolygon(corner, upper)).toBe(true)
  })

  it('has its door at the back of the court, next to the core', () => {
    const [x, z, nx, nz] = pc.door!
    expect(z).toBeCloseTo(-295.7)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the court', () => {
    expect(floorOf(pc)).toBeCloseTo(fromElevation(305.4))
    expect(baseOf(pc)).toBeCloseTo(floorOf(pc))
  })

  it('fits four stripes on the court back wall west of the core', () => {
    // 23.6m from the west wing to the core, a window each side of every stripe
    expect(Math.round(23.6 / BAY)).toBe(4)
    expect(BLUE + 2 * WIN).toBeLessThan(23.6 / 4)
  })

  it('has a plain blue square where the logo is, no logo', () => {
    const squares = signs.filter((s) => !s.text && s.plate === '#2f5aa8')
    expect(squares.length).toBeGreaterThanOrEqual(1)
    expect(signs.some((s) => s.text === 'PIEDMONT CENTRAL')).toBe(true)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 6 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts).length).toBeLessThanOrEqual(6)
    expect(triangles).toBeLessThan(8000)
  })
})
