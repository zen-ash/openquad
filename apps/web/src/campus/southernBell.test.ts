import { describe, expect, it } from 'vitest'
import { baseOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { landmarkGeometry } from './landmarks'
import {
  DATUM,
  HEAD,
  LEDGE,
  PARAPET,
  PITCH,
  ROWS,
  SHAFT,
  STEPS,
  WINDOW,
  type SouthernBellData,
} from './southernBell'

const sb = campus.buildings.find((b) => b.name === 'Southern Bell Building') as SouthernBellData
const wing = campus.buildings[155]!
const { parts, inside, signs } = landmarkGeometry(sb)!
const top = (part: string) => {
  const g = parts[part]!
  g.computeBoundingBox()
  return g.boundingBox!.max.y + baseOf(sb)
}

describe('southern bell', () => {
  it('stands on the lidar parapet lines, the old podium cut down to the wing east of it', () => {
    const xs = sb.points.map((p) => p[0]!)
    const zs = sb.points.map((p) => p[1]!)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(67.9)
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(49.1)
    // the wing (still osm's "AT&T", a regular building) starts at the tower's east face
    expect(wing.name).toBe('AT&T')
    expect(Math.min(...wing.points.map((p) => p[0]!))).toBeCloseTo(Math.max(...xs))
    expect(wing.height).toBeLessThan(15)
  })

  it('is drawn from peachtree center ave, down past the low south east corner', () => {
    expect(baseOf(sb)).toBeCloseTo(fromElevation(DATUM))
    let low = Infinity
    for (const g of Object.values(parts)) {
      g.computeBoundingBox()
      low = Math.min(low, g.boundingBox!.min.y)
    }
    expect(low + baseOf(sb)).toBeLessThan(lowestUnder(sb.points))
  })

  it('has 14 floors under the parapet, the bays stepping back on the way up', () => {
    expect(fromElevation(PARAPET) - baseOf(sb)).toBeCloseTo(sb.height)
    const lowest = HEAD - (ROWS - 1) * PITCH - WINDOW[1]
    expect(lowest).toBeGreaterThan(DATUM)
    for (let i = 1; i < STEPS.length; i++) {
      expect(STEPS[i]![0]).toBeGreaterThan(STEPS[i - 1]![0])
      expect(STEPS[i]![1]).toBeGreaterThan(STEPS[i - 1]![1])
    }
    // no window straddles a step or the ledge
    for (let k = 0; k < ROWS; k++) {
      const head = HEAD - k * PITCH
      for (const at of [...STEPS.map((s) => s[1]), LEDGE])
        expect(at <= head - WINDOW[1] || at >= head).toBe(true)
    }
  })

  it('has the shaft over the roof, the horns on its rim and the lattice to 443m', () => {
    expect(top('bronze')).toBeCloseTo(fromElevation(SHAFT.flare + 4.5), 0)
    expect(top('grey')).toBeCloseTo(fromElevation(SHAFT.horns), 1)
    expect(top('light')).toBeCloseTo(fromElevation(SHAFT.lattice.top), 0)
    // the shaft stands inside the block, by its south west corner
    const { x, z } = SHAFT.rim
    expect(x[0]).toBeGreaterThan(Math.min(...sb.points.map((p) => p[0]!)))
    expect(z[1]).toBeLessThan(Math.max(...sb.points.map((p) => p[1]!)))
  })

  it('has no door, no inside and no signs', () => {
    expect((sb as { door?: number[] }).door).toBeUndefined()
    expect(inside.solid.length + inside.glass.length).toBe(0)
    expect(signs).toHaveLength(0)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 5 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(5)
    expect(triangles).toBeLessThan(8_000)
  })
})
