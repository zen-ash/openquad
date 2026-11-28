import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import names from '../campus/places.json'
import { pointInPolygon, polygon } from './collision'
import { arrivalSpot, places, search, words } from './places'

// every building's real outline. the collision world only has walls for the ones you
// can walk into, which wouldn't catch a spot inside one of those
const outlines = campus.buildings.map((b) => polygon(b.points as [number, number][]))
const gsu = [...new Set(campus.buildings.filter((b) => b.gsu && b.door).map((b) => b.name!))]
const first = (text: string) => search(text)[0]?.label

describe('places', () => {
  it('has every gsu building you can walk into, and the parks', () => {
    for (const name of gsu) expect(places.map((p) => p.label)).toContain(name)
    expect(places.map((p) => p.label)).toContain('Hurt Park')
    expect(places.map((p) => p.label)).toContain('Panther Quad')
  })

  it.each(places.map((p) => [p.label, p]))('%s is not inside a building', (_, place) => {
    for (const b of outlines) expect(pointInPolygon(place.spot, b.points)).toBe(false)
  })

  it('only has short names for places that exist', () => {
    for (const label of Object.keys(names)) expect(places.map((p) => p.label)).toContain(label)
  })

  it('spreads people out a bit around the spot', () => {
    const spot = places[0]!.spot
    const a = arrivalSpot(spot, () => 0.1)
    const b = arrivalSpot(spot, () => 0.7)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1)
    for (const p of [a, b]) expect(Math.hypot(p.x - spot.x, p.z - spot.z)).toBeLessThan(3)
  })
})

describe('search', () => {
  it.each(gsu)('finds %s by its full name', (name) => {
    expect(first(name)).toBe(name)
    expect(first(name.toUpperCase())).toBe(name)
  })

  // a short name, or one of the name's own words, that has it in the first few results
  // ("courtland" is both courtland buildings)
  it.each(gsu)('finds %s by a short name', (name) => {
    const tries = [...((names as Record<string, string[]>)[name] ?? []), ...words(name)]
    const top = (t: string) =>
      search(t)
        .slice(0, 3)
        .map((p) => p.label)
    expect(tries.some((t) => top(t).includes(name))).toBe(true)
  })

  it.each([
    ['sce', 'Student Center East'],
    ['a&h', 'Arts & Humanities'],
    ['a and h', 'Arts & Humanities'],
    ['rec', 'Student Recreation Center'],
    ['langdale', 'Langdale Hall'],
    ['library', 'Library North'],
    ['commons', 'University Commons'],
    ['law school', 'College of Law'],
    ['arena', 'GSU Sports Arena'],
    ['dining', 'Piedmont North Dining Hall'],
    ['coe', 'College of Education & Human Development'],
    ['petit', 'Petit Science Center'],
    ['aderhold', 'Helen M. Aderhold Learning Center'],
    ['robinson', 'J. Mack Robinson College of Business'],
    ['quad', 'Panther Quad'],
    ['hurt', 'Hurt Park'],
    ['rec cent', 'Student Recreation Center'],
    ['  Urban   life ', 'Urban Life Building'],
  ])('takes "%s" to %s', (text, name) => {
    expect(first(text)).toBe(name)
  })

  it('lists every dorm for "housing"', () => {
    const found = search('housing').map((p) => p.label)
    for (const name of ['University Commons', 'Piedmont Central', 'Patton Hall', 'Greek Housing'])
      expect(found).toContain(name)
  })

  it('finds nothing for nonsense, and everything for nothing', () => {
    expect(search('zzqx')).toEqual([])
    expect(search('  ')).toHaveLength(places.length)
  })
})
