import { describe, expect, it } from 'vitest'
import { polygon, type World } from './collision'
import {
  animForSpeed,
  headingFor,
  moveDirection,
  RUN_SPEED,
  WALK_SPEED,
  walk,
  type MoveInput,
} from './movement'

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

describe('animForSpeed', () => {
  it('picks the animation that matches how fast someone is going', () => {
    expect(animForSpeed(0)).toBe('Idle')
    expect(animForSpeed(WALK_SPEED)).toBe('Walk')
    expect(animForSpeed(RUN_SPEED)).toBe('Run')
  })
})

describe('walk', () => {
  const open: World = { buildings: [], circles: [], halfSize: 100 }
  // a thin wall across x = 2
  const walled: World = {
    buildings: [
      polygon([
        [2, -10],
        [2.2, -10],
        [2.2, 10],
        [2, 10],
      ]),
    ],
    circles: [],
    halfSize: 100,
  }
  const east = { x: 1, z: 0 }

  it('goes the same distance at 2fps as at 60fps', () => {
    let smooth = { x: 0, z: 0 }
    for (let i = 0; i < 30; i++) smooth = walk(smooth, east, 4, 1 / 60, 0.4, open)
    const choppy = walk({ x: 0, z: 0 }, east, 4, 0.5, 0.4, open)
    expect(choppy.x).toBeCloseTo(smooth.x)
    expect(choppy.x).toBeCloseTo(2)
  })

  it('does not skip through walls on a long frame', () => {
    const p = walk({ x: 0, z: 0 }, east, 7, 0.5, 0.4, walled)
    expect(p.x).toBeCloseTo(1.6)
  })

  it('stops after half a second instead of replaying a long pause', () => {
    expect(walk({ x: 0, z: 0 }, east, 4, 10, 0.4, open).x).toBeCloseTo(2)
  })
})
