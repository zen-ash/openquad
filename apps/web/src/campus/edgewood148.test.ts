import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  ARCH,
  ATTIC,
  BACK,
  CORNICE,
  CX,
  DOOR,
  EAST,
  FACE,
  FRONT,
  LINE,
  LOW_ROOF,
  LOW_TOP,
  ROOF,
  TOP,
  UPPER_WIN,
  WEST,
  edgewood148Geometry,
  type Edgewood148Data,
} from './edgewood148'
import { buildingsGeometry } from './geometry'

const e148 = campus.buildings.find((b) => b.name === '148 Edgewood') as Edgewood148Data
const pts = e148.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts } = edgewood148Geometry(e148)

describe('148 edgewood', () => {
  it('has its outline on the lidar walls, the brick in front of the glass', () => {
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    expect(Math.min(...xs)).toBe(WEST)
    expect(Math.max(...xs)).toBe(LINE)
    expect(EAST - LINE).toBeLessThan(0.7)
    expect(Math.min(...zs)).toBe(BACK)
    expect(Math.max(...zs)).toBe(FRONT)
    expect(FACE).toBeGreaterThan(FRONT)
    // the greek housing next door keeps its wall
    const greek = campus.buildings.filter((b) => b.name === 'Greek Housing')
    for (const g of greek)
      for (const [x, z] of g.points)
        expect(pointInPolygon({ x: x! - 0.01, z: z! }, pts)).toBe(false)
  })

  it('leaves the edgewood ave sidewalk in one piece', () => {
    const walk = campus.paths.find((p) =>
      p.points.some(([x, z]) => Math.abs(x! - 176.8) < 0.1 && Math.abs(z! + 38.8) < 0.1),
    )!
    expect(walk.points.some(([x]) => x! > LINE)).toBe(true)
  })

  it('is 15.95m to the parapet, the east strip lower', () => {
    expect(e148.height).toBe(TOP)
    expect(ROOF).toBeLessThan(TOP)
    expect(LOW_TOP).toBeLessThan(ROOF)
    expect(LOW_ROOF).toBeLessThan(LOW_TOP)
    // the lidar: parapet 319.85m, the east strip's roof 316.5
    expect(303.9 + TOP).toBeCloseTo(319.85, 1)
    expect(303.9 + LOW_ROOF).toBeCloseTo(316.5, 1)
  })

  it('stacks the front: windows, the arch, the cornice, the top floor', () => {
    expect(ARCH.spring + ARCH.outer).toBeLessThan(CORNICE[0])
    expect(UPPER_WIN[1]).toBeLessThan(CORNICE[0])
    expect(ATTIC[0]).toBeGreaterThanOrEqual(CORNICE[1])
    expect(ATTIC[1]).toBeLessThan(ROOF)
    expect(DOOR[1]).toBeLessThan(ARCH.spring)
  })

  it('has its door in the middle of the front, facing edgewood ave', () => {
    const [x, z, nx, nz] = e148.door!
    expect(z).toBe(FRONT)
    expect(x).toBeCloseTo(CX, 1)
    expect(nz).toBe(1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the sidewalk at the door and reaches under the ground all round', () => {
    expect(floorOf(e148)).toBeCloseTo(fromElevation(303.9))
    expect(baseOf(e148)).toBeCloseTo(floorOf(e148))
    // the drive behind it is lower
    expect(lowestUnder(e148.points) - floorOf(e148)).toBeLessThan(-0.5)
  })

  it('stays inside its outline but for the front and the coping', () => {
    for (const geo of Object.values(parts)) {
      geo.computeBoundingBox()
      const box = geo.boundingBox!
      expect(box.min.x).toBeGreaterThan(WEST - 0.1)
      expect(box.max.x).toBeLessThan(EAST + 0.1)
      expect(box.min.z).toBeGreaterThan(BACK - 0.1)
      expect(box.max.z).toBeLessThan(FACE + 0.65)
      expect(box.max.y).toBeLessThan(TOP + 0.5)
    }
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 6 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(6)
    expect(triangles).toBeLessThan(8_000)
  })
})
