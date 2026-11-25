import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BACK,
  BLOCK,
  CORNICE,
  CREAM_BAYS,
  DOOR_BAY,
  EAST,
  FACE,
  FRONT,
  FRONT_BAYS,
  PARTY,
  PIER_TOP,
  ROOF,
  ROWS,
  SIDE_ROWS,
  WEST,
  studentSuccessGeometry,
  type StudentSuccessData,
} from './studentSuccess'

const ssc = campus.buildings.find((b) => b.name === 'Student Success Center') as StudentSuccessData
const pts = ssc.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = studentSuccessGeometry(ssc)

describe('student success center', () => {
  it('took the old bell building box, renamed', () => {
    expect(campus.buildings[197]!.name).toBe('Student Success Center')
    expect(campus.buildings.some((b) => b.name === 'Bell Building')).toBe(false)
  })

  it('has its outline on the lidar walls, clear of t deck and 58 edgewood', () => {
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    expect(Math.min(...xs)).toBe(WEST)
    expect(Math.max(...xs)).toBe(EAST)
    expect(Math.min(...zs)).toBe(FRONT)
    expect(Math.max(...zs)).toBe(BACK)
    // the glass is behind the stone
    expect(FACE).toBeLessThan(FRONT)
    // t deck's round stair is just east, 58 edgewood across the alley
    const deck = campus.buildings.find((b) => b.name === 'T Deck')!
    const stair = Math.min(...deck.points.filter(([, z]) => z! < -134).map(([x]) => x!))
    expect(stair - EAST).toBeGreaterThan(0.2)
    const e58 = campus.buildings.find((b) => b.name === '58 Edgewood')!
    expect(Math.min(...e58.points.map(([, z]) => z!)) - BACK).toBeGreaterThan(3)
  })

  it('is 18.3m to the cornice, the elevator penthouse on top', () => {
    // the lidar: the cornice's top 336.36m, the elevator 342.3. the 1922 piers go higher
    expect(318.1 + CORNICE[1]).toBeCloseTo(336.4, 0)
    expect(PIER_TOP).toBeGreaterThan(CORNICE[1])
    expect(318.1 + ssc.height).toBeCloseTo(342.3, 1)
    expect(ROOF).toBeLessThan(CORNICE[1])
    expect(ROWS.at(-1)![1]).toBeLessThan(CORNICE[0])
    expect(SIDE_ROWS.at(-1)![1]).toBeLessThan(ROOF)
  })

  it('fits four bays on the 1907 front and three on the 1922 one', () => {
    expect(FRONT_BAYS).toHaveLength(4)
    expect(FRONT_BAYS[0]![0]).toBeGreaterThan(WEST)
    expect(FRONT_BAYS.at(-1)![1]).toBeLessThan(PARTY)
    expect(CREAM_BAYS).toHaveLength(3)
    expect(CREAM_BAYS[0]![0]).toBeGreaterThan(PARTY)
    expect(CREAM_BAYS.at(-1)![1]).toBeLessThan(EAST)
    expect(BLOCK).toBeGreaterThan(FACE)
    expect(BLOCK).toBeLessThan(BACK)
  })

  it('has its door in the 1907 building east bay, facing auburn ave', () => {
    const [x, z, nx, nz] = ssc.door!
    expect(z).toBe(FRONT)
    expect(x).toBeGreaterThan(DOOR_BAY[0] + 0.5)
    expect(x).toBeLessThan(DOOR_BAY[1] - 0.5)
    expect(nz).toBe(-1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the auburn ave sidewalk at the door, equitable pl lower behind', () => {
    expect(floorOf(ssc)).toBeCloseTo(fromElevation(318.1))
    expect(baseOf(ssc)).toBeCloseTo(floorOf(ssc))
    expect(lowestUnder(ssc.points) - floorOf(ssc)).toBeLessThan(-1)
  })

  it('stays inside its outline but for the cornice, the trim and the sign pole', () => {
    for (const geo of Object.values(parts)) {
      geo.computeBoundingBox()
      const box = geo.boundingBox!
      expect(box.min.x).toBeGreaterThan(WEST - 0.9)
      expect(box.max.x).toBeLessThan(EAST + 0.01)
      expect(box.min.z).toBeGreaterThan(FACE - 2.5)
      expect(box.max.z).toBeLessThan(BACK + 0.01)
    }
  })

  it('has the address on the frieze and the blue sign without a logo', () => {
    expect(signs.map((s) => s.text)).toContain('25-27 AUBURN AVENUE')
    expect(signs.filter((s) => s.plate && s.text.includes('SUCCESS'))).toHaveLength(2)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 7 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(7)
    expect(triangles).toBeLessThan(8000)
  })
})
