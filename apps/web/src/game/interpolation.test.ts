import { describe, expect, it } from 'vitest'
import { pushSnapshot, sample, type Snapshot } from './interpolation'

const snap = (t: number, x: number): Snapshot => ({ t, x, z: 0, heading: 0 })

describe('sample', () => {
  it('returns null with no data', () => {
    expect(sample([], 100)).toBeNull()
  })

  it('blends between the two snapshots around the time', () => {
    const buf = [snap(0, 0), snap(50, 10), snap(100, 20)]
    expect(sample(buf, 75)?.x).toBeCloseTo(15)
  })

  it('holds the last position when data runs out', () => {
    const buf = [snap(0, 0), snap(50, 10)]
    expect(sample(buf, 500)?.x).toBe(10)
  })

  it('uses the first snapshot for times before it', () => {
    expect(sample([snap(100, 3), snap(150, 5)], 20)?.x).toBe(3)
  })
})

describe('pushSnapshot', () => {
  it('fills in a resting snapshot after a long gap', () => {
    const buf: Snapshot[] = []
    pushSnapshot(buf, snap(0, 0))
    pushSnapshot(buf, snap(5000, 1)) // stood still for 5 seconds then moved

    expect(buf.map((s) => s.t)).toEqual([0, 4950, 5000])
    // so right before the new one they're still at the old spot
    expect(sample(buf, 4960)?.x).toBeCloseTo(0.2)
  })

  it('does not fill in anything during normal updates', () => {
    const buf: Snapshot[] = []
    pushSnapshot(buf, snap(0, 0))
    pushSnapshot(buf, snap(50, 1))
    expect(buf).toHaveLength(2)
  })

  it('only keeps recent snapshots', () => {
    const buf: Snapshot[] = []
    for (let i = 0; i < 100; i++) pushSnapshot(buf, snap(i * 50, i))
    expect(buf.length).toBeLessThanOrEqual(30)
    expect(buf[buf.length - 1]?.x).toBe(99)
  })
})
