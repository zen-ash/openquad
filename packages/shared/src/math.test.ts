import { describe, expect, it } from 'vitest'
import { clamp, distance, voiceVolume } from './math'

describe('distance', () => {
  it('is 0 for the same point', () => {
    expect(distance({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(0)
  })

  it('works for a 3-4-5 triangle', () => {
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 })).toBe(5)
  })
})

describe('clamp', () => {
  it('keeps values in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('voiceVolume', () => {
  it('is full volume when close', () => {
    expect(voiceVolume(1, 2, 15)).toBe(1)
  })

  it('is silent when far away', () => {
    expect(voiceVolume(20, 2, 15)).toBe(0)
  })

  it('fades in between', () => {
    expect(voiceVolume(8.5, 2, 15)).toBeCloseTo(0.5)
  })
})
