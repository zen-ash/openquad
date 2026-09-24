import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pointInPolygon } from './collision'
import { walk } from './movement'
import { world } from './world'

describe('world', () => {
  it('does not let you walk through the planter on the quad', () => {
    const planter = campus.quad.planters[0]!.points.map(([x, z]) => ({ x: x!, z: z! }))
    const mid = {
      x: planter.reduce((s, p) => s + p.x, 0) / planter.length,
      z: planter.reduce((s, p) => s + p.z, 0) / planter.length,
    }
    // start 10m to the side and walk straight at the middle of it
    let p = { x: mid.x + 10, z: mid.z }
    for (let i = 0; i < 180; i++) p = walk(p, { x: -1, z: 0 }, 1.6, 1 / 30, 0.4, world)
    expect(pointInPolygon(p, planter)).toBe(false)
  })

  it('lets you walk down decatur st under the library link', () => {
    const link = campus.buildings.find((b) => b.minHeight)!
    expect(link.minHeight).toBeGreaterThan(2.5)
    // down the middle of decatur st, from one side of the link to the other
    const [from, to] = [
      { x: -190, z: 133.3 },
      { x: -110, z: 203.1 },
    ]
    const len = Math.hypot(to.x - from.x, to.z - from.z)
    const dir = { x: (to.x - from.x) / len, z: (to.z - from.z) / len }
    let p = from
    for (let i = 0; i < 30 * 80 && Math.hypot(p.x - to.x, p.z - to.z) > 1; i++) {
      p = walk(p, dir, 1.6, 1 / 30, 0.4, world)
    }
    expect(Math.hypot(p.x - to.x, p.z - to.z)).toBeLessThan(5)
  })
})
