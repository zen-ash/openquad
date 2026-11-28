import { describe, expect, it } from 'vitest'
import { CORE, coreDistance, inCore } from './core'

describe('core', () => {
  it('has hurt park in the middle', () => {
    expect(inCore(0, 0)).toBe(true)
    expect(coreDistance(0, 0)).toBeGreaterThan(20)
  })

  it('leaves out the housing across piedmont ave', () => {
    // university commons and piedmont north
    expect(inCore(420, -380)).toBe(false)
    expect(inCore(470, -540)).toBe(false)
  })

  it('goes round clockwise with no zero length sides', () => {
    let area = 0
    CORE.forEach(([ax, az], i) => {
      const [bx, bz] = CORE[(i + 1) % CORE.length]!
      expect(Math.hypot(bx - ax, bz - az)).toBeGreaterThan(1)
      area += ax * bz - bx * az
    })
    // clockwise on a map where z points south
    expect(area).toBeGreaterThan(0)
  })

  it('measures distance to its edge, negative outside', () => {
    // the far curb of edgewood ave, about z = -39.6 here
    expect(coreDistance(0, -25)).toBeCloseTo(14.6, 0)
    expect(coreDistance(0, -45)).toBeCloseTo(-5.4, 0)
  })
})
