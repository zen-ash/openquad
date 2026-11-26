import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { furnish } from '../game/furniture'
import { interiors } from '../game/interiors'
import { floorOf } from '../game/surface'
import { heightAt, ORIGIN } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { ceilingsGeometry } from './interiorGeometry'
import {
  DECKS,
  deckFrame,
  deckObstacles,
  parkingDeckGeometry,
  singleLevels,
  type DeckData,
} from './parkingDecks'
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

  it('walls in the bits of g deck towers past its outline, and the toll plaza booth and posts', () => {
    expect(deckObstacles(deck('G Deck')).length).toBeGreaterThan(8)
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

describe('t deck', () => {
  const t = deck('T Deck')
  const pts = (b: { points: number[][] }) => b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const geo = parkingDeckGeometry(t)

  it('keeps its place in the list and stands on level 1 at auburn ave', () => {
    expect(campus.buildings.findIndex((b) => b.name === 'T Deck')).toBe(84)
    expect(floorOf(t) + ORIGIN).toBeCloseTo(317.3, 2)
  })

  it('has its roof at the lidar height, the helix top 3m over it', () => {
    // the roof is in with the floors under it, so only what's over the top floor
    const pos = geo.parts.floor!.getAttribute('position')
    const heights = new Set<number>()
    for (let i = 0; i < pos.count; i++)
      heights.add(Math.round((pos.getY(i) + floorOf(t) + ORIGIN) * 10) / 10)
    expect([...heights].filter((h) => h > 338.8).sort()).toEqual([338.9, 341.2])
  })

  it('is drawn inside its own outline, none of it in 58 edgewood', () => {
    const outline = pts(t)
    const next = pts(campus.buildings.find((b) => b.name === '58 Edgewood')!)
    const near = (p: { x: number; z: number }) =>
      outline.some((a, i) => {
        const b = outline[(i + 1) % outline.length]!
        const [dx, dz] = [b.x - a.x, b.z - a.z]
        const k = Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)),
        )
        return Math.hypot(a.x + dx * k - p.x, a.z + dz * k - p.z) < 0.05
      })
    let outside = 0
    for (const g of Object.values(geo.parts)) {
      const pos = g.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const p = { x: pos.getX(i), z: pos.getZ(i) }
        expect(pointInPolygon(p, next)).toBe(false)
        if (!pointInPolygon(p, outline) && !near(p)) outside++
      }
    }
    expect(outside).toBe(0)
  })

  it('has its people door on auburn ave, facing out', () => {
    const [x, z, nx, nz] = t.door!
    expect(nz).toBe(-1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts(t))).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts(t))).toBe(true)
  })

  it('is open and stays under 20k triangles', () => {
    expect(geo.open).toBe(true)
    let triangles = 0
    for (const g of Object.values(geo.parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(20000)
  })
})

describe('a deck', () => {
  const a = deck('A Deck')
  const geo = parkingDeckGeometry(a)

  it('keeps a deck at its index, open and under 10k triangles', () => {
    expect(campus.buildings.findIndex((b) => b.name === 'A Deck')).toBe(144)
    expect(geo.open).toBe(true)
    expect(geo.inside.solid).toHaveLength(0)
    let triangles = 0
    for (const g of Object.values(geo.parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(10000)
  })

  it('has a deck roof at the lidar heights, up to the north drive at the north west', () => {
    let [low, high] = [Infinity, -Infinity]
    const pos = geo.parts.slab!.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      low = Math.min(low, pos.getY(i))
      high = Math.max(high, pos.getY(i))
    }
    const base = floorOf(a) + ORIGIN
    expect(low + base).toBeCloseTo(319.1, 1)
    expect(high + base).toBeCloseTo(320.1, 1)
  })

  it('stands a deck on the peachtree center ave sidewalk at its way in', () => {
    expect(floorOf(a) + ORIGIN).toBeCloseTo(316, 2)
    const f = deckFrame(a)
    const p = f.at(f.la + 2, 6)
    expect(Math.abs(heightAt(p.x, p.z) - floorOf(a))).toBeLessThan(0.4)
  })

  it('leaves room for cars under the edge beam of a deck everywhere', () => {
    const f = deckFrame(a)
    const { beamAt, floorAt, roofAt } = singleLevels(a)
    for (let x = 0; x <= f.la; x += 3)
      for (let w = 0; w <= f.lw; w += 3) {
        expect(beamAt(x, w) - floorAt(x, w)).toBeGreaterThan(2.05)
        expect(roofAt(x, w) - beamAt(x, w)).toBeGreaterThan(0.5)
      }
  })

  it('has a door on a deck outline facing out', () => {
    const [x, z, nx, nz] = a.door!
    const pts = a.points.map(([px, pz]) => ({ x: px!, z: pz! }))
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })
})

describe('j deck', () => {
  const j = deck('J Deck')
  const geo = parkingDeckGeometry(j)
  const p75 = campus.buildings.find((b) => b.name === '75 Piedmont Avenue')!

  it('keeps j deck at its index, open and under 10k triangles', () => {
    expect(campus.buildings.findIndex((b) => b.name === 'J Deck')).toBe(199)
    expect(geo.open).toBe(true)
    expect(geo.inside.solid).toHaveLength(0)
    let triangles = 0
    for (const g of Object.values(geo.parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(10000)
  })

  it('has its roof at the lidar height, at 75 piedmont lobby floor', () => {
    expect(top('J Deck', 'slab')).toBeCloseTo(303.8, 1)
    expect(floorOf(j)).toBeCloseTo(floorOf(p75))
  })

  it('runs its west side along 75 piedmont without a parapet there', () => {
    const d = DECKS['J Deck']!
    if (d.style !== 'buried') throw new Error('j is buried')
    const own = new Set(p75.points.map(([x, z]) => `${x},${z}`))
    for (const i of d.against) {
      const [p, q] = [j.points[i]!, j.points[(i + 1) % j.points.length]!]
      // both ends on 75 piedmont's outline, or the end of its south face
      const on = (pt: number[]) => own.has(`${pt[0]},${pt[1]}`) || pt[1] === -234
      expect(on(p) && on(q), `edge ${i}`).toBe(true)
    }
  })

  it('shows two levels to the low lot on its east side', () => {
    const f = deckFrame(j)
    const p = { x: 370, z: -270 }
    const roof = f.rel(303.8) + f.floor
    expect(roof - heightAt(p.x, p.z)).toBeGreaterThan(5)
  })

  it('has a door on j deck outline facing out', () => {
    const [x, z, nx, nz] = j.door!
    const pts = j.points.map(([px, pz]) => ({ x: px!, z: pz! }))
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('has a blue square where the logo is on the j deck sign', () => {
    expect(geo.signs.some((s) => s.text === 'J')).toBe(true)
    expect(geo.signs.some((s) => s.text === '' && s.plate === '#3a68c8')).toBe(true)
  })
})
