import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BACK,
  BAND,
  DOORS,
  EAST,
  EAVE,
  FACE,
  FRONT,
  MIDDLE,
  PARAPET,
  RAISED,
  RIDGE,
  SIDES,
  STORE,
  WEST,
  WINDOWS,
  sculptureStudioGeometry,
  type SculptureStudioData,
} from './sculptureStudio'

const studio = campus.buildings.find((b) => b.name === 'Sculpture Studio') as SculptureStudioData
const pts = studio.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = sculptureStudioGeometry(studio)

describe('sculpture studio', () => {
  it('keeps its place in the list as a gsu building', () => {
    expect(campus.buildings[24]!.name).toBe('Sculpture Studio')
    expect(campus.buildings[24]!.gsu).toBe(true)
  })

  it('has its outline on the lidar walls, the storefront glass just behind the brick', () => {
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    expect(Math.min(...xs)).toBe(WEST)
    expect(Math.max(...xs)).toBe(EAST)
    expect(Math.min(...zs)).toBe(BACK)
    expect(Math.max(...zs)).toBe(FRONT)
    expect(FACE - FRONT).toBeCloseTo(0.15)
  })

  it('is 7.15m to the raised middle of its parapet, the roof under it', () => {
    expect(studio.height).toBe(RAISED)
    // the lidar: the parapet at 305.1m and 305.65 in the middle, the sides' coping 304.25
    expect(298.5 + PARAPET).toBeCloseTo(305.1, 1)
    expect(298.5 + RAISED).toBeCloseTo(305.65, 1)
    expect(298.5 + SIDES).toBeCloseTo(304.25, 1)
    expect(RIDGE.y).toBeLessThanOrEqual(PARAPET)
    expect(EAVE).toBeLessThan(SIDES)
    expect(MIDDLE[0]).toBeGreaterThan(WEST)
    expect(MIDDLE[1]).toBeLessThan(EAST)
  })

  it('fits three windows west of the doors and seven east of them', () => {
    expect(WINDOWS.filter(([, x1]) => x1 < DOORS[0])).toHaveLength(3)
    expect(WINDOWS.filter(([x0]) => x0 > DOORS[1])).toHaveLength(7)
    for (let i = 1; i < WINDOWS.length; i++)
      expect(WINDOWS[i]![0]).toBeGreaterThan(WINDOWS[i - 1]![1])
    expect(WINDOWS[0]![0]).toBeGreaterThan(STORE[0])
    expect(WINDOWS.at(-1)![1]).toBeLessThan(STORE[1])
    expect(BAND[1]).toBeLessThan(PARAPET)
  })

  it('has its door between the double doors, facing edgewood ave', () => {
    const [x, z, nx, nz] = studio.door!
    expect(z).toBe(FRONT)
    expect(x).toBeGreaterThan(DOORS[0])
    expect(x).toBeLessThan(DOORS[1])
    expect(nz).toBe(1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the sidewalk at the door and reaches under the ground at the back', () => {
    expect(floorOf(studio)).toBeCloseTo(fromElevation(298.5))
    expect(baseOf(studio)).toBeCloseTo(floorOf(studio))
    expect(lowestUnder(studio.points) - floorOf(studio)).toBeLessThan(-1)
  })

  it('stays inside its outline but for the fence on the drive', () => {
    for (const [name, geo] of Object.entries(parts)) {
      geo.computeBoundingBox()
      const box = geo.boundingBox!
      expect(box.min.x).toBeGreaterThan(name === 'fence' ? WEST - 9 : WEST - 0.1)
      expect(box.max.x).toBeLessThan(EAST + 0.1)
      expect(box.min.z).toBeGreaterThan(BACK - 0.1)
      expect(box.max.z).toBeLessThan(FACE + 0.3)
      expect(box.max.y).toBeLessThan(RAISED + 0.01)
    }
  })

  it('has a blue square where the logo is and its name and number', () => {
    expect(signs.some((s) => s.text === '' && s.plate === '#1f4b99')).toBe(true)
    expect(signs.map((s) => s.text)).toContain('SCULPTURE')
    expect(signs.map((s) => s.text)).toContain('246')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 4k triangles in 5 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(5)
    expect(triangles).toBeLessThan(4000)
  })
})
