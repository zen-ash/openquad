import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  ANNEX,
  BAND,
  BAYS,
  EAST,
  FIN,
  FLOORS,
  GROUND,
  NORTH,
  SOUTH,
  STOREY,
  TOP,
  WEST,
  piedmont75Geometry,
  type Piedmont75Data,
} from './piedmont75'

const b = campus.buildings.find((x) => x.name === '75 Piedmont Avenue') as Piedmont75Data
const pts = b.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = piedmont75Geometry(b)

describe('75 piedmont', () => {
  it('keeps its place in the list', () => {
    expect(campus.buildings.findIndex((x) => x.name === '75 Piedmont Avenue')).toBe(53)
  })

  it('has the tower on the lidar walls, 22m by 70m', () => {
    expect(EAST - WEST).toBeCloseTo(21.8, 1)
    expect(SOUTH - NORTH).toBeCloseTo(70, 1)
    expect(Math.min(...pts.map((p) => p.x))).toBe(WEST)
    expect(Math.max(...pts.map((p) => p.z))).toBe(SOUTH)
    expect(Math.max(...pts.map((p) => p.x))).toBe(ANNEX.x[1])
  })

  it('is 51.5m to the top of the band over the lobby floor', () => {
    expect(b.height).toBe(TOP)
    // lidar: the band's top 355.3m, the lobby on j deck's roof 303.8
    expect(303.8 + TOP).toBeCloseTo(355.3, 1)
    expect(floorOf(b)).toBeCloseTo(fromElevation(303.8))
    expect(baseOf(b)).toBeCloseTo(floorOf(b))
  })

  it('fits 12 floors of windows between the ground floor and the band', () => {
    expect(GROUND + FLOORS * STOREY).toBeLessThanOrEqual(BAND[0])
    expect(BAND[0] - (GROUND + FLOORS * STOREY)).toBeLessThan(1)
    expect((SOUTH - NORTH) / BAYS).toBeCloseTo(3.18, 1)
  })

  it('has its door on piedmont ave facing out', () => {
    const [x, z, nx, nz] = b.door!
    expect(x).toBe(WEST)
    expect(nx).toBe(-1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stays near its outline but for the canopies', () => {
    for (const geo of Object.values(parts)) {
      geo.computeBoundingBox()
      const box = geo.boundingBox!
      expect(box.min.x).toBeGreaterThan(301.5)
      expect(box.max.x).toBeLessThan(354.1)
      expect(box.min.z).toBeGreaterThan(-309.1)
      expect(box.max.z).toBeLessThan(SOUTH + FIN + 0.1)
      expect(box.max.y).toBeLessThan(TOP + 0.01)
    }
  })

  it('has gsu on the band and a blue square where the logo is', () => {
    const words = signs.filter((s) => s.text).map((s) => s.text)
    expect(words.join(' ')).toBe('GEORGIA STATE UNIVERSITY')
    expect(signs.filter((s) => s.text === '' && s.plate === '#1f4b99')).toHaveLength(2)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((x) => !x.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 5 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(5)
    expect(triangles).toBeLessThan(8000)
  })
})
