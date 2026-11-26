import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pointInPolygon } from './collision'
import { boxesTouch, corners } from './parking'
import { RAISED } from './raised'
import { pointAt } from './lanes'
import {
  LENGTH,
  SECTIONS,
  STOPS,
  streetcarPoles,
  streetcarRuns,
  streetcarsAt,
  WIDTH,
} from './streetcar'
import { drivingAt } from './traffic'

// 8:17 eastern (winter) on a weekday: car 1 leaving dobbs plaza
const MORNING = Date.UTC(2026, 10, 24, 13, 17) / 1000

describe('streetcar', () => {
  it('never goes backwards', () => {
    for (const r of streetcarRuns()) {
      for (let i = 1; i < r.run.length; i++) expect(r.run[i]!).toBeGreaterThanOrEqual(r.run[i - 1]!)
    }
  })

  it('stops at every platform and leaves about on time', () => {
    for (const r of streetcarRuns()) {
      for (const stop of r.stops.slice(1, -1)) {
        // the steps it spends with its middle at the platform
        const at = [...r.run.keys()].filter((k) => Math.abs(r.run[k]! - stop.s) < 0.3)
        expect(at.length).toBeGreaterThan(15 * 4)
        const leaves = r.start + (at[at.length - 1]! + 1) * 0.25
        expect(Math.abs(leaves - stop.leaves)).toBeLessThan(60)
      }
    }
  })

  it('has its stops on the track', () => {
    for (const stop of STOPS) {
      const r = streetcarRuns()[stop.on === 'east' ? 0 : 1]!
      const p = [0, 0, 0]
      const s = r.stops.find((t) => t.leaves === stop.leaves * 60)!.s
      pointAt(r.line, s, p)
      expect(Math.hypot(p[0]! - stop.at[0], p[2]! - stop.at[1])).toBeLessThan(2.5)
    }
  })

  // (on the tightest curves a section's ends are ~0.2m inside its full length: the bellows)
  it('keeps its sections joined', () => {
    for (let t = 0; t < 1800; t += 7) {
      for (const car of streetcarsAt(MORNING + t)) {
        for (let i = 1; i < SECTIONS.length; i++) {
          const [a, b] = [car.sections[i - 1]!, car.sections[i]!]
          const back = [
            a.x - Math.sin(a.heading) * (SECTIONS[i - 1]! / 2),
            a.z - Math.cos(a.heading) * (SECTIONS[i - 1]! / 2),
          ]
          const front = [
            b.x + Math.sin(b.heading) * (SECTIONS[i]! / 2),
            b.z + Math.cos(b.heading) * (SECTIONS[i]! / 2),
          ]
          expect(Math.hypot(back[0]! - front[0]!, back[1]! - front[1]!)).toBeLessThan(0.5)
        }
      }
    }
    expect(LENGTH).toBeCloseTo(24.11, 2)
  })

  it('runs only while it is in service', () => {
    // 3am eastern
    expect(streetcarsAt(Date.UTC(2026, 10, 24, 8) / 1000)).toHaveLength(0)
    let seen = 0
    for (let t = 0; t < 1800; t += 30) seen += streetcarsAt(MORNING + 3600 + t).length
    expect(seen).toBeGreaterThan(0)
  })

  it('keeps its platforms and poles out of the buildings', () => {
    const outlines = campus.buildings.map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))
    const inside = (x: number, z: number) => outlines.some((o) => pointInPolygon({ x, z }, o))
    const platforms = RAISED.filter((r) => r.by === 'streetcar')
    expect(platforms).toHaveLength(STOPS.length)
    for (const p of platforms) for (const c of p.outline) expect(inside(c.x, c.z)).toBe(false)
    for (const pole of streetcarPoles()) expect(inside(pole.x, pole.z)).toBe(false)
  })

  it('has the cars on its lanes wait behind it', () => {
    // seconds a car overlaps a section, over half an hour of both streetcars. a few are left:
    // the game's edgewood is narrower than the real one, a car in the lane beside the streetcar
    // can touch its side
    let touching = 0
    for (let t = 0; t < 1800; t++) {
      const cars = drivingAt(MORNING + 3600 + t)
      for (const tram of streetcarsAt(MORNING + 3600 + t))
        tram.sections.forEach((s, i) => {
          const [dx, dz] = [Math.sin(s.heading), Math.cos(s.heading)]
          const [half, side] = [SECTIONS[i]! / 2, WIDTH / 2]
          const box = [
            [1, 1],
            [1, -1],
            [-1, -1],
            [-1, 1],
          ].map(([a, b]) => ({
            x: s.x + dx * half * a! + dz * side * b!,
            z: s.z + dz * half * a! - dx * side * b!,
          }))
          for (const c of cars)
            if (Math.hypot(c.x - s.x, c.z - s.z) < 20 && boxesTouch(box, corners(c, -0.2)))
              touching++
        })
    }
    expect(touching).toBeLessThan(40)
  })
})
