import { describe, expect, it } from 'vitest'
import { pointInPolygon } from './collision'
import { places } from './places'
import { world } from './world'

describe('places', () => {
  it('found all the buildings in the map data', () => {
    expect(places).toHaveLength(11)
  })

  it.each(places.map((p) => [p.label, p]))('%s is not inside a building', (_, place) => {
    for (const b of world.buildings) expect(pointInPolygon(place.spot, b.points)).toBe(false)
  })
})
