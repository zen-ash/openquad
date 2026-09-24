import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pointInPolygon } from './collision'
import { blocksView, cameraReach, outlineOf } from './occlusion'

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

describe('cameraReach', () => {
  const index = campus.buildings.indexOf(library)
  const outline = library.points.map(([x, z]) => ({ x: x!, z: z! }))
  // standing just outside the front door, camera swung round behind into the library
  const look = { x: dx + nx * 2, z: dz + nz * 2 }
  const camera = { x: dx - nx * 6, y: 4, z: dz - nz * 6 }
  const at = (t: number) => ({
    x: look.x + (camera.x - look.x) * t,
    z: look.z + (camera.z - look.z) * t,
  })

  it('keeps the camera out of the building behind you', () => {
    const t = cameraReach(look, camera, null)
    expect(t).toBeLessThan(1)
    expect(pointInPolygon(at(t), outline)).toBe(false)
  })

  it('lets it go anywhere in the building you are in', () => {
    expect(cameraReach(look, camera, outlineOf(index))).toBe(1)
  })

  it('does not mind if it is up over the roof', () => {
    expect(cameraReach(look, { ...camera, y: library.height + 5 }, null)).toBe(1)
  })

  it('leaves it alone out in the open', () => {
    expect(cameraReach({ x: 0, z: 0 }, { x: 0, y: 4, z: 9 }, null)).toBe(1)
  })
})
