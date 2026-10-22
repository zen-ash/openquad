import { insideFence } from '@quad/shared'
import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { fromElevation, heightAt, normalAt, ORIGIN } from './terrain'

describe('terrain', () => {
  it('puts hurt park at zero', () => {
    expect(ORIGIN).toBeGreaterThan(300)
    expect(Math.abs(heightAt(0, 0))).toBeLessThan(0.05)
  })

  it('matches the ground heights measured for the hand-built buildings', () => {
    // their datums (docs/reference), within half a meter
    const datums: [string, number, number, number][] = [
      ['petit', 40, 330, 306.5],
      ['science annex', -165.5, 42.3, 312.0],
      ['natural science', -250, 85, 315.0],
      ['rec center', 60, 230, 308.8],
    ]
    for (const [name, x, z, elevation] of datums)
      expect(Math.abs(heightAt(x, z) - fromElevation(elevation)), name).toBeLessThan(0.6)
  })

  it('has no steps along the streets', () => {
    // every street on campus, a meter at a time: nothing steeper than a steep street. bridges
    // aren't in the ground model, and service drives have ramps into decks and docks
    for (const road of campus.roads as { width: number; points: number[][]; bridge?: true }[]) {
      if (road.bridge || road.width < 6) continue
      road.points.slice(1).forEach(([bx, bz], i) => {
        const [ax, az] = road.points[i]!
        const len = Math.hypot(bx! - ax!, bz! - az!)
        for (let t = 0; t + 1 < len; t++) {
          const [x, z] = [ax! + ((bx! - ax!) * t) / len, az! + ((bz! - az!) * t) / len]
          const [nx, nz] = [x + (bx! - ax!) / len, z + (bz! - az!) / len]
          if (!insideFence(x, z)) continue
          const step = Math.abs(heightAt(nx, nz) - heightAt(x, z))
          expect(
            step,
            `${(road as { name?: string }).name} at ${x.toFixed(0)}, ${z.toFixed(0)}`,
          ).toBeLessThan(0.15)
        }
      })
    }
  })

  it('carries on at the edge past the map', () => {
    expect(heightAt(5000, 0)).toBeCloseTo(heightAt(659, 0), 1)
  })

  it('faces up on flat ground', () => {
    const [, y] = normalAt(0, 0)
    expect(y).toBeGreaterThan(0.99)
  })
})
