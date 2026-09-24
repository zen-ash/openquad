import { describe, expect, it } from 'vitest'
import { DOOR_WIDTH } from '../game/interiors'
import campus from './campus.json'
import { landmarkGeometry } from './landmarks'

// checks every building drawn by hand has to pass
const landmarks = campus.buildings.filter((b) => b.landmark)

describe.each(landmarks.map((b) => [b.name!, b] as const))('%s', (_, b) => {
  const geo = landmarkGeometry(b)!

  it('is drawn by hand', () => {
    expect(geo).not.toBeNull()
  })

  // three only draws the side a triangle's corners go counterclockwise from, so the
  // winding has to agree with the normal or a wall is invisible from outside
  it('has every triangle wound the same way as its normal', () => {
    for (const part of Object.values(geo.parts)) {
      const pos = part.getAttribute('position')
      const normal = part.getAttribute('normal')
      for (let i = 0; i < pos.count; i += 3) {
        const v = [0, 1, 2].map((k) => [pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)])
        const u = [0, 1, 2].map((k) => v[1]![k]! - v[0]![k]!)
        const w = [0, 1, 2].map((k) => v[2]![k]! - v[0]![k]!)
        const cross = [
          u[1]! * w[2]! - u[2]! * w[1]!,
          u[2]! * w[0]! - u[0]! * w[2]!,
          u[0]! * w[1]! - u[1]! * w[0]!,
        ]
        const dot =
          cross[0]! * normal.getX(i) + cross[1]! * normal.getY(i) + cross[2]! * normal.getZ(i)
        expect(dot).toBeGreaterThan(0)
      }
    }
  })

  it('has inside walls the whole way round, except the doorway', () => {
    // at waist height, add up how much wall (or window) there is
    let length = 0
    for (const g of [...geo.inside.solid, ...geo.inside.glass]) {
      const pos = g.getAttribute('position')
      const ys = [0, 1, 2, 4].map((i) => pos.getY(i))
      if (Math.min(...ys) > 1.1 || Math.max(...ys) < 1.1) continue
      const xs = [0, 1, 2, 4].map((i) => [pos.getX(i), pos.getZ(i)] as const)
      let widest = 0
      for (const p of xs)
        for (const q of xs) widest = Math.max(widest, Math.hypot(p[0] - q[0], p[1] - q[1]))
      length += widest
    }
    const pts = b.points
    const perimeter = pts.reduce((sum, p, i) => {
      const q = pts[(i + 1) % pts.length]!
      return sum + Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!)
    }, 0)
    expect(length).toBeCloseTo(perimeter - DOOR_WIDTH, 0)
  })
})
