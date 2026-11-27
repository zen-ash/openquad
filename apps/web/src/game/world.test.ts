import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pantherQuadObstacles } from '../campus/pantherQuad'
import { COURTYARD_FENCE } from '../campus/researchTower'
import { pointInPolygon } from './collision'
import { LOW, furnish } from './furniture'
import { glide } from './glide'
import { interiors } from './interiors'
import { walk } from './movement'
import { groundAt, hoppingWorldFor, world, worldFor } from './world'

describe('world', () => {
  it("does not let you walk through bronzie's block on the quad", () => {
    const block = pantherQuadObstacles().blocks[0]!.map(([x, z]) => ({ x, z }))
    const mid = {
      x: block.reduce((s, p) => s + p.x, 0) / block.length,
      z: block.reduce((s, p) => s + p.z, 0) / block.length,
    }
    // start 10m to the side and walk straight at the middle of it
    let p = { x: mid.x + 10, z: mid.z }
    for (let i = 0; i < 180; i++) p = walk(p, { x: -1, z: 0 }, 1.6, 1 / 30, 0.4, world)
    expect(pointInPolygon(p, block)).toBe(false)
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

  it('lets you walk in from decatur st to the research tower doors', () => {
    const tower = campus.buildings.find((b) => b.name === 'Research Tower')!
    const [x, z, nx, nz] = tower.door as number[]
    // the footway in between petit and the research science center
    const way = campus.paths.find((l) => {
      const [ex, ez] = l.points.at(-1)!
      return Math.hypot(ex! - x! - nx! * 1.5, ez! - z! - nz! * 1.5) < 0.1
    })!
    let p = { x: way.points[0]![0]!, z: way.points[0]![1]! }
    for (const [tx, tz] of [...way.points.slice(1), [x! - nx! * 2, z! - nz! * 2]]) {
      for (let i = 0; i < 30 * 40 && Math.hypot(p.x - tx!, p.z - tz!) > 0.3; i++) {
        const len = Math.hypot(tx! - p.x, tz! - p.z)
        p = walk(p, { x: (tx! - p.x) / len, z: (tz! - p.z) / len }, 1.6, 1 / 30, 0.4, world)
      }
    }
    // through the doors and inside
    const outline = tower.points.map(([a, b]) => ({ x: a!, z: b! }))
    expect(pointInPolygon(p, outline)).toBe(true)
  })

  it('keeps you out of the research tower courtyard from jesse hill jr dr', () => {
    const [a, b] = COURTYARD_FENCE as [number[], number[]]
    const mid = { x: (a[0]! + b[0]!) / 2, z: (a[1]! + b[1]!) / 2 }
    // from the sidewalk side straight at it, toward the courtyard
    const n = { x: b[1]! - a[1]!, z: a[0]! - b[0]! }
    const len = Math.hypot(n.x, n.z)
    const dir = { x: n.x / len, z: n.z / len }
    let p = { x: mid.x - dir.x * 4, z: mid.z - dir.z * 4 }
    for (let i = 0; i < 30 * 8; i++) p = walk(p, dir, 1.6, 1 / 30, 0.4, world)
    expect((p.x - mid.x) * dir.x + (p.z - mid.z) * dir.z).toBeLessThan(0)
  })
})

describe('hopping over furniture (beans)', () => {
  const room = interiors.find((r) => furnish(r).some((i) => i.kind === 'table'))!
  const table = furnish(room).find((i) => i.kind === 'table')!

  it('knows how high the table under you is', () => {
    expect(groundAt(room.index, table, 0.4)).toBe(LOW.table)
    expect(groundAt(room.index, { x: table.x + 50, z: table.z }, 0.4)).toBe(0)
  })

  it('lets the bean through a table but not the normal walker', () => {
    // walk straight across the table, along its short side
    const dir = { x: Math.sin(table.rot), z: Math.cos(table.rot) }
    const from = { x: table.x - dir.x * 1.5, z: table.z - dir.z * 1.5, heading: 0 }
    const walked = glide(from, dir, 7, 0.45, 0.4, worldFor(room.index))
    const hopped = glide(from, dir, 7, 0.45, 0.4, hoppingWorldFor(room.index))
    const past = (p: { x: number; z: number }) => (p.x - table.x) * dir.x + (p.z - table.z) * dir.z
    expect(past(walked)).toBeLessThan(0)
    expect(past(hopped)).toBeGreaterThan(1)
  })
})
