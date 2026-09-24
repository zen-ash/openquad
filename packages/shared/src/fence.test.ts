import { describe, expect, it } from 'vitest'
import { FENCE, fenceDistance, insideFence, lineInsideFence } from './fence'

describe('fence', () => {
  it('has hurt park inside', () => {
    expect(insideFence(0, 0)).toBe(true)
    expect(fenceDistance(0, 0)).toBeGreaterThan(20)
  })

  it('leaves out the housing across piedmont ave', () => {
    // university commons and piedmont north
    expect(insideFence(420, -380)).toBe(false)
    expect(insideFence(470, -540)).toBe(false)
  })

  it('goes round clockwise with no zero length sides', () => {
    let area = 0
    FENCE.forEach(([ax, az], i) => {
      const [bx, bz] = FENCE[(i + 1) % FENCE.length]!
      expect(Math.hypot(bx - ax, bz - az)).toBeGreaterThan(1)
      area += ax * bz - bx * az
    })
    // clockwise on a map where z points south
    expect(area).toBeGreaterThan(0)
  })

  it('measures distance to the fence, negative outside', () => {
    // the far curb of edgewood ave, about z = -39.6 here
    expect(fenceDistance(0, -25)).toBeCloseTo(14.6, 0)
    expect(fenceDistance(0, -45)).toBeCloseTo(-5.4, 0)
  })

  it('knows when a straight line leaves', () => {
    expect(lineInsideFence(0, 0, 50, 50)).toBe(true)
    expect(lineInsideFence(0, 0, 0, -100)).toBe(false)
    // inside at both ends but too close to the fence on the way
    expect(lineInsideFence(-100, -38, 100, -38, 3)).toBe(false)
  })
})
