import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  DEEP,
  LEDGE,
  PARAPET,
  PASSAGE,
  piers,
  RADIUS,
  ROWS,
  slits,
  TOWER_TOP,
  urbanLifeFrame,
  urbanLifeGeometry,
  WIDTH,
  WING,
  type UrbanLifeData,
} from './urbanLife'

const ul = campus.buildings.find((b) => b.name === 'Urban Life Building') as UrbanLifeData
const { parts, signs } = urbanLifeGeometry(ul)
const { f, A, L } = urbanLifeFrame(ul)
const pts = ul.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('urban life building', () => {
  it('is 54 by 27.5m between the towers, like on the satellite', () => {
    expect(L).toBeCloseTo(54.1, 0)
    expect(WIDTH).toBe(27.5)
    // the west tower from osm lands on the frame's short side
    const west = A(0, WIDTH)
    expect(pointInPolygon({ x: west.x, z: west.z }, pts)).toBe(true)
  })

  it('has seven floors over the glass floor and three under the ledge', () => {
    const over = ROWS.filter(([y0]) => y0 > DEEP[1])
    const under = ROWS.filter(([, y1]) => y1 <= LEDGE[0])
    expect(over).toHaveLength(7)
    expect(under).toHaveLength(3)
    expect(over.at(-1)![1]).toBeCloseTo(PARAPET)
    expect(ul.height).toBeCloseTo(50.8)
    // the rows don't overlap and each has a band under it
    for (let i = 1; i < ROWS.length; i++) expect(ROWS[i]![0]).toBeGreaterThan(ROWS[i - 1]![1])
    expect(TOWER_TOP).toBeGreaterThan(ul.height)
  })

  it('has three bays between two towers, a slit next to every pier', () => {
    const ps = piers(RADIUS, L / 2 - RADIUS)
    expect(ps).toHaveLength(4)
    const s = slits(RADIUS, L / 2 - RADIUS)
    // two next to the towers, two for each inside pier, one for each end pier
    expect(s).toHaveLength(2 + 2 * 2 + 2)
    for (const [a, b] of s) {
      expect(b).toBeGreaterThan(a)
      expect(ps.some(([p0, p1]) => a < p1 && b > p0)).toBe(false)
    }
  })

  it('has its door in the passage through the wing, by the plaza', () => {
    const [x, z, nx, nz] = ul.door!
    const door = { x: x!, z: z! }
    // in the passage's side toward the slab, facing into the passage
    expect(f.aOf(door)).toBeCloseTo(PASSAGE.to, 1)
    expect(nx! * -f.along.x + nz! * -f.along.z).toBeGreaterThan(0.99)
    // a few meters in from the plaza, under the name
    expect(WING.to + f.dOf(door)).toBeGreaterThan(2.4)
    expect(WING.to + f.dOf(door)).toBeLessThan(5)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('leaves the passage open, with the wing past it a building of its own', () => {
    const shapes = campus.buildings
      .filter((b) => !b.minHeight)
      .map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))
    const middle = A((PASSAGE.from + PASSAGE.to) / 2, (WING.from + WING.to) / 2)
    expect(shapes.some((s) => pointInPolygon(middle, s))).toBe(false)
    const wing = A((WING.end + PASSAGE.from) / 2, (WING.from + WING.to) / 2)
    expect(shapes.some((s) => pointInPolygon(wing, s))).toBe(true)
  })

  it('has the letters on the parapet and the name over the plaza doors', () => {
    expect(signs.filter((s) => s.text === 'GEORGIA STATE UNIVERSITY')).toHaveLength(2)
    expect(signs.filter((s) => s.text === 'GSU')).toHaveLength(2)
    for (const s of signs.filter((s) => s.letters)) {
      expect(s.y).toBeGreaterThan(PARAPET)
      expect(s.y).toBeLessThan(ul.height)
    }
    expect(signs.some((s) => s.text === 'URBAN LIFE CENTER')).toBe(true)
  })

  it('draws 140 decatur st with it', () => {
    const podium = campus.buildings.find(
      (b) => (b.landmark as { with?: string } | undefined)?.with === 'Urban Life Building',
    )
    expect(podium).toBeDefined()
    expect(podium!.height).toBeCloseTo(16.6)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 60k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(60_000)
  })
})
