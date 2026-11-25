import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  BACK,
  EAST,
  EAST_TOP,
  ENTRANCE,
  FACE,
  FRONT,
  FRONT_BAYS,
  PARAPET,
  ROOF,
  ROWS,
  SPLIT,
  TUCK,
  WEST,
  WEST_BAYS,
  edgewood58Geometry,
  type Edgewood58Data,
} from './edgewood58'
import { buildingsGeometry } from './geometry'

const e58 = campus.buildings.find((b) => b.name === '58 Edgewood') as Edgewood58Data
const pts = e58.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = edgewood58Geometry(e58)

describe('58 edgewood', () => {
  it('has its outline on the lidar walls, the east block tucked in at the bottom', () => {
    const xs = pts.map((p) => p.x)
    const zs = pts.map((p) => p.z)
    expect(Math.min(...xs)).toBe(WEST)
    expect(Math.max(...xs)).toBe(EAST)
    expect(Math.min(...zs)).toBe(BACK)
    expect(Math.max(...zs)).toBe(FRONT)
    // the front's glass is behind the marble, the tucked in part further back
    expect(FRONT).toBeLessThan(FACE)
    expect(pts.filter((p) => p.z === TUCK)).toHaveLength(2)
    // t deck's side is 0.3m off
    const deck = campus.buildings.find((b) => b.name === 'T Deck')!
    const deckWest = Math.min(...deck.points.filter(([, z]) => z! > -50).map(([x]) => x!))
    expect(deckWest - EAST).toBeGreaterThan(0.2)
    expect(deckWest - EAST).toBeLessThan(0.5)
  })

  it('is 28.3m to the top of the stair tower, the warehouse lower', () => {
    expect(e58.height).toBe(28.3)
    expect(EAST_TOP).toBeLessThan(e58.height)
    expect(PARAPET).toBeLessThan(EAST_TOP)
    // the lidar: the warehouse's parapet at 329.7m, the east block's at 339.0
    expect(314.4 + PARAPET).toBeCloseTo(329.7, 1)
    expect(314.4 + EAST_TOP).toBeCloseTo(339, 0)
  })

  it('has three rows of windows under the roof', () => {
    for (let i = 1; i < ROWS.length; i++) expect(ROWS[i]![0]).toBeGreaterThan(ROWS[i - 1]![1])
    expect(ROWS.at(-1)![1]).toBeLessThan(ROOF)
  })

  it('fits eight bays on edgewood ave and nine on equitable pl', () => {
    expect(FRONT_BAYS).toHaveLength(8)
    expect(FRONT_BAYS[0]![0]).toBeGreaterThan(WEST + 2)
    expect(SPLIT - FRONT_BAYS.at(-1)![1]).toBeGreaterThan(1)
    expect(WEST_BAYS).toHaveLength(9)
    expect(WEST_BAYS[0]![0]).toBeGreaterThan(BACK)
    expect(WEST_BAYS.at(-1)![1]).toBeLessThan(FACE)
    for (const bays of [FRONT_BAYS, WEST_BAYS])
      for (let i = 1; i < bays.length; i++) expect(bays[i]![0]).toBeGreaterThan(bays[i - 1]![1])
  })

  it('has its door at the corner entrance, facing edgewood ave', () => {
    const [x, z, nx, nz] = e58.door!
    expect(z).toBe(FRONT)
    expect(x).toBeGreaterThan(ENTRANCE[0])
    expect(x).toBeLessThan(ENTRANCE[1])
    expect(nz).toBe(1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the sidewalk at the corner door and reaches under the ground all round', () => {
    expect(floorOf(e58)).toBeCloseTo(fromElevation(314.4))
    expect(baseOf(e58)).toBeCloseTo(floorOf(e58))
    // edgewood ave falls 2m to t deck
    expect(lowestUnder(e58.points) - floorOf(e58)).toBeLessThan(-1.5)
  })

  it('stays inside its outline but for the canopy and the sign box', () => {
    for (const geo of Object.values(parts)) {
      geo.computeBoundingBox()
      const box = geo.boundingBox!
      expect(box.min.x).toBeGreaterThan(WEST - 0.3)
      expect(box.max.x).toBeLessThan(EAST + 0.01)
      expect(box.min.z).toBeGreaterThan(BACK - 0.01)
      expect(box.max.z).toBeLessThan(FACE + 1.6)
    }
  })

  it('has a blue square where the logo is and the address over the door', () => {
    expect(signs.some((s) => s.text === '' && s.plate)).toBe(true)
    expect(signs.map((s) => s.text)).toContain('58 Edgewood Ave.')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 10k triangles in 7 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(7)
    expect(triangles).toBeLessThan(10_000)
  })
})
