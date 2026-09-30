import { describe, expect, it } from 'vitest'
import { polygon, type World } from './collision'
import { angleBetween, BIKE_SPEED, glide, GLIDE_SPEED, DASH_SPEED, type Glide } from './glide'
import { moveDirection, type MoveInput } from './movement'

const open: World = { buildings: [], walls: [], circles: [], halfSize: 1000 }
const east = { x: 1, z: 0 }
const north = { x: 0, z: -1 }
const start: Glide = { x: 0, z: 0, heading: 0 }
const none: MoveInput = { forward: false, back: false, left: false, right: false, run: false }

// n frames of 1/fps with the same input
function run(g: Glide, want: typeof east | null, seconds: number, fps = 60, world = open) {
  for (let i = 0; i < Math.round(seconds * fps); i++)
    g = glide(g, want, GLIDE_SPEED, 1 / fps, 0.4, world)
  return g
}

describe('glide', () => {
  it('goes full speed from the first frame', () => {
    expect(run(start, east, 1 / 60).x).toBeCloseTo(GLIDE_SPEED / 60)
    expect(run(start, east, 1).x).toBeCloseTo(GLIDE_SPEED)
  })

  it('stops the frame the key comes up', () => {
    const g = run(start, east, 1)
    expect(run(g, null, 1 / 60)).toEqual(g)
  })

  it('runs and bikes faster', () => {
    expect(GLIDE_SPEED).toBe(7)
    expect(DASH_SPEED).toBe(14)
    expect(BIKE_SPEED).toBe(24)
    expect(glide(start, east, BIKE_SPEED, 0.25, 0.4, open).x).toBeCloseTo(6)
  })

  it('goes the same distance at 20fps as at 60fps', () => {
    const smooth = run(start, east, 0.5, 60)
    const choppy = run(start, east, 0.5, 20)
    expect(choppy.x).toBeCloseTo(smooth.x, 6)
    expect(choppy.heading).toBeCloseTo(smooth.heading, 6)
  })

  it('stops after half a second instead of replaying a long pause', () => {
    expect(glide(start, east, GLIDE_SPEED, 10, 0.4, open).x).toBeCloseTo(GLIDE_SPEED / 2)
  })

  it('turns to face where it goes quickly, without going past it', () => {
    let g = run(start, north, 1)
    expect(g.heading).toBeCloseTo(Math.PI) // north
    const headings = []
    for (let i = 0; i < 30; i++) {
      g = run(g, east, 1 / 60)
      headings.push(g.heading)
    }
    // not in one frame
    expect(Math.PI - headings[0]!).toBeLessThan(0.5)
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i]).toBeLessThanOrEqual(headings[i - 1]!)
      expect(headings[i]).toBeGreaterThanOrEqual(Math.PI / 2)
    }
    // 90 degrees in a quarter second
    expect(headings[14]! - Math.PI / 2).toBeLessThan(0.05)
  })

  it('turns the short way round', () => {
    expect(angleBetween(3, -3)).toBeCloseTo(2 * Math.PI - 6)
    const g = glide(
      { ...start, heading: 3 },
      { x: Math.sin(-3), z: Math.cos(-3) },
      7,
      1 / 60,
      0.4,
      open,
    )
    expect(g.heading).toBeGreaterThan(3)
  })

  describe('controls', () => {
    it('are north up: W is always north, D is always east', () => {
      const w = moveDirection({ ...none, forward: true }, 0)!
      expect(w.x).toBeCloseTo(0)
      expect(w.z).toBeCloseTo(-1)
      const d = moveDirection({ ...none, right: true }, 0)!
      expect(d.x).toBeCloseTo(1)
      expect(d.z).toBeCloseTo(0)
    })

    it('are not faster diagonally', () => {
      const dir = moveDirection({ ...none, forward: true, right: true }, 0)!
      const g = glide(start, dir, GLIDE_SPEED, 0.5, 0.4, open)
      expect(Math.hypot(g.x, g.z)).toBeCloseTo(GLIDE_SPEED / 2)
    })
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
      halfSize: 1000,
    }
    const diagonal = { x: Math.SQRT1_2, z: Math.SQRT1_2 }

    it('stops at a wall', () => {
      expect(run(start, east, 2, 60, walled).x).toBeCloseTo(1.6)
    })

    it('does not skip through a wall at bike speed on a long frame', () => {
      expect(glide(start, east, BIKE_SPEED, 0.5, 0.4, walled).x).toBeLessThanOrEqual(1.6 + 1e-6)
    })

    it('slides along it by dropping the part of the move that goes into it', () => {
      const g = run({ ...start, x: 1.6 }, diagonal, 1, 60, walled)
      expect(g.x).toBeCloseTo(1.6)
      // the z part alone, at its own speed
      expect(g.z).toBeCloseTo(GLIDE_SPEED * Math.SQRT1_2, 1)
    })

    it('tries the x part before the z part', () => {
      // a post just off the diagonal: the whole step bumps it, x alone or z alone would
      // both fit, and x goes first
      const post: World = { ...open, circles: [{ x: 0.43, z: 0.43, radius: 0.1 }] }
      const g = glide(start, diagonal, GLIDE_SPEED, 1 / 60, 0.4, post)
      expect(g.x).toBeGreaterThan(0.05)
      expect(g.z).toBe(0)
    })

    it('still slides along a slanted wall holding just one key', () => {
      // a wall going up to the north east, pushing north into it slides along it
      const slanted: World = {
        ...walled,
        buildings: [
          polygon([
            [0, -2],
            [10, -12],
            [10.2, -11.8],
            [0.2, -1.8],
          ]),
        ],
      }
      const g = run({ ...start, x: 3 }, north, 1, 60, slanted)
      expect(g.x).toBeGreaterThan(3.5)
    })
  })
})
