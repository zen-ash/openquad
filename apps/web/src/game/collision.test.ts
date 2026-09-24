import { describe, expect, it } from 'vitest'
import { pointInPolygon, polygon, resolveCollisions, type World } from './collision'

// a 4x4 square building, and an L shaped one
const square = polygon([
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
])
const lShape = polygon([
  [20, 0],
  [30, 0],
  [30, 4],
  [24, 4],
  [24, 10],
  [20, 10],
])

const world: World = {
  buildings: [square, lShape],
  walls: [],
  circles: [{ x: 10, z: 10, radius: 1 }],
  halfSize: 50,
}

describe('pointInPolygon', () => {
  it('works for an L shape', () => {
    expect(pointInPolygon({ x: 22, z: 8 }, lShape.points)).toBe(true)
    // the empty corner of the L
    expect(pointInPolygon({ x: 27, z: 8 }, lShape.points)).toBe(false)
  })
})

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
    const p = resolveCollisions({ x: -0.3, z: 2.4 }, 0.5, world)
    expect(p.x).toBeCloseTo(-0.5)
    expect(p.z).toBeCloseTo(2.4)
  })

  it('pushes you out if you end up inside a building', () => {
    const p = resolveCollisions({ x: 0.5, z: 2 }, 0.5, world)
    expect(p.x).toBeCloseTo(-0.5)
  })

  it('lets you walk into the empty corner of an L shaped building', () => {
    expect(resolveCollisions({ x: 27, z: 8 }, 0.5, world)).toEqual({ x: 27, z: 8 })
  })

  it('stops you at the inner walls of an L shape', () => {
    const p = resolveCollisions({ x: 24.2, z: 8 }, 0.5, world)
    expect(p.x).toBeCloseTo(24.5)
  })

  it('bumps you off trees', () => {
    const p = resolveCollisions({ x: 11, z: 10 }, 0.5, world)
    expect(p.x).toBeCloseTo(11.5)
    expect(p.z).toBeCloseTo(10)
  })

  it('keeps you inside the map', () => {
    expect(resolveCollisions({ x: 80, z: -80 }, 0.5, world)).toEqual({ x: 49.5, z: -49.5 })
  })
})
