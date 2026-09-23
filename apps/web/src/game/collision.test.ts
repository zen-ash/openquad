import { describe, expect, it } from 'vitest'
import { resolveCollisions, type World } from './collision'

const world: World = {
  boxes: [{ minX: 0, maxX: 4, minZ: 0, maxZ: 4 }],
  circles: [{ x: 10, z: 10, radius: 1 }],
  halfSize: 20,
}

describe('resolveCollisions', () => {
  it('leaves you alone in open space', () => {
    expect(resolveCollisions({ x: -5, z: -5 }, 0.5, world)).toEqual({ x: -5, z: -5 })
  })

  it('stops you at a wall', () => {
    const p = resolveCollisions({ x: -0.2, z: 2 }, 0.5, world)
    expect(p.x).toBeCloseTo(-0.5)
    expect(p.z).toBeCloseTo(2)
  })

  it('lets you slide along a wall', () => {
    // walking diagonally into the left wall, z should still change
    const p = resolveCollisions({ x: -0.3, z: 2.4 }, 0.5, world)
    expect(p.x).toBeCloseTo(-0.5)
    expect(p.z).toBeCloseTo(2.4)
  })

  it('pushes you out if you end up inside a building', () => {
    const p = resolveCollisions({ x: 0.5, z: 2 }, 0.5, world)
    expect(p.x).toBeCloseTo(-0.5)
  })

  it('bumps you off trees', () => {
    const p = resolveCollisions({ x: 11, z: 10 }, 0.5, world)
    expect(p.x).toBeCloseTo(11.5)
    expect(p.z).toBeCloseTo(10)
  })

  it('keeps you inside the map', () => {
    expect(resolveCollisions({ x: 50, z: -50 }, 0.5, world)).toEqual({ x: 19.5, z: -19.5 })
  })
})
