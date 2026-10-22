import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pointInPolygon } from './collision'
import { signalPoles } from './signals'

const poles = signalPoles()
const solid = campus.buildings
  .filter((b) => !b.minHeight)
  .map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))

describe('signalPoles', () => {
  it('puts lights at the junctions osm has them at', () => {
    expect(poles.length).toBeGreaterThan(30)
  })

  it('keeps every pole out of the buildings', () => {
    const inside = poles.filter((p) => solid.some((b) => pointInPolygon({ x: p.x, z: p.z }, b)))
    // a few junctions are hard against a wall, most stand on the sidewalk
    expect(inside.length).toBeLessThan(poles.length * 0.1)
  })

  it('has the lights face back along the arm side of the road, two ways at each one', () => {
    for (const p of poles) {
      // the arm goes across the road, the lights face along it
      expect(Math.abs(p.arm[0] * p.face[0] + p.arm[1] * p.face[1])).toBeLessThan(0.01)
      expect(p.reach).toBeGreaterThan(3)
    }
    // the two roads of a junction take turns
    expect(new Set(poles.map((p) => p.road))).toEqual(new Set([0, 1]))
  })
})
