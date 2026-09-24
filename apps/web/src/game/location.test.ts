import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { whereIs } from './location'

const library = campus.buildings.find((b) => b.name === 'Library North')!
const [dx, dz, nx, nz] = library.door as [number, number, number, number]

describe('whereIs', () => {
  it('knows the middle of hurt park', () => {
    expect(whereIs(0, 0)).toEqual({ name: 'Hurt Park', sub: 'Downtown Atlanta' })
  })

  it('knows when you are inside a building', () => {
    expect(whereIs(dx - nx * 3, dz - nz * 3)).toEqual({
      name: 'Library North',
      sub: 'Georgia State University',
    })
  })

  it('counts standing outside the front door as being at the building', () => {
    expect(whereIs(dx + nx * 3, dz + nz * 3).name).toBe('Library North')
  })

  it('names the street when you are just walking down one', () => {
    // somewhere on a named street that isn't next to a gsu building or in a park
    const spots = campus.roads
      .filter((r) => r.name)
      .flatMap((r) => r.points.map((p) => ({ name: r.name!, x: p[0]!, z: p[1]! })))
    const hits = spots.filter((s) => whereIs(s.x, s.z).name === s.name)
    expect(hits.length).toBeGreaterThan(spots.length / 3)
  })

  it('falls back to downtown atlanta out in the middle of nowhere', () => {
    expect(whereIs(10_000, 10_000).name).toBe('Downtown Atlanta')
  })

  it('names the panther quad even right next to a building', () => {
    const [px, pz] = campus.quad.monument as [number, number]
    expect(whereIs(px + 3, pz)).toEqual({ name: 'Panther Quad', sub: 'Georgia State University' })
  })
})
