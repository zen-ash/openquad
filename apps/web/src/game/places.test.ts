import { describe, expect, it } from 'vitest'
import { pointInPolygon, polygon } from './collision'
import { arrivalSpot, places } from './places'
import campus from '../campus/campus.json'

// every building's real outline. the collision world only has walls for the ones you
// can walk into, which wouldn't catch a spot inside one of those
const outlines = campus.buildings.map((b) => polygon(b.points as [number, number][]))

describe('places', () => {
  it('found all the buildings in the map data', () => {
    expect(places).toHaveLength(11)
  })

  it.each(places.map((p) => [p.label, p]))('%s is not inside a building', (_, place) => {
    for (const b of outlines) expect(pointInPolygon(place.spot, b.points)).toBe(false)
  })

  it('spreads people out a bit around the spot', () => {
    const spot = places[0]!.spot
    const a = arrivalSpot(spot, () => 0.1)
    const b = arrivalSpot(spot, () => 0.7)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1)
    for (const p of [a, b]) expect(Math.hypot(p.x - spot.x, p.z - spot.z)).toBeLessThan(3)
  })
})
