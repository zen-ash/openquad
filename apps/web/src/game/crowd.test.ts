import { fenceDistance } from '@quad/shared'
import { describe, expect, it } from 'vitest'
import { walkerAt, walkers, WALKERS } from './crowd'

describe('walkers', () => {
  it('has everyone on a walk round campus', () => {
    expect(walkers()).toHaveLength(WALKERS)
  })

  it('keeps them inside the fence', () => {
    for (const w of walkers())
      for (let s = 0; s < 600; s += 7) {
        const p = walkerAt(w, s)
        expect(fenceDistance(p.x, p.z)).toBeGreaterThan(0)
      }
  })

  it('walks, it never jumps', () => {
    for (const w of walkers()) {
      let last = walkerAt(w, 0)
      for (let s = 0.1; s < 300; s += 0.1) {
        const p = walkerAt(w, s)
        expect(Math.hypot(p.x - last.x, p.z - last.z)).toBeLessThan(w.speed * 0.1 + 0.01)
        last = p
      }
    }
  })

  it('puts everyone in the same place on every computer', () => {
    const a = walkers().map((w) => walkerAt(w, 1234.5))
    expect(a[3]).toEqual(walkerAt(walkers()[3]!, 1234.5))
  })
})
