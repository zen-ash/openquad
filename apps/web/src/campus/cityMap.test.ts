import { DataUtils } from 'three'
import { describe, expect, it } from 'vitest'
import { baseOf } from '../game/surface'
import { terrainAt } from '../game/terrain'
import campus from './campus.json'
import { drawCityMap } from './cityMap'
import { CELL, city, FIRST, HALF, LEVEL, SIZE } from './reflections'

drawCityMap()
const data = city.image.data as Uint16Array
const read = (x: number, z: number, k: number) => {
  const c = Math.floor((x + HALF) / CELL)
  const r = Math.floor((z + HALF) / CELL)
  return DataUtils.fromHalfFloat(data[(r * SIZE + c) * 4 + k]!)
}
const middle = (i: number) => -HALF + (i + 0.5) * CELL

describe('the map the glass reflections are traced through', () => {
  it('has the hurt building up to its roof', () => {
    const hurt = campus.buildings[0]!
    expect(hurt.name).toBe('Hurt Building')
    // the middle of its west wing
    expect(read(-180, -10, 3)).toBe(FIRST)
    expect(read(-180, -10, 0)).toBeGreaterThan(baseOf(hurt) + 40)
    expect(read(-180, -10, 0)).toBeLessThan(baseOf(hurt) + 78)
  })

  it('leaves the streets open', () => {
    const points = campus.roads.flatMap((r) => (r.width >= 10 ? r.points : []))
    const open = points.filter(([x, z]) => read(x!, z!, 3) < FIRST && read(x!, z!, 1) > 0)
    expect(open.length).toBeGreaterThan(points.length * 0.5)
  })

  it('never says a spot is further from a building than it is', () => {
    // from anywhere in a square, the nearest square with something standing in it (or over
    // LEVEL) can't be closer than what's stored
    const standing = (r: number, c: number, over: number) => {
      const i = (r * SIZE + c) * 4
      const top = DataUtils.fromHalfFloat(data[i]!)
      // the ground's read once every two squares
      const ground = terrainAt(middle(c & ~1) + CELL / 2, middle(r & ~1) + CELL / 2)
      return top > ground + 0.5 && top > over
    }
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let n = 0; n < 300; n++) {
      const [x, z] = [(random() - 0.5) * 900, (random() - 0.5) * 900]
      for (const [k, over] of [
        [1, -Infinity],
        [2, LEVEL],
      ] as const) {
        const clear = read(x, z, k)
        // far from everything takes too long to check
        if (clear > 40) continue
        const reach = Math.ceil((clear + 2) / CELL)
        const [c0, r0] = [Math.floor((x + HALF) / CELL), Math.floor((z + HALF) / CELL)]
        for (let r = r0 - reach; r <= r0 + reach; r++)
          for (let c = c0 - reach; c <= c0 + reach; c++) {
            if (r < 0 || c < 0 || r >= SIZE || c >= SIZE || !standing(r, c, over)) continue
            const dx = Math.max(0, Math.abs(middle(c) - x) - CELL / 2)
            const dz = Math.max(0, Math.abs(middle(r) - z) - CELL / 2)
            expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(clear)
          }
      }
    }
  })
})
