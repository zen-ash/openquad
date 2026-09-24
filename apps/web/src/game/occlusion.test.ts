import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { blocksView } from './occlusion'

const library = campus.buildings.find((b) => b.name === 'Library North')!
const [dx, dz, nx, nz] = library.door as [number, number, number, number]

describe('blocksView', () => {
  it('is clear in the middle of the park', () => {
    expect(blocksView({ x: 0, z: 9 }, { x: 0, z: 0 })).toBe(false)
  })

  it('sees the wall when the player is inside and the camera is out', () => {
    const inside = { x: dx - nx * 3, z: dz - nz * 3 }
    const outside = { x: dx + nx * 6 + nz * 4, z: dz + nz * 6 - nx * 4 }
    expect(blocksView(outside, inside)).toBe(true)
  })

  it('does not count walking right along a wall', () => {
    // both points just outside the front wall, the line runs parallel to it
    const along = { x: -nz, z: nx }
    const a = { x: dx + nx * 0.8 + along.x * 3, z: dz + nz * 0.8 + along.z * 3 }
    const b = { x: dx + nx * 0.8 - along.x * 3, z: dz + nz * 0.8 - along.z * 3 }
    expect(blocksView(a, b)).toBe(false)
  })
})
