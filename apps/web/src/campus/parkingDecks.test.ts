import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { furnish } from '../game/furniture'
import { interiors } from '../game/interiors'
import { floorOf } from '../game/surface'
import { ORIGIN } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { ceilingsGeometry } from './interiorGeometry'
import { DECKS, deckFrame, deckObstacles, parkingDeckGeometry, type DeckData } from './parkingDecks'
import { steelDeckMaterials } from './parkingDecksMaterials'

const names = ['G Deck', 'M Deck', 'N Deck', 'K Deck', 'S Deck']
const deck = (name: string) => campus.buildings.find((b) => b.name === name) as DeckData
// the highest point of a part, in meters above sea level
const top = (name: string, part: string) => {
  const pos = parkingDeckGeometry(deck(name)).parts[part as 'slab']!.getAttribute('position')
  let y = -Infinity
  for (let i = 0; i < pos.count; i++) y = Math.max(y, pos.getY(i))
  return y + floorOf(deck(name)) + ORIGIN
}

describe('parking decks', () => {
  it('keeps every deck where it was in the list', () => {
    expect(names.map((n) => campus.buildings.findIndex((b) => b.name === n))).toEqual([
      60, 70, 71, 65, 77,
    ])
  })

  it('has n and k on the lidar walls, not osm: 33.5m wide', () => {
    for (const name of ['N Deck', 'K Deck']) {
      const f = deckFrame(deck(name))
      expect(f.la).toBeCloseTo(33.5, 0)
      expect(f.lw).toBeCloseTo(76.3, 0)
    }
  })

  it('puts the steel decks top floors at the lidar heights', () => {
    // n's top floor: the two halves meet in the middle at 322.0, s's north west half 317.65
    // (the curbs stand a little over them)
    expect(top('N Deck', 'slab')).toBeCloseTo(322, 0)
    expect(top('K Deck', 'slab')).toBeCloseTo(321.8, 0)
    expect(top('S Deck', 'slab')).toBeCloseTo(317.65, 0)
  })

  it('has m and g roofs at the lidar heights', () => {
    expect(top('M Deck', 'slab')).toBeCloseTo(327, 0)
    expect(top('G Deck', 'slab')).toBeCloseTo(333.3, 1)
  })

  it('stands each deck on its datum', () => {
    expect(floorOf(deck('N Deck')) + ORIGIN).toBeCloseTo(306.55, 2)
    expect(floorOf(deck('G Deck')) + ORIGIN).toBeCloseTo(321.3, 2)
  })

  it('has a door on the outline facing out', () => {
    for (const name of names) {
      const b = deck(name)
      const [x, z, nx, nz] = b.door!
      const pts = b.points.map(([px, pz]) => ({ x: px!, z: pz! }))
      expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts), name).toBe(false)
      expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts), name).toBe(true)
    }
  })

  it('is open: no rooms, ceilings or furniture inside', () => {
    for (const name of names) {
      const geo = parkingDeckGeometry(deck(name))
      expect(geo.open).toBe(true)
      expect(geo.inside.solid).toHaveLength(0)
      const room = interiors.find((r) => r.name === name)!
      expect(furnish(room)).toEqual([])
    }
    const all = ceilingsGeometry(interiors).getAttribute('position').count
    const rest = ceilingsGeometry(interiors.filter((r) => !names.includes(r.name)))
    expect(all).toBe(rest.getAttribute('position').count)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('draws the chain link see through and without shadows', () => {
    const geo = parkingDeckGeometry(deck('N Deck'))
    expect(steelDeckMaterials.mesh.transparent).toBe(true)
    expect(geo.noShadow).toContain('mesh')
  })

  it('shares one set of materials per style', () => {
    const styles = new Set(names.map((n) => DECKS[n]!.style))
    expect([...styles].sort()).toEqual(['band', 'painted', 'steel'])
  })

  it('walls in the bits of g deck towers past its outline', () => {
    expect(deckObstacles(deck('G Deck'))).toHaveLength(8)
    expect(deckObstacles(deck('N Deck'))).toHaveLength(0)
  })

  it('stays under 10k triangles a deck', () => {
    for (const name of names) {
      let triangles = 0
      for (const g of Object.values(parkingDeckGeometry(deck(name)).parts))
        triangles += g.getAttribute('position').count / 3
      expect(triangles, name).toBeLessThan(10000)
    }
  })
})
