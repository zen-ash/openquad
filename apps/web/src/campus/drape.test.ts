import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { isNear } from '../game/terrain'
import campus from './campus.json'
import { terrainGeometry } from './drape'

const solid = campus.buildings.filter((b) => !b.minHeight)
const enterable = campus.buildings.filter((b) => b.door && !b.minHeight)
const outlines = enterable.map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))
const ground = terrainGeometry(2000, solid, { keep: isNear, ring: false, cut: enterable })
const pos = ground.getAttribute('position')
const triangles = Array.from({ length: ground.index!.count / 3 }, (_, i) =>
  [0, 1, 2].map((k) => {
    const v = ground.index!.getX(i * 3 + k)
    return { x: pos.getX(v), z: pos.getZ(v) }
  }),
)
const covers = (t: { x: number; z: number }[], p: { x: number; z: number }) => {
  const s = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)
  const d = [s(t[0]!, t[1]!), s(t[1]!, t[2]!), s(t[2]!, t[0]!)]
  return d.every((v) => v >= -1e-9) || d.every((v) => v <= 1e-9)
}

describe('terrainGeometry', () => {
  it('leaves no ground inside the buildings you can walk into', () => {
    const inside = triangles.filter((t) => {
      const m = { x: (t[0]!.x + t[1]!.x + t[2]!.x) / 3, z: (t[0]!.z + t[1]!.z + t[2]!.z) / 3 }
      return outlines.some((o) => pointInPolygon(m, o))
    })
    expect(inside).toHaveLength(0)
  })

  it('still has ground right up to their walls', () => {
    const others = solid.map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))
    let holes = 0
    for (const o of outlines)
      o.forEach((a, i) => {
        const b = o[(i + 1) % o.length]!
        const len = Math.hypot(b.x - a.x, b.z - a.z)
        if (len < 1) return
        // 5cm out from the middle of each wall, where nothing else stands
        const p = {
          x: (a.x + b.x) / 2 - ((b.z - a.z) / len) * 0.05,
          z: (a.z + b.z) / 2 + ((b.x - a.x) / len) * 0.05,
        }
        const q = {
          x: (a.x + b.x) / 2 + ((b.z - a.z) / len) * 0.05,
          z: (a.z + b.z) / 2 - ((b.x - a.x) / len) * 0.05,
        }
        for (const out of [p, q])
          if (!others.some((s) => pointInPolygon(out, s)) && isNear(out.x, out.z))
            if (!triangles.some((t) => covers(t, out))) holes++
      })
    expect(holes).toBe(0)
  })
})
