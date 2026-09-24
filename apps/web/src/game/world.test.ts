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
})
