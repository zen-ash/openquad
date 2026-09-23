import { describe, expect, it } from 'vitest'
import { headingFor, moveDirection, type MoveInput } from './movement'

const none: MoveInput = { forward: false, back: false, left: false, right: false, run: false }

describe('moveDirection', () => {
  it('returns null when no keys are held', () => {
    expect(moveDirection(none, 0)).toBeNull()
  })

  it('returns null when opposite keys cancel out', () => {
    expect(moveDirection({ ...none, left: true, right: true }, 0)).toBeNull()
  })

  it('moves away from the camera on W', () => {
    const dir = moveDirection({ ...none, forward: true }, 0)!
    expect(dir.x).toBeCloseTo(0)
    expect(dir.z).toBeCloseTo(-1)
  })

  it('is not faster diagonally', () => {
    const dir = moveDirection({ ...none, forward: true, right: true }, 0)!
    expect(Math.hypot(dir.x, dir.z)).toBeCloseTo(1)
  })

  it('follows the camera when it is rotated', () => {
    // camera swung 90deg around to the right side, W should now go -x
    const dir = moveDirection({ ...none, forward: true }, Math.PI / 2)!
    expect(dir.x).toBeCloseTo(-1)
    expect(dir.z).toBeCloseTo(0)
  })
})

describe('headingFor', () => {
  it('faces +z at 0', () => {
    expect(headingFor({ x: 0, z: 1 })).toBeCloseTo(0)
  })

  it('faces +x at 90deg', () => {
    expect(headingFor({ x: 1, z: 0 })).toBeCloseTo(Math.PI / 2)
  })
})
