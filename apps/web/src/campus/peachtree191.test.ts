import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { landmarkGeometry } from './landmarks'
import {
  BASE,
  CROWNS,
  DATUM,
  FLOORS,
  MID,
  PARAPET,
  PITCH,
  PLAN,
  TEMPLE,
  type PeachtreeData,
} from './peachtree191'

const tower = campus.buildings.find((b) => b.name === '191 Peachtree Tower') as PeachtreeData
const { parts, inside, signs } = landmarkGeometry(tower)!
const pts = tower.points.map(([x, z]) => ({ x: x!, z: z! }))
const box = (part: string) => {
  const g = parts[part]!
  g.computeBoundingBox()
  return g.boundingBox!
}

describe('191 peachtree tower', () => {
  it('has two towers and a link, every corner notched, inside the outline', () => {
    expect(PLAN).toHaveLength(20)
    const xs = PLAN.map((p) => p[0])
    const zs = PLAN.map((p) => p[1])
    // each corner moved a hair toward the middle
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2
    for (const [x, z] of PLAN)
      expect(
        pointInPolygon({ x: x + Math.sign(mx - x) * 0.05, z: z + Math.sign(MID - z) * 0.05 }, pts),
      ).toBe(true)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(76.7)
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(36.8)
    // a crown over the middle of each tower's bay faces (the north and south ones)
    const bays = PLAN.filter(([, z]) => z === Math.min(...zs)).map(([x]) => x)
    expect(bays).toHaveLength(4)
    CROWNS.forEach((cx, i) => {
      expect(Math.abs((bays[i * 2]! + bays[i * 2 + 1]!) / 2 - cx)).toBeLessThan(0.5)
    })
    expect((Math.min(...zs) + Math.max(...zs)) / 2).toBeCloseTo(MID)
  })

  it('stands on peachtree center ave, 50 floors to the parapet', () => {
    expect(baseOf(tower)).toBeCloseTo(fromElevation(DATUM))
    expect(DATUM + FLOORS * PITCH).toBeCloseTo(PARAPET, 0)
    expect(BASE).toBeLessThan(PARAPET)
    let low = Infinity
    for (const g of Object.values(parts)) {
      g.computeBoundingBox()
      low = Math.min(low, g.boundingBox!.min.y)
    }
    expect(low + baseOf(tower)).toBeLessThan(lowestUnder(tower.points))
  })

  it('has its crowns to 552.3m, not the old flat top 8m over them', () => {
    expect(box('crown').max.y + baseOf(tower)).toBeCloseTo(fromElevation(TEMPLE.top), 1)
    expect(box('granite').max.y).toBeLessThan(box('crown').max.y)
    expect(tower.height).toBeCloseTo(TEMPLE.top - DATUM, 0)
  })

  it('has no door, no inside and no signs', () => {
    expect((tower as { door?: number[] }).door).toBeUndefined()
    expect(inside.solid.length + inside.glass.length).toBe(0)
    expect(signs).toHaveLength(0)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 3 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(3)
    expect(triangles).toBeLessThan(8_000)
  })
})
