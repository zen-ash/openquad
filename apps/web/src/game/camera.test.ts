import { describe, expect, it } from 'vitest'
import { clampDistance, clampPitch, MAX_PITCH, MIN_DISTANCE, orbit } from './camera'

const origin = { x: 0, y: 0, z: 0 }

describe('orbit', () => {
  it('sits behind the player at yaw 0 (south of them, looking north)', () => {
    const p = orbit(origin, 0, 0, 10)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
    expect(p.z).toBeCloseTo(10)
  })

  it('goes up when tilted down', () => {
    const p = orbit(origin, 0, Math.PI / 6, 10)
    expect(p.y).toBeCloseTo(5)
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(10)
  })

  it('swings around with yaw', () => {
    const p = orbit(origin, Math.PI / 2, 0, 10)
    expect(p.x).toBeCloseTo(10)
    expect(p.z).toBeCloseTo(0)
  })
})

describe('limits', () => {
  it('stops you looking from underground or straight down', () => {
    expect(clampPitch(-1)).toBeGreaterThan(0)
    expect(clampPitch(3)).toBe(MAX_PITCH)
  })

  it('stops you zooming into your own head', () => {
    expect(clampDistance(0)).toBe(MIN_DISTANCE)
  })
})
