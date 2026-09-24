import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pointInPolygon } from './collision'
import { alongLine, benches, bins, parkLamps, streetLights } from './streetFurniture'

const hurtPark = campus.areas
  .find((a) => a.name === 'Hurt Park')!
  .points.map(([x, z]) => ({
    x: x!,
    z: z!,
  }))
const buildings = campus.buildings.map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))

describe('street furniture', () => {
  it('spaces things along a line, off to the side, facing it', () => {
    const spots = alongLine(
      [
        { x: 0, z: 0 },
        { x: 20, z: 0 },
      ],
      10,
      2,
      5,
    )
    expect(spots.map((s) => s.x)).toEqual([5, 15])
    // every other one on the other side
    expect(Math.abs(spots[0]!.z)).toBeCloseTo(2)
    expect(spots[0]!.z).toBeCloseTo(-spots[1]!.z)
    // facing the line: its front (+z before turning) points back at z = 0
    const s = spots[0]!
    expect(s.z + Math.cos(s.rot) * 2).toBeCloseTo(0)
  })

  it('puts benches along the paths in hurt park', () => {
    expect(benches.filter((b) => pointInPolygon(b, hurtPark)).length).toBeGreaterThan(5)
  })

  it('keeps benches, bins and lamps out of buildings', () => {
    for (const s of [...benches, ...bins, ...parkLamps, ...streetLights])
      expect(buildings.some((b) => pointInPolygon(s, b))).toBe(false)
  })

  it('lights the streets', () => {
    expect(streetLights.length).toBeGreaterThan(200)
  })
})
