import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { eciToEcef, moonDirection } from './celestial'

describe('eciToEcef', () => {
  it('is a rotation', () => {
    const m = eciToEcef(new Date('2026-09-24T13:00:00Z'))
    expect(m.determinant()).toBeCloseTo(1, 6)
    const v = new Vector3(0.3, -0.5, 0.8).normalize().applyMatrix4(m)
    expect(v.length()).toBeCloseTo(1, 6)
  })

  it('turns once a day with the earth', () => {
    // a sidereal day is ~23h56m, so the same clock time a day later is ~1 degree further
    const x = (d: string) => new Vector3(1, 0, 0).applyMatrix4(eciToEcef(new Date(d)))
    const angle = x('2026-09-24T00:00:00Z').angleTo(x('2026-09-25T00:00:00Z'))
    expect((angle * 180) / Math.PI).toBeGreaterThan(0.5)
    expect((angle * 180) / Math.PI).toBeLessThan(1.5)
  })
})

describe('moonDirection', () => {
  it('is up over atlanta when the moon is up there', () => {
    // 2026-09-26 (full moon) around 1am in atlanta the moon is high in the south
    const date = new Date('2026-09-26T05:00:00Z')
    const moon = moonDirection(date, eciToEcef(date))
    // atlanta's "up" in earth-fixed coordinates
    const lat = (33.754 * Math.PI) / 180
    const lon = (-84.385 * Math.PI) / 180
    const up = new Vector3(
      Math.cos(lat) * Math.cos(lon),
      Math.cos(lat) * Math.sin(lon),
      Math.sin(lat),
    )
    expect(moon.length()).toBeCloseTo(1, 6)
    expect(moon.dot(up)).toBeGreaterThan(0.5)
  })
})
