import { describe, expect, it } from 'vitest'
import { pointInPolygon, polygon } from '../game/collision'
import campus from './campus.json'

const gsu = campus.buildings.filter((b) => b.gsu)
const shapes = campus.buildings.map((b) => polygon(b.points as [number, number][]))

function distToOutline(x: number, z: number, points: number[][]) {
  let best = Infinity
  for (let i = 0; i < points.length; i++) {
    const [ax, az] = points[i] as [number, number]
    const [bx, bz] = points[(i + 1) % points.length] as [number, number]
    const dx = bx - ax
    const dz = bz - az
    // some outlines have the same point twice in a row, so a segment can be 0 long
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz))
  }
  return best
}

describe('campus doors', () => {
  it('every gsu building has one', () => {
    expect(gsu.every((b) => b.door)).toBe(true)
  })

  it.each(gsu.map((b, i) => [b.name ?? `gsu building ${i}`, b]))(
    '%s: door is on the wall, facing out',
    (_, b) => {
      const [x, z, nx, nz] = b.door as [number, number, number, number]
      expect(distToOutline(x, z, b.points)).toBeLessThan(0.1)

      const own = polygon(b.points as [number, number][])
      const out = { x: x + nx, z: z + nz }
      const inside = { x: x - nx, z: z - nz }
      expect(pointInPolygon(inside, own.points)).toBe(true)
      expect(shapes.some((s) => pointInPolygon(out, s.points))).toBe(false)
    },
  )
})
