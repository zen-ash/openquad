import { describe, expect, it } from 'vitest'
import { groundHeight } from './terrain'
import terrain from './terrain.json'

describe('terrain', () => {
  it('is zero at hurt park', () => {
    expect(Math.abs(groundHeight(0, 0))).toBeLessThan(0.3)
  })

  it('goes downhill from the west side of campus to the east', () => {
    // peachtree center ave is up on the ridge, the far side of courtland is lower
    expect(groundHeight(-250, 0)).toBeGreaterThan(groundHeight(250, 0) + 5)
  })

  it('blends smoothly between grid points', () => {
    const { x0, z0, step } = terrain
    const a = groundHeight(x0 + step * 10, z0 + step * 10)
    const b = groundHeight(x0 + step * 11, z0 + step * 10)
    expect(groundHeight(x0 + step * 10.5, z0 + step * 10)).toBeCloseTo((a + b) / 2)
  })

  it('keeps the edge height past the end of the grid', () => {
    expect(groundHeight(-5000, 0)).toBe(groundHeight(terrain.x0, 0))
    expect(groundHeight(0, 9000)).toBe(groundHeight(0, 1e6))
  })
})
