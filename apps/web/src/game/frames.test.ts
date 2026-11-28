import { describe, expect, it } from 'vitest'
import { summarize } from './frames'

describe('summarize', () => {
  it('finds the lows and the hitches', () => {
    // 990 smooth frames, 9 that missed a refresh and one big hitch
    const ms = [...Array(990).fill(16), ...Array(9).fill(33), 120]
    const s = summarize(ms)
    expect(s.frames).toBe(1000)
    expect(s.median).toBe(16)
    // the worst 10 frames, and the worst 1
    expect(s.low1).toBe(41.7)
    expect(s.low01).toBe(120)
    expect(s.worst).toBe(120)
    expect(s.over25).toBe(10)
    expect(s.over50).toBe(1)
    expect(s.fps).toBe(61.5)
  })

  it('copes with no frames', () => {
    expect(summarize([])).toMatchObject({ frames: 0, fps: 0, median: 0, worst: 0 })
  })
})
