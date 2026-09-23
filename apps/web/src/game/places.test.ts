import { describe, expect, it } from 'vitest'
import { pointInPolygon } from './collision'
import { arrivalSpot, places } from './places'
import { world } from './world'

describe('places', () => {
  it('found all the buildings in the map data', () => {
    expect(places).toHaveLength(11)
  })

  it.each(places.map((p) => [p.label, p]))('%s is not inside a building', (_, place) => {
    for (const b of world.buildings) expect(pointInPolygon(place.spot, b.points)).toBe(false)
  })

  it('spreads people out a bit around the spot', () => {
    const spot = places[0]!.spot
    const a = arrivalSpot(spot, () => 0.1)
    const b = arrivalSpot(spot, () => 0.7)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1)
    for (const p of [a, b]) expect(Math.hypot(p.x - spot.x, p.z - spot.z)).toBeLessThan(3)
  })
})
