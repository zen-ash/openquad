import { describe, expect, it } from 'vitest'
import { EMOTE_LENGTH, HOVER, newBean, stepBean, type Bean, type Pose } from './bean'
import { GLIDE_SPEED, DASH_SPEED } from './glide'

const FRAME = 1 / 60

// runs the bean along x at the given speed (m/s, or a function of time), heading east
function drive(b: Bean, seconds: number, speed: number | ((t: number) => number), from = 0) {
  const poses: Pose[] = []
  let x = b.started ? b.x : 0
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    const t = from + i * FRAME
    x += (typeof speed === 'number' ? speed : speed(t)) * FRAME
    poses.push(stepBean(b, { x, z: 0, heading: Math.PI / 2 }, FRAME))
  }
  return poses
}

describe('stepBean', () => {
  it('hovers and settles down when left alone', () => {
    const b = newBean()
    const poses = drive(b, 3, 0)
    const last = poses.at(-1)!
    expect(last.stretch).toBeCloseTo(1, 2)
    expect(last.pitch).toBeCloseTo(0, 2)
    expect(last.roll).toBeCloseTo(0, 2)
    for (const p of poses) {
      expect(p.y).toBeGreaterThan(HOVER - 0.06)
      expect(p.y).toBeLessThan(HOVER + 0.06)
    }
  })

  it('leans forward while gliding', () => {
    const last = drive(newBean(), 2, GLIDE_SPEED).at(-1)!
    expect(last.pitch).toBeGreaterThan(0.05)
    expect(last.pitch).toBeLessThan(0.3)
  })

  it('squashes when it stops, then comes back to its shape', () => {
    const b = newBean()
    drive(b, 2, GLIDE_SPEED)
    // stops dead, like glide() does
    const poses = drive(b, 2, 0)
    expect(Math.min(...poses.map((p) => p.stretch))).toBeLessThan(0.97)
    expect(Math.min(...poses.map((p) => p.pitch))).toBeLessThan(0)
    expect(poses.at(-1)!.stretch).toBeCloseTo(1, 2)
  })

  it('hops when it starts running', () => {
    const b = newBean()
    drive(b, 1, GLIDE_SPEED)
    const poses = drive(b, 1, DASH_SPEED)
    expect(Math.max(...poses.map((p) => p.y))).toBeGreaterThan(HOVER + 0.15)
  })

  it('leans into a turn, and straightens up once it has stopped', () => {
    const b = newBean()
    let x = 0
    const z = 0
    const rolls = []
    // going east while still facing north: it has a turn to make, to its left
    for (let i = 0; i < 20; i++) {
      x += GLIDE_SPEED / 60
      rolls.push(stepBean(b, { x, z, heading: Math.PI }, 1 / 60).roll)
    }
    expect(Math.max(...rolls.map(Math.abs))).toBeGreaterThan(0.2)
    expect(Math.max(...rolls.map(Math.abs))).toBeLessThan(0.45)
    let last = rolls.at(-1)!
    for (let i = 0; i < 180; i++) last = stepBean(b, { x, z, heading: Math.PI }, 1 / 60).roll
    expect(last).toBeCloseTo(0, 2)
  })

  it('hops over low furniture and lands with a puff of dust', () => {
    const b = newBean()
    const at = { x: 0, z: 0, heading: 0 }
    drive(b, 0.5, 0)
    const up = []
    for (let i = 0; i < 12; i++) up.push(stepBean(b, at, FRAME, undefined, 1).y)
    // clears the top of a 1m table
    expect(Math.max(...up)).toBeGreaterThan(1 + HOVER)
    let dust = 0
    for (let i = 0; i < 90; i++) if (stepBean(b, at, FRAME, undefined, 0).dust) dust++
    expect(dust).toBe(1)
    // a normal hop doesn't
    const c = newBean()
    drive(c, 1, GLIDE_SPEED)
    expect(drive(c, 1, DASH_SPEED).some((p) => p.dust)).toBe(false)
  })

  it('does not fling itself when teleported', () => {
    const b = newBean()
    drive(b, 1, 0)
    const p = stepBean(b, { x: 500, z: 300, heading: 0 }, FRAME)
    expect(Math.abs(p.pitch)).toBeLessThan(0.01)
    expect(Math.abs(p.stretch - 1)).toBeLessThan(0.01)
  })

  it('plays an emote once and says when it is done', () => {
    for (const name of Object.keys(EMOTE_LENGTH)) {
      const b = newBean()
      const at = { x: 0, z: 0, heading: 0 }
      let moved = false
      let done = 0
      for (let i = 0; i < 180; i++) {
        const p = stepBean(b, at, FRAME, { name, key: 7 })
        moved ||= Math.abs(p.stretch - 1) > 0.03 || Math.abs(p.yaw) > 0.05 || p.y > HOVER + 0.1
        moved ||= Math.abs(p.roll) > 0.05
        if (p.done) done++
      }
      expect(moved, name).toBe(true)
      expect(done, name).toBe(1)
    }
  })
})
