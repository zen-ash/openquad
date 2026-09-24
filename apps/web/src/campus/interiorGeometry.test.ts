import { describe, expect, it } from 'vitest'
import { CEILING, interiors } from '../game/interiors'
import { ceilingsGeometry, floorsGeometry, interiorWallsGeometry } from './interiorGeometry'

const room = interiors.find((r) => r.name === 'Library North')!

describe('interior geometry', () => {
  it('walls face into the room', () => {
    const geo = interiorWallsGeometry([room])
    const pos = geo.getAttribute('position')
    const normal = geo.getAttribute('normal')
    // from the middle of each wall, stepping along its normal should go further inside
    // than stepping against it. roughly: toward the middle of the building
    const cx = room.points.reduce((s, p) => s + p.x, 0) / room.points.length
    const cz = room.points.reduce((s, p) => s + p.z, 0) / room.points.length
    let inward = 0
    let total = 0
    for (let i = 0; i < pos.count; i += 6) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const toMiddle = (cx - x) * normal.getX(i) + (cz - z) * normal.getZ(i)
      if (toMiddle > 0) inward++
      total++
    }
    // not every wall of an odd shaped building faces the middle, but most should
    expect(inward / total).toBeGreaterThan(0.7)
  })

  // three only draws the side a triangle's corners go counterclockwise from, so the
  // winding has to agree with the normal or the walls are invisible from inside
  it('wall triangles are wound the same way as their normals', () => {
    const geo = interiorWallsGeometry([room])
    const pos = geo.getAttribute('position')
    const normal = geo.getAttribute('normal')
    for (let i = 0; i < pos.count; i += 3) {
      const ax = pos.getX(i + 1) - pos.getX(i)
      const ay = pos.getY(i + 1) - pos.getY(i)
      const az = pos.getZ(i + 1) - pos.getZ(i)
      const bx = pos.getX(i + 2) - pos.getX(i)
      const by = pos.getY(i + 2) - pos.getY(i)
      const bz = pos.getZ(i + 2) - pos.getZ(i)
      // x and z of a cross b
      const cx = ay * bz - az * by
      const cz = ax * by - ay * bx
      expect(cx * normal.getX(i) + cz * normal.getZ(i)).toBeGreaterThan(0)
    }
  })

  it('floor faces up and ceiling faces down', () => {
    const floor = floorsGeometry([room])
    const ceiling = ceilingsGeometry([room])
    const up = (g: typeof floor) => {
      const p = g.getAttribute('position')
      const ax = p.getX(1) - p.getX(0)
      const az = p.getZ(1) - p.getZ(0)
      const bx = p.getX(2) - p.getX(0)
      const bz = p.getZ(2) - p.getZ(0)
      return az * bx - ax * bz // y of the triangle's normal
    }
    const tri = (g: typeof floor) => {
      // shape geometry is indexed, un-index to read the first triangle
      return g.index ? g.toNonIndexed() : g
    }
    expect(up(tri(floor))).toBeGreaterThan(0)
    expect(up(tri(ceiling))).toBeLessThan(0)
    ceiling.computeBoundingBox()
    expect(ceiling.boundingBox!.max.y).toBeCloseTo(CEILING)
  })
})
