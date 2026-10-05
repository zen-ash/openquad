import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BANDS,
  BASE,
  backSlots,
  COLONNADE,
  COOLING,
  OUTLINE,
  PARAPET,
  petitFrame,
  petitScienceGeometry,
  SLAB,
  SLOT,
  STAIRS,
  TALL_SLOTS,
  TOP,
  type PetitData,
} from './petitScience'

const petit = campus.buildings.find((b) => b.name === 'Petit Science Center') as PetitData
const { parts, signs } = petitScienceGeometry(petit)
const { f, A, aw } = petitFrame(petit)
const pts = petit.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('petit science center', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(petit.points).toHaveLength(OUTLINE.length)
    petit.points.forEach(([x, z], i) => {
      const [a, w] = aw({ x: x!, z: z! })
      expect(a).toBeCloseTo(OUTLINE[i]![0], 1)
      expect(w).toBeCloseTo(OUTLINE[i]![1], 1)
    })
    expect(f.len).toBeCloseTo(SLAB.length, 1)
  })

  it('is 44.5m to the coping with the penthouse over it to 55m', () => {
    expect(TOP).toBe(44.5)
    expect(petit.height).toBe(55)
    expect(PARAPET).toBeGreaterThan(TOP)
    expect(STAIRS.top).toBeGreaterThan(TOP)
    expect(STAIRS.top).toBeLessThan(petit.height)
    expect(COOLING.top).toBeGreaterThan(petit.height)
  })

  it('has a band at every lab floor, 4.5m apart', () => {
    expect(BANDS).toHaveLength(7)
    for (let i = 1; i < BANDS.length; i++) expect(BANDS[i]! - BANDS[i - 1]!).toBeCloseTo(4.5)
    expect(BANDS[0]).toBeGreaterThan(BASE)
    expect(TOP - BANDS.at(-1)!).toBeCloseTo(5)
  })

  it('keeps the slots apart and on their walls', () => {
    for (let i = 1; i < TALL_SLOTS.length; i++)
      expect(TALL_SLOTS[i]! - TALL_SLOTS[i - 1]!).toBeGreaterThan(SLOT)
    expect(TALL_SLOTS.at(-1)! + SLOT / 2).toBeLessThan(SLAB.length)
    const slots = backSlots(40, 1)
    for (const [u0, u1, y0, y1] of slots) {
      expect(u0).toBeGreaterThan(0)
      expect(u1).toBeLessThan(40)
      expect(y0).toBeGreaterThan(BASE)
      // inside one floor, not across a band
      expect(BANDS.some((y) => y > y0 && y < y1)).toBe(false)
      for (const [v0, v1, z0] of slots)
        if (z0 === y0 && v0 !== u0) expect(v1 <= u0 || v0 >= u1).toBe(true)
    }
  })

  it('has its main doors under the canopy on the plaza side of the glass tower', () => {
    const [x, z, nx, nz] = petit.door!
    const door = { x: x!, z: z! }
    const [a, w] = aw(door)
    // on the tower's side from its north corner to the lobby
    expect(a).toBeGreaterThan(69.8)
    expect(a).toBeLessThan(79.5)
    expect(w).toBeGreaterThan(0.8)
    expect(w).toBeLessThan(19.1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('leaves the colonnade on piedmont ave open to walk under', () => {
    const under = A((COLONNADE.from + SLAB.length) / 2, COLONNADE.depth / 2)
    expect(pointInPolygon(under, pts)).toBe(false)
    expect(pointInPolygon(A(COLONNADE.from / 2, 1), pts)).toBe(true)
  })

  it('draws the bridge to the research science center up off the ground', () => {
    const bridge = campus.buildings.find(
      (b) => (b.landmark as { with?: string } | undefined)?.with === 'Petit Science Center',
    )!
    expect(bridge.minHeight).toBe(20.5)
    expect(bridge.height).toBe(25.8)
    expect(petit.landmark!.bridge).toEqual(bridge.points)
    // you can walk under it
    const [p, q] = [bridge.points[1]!, bridge.points[9]!]
    const middle = { x: (p[0]! + q[0]!) / 2, z: (p[1]! + q[1]!) / 2 }
    const grounded = campus.buildings.filter((b) => !b.minHeight)
    expect(
      grounded.some((b) =>
        pointInPolygon(
          middle,
          b.points.map(([x, z]) => ({ x: x!, z: z! })),
        ),
      ),
    ).toBe(false)
  })

  it('has the name on the sign in the plaza', () => {
    expect(signs.some((s) => s.text.includes('PETIT'))).toBe(true)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 15k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(15_000)
  })
})
