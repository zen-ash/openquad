import { describe, expect, it } from 'vitest'
import { polygon, type World } from './collision'
import { BOOST_SPEED, glide, GLIDE_SPEED, type Glide } from './glide'

const open: World = { buildings: [], walls: [], circles: [], halfSize: 100 }
const east = { x: 1, z: 0 }
const north = { x: 0, z: -1 }
const still: Glide = { x: 0, z: 0, vx: 0, vz: 0, heading: 0 }
const speedOf = (g: Glide) => Math.hypot(g.vx, g.vz)

// n frames of 1/fps with the same input
function run(g: Glide, want: typeof east | null, seconds: number, fps = 60, world = open) {
  for (let i = 0; i < Math.round(seconds * fps); i++)
    g = glide(g, want, GLIDE_SPEED, 1 / fps, 0.4, world)
  return g
}

describe('glide', () => {
  it('speeds up smoothly instead of starting at full speed', () => {
    const first = run(still, east, 1 / 60)
    expect(speedOf(first)).toBeGreaterThan(0)
    expect(speedOf(first)).toBeLessThan(GLIDE_SPEED * 0.2)
    expect(speedOf(run(still, east, 0.15))).toBeLessThan(GLIDE_SPEED * 0.8)
    expect(speedOf(run(still, east, 0.4))).toBeGreaterThan(GLIDE_SPEED * 0.95)
  })

  it('never goes faster than the speed it was given', () => {
    let g = still
    for (let i = 0; i < 120; i++) {
      g = glide(g, east, BOOST_SPEED, 1 / 60, 0.4, open)
      expect(speedOf(g)).toBeLessThanOrEqual(BOOST_SPEED + 1e-9)
    }
  })

  it('eases to a stop after letting go', () => {
    let g = run(still, east, 1)
    const at = g.x
    let last = speedOf(g)
    for (let i = 0; i < 60; i++) {
      g = run(g, null, 1 / 60)
      expect(speedOf(g)).toBeLessThanOrEqual(last)
      last = speedOf(g)
    }
    // stopped for good, after sliding a little
    expect(speedOf(g)).toBe(0)
    expect(g.x - at).toBeGreaterThan(0.2)
    expect(g.x - at).toBeLessThan(0.8)
  })

  it('turns toward the new direction smoothly, without going past it', () => {
    let g = run(still, north, 1)
    const target = Math.PI / 2 // east
    const headings = []
    for (let i = 0; i < 40; i++) {
      g = run(g, east, 1 / 60)
      headings.push(g.heading)
    }
    // not in one frame
    expect(Math.PI - headings[0]!).toBeLessThan(0.3)
    // headingFor(north) is pi, east is pi/2: it only ever goes down toward it
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i]).toBeLessThanOrEqual(headings[i - 1]!)
      expect(headings[i]).toBeGreaterThanOrEqual(target)
    }
    expect(headings.at(-1)).toBeCloseTo(target, 1)
  })

  it('curves round instead of stopping dead to change direction', () => {
    const g = run(run(still, north, 1), east, 0.1)
    expect(g.vx).toBeGreaterThan(0.5)
    expect(g.vz).toBeLessThan(-0.5)
  })

  it('ends up in the same place at 20fps as at 60fps', () => {
    const smooth = run(run(still, east, 0.5, 60), null, 0.5, 60)
    const choppy = run(run(still, east, 0.5, 20), null, 0.5, 20)
    expect(choppy.x).toBeCloseTo(smooth.x, 5)
    expect(glide(still, east, GLIDE_SPEED, 0.5, 0.4, open).x).toBeCloseTo(
      run(still, east, 0.5, 60).x,
      5,
    )
  })

  it('stops after half a second instead of replaying a long pause', () => {
    expect(glide(still, east, GLIDE_SPEED, 10, 0.4, open).x).toBeCloseTo(
      glide(still, east, GLIDE_SPEED, 0.5, 0.4, open).x,
    )
  })

  describe('walls', () => {
    // a wall along x = 2
    const walled: World = {
      walls: [],
      buildings: [
        polygon([
          [2, -10],
          [2.2, -10],
          [2.2, 10],
          [2, 10],
        ]),
      ],
      circles: [],
      halfSize: 100,
    }

    it('stops at a wall and keeps no speed pushing into it', () => {
      const g = run(still, east, 2, 60, walled)
      expect(g.x).toBeCloseTo(1.6)
      expect(speedOf(g)).toBeLessThan(0.1)
      // so letting go doesn't leave you pressed against it
      expect(run(g, null, 0.1, 60, walled).x).toBeCloseTo(1.6)
    })

    it('does not skip through a wall on a long frame', () => {
      const fast = { ...still, vx: BOOST_SPEED }
      expect(glide(fast, east, BOOST_SPEED, 0.5, 0.4, walled).x).toBeLessThanOrEqual(1.6 + 1e-6)
    })

    it('slides along it when going at it at an angle', () => {
      const diagonal = { x: Math.SQRT1_2, z: Math.SQRT1_2 }
      const g = run({ ...still, x: 1.6 }, diagonal, 1, 60, walled)
      expect(g.x).toBeCloseTo(1.6)
      expect(g.z).toBeGreaterThan(1.5)
      expect(g.vz).toBeCloseTo(GLIDE_SPEED * Math.SQRT1_2, 1)
    })
  })
})
